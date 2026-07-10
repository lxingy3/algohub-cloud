import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { analyzeNarrativeTextWithModels } from '../lib/mlFullAnalysis.js';

const prisma = new PrismaClient();

const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const outputDir = 'task345-results';
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(outputDir, `ml-calibration-run-${runStamp}.json`);

const sampleStories = [
  {
    slug: 'housing-voucher-denial-old-address',
    title: 'My voucher was denied because of an old address',
    domain: 'Housing',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['data_accuracy', 'lack_of_recourse', 'process_confusion'],
    city: 'Pittsburgh',
    zipCode: '15219',
    occurredAtText: 'Spring 2026',
    referralSource: 'Community listening session',
    narrativeText: 'My housing voucher application was marked ineligible after the automated eligibility system used an old address from a prior shelter stay. The notice did not explain how the address was selected. When I called the housing authority, staff said there was no appeal path until the next review cycle, so my family stayed on a waiting list for another month.',
  },
  {
    slug: 'benefits-approved-after-verification',
    title: 'The renewal went through faster than expected',
    domain: 'Benefits Administration',
    expectedImpact: 'POSITIVE',
    expectedThemes: ['positive_experience', 'process_confusion'],
    city: 'Pittsburgh',
    zipCode: '15206',
    occurredAtText: 'May 2026',
    referralSource: 'Public web form',
    narrativeText: 'The benefits verification engine matched my documents correctly and approved the food assistance renewal faster than the paper process. I still did not understand every step, but the caseworker could see the same result and explain why my file moved forward.',
  },
  {
    slug: 'traffic-camera-wrong-plate',
    title: 'I got a citation for a car that was not mine',
    domain: 'Traffic Management',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['data_accuracy', 'lack_of_recourse'],
    city: 'Pittsburgh',
    zipCode: '15213',
    occurredAtText: 'April 2026',
    referralSource: 'Community partner referral',
    narrativeText: 'A traffic camera system sent me a citation for a car I do not own. The plate number in the photo was blurry, but the automated match treated it as mine. The Department of Mobility told me to pay first and dispute later, which made the process feel backwards.',
  },
  {
    slug: 'language-access-routing-success',
    title: 'The interpreter line finally got me to the right office',
    domain: 'Language Access',
    expectedImpact: 'POSITIVE',
    expectedThemes: ['positive_experience'],
    city: 'Pittsburgh',
    zipCode: '15224',
    occurredAtText: 'June 2026',
    referralSource: 'Public web form',
    narrativeText: 'The language access routing system recognized that I needed a Spanish interpreter and connected me to the right office on the first call. The resident services worker confirmed my appointment and I did not have to repeat the same story to three people.',
  },
  {
    slug: 'student-support-risk-flag',
    title: 'My daughter stayed flagged after a family emergency',
    domain: 'Student Support',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['data_accuracy', 'loss_of_dignity', 'lack_of_notification'],
    city: 'Pittsburgh',
    zipCode: '15217',
    occurredAtText: 'February 2026',
    referralSource: 'School family meeting',
    narrativeText: 'The student support system flagged my daughter as high risk after she missed school during a family emergency. No one told us an algorithm was involved. Even after her grades improved, the risk flag stayed in the counselor dashboard and teachers treated her like she was a problem.',
  },
  {
    slug: 'child-welfare-screening-home-visit',
    title: 'The risk score sent workers to my home before I could respond',
    domain: 'Child Welfare',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['loss_of_dignity', 'data_accuracy', 'lack_of_recourse'],
    city: 'Pittsburgh',
    zipCode: '15210',
    occurredAtText: 'March 2026',
    referralSource: 'Community listening session',
    narrativeText: 'CPS workers came to my home after the family screening tool gave my report a high risk score. The score seemed to rely on old public benefits records and a previous address. I could not see the score or correct the information before the visit.',
  },
  {
    slug: 'job-matching-good-referral',
    title: 'The job match actually fit my schedule',
    domain: 'Job Matching',
    expectedImpact: 'POSITIVE',
    expectedThemes: ['positive_experience'],
    city: 'Pittsburgh',
    zipCode: '15222',
    occurredAtText: 'May 2026',
    referralSource: 'Career center workshop',
    narrativeText: 'The workforce job matching system suggested a city maintenance opening that matched my license and schedule. A career center worker reviewed the match with me, and I got an interview the next week.',
  },
  {
    slug: 'energy-assistance-delayed-score',
    title: 'My utility help stayed low priority for weeks',
    domain: 'Energy Forecasting',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['delayed_outcome', 'opacity', 'process_confusion'],
    city: 'Pittsburgh',
    zipCode: '15208',
    occurredAtText: 'Winter 2026',
    referralSource: 'Utility assistance clinic',
    narrativeText: 'My energy assistance request stayed low priority for six weeks because the forecasting tool said my household was not urgent. The office could not explain the criteria. I only found out after calling twice that a priority score was holding the application.',
  },
  {
    slug: 'transit-safety-report-misrouted',
    title: 'My safety report went to the wrong station',
    domain: 'Transit Safety',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['arbitrary_outcome', 'delayed_outcome'],
    city: 'Pittsburgh',
    zipCode: '15212',
    occurredAtText: 'April 2026',
    referralSource: 'Public web form',
    narrativeText: 'I reported a broken light at a bus stop, but the routing system sent the safety concern to maintenance for a different station. It took two weeks before the transit authority corrected the category and sent someone to inspect the stop.',
  },
  {
    slug: 'housing-inspection-priority-fixed',
    title: 'Photos helped get our inspection priority corrected',
    domain: 'Housing Inspections',
    expectedImpact: 'MIXED',
    expectedThemes: ['data_accuracy', 'positive_experience', 'lack_of_recourse'],
    city: 'Pittsburgh',
    zipCode: '15201',
    occurredAtText: 'May 2026',
    referralSource: 'Tenant meeting',
    narrativeText: 'Our building stayed low priority after repeated heat complaints because the inspection system had the wrong unit count. At first no one could tell us how to challenge the priority level. After a community group helped submit photos, the city corrected the record and scheduled an inspection.',
  },
  {
    slug: 'emergency-dispatch-clear',
    title: 'The dispatcher routed my call quickly',
    domain: 'Emergency Services',
    expectedImpact: 'POSITIVE',
    expectedThemes: ['positive_experience'],
    city: 'Pittsburgh',
    zipCode: '15203',
    occurredAtText: 'June 2026',
    referralSource: 'Public web form',
    narrativeText: 'The emergency dispatch triage tool routed my call to the right response team quickly. The dispatcher still made the final decision, and the ambulance arrived faster than I expected.',
  },
  {
    slug: 'fraud-detection-benefit-hold',
    title: 'My benefits were paused over a tax refund',
    domain: 'Fraud Detection',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['data_accuracy', 'delayed_outcome', 'loss_of_dignity'],
    city: 'Pittsburgh',
    zipCode: '15214',
    occurredAtText: 'April 2026',
    referralSource: 'Benefits workshop',
    narrativeText: 'A fraud detection system paused my benefits because my bank deposit looked unusual. It was a tax refund, not fraud. The benefits office made me submit the same documents twice, and I felt like I was being treated as dishonest before anyone looked at the evidence.',
  },
  {
    slug: 'school-lunch-eligibility-confusing',
    title: 'The lunch portal changed my status without explaining why',
    domain: 'Student Award',
    expectedImpact: 'UNCLEAR',
    expectedThemes: ['process_confusion', 'opacity'],
    city: 'Pittsburgh',
    zipCode: '15207',
    occurredAtText: 'March 2026',
    referralSource: 'School family meeting',
    narrativeText: 'The school lunch eligibility portal changed my status from pending to review. I do not know whether an automated rule caused it or whether a staff member changed the file. The only message said more information was needed.',
  },
  {
    slug: 'community-services-duplicate-profile',
    title: 'Two versions of my name made the intake status change',
    domain: 'Community Services',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['data_accuracy', 'process_confusion'],
    city: 'Pittsburgh',
    zipCode: '15221',
    occurredAtText: 'Spring 2026',
    referralSource: 'Community center intake',
    narrativeText: 'The community services intake system created two profiles for me with different spellings of my name. Because the records did not merge, my application looked incomplete and the front desk could not explain why the status kept changing.',
  },
  {
    slug: 'rental-aid-document-upload-worked',
    title: 'The rental aid upload worked the first time',
    domain: 'Benefits Administration',
    expectedImpact: 'POSITIVE',
    expectedThemes: ['positive_experience'],
    city: 'Pittsburgh',
    zipCode: '15211',
    occurredAtText: 'June 2026',
    referralSource: 'Public web form',
    narrativeText: 'The rental aid portal read my uploaded lease and pay stubs correctly. The caseworker confirmed the automated check and my landlord received the approval notice the same day.',
  },
  {
    slug: 'homeless-services-length-rule',
    title: 'The ranking rule did not fit how I was actually living',
    domain: 'Housing',
    expectedImpact: 'NEGATIVE',
    expectedThemes: ['discriminatory_impact', 'arbitrary_outcome', 'loss_of_dignity'],
    city: 'Pittsburgh',
    zipCode: '15219',
    occurredAtText: 'February 2026',
    referralSource: 'Housing outreach session',
    narrativeText: 'The homeless services ranking system said I was not homeless long enough to receive help, even though I had been moving between friends and shelters. The rule did not fit my situation and made me feel like my experience did not count.',
  },
];

