import fs from 'node:fs';
import assert from 'node:assert/strict';

const args = parseArgs(process.argv.slice(2));
const inputPath = args.input || 'task-briefings-results/corpus-batch-input.json';
const resultPaths = (args.results || 'task-briefings-results/corpus-batch-results.json').split(',');

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : true;
    if (parsed[key] === next) index += 1;
  }
  return parsed;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function humanBucket(row) {
  const domain = row?.affectedDomain || '';
  if (['Housing', 'Housing Inspections'].includes(domain)) return 'housing';
  if (domain === 'Child Welfare') return 'child_welfare';
  if (['Benefits Administration', 'Fraud Detection'].includes(domain)) return 'benefits';
  if (['Emergency Services', 'Traffic Management', 'Transit Safety'].includes(domain)) return 'public_safety';
  if (['Job Matching', 'Employment'].includes(domain)) return 'employment';
  if (domain === 'Language Access') return 'language_access';
  if (domain === 'Student Support' || domain === 'Student Award') return 'student_support';
  if (domain === 'Community Services') return 'community_services';
  if (domain === 'Energy Forecasting') return 'energy';
  return 'other';
}

function evaluate(input, resultPath) {
  const result = readJson(resultPath);
  const sourceById = new Map(input.records.map((row) => [row.id, row]));
  const rows = (result.records || [])
    .map((row) => ({ ...row, source: sourceById.get(row.id), bucket: humanBucket(sourceById.get(row.id)) }))
    .filter((row) => row.source);
  const clustered = rows.filter((row) => row.topicId !== null && !row.isOutlier);
  const groups = new Map();
  for (const row of clustered) groups.set(row.topicId, [...(groups.get(row.topicId) || []), row]);

  const topicSummaries = [...groups.entries()].map(([topicId, groupRows]) => {
    const counts = countBy(groupRows, (row) => row.bucket);
    const [bucket, count] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return {
      topicId,
      label: (result.topics || []).find((topic) => topic.topicId === topicId)?.label || String(topicId),
      size: groupRows.length,
      majorityBucket: bucket,
      purity: score(count / groupRows.length),
      mix: Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    };
  }).sort((a, b) => a.topicId - b.topicId);

  const topicBucket = new Map(topicSummaries.map((row) => [row.topicId, row.majorityBucket]));
  const assignedCorrect = clustered.filter((row) => topicBucket.get(row.topicId) === row.bucket).length;
  const pairStats = pairwiseStats(rows);

  return {
    path: resultPath,
    model: result.model,
    records: rows.length,
    clustered: clustered.length,
    outliers: rows.filter((row) => row.isOutlier).length,
    majorityAccuracy: score(clustered.length ? assignedCorrect / clustered.length : 0),
    pairwisePrecision: score(pairStats.precision),
    pairwiseRecall: score(pairStats.recall),
    pairwiseF1: score(pairStats.f1),
    topicSummaries,
    worstTopics: [...topicSummaries].sort((a, b) => a.purity - b.purity).slice(0, 3),
  };
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function pairwiseStats(rows) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const sameHuman = rows[left].bucket === rows[right].bucket;
      const sameTopic = rows[left].topicId !== null && rows[left].topicId === rows[right].topicId;
      if (sameHuman && sameTopic) tp += 1;
      else if (!sameHuman && sameTopic) fp += 1;
      else if (sameHuman && !sameTopic) fn += 1;
    }
  }
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

function score(value) {
  return Number(value.toFixed(2));
}

function selfCheck() {
  assert.equal(humanBucket({ affectedDomain: 'Housing Inspections' }), 'housing');
  const pairStats = pairwiseStats([
    { bucket: 'a', topicId: 1 },
    { bucket: 'a', topicId: 1 },
    { bucket: 'b', topicId: 1 },
  ]);
  assert.equal(score(pairStats.precision), 0.33);
  assert.equal(score(pairStats.recall), 1);
  console.log('briefings human benchmark self-check ok');
}

if (args['self-check']) {
  selfCheck();
} else {
  const input = readJson(inputPath);
  console.log(JSON.stringify({ inputPath, results: resultPaths.map((path) => evaluate(input, path)) }, null, 2));
}
