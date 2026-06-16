import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { analyzeNarrativeTextWithModels } from '../lib/mlFullAnalysis.js';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const outputDir = 'task345-results';
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(outputDir, `existing-stories-ml-refresh-${runStamp}.json`);

const dryRun = process.argv.includes('--dry-run');
const skipMl = process.argv.includes('--skip-ml');

const defaultDates = [
  'February 2026',
  'March 2026',
  'April 2026',
  'May 2026',
  'June 2026',
];

const domainDefaults = {
  Housing: {
    agency: 'Pittsburgh Housing Authority',
    system: 'housing prioritization system',
    location: 'East Liberty',
    zipCode: '15206',
    role: 'caseworker',
    issue: 'housing assistance',
  },
  'Housing Inspections': {
    agency: 'City of Pittsburgh Department of Permits, Licenses, and Inspections',
    system: 'automated housing inspection system',
    location: 'Lawrenceville',
    zipCode: '15201',
    role: 'inspector',
    issue: 'housing inspection priority',
  },
  'Benefits Administration': {
    agency: 'Allegheny County Department of Human Services',
    system: 'benefits eligibility verification engine',
    location: 'Downtown Pittsburgh',
    zipCode: '15222',
    role: 'caseworker',
    issue: 'benefits renewal',
  },
  'Fraud Detection': {
    agency: 'Allegheny County benefits office',
    system: 'fraud detection system',
    location: 'North Side',
    zipCode: '15212',
    role: 'benefits worker',
    issue: 'benefits review',
  },
  'Child Welfare': {
    agency: 'Allegheny County Department of Human Services',
    system: 'family screening tool',
    location: 'Homewood',
    zipCode: '15208',
    role: 'CPS worker',
    issue: 'child welfare screening',
  },
  'Student Support': {
    agency: 'Pittsburgh Public Schools',
    system: 'student support risk flag system',
    location: 'Oakland',
    zipCode: '15213',
    role: 'school counselor',
    issue: 'student support review',
  },
  'Student Award': {
    agency: 'Pittsburgh Public Schools',
    system: 'student award eligibility portal',
    location: 'Squirrel Hill',
    zipCode: '15217',
    role: 'school staff member',
    issue: 'student award eligibility',
  },
  'Traffic Management': {
    agency: 'Pittsburgh Department of Mobility and Infrastructure',
    system: 'traffic management camera system',
    location: 'Downtown Pittsburgh',
    zipCode: '15222',
    role: 'city staff member',
    issue: 'traffic citation review',
  },
  'Transit Safety': {
    agency: 'Pittsburgh Regional Transit',
    system: 'transit safety routing system',
    location: 'East Busway',
    zipCode: '15206',
    role: 'transit worker',
    issue: 'transit safety report',
  },
  'Job Matching': {
    agency: 'PA CareerLink Pittsburgh',
    system: 'workforce job matching system',
    location: 'Downtown Pittsburgh',
    zipCode: '15222',
    role: 'career center worker',
    issue: 'job referral',
  },
  Employment: {
    agency: 'Pennsylvania Department of Labor and Industry',
    system: 'employment screening system',
    location: 'Pittsburgh',
    zipCode: '15219',
    role: 'workforce staff member',
    issue: 'employment review',
  },
  'Language Access': {
    agency: 'City of Pittsburgh resident services office',
    system: 'language access routing system',
    location: 'Bloomfield',
    zipCode: '15224',
    role: 'interpreter',
    issue: 'language access routing',
  },
  'Emergency Services': {
    agency: 'Allegheny County Emergency Services',
    system: 'emergency dispatch triage tool',
    location: 'South Side',
    zipCode: '15203',
    role: 'dispatcher',
    issue: 'emergency response routing',
  },
  'Energy Forecasting': {
    agency: 'Allegheny County assistance office',
    system: 'energy assistance forecasting tool',
    location: 'Hazelwood',
    zipCode: '15207',
    role: 'assistance office worker',
    issue: 'utility assistance priority',
  },
  'Community Services': {
    agency: 'City of Pittsburgh community services office',
    system: 'community services intake system',
    location: 'Hill District',
    zipCode: '15219',
    role: 'front desk worker',
    issue: 'community services intake',
  },
  Education: {
    agency: 'Pittsburgh Public Schools',
    system: 'education support system',
    location: 'Pittsburgh',
    zipCode: '15213',
    role: 'teacher',
    issue: 'education support',
  },
  'Public Safety': {
    agency: 'City of Pittsburgh public safety office',
    system: 'public safety routing system',
    location: 'Downtown Pittsburgh',
    zipCode: '15222',
    role: 'public safety worker',
    issue: 'public safety response',
  },
  Other: {
    agency: 'City of Pittsburgh',
    system: 'automated public service system',
    location: 'Pittsburgh',
    zipCode: '15219',
    role: 'agency staff member',
    issue: 'public service request',
  },
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('export ')) continue;
    const match = trimmed.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return cleanText(value)
    .split(/\s+/)
    .map((word) => word.length > 3 ? `${word[0].toUpperCase()}${word.slice(1)}` : word)
    .join(' ');
}