function requireEnv(name) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
  return process.env[name];
}

function requireOneEnv(names) {
  if (names.some((name) => process.env[name])) return;
  throw new Error(`${names.join(' or ')} is required.`);
}

function scoreMatch(expected, actual) {
  if (!actual) return false;
  if (expected === 'MIXED') return ['MIXED', 'NEGATIVE', 'POSITIVE'].includes(actual);
  return expected === actual;
}

function themeMatches(expectedThemes, actualThemes) {
  const actual = new Set((actualThemes || []).map((item) => item.theme));
  return expectedThemes.filter((theme) => actual.has(theme));
}

function extractKeywords(task5) {
  return Array.isArray(task5?.keywords) ? task5.keywords : [];
}

function extractEntities(task4) {
  return task4?.entities && typeof task4.entities === 'object' ? task4.entities : {};
}

function compactResult(result) {
  return {
    status: result.status,
    task2: result.task2,
    task3: result.task3,
    task4: result.task4,
    task5: result.task5,
  };
}

async function analyzeStory(story) {
  const result = await analyzeWithRetry(story.narrativeText);
  const actualImpact = result.task2?.aiImpactClassification || null;
  const actualThemes = result.task3?.aiThemes || [];
  const matchingThemes = themeMatches(story.expectedThemes, actualThemes);
  return {
    story,
    result: compactResult(result),
    evaluation: {
      impactMatched: scoreMatch(story.expectedImpact, actualImpact),
      expectedImpact: story.expectedImpact,
      actualImpact,
      expectedThemes: story.expectedThemes,
      actualThemes: actualThemes.map((item) => item.theme),
      matchingThemes,
      themeRecall: story.expectedThemes.length ? Number((matchingThemes.length / story.expectedThemes.length).toFixed(2)) : 1,
    },
  };
}

