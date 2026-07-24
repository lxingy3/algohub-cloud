import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { ML_PIPELINE_VERSION } from '../lib/mlPipelineContract.js';

const PREFIX = 'demo-v2';
const GENERATED_AT = new Date('2026-07-24T12:00:00.000Z');
const EMBEDDING_DIMENSIONS = 1024;
const SYNTHETIC_EMBEDDING_MODEL = 'synthetic-domain-fixture-sha256-v1';
const TOPIC_ID_BASE = 202607240;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const domainEmbeddingCache = new Map();

const jurisdictions = [
  {
    id: 'pittsburgh',
    name: 'Pittsburgh',
    state: 'Pennsylvania',
    neighbourhoods: ['Beechview', 'Carrick', 'East Liberty', 'Hill District', 'Homewood', 'North Side'],
  },
  {
    id: 'demo-cleveland',
    name: 'Cleveland (Synthetic Demo)',
    state: 'Ohio',
    neighbourhoods: ['Clark-Fulton', 'Detroit-Shoreway', 'Glenville', 'Hough', 'Old Brooklyn', 'Slavic Village'],
  },
  {
    id: 'demo-columbus',
    name: 'Columbus (Synthetic Demo)',
    state: 'Ohio',
    neighbourhoods: ['Franklinton', 'Hilltop', 'Linden', 'Near East Side', 'Northland', 'South Side'],
  },
  {
    id: 'demo-philadelphia',
    name: 'Philadelphia (Synthetic Demo)',
    state: 'Pennsylvania',
    neighbourhoods: ['Cobbs Creek', 'Fairhill', 'Germantown', 'Kensington', 'Point Breeze', 'West Oak Lane'],
  },
];

const partnerKinds = [
  ['Resident Resource Network', 'community_partner'],
  ['Digital Rights Clinic', 'research_partner'],
  ['Youth and Family Collaborative', 'community_partner'],
  ['Worker and Tenant Center', 'community_partner'],
];

const domains = [
  domain('housing', 'Housing', 'Housing Prioritization Model', 'ranked an urgent housing request below lower-risk cases', 'a housing specialist corrected the household record and recalculated priority', ['data_accuracy', 'lack_of_recourse']),
  domain('housing-inspections', 'Housing Inspections', 'Housing Inspection Scheduler', 'kept a health-and-safety complaint in the routine queue', 'an inspector reviewed the photos and moved the case to the urgent queue', ['delayed_outcome', 'opacity']),
  domain('benefits', 'Benefits Administration', 'Benefits Eligibility Verification Engine', 'used an outdated income record and paused assistance', 'a caseworker verified the current document and restored the case', ['data_accuracy', 'delayed_outcome']),
  domain('child-welfare', 'Child Welfare', 'Family Support Screening Tool', 'treated an old referral as a current risk without context', 'a supervisor added current family information and requested human review', ['data_accuracy', 'loss_of_dignity']),
  domain('student-support', 'Student Support', 'Student Support Risk Model', 'counted excused absences as disengagement', 'a counselor corrected the attendance codes before the support meeting', ['arbitrary_outcome', 'positive_experience']),
  domain('employment', 'Employment', 'Wage Compliance Risk Model', 'merged two employers with similar names and raised the wrong risk flag', 'an analyst separated the records and reopened the complaint', ['data_accuracy', 'process_confusion']),
  domain('emergency', 'Emergency Services', 'Emergency Dispatch Triage Assistant', 'routed a welfare check as a low-priority service request', 'a dispatcher changed the category and sent the appropriate response team', ['process_confusion', 'lack_of_recourse']),
  domain('language', 'Language Access', 'Language Access Routing System', 'sent an interpreter request to the wrong public-service team', 'a multilingual worker transferred the request and confirmed the appointment', ['process_confusion', 'positive_experience']),
  domain('transit', 'Transit Safety', 'Transit Safety Incident Classifier', 'classified a harassment report as a maintenance request', 'customer service moved the report to the safety team and issued a new case number', ['opacity', 'loss_of_dignity']),
  domain('community', 'Community Services', 'Community Resource Recommendation Tool', 'recommended business classes for a request about tenant legal help', 'a librarian reviewed the request and connected the resident to a legal clinic', ['arbitrary_outcome', 'positive_experience']),
  domain('traffic', 'Traffic Management', 'Traffic Flow Optimizer', 'continued routing traffic around a road that had reopened', 'traffic staff corrected the closure record and restored the normal route', ['data_accuracy', 'delayed_outcome']),
  domain('energy', 'Energy Forecasting', 'Household Energy Support Predictor', 'estimated low need after missing recent utility shutoff notices', 'an assistance worker added the notices and completed a manual review', ['data_accuracy', 'lack_of_recourse']),
];

