const HF_BASE_URL = 'https://api-inference.huggingface.co/models';

const TASK2_MODEL = 'MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33';
const TASK3_MODEL = 'facebook/bart-large-mnli';
const TASK4_MODEL = 'dslim/bert-base-NER';
const TASK5_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

const impactLabels = {
  NEGATIVE: 'The story says an automated system harmed, disadvantaged, delayed, denied, wrongly flagged, or unfairly treated the person.',
  POSITIVE: 'The story says an automated system worked well, helped the person, improved access, or led to a good outcome.',
  UNCLEAR: 'The story does not make the impact clear enough to determine whether it was positive or negative.',
};

const themeLabels = {
  opacity: 'Person did not understand how or why a decision was made.',
  positive_experience: 'System worked well or led to a good outcome.',
  lack_of_recourse: 'No way to challenge or appeal the automated decision.',
  process_confusion: 'Person was confused about the overall process.',
  arbitrary_outcome: 'Decision seemed random or inconsistent.',
  delayed_outcome: 'Process took unreasonably long.',
  discriminatory_impact: 'Suspected racial, economic, or demographic bias.',
  lack_of_notification: 'Person was not told that an algorithm was involved.',
  data_accuracy: 'System used incorrect or outdated information.',
  loss_of_dignity: 'Person felt dehumanized by the process.',
};

const stopwords = new Set(['able', 'about', 'after', 'again', 'also', 'and', 'are', 'because', 'before', 'being', 'but', 'could', 'during', 'every', 'first', 'for', 'from', 'had', 'has', 'have', 'here', 'her', 'him', 'his', 'how', 'into', 'like', 'made', 'more', 'most', 'not', 'one', 'our', 'out', 'over', 'own', 'she', 'than', 'that', 'the', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'too', 'was', 'were', 'when', 'where', 'which', 'while', 'who', 'why', 'with', 'without', 'would', 'you', 'your', 'system', 'algorithm', 'automated', 'public', 'service', 'story']);

export async function analyzeNarrativeTextWithModels(narrativeText) {
  const text = String(narrativeText || '').trim();
  const [task2, task3, task4, task5] = await Promise.all([
    classifyImpact(text),
    detectThemes(text),
    extractEntities(text),
    extractKeywords(text),
  ]);

  return {
    inputField: 'narrativeText',
    source: 'model',
    task1: {
      status: 'SKIPPED',
      reason: 'Text input does not need transcription.',
    },
    task2,
    task3: { aiThemes: task3 },
    task4: { entities: task4 },
    task5: { keywords: task5 },
  };
}

async function classifyImpact(text) {
  const output = await zeroShot(TASK2_MODEL, text, Object.values(impactLabels), 'This public service story has this impact: {}');
  const scores = Object.fromEntries(output.labels.map((label, index) => [label, Number(output.scores[index] || 0)]));
  const evidenceScores = Object.fromEntries(Object.entries(impactLabels).map(([key, label]) => [key, roundScore(scores[label] || 0)]));
  const negative = evidenceScores.NEGATIVE;
  const positive = evidenceScores.POSITIVE;
  const unclear = evidenceScores.UNCLEAR;

  let classification = 'UNCLEAR';
  let confidence = unclear;
  if (positive >= 0.65 && negative >= 0.65) {
    classification = 'MIXED';
    confidence = Math.min(positive, negative);
  } else if (unclear >= 0.65 && Math.max(negative, positive) < 0.5) {
    classification = 'UNCLEAR';
    confidence = unclear;
  } else if (negative >= positive && negative >= unclear) {
    classification = 'NEGATIVE';
    confidence = negative;
  } else if (positive >= negative && positive >= unclear) {
    classification = 'POSITIVE';
    confidence = positive;
  }

  return {
    aiImpactClassification: classification,
    aiConfidenceScore: roundScore(confidence),
    humanReviewRequired: confidence < 0.85,
    model: TASK2_MODEL,
    evidenceScores,
  };
}

async function detectThemes(text) {
  const descriptions = Object.values(themeLabels);
  const output = await zeroShot(TASK3_MODEL, text, descriptions, 'This public service story shows this theme: {}');
  const entries = output.labels.map((label, index) => {
    const theme = Object.entries(themeLabels).find(([, description]) => description === label)?.[0];
    if (!theme) return null;
    return {
      theme,
      confidence: roundScore(output.scores[index] || 0),
      evidence: [],
      model: TASK3_MODEL,
    };
  }).filter(Boolean);

  const strongEntries = entries.filter((entry) => entry.confidence >= 0.2).slice(0, 5);
  return strongEntries.length ? strongEntries : entries.slice(0, 1);
}