async function analyzeWithRetry(text, attempts = 3) {
  let lastResult = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await analyzeNarrativeTextWithModels(text);
    const taskStatuses = [lastResult.task2, lastResult.task3, lastResult.task4, lastResult.task5]
      .map((task) => task?.status);
    if (taskStatuses.every((status) => status === 'COMPLETED')) return lastResult;
    if (attempt < attempts) await sleep(5000 * attempt);
  }
  return lastResult;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function upsertTrainingStory(analysis) {
  const { story, result } = analysis;
  const sourceId = `ml-training-${story.slug}`;

  return prisma.testimony.upsert({
    where: { sourceId },
    create: {
      sourceId,
      jurisdictionId,
      title: story.title,
      summary: story.narrativeText.slice(0, 220),
      city: story.city,
      zipCode: story.zipCode,
      occurredAtText: story.occurredAtText,
      submitterName: null,
      referralSource: story.referralSource,
      publicPosting: true,
      followupConsent: false,
      storyType: 'text',
      isAnonymous: true,
      narrativeText: story.narrativeText,
      submissionMethod: 'WEB_FORM',
      originalLanguage: 'en',
      affectedDomain: story.domain,
      selfReportedImpact: story.expectedImpact === 'MIXED' ? 'MIXED' : story.expectedImpact,
      aiImpactClassification: result.task2?.aiImpactClassification || null,
      aiConfidenceScore: Number.isFinite(Number(result.task2?.aiConfidenceScore)) ? Number(result.task2.aiConfidenceScore) : null,
      aiThemes: result.task3?.aiThemes || [],
      aiExtractedExperiences: {
        entities: extractEntities(result.task4),
        keywords: extractKeywords(result.task5),
      },
      aiProcessedAt: new Date(),
      moderationStatus: 'APPROVED',
      moderationNotes: null,
    },
    update: {
      title: story.title,
      summary: story.narrativeText.slice(0, 220),
      city: story.city,
      zipCode: story.zipCode,
      occurredAtText: story.occurredAtText,
      submitterName: null,
      referralSource: story.referralSource,
      publicPosting: true,
      followupConsent: false,
      narrativeText: story.narrativeText,
      affectedDomain: story.domain,
      selfReportedImpact: story.expectedImpact === 'MIXED' ? 'MIXED' : story.expectedImpact,
      aiImpactClassification: result.task2?.aiImpactClassification || null,
      aiConfidenceScore: Number.isFinite(Number(result.task2?.aiConfidenceScore)) ? Number(result.task2.aiConfidenceScore) : null,
      aiThemes: result.task3?.aiThemes || [],
      aiExtractedExperiences: {
        entities: extractEntities(result.task4),
        keywords: extractKeywords(result.task5),
      },
      aiProcessedAt: new Date(),
      moderationStatus: 'APPROVED',
      moderationNotes: null,
    },
  });
}

