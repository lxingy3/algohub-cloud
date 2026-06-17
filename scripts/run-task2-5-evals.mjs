import { spawnSync } from 'node:child_process';

const checks = [
  {
    name: 'current_stories',
    resultPath: 'task345-results/tuned-all-stories-ml-output/task2-5-combined-results.json',
    evalSetPath: 'data/task2-5-eval-set.json',
  },
  {
    name: 'challenge_stories',
    resultPath: 'task345-results/challenge-ml-output/task2-5-combined-results.json',
    evalSetPath: 'data/task2-5-challenge-eval-set.json',
  },
  {
    name: 'messy_stories',
    resultPath: 'task345-results/messy-ml-output/task2-5-combined-results.json',
    evalSetPath: 'data/task2-5-messy-eval-set.json',
  },
];

const runEval = (check) => {
  const child = spawnSync(
    process.execPath,
    ['scripts/evaluate-task2-5-results.mjs', check.resultPath, check.evalSetPath],
    { encoding: 'utf8' },
  );

  if (child.error) {
    return {
      name: check.name,
      status: 'FAIL',
      error: child.error.message,
    };
  }

  let report = null;
  try {
    report = JSON.parse(child.stdout);
  } catch {
    return {
      name: check.name,
      status: 'FAIL',
      error: 'Could not parse evaluation output.',
      stdout: child.stdout,
      stderr: child.stderr,
    };
  }

  return {
    name: check.name,
    status: child.status === 0 && report.issueCount === 0 ? 'PASS' : 'FAIL',
    resultPath: check.resultPath,
    evalSetPath: check.evalSetPath,
    count: report.count,
    expectedCount: report.expectedCount,
    byImpact: report.byImpact,
    issueCount: report.issueCount,
    issues: report.issues,
    stderr: child.stderr?.trim() || undefined,
  };
};

const reports = checks.map(runEval);
const issueCount = reports.reduce((sum, report) => sum + Number(report.issueCount || 0), 0);
const failedChecks = reports.filter((report) => report.status !== 'PASS').length;

const combined = {
  status: failedChecks === 0 && issueCount === 0 ? 'PASS' : 'FAIL',
  issueCount,
  checks: reports,
};

console.log(JSON.stringify(combined, null, 2));
process.exitCode = combined.status === 'PASS' ? 0 : 1;
