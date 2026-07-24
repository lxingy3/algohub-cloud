import fs from 'node:fs';

process.env.VERCEL = '1';
delete process.env.ML_BART_ENDPOINT;
delete process.env.ML_IMPACT_ENDPOINT;
delete process.env.ML_SPACY_ENDPOINT;
delete process.env.ML_KEYBERT_ENDPOINT;

const {
  analyzeNarrativeTextWithModels,
  resolveImpactDecision,
  selectEvidenceGroundedThemes,
} = await import('../lib/mlFullAnalysis.js');

const themeNames = [
  'opacity',
  'lack_of_recourse',
  'arbitrary_outcome',
  'discriminatory_impact',
  'data_accuracy',
  'positive_experience',
  'process_confusion',
  'delayed_outcome',
  'lack_of_notification',
  'loss_of_dignity',
];

const packs = [
  {
    name: 'current',
    inputs: readJson('task345-results/tuned-all-stories-ml-output/task2-5-combined-results.json').results,
    expected: readJson('data/task2-5-eval-set.json').records,
  },
  {
    name: 'challenge',
    inputs: readJson('data/task2-5-challenge-input.json'),
    expected: readJson('data/task2-5-challenge-eval-set.json').records,
  },
  {
    name: 'messy',
    inputs: readJson('data/task2-5-messy-input.json'),
    expected: readJson('data/task2-5-messy-eval-set.json').records,
  },
  {
    name: 'pittsburgh',
    inputs: readJson('data/task2-5-pittsburgh-input.json'),
    expected: readJson('data/task2-5-pittsburgh-eval-set.json').records,
  },
];

const reports = [];
for (const pack of packs) {
  const expectedById = new Map(pack.expected.map((row) => [String(row.id), row]));
  const issues = [];
  for (const input of pack.inputs) {
    const expected = expectedById.get(String(input.id));
    if (!expected) {
      issues.push({ id: input.id, type: 'missing_expected_row' });
      continue;
    }

    const text = String(input.narrativeText || '');
    const fallback = await analyzeNarrativeTextWithModels(text);
    assertImpact(issues, input, expected, fallback.task2, 'fallback');
    assertThemes(issues, input, expected, fallback.task3?.aiThemes, 'fallback');

    const simulatedRemoteImpact = resolveImpactDecision(text, {
      NEGATIVE: 0.01,
      POSITIVE: 0.01,
      MIXED: 0.97,
      UNCLEAR: 0.01,
    }, { runtime: 'self-hosted-worker' });
    assertImpact(issues, input, expected, simulatedRemoteImpact, 'simulated_remote');

    const simulatedRemoteThemes = selectEvidenceGroundedThemes(
      text,
      Object.fromEntries(themeNames.map((theme) => [theme, 0.99])),
    );
    assertThemes(issues, input, expected, simulatedRemoteThemes, 'simulated_remote');
    const fallbackSet = new Set((fallback.task3?.aiThemes || []).map((theme) => theme.theme));
    const remoteSet = new Set(simulatedRemoteThemes.map((theme) => theme.theme));
    if (!sameSet(fallbackSet, remoteSet)) {
      issues.push({
        id: input.id,
        type: 'theme_membership_runtime_drift',
        fallback: [...fallbackSet],
        simulatedRemote: [...remoteSet],
      });
    }
  }
  reports.push({ name: pack.name, count: pack.inputs.length, issueCount: issues.length, issues });
}

const issueCount = reports.reduce((sum, report) => sum + report.issueCount, 0);
const report = {
  status: issueCount ? 'FAIL' : 'PASS',
  count: reports.reduce((sum, item) => sum + item.count, 0),
  issueCount,
  reports,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = issueCount ? 1 : 0;

function assertImpact(issues, input, expected, task2, runtime) {
  const label = task2?.aiImpactClassification;
  const confidence = Number(task2?.aiConfidenceScore || 0);
  if (label !== expected.expectedImpact) {
    issues.push({ id: input.id, runtime, type: 'impact', expected: expected.expectedImpact, actual: label });
  }
  if (label && label !== 'UNCLEAR' && confidence < Number(expected.minimumConfidence ?? 0.85)) {
    issues.push({ id: input.id, runtime, type: 'low_confidence', label, confidence });
  }
}

function assertThemes(issues, input, expected, themes = [], runtime) {
  const actual = new Set(themes.map((theme) => theme.theme).filter(Boolean));
  for (const theme of expected.expectedThemes || []) {
    if (!actual.has(theme)) issues.push({ id: input.id, runtime, type: 'missing_theme', expected: theme });
  }
  for (const theme of themes) {
    if (!Array.isArray(theme.matchedEvidence) || !theme.matchedEvidence.length) {
      issues.push({ id: input.id, runtime, type: 'theme_without_evidence', theme: theme.theme });
    }
  }
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
