import fs from 'node:fs';

const resultPath = process.argv[2] || 'task345-results/tuned-all-stories-ml-output/task2-5-combined-results.json';
const evalSetPath = process.argv[3] || 'data/task2-5-eval-set.json';

const resultPayload = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const evalSet = JSON.parse(fs.readFileSync(evalSetPath, 'utf8'));
const rows = Array.isArray(resultPayload) ? resultPayload : resultPayload.results || [];
const expectedRecords = Array.isArray(evalSet) ? evalSet : evalSet.records || [];

const issues = [];
const rowsById = new Map(rows.map((row) => [String(row.id), row]));
const expectedById = new Map(expectedRecords.map((record) => [String(record.id), record]));

for (const row of rows) {
  if (!expectedById.has(String(row.id))) {
    issues.push({ id: row.id, title: row.title, type: 'result_not_in_eval_set' });
  }
}

for (const expected of expectedRecords) {
  const row = rowsById.get(String(expected.id));
  if (!row) {
    issues.push({ id: expected.id, title: expected.title, type: 'eval_record_not_in_results' });
    continue;
  }

  const title = row.title || expected.title || row.id;
  const impact = row.aiImpactClassification || row.task2?.aiImpactClassification;
  const confidence = Number(row.aiConfidenceScore ?? row.task2?.aiConfidenceScore ?? 0);
  const themes = row.aiThemes || row.task3?.themes || [];
  const themeNames = new Set(themes.map((theme) => theme.theme).filter(Boolean));
  const entities = row.aiExtractedExperiences?.entities || row.task4?.entities || {};
  const keywords = row.aiExtractedExperiences?.keywords || row.task5?.keywords || [];

  if (expected.title && row.title !== expected.title) {
    issues.push({ id: row.id, title, type: 'title_changed', expected: expected.title, actual: row.title });
  }
  if (expected.expectedImpact && impact !== expected.expectedImpact) {
    issues.push({ id: row.id, title, type: 'impact', expected: expected.expectedImpact, actual: impact });
  }
  if (impact && impact !== 'UNCLEAR' && confidence < Number(expected.minimumConfidence ?? 0.85)) {
    issues.push({ id: row.id, title, type: 'low_confidence', impact, confidence });
  }
  if (!themes.length) {
    issues.push({ id: row.id, title, type: 'no_themes' });
  }
  for (const expectedTheme of expected.expectedThemes || []) {
    if (!themeNames.has(expectedTheme)) {
      issues.push({ id: row.id, title, type: 'missing_theme', expected: expectedTheme });
    }
  }
  for (const theme of themes) {
    if (!Array.isArray(theme.matchedEvidence) || theme.matchedEvidence.length === 0) {
      issues.push({ id: row.id, title, type: 'theme_without_evidence', theme: theme.theme });
    }
    for (const evidence of theme.matchedEvidence || []) {
      if (String(evidence).length > 160) {
        issues.push({ id: row.id, title, type: 'theme_evidence_too_long', theme: theme.theme, value: evidence });
      }
    }
  }
  for (const [field, required] of Object.entries(expected.requiredEntityFields || {})) {
    if (required && (!Array.isArray(entities[field]) || entities[field].length === 0)) {
      issues.push({ id: row.id, title, type: 'missing_entity_field', field });
    }
  }
  const agencyKeys = new Set((entities.agencies || []).map(normalizeEntityKey));
  for (const location of entities.locations || []) {
    if (agencyKeys.has(normalizeEntityKey(location))) {
      issues.push({ id: row.id, title, type: 'agency_location_duplicate', value: location });
    }
  }
  for (const system of entities.systems || []) {
    if (/^(a |the )?system$|^(a |the )?tool$|^(routing|inspection|screening|benefits|student support|traffic management|language access|public safety) system$|can fix|fight this|you have to/i.test(system)) {
      issues.push({ id: row.id, title, type: 'bad_system', value: system });
    }
  }
  for (const keyword of keywords) {
    const normalized = String(keyword || '').toLowerCase();
    if ((expected.disallowedKeywords || []).includes(normalized)) {
      issues.push({ id: row.id, title, type: 'weak_keyword', value: keyword });
    }
  }
}

const byImpact = rows.reduce((counts, row) => {
  const impact = row.aiImpactClassification || row.task2?.aiImpactClassification || 'NONE';
  counts[impact] = (counts[impact] || 0) + 1;
  return counts;
}, {});

const report = {
  resultPath,
  evalSetPath,
  count: rows.length,
  expectedCount: expectedRecords.length,
  byImpact,
  issueCount: issues.length,
  issues,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = issues.length ? 1 : 0;

function normalizeEntityKey(value) {
  return String(value || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
