const strongScopePatterns = [
  /\bai\b/i,
  /\balgorithm/i,
  /\bautomated\b/i,
  /\brisk score\b/i,
  /\bpriority score\b/i,
  /\bscreening tool\b/i,
  /\brouting system\b/i,
  /\beligibility system\b/i,
  /\bverification engine\b/i,
  /\bstudent support system\b/i,
  /\btraffic management system\b/i,
  /\bhousing inspection system\b/i,
  /\blanguage access routing system\b/i,
  /\bcps\b/i,
  /\bchild welfare\b/i,
  /\bhousing authority\b/i,
  /\bbenefits office\b/i,
  /\bpublic agency\b/i,
  /\bgovernment\b/i,
];

const systemTerms = [
  'algorithm',
  'automated',
  'ai',
  'model',
  'system',
  'tool',
  'score',
  'flag',
  'screening',
  'routing',
  'eligibility',
  'verification',
  'matching',
  'data',
  'record',
];

const publicServiceTerms = [
  'agency',
  'authority',
  'department',
  'office',
  'county',
  'city',
  'pittsburgh',
  'allegheny',
  'benefits',
  'welfare',
  'housing',
  'inspection',
  'voucher',
  'assistance',
  'application',
  'caseworker',
  'worker',
  'student',
  'school',
  'teacher',
  'counselor',
  'transit',
  'traffic',
  'labor',
  'wage',
  'compliance',
  'unemployment',
  'interpreter',
  'language access',
  'child welfare',
  'cps',
];

const impactTerms = [
  'denied',
  'delayed',
  'flagged',
  'low priority',
  'high risk',
  'high-risk',
  'appeal',
  'review',
  'not told',
  'wrong',
  'incorrect',
  'outdated',
  'unsafe',
  'complaint',
  'approved',
  'connected',
  'helped',
];

export function assessMlNarrativeScope(text) {
  const value = String(text || '').trim();
  const lowerText = value.toLowerCase();
  if (!lowerText) {
    return { inScope: false, reason: 'No narrative text was provided.' };
  }

  if (strongScopePatterns.some((pattern) => pattern.test(value))) {
    return { inScope: true, reason: 'Matched public service algorithm context.' };
  }

  const systemScore = countTerms(lowerText, systemTerms);
  const serviceScore = countTerms(lowerText, publicServiceTerms);
  const impactScore = countTerms(lowerText, impactTerms);

  if (systemScore >= 1 && serviceScore >= 1) {
    return { inScope: true, reason: 'Matched system and public service context.' };
  }
  if (serviceScore >= 2 && impactScore >= 1) {
    return { inScope: true, reason: 'Matched public service and experience context.' };
  }

  return {
    inScope: false,
    reason: 'This text does not appear to describe a public service algorithm experience.',
  };
}

function countTerms(text, terms) {
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}