const pittsburghAlgorithms = {
  housing: { slug: 'housing-allocation-algorithm', name: 'Housing Allocation Algorithm' },
  'housing-inspections': { slug: 'public-housing-inspection-scheduler', name: 'Public Housing Inspection Scheduler' },
  benefits: { slug: 'benefits-eligibility-verification-engine', name: 'Benefits Eligibility Verification Engine' },
  'child-welfare': { slug: 'allegheny-family-screening-tool', name: 'Allegheny Family Screening Tool' },
  'student-support': { slug: 'student-risk-assessment', name: 'Student Risk Assessment' },
  employment: { slug: 'wage-compliance-risk-model', name: 'Wage Compliance Risk Model' },
  emergency: { slug: 'emergency-dispatch-triage-assistant', name: 'Emergency Dispatch Triage Assistant' },
  language: { slug: 'language-access-routing-system', name: 'Language Access Routing System' },
  transit: { slug: 'transit-safety-incident-classifier', name: 'Transit Safety Incident Classifier' },
  community: { slug: 'library-resource-recommendation-tool', name: 'Library Resource Recommendation Tool' },
  traffic: { slug: 'traffic-flow-optimizer', name: 'Traffic Flow Optimizer' },
  energy: { slug: 'energy-consumption-predictor', name: 'Energy Consumption Predictor' },
};

const variants = [
  { key: 'resolved', label: 'resolved after review', language: 'en', impact: 'POSITIVE', status: 'APPROVED', publicPosting: true, method: 'WEB_FORM' },
  { key: 'unresolved', label: 'still waiting for an appeal', language: 'es', impact: 'NEGATIVE', status: 'APPROVED', publicPosting: true, method: 'FACILITATED_SESSION' },
  { key: 'pending', label: 'pending moderator review', language: 'zh', impact: 'MIXED', status: 'PENDING', publicPosting: false, method: 'AUDIO_TRANSCRIPTION' },
  { key: 'held', label: 'held for additional context', language: 'ar', impact: 'UNCLEAR', status: null, publicPosting: false, method: 'PAPER_SCAN' },
];

function domain(key, useCase, algorithmName, issue, resolution, themes) {
  return { key, useCase, algorithmName, issue, resolution, themes };
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function stableUuid(value) {
  const hex = createHash('sha256').update(`${PREFIX}:${value}`).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16], 16) % 4];
  const text = hex.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}

function contentHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function unitVector(seed) {
  const values = [];
  for (let counter = 0; values.length < EMBEDDING_DIMENSIONS; counter += 1) {
    const digest = createHash('sha256').update(`${PREFIX}:embedding:${seed}:${counter}`).digest();
    for (let offset = 0; offset < digest.length && values.length < EMBEDDING_DIMENSIONS; offset += 2) {
      values.push((digest.readUInt16BE(offset) / 65535) * 2 - 1);
    }
  }
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0));
  return values.map((value) => value / norm);
}

function semanticVector(domainKey, entityKey) {
  if (!domainEmbeddingCache.has(domainKey)) domainEmbeddingCache.set(domainKey, unitVector(`domain:${domainKey}`));
  const domainVector = domainEmbeddingCache.get(domainKey);
  const entityVector = unitVector(`entity:${entityKey}`);
  const blended = domainVector.map((value, index) => value * 0.94 + entityVector[index] * 0.06);
  const norm = Math.sqrt(blended.reduce((sum, value) => sum + value ** 2, 0));
  return blended.map((value) => Number((value / norm).toFixed(8)));
}

function coordinateNoise(seed) {
  return (Number.parseInt(contentHash(seed).slice(0, 8), 16) / 0xffffffff - 0.5) * 0.8;
}

function corpusCoordinates(domainIndex, jurisdictionIndex, variantIndex, sourceId) {
  const angle = (Math.PI * 2 * domainIndex) / domains.length;
  const radius = 8 + jurisdictionIndex * 0.7;
  return {
    umapX: Number((Math.cos(angle) * radius + variantIndex * 0.18 + coordinateNoise(`${sourceId}:x`)).toFixed(4)),
    umapY: Number((Math.sin(angle) * radius - variantIndex * 0.18 + coordinateNoise(`${sourceId}:y`)).toFixed(4)),
  };
}

