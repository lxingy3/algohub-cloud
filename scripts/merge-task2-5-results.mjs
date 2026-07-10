import fs from 'node:fs';

const [outputPath, ...inputPaths] = process.argv.slice(2);
if (!outputPath || inputPaths.length < 2) {
  throw new Error('Usage: node scripts/merge-task2-5-results.mjs <output> <input...>');
}

const payloads = inputPaths.map((path) => JSON.parse(fs.readFileSync(path, 'utf8')));
const byId = new Map();
for (const payload of payloads) {
  for (const row of payload.results || []) byId.set(String(row.id), row);
}

const merged = {
  generatedAt: new Date().toISOString(),
  sourceFiles: inputPaths,
  models: Object.assign({}, ...payloads.map((payload) => payload.models || {})),
  results: [...byId.values()],
};
fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, inputs: inputPaths.length, results: merged.results.length }, null, 2));
