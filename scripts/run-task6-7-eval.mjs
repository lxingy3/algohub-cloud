import fs from 'node:fs';
import { linkAlgorithmsForTask6, summarizeForTask7 } from '../lib/mlFullAnalysis.js';

const evalSetPath = process.argv[2] || 'data/task6-7-eval-set.json';
const payload = JSON.parse(fs.readFileSync(evalSetPath, 'utf8'));
const records = Array.isArray(payload) ? payload : payload.records || [];

const algorithmCandidates = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Fraud Detection System',
    useCase: 'Fraud Detection',
    description: 'Machine learning algorithm that analyzes transaction patterns to identify potentially fraudulent activities in government benefit programs.',
    purpose: 'To detect and prevent fraudulent claims in social welfare programs.',
    agencyName: 'Department of Social Services',
    dataUsed: 'Transaction history, claim patterns, cross-referenced databases, applicant demographics',
    decisionType: 'Risk scoring and flagging for manual review',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Traffic Flow Optimizer',
    useCase: 'Traffic Management',
    description: 'AI-powered system that manages traffic signal timing based on real-time traffic data.',
    purpose: 'To optimize traffic signal timing dynamically based on real-time vehicle flow.',
    agencyName: 'City Transportation Authority',
    dataUsed: 'Traffic sensor data, vehicle counts, GPS data from public transit, historical traffic patterns',
    decisionType: 'Automated signal timing adjustments',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Student Risk Assessment',
    useCase: 'Student Support',
    description: 'Predictive model that identifies students at risk of dropping out based on attendance, grades, and engagement metrics.',
    purpose: 'To identify students at risk of dropping out early.',
    agencyName: 'Public School Districts',
    dataUsed: 'Attendance records, grade performance, behavioral incidents, socioeconomic indicators',
    decisionType: 'Risk level classification',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Job Matching Algorithm',
    useCase: 'Job Matching',
    description: 'Recommendation system that matches job seekers with suitable employment opportunities based on skills, experience, and preferences.',
    purpose: 'To match unemployed individuals with suitable job openings.',
    agencyName: 'Employment Services Agency',
    dataUsed: 'Resume data, skill assessments, job posting requirements, employment history',
    decisionType: 'Ranked job recommendations',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Energy Consumption Predictor',
    useCase: 'Energy Forecasting',
    description: 'Time-series forecasting model that predicts energy demand.',
    purpose: 'To forecast energy demand and optimize power distribution.',
    agencyName: 'National Energy Board',
    dataUsed: 'Historical consumption data, weather patterns, seasonal trends',
    decisionType: 'Demand forecasting and resource allocation',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Allegheny Family Screening Tool',
    useCase: 'Child Welfare',
    description: 'Tool that helps child welfare agencies prioritize investigations by identifying which children are at higher risk.',
    purpose: 'To help child welfare agencies prioritize investigations and manage call volumes.',
    agencyName: 'Allegheny County Department of Human Services',
    dataUsed: 'Family demographics, historical case data, criminal records, public health records, public benefits records',
    decisionType: 'Risk score for front-end screening decisions',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    name: 'Housing Allocation Algorithm',
    useCase: 'Housing Prioritization',
    description: 'A tool designed to prioritize scarce housing resources by predicting an applicant risk of adverse events.',
    purpose: 'To prioritize scarce housing resources for individuals and families experiencing homelessness.',
    agencyName: 'Allegheny County Government',
    dataUsed: 'Government administrative records, healthcare utilization data, Medicaid funding data, criminal justice records',
    decisionType: 'Risk score used to assign applicants to housing waitlists',
  },
];

const issues = [];
const results = [];

for (const record of records) {
  const linkedAlgorithms = await linkAlgorithmsForTask6({
    text: record.narrativeText,
    entities: record.entities,
    keywords: record.keywords,
    affectedDomain: record.affectedDomain,
    algorithms: algorithmCandidates,
  });
  const summary = summarizeForTask7(record.narrativeText);
  const topMatch = linkedAlgorithms[0]?.name || null;

  results.push({
    id: record.id,
    title: record.title,
    topMatch,
    summary,
    linkedAlgorithms,
  });

  if (record.expectedAlgorithmName && topMatch !== record.expectedAlgorithmName) {
    issues.push({
      id: record.id,
      title: record.title,
      type: 'wrong_algorithm_link',
      expected: record.expectedAlgorithmName,
      actual: topMatch,
      linkedAlgorithms,
    });
  }
  if (!record.expectedAlgorithmName && topMatch) {
    issues.push({
      id: record.id,
      title: record.title,
      type: 'unexpected_algorithm_link',
      actual: topMatch,
      linkedAlgorithms,
    });
  }
  if (!summary) {
    issues.push({ id: record.id, title: record.title, type: 'missing_summary' });
  }
  if (summary.length > 320) {
    issues.push({ id: record.id, title: record.title, type: 'summary_too_long', length: summary.length });
  }
  for (const expectedText of record.expectedSummaryIncludes || []) {
    if (!summary.toLowerCase().includes(String(expectedText).toLowerCase())) {
      issues.push({
        id: record.id,
        title: record.title,
        type: 'summary_missing_expected_text',
        expectedText,
        summary,
      });
    }
  }
  for (const excludedText of record.expectedSummaryExcludes || []) {
    if (summary.toLowerCase().includes(String(excludedText).toLowerCase())) {
      issues.push({
        id: record.id,
        title: record.title,
        type: 'summary_contains_excluded_text',
        excludedText,
        summary,
      });
    }
  }
}

const report = {
  status: issues.length ? 'FAIL' : 'PASS',
  evalSetPath,
  count: records.length,
  issueCount: issues.length,
  issues,
  results,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = issues.length ? 1 : 0;