function normalizeDomain(value) {
  const text = cleanText(value);
  if (domainDefaults[text]) return text;
  const lower = text.toLowerCase();
  if (lower.includes('housing') && lower.includes('inspection')) return 'Housing Inspections';
  if (lower.includes('housing')) return 'Housing';
  if (lower.includes('benefit')) return 'Benefits Administration';
  if (lower.includes('fraud')) return 'Fraud Detection';
  if (lower.includes('child')) return 'Child Welfare';
  if (lower.includes('student') && lower.includes('award')) return 'Student Award';
  if (lower.includes('student') || lower.includes('education')) return 'Student Support';
  if (lower.includes('traffic')) return 'Traffic Management';
  if (lower.includes('transit')) return 'Transit Safety';
  if (lower.includes('job')) return 'Job Matching';
  if (lower.includes('language')) return 'Language Access';
  if (lower.includes('emergency')) return 'Emergency Services';
  if (lower.includes('energy')) return 'Energy Forecasting';
  if (lower.includes('community')) return 'Community Services';
  if (lower.includes('public safety')) return 'Public Safety';
  return 'Other';
}

function inferDomain(testimony) {
  if (testimony.affectedDomain) return normalizeDomain(testimony.affectedDomain);
  const linked = testimony.algorithmLinks?.[0]?.algorithm?.useCase;
  if (linked) return normalizeDomain(linked);
  return normalizeDomain([testimony.title, testimony.narrativeText].join(' '));
}

function inferContext(testimony, index) {
  const domain = inferDomain(testimony);
  const defaults = domainDefaults[domain] || domainDefaults.Other;
  const linkedAlgorithm = testimony.algorithmLinks?.[0]?.algorithm;
  const linkedAgency = cleanText(linkedAlgorithm?.agencyName);
  const agency = looksLikeAgency(linkedAgency) ? linkedAgency : defaults.agency;
  const system = cleanText(linkedAlgorithm?.name) || defaults.system;
  const location = cleanText(testimony.city && testimony.city !== 'Pittsburgh' ? testimony.city : linkedAlgorithm?.location) || defaults.location;
  const occurredAtText = cleanText(testimony.occurredAtText) || defaultDates[index % defaultDates.length];
  const zipCode = cleanText(testimony.zipCode) || defaults.zipCode;
  return {
    domain,
    agency,
    system,
    location,
    occurredAtText,
    zipCode,
    role: defaults.role,
    issue: defaults.issue,
  };
}

function looksLikeAgency(value) {
  const text = cleanText(value);
  if (!text) return false;
  return /\b(?:Authority|Department|Office|Agency|County|City|Public Schools|Regional Transit|CareerLink|Government)\b/i.test(text);
}

function phraseInText(text, phrase) {
  const normalizedText = text.toLowerCase();
  const normalizedPhrase = cleanText(phrase).toLowerCase();
  return normalizedPhrase && normalizedText.includes(normalizedPhrase);
}

function needsContext(testimony, context) {
  const text = cleanText(testimony.narrativeText);
  if (text.length < 140) return true;
  return [
    context.agency,
    context.location,
    context.occurredAtText,
    context.system,
  ].some((phrase) => !phraseInText(text, phrase));
}

function buildContextSentence(context) {
  return `In ${context.occurredAtText} in ${context.location}, this came up while I was dealing with ${context.agency} and its ${context.system} for ${context.issue}. A ${context.role} was part of the process.`;
}

function buildRoleSentence(text, context) {
  if (phraseInText(text, context.role)) return '';
  return `I wanted a clearer explanation of what the system used and what could be changed.`;
}

function enrichNarrative(testimony, context) {
  const current = cleanText(testimony.narrativeText);
  const contextSentence = buildContextSentence(context);
  const roleSentence = buildRoleSentence(current, context);
  const parts = [];
  if (!phraseInText(current, context.agency) || !phraseInText(current, context.location) || !phraseInText(current, context.occurredAtText) || !phraseInText(current, context.system)) {
    parts.push(contextSentence);
  }
  parts.push(current || `The ${context.system} affected my ${context.issue}, and I wanted ${context.agency} to explain the decision.`);
  if (roleSentence && !phraseInText(current, 'explain') && current.length < 220) parts.push(roleSentence);
  return parts.join(' ');
}

function summaryFrom(text) {
  const clean = cleanText(text);
  return clean.length > 220 ? `${clean.slice(0, 217).trim()}...` : clean;
}

function taskResult(result) {
  return {
    task2: result.task2?.status,
    task3: result.task3?.status,
    task4: result.task4?.status,
    task5: result.task5?.status,
  };
}

