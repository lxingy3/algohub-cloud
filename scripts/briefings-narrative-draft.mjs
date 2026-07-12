import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { BRIEFINGS_EMBEDDING_MODEL, cosineSimilarity, SEMANTIC_RELEVANCE_THRESHOLD } from '../lib/semanticEmbeddings.js';
import { compatibleBriefingDomain } from '../lib/briefingDomainMatch.js';
import { buildSilenceAnalysis } from '../lib/silenceAnalysis.js';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');
loadEnvFile('../LOCAL_SECRETS_DO_NOT_COMMIT.md');

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));
const outputPath = args.output || 'task-briefings-results/briefing-narrative-drafts.json';
const jurisdictionId = args.jurisdiction || process.env.JURISDICTION_ID || 'pittsburgh';
const apply = Boolean(args.apply);
const useClaude = Boolean(args.claude);
const maxDrafts = Number(args['max-drafts'] || (useClaude ? 1 : 999));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (parsed[key] === next) index += 1;
  }
  return parsed;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function normalizeThemes(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => typeof item === 'string' ? item : item?.theme || item?.label || item?.name)
    .filter(Boolean);
}

function topCounts(items, limit = 5) {
  const counts = new Map();
  for (const item of items.filter(Boolean).map(displayLabel)) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function labels(rows) {
  return rows.length ? rows.map((row) => row.label).join(', ') : 'not enough reviewed data yet';
}

function labelsWithCounts(rows) {
  return rows.length ? rows.map((row) => `${row.label} (${row.count})`).join(', ') : 'not enough reviewed data yet';
}

function displayLabel(value) {
  const text = String(value || '').trim();
  const known = {
    data_accuracy: 'Data accuracy',
    arbitrary_outcome: 'Arbitrary outcomes',
    positive_experience: 'Positive experiences',
    opacity: 'Lack of explanation',
    delayed_outcome: 'Delays',
    loss_of_dignity: 'Dignity concerns',
    lack_of_recourse: 'Appeals and recourse',
    process_confusion: 'Process confusion',
    NEGATIVE: 'Negative',
    POSITIVE: 'Positive',
    MIXED: 'Mixed',
    UNCLEAR: 'Unclear',
  };
  if (known[text]) return known[text];
  return text.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDraft({ algorithm = null, rows, generatedAt, silenceGaps = [], claimVsExperience = [] }) {
  const themes = topCounts(rows.flatMap((row) => normalizeThemes(row.aiThemes)));
  const impacts = topCounts(rows.map((row) => row.aiImpactClassification || row.selfReportedImpact || 'UNCLEAR'));
  const domains = topCounts(rows.map((row) => row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain'));
  const outliers = rows.filter((row) => row.isOutlier).length;
  const title = algorithm ? `${algorithm.name} briefing` : 'Cross-cutting briefing';
  const slug = algorithm ? `local-draft-${algorithm.slug}` : 'local-draft-cross-cutting';
  const dateValues = rows.map((row) => row.submittedAt).filter(Boolean).sort((a, b) => a - b);
  const storyLabel = rows.length === 1 ? 'story' : 'stories';
  const outlierFinding = outliers === 0
    ? 'No less common experiences are separated from the main story groups.'
    : `${outliers} less common ${outliers === 1 ? 'experience is' : 'experiences are'} kept separate in the story map.`;

  return {
    title,
    slug,
    briefingType: algorithm ? 'ALGORITHM_SPECIFIC' : 'CROSS_CUTTING',
    targetAlgorithmId: algorithm?.id || null,
    targetTheme: null,
    dateRangeStart: dateValues[0]?.toISOString?.().slice(0, 10) || null,
    dateRangeEnd: dateValues.at(-1)?.toISOString?.().slice(0, 10) || null,
    testimonyCount: rows.length,
    executiveSummary: `${rows.length} approved ${storyLabel} ${rows.length === 1 ? 'is' : 'are'} in this briefing. Common themes: ${labels(themes)}. Main domains: ${labels(domains)}.`,
    keyFindings: [
      `Common themes: ${labelsWithCounts(themes)}.`,
      `Impact mix: ${labelsWithCounts(impacts)}.`,
      `Represented domains: ${labelsWithCounts(domains)}.`,
      outlierFinding,
    ],
    patternAnalysis: 'This briefing uses approved stories, reviewed algorithm records, and the offline topic map. Treat the groupings as leads for review, not final findings.',
    silenceGaps,
    recommendations: [
      'Check low-coverage domains before publishing.',
      'Keep claim-vs-experience wording descriptive until a reviewer signs off.',
      'Only show original excerpts in views that allow story-level display.',
    ],
    claimVsExperience,
    generatedBy: 'staff_draft',
    reviewStatus: 'DRAFT',
    generatedAt,
  };
}

function embeddingMaps(rows) {
  const maps = new Map();
  for (const row of rows) {
    if (!maps.has(row.entityType)) maps.set(row.entityType, new Map());
    maps.get(row.entityType).set(row.entityId, { vector: row.vector });
  }
  return maps;
}

function buildClaimRows(algorithms, testimonies, maps) {
  const storyEmbeddings = maps.get('testimony') || new Map();
  const claimEmbeddings = maps.get('claim') || new Map();
  return algorithms.map((algorithm) => {
    const claimVectors = algorithm.claims.map((claim) => claimEmbeddings.get(claim.id)?.vector).filter(Boolean);
    const ranked = testimonies.filter((story) => (
      story.algorithmLinks.some((link) => link.algorithm.id === algorithm.id)
      || compatibleBriefingDomain(story.affectedDomain, algorithm.useCase)
    )).map((story) => {
      const storyVector = storyEmbeddings.get(story.id)?.vector;
      const scores = claimVectors.map((claimVector) => cosineSimilarity(claimVector, storyVector)).filter(Number.isFinite);
      const similarity = scores.length ? Math.max(...scores) : null;
      return { story, similarity };
    }).filter((row) => Number.isFinite(row.similarity) && row.similarity > SEMANTIC_RELEVANCE_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity);
    return {
      algorithmSlug: algorithm.slug,
      algorithmName: algorithm.name,
      claims: algorithm.claims.map((claim) => ({ text: claim.claimText, source: claim.claimSource, date: claim.claimDate })),
      experienceCount: ranked.length,
      experienceExamples: ranked.slice(0, 3).map(({ story, similarity }) => ({
        id: story.id,
        title: story.title || 'Untitled story',
        impact: story.aiImpactClassification,
        similarity: Number(similarity.toFixed(3)),
      })),
      matchMethod: `domain-scoped sentence-transformers cosine > ${SEMANTIC_RELEVANCE_THRESHOLD} (${BRIEFINGS_EMBEDDING_MODEL})`,
    };
  }).filter((row) => row.claims.length || row.experienceCount);
}

function toBriefingWrite(draft) {
  const { generatedAt, ...data } = draft;
  return {
    ...data,
    dateRangeStart: data.dateRangeStart ? new Date(`${data.dateRangeStart}T00:00:00.000Z`) : null,
    dateRangeEnd: data.dateRangeEnd ? new Date(`${data.dateRangeEnd}T00:00:00.000Z`) : null,
  };
}

function parseClaudeJson(text) {
  const trimmed = String(text || '').trim().replace(/^```json\s*|\s*```$/g, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The rewrite step did not return JSON.');
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function refineWithClaude(draft) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required for --claude.');
  const request = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1400,
      system: 'You are a JSON API. Return valid JSON only. No markdown, no prose outside JSON.',
      messages: [{
        role: 'user',
        content: `Return a JSON object with exactly these keys: executiveSummary, keyFindings, patternAnalysis, silenceGaps, recommendations, claimVsExperience. Rewrite this AlgoHub briefing draft in plain staff-review language. Keep the wording direct and specific; avoid stiff review-template phrasing. The response must start with { and end with }.\n\nDraft:\n${JSON.stringify(draft)}`,
      }],
    }),
  };
  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', request);
      if (response.ok || (response.status < 500 && response.status !== 429)) break;
    } catch (error) {
      if (attempt === 3) throw error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `Claude API failed: ${response.status}`);
  const text = payload.content?.find((item) => item.type === 'text')?.text;
  const refined = parseClaudeJson(text);
  return {
    ...draft,
    executiveSummary: refined.executiveSummary || draft.executiveSummary,
    keyFindings: Array.isArray(refined.keyFindings) ? refined.keyFindings : draft.keyFindings,
    patternAnalysis: refined.patternAnalysis || draft.patternAnalysis,
    silenceGaps: Array.isArray(refined.silenceGaps) ? refined.silenceGaps : draft.silenceGaps,
    recommendations: Array.isArray(refined.recommendations) ? refined.recommendations : draft.recommendations,
    claimVsExperience: Array.isArray(refined.claimVsExperience) ? refined.claimVsExperience : draft.claimVsExperience,
    generatedBy: 'assisted_draft',
  };
}

async function main() {
  if (args['self-check']) {
    assert.deepEqual(topCounts(['b', 'a', 'b']), [{ label: 'B', count: 2 }, { label: 'A', count: 1 }]);
    assert.equal(labels([]), 'not enough reviewed data yet');
    assert.equal(toBriefingWrite({ dateRangeStart: '2026-02-08', dateRangeEnd: null }).dateRangeStart.toISOString(), '2026-02-08T00:00:00.000Z');
    assert.equal(parseClaudeJson('```json\n{"ok":true}\n```').ok, true);
    assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
    assert.equal(Number(cosineSimilarity([1, 0], [0, 1]).toFixed(3)), 0);
    const silenceCheck = buildSilenceAnalysis({
      algorithms: [{ id: 'a1', slug: 'housing-test', name: 'Housing test', useCase: 'Housing', impactLevel: 'HIGH', yearDeployed: new Date().getUTCFullYear() - 1, approvedTestimonyCount: 0 }],
      stories: [{ id: 's1', affectedDomain: 'Housing', algorithmLinks: [] }, { id: 's2', affectedDomain: 'Housing', algorithmLinks: [] }],
      algorithmEmbeddings: new Map([['a1', { vector: [1, 0] }]]),
      storyEmbeddings: new Map([['s1', { vector: [1, 0] }], ['s2', { vector: [0, 1] }]]),
    }).rows[0];
    assert.equal(silenceCheck.expectedVolume, 12);
    assert.equal(silenceCheck.factors.semanticSource, 'sentence-transformers cosine');
    assert.equal(silenceCheck.priority, 'critical');
    console.log('briefings narrative draft self-check ok');
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const [algorithms, testimonies, cachedEmbeddings] = await Promise.all([
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        useCase: true,
        agencyName: true,
        impactLevel: true,
        yearDeployed: true,
        claims: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, claimText: true, claimSource: true, claimDate: true },
        },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      orderBy: { submittedAt: 'asc' },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        affectedDomain: true,
        selfReportedImpact: true,
        aiImpactClassification: true,
        aiThemes: true,
        isOutlier: true,
        topicId: true,
        clusterId: true,
        umapX: true,
        umapY: true,
        algorithmLinks: {
          select: {
            algorithm: { select: { id: true, slug: true, name: true, useCase: true } },
          },
        },
      },
    }),
    prisma.semanticEmbedding.findMany({
      where: { jurisdictionId, model: BRIEFINGS_EMBEDDING_MODEL, entityType: { in: ['testimony', 'algorithm', 'claim'] } },
      select: { entityType: true, entityId: true, vector: true },
    }),
  ]);

  const generatedAt = new Date().toISOString();
  const maps = embeddingMaps(cachedEmbeddings);
  const expectedClaims = algorithms.reduce((sum, algorithm) => sum + algorithm.claims.length, 0);
  const missingSemanticCache = {
    testimonies: Math.max(0, testimonies.length - (maps.get('testimony')?.size || 0)),
    algorithms: Math.max(0, algorithms.length - (maps.get('algorithm')?.size || 0)),
    claims: Math.max(0, expectedClaims - (maps.get('claim')?.size || 0)),
  };
  if (!args['allow-semantic-fallback'] && Object.values(missingSemanticCache).some(Boolean)) {
    throw new Error(`Semantic cache is incomplete: ${JSON.stringify(missingSemanticCache)}. Run the corpus export, batch, and apply steps first.`);
  }
  const claimRows = buildClaimRows(algorithms, testimonies, maps);
  const algorithmsForSilence = algorithms.map((algorithm) => ({
    ...algorithm,
    approvedTestimonyCount: testimonies.filter((story) => story.algorithmLinks.some((link) => link.algorithm.id === algorithm.id)).length,
  }));
  const silenceAnalysis = buildSilenceAnalysis({
    algorithms: algorithmsForSilence,
    stories: testimonies,
    algorithmEmbeddings: maps.get('algorithm') || new Map(),
    storyEmbeddings: maps.get('testimony') || new Map(),
  });
  let drafts = [
    buildDraft({ rows: testimonies, generatedAt, silenceGaps: silenceAnalysis.rows, claimVsExperience: claimRows }),
    ...algorithms.map((algorithm) => buildDraft({
      algorithm,
      rows: testimonies.filter((row) => row.algorithmLinks.some((link) => link.algorithm.id === algorithm.id)),
      generatedAt,
      silenceGaps: silenceAnalysis.rows.filter((row) => row.algorithmId === algorithm.id),
      claimVsExperience: claimRows.filter((row) => row.algorithmSlug === algorithm.slug),
    })),
  ];
  if (args.scope === 'corpus') drafts = drafts.filter((draft) => draft.briefingType === 'CROSS_CUTTING');
  if (args.algorithm) drafts = drafts.filter((draft) => draft.slug === `local-draft-${args.algorithm}`);
  drafts = drafts.slice(0, maxDrafts);

  if (useClaude) drafts = await Promise.all(drafts.map(refineWithClaude));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({
    generatedAt,
    jurisdictionId,
    apply,
    generatedBy: useClaude ? 'assisted_draft' : 'staff_draft',
    embeddingModel: BRIEFINGS_EMBEDDING_MODEL,
    missingSemanticCache,
    drafts,
  }, null, 2)}\n`);

  if (apply) {
    for (const draft of drafts) {
      const data = toBriefingWrite(draft);
      await prisma.briefing.upsert({
        where: { slug: draft.slug },
        update: { ...data, reviewedByUserId: null, publishedAt: null },
        create: { jurisdictionId, ...data },
      });
    }
  }

  console.log(JSON.stringify({ outputPath, jurisdictionId, apply, drafts: drafts.length }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
