import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

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

function buildDraft({ algorithm = null, rows, generatedAt }) {
  const themes = topCounts(rows.flatMap((row) => normalizeThemes(row.aiThemes)));
  const impacts = topCounts(rows.map((row) => row.aiImpactClassification || row.selfReportedImpact || 'UNCLEAR'));
  const domains = topCounts(rows.map((row) => row.affectedDomain || row.algorithmLinks[0]?.algorithm.useCase || 'Unknown domain'));
  const outliers = rows.filter((row) => row.isOutlier).length;
  const title = algorithm ? `${algorithm.name} briefing` : 'Cross-cutting briefing';
  const slug = algorithm ? `local-draft-${algorithm.slug}` : 'local-draft-cross-cutting';
  const dateValues = rows.map((row) => row.submittedAt).filter(Boolean).sort((a, b) => a - b);

  return {
    title,
    slug,
    briefingType: algorithm ? 'ALGORITHM_SPECIFIC' : 'CROSS_CUTTING',
    targetAlgorithmId: algorithm?.id || null,
    targetTheme: null,
    dateRangeStart: dateValues[0]?.toISOString?.().slice(0, 10) || null,
    dateRangeEnd: dateValues.at(-1)?.toISOString?.().slice(0, 10) || null,
    testimonyCount: rows.length,
    executiveSummary: `${rows.length} approved stories are included in this draft. The strongest suggested themes are ${labels(themes)}; the main domains represented are ${labels(domains)}.`,
    keyFindings: [
      `Most common suggested themes: ${labelsWithCounts(themes)}.`,
      `Impact mix: ${labelsWithCounts(impacts)}.`,
      `Represented domains: ${labelsWithCounts(domains)}.`,
      `${outliers} less common experiences are preserved as outlier stories in the corpus map.`,
    ],
    patternAnalysis: `This briefing is based on approved stories, reviewed algorithm records, and the offline topic map. Suggested topics should be read as patterns for review, not final findings.`,
    silenceGaps: domains.length ? [] : [{ reason: 'No domain coverage available in the approved story set.' }],
    recommendations: [
      'Review low-coverage domains before publishing.',
      'Keep claim-vs-experience language descriptive until human review.',
      'Use original excerpts only where the lens allows story-level display.',
    ],
    claimVsExperience: (algorithm ? [algorithm] : [])
      .map((item) => ({
        algorithmSlug: item.slug,
        algorithmName: item.name,
        claims: item.claims.map((claim) => ({ text: claim.claimText, source: claim.claimSource, date: claim.claimDate })),
        experienceCount: rows.filter((row) => row.algorithmLinks.some((link) => link.algorithm.id === item.id)).length,
      })),
    generatedBy: 'local_rule_draft',
    reviewStatus: 'DRAFT',
    generatedAt,
  };
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
  if (start < 0 || end < start) throw new Error('Claude did not return JSON.');
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function refineWithClaude(draft) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required for --claude.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
      max_tokens: 2400,
      system: 'You are a JSON API. Return valid JSON only. No markdown, no prose outside JSON.',
      messages: [{
        role: 'user',
        content: `Return a JSON object with exactly these keys: executiveSummary, keyFindings, patternAnalysis, silenceGaps, recommendations, claimVsExperience. Rewrite this AlgoHub briefing draft for human review. Keep it cautious, evidence-based, and non-judgmental. The response must start with { and end with }.\n\nDraft:\n${JSON.stringify(draft)}`,
      }],
    }),
  });
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
    generatedBy: 'claude_draft',
  };
}

async function main() {
  if (args['self-check']) {
    assert.deepEqual(topCounts(['b', 'a', 'b']), [{ label: 'B', count: 2 }, { label: 'A', count: 1 }]);
    assert.equal(labels([]), 'not enough reviewed data yet');
    assert.equal(toBriefingWrite({ dateRangeStart: '2026-02-08', dateRangeEnd: null }).dateRangeStart.toISOString(), '2026-02-08T00:00:00.000Z');
    assert.equal(parseClaudeJson('```json\n{"ok":true}\n```').ok, true);
    console.log('briefings narrative draft self-check ok');
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const [algorithms, testimonies] = await Promise.all([
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        claims: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      orderBy: { submittedAt: 'asc' },
      select: {
        id: true,
        submittedAt: true,
        affectedDomain: true,
        selfReportedImpact: true,
        aiImpactClassification: true,
        aiThemes: true,
        isOutlier: true,
        algorithmLinks: {
          select: {
            algorithm: { select: { id: true, slug: true, name: true, useCase: true } },
          },
        },
      },
    }),
  ]);

  const generatedAt = new Date().toISOString();
  let drafts = [
    buildDraft({ rows: testimonies, generatedAt }),
    ...algorithms.map((algorithm) => buildDraft({
      algorithm,
      rows: testimonies.filter((row) => row.algorithmLinks.some((link) => link.algorithm.id === algorithm.id)),
      generatedAt,
    })).filter((draft) => draft.testimonyCount > 0),
  ].slice(0, maxDrafts);

  if (useClaude) drafts = await Promise.all(drafts.map(refineWithClaude));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt, jurisdictionId, apply, generatedBy: useClaude ? 'claude_draft' : 'local_rule_draft', drafts }, null, 2)}\n`);

  if (apply) {
    for (const draft of drafts) {
      const data = toBriefingWrite(draft);
      const { reviewStatus, ...updateData } = data;
      await prisma.briefing.upsert({
        where: { slug: draft.slug },
        update: useClaude ? { ...data, reviewedByUserId: null, publishedAt: null } : updateData,
        create: { jurisdictionId, ...data },
      });
    }
  }

  console.log(JSON.stringify({ outputPath, jurisdictionId, apply, drafts: drafts.length }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
