import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const IMPACT_LABELS = [
  'negative experience with an automated system',
  'positive experience with an automated system',
  'mixed experience with an automated system',
  'unclear or neutral experience',
];

const THEME_LABELS = [
  'The person did not understand how or why a decision was made about them by a computer system',
  'The person had no way to challenge, appeal, or contest an automated decision',
  "The outcome seemed random, inconsistent, or did not match the person's situation",
  'The person experienced or suspects racial, economic, or other demographic bias in the system',
  'The automated system used incorrect, outdated, or incomplete information about the person',
  'The automated system worked well and the person had a good outcome',
  'The person was confused about the overall process or how the system fits in',
  'The decision or process took unreasonably long',
  'The person was not told that an algorithm or automated system was involved in decisions about them',
  'The person felt dehumanized or reduced to a number by the automated process',
];

const args = process.argv.slice(2);
if (args.includes('--self-check')) {
  assert.equal(cleanBaseUrl('https://worker.example.test///'), 'https://worker.example.test');
  assert.equal(workerUrl('https://worker.example.test/', '/health'), 'https://worker.example.test/health');
  assert.equal(roundMs(10.555), 10.56);
  validateStepPayload('health', {
    status: 'ok',
    models: { task1: 'whisper', task2: 'bart', task3: 'bart', task4: 'spacy', task5: 'keybert' },
  });
  assert.throws(() => validateStepPayload('task1_transcription', { transcript: '', model: 'whisper' }));
  validateStepPayload('task2_impact', { labels: ['negative'], scores: [0.9] });
  assert.throws(() => validateStepPayload('task5_keywords', {}));
  console.log('ML worker benchmark self-check passed.');
  process.exit(0);
}

const baseUrl = cleanBaseUrl(process.env.ML_WORKER_BASE_URL);
const audioPath = args[0] ? path.resolve(args[0]) : null;
const outputPath = path.resolve(args[1] || path.join('output', `ml-worker-benchmark-${timestampForFile()}.json`));

if (!baseUrl || !audioPath) {
  console.error('Usage: set ML_WORKER_BASE_URL, then run node scripts/benchmark-ml-worker.mjs <audio-path> [output-json]');
  process.exit(2);
}

const token = String(process.env.ML_WORKER_TOKEN || '').trim();
const headers = token ? { authorization: `Bearer ${token}` } : {};
const audioBytes = await readFile(audioPath);
const runStarted = performance.now();

const health = await timedStep('health', () => fetch(workerUrl(baseUrl, '/health'), { headers }));

const transcription = await timedStep('task1_transcription', async () => {
  const form = new FormData();
  form.append('file', new Blob([audioBytes]), path.basename(audioPath));
  return fetch(workerUrl(baseUrl, '/transcribe'), { method: 'POST', headers, body: form });
});

const transcript = transcription.ok
  ? String(transcription.payload?.transcript || transcription.payload?.rawTranscript || '').trim()
  : '';

const analysisStarted = performance.now();
const analysisSteps = transcript
  ? await Promise.all([
      timedJsonStep('task2_impact', workerUrl(baseUrl, '/impact-classification'), headers, {
        text: transcript,
        candidate_labels: IMPACT_LABELS,
        hypothesis_template: 'This example is {}.',
        multi_label: false,
      }),
      timedJsonStep('task3_themes', workerUrl(baseUrl, '/bart-themes'), headers, {
        text: transcript,
        candidate_labels: THEME_LABELS,
        hypothesis_template: 'This example is {}.',
        multi_label: true,
      }),
      timedJsonStep('task4_entities', workerUrl(baseUrl, '/spacy-entities'), headers, { text: transcript }),
      timedJsonStep('task5_keywords', workerUrl(baseUrl, '/keybert-keywords'), headers, {
        text: transcript,
        top_n: 10,
        use_mmr: true,
      }),
    ])
  : [skippedStep('task2_impact'), skippedStep('task3_themes'), skippedStep('task4_entities'), skippedStep('task5_keywords')];