function storyMlCache({ sourceId, narrativeText, jurisdiction, neighbourhood, partner, algorithm, item, variant, submittedAt, domainIndex, jurisdictionIndex, variantIndex }) {
  const confidence = Number((0.94 - variantIndex * 0.05 - jurisdictionIndex * 0.01).toFixed(2));
  const entities = {
    agencies: [`${jurisdiction.name.replace(' (Synthetic Demo)', '')} Test Agency`, partner.name],
    locations: [jurisdiction.name.replace(' (Synthetic Demo)', ''), neighbourhood],
    systems: [algorithm.name],
    dates: [submittedAt.toISOString().slice(0, 10)],
    people_roles: ['resident', 'partner facilitator', 'agency reviewer'],
  };
  const keywords = [...new Set([
    item.useCase,
    item.algorithmName,
    ...item.themes.map((theme) => theme.replace(/_/g, ' ')),
    variant.key,
    neighbourhood,
  ])];
  const modelProvenance = {
    pipelineVersion: ML_PIPELINE_VERSION,
    generatedAt: GENERATED_AT.toISOString(),
    runtime: 'synthetic-fixture',
    inputSource: variant.method === 'AUDIO_TRANSCRIPTION' ? 'transcriptionText' : 'narrativeText',
    sourceContentHash: contentHash(narrativeText),
    sourceCharacters: narrativeText.length,
    truncated: false,
    syntheticFixture: true,
    fixtureVersion: PREFIX,
    task2: {
      model: 'synthetic-fixture',
      runtime: 'synthetic-fixture',
      calibration: 'fixture-label',
      decisionSource: 'synthetic-fixture',
      confidenceKind: 'fixture-confidence',
    },
    task3: { model: 'synthetic-fixture', runtime: 'synthetic-fixture', calibration: 'fixture-label' },
    task4: { model: 'synthetic-fixture', runtime: 'synthetic-fixture' },
    task5: { model: 'synthetic-fixture', runtime: 'synthetic-fixture' },
  };
  return {
    aiConfidenceScore: confidence,
    aiExtractedExperiences: {
      provenance: `synthetic_demo:${PREFIX}`,
      fictional: true,
      issue: item.issue,
      entities,
      keywords,
      modelProvenance,
    },
    topicId: TOPIC_ID_BASE + domainIndex,
    clusterId: TOPIC_ID_BASE + domainIndex,
    isOutlier: false,
    ...corpusCoordinates(domainIndex, jurisdictionIndex, variantIndex, sourceId),
  };
}

function storyStatus(jurisdictionIndex, domainIndex, variant) {
  if (variant.status) return variant.status;
  return (jurisdictionIndex + domainIndex) % 2 ? 'FLAGGED' : 'REJECTED';
}

function localizeNarrative(language, { jurisdiction, neighbourhood, domain: item, partner, index }) {
  const marker = `SYNTHETIC DEMO ${PREFIX}-${index}`;
  if (language === 'es') {
    return `${marker}. En ${neighbourhood}, usé ${item.algorithmName}. El sistema ${item.issue}. La organización de prueba ${partner} ayudó a documentar el caso. Todavía estoy esperando una explicación y una vía clara de apelación. Este relato es ficticio y existe únicamente para probar AlgoStories.`;
  }
  if (language === 'zh') {
    return `${marker}。我在${jurisdiction.name}的${neighbourhood}使用了${item.algorithmName}。系统出现的问题是：${item.issue}。测试合作机构${partner}帮助记录了情况，随后${item.resolution}。这是完全虚构的功能测试故事，不代表真实居民或真实事件。`;
  }
  if (language === 'ar') {
    return `${marker}. في حي ${neighbourhood} بمدينة ${jurisdiction.name} استخدمت نظام ${item.algorithmName}. حدثت مشكلة تجريبية: ${item.issue}. ساعدت منظمة الاختبار ${partner} في توثيق الحالة، ثم ${item.resolution}. هذه قصة خيالية بالكامل لاختبار وظائف AlgoStories فقط.`;
  }
  return `${marker}. In ${neighbourhood}, ${jurisdiction.name}, I used the ${item.algorithmName}. The system ${item.issue}. The synthetic partner ${partner} helped document the case, and ${item.resolution}. This is a wholly fictional scenario created only to test AlgoStories features.`;
}

