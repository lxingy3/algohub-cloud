import { analyzeNarrativeTextWithModels } from '../lib/mlFullAnalysis.js';

process.env.TASK25_DISABLE_LOCAL_RUNNER = 'true';

const samples = [
  {
    name: 'pittsburgh_service_story',
    text: 'I live in Homewood and submitted a 311 service request after mold spread in my apartment. The City of Pittsburgh 311 Response Center routed the report to the wrong maintenance queue and nobody could explain what the system used. After three weeks I was still waiting and the code inspector said the record was already closed.',
    expectedImpact: 'NEGATIVE',
    minimumConfidence: 0.85,
    requiredEntities: ['agencies', 'locations', 'systems', 'dates', 'people_roles'],
    minKeywords: 5,
  },
  {
    name: 'pittsburgh_housing_story',
    text: 'My family applied through the Pittsburgh Housing Authority after our apartment in Carrick became unsafe. The housing prioritization system kept our application low on the waiting list even after I uploaded the new medical note. A housing navigator could not explain why the priority score did not change for two more weeks.',
    expectedImpact: 'NEGATIVE',
    minimumConfidence: 0.85,
    requiredEntities: ['agencies', 'locations', 'systems', 'dates', 'people_roles'],
    minKeywords: 5,
  },
  {
    name: 'allegheny_child_welfare_story',
    text: 'An Allegheny County Department of Human Services caseworker told me the family screening score marked my household high risk after an old missed appointment. I was not told what data counted, and the caseworker said the Allegheny Family Screening Tool could not be changed before the next visit.',
    expectedImpact: 'NEGATIVE',
    minimumConfidence: 0.85,
    requiredEntities: ['agencies', 'systems', 'dates', 'people_roles'],
    minKeywords: 5,
  },
  {
    name: 'generic_public_speech',
    text: 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation can long endure. We have come to dedicate a portion of that field as a final resting place for those who gave their lives that the nation might live.',
    expectedImpact: 'UNCLEAR',
    minimumConfidence: 0.5,
    requiredEntities: ['dates'],
    minKeywords: 5,
  },
  {
    name: 'generic_story_excerpt',
    text: 'The occurrence or event in our story takes place during the Civil War of the 1860s between the American states of the North and the states of the South. At Owl Creek Bridge in Alabama, a southern prisoner named Peyton Farquhar stands with Union soldiers while he imagines freeing his hands and jumping into the river.',
    expectedImpact: 'UNCLEAR',
    minimumConfidence: 0.5,
    requiredEntities: ['locations', 'dates', 'people_roles'],
    minKeywords: 5,
  },
  {
    name: 'employment_service_story',
    text: 'At PA CareerLink Pittsburgh, the workforce job matching system pointed me to a training workshop and helped me get an interview the same week. The career center worker explained why the recommendation fit my current skills.',
    expectedImpact: 'POSITIVE',
    minimumConfidence: 0.85,
    requiredEntities: ['agencies', 'locations', 'systems', 'dates', 'people_roles'],
    minKeywords: 5,
  },
  {
    name: 'generic_public_service_complaint',
    text: 'In Philadelphia, a resident said the city permit portal denied a small business application without a clear reason. The applicant waited ten days, called the office twice, and still could not tell whether an automated review or a staff member made the decision.',
    expectedImpact: 'NEGATIVE',
    minimumConfidence: 0.85,
    requiredEntities: ['locations', 'systems', 'dates', 'people_roles'],
    minKeywords: 5,
  },
  {
    name: 'generic_positive_service_story',
    text: 'A student used the university advising portal to find a scholarship deadline and book an appointment with a counselor. The tool explained the requirements clearly, and the student finished the application the same day.',
    expectedImpact: 'POSITIVE',
    minimumConfidence: 0.85,
    requiredEntities: ['systems', 'dates', 'people_roles'],
    minKeywords: 5,
  },
];

const issues = [];
const results = [];

for (const sample of samples) {
  const result = await analyzeNarrativeTextWithModels(sample.text);
  const entities = result.task4?.entities || {};
  const keywords = Array.isArray(result.task5?.keywords) ? result.task5.keywords : [];
  const impact = result.task2?.aiImpactClassification;
  const entityCounts = Object.fromEntries(Object.entries(entities).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]));

  if (impact !== sample.expectedImpact) {
    issues.push(`${sample.name}: expected impact ${sample.expectedImpact}, got ${impact || 'none'}`);
  }
  if (Number(result.task2?.aiConfidenceScore || 0) < Number(sample.minimumConfidence || 0)) {
    issues.push(`${sample.name}: expected confidence >= ${sample.minimumConfidence}, got ${result.task2?.aiConfidenceScore || 0}`);
  }
  for (const field of sample.requiredEntities) {
    if (!Array.isArray(entities[field]) || entities[field].length === 0) {
      issues.push(`${sample.name}: expected Task 4 ${field} to be non-empty`);
    }
  }
  if (keywords.length < sample.minKeywords) {
    issues.push(`${sample.name}: expected at least ${sample.minKeywords} Task 5 keywords, got ${keywords.length}`);
  }
  if (result.task2?.status !== 'COMPLETED' || result.task3?.status !== 'COMPLETED' || result.task4?.status !== 'COMPLETED' || result.task5?.status !== 'COMPLETED') {
    issues.push(`${sample.name}: expected Task 2-5 statuses to be COMPLETED`);
  }

  results.push({
    name: sample.name,
    impact,
    confidence: result.task2?.aiConfidenceScore,
    themeCount: Array.isArray(result.task3?.aiThemes) ? result.task3.aiThemes.length : 0,
    entityCounts,
    keywords,
  });
}

const report = {
  runtime: 'js-fallback-smoke',
  status: issues.length ? 'FAIL' : 'PASS',
  issueCount: issues.length,
  issues,
  results,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = issues.length ? 1 : 0;
