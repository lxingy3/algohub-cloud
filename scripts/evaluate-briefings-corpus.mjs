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

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (key === null || key === undefined) continue;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function purity(groups, sourceById, labelFn) {
  const details = [];
  for (const [group, rows] of groups.entries()) {
    const counts = new Map();
    for (const row of rows) {
      const label = labelFn(sourceById.get(row.id)) || 'Unknown';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const [top, count] = sorted[0] || ['Unknown', 0];
    details.push({ group, size: rows.length, top, purity: rows.length ? count / rows.length : 0, mix: Object.fromEntries(sorted.slice(0, 4)) });
  }
  const avg = details.length ? details.reduce((sum, row) => sum + row.purity, 0) / details.length : null;
  return { avg, details };
}

function summarize(input, resultPath) {
  const result = readJson(resultPath);
  const sourceById = new Map(input.records.map((row) => [row.id, row]));
  const records = result.records || [];
  const topicGroups = groupBy(records.filter((row) => row.topicId !== null), (row) => row.topicId);
  const clusterGroups = groupBy(records.filter((row) => row.clusterId !== null), (row) => row.clusterId);
  const domainByTopic = purity(topicGroups, sourceById, (row) => row?.affectedDomain);
  const domainByCluster = purity(clusterGroups, sourceById, (row) => row?.affectedDomain);
  const algorithmByTopic = purity(topicGroups, sourceById, (row) => (row?.algorithmIds || []).join(',') || 'noAlgorithm');
  const outliers = records.filter((row) => row.isOutlier).length;
  return {
    path: resultPath,
    model: result.model,
    records: records.length,
    topics: (result.topics || []).length,
    outliers,
    outlierRate: records.length ? Number((outliers / records.length).toFixed(2)) : 0,
    domainPurityByTopicAvg: score(domainByTopic.avg),
    domainPurityByClusterAvg: score(domainByCluster.avg),
    algorithmPurityByTopicAvg: score(algorithmByTopic.avg),
    topicLabels: (result.topics || []).map((topic) => ({
      id: topic.topicId,
      label: topic.label,
      size: topic.size,
      keywords: (topic.topKeywords || []).slice(0, 5),
    })),
    weakestTopics: domainByTopic.details.sort((a, b) => a.purity - b.purity).slice(0, 3).map(compactDetail),
    warnings: result.warnings || [],
  };
}

function compactDetail(row) {
  return { group: row.group, size: row.size, top: row.top, purity: score(row.purity), mix: row.mix };
}

function score(value) {
  return value === null || value === undefined ? null : Number(value.toFixed(2));
}

function selfCheck() {
  const sourceById = new Map([
    ['a', { affectedDomain: 'Housing', algorithmIds: ['x'] }],
    ['b', { affectedDomain: 'Housing', algorithmIds: ['x'] }],
    ['c', { affectedDomain: 'Jobs', algorithmIds: ['y'] }],
  ]);
  const groups = groupBy([{ id: 'a', topicId: 0 }, { id: 'b', topicId: 0 }, { id: 'c', topicId: 0 }], (row) => row.topicId);
  assert.equal(score(purity(groups, sourceById, (row) => row.affectedDomain).avg), 0.67);
  console.log('briefings corpus evaluator self-check ok');
}

if (args['self-check']) {
  selfCheck();
} else {
  const input = readJson(inputPath);
  console.log(JSON.stringify({ inputPath, results: resultPaths.map((path) => summarize(input, path)) }, null, 2));
}