function buildPlan() {
  const organizations = [];
  const algorithms = [];
  const stories = [];
  const insights = [];
  const topics = domains.map((item, index) => ({
    topicId: TOPIC_ID_BASE + index,
    label: `[Synthetic Demo ${PREFIX}] ${item.useCase}`,
    topKeywords: [item.useCase, item.algorithmName, ...item.themes.map((theme) => theme.replace(/_/g, ' '))],
    size: jurisdictions.length * variants.length,
    spanAlgorithms: jurisdictions.length,
    spanDomains: 1,
  }));
  let storyIndex = 0;

  jurisdictions.forEach((jurisdiction, jurisdictionIndex) => {
    const jurisdictionPartners = partnerKinds.map(([kind, role]) => {
      const organization = {
        jurisdictionId: jurisdiction.id,
        name: `${jurisdiction.name.replace(' (Synthetic Demo)', '')} Demo ${kind}`,
        slug: `${PREFIX}-${jurisdiction.id}-${slug(kind)}`,
        role,
      };
      organizations.push(organization);
      return organization;
    });

    domains.forEach((item, domainIndex) => {
      const algorithm = jurisdiction.id === 'pittsburgh'
        ? { ...pittsburghAlgorithms[item.key], domain: item }
        : {
            jurisdictionId: jurisdiction.id,
            sourceId: `${PREFIX}:algorithm:${jurisdiction.id}:${item.key}`,
            slug: `${PREFIX}-${jurisdiction.id}-${item.key}`,
            name: `${item.algorithmName} (${jurisdiction.name.replace(' (Synthetic Demo)', '')} Demo)`,
            useCase: item.useCase,
            impactLevel: ['HIGH', 'MEDIUM', 'LOW'][domainIndex % 3],
            status: ['ACTIVE', 'UNDER_REVIEW', 'PROPOSED'][domainIndex % 3],
            domain: item,
          };
      if (jurisdiction.id !== 'pittsburgh') algorithms.push(algorithm);

      variants.forEach((variant, variantIndex) => {
        storyIndex += 1;
        const partner = jurisdictionPartners[(domainIndex + variantIndex) % jurisdictionPartners.length];
        const neighbourhood = jurisdiction.neighbourhoods[(domainIndex + variantIndex) % jurisdiction.neighbourhoods.length];
        const status = storyStatus(jurisdictionIndex, domainIndex, variant);
        const submittedAt = new Date(Date.UTC(2026, (jurisdictionIndex * 3 + domainIndex) % 7, 1 + variantIndex * 6 + (domainIndex % 5), 14));
        const sourceId = `${PREFIX}:story:${jurisdiction.id}:${item.key}:${variant.key}`;
        const narrativeText = localizeNarrative(variant.language, {
          jurisdiction,
          neighbourhood,
          domain: item,
          partner: partner.name,
          index: storyIndex,
        });
        stories.push({
          sourceId,
          jurisdictionId: jurisdiction.id,
          algorithmSlug: algorithm.slug,
          partnerSlug: partner.slug,
          title: `[Synthetic Demo] ${item.useCase}: ${variant.label}`,
          summary: `Synthetic ${variant.language} ${item.useCase.toLowerCase()} scenario for testing ${status.toLowerCase()} story behavior, partner and neighbourhood filters, and cross-domain analytics.`,
          narrativeText,
          ...storyMlCache({
            sourceId,
            narrativeText,
            jurisdiction,
            neighbourhood,
            partner,
            algorithm,
            item,
            variant,
            submittedAt,
            domainIndex,
            jurisdictionIndex,
            variantIndex,
          }),
          city: jurisdiction.name.replace(' (Synthetic Demo)', ''),
          neighbourhood,
          originalLanguage: variant.language,
          affectedDomain: item.useCase,
          selfReportedImpact: variant.impact,
          aiImpactClassification: variant.impact,
          aiThemes: [...new Set([...item.themes, variant.key === 'resolved' ? 'positive_experience' : 'lack_of_recourse'])],
          moderationStatus: status,
          publicPosting: variant.publicPosting,
          submissionMethod: variant.method,
          submittedAt,
          aiProcessedAt: GENERATED_AT,
          transcriptionStatus: variant.method === 'AUDIO_TRANSCRIPTION' ? 'COMPLETED' : 'NOT_REQUIRED',
          transcriptionText: variant.method === 'AUDIO_TRANSCRIPTION' ? narrativeText : null,
          transcribedAt: variant.method === 'AUDIO_TRANSCRIPTION' ? GENERATED_AT : null,
        });
      });
    });
  });

  jurisdictions.slice(1).forEach((jurisdiction, jurisdictionIndex) => {
    domains.forEach((item, domainIndex) => {
      insights.push({
        id: stableUuid(`insight:${jurisdiction.id}:${item.key}`),
        sourceJurisdictionId: jurisdiction.id,
        useCase: item.useCase,
        insightType: ['coverage', 'impact_mix', 'recourse_pattern'][domainIndex % 3],
        insightData: {
          provenance: `synthetic_demo:${PREFIX}`,
          fictional: true,
          sourceLabel: `${jurisdiction.name} aggregate demo benchmark`,
          sampleSize: 24 + jurisdictionIndex * 8 + domainIndex,
          neighbourhoodCount: jurisdiction.neighbourhoods.length,
          partnerCount: partnerKinds.length,
          languages: variants.map((variant) => variant.language),
          impactBreakdown: { positive: 0.25, negative: 0.25, mixed: 0.25, unclear: 0.25 },
          topThemes: item.themes,
          period: '2026 synthetic test corpus',
        },
      });
    });
  });

  return { jurisdictions, organizations, algorithms, stories, insights, topics };
}

function loadEnvFiles() {
  for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
    }
  }
}

