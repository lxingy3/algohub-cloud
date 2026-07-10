import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const outputPath = args.output || 'task2-5-results/research-team-benchmark-review.json';
const csvPath = args.csv || outputPath.replace(/\.json$/i, '.csv');
const sources = [
  ['approved-story', 'task-briefings-results/corpus-batch-input.json'],
  ['challenge-fixture', 'data/task2-5-challenge-input.json'],
  ['messy-fixture', 'data/task2-5-messy-input.json'],
  ['pittsburgh-fixture', 'data/task2-5-pittsburgh-input.json'],
];

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    const next = argv[index + 1];
    parsed[key.slice(2)] = next && !next.startsWith('--') ? next : true;
    if (parsed[key.slice(2)] === next) index += 1;
  }
  return parsed;
}

function recordsFrom(file) {
  if (!fs.existsSync(file)) throw new Error(`${file} is missing. Run npm run ml:briefings:export first.`);
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(payload) ? payload : payload.records || [];
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

const seen = new Set();
const records = [];
for (const [source, file] of sources) {
  for (const row of recordsFrom(file)) {
    const narrativeText = cleanText(row.narrativeText || row.text || row.analysisText);
    const key = narrativeText.toLowerCase();
    if (!narrativeText || seen.has(key)) continue;
    seen.add(key);
    records.push({
      id: String(row.id),
      source,
      title: cleanText(row.title) || 'Untitled story',
      narrativeText,
      expectedImpact: '',
      expectedThemes: [],
      reviewedBy: '',
      reviewNotes: '',
    });
  }
}

if (records.length < 50) throw new Error(`Only ${records.length} unique candidates were found; at least 50 are required.`);

const payload = {
  generatedAt: new Date().toISOString(),
  approvedForRelease: false,
  curatedBy: '',
  minimumRecords: 50,
  allowedImpactLabels: ['NEGATIVE', 'POSITIVE', 'MIXED', 'UNCLEAR'],
  allowedThemeLabels: [
    'opacity', 'lack_of_recourse', 'arbitrary_outcome', 'discriminatory_impact', 'data_accuracy',
    'positive_experience', 'process_confusion', 'delayed_outcome', 'lack_of_notification', 'loss_of_dignity',
  ],
  instructions: 'Review at least 50 rows. Fill expectedImpact, expectedThemes, and reviewedBy. Set curatedBy and approvedForRelease only after research-team review.',
  records,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
const headers = ['id', 'source', 'title', 'narrativeText', 'expectedImpact', 'expectedThemes', 'reviewedBy', 'reviewNotes'];
const csv = [
  headers.map(csvCell).join(','),
  ...records.map((row) => headers.map((key) => csvCell(key === 'expectedThemes' ? '' : row[key])).join(',')),
].join('\n');
fs.writeFileSync(csvPath, `${csv}\n`);

console.log(JSON.stringify({ outputPath, csvPath, records: records.length, approvedForRelease: false }, null, 2));
