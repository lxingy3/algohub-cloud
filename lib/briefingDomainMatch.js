const CANONICAL_DOMAINS = new Map([
  ['housing prioritization', 'housing'],
  ['housing services', 'housing'],
  ['housing', 'housing'],
  ['housing inspections', 'housing inspections'],
  ['child welfare', 'child welfare'],
  ['benefits administration', 'benefits administration'],
  ['fraud detection', 'fraud detection'],
  ['emergency services', 'emergency services'],
  ['traffic management', 'traffic management'],
  ['transit safety', 'transit safety'],
  ['language access', 'language access'],
  ['community services', 'community services'],
  ['employment', 'employment'],
  ['job matching', 'job matching'],
  ['student support', 'student support'],
  ['student award', 'student award'],
  ['energy forecasting', 'energy forecasting'],
]);

export function compatibleBriefingDomain(storyDomain, algorithmUseCase) {
  const story = canonicalDomain(storyDomain);
  const algorithm = canonicalDomain(algorithmUseCase);
  return Boolean(story && algorithm && story === algorithm);
}

export function canonicalBriefingDomain(value) {
  return canonicalDomain(value);
}

function canonicalDomain(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return CANONICAL_DOMAINS.get(normalized) || normalized;
}