const analysisMs = roundMs(performance.now() - analysisStarted);
const measuredPipelineMs = roundMs(transcription.durationMs + analysisMs);
const allMeasuredSteps = [health, transcription, ...analysisSteps];
const taskSteps = [transcription, ...analysisSteps];
const report = {
  generatedAt: new Date().toISOString(),
  workerBaseUrl: baseUrl,
  input: {
    fileName: path.basename(audioPath),
    bytes: audioBytes.byteLength,
    mediaDurationSeconds: numberOrNull(transcription.payload?.durationSeconds),
  },
  coverage: {
    attemptedTasks: [1, 2, 3, 4, 5],
    measuredTasks: taskSteps
      .filter((step) => step.status === 'PASS')
      .map((step) => Number(step.name.match(/^task(\d)/)?.[1]))
      .filter(Number.isFinite),
    task6: 'NOT_IMPLEMENTED_IN_WORKER',
    task7: 'NOT_IMPLEMENTED_IN_WORKER',
  },
  models: health.payload?.models || null,
  timing: {
    healthMs: health.durationMs,
    transcriptionMs: transcription.durationMs,
    parallelTask2To5Ms: analysisMs,
    measuredTask1To5Ms: measuredPipelineMs,
    wallClockMs: roundMs(performance.now() - runStarted),
    targetMs: 60000,
    meetsOneMinuteTargetForMeasuredTasks: allMeasuredSteps.every((step) => step.status === 'PASS')
      && measuredPipelineMs <= 60000,
  },
  steps: allMeasuredSteps.map(summarizeStep),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`Saved ${outputPath}`);

if (allMeasuredSteps.some((step) => !step.ok && step.status !== 'SKIPPED')) process.exitCode = 1;

async function timedJsonStep(name, url, requestHeaders, body) {
  return timedStep(name, () => fetch(url, {
    method: 'POST',
    headers: { ...requestHeaders, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function timedStep(name, request) {
  const started = performance.now();
  try {
    const response = await request();
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) throw new Error(payload?.detail || payload?.error || text || `HTTP ${response.status}`);
    validateStepPayload(name, payload);
    return { name, ok: true, status: 'PASS', durationMs: roundMs(performance.now() - started), payload };
  } catch (error) {
    return {
      name,
      ok: false,
      status: 'FAIL',
      durationMs: roundMs(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function skippedStep(name) {
  return { name, ok: false, status: 'SKIPPED', durationMs: 0, error: 'Task 1 did not return a transcript.' };
}

function validateStepPayload(name, payload) {
  assert.ok(payload && typeof payload === 'object' && !Array.isArray(payload), `${name} returned invalid JSON`);
  if (name === 'health') {
    assert.equal(payload.status, 'ok', 'health did not report ok');
    for (let task = 1; task <= 5; task += 1) {
      assert.ok(String(payload.models?.[`task${task}`] || '').trim(), `health omitted the Task ${task} model`);
    }
  } else if (name === 'task1_transcription') {
    assert.ok(String(payload.transcript || payload.rawTranscript || '').trim(), 'Task 1 returned an empty transcript');
    assert.ok(String(payload.model || '').trim(), 'Task 1 omitted its model');
  } else if (name === 'task2_impact' || name === 'task3_themes') {
    assert.ok(Array.isArray(payload.labels) && payload.labels.length > 0, `${name} omitted labels`);
    assert.equal(payload.labels.length, Array.isArray(payload.scores) ? payload.scores.length : -1, `${name} returned invalid scores`);
  } else if (name === 'task4_entities') {
    assert.ok(payload.entities && typeof payload.entities === 'object' && !Array.isArray(payload.entities), 'Task 4 omitted entities');
  } else if (name === 'task5_keywords') {
    assert.ok(Array.isArray(payload.keywords), 'Task 5 omitted keywords');
  }
}

function summarizeStep(step) {
  const summary = {
    name: step.name,
    status: step.status,
    durationMs: step.durationMs,
  };
  if (step.error) summary.error = step.error;
  if (!step.payload) return summary;

  if (step.name === 'health') summary.result = step.payload;
  if (step.name === 'task1_transcription') {
    summary.result = {
      provider: step.payload.provider || null,
      model: step.payload.model || null,
      language: step.payload.language || null,
      durationSeconds: numberOrNull(step.payload.durationSeconds),
      transcriptCharacters: String(step.payload.transcript || step.payload.rawTranscript || '').length,
      segmentCount: Array.isArray(step.payload.segments) ? step.payload.segments.length : 0,
    };
  }
  if (step.name === 'task2_impact' || step.name === 'task3_themes') {
    summary.result = {
      labels: Array.isArray(step.payload.labels) ? step.payload.labels : [],
      scores: Array.isArray(step.payload.scores) ? step.payload.scores : [],
    };
  }
  if (step.name === 'task4_entities') {
    summary.result = Object.fromEntries(
      Object.entries(step.payload.entities || {}).map(([key, values]) => [key, Array.isArray(values) ? values.length : 0]),
    );
  }
  if (step.name === 'task5_keywords') {
    summary.result = { keywordCount: Array.isArray(step.payload.keywords) ? step.payload.keywords.length : 0 };
  }
  return summary;
}

function cleanBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function workerUrl(base, route) {
  return `${cleanBaseUrl(base)}/${String(route || '').replace(/^\/+/, '')}`;
}

function roundMs(value) {
  return Math.round(Number(value) * 100) / 100;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
