import { searchTokens } from './searchRanking.js';

export const ALGORITHM_MATCH_THRESHOLD = 0.35;
export const ALGORITHM_MATCH_LIMIT = 1;
export const ALGORITHM_MATCH_METHOD = 'task-output+registry-text';
export const ALGORITHM_MATCH_VERSION = '2026-07-14.1';

const ALGORITHM_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  purpose: true,
  agencyName: true,
  useCase: true,
  dataUsed: true,
  decisionType: true,
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from', 'had', 'has', 'have',
  'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'was',
  'were', 'with', 'used', 'using', 'use', 'helps', 'help', 'based', 'public', 'pittsburgh',
  'allegheny', 'county', 'city', 'government', 'office', 'agency', 'service', 'services',
  'algorithm', 'automated', 'system', 'tool', 'model', 'engine', 'portal', 'assistant',
]);

const TOKEN_ALIASES = new Map([
  ['benefit', 'benefits'], ['eligibility', 'benefits'], ['assistance', 'benefits'],
  ['child', 'childwelfare'], ['children', 'childwelfare'], ['family', 'childwelfare'], ['cps', 'childwelfare'],
  ['education', 'student'], ['school', 'student'], ['students', 'student'],
  ['employment', 'job'], ['career', 'job'], ['jobs', 'job'],
  ['electricity', 'energy'], ['utility', 'energy'], ['heating', 'energy'],
  ['interpreter', 'language'], ['spanish', 'language'], ['multilingual', 'language'],
  ['librarian', 'library'], ['libraries', 'library'],
  ['bus', 'transit'], ['rider', 'transit'],
  ['ambulance', 'emergency'], ['dispatcher', 'dispatch'], ['dispatchers', 'dispatch'],
  ['inspection', 'inspect'], ['inspections', 'inspect'], ['inspector', 'inspect'],
  ['recommended', 'recommend'], ['recommends', 'recommend'], ['recommendation', 'recommend'],
  ['prioritization', 'priority'], ['prioritize', 'priority'], ['prioritizes', 'priority'],
  ['classification', 'classify'], ['classifier', 'classify'], ['classified', 'classify'],
  ['verification', 'verify'], ['verified', 'verify'],
  ['routing', 'route'], ['routed', 'route'],
  ['screening', 'screen'], ['screeners', 'screen'],
  ['prediction', 'predict'], ['predictor', 'predict'], ['predicts', 'predict'],
  ['matching', 'match'], ['matched', 'match'], ['matches', 'match'],
  ['allocation', 'allocate'],
  ['housing', 'housing'], ['homeless', 'housing'], ['shelter', 'housing'], ['tenant', 'housing'],
  ['traffic', 'traffic'], ['signals', 'traffic'], ['congestion', 'traffic'],
  ['fraudulent', 'fraud'], ['fraud', 'fraud'],
  ['payroll', 'wage'], ['wages', 'wage'], ['labor', 'wage'],
]);

/** @type {Array<[string, RegExp]>} */
const CONCEPT_PATTERNS = [
  ['fraud', /\b(?:fraud|unusual transaction|suspicious transaction|benefit card hold)\b/i],
  ['traffic', /\b(?:traffic|signal timing|road closure|vehicle flow|congestion)\b/i],
  ['student', /\b(?:student|school|attendance|grades?|meal program|lunch)\b/i],
  ['job', /\b(?:job|career|employment opening|work schedule|shift)\b/i],
  ['energy', /\b(?:energy|electricity|utility|power grid|heating)\b/i],
  ['housing', /\b(?:housing|homeless|shelter|tenant|rental|eviction)\b/i],
  ['eviction', /\b(?:eviction|court filing|dismissal|legal aid|hearing date)\b/i],
  ['inspect', /\b(?:inspection|inspector|mold|building violation|broken heat)\b/i],
  ['benefits', /\b(?:benefits?|eligibility|food assistance|rental aid|renewal)\b/i],
  ['emergency', /\b(?:emergency|dispatch|dispatcher|ambulance|welfare check|response team)\b/i],
  ['library', /\b(?:library|librarian|workshop|public resources?)\b/i],
  ['transit', /\b(?:transit|bus stop|rider|station|regional transit)\b/i],
  ['language', /\b(?:language access|interpreter|spanish|multilingual)\b/i],
  ['childwelfare', /\b(?:child welfare|family screening|cps|protective services)\b/i],
  ['wage', /\b(?:wage|payroll|employer|labor investigator|wage theft)\b/i],
];