function planSummary(plan) {
  const countBy = (rows, key) => Object.fromEntries([...new Set(rows.map((row) => row[key]))].map((value) => [
    value,
    rows.filter((row) => row[key] === value).length,
  ]));
  return {
    mode: apply ? 'apply' : 'dry-run',
    provenancePrefix: PREFIX,
    jurisdictions: plan.jurisdictions.length,
    organizations: plan.organizations.length,
    algorithms: plan.algorithms.length,
    existingPittsburghAlgorithmsReused: Object.keys(pittsburghAlgorithms).length,
    stories: plan.stories.length,
    approvedPublicStories: plan.stories.filter((story) => story.moderationStatus === 'APPROVED' && story.publicPosting).length,
    storyStatuses: countBy(plan.stories, 'moderationStatus'),
    languages: countBy(plan.stories, 'originalLanguage'),
    domains: new Set(plan.stories.map((story) => story.affectedDomain)).size,
    crossJurisdictionInsights: plan.insights.length,
    corpusTopics: plan.topics.length,
    storiesWithCompleteMlCache: plan.stories.filter((story) => (
      Number.isFinite(story.aiConfidenceScore)
      && Object.values(story.aiExtractedExperiences.entities).every(Array.isArray)
      && Array.isArray(story.aiExtractedExperiences.keywords)
      && story.aiExtractedExperiences.modelProvenance.pipelineVersion === ML_PIPELINE_VERSION
      && Number.isInteger(story.topicId)
      && Number.isInteger(story.clusterId)
      && Number.isFinite(story.umapX)
      && Number.isFinite(story.umapY)
    )).length,
    semanticEmbeddings: {
      model: SYNTHETIC_EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      testimony: plan.stories.length,
      algorithm: plan.algorithms.length,
      claim: plan.algorithms.length,
      total: plan.stories.length + plan.algorithms.length * 2,
    },
    mlPipelineVersion: ML_PIPELINE_VERSION,
  };
}