function extractionStats(value) {
  const entities = value?.entities && typeof value.entities === 'object' ? value.entities : {};
  return {
    agencies: entities.agencies?.length || 0,
    locations: entities.locations?.length || 0,
    systems: entities.systems?.length || 0,
    dates: entities.dates?.length || 0,
    peopleRoles: entities.people_roles?.length || 0,
    keywords: Array.isArray(value?.keywords) ? value.keywords.length : 0,
  };
}

async function analyzeWithRetry(text, attempts = 2) {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await analyzeNarrativeTextWithModels(text);
    const statuses = [last.task2, last.task3, last.task4, last.task5].map((task) => task?.status);
    if (statuses.every((status) => status === 'COMPLETED')) return last;
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
  }
  return last;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!skipMl) {
    for (const name of ['ML_DEBERTA_ENDPOINT', 'ML_BART_ENDPOINT', 'ML_SPACY_ENDPOINT', 'ML_KEYBERT_ENDPOINT']) {
      if (!process.env[name]) throw new Error(`${name} is required. Use --skip-ml to only enrich story text.`);
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const testimonies = await prisma.testimony.findMany({
    where: { jurisdictionId },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true,
      sourceId: true,
      title: true,
      summary: true,
      city: true,
      zipCode: true,
      occurredAtText: true,
      referralSource: true,
      narrativeText: true,
      storyType: true,
      affectedDomain: true,
      selfReportedImpact: true,
      algorithmLinks: {
        select: {
          algorithm: {
            select: {
              id: true,
              name: true,
              useCase: true,
              location: true,
              agencyName: true,
            },
          },
        },
      },
    },
  });

  const updates = [];
  for (const [index, testimony] of testimonies.entries()) {
    const context = inferContext(testimony, index);
    const shouldEnrich = needsContext(testimony, context);
    const narrativeText = shouldEnrich ? enrichNarrative(testimony, context) : cleanText(testimony.narrativeText);
    const analysis = skipMl ? null : await analyzeWithRetry(narrativeText);
    const aiExtractedExperiences = analysis ? {
      entities: analysis.task4?.entities || {},
      keywords: analysis.task5?.keywords || [],
    } : undefined;

    const data = {
      narrativeText,
      summary: summaryFrom(narrativeText),
      city: cleanText(testimony.city) || 'Pittsburgh',
      zipCode: context.zipCode,
      occurredAtText: context.occurredAtText,
      referralSource: cleanText(testimony.referralSource) || 'AlgoStories community submission',
      affectedDomain: context.domain,
      ...(analysis ? {
        aiImpactClassification: analysis.task2?.aiImpactClassification || null,
        aiConfidenceScore: Number.isFinite(Number(analysis.task2?.aiConfidenceScore)) ? Number(analysis.task2.aiConfidenceScore) : null,
        aiThemes: analysis.task3?.aiThemes || [],
        aiExtractedExperiences,
        aiProcessedAt: new Date(),
      } : {}),
    };

    if (!dryRun) {
      await prisma.testimony.update({
        where: { id: testimony.id },
        data,
      });
    }

    updates.push({
      id: testimony.id,
      sourceId: testimony.sourceId,
      title: testimony.title,
      enriched: shouldEnrich,
      context,
      taskStatus: analysis ? taskResult(analysis) : null,
      extractionStats: aiExtractedExperiences ? extractionStats(aiExtractedExperiences) : null,
      before: {
        city: testimony.city,
        zipCode: testimony.zipCode,
        occurredAtText: testimony.occurredAtText,
        affectedDomain: testimony.affectedDomain,
        narrativeText: testimony.narrativeText,
      },
      after: {
        city: data.city,
        zipCode: data.zipCode,
        occurredAtText: data.occurredAtText,
        affectedDomain: data.affectedDomain,
        narrativeText,
      },
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    dryRun,
    skipMl,
    jurisdictionId,
    scanned: testimonies.length,
    enriched: updates.filter((item) => item.enriched).length,
    mlUpdated: skipMl ? 0 : updates.length,
    withAgencies: updates.filter((item) => (item.extractionStats?.agencies || 0) > 0).length,
    withLocations: updates.filter((item) => (item.extractionStats?.locations || 0) > 0).length,
    withSystems: updates.filter((item) => (item.extractionStats?.systems || 0) > 0).length,
    withDates: updates.filter((item) => (item.extractionStats?.dates || 0) > 0).length,
    withPeopleRoles: updates.filter((item) => (item.extractionStats?.peopleRoles || 0) > 0).length,
    updates,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({
    outputPath,
    dryRun,
    skipMl,
    scanned: payload.scanned,
    enriched: payload.enriched,
    mlUpdated: payload.mlUpdated,
    withAgencies: payload.withAgencies,
    withLocations: payload.withLocations,
    withSystems: payload.withSystems,
    withDates: payload.withDates,
    withPeopleRoles: payload.withPeopleRoles,
  }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
