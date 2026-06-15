const HF_BASE_URL = 'https://api-inference.huggingface.co/models';
const TASK2_MODEL = 'MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33';
const TASK3_MODEL = 'facebook/bart-large-mnli';
const TASK4_TOOL = 'spaCy';
const TASK5_TOOL = 'KeyBERT';

const roleTerms = [
  'caseworker',
  'worker',
  'screeners',
  'supervisor',
  'supervisors',
  'tenant',
  'resident',
  'student',
  'parent',
  'applicant',
  'rider',
  'counselor',
  'teacher',
  'interpreter',
  'agency staff',
  'community member',
];

const impactLabels = {
  NEGATIVE: 'The story says an automated system harmed, disadvantaged, delayed, denied, wrongly flagged, or unfairly treated the person.',
  POSITIVE: 'The story says an automated system worked well, helped the person, improved access, or led to a good outcome.',
  MIXED: 'The story says an automated system had both helpful and harmful effects.',
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

const themeEvidence = {
  opacity: [
    /\bno one explained\b/i,
    /\bcould not explain\b/i,
    /\bdo not know\b.*\bhow\b/i,
    /\bdon't know\b.*\bhow\b/i,
    /\bunclear\b.*\bwhy\b/i,
    /\bhow\b.*\b(calculated|decided|made)\b/i,
  ],
  positive_experience: [
    /\bconnected me\b/i,
    /\bfinished\b/i,
    /\bwas able to\b/i,
    /\bmuch better\b/i,
    /\bhelped at first\b/i,
    /\bworked well\b/i,
    /\bfaster than before\b/i,
  ],
  lack_of_recourse: [
    /\bcould not change\b/i,
    /\bno way to\b.*\b(appeal|challenge|change)\b/i,
    /\bcould not appeal\b/i,
    /\bdenied\b.*\bappeal\b/i,
    /\bwould not review\b/i,
  ],
  process_confusion: [
    /\bconfused\b/i,
    /\bstart over\b/i,
    /\bdo not know whether\b/i,
    /\bdon't know whether\b/i,
    /\bnot sure\b/i,
    /\bunclear\b.*\bprocess\b/i,
  ],
  arbitrary_outcome: [
    /\bkept\b.*\b(low priority|high-risk|label|score)\b/i,
    /\bstayed\b.*\b(record|label|priority)\b/i,
    /\bstill treated\b/i,
    /\brandom\b/i,
    /\binconsistent\b/i,
  ],
  delayed_outcome: [
    /\bwaited\b/i,
    /\bweeks\b/i,
    /\bmonths\b/i,
    /\bdelay\b/i,
    /\btook too long\b/i,
  ],
  discriminatory_impact: [
    /\bracial\b/i,
    /\brace\b/i,
    /\blow-income\b/i,
    /\bzip code\b/i,
    /\bneighborhood\b/i,
    /\bdemographic\b/i,
    /\bdisability\b/i,
    /\bbiased\b/i,
    /\bbias\b/i,
  ],
  lack_of_notification: [
    /\bwas not told\b/i,
    /\bnever told\b/i,
    /\bno notice\b/i,
    /\bnot notified\b/i,
    /\bonly learned later\b/i,
  ],
  data_accuracy: [
    /\bwrong\b/i,
    /\boutdated\b/i,
    /\bincorrect\b/i,
    /\bold record\b/i,
    /\bgrades improved\b/i,
    /\bstayed on my record\b/i,
  ],
  loss_of_dignity: [
    /\btreated me like\b/i,
    /\bhumiliated\b/i,
    /\bdehumanized\b/i,
    /\bscolded\b/i,
    /\bstrip\b/i,
    /\bnaked\b/i,
  ],
};

export async function analyzeNarrativeTextWithModels(narrativeText) {
  const text = String(narrativeText || '').trim();

  const [task2Result, task3Result, task4Result, task5Result] = await Promise.allSettled([
    classifyImpact(text),
    detectThemes(text),
    extractEntities(text),
    extractKeywords(text),
  ]);

  return {
    inputField: 'narrativeText',
    source: 'model',
    status: [task2Result, task3Result, task4Result, task5Result].every((result) => result.status === 'fulfilled') ? 'COMPLETED' : 'PARTIAL',
    task1: {
      status: 'SKIPPED',
      reason: 'Text input does not need transcription.',
    },
    task2: taskPayload(task2Result, 'impact classification', (value) => value, TASK2_MODEL),
    task3: taskPayload(task3Result, 'theme detection', (value) => ({ aiThemes: value }), TASK3_MODEL),
    task4: taskPayload(task4Result, 'entity extraction', (value) => ({ entities: value }), TASK4_TOOL),
    task5: taskPayload(task5Result, 'keyword extraction', (value) => ({ keywords: value }), TASK5_TOOL),
  };
}

function taskPayload(result, label, mapValue = (value) => value, tool = '') {
  if (result.status === 'fulfilled') {
    return {
      status: 'COMPLETED',
      tool,
      ...mapValue(result.value),
    };
  }
  return {
    status: 'SKIPPED',
    tool,
    error: cleanError(result.reason, label),
  };
}

function cleanError(error, label) {
  const message = error?.message || String(error || `${label} failed.`);
  if (message.includes('fetch failed')) {
    return `${label} model request failed. Check HUGGINGFACE_API_TOKEN and endpoint access.`;
  }
  if (message.includes('aborted')) {
    return `${label} model request timed out.`;
  }
  return message;
}

async function classifyImpact(text) {
  const output = await zeroShot(TASK2_MODEL, process.env.ML_DEBERTA_ENDPOINT, text, Object.values(impactLabels), 'This public service story has this impact: {}', true);
  const scores = Object.fromEntries(output.labels.map((label, index) => [label, Number(output.scores[index] || 0)]));
  const evidenceScores = Object.fromEntries(Object.entries(impactLabels).map(([key, label]) => [key, roundScore(scores[label] || 0)]));
  const negative = evidenceScores.NEGATIVE;
  const positive = evidenceScores.POSITIVE;
  const mixed = evidenceScores.MIXED;
  const unclear = evidenceScores.UNCLEAR;

  let classification = 'UNCLEAR';
  let confidence = unclear;
  if (unclear >= 0.9 && unclear >= Math.max(negative, positive, mixed)) {
    classification = 'UNCLEAR';
    confidence = unclear;
  } else if (positive >= 0.65 && negative >= 0.65) {
    classification = 'MIXED';
    confidence = Math.max(mixed, Math.min(positive, negative));
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
  const output = await zeroShot(TASK3_MODEL, process.env.ML_BART_ENDPOINT, text, descriptions, 'This public service story shows this theme: {}', true);
  const entries = output.labels.map((label, index) => {
    const theme = Object.entries(themeLabels).find(([, description]) => description === label)?.[0];
    if (!theme) return null;
    const matchedEvidence = findThemeEvidence(text, theme);
    if (!matchedEvidence.length || Number(output.scores[index] || 0) < 0.5) return null;
    return {
      theme,
      confidence: roundScore(output.scores[index] || 0),
      matchedEvidence,
      model: TASK3_MODEL,
    };
  }).filter(Boolean);

  return entries.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

function findThemeEvidence(text, theme) {
  const patterns = themeEvidence[theme] || [];
  return uniqueValues(patterns.map((pattern) => text.match(pattern)?.[0]).filter(Boolean)).slice(0, 3);
}

async function extractEntities(text) {
  const endpoint = process.env.ML_SPACY_ENDPOINT;
  if (!endpoint) {
    throw new Error(`${TASK4_TOOL} endpoint is not configured. Set ML_SPACY_ENDPOINT to a Python service that runs spaCy and returns agencies, locations, systems, dates, and people_roles.`);
  }
  const output = await jsonEndpointRequest(endpoint, { text });
  return normalizeEntities(output.entities || output);
}

async function extractKeywords(text) {
  const endpoint = process.env.ML_KEYBERT_ENDPOINT;
  if (!endpoint) {
    throw new Error(`${TASK5_TOOL} endpoint is not configured. Set ML_KEYBERT_ENDPOINT to a Python service that runs KeyBERT with top_n=10 and MMR diversity.`);
  }
  const output = await jsonEndpointRequest(endpoint, { text, top_n: 10, use_mmr: true });
  return normalizeKeywords(output.keywords || output, text);
}

async function zeroShot(model, endpoint, text, candidateLabels, hypothesisTemplate, multiLabel = true) {
  const payload = {
    text,
    inputs: text,
    candidate_labels: candidateLabels,
    hypothesis_template: hypothesisTemplate,
    multi_label: multiLabel,
    parameters: {
      candidate_labels: candidateLabels,
      hypothesis_template: hypothesisTemplate,
      multi_label: multiLabel,
    },
    options: { wait_for_model: true },
  };
  const output = endpoint
    ? await jsonEndpointRequest(endpoint, payload)
    : await hfRequest(model, payload);
  if (!output || !Array.isArray(output.labels) || !Array.isArray(output.scores)) {
    throw new Error(`${model} returned an unexpected response.`);
  }
  return output;
}

async function hfRequest(model, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
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

async function jsonEndpointRequest(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.ML_WORKER_TOKEN) headers.authorization = `Bearer ${process.env.ML_WORKER_TOKEN}`;
    const response = await fetch(endpoint, {
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
      throw new Error(`${endpoint} failed: ${message || response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEntities(value) {
  const groups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Object.fromEntries(groups.map((group) => [group, []]));
  }
  return Object.fromEntries(groups.map((group) => {
    const values = uniqueValues(Array.isArray(value[group]) ? value[group] : []);
    if (group === 'people_roles') {
      return [group, values.filter((item) => roleTerms.some((role) => item.toLowerCase().includes(role)))];
    }
    return [group, values];
  }));
}

function normalizeKeywords(value, sourceText = '') {
  if (!Array.isArray(value)) return [];
  const source = normalizeForPhraseMatch(sourceText);
  return uniqueValues(value.map((item) => {
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item[0];
    if (item && typeof item === 'object') return item.keyword || item.word || item.phrase || item.text;
    return '';
  }))
    .filter((keyword) => isReadableKeyword(keyword, source))
    .slice(0, 10);
}

function isReadableKeyword(keyword, normalizedSource) {
  const normalized = normalizeForPhraseMatch(keyword);
  const words = normalized.split(' ').filter(Boolean);
  if (!words.length || words.length > 4) return false;
  if (words.length === 1) return words[0].length > 2;
  return normalizedSource.includes(normalized);
}

function normalizeForPhraseMatch(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function roundScore(value) {
  return Number(Number(value || 0).toFixed(4));
}