function selfCheck(plan) {
  assert.equal(plan.jurisdictions.length, 4);
  assert.equal(plan.organizations.length, 16);
  assert.equal(plan.algorithms.length, 36);
  assert.equal(plan.stories.length, 192);
  assert.equal(plan.insights.length, 36);
  assert.equal(plan.topics.length, 12);
  assert.equal(new Set(plan.stories.map((story) => story.sourceId)).size, plan.stories.length);
  assert.equal(new Set(plan.algorithms.map((algorithm) => algorithm.slug)).size, plan.algorithms.length);
  assert.equal(new Set(plan.topics.map((topic) => topic.topicId)).size, plan.topics.length);
  assert.deepEqual(new Set(plan.stories.map((story) => story.originalLanguage)), new Set(['en', 'es', 'zh', 'ar']));
  assert.deepEqual(new Set(plan.stories.map((story) => story.moderationStatus)), new Set(['APPROVED', 'PENDING', 'FLAGGED', 'REJECTED']));
  assert.ok(plan.stories.every((story) => Number.isFinite(story.aiConfidenceScore)));
  assert.ok(plan.stories.every((story) => new Set(story.aiThemes).size === story.aiThemes.length));
  assert.ok(plan.stories.every((story) => (
    story.aiExtractedExperiences?.modelProvenance?.pipelineVersion === ML_PIPELINE_VERSION
    && story.aiExtractedExperiences?.modelProvenance?.runtime === 'synthetic-fixture'
  )));
  assert.ok(plan.stories.every((story) => (
    ['agencies', 'locations', 'systems', 'dates', 'people_roles']
      .every((group) => Array.isArray(story.aiExtractedExperiences?.entities?.[group]))
    && Array.isArray(story.aiExtractedExperiences?.keywords)
  )));
  assert.ok(plan.stories.every((story) => (
    Number.isInteger(story.topicId)
    && Number.isInteger(story.clusterId)
    && Number.isFinite(story.umapX)
    && Number.isFinite(story.umapY)
  )));
  const sampleEmbedding = semanticVector('housing', 'self-check');
  const sameDomainEmbedding = semanticVector('housing', 'same-domain');
  const otherDomainEmbedding = semanticVector('employment', 'other-domain');
  const cosine = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
  assert.equal(sampleEmbedding.length, EMBEDDING_DIMENSIONS);
  assert.ok(sampleEmbedding.every(Number.isFinite));
  assert.deepEqual(sampleEmbedding, semanticVector('housing', 'self-check'));
  assert.ok(cosine(sampleEmbedding, sameDomainEmbedding) > 0.9);
  assert.ok(Math.abs(cosine(sampleEmbedding, otherDomainEmbedding)) < 0.2);
  assert.equal(plan.stories.length + plan.algorithms.length * 2, 264);
  assert.ok(plan.algorithms.every((algorithm) => algorithm.jurisdictionId !== 'pittsburgh'));
  assert.deepEqual(
    new Set(plan.stories.filter((story) => story.jurisdictionId === 'pittsburgh').map((story) => story.algorithmSlug)),
    new Set(Object.values(pittsburghAlgorithms).map((algorithm) => algorithm.slug)),
  );
  assert.match(stableUuid('repeatable'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(stableUuid('repeatable'), stableUuid('repeatable'));
}

async function cleanupPittsburghDemoAlgorithms(tx, algorithmIds) {
  const empty = {
    pittsburghDemoAlgorithmsRemoved: 0,
    testimonyLinksRemapped: 0,
    testimonyArraysRemapped: 0,
    briefingsRemapped: 0,
    briefingJobsRemapped: 0,
    newsUpdatesRemapped: 0,
    algorithmClaimsRemoved: 0,
    algorithmDocumentsRemoved: 0,
    semanticEmbeddingsRemoved: 0,
  };
  const duplicates = await tx.algorithm.findMany({
    where: {
      jurisdictionId: 'pittsburgh',
      sourceId: { startsWith: `${PREFIX}:algorithm:pittsburgh:` },
    },
    select: { id: true, sourceId: true },
  });
  if (!duplicates.length) return empty;

  const replacementById = new Map();
  for (const duplicate of duplicates) {
    const domainKey = duplicate.sourceId.slice(`${PREFIX}:algorithm:pittsburgh:`.length);
    const replacement = pittsburghAlgorithms[domainKey];
    const replacementId = replacement && algorithmIds.get(replacement.slug);
    if (!replacementId) throw new Error(`No verified Pittsburgh replacement for ${duplicate.sourceId}.`);
    replacementById.set(duplicate.id, replacementId);
  }

  const duplicateIds = [...replacementById.keys()];
  const oldLinks = await tx.testimonyAlgorithmLink.findMany({
    where: { algorithmId: { in: duplicateIds } },
    select: { testimonyId: true, algorithmId: true, linkType: true, confidence: true },
  });
  if (oldLinks.length) {
    await tx.testimonyAlgorithmLink.createMany({
      data: oldLinks.map((link) => ({
        testimonyId: link.testimonyId,
        algorithmId: replacementById.get(link.algorithmId),
        linkType: link.linkType,
        confidence: link.confidence,
      })),
      skipDuplicates: true,
    });
  }

  const testimonies = await tx.testimony.findMany({
    where: { aiLinkedAlgorithmIds: { hasSome: duplicateIds } },
    select: { id: true, aiLinkedAlgorithmIds: true },
  });
  for (const testimony of testimonies) {
    await tx.testimony.update({
      where: { id: testimony.id },
      data: {
        aiLinkedAlgorithmIds: [...new Set(
          testimony.aiLinkedAlgorithmIds.map((id) => replacementById.get(id) || id),
        )],
      },
    });
  }

  let briefingsRemapped = 0;
  let briefingJobsRemapped = 0;
  let newsUpdatesRemapped = 0;
  for (const [duplicateId, replacementId] of replacementById) {
    briefingsRemapped += (await tx.briefing.updateMany({
      where: { targetAlgorithmId: duplicateId },
      data: { targetAlgorithmId: replacementId },
    })).count;
    briefingJobsRemapped += (await tx.briefingGenerationJob.updateMany({
      where: { targetAlgorithmId: duplicateId },
      data: { targetAlgorithmId: replacementId },
    })).count;
    newsUpdatesRemapped += (await tx.newsUpdate.updateMany({
      where: { relatedAlgorithmId: duplicateId },
      data: { relatedAlgorithmId: replacementId },
    })).count;
  }

  const claimIds = (await tx.algorithmClaim.findMany({
    where: { algorithmId: { in: duplicateIds } },
    select: { id: true },
  })).map((claim) => claim.id);
  const semanticEmbeddingsRemoved = (await tx.semanticEmbedding.deleteMany({
    where: {
      jurisdictionId: 'pittsburgh',
      OR: [
        { entityType: 'algorithm', entityId: { in: duplicateIds } },
        { entityType: 'claim', entityId: { in: claimIds } },
      ],
    },
  })).count;
  const testimonyLinksRemapped = (await tx.testimonyAlgorithmLink.deleteMany({
    where: { algorithmId: { in: duplicateIds } },
  })).count;
  const algorithmDocumentsRemoved = (await tx.algorithmDocument.deleteMany({
    where: { algorithmId: { in: duplicateIds } },
  })).count;
  const algorithmClaimsRemoved = (await tx.algorithmClaim.deleteMany({
    where: { algorithmId: { in: duplicateIds } },
  })).count;
  const pittsburghDemoAlgorithmsRemoved = (await tx.algorithm.deleteMany({
    where: { id: { in: duplicateIds } },
  })).count;

  return {
    pittsburghDemoAlgorithmsRemoved,
    testimonyLinksRemapped,
    testimonyArraysRemapped: testimonies.length,
    briefingsRemapped,
    briefingJobsRemapped,
    newsUpdatesRemapped,
    algorithmClaimsRemoved,
    algorithmDocumentsRemoved,
    semanticEmbeddingsRemoved,
  };
}

async function applyPlan(plan) {
  loadEnvFiles();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required with --apply.');
  const prisma = new PrismaClient();
  try {
    const semanticRowsByJurisdiction = new Map(plan.jurisdictions.map((jurisdiction) => [jurisdiction.id, []]));
    const addSemanticRow = ({ jurisdictionId, entityType, entityId, domainKey, content }) => {
      semanticRowsByJurisdiction.get(jurisdictionId).push({
        jurisdictionId,
        entityType,
        entityId: String(entityId),
        model: SYNTHETIC_EMBEDDING_MODEL,
        vector: semanticVector(domainKey, `${entityType}:${entityId}`),
        contentHash: contentHash(content),
        generatedAt: GENERATED_AT,
      });
    };

    for (const jurisdiction of plan.jurisdictions) {
      await prisma.jurisdiction.upsert({
        where: { id: jurisdiction.id },
        update: {},
        create: {
          id: jurisdiction.id,
          name: jurisdiction.name,
          state: jurisdiction.state,
          country: 'US',
          timezone: 'America/New_York',
          config: { provenance: `synthetic_demo:${PREFIX}`, fictionalPeer: jurisdiction.id !== 'pittsburgh' },
        },
      });
    }

    for (const topic of plan.topics) {
      const existing = await prisma.corpusTopic.findUnique({
        where: { topicId: topic.topicId },
        select: { label: true },
      });
      if (existing && !String(existing.label || '').startsWith(`[Synthetic Demo ${PREFIX}]`)) {
        throw new Error(`Refusing to overwrite non-synthetic CorpusTopic ${topic.topicId}: ${existing.label || 'unlabelled'}`);
      }
      await prisma.corpusTopic.upsert({
        where: { topicId: topic.topicId },
        update: { ...topic, updatedAt: GENERATED_AT },
        create: { ...topic, updatedAt: GENERATED_AT },
      });
    }

    const organizationIds = new Map();
    for (const organization of plan.organizations) {
      const row = await prisma.organization.upsert({
        where: { slug: organization.slug },
        update: {
          name: organization.name,
          role: organization.role,
          isActive: true,
          description: `Wholly fictional ${PREFIX} organization for partner-filter and review-workflow testing.`,
        },
        create: {
          ...organization,
          contactEmail: `${organization.slug}@example.test`,
          description: `Wholly fictional ${PREFIX} organization for partner-filter and review-workflow testing.`,
        },
        select: { id: true, slug: true },
      });
      organizationIds.set(row.slug, row.id);
    }

    const algorithmIds = new Map();
    for (const [domainKey, expected] of Object.entries(pittsburghAlgorithms)) {
      const row = await prisma.algorithm.findUnique({
        where: { slug: expected.slug },
        select: { id: true, jurisdictionId: true },
      });
      if (!row || row.jurisdictionId !== 'pittsburgh') {
        throw new Error(`Expected Pittsburgh algorithm "${expected.slug}" for ${domainKey}.`);
      }
      algorithmIds.set(expected.slug, row.id);
    }
    for (const algorithm of plan.algorithms) {
      const { domain: item, ...algorithmData } = algorithm;
      const description = `Synthetic demo algorithm for ${item.useCase} feature testing; not a real deployed system.`;
      const purpose = `Exercise AlgoStories coverage, matching, Briefing, and cross-jurisdiction views for ${item.useCase}.`;
      const agencyName = `${algorithm.name.split(' (')[1]?.replace(' Demo)', '') || 'Demo'} Test Agency`;
      const claimText = `Synthetic claim: the ${algorithm.name} routes ${item.useCase.toLowerCase()} cases more consistently while preserving staff review.`;
      const row = await prisma.algorithm.upsert({
        where: { sourceId: algorithm.sourceId },
        update: {
          name: algorithm.name,
          useCase: algorithm.useCase,
          impactLevel: algorithm.impactLevel,
          status: algorithm.status,
          description,
          purpose,
          agencyName,
          agencyType: 'synthetic_demo',
          dataUsed: 'Wholly synthetic stories, neighbourhood labels, partner labels, and aggregate fixtures',
          decisionType: 'Synthetic test recommendation',
          currentVersion: PREFIX,
        },
        create: {
          ...algorithmData,
          description,
          purpose,
          agencyName,
          agencyType: 'synthetic_demo',
          location: algorithm.jurisdictionId,
          dataUsed: 'Wholly synthetic stories, neighbourhood labels, partner labels, and aggregate fixtures',
          decisionType: 'Synthetic test recommendation',
          yearIntroduced: 2025,
          yearDeployed: algorithm.status === 'PROPOSED' ? null : 2026,
          currentVersion: PREFIX,
        },
        select: { id: true, sourceId: true },
      });
      algorithmIds.set(algorithm.slug, row.id);
      const claimId = stableUuid(`claim:${algorithm.sourceId}`);
      await prisma.algorithmClaim.upsert({
        where: { id: claimId },
        update: {
          claimText,
          claimSource: `synthetic_demo:${PREFIX}`,
        },
        create: {
          id: claimId,
          algorithmId: row.id,
          jurisdictionId: algorithm.jurisdictionId,
          claimText,
          claimSource: `synthetic_demo:${PREFIX}`,
          claimDate: new Date('2026-01-15T00:00:00.000Z'),
        },
      });
      addSemanticRow({
        jurisdictionId: algorithm.jurisdictionId,
        entityType: 'algorithm',
        entityId: row.id,
        domainKey: item.key,
        content: [algorithm.name, item.useCase, description, purpose].join('\n'),
      });
      addSemanticRow({
        jurisdictionId: algorithm.jurisdictionId,
        entityType: 'claim',
        entityId: claimId,
        domainKey: item.key,
        content: claimText,
      });
    }

    for (const story of plan.stories) {
      const algorithmId = algorithmIds.get(story.algorithmSlug);
      const partnerOrgId = organizationIds.get(story.partnerSlug);
      const { algorithmSlug, partnerSlug, ...storyData } = story;
      const testimony = await prisma.testimony.upsert({
        where: { sourceId: story.sourceId },
        update: {
          ...storyData,
          partnerOrgId,
          aiLinkedAlgorithmIds: [algorithmId],
          referralSource: `Synthetic demo fixture (${PREFIX})`,
          moderationNotes: `SYNTHETIC DEMO DATA — generated by scripts/seed-comprehensive-demo-data.mjs; source prefix ${PREFIX}:`,
          isAnonymous: true,
          followupConsent: false,
          storyType: 'text',
        },
        create: {
          ...storyData,
          partnerOrgId,
          aiLinkedAlgorithmIds: [algorithmId],
          referralSource: `Synthetic demo fixture (${PREFIX})`,
          moderationNotes: `SYNTHETIC DEMO DATA — generated by scripts/seed-comprehensive-demo-data.mjs; source prefix ${PREFIX}:`,
          isAnonymous: true,
          followupConsent: false,
          storyType: 'text',
        },
        select: { id: true },
      });
      await prisma.testimonyAlgorithmLink.upsert({
        where: { testimonyId_algorithmId: { testimonyId: testimony.id, algorithmId } },
        update: { linkType: 'FACILITATOR_TAGGED', confidence: 1 },
        create: { testimonyId: testimony.id, algorithmId, linkType: 'FACILITATOR_TAGGED', confidence: 1 },
      });
      addSemanticRow({
        jurisdictionId: story.jurisdictionId,
        entityType: 'testimony',
        entityId: testimony.id,
        domainKey: domains.find((item) => item.useCase === story.affectedDomain).key,
        content: story.narrativeText,
      });
    }

    const cleanup = await prisma.$transaction(
      (tx) => cleanupPittsburghDemoAlgorithms(tx, algorithmIds),
      { maxWait: 10_000, timeout: 30_000 },
    );

    for (const [jurisdictionId, rows] of semanticRowsByJurisdiction) {
      const entityIds = rows.map((row) => row.entityId);
      await prisma.$transaction([
        prisma.semanticEmbedding.deleteMany({
          where: {
            jurisdictionId,
            entityId: { in: entityIds },
          },
        }),
        prisma.semanticEmbedding.createMany({ data: rows }),
      ]);
    }

    for (const insight of plan.insights) {
      const { id, ...insightData } = insight;
      await prisma.crossJurisdictionInsight.upsert({
        where: { id },
        update: { ...insightData, isApproved: true },
        create: { id, ...insightData, isApproved: true },
      });
    }

    const pittsburghPartners = plan.organizations.filter((row) => row.jurisdictionId === 'pittsburgh');
    const existingSynthetic = await prisma.testimony.findMany({
      where: {
        jurisdictionId: 'pittsburgh',
        AND: [
          {
            OR: [
              { sourceId: { startsWith: 'seed-story-' } },
              { sourceId: { startsWith: 'synthetic-' } },
              { sourceId: { startsWith: 'ml-training-' } },
              { sourceId: { startsWith: 'task1-audio-sample-' } },
            ],
          },
          { OR: [{ neighbourhood: null }, { partnerOrgId: null }] },
        ],
      },
      select: { id: true, sourceId: true, neighbourhood: true, partnerOrgId: true },
    });
    for (const row of existingSynthetic) {
      const bucket = Number.parseInt(createHash('sha256').update(row.sourceId).digest('hex').slice(0, 8), 16);
      await prisma.testimony.update({
        where: { id: row.id },
        data: {
          neighbourhood: row.neighbourhood || jurisdictions[0].neighbourhoods[bucket % jurisdictions[0].neighbourhoods.length],
          partnerOrgId: row.partnerOrgId || organizationIds.get(pittsburghPartners[bucket % pittsburghPartners.length].slug),
        },
      });
    }

    return {
      ...cleanup,
      enrichedExistingSyntheticStories: existingSynthetic.length,
      corpusTopicsUpserted: plan.topics.length,
      semanticEmbeddingsUpserted: [...semanticRowsByJurisdiction.values()].reduce((sum, rows) => sum + rows.length, 0),
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const plan = buildPlan();
  selfCheck(plan);
  if (args.has('--self-check')) {
    console.log('comprehensive demo data self-check ok');
    return;
  }
  const summary = planSummary(plan);
  if (!apply) {
    console.log(JSON.stringify({ ...summary, note: 'No database writes. Re-run with --apply to upsert demo-v2 records.' }, null, 2));
    return;
  }
  const result = await applyPlan(plan);
  console.log(JSON.stringify({ ...summary, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
