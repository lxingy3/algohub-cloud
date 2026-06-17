import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2] || 'task345-results/tuned-all-stories-ml-output/task2-5-combined-results.json';
const outputDir = process.argv[3] || 'task2-5-slack-package-clean';
const evalSetPath = process.argv[4] || 'data/task2-5-eval-set.json';

const selectedTitles = [
  'Two versions of my name made the intake status change',
  'Photos helped get our inspection priority corrected',
  'The interpreter routing finally got me to the right person',
  'The community needs to be a part of what\'s happening',
  'The risk score sent workers to my home before I could respond',
];

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const evalSet = JSON.parse(fs.readFileSync(evalSetPath, 'utf8'));
const expectedById = new Map((evalSet.records || []).map((record) => [record.id, record]));
const rows = (Array.isArray(payload) ? payload : payload.results || [])
  .filter((row) => selectedTitles.includes(row.title))
  .sort((a, b) => selectedTitles.indexOf(a.title) - selectedTitles.indexOf(b.title));

if (rows.length !== selectedTitles.length) {
  const found = new Set(rows.map((row) => row.title));
  const missing = selectedTitles.filter((title) => !found.has(title));
  throw new Error(`Missing selected stories: ${missing.join(', ')}`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outputDir, 'inputs'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'outputs'), { recursive: true });

const outputRows = rows.map((row, index) => {
  const name = `sample-${String(index + 1).padStart(2, '0')}`;
  fs.writeFileSync(
    path.join(outputDir, 'inputs', `${name}.txt`),
    `${row.title}\n\n${row.narrativeText}\n`,
    'utf8',
  );
  return {
    sample: name,
    title: row.title,
    task2_impact_classification: {
      classification: row.aiImpactClassification,
      confidence: row.aiConfidenceScore,
      expected: expectedById.get(row.id)?.expectedImpact || null,
    },
    task3_theme_detection: (row.aiThemes || []).map((theme) => ({
      theme: theme.theme,
      confidence: theme.confidence,
      matchedEvidence: theme.matchedEvidence || [],
    })),
    task4_entity_extraction: row.aiExtractedExperiences?.entities || {},
    task5_keyword_extraction: row.aiExtractedExperiences?.keywords || [],
  };
});

const fieldGuide = {
  inputField: 'narrativeText',
  task2_impact_classification: {
    classification: 'NEGATIVE, POSITIVE, MIXED, or UNCLEAR',
    confidence: 'Numeric confidence for the selected impact label',
  },
  task3_theme_detection: {
    theme: 'Detected story theme',
    confidence: 'Theme confidence',
    matchedEvidence: 'Text fragments that triggered the theme',
  },
  task4_entity_extraction: {
    agencies: 'Public agencies or organizations mentioned in the story',
    locations: 'Places mentioned in the story',
    systems: 'Algorithmic systems, portals, scores, or tools mentioned in the story',
    dates: 'Dates or time references mentioned in the story',
    people_roles: 'Roles involved in the story',
  },
  task5_keyword_extraction: 'Short keywords or key phrases from the story',
};

fs.writeFileSync(
  path.join(outputDir, 'outputs', 'task2-5-sample-results.json'),
  JSON.stringify(outputRows, null, 2),
  'utf8',
);
fs.writeFileSync(
  path.join(outputDir, 'outputs', 'task2-5-output-fields.json'),
  JSON.stringify(fieldGuide, null, 2),
  'utf8',
);

console.log(JSON.stringify({ outputDir, samples: outputRows.length }, null, 2));
