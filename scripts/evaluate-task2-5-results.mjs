import fs from 'node:fs';

const inputPath = process.argv[2] || 'task345-results/tuned-all-stories-ml-output/task2-5-combined-results.json';

const expectedImpactByTitle = {
  'The ranking rule did not fit how I was actually living': 'NEGATIVE',
  'The rental aid upload worked the first time': 'POSITIVE',
  'Two versions of my name made the intake status change': 'NEGATIVE',
  'Incorrect Academic Risk Flag': 'NEGATIVE',
  'The interpreter routing finally got me to the right person': 'POSITIVE',
  'My daughter stayed flagged after a family emergency': 'NEGATIVE',
  'The recommendation helped me find a job workshop': 'POSITIVE',
  'The computer system is adding to our already existing struggle with the agency': 'NEGATIVE',
  'The interpreter line finally got me to the right office': 'POSITIVE',
  "Computers can't predict somebody's future": 'NEGATIVE',
  "The community needs to be a part of what's happening": 'NEGATIVE',
  'The renewal went through faster than expected': 'POSITIVE',
  'My application was flagged and nobody could explain why': 'NEGATIVE',
  'The rental aid upload worked the first time': 'POSITIVE',
  'My needs have changed but I am not in a state to prove it': 'NEGATIVE',
  'The job match actually fit my schedule': 'POSITIVE',
  'My utility help stayed low priority for weeks': 'NEGATIVE',
  'Nobody trusts you when you are unhoused': 'NEGATIVE',
  'My safety report went to the wrong station': 'NEGATIVE',
  'Two versions of my name made the intake status change': 'NEGATIVE',
  'Workers need to know how employers get flagged': 'NEGATIVE',
  'The risk score sent workers to my home before I could respond': 'NEGATIVE',
  'The dispatcher routed my call quickly': 'POSITIVE',
  'Photos helped get our inspection priority corrected': 'MIXED',
  'The ranking rule did not fit how I was actually living': 'NEGATIVE',
  'The unhoused individuals should have a voice': 'NEGATIVE',
  'The flag was fixed, but rent was due before the review ended': 'NEGATIVE',
  'My benefits were paused over a tax refund': 'NEGATIVE',
  'The lunch portal changed my status without explaining why': 'NEGATIVE',
  'This tool is not supporting families': 'NEGATIVE',
  'My voucher was denied because of an old address': 'NEGATIVE',
  'I got a citation for a car that was not mine': 'NEGATIVE',
  'The staff needs better training': 'NEGATIVE',
  'Our building stayed low priority after repeated complaints': 'NEGATIVE',
  'My safety report was routed to maintenance instead': 'NEGATIVE',
  'The dispatch category did not match what was happening': 'NEGATIVE',
};

const weakKeywords = new Set([
  'priority',
  'score',
  'report',
  'computer',
  'decision',
  'decisions',
  'system',
  'tool',
  'model',
  'record',
  'worker',
  'weeks',
  'category',
]);

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rows = Array.isArray(payload) ? payload : payload.results || [];
const issues = [];
const resultTitles = new Set(rows.map((row) => row.title));
const expectedTitles = new Set(Object.keys(expectedImpactByTitle));

for (const title of resultTitles) {
  if (!expectedTitles.has(title)) {
    issues.push({ title, type: 'missing_expected_impact' });
  }
}
for (const title of expectedTitles) {
  if (!resultTitles.has(title)) {
    issues.push({ title, type: 'expected_story_not_in_results' });
  }
}

for (const row of rows) {
  const title = row.title || row.id || 'Untitled';
  const impact = row.aiImpactClassification || row.task2?.aiImpactClassification;
  const confidence = Number(row.aiConfidenceScore ?? row.task2?.aiConfidenceScore ?? 0);
  const themes = row.aiThemes || row.task3?.themes || [];
  const entities = row.aiExtractedExperiences?.entities || row.task4?.entities || {};
  const keywords = row.aiExtractedExperiences?.keywords || row.task5?.keywords || [];
  const expectedImpact = expectedImpactByTitle[title];

  if (expectedImpact && impact !== expectedImpact) {
    issues.push({ title, type: 'impact', expected: expectedImpact, actual: impact });
  }
  if (impact && impact !== 'UNCLEAR' && confidence < 0.85) {
    issues.push({ title, type: 'low_confidence', impact, confidence });
  }
  if (!themes.length) {
    issues.push({ title, type: 'no_themes' });
  }
  for (const theme of themes) {
    if (!Array.isArray(theme.matchedEvidence) || theme.matchedEvidence.length === 0) {
      issues.push({ title, type: 'theme_without_evidence', theme: theme.theme });
    }
  }
  for (const system of entities.systems || []) {
    if (/^(a |the )?system$|^(a |the )?tool$|can fix|fight this|you have to/i.test(system)) {
      issues.push({ title, type: 'bad_system', value: system });
    }
  }
  if (title === 'Incorrect Academic Risk Flag' && (entities.people_roles || []).includes('dispatcher')) {
    issues.push({ title, type: 'bad_role', value: 'dispatcher' });
  }
  for (const keyword of keywords) {
    if (weakKeywords.has(String(keyword).toLowerCase())) {
      issues.push({ title, type: 'weak_keyword', value: keyword });
    }
  }
}

const byImpact = rows.reduce((counts, row) => {
  const impact = row.aiImpactClassification || row.task2?.aiImpactClassification || 'NONE';
  counts[impact] = (counts[impact] || 0) + 1;
  return counts;
}, {});

const report = {
  inputPath,
  count: rows.length,
  byImpact,
  issueCount: issues.length,
  issues,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = issues.length ? 1 : 0;
