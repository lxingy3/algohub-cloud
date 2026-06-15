const negativeTerms = [
  'harm',
  'harmed',
  'unsafe',
  'denied',
  'delay',
  'delayed',
  'wrong',
  'incorrect',
  'risk',
  'flag',
  'flagged',
  'low priority',
  'unfair',
  'complaint',
  'failed',
  'missing',
  'not eligible',
  'rejected',
  'ignored',
  'worse',
  'problem',
];

const positiveTerms = [
  'help',
  'helped',
  'support',
  'supported',
  'worked',
  'successful',
  'success',
  'faster',
  'right person',
  'improved',
  'approved',
  'resolved',
  'connected',
  'completed',
  'benefit',
  'better',
];

const unclearTerms = [
  'not sure',
  'unclear',
  'do not know',
  "don't know",
  'unknown',
  'no clear',
  'cannot tell',
];

export const themeTerms = {
  opacity: ['explain', 'explained', 'why', 'how', 'transparent', 'transparency', 'calculated', 'criteria'],
  positive_experience: ['helped', 'worked', 'successful', 'faster', 'connected', 'completed', 'approved', 'right person'],
  lack_of_recourse: ['appeal', 'challenge', 'no way', 'could not dispute', 'recourse', 'review'],
  process_confusion: ['confused', 'confusion', 'unclear', 'not sure', 'do not know', "didn't know"],
  arbitrary_outcome: ['random', 'inconsistent', 'arbitrary', 'did not match', 'mismatch'],
  delayed_outcome: ['delay', 'delayed', 'waiting', 'months', 'weeks', 'took too long', 'slow'],
  discriminatory_impact: ['bias', 'biased', 'discriminatory', 'race', 'racial', 'income', 'demographic', 'homeless'],
  lack_of_notification: ['not told', 'no notice', 'notice', 'algorithm involved', "didn't realize"],
  data_accuracy: ['incorrect', 'wrong', 'outdated', 'old record', 'missing data', 'accuracy', 'record'],
  loss_of_dignity: ['dignity', 'dehumanized', 'treated', 'suspicion', 'punished', 'ashamed'],
};

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

const stopwords = new Set(['able', 'about', 'after', 'again', 'also', 'and', 'are', 'because', 'before', 'being', 'but', 'could', 'during', 'every', 'first', 'for', 'from', 'had', 'has', 'have', 'here', 'her', 'him', 'his', 'how', 'into', 'like', 'made', 'more', 'most', 'not', 'one', 'our', 'out', 'over', 'own', 'she', 'than', 'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'too', 'was', 'were', 'when', 'where', 'which', 'while', 'who', 'why', 'with', 'without', 'would', 'you', 'your', 'system', 'algorithm', 'automated', 'public', 'service', 'story']);

export function analyzeNarrativeText(narrativeText) {
  const text = String(narrativeText || '').trim();
  return {
    inputField: 'narrativeText',
    task1: {
      status: 'SKIPPED',
      reason: 'Text input does not need transcription.',
    },
    task2: analyzeImpact(text),
    task3: {
      aiThemes: detectThemes(text),
    },
    task4: {
      entities: extractEntities(text),
    },
    task5: {
      keywords: extractKeywords(text),
    },
  };
}

export function analyzeImpact(text) {
  const lowerText = String(text || '').toLowerCase();
  if (!lowerText.trim()) {
    return { aiImpactClassification: 'UNCLEAR', aiConfidenceScore: 0.5, humanReviewRequired: true };
  }

  const negativeScore = scoreTerms(lowerText, negativeTerms);
  const positiveScore = scoreTerms(lowerText, positiveTerms);
  const unclearScore = scoreTerms(lowerText, unclearTerms);

  let classification = 'UNCLEAR';
  let confidence = 0.55;
  if (unclearScore >= 2 && Math.max(negativeScore, positiveScore) <= 1) {
    confidence = confidenceFromScore(unclearScore);
  } else if (negativeScore >= 2 && positiveScore >= 2) {
    classification = 'MIXED';
    confidence = confidenceFromScore(Math.min(negativeScore, positiveScore) + 1);
  } else if (negativeScore > positiveScore) {
    classification = 'NEGATIVE';
    confidence = confidenceFromScore(negativeScore);
  } else if (positiveScore > negativeScore) {
    classification = 'POSITIVE';
    confidence = confidenceFromScore(positiveScore);
  }

  return {
    aiImpactClassification: classification,
    aiConfidenceScore: Number(confidence.toFixed(2)),
    humanReviewRequired: confidence < 0.85,
    evidenceScores: {
      negative: negativeScore,
      positive: positiveScore,
      unclear: unclearScore,
    },
  };
}

export function detectThemes(text) {
  const lowerText = String(text || '').toLowerCase();
  const themes = Object.entries(themeTerms)
    .map(([theme, terms]) => {
      const evidence = terms.filter((term) => lowerText.includes(term));
      return evidence.length ? { theme, confidence: Number(confidenceFromScore(evidence.length).toFixed(2)), evidence: evidence.slice(0, 4) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return themes.length ? themes : [{ theme: 'process_confusion', confidence: 0.5, evidence: [] }];
}

export function extractEntities(text) {
  const value = String(text || '');
  const lowerText = value.toLowerCase();
  const entities = {
    agencies: uniqueMatches(value.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s+(?:Agency|Department|Office|Authority|Center|University|County)\b/g)),
    locations: uniqueMatches(value.match(/\b(?:Pittsburgh|Allegheny County|Downtown Labor Center)\b/g)),
    systems: ['risk score', 'priority score', 'waiting list', 'screening tool', 'routing system', 'inspection system', 'student support system', 'benefits system', 'housing system', 'traffic management system'].filter((term) => lowerText.includes(term)),
    dates: uniqueMatches(value.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\b\d{4}\b/g)),
    people_roles: ['caseworker', 'worker', 'screeners', 'supervisors', 'counselor', 'teacher', 'tenant', 'resident', 'parent', 'student', 'caller', 'interpreter', 'agency staff', 'community member'].filter((term) => lowerText.includes(term)),
  };

  return Object.fromEntries(entityGroups.map((group) => [group, entities[group] || []]));
}

export function extractKeywords(text) {
  const words = String(text || '').toLowerCase().match(/[a-z][a-z'-]{2,}/g)?.filter((word) => !stopwords.has(word)) || [];
  const candidates = [];
  for (const size of [3, 2]) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(' ');
      if (new Set(phrase.split(' ')).size > 1) candidates.push(phrase);
    }
  }
  candidates.push(...words);

  const counts = new Map();
  for (const candidate of candidates) counts.set(candidate, (counts.get(candidate) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([candidate]) => candidate);
  const selected = [];
  for (const candidate of ranked) {
    const tokens = new Set(candidate.split(' '));
    const repeatsExisting = selected.some((existing) => {
      const existingTokens = new Set(existing.split(' '));
      const overlap = [...tokens].filter((token) => existingTokens.has(token)).length;
      return overlap >= Math.min(tokens.size, 2);
    });
    if (!repeatsExisting) selected.push(candidate);
    if (selected.length >= 10) break;
  }
  return selected;
}

function scoreTerms(text, terms) {
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function confidenceFromScore(score) {
  return Math.min(0.84, 0.58 + score * 0.07);
}

function uniqueMatches(matches) {
  return [...new Set(matches || [])];
}
