import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = (process.env.ML_QUICK_TEST_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const inputPath = process.argv[2] || 'data/task2-5-pittsburgh-input.json';
const evalSetPath = process.argv[3] || 'data/task2-5-pittsburgh-eval-set.json';
const outputPath = process.argv[4] || 'task345-results/production-regression/task2-5-pittsburgh-production-results.json';

const inputs = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const evalSetPayload = JSON.parse(fs.readFileSync(evalSetPath, 'utf8'));
const expectedRecords = Array.isArray(evalSetPayload) ? evalSetPayload : evalSetPayload.records || [];
const expectedById = new Map(expectedRecords.map((record) => [String(record.id), record]));

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});

try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page);

  const results = [];
  const issues = [];
  for (const input of inputs) {
    const response = await page.evaluate(async (payload) => {
      const request = await fetch('/api/ml/quick-test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ narrativeText: payload.narrativeText }),
      });
      const text = await request.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { error: text };
      }
      return { status: request.status, body };
    }, input);

    const result = response.body?.result || {};
    const row = normalizeResult(input, result);
    results.push(row);
    issues.push(...evaluateRow(row, expectedById.get(String(input.id))));
  }

  const report = {
    status: issues.length ? 'FAIL' : 'PASS',
    baseUrl,
    inputPath,
    evalSetPath,
    count: results.length,
    issueCount: issues.length,
    issues,
    results,
  };

  fs.mkdirSync(outputPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = issues.length ? 1 : 0;
} finally {
  await browser.close();
}

async function login(page) {
  const email = process.env.ADMIN_EMAIL || 'admin@algostories.local';
  const password = process.env.ADMIN_PASSWORD || '';
  const loginResult = await page.evaluate(async ({ email, password }) => {
    const form = new FormData();
    form.set('email', email);
    form.set('password', password);
    form.set('callbackUrl', '/admin/testimonies');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: form,
      redirect: 'manual',
    });
    return { status: response.status };
  }, { email, password });

  const authCheck = await page.evaluate(async () => {
    const response = await fetch('/api/ml/quick-test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ narrativeText: 'Production regression authorization check.' }),
    });
    return response.status;
  });
  if (authCheck === 401) {
    throw new Error(`Could not authorize production regression. Login status: ${loginResult.status}`);
  }
}

function normalizeResult(input, result) {
  return {
    id: input.id,
    title: input.title,
    task2: result.task2 || {},
    task3: result.task3 || {},
    task4: result.task4 || {},
    task5: result.task5 || {},
  };
}

function evaluateRow(row, expected) {
  const issues = [];
  if (!expected) {
    return [{ id: row.id, title: row.title, type: 'result_not_in_eval_set' }];
  }

  const impact = row.task2.aiImpactClassification;
  const confidence = Number(row.task2.aiConfidenceScore || 0);
  const themes = (row.task3.aiThemes || []).map((theme) => theme.theme).filter(Boolean);
  const entities = row.task4.entities || {};
  const keywords = (row.task5.keywords || []).map((keyword) => String(keyword || '').toLowerCase());

  if (impact !== expected.expectedImpact) {
    issues.push({ id: row.id, title: row.title, type: 'impact', expected: expected.expectedImpact, actual: impact });
  }
  if (impact && impact !== 'UNCLEAR' && confidence < Number(expected.minimumConfidence ?? 0.85)) {
    issues.push({ id: row.id, title: row.title, type: 'low_confidence', impact, confidence });
  }
  for (const theme of expected.expectedThemes || []) {
    if (!themes.includes(theme)) {
      issues.push({ id: row.id, title: row.title, type: 'missing_theme', expected: theme, actual: themes });
    }
  }
  for (const [field, expectedValues] of Object.entries(expected.requiredEntities || {})) {
    const actualValues = Array.isArray(entities[field]) ? entities[field] : [];
    for (const expectedValue of expectedValues) {
      if (!containsEquivalent(actualValues, expectedValue)) {
        issues.push({
          id: row.id,
          title: row.title,
          type: 'missing_entity_value',
          field,
          expected: expectedValue,
          actual: actualValues,
        });
      }
    }
  }
  for (const [field, disallowedValues] of Object.entries(expected.disallowedEntities || {})) {
    const actualValues = Array.isArray(entities[field]) ? entities[field] : [];
    for (const disallowedValue of disallowedValues) {
      if (actualValues.some((actual) => normalize(actual) === normalize(disallowedValue))) {
        issues.push({
          id: row.id,
          title: row.title,
          type: 'disallowed_entity_value',
          field,
          value: disallowedValue,
        });
      }
    }
  }
  for (const disallowedKeyword of expected.disallowedKeywords || []) {
    const normalized = normalize(disallowedKeyword);
    if (keywords.some((keyword) => keyword === normalized || (normalized.includes(' ') && keyword.includes(normalized)))) {
      issues.push({ id: row.id, title: row.title, type: 'disallowed_keyword', value: disallowedKeyword });
    }
  }
  return issues;
}

function containsEquivalent(actualValues, expectedValue) {
  const expected = normalize(expectedValue);
  return actualValues.some((actualValue) => {
    const actual = normalize(actualValue);
    return actual === expected || actual.includes(expected) || expected.includes(actual);
  });
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