/** @type {Map<string, { pattern: RegExp, missingFactor: number, matchedBonus: number }>} */
const SPECIALIZED_ALGORITHM_CUES = new Map([
  ['eviction-risk-prioritization-model', {
    pattern: /\b(?:eviction|evicted|court(?: filing| record)?|filing|dismissal|legal aid|hearing)\b/i,
    missingFactor: 0.65,
    matchedBonus: 0.08,
  }],
  ['public-housing-inspection-scheduler', {
    pattern: /\b(?:inspection|inspect(?:ed|ion|or)?|mold|broken heat|building violation|housing complaint|photos?)\b/i,
    missingFactor: 0.65,
    matchedBonus: 0.08,
  }],
  ['housing-allocation-algorithm', {
    pattern: /\b(?:voucher|wait\s?list|shelter|homeless|unhoused|housing (?:request|application|priority)|priority score|ranking rule|allocation)\b/i,
    missingFactor: 0.85,
    matchedBonus: 0.08,
  }],
]);

/**
 * @typedef {object} AlgorithmMatchOptions
 * @property {string} [narrativeText]
 * @property {string} [title]
 * @property {string} [affectedDomain]
 * @property {{ systems?: unknown[], agencies?: unknown[] }} [entities]
 * @property {unknown[]} [keywords]
 * @property {Array<Record<string, any>>} [algorithms]
 * @property {number} [threshold]
 * @property {number} [limit]
 */

/** @param {AlgorithmMatchOptions} [options] */
export function matchAlgorithms({
  narrativeText = '',
  title = '',
  affectedDomain = '',
  entities = {},
  keywords = [],
  algorithms = [],
  threshold = ALGORITHM_MATCH_THRESHOLD,
  limit = ALGORITHM_MATCH_LIMIT,
} = {}) {
  const storyText = joinValues([title, narrativeText, keywords, entities.systems, entities.agencies]);
  const storyTokens = signalTokens(storyText);
  const keywordTokens = signalTokens(joinValues(keywords));
  const systemValues = normalizeList(entities.systems);
  const agencyValues = normalizeList(entities.agencies);
  const domainTokens = signalTokens(affectedDomain);

  return algorithms
    .map((algorithm) => scoreAlgorithm({
      algorithm,
      storyText,
      storyTokens,
      keywordTokens,
      systemValues,
      agencyValues,
      domainTokens,
    }))
    .filter((match) => match.confidence >= threshold)
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name))
    .slice(0, limit);
}

export function buildAlgorithmMatchResult(options = {}) {
  return {
    status: 'COMPLETED',
    method: ALGORITHM_MATCH_METHOD,
    version: ALGORITHM_MATCH_VERSION,
    catalogVersion: getAlgorithmCatalogVersion(options.algorithms),
    generatedAt: new Date().toISOString(),
    threshold: options.threshold ?? ALGORITHM_MATCH_THRESHOLD,
    matches: matchAlgorithms(options),
  };
}

export function getAlgorithmCatalogVersion(algorithms = []) {
  const serialized = [...algorithms]
    .sort((left, right) => String(left.id || '').localeCompare(String(right.id || '')))
    .map((algorithm) => [
      algorithm.id,
      algorithm.name,
      algorithm.slug,
      algorithm.description,
      algorithm.purpose,
      algorithm.agencyName,
      algorithm.useCase,
      algorithm.dataUsed,
      algorithm.decisionType,
    ].map((value) => String(value || '').trim()).join('\u001f'))
    .join('\u001e');
  return `fnv1a-${fnv1a(serialized)}`;
}

export async function loadAlgorithmMatchCatalog(prisma, jurisdictionId) {
  return prisma.algorithm.findMany({
    where: { jurisdictionId },
    orderBy: { name: 'asc' },
    select: ALGORITHM_SELECT,
  });
}

/**
 * @param {{
 *   analysis?: Record<string, any>,
 *   narrativeText?: string,
 *   title?: string,
 *   affectedDomain?: string,
 *   algorithms?: Array<Record<string, any>>,
 * }} [options]
 */
export function buildAlgorithmMatchResultFromAnalysis({
  analysis,
  narrativeText,
  title = '',
  affectedDomain = '',
  algorithms = [],
} = {}) {
  return buildAlgorithmMatchResult({
    narrativeText,
    title,
    affectedDomain,
    entities: analysis?.task4?.entities || {},
    keywords: analysis?.task5?.keywords || [],
    algorithms,
  });
}