async function extractEntities(text) {
  const nerOutput = await hfRequest(TASK4_MODEL, {
    inputs: text,
    options: { wait_for_model: true },
  });
  const entities = {
    agencies: [],
    locations: [],
    systems: extractKnownSystems(text),
    dates: uniqueMatches(text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\b\d{4}\b/g)),
    people_roles: extractKnownRoles(text),
  };

  for (const item of Array.isArray(nerOutput) ? nerOutput : []) {
    const word = cleanEntityWord(item.word);
    if (!word) continue;
    const type = String(item.entity_group || item.entity || '').replace(/^B-/, '').replace(/^I-/, '');
    if (type === 'ORG') entities.agencies.push(word);
    if (type === 'LOC') entities.locations.push(word);
    if (type === 'PER') entities.people_roles.push(word);
  }

  return {
    agencies: uniqueValues(entities.agencies),
    locations: uniqueValues(entities.locations),
    systems: uniqueValues(entities.systems),
    dates: uniqueValues(entities.dates),
    people_roles: uniqueValues(entities.people_roles),
  };
}

async function extractKeywords(text) {
  const candidates = candidatePhrases(text).slice(0, 45);
  if (!candidates.length) return [];

  const vectors = await featureExtraction([text, ...candidates]);
  const documentVector = vectors[0];
  const candidateVectors = vectors.slice(1);
  const relevance = candidates.map((candidate, index) => ({
    keyword: candidate,
    vector: candidateVectors[index],
    score: cosine(documentVector, candidateVectors[index]),
  })).sort((a, b) => b.score - a.score);

  const selected = [];
  const lambda = 0.65;
  while (selected.length < 10 && relevance.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < relevance.length; index += 1) {
      const item = relevance[index];
      const diversityPenalty = selected.length
        ? Math.max(...selected.map((selectedItem) => cosine(item.vector, selectedItem.vector)))
        : 0;
      const mmrScore = lambda * item.score - (1 - lambda) * diversityPenalty;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = index;
      }
    }
    selected.push(relevance.splice(bestIndex, 1)[0]);
  }

  return selected.map((item) => item.keyword);
}

async function zeroShot(model, text, candidateLabels, hypothesisTemplate) {
  const output = await hfRequest(model, {
    inputs: text,
    parameters: {
      candidate_labels: candidateLabels,
      hypothesis_template: hypothesisTemplate,
      multi_label: true,
    },
    options: { wait_for_model: true },
  });
  if (!output || !Array.isArray(output.labels) || !Array.isArray(output.scores)) {
    throw new Error(`${model} returned an unexpected response.`);
  }
  return output;
}

async function featureExtraction(inputs) {
  const output = await hfRequest(TASK5_MODEL, {
    inputs,
    options: { wait_for_model: true },
  });
  if (!Array.isArray(output)) throw new Error(`${TASK5_MODEL} returned an unexpected response.`);
  return output.map((item) => poolEmbedding(item));
}

async function hfRequest(model, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.HUGGINGFACE_API_TOKEN) headers.authorization = `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`;
    const response = await fetch(`${HF_BASE_URL}/${model}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      const message = typeof data === 'object' && data?.error ? data.error : text;
      throw new Error(`${model} failed: ${message || response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function candidatePhrases(text) {
  const words = String(text || '').toLowerCase().match(/[a-z][a-z'-]{2,}/g)?.filter((word) => !stopwords.has(word)) || [];
  const candidates = [];
  for (const size of [3, 2]) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(' ');
      if (new Set(phrase.split(' ')).size > 1) candidates.push(phrase);
    }
  }
  candidates.push(...words);
  return uniqueValues(candidates);
}

function poolEmbedding(value) {
  if (!Array.isArray(value)) return [];
  if (typeof value[0] === 'number') return value.map(Number);
  const vectors = value.filter(Array.isArray);
  if (!vectors.length) return [];
  const length = vectors[0].length;
  const pooled = Array.from({ length }, () => 0);
  for (const vector of vectors) {
    for (let index = 0; index < length; index += 1) pooled[index] += Number(vector[index] || 0);
  }
  return pooled.map((sum) => sum / vectors.length);
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function extractKnownSystems(text) {
  const lowerText = String(text || '').toLowerCase();
  return ['risk score', 'priority score', 'waiting list', 'screening tool', 'routing system', 'inspection system', 'student support system', 'benefits system', 'housing system', 'traffic management system'].filter((term) => lowerText.includes(term));
}

function extractKnownRoles(text) {
  const lowerText = String(text || '').toLowerCase();
  return ['caseworker', 'worker', 'screeners', 'supervisors', 'counselor', 'teacher', 'tenant', 'resident', 'parent', 'student', 'caller', 'interpreter', 'agency staff', 'community member'].filter((term) => lowerText.includes(term));
}

function cleanEntityWord(value) {
  return String(value || '').replace(/^##/, '').trim();
}

function uniqueMatches(matches) {
  return uniqueValues(matches || []);
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function roundScore(value) {
  return Number(Number(value || 0).toFixed(4));
}