async function updateTrainingStoryMetadataOnly() {
  let updated = 0;
  for (const story of sampleStories) {
    const sourceId = `ml-training-${story.slug}`;
    const result = await prisma.testimony.updateMany({
      where: { jurisdictionId, sourceId },
      data: {
        title: story.title,
        summary: story.narrativeText.slice(0, 220),
        city: story.city,
        zipCode: story.zipCode,
        occurredAtText: story.occurredAtText,
        submitterName: null,
        referralSource: story.referralSource,
        publicPosting: true,
        followupConsent: false,
        isAnonymous: true,
        affectedDomain: story.domain,
        selfReportedImpact: story.expectedImpact === 'MIXED' ? 'MIXED' : story.expectedImpact,
        moderationStatus: 'APPROVED',
        moderationNotes: null,
      },
    });
    updated += result.count;
  }
  return updated;
}

async function updateExistingStories(skipSourceIds) {
  const testimonies = await prisma.testimony.findMany({
    where: {
      jurisdictionId,
      narrativeText: { not: '' },
      NOT: { sourceId: { in: [...skipSourceIds] } },
    },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true,
      sourceId: true,
      title: true,
      narrativeText: true,
    },
  });

  const updates = [];
  for (const testimony of testimonies) {
    try {
      const result = await analyzeWithRetry(testimony.narrativeText);
      await prisma.testimony.update({
        where: { id: testimony.id },
        data: {
          aiImpactClassification: result.task2?.aiImpactClassification || null,
          aiConfidenceScore: Number.isFinite(Number(result.task2?.aiConfidenceScore)) ? Number(result.task2.aiConfidenceScore) : null,
          aiThemes: result.task3?.aiThemes || [],
          aiExtractedExperiences: {
            entities: extractEntities(result.task4),
            keywords: extractKeywords(result.task5),
          },
          aiProcessedAt: new Date(),
        },
      });
      updates.push({
        id: testimony.id,
        title: testimony.title,
        status: 'updated',
        result: compactResult(result),
      });
    } catch (error) {
      updates.push({
        id: testimony.id,
        title: testimony.title,
        status: 'failed',
        error: error?.message || String(error),
      });
    }
  }
  return updates;
}

async function main() {
  requireEnv('DATABASE_URL');
  if (process.argv.includes('--metadata-only')) {
    const updated = await updateTrainingStoryMetadataOnly();
    console.log(JSON.stringify({ mode: 'metadata-only', updated }, null, 2));
    return;
  }

  requireEnv('ML_WORKER_TOKEN');
  requireOneEnv(['ML_IMPACT_ENDPOINT', 'ML_BART_ENDPOINT']);
  requireEnv('ML_BART_ENDPOINT');
  requireEnv('ML_SPACY_ENDPOINT');
  requireEnv('ML_KEYBERT_ENDPOINT');

  fs.mkdirSync(outputDir, { recursive: true });

  const analyses = [];
  for (const story of sampleStories) {
    try {
      const analysis = await analyzeStory(story);
      await upsertTrainingStory(analysis);
      analyses.push({ ...analysis, syncStatus: 'published' });
    } catch (error) {
      analyses.push({
        story,
        syncStatus: 'failed',
        error: error?.message || String(error),
      });
    }
  }

  const trainingSourceIds = new Set(sampleStories.map((story) => `ml-training-${story.slug}`));
  const existingUpdates = await updateExistingStories(trainingSourceIds);

  const completedAnalyses = analyses.filter((item) => item.result);
  const impactMatches = completedAnalyses.filter((item) => item.evaluation?.impactMatched).length;
  const averageThemeRecall = completedAnalyses.length
    ? Number((completedAnalyses.reduce((sum, item) => sum + (item.evaluation?.themeRecall || 0), 0) / completedAnalyses.length).toFixed(2))
    : 0;

  const payload = {
    generatedAt: new Date().toISOString(),
    jurisdictionId,
    tools: {
      task2: process.env.TASK2_IMPACT_MODEL || 'facebook/bart-large-mnli',
      task3: 'facebook/bart-large-mnli',
      task4: 'spaCy',
      task5: 'KeyBERT',
    },
    summary: {
      trainingStories: sampleStories.length,
      publishedTrainingStories: analyses.filter((item) => item.syncStatus === 'published').length,
      impactAccuracyOnExpectedSet: completedAnalyses.length ? Number((impactMatches / completedAnalyses.length).toFixed(2)) : 0,
      averageThemeRecall,
      existingStoriesUpdated: existingUpdates.filter((item) => item.status === 'updated').length,
      existingStoriesFailed: existingUpdates.filter((item) => item.status === 'failed').length,
    },
    analyses,
    existingUpdates,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, summary: payload.summary }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