function scoreAlgorithm({
  algorithm,
  storyText,
  storyTokens,
  keywordTokens,
  systemValues,
  agencyValues,
  domainTokens,
}) {
  const primaryText = joinValues([algorithm.name, algorithm.useCase]);
  const metadataText = joinValues([
    primaryText,
    algorithm.description,
    algorithm.purpose,
    algorithm.dataUsed,
    algorithm.decisionType,
  ]);
  const primaryTokens = signalTokens(primaryText);
  const metadataTokens = signalTokens(metadataText);
  const candidateAgencyTokens = signalTokens(algorithm.agencyName);
  const candidateDomainTokens = signalTokens(algorithm.useCase);
  const primaryCoverage = coverage(primaryTokens, storyTokens);
  const metadataCoverage = coverage(metadataTokens, storyTokens);
  const systemMatch = systemValues.reduce((best, value) => Math.max(
    best,
    dice(signalTokens(value), primaryTokens),
  ), 0);
  const exactPhraseMatch = phraseIncluded(storyText, algorithm.name) || phraseIncluded(storyText, algorithm.useCase) ? 1 : 0;
  const textSimilarity = clamp(Math.max(
    (0.72 * primaryCoverage) + (0.28 * metadataCoverage),
    systemMatch * 0.95,
    exactPhraseMatch,
  ));
  const keywordOverlap = clamp(Math.max(
    coverage(keywordTokens, metadataTokens),
    coverage(primaryTokens, keywordTokens),
  ));
  const agencyMatch = agencyValues.reduce((best, value) => Math.max(
    best,
    dice(signalTokens(value), candidateAgencyTokens),
  ), 0);
  const domainMatch = domainTokens.size
    ? Math.max(coverage(candidateDomainTokens, domainTokens), dice(domainTokens, candidateDomainTokens))
    : 0;
  const weightedScore = clamp(
    (0.45 * textSimilarity)
    + (0.20 * keywordOverlap)
    + (0.20 * agencyMatch)
    + (0.15 * domainMatch),
  );
  const specificity = specializedCueAdjustment(algorithm, storyText);
  const confidence = clamp((weightedScore * specificity.factor) + specificity.bonus);

  return {
    algorithmId: algorithm.id,
    name: algorithm.name,
    slug: algorithm.slug,
    confidence: roundScore(confidence),
    linkType: 'AI_DETECTED',
    method: ALGORITHM_MATCH_METHOD,
    scoreBreakdown: {
      textSimilarity: roundScore(textSimilarity),
      keywordOverlap: roundScore(keywordOverlap),
      agencyMatch: roundScore(agencyMatch),
      domainMatch: roundScore(domainMatch),
      specificityFactor: roundScore(specificity.factor),
      specificityBonus: roundScore(specificity.bonus),
    },
  };
}

function specializedCueAdjustment(algorithm, storyText) {
  const rule = SPECIALIZED_ALGORITHM_CUES.get(String(algorithm.slug || '').toLowerCase());
  if (!rule) return { factor: 1, bonus: 0 };
  return rule.pattern.test(String(storyText || ''))
    ? { factor: 1, bonus: rule.matchedBonus }
    : { factor: rule.missingFactor, bonus: 0 };
}

function signalTokens(value) {
  const text = String(value || '');
  const tokens = searchTokens(text)
    .map(canonicalToken)
    .filter((token) => token && !STOP_WORDS.has(token));
  for (const [concept, pattern] of CONCEPT_PATTERNS) {
    if (pattern.test(text)) tokens.push(concept);
  }
  return new Set(tokens);
}

function canonicalToken(value) {
  const token = String(value || '').toLowerCase();
  if (TOKEN_ALIASES.has(token)) return TOKEN_ALIASES.get(token);
  if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function coverage(expected, observed) {
  if (!expected.size || !observed.size) return 0;
  let matches = 0;
  for (const token of expected) if (observed.has(token)) matches += 1;
  return matches / expected.size;
}

function dice(left, right) {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const token of left) if (right.has(token)) matches += 1;
  return (2 * matches) / (left.size + right.size);
}

function phraseIncluded(source, phrase) {
  const normalizedSource = searchTokens(source).join(' ');
  const normalizedPhrase = searchTokens(phrase).join(' ');
  return Boolean(normalizedPhrase && normalizedSource.includes(normalizedPhrase));
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function joinValues(values) {
  return values.flat(Infinity).map((value) => String(value || '').trim()).filter(Boolean).join(' ');
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function roundScore(value) {
  return Number(clamp(value).toFixed(4));
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
