import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local']) loadEnvFile(file);

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';
const reviewerEmail = process.env.BRIEFINGS_FIXTURE_REVIEWER_EMAIL || 'xil594@pitt.edu';
const outputPath = 'task-briefings-results/synthetic-evaluation-task2-5-input.json';
const reviewPath = 'task-briefings-results/synthetic-evaluation-review.json';

const stories = [
  fixture('traffic-stale-closure', 'traffic-flow-optimizer', 'Traffic Management', 'The detour stayed after the road reopened', 'A stale closure record kept changing traffic signals and routing cars away from an open street.', 'The traffic system kept treating Centre Avenue as closed two days after the construction crew reopened it. Drivers were sent through smaller residential streets, and the signal timing made the backup worse. I reported that the closure record was outdated. A city employee checked the field report, corrected the record, and the route returned to normal that afternoon.'),
  fixture('benefits-old-income', 'benefits-eligibility-verification-engine', 'Benefits Administration', 'An old income record paused my food assistance', 'An outdated income record triggered a benefit pause until a caseworker corrected the file.', 'My food assistance renewal was paused because the eligibility system used income from a job I had left months earlier. The notice did not show which record caused the mismatch. I brought my final pay stub to the office. A caseworker found the outdated wage record, corrected it, and restored the benefit after a manual review.'),
  fixture('student-hospital-attendance', 'student-risk-assessment', 'Student Support', 'Hospital absences were counted as disengagement', 'Excused hospital absences raised a student risk flag until school staff corrected the attendance record.', 'My son was marked high risk after a week in the hospital. The student support system counted the excused absences as disengagement even though the school had the medical note. His counselor compared the attendance file with the nurse record, corrected the missing codes, and removed the flag before the next support meeting.'),
  fixture('housing-old-shelter-address', 'housing-allocation-algorithm', 'Housing', 'An old shelter address lowered my housing priority', 'A stale address affected housing priority until a worker verified the current record.', 'The housing waitlist still showed a shelter address I had left six months earlier. The ranking treated my current situation as stable and moved me lower on the list. I could not see which address the score used. A housing worker checked the intake history, replaced the stale address, and recalculated the priority after I submitted a current letter.'),

  fixture('dispatch-wrong-category', 'emergency-dispatch-triage-assistant', 'Emergency Services', 'A welfare call was routed as a noise complaint', 'A dispatch category sent a welfare call to the wrong queue before a dispatcher corrected it.', 'I called because an older neighbor had not answered the door and needed a welfare check. The intake category sent the call to the noise complaint queue. I repeated that this was about a person who might need medical help. A dispatcher changed the category, explained the transfer, and sent the appropriate response team.'),
  fixture('language-wrong-service', 'language-access-routing-system', 'Language Access', 'The interpreter request reached the wrong service', 'A Spanish interpreter request was misrouted before staff transferred it to the correct benefits line.', 'I selected Spanish and asked for help with a benefits renewal, but the routing system sent me to the housing interpreter line. The first worker could not open my case. She stayed on the call, transferred the request to the benefits language team, and told me which option to choose next time.'),
  fixture('transit-harassment-maintenance', 'transit-safety-incident-classifier', 'Transit Safety', 'My harassment report was classified as maintenance', 'A transit safety report entered the maintenance queue instead of the safety review queue.', 'I reported repeated harassment at a bus stop. The online form classified the report as a damaged shelter and sent it to maintenance. The confirmation page did not show the category. After I called customer service, an employee read the description, moved the report to the safety review queue, and gave me a new case number.'),
  fixture('library-wrong-workshop', 'library-resource-recommendation-tool', 'Community Services', 'The library tool suggested the wrong kind of workshop', 'A recommendation for business classes missed a request for tenant legal help.', 'I asked the library portal for help with an eviction notice. It recommended small business workshops because my search included the word lease. A librarian read the notice, explained why the suggestion did not fit, and connected me with the housing legal clinic and the correct branch schedule.'),

  fixture('fraud-refund-hold', 'fraud-detection-system', 'Fraud Detection', 'A grocery refund triggered a benefit hold', 'A routine refund triggered a fraud review with no clear explanation or timely appeal.', 'A grocery store refund appeared twice in my transaction history and the fraud system paused my benefit card. The notice only said unusual activity. The phone line could not tell me which purchase was questioned, and the appeal took six weeks. The hold was removed after a reviewer matched the refund to the original receipt.'),
  fixture('wage-duplicate-license', 'wage-compliance-risk-model', 'Employment', 'A duplicate business record raised the compliance risk', 'Duplicate license records flagged an employer without a clear correction path.', 'Our small cleaning company appeared twice in the city license file after an address update. The wage compliance model treated the duplicate as two employers with inconsistent payroll records. The notice did not explain the duplicate or give a direct correction form. We submitted the same documents to two offices before an analyst merged the records.'),
  fixture('inspection-mold-delay', 'public-housing-inspection-scheduler', 'Housing Inspections', 'The mold complaint stayed low priority', 'A housing inspection request remained low priority without an explanation or appeal path.', 'I uploaded photos of mold spreading across two bedrooms, but the inspection scheduler kept the request at low priority. The status page showed no reason and no way to challenge the category. My children were coughing while we waited. A tenant advocate contacted the inspection office, and an inspector finally reviewed the photos and scheduled a visit.'),
  fixture('energy-low-need', 'energy-consumption-predictor', 'Energy Forecasting', 'The forecast treated my household as low need', 'A demand forecast missed a household medical need and offered no review path.', 'The utility assistance portal said my household was low priority because our recent electricity use was below the seasonal forecast. The record did not show that we had reduced heating to afford a medical device. There was no review link on the result page. A clinic social worker called the program and documented the medical need before assistance was approved.'),

  fixture('job-schedule-correction', 'job-matching-algorithm', 'Job Matching', 'A counselor fixed the schedule in my job matches', 'Human review corrected a schedule constraint and produced useful job recommendations.', 'The job matching portal kept suggesting overnight shifts even though I had entered that I cared for my child at night. A career counselor found that the availability field had not saved after an update. She corrected the schedule, reran the match, and helped me apply for a daytime warehouse position that fit my experience.'),
  fixture('family-context-review', 'allegheny-family-screening-tool', 'Child Welfare', 'The worker checked the family context before acting', 'A worker reviewed the context, questioned the risk score, and connected the family with support.', 'The family screening score was high after several benefit and housing records appeared together. The worker did not treat the score as the final answer. She asked about the recent move, checked that the children were safe, documented the missing context, and referred us to rental assistance instead of escalating the case.'),
  fixture('student-award-correction', 'student-meal-benefit-eligibility-portal', 'Student Award', 'School staff restored the meal benefit', 'A staff member corrected a household record and restored eligibility before the next school week.', 'The school portal removed my daughter from the meal program after our household size changed. The message did not explain which field failed. The school office compared the application with the enrollment record, corrected the household count, and restored the benefit before the next Monday.'),
  fixture('eviction-court-record', 'eviction-risk-prioritization-model', 'Housing', 'A tenant advocate added the missing court record', 'Human review added a missing dismissal record and corrected an eviction risk priority.', 'The eviction support list ranked my case as low priority because the system showed an old filing but not the dismissal. A tenant advocate found the missing court update and attached it to the case. Staff reviewed the corrected record, changed the priority, and scheduled legal help before the next hearing date.'),
];

const reviewLabels = {
  'traffic-stale-closure': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'process_confusion', 'positive_experience']],
  'benefits-old-income': ['MIXED', ['data_accuracy', 'opacity', 'delayed_outcome', 'arbitrary_outcome', 'positive_experience']],
  'student-hospital-attendance': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'positive_experience']],
  'housing-old-shelter-address': ['MIXED', ['data_accuracy', 'opacity', 'arbitrary_outcome', 'positive_experience']],
  'dispatch-wrong-category': ['MIXED', ['process_confusion', 'positive_experience']],
  'language-wrong-service': ['MIXED', ['process_confusion', 'positive_experience']],
  'transit-harassment-maintenance': ['MIXED', ['process_confusion', 'opacity', 'loss_of_dignity', 'positive_experience']],
  'library-wrong-workshop': ['MIXED', ['arbitrary_outcome', 'process_confusion', 'positive_experience']],
  'fraud-refund-hold': ['NEGATIVE', ['arbitrary_outcome', 'opacity', 'delayed_outcome', 'lack_of_recourse']],
  'wage-duplicate-license': ['NEGATIVE', ['data_accuracy', 'opacity', 'lack_of_recourse', 'process_confusion']],
  'inspection-mold-delay': ['NEGATIVE', ['delayed_outcome', 'opacity', 'lack_of_recourse', 'loss_of_dignity']],
  'energy-low-need': ['MIXED', ['arbitrary_outcome', 'opacity', 'lack_of_recourse', 'data_accuracy']],
  'job-schedule-correction': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'positive_experience']],
  'family-context-review': ['POSITIVE', ['positive_experience']],
  'student-award-correction': ['MIXED', ['data_accuracy', 'opacity', 'positive_experience']],
  'eviction-court-record': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'positive_experience']],
};

function fixture(key, algorithmSlug, affectedDomain, title, summary, narrativeText) {
  return { key, algorithmSlug, affectedDomain, title, summary, narrativeText };
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId, slug: { in: stories.map((story) => story.algorithmSlug) } },
    select: { id: true, slug: true, name: true },
  });
  const algorithmBySlug = new Map(algorithms.map((algorithm) => [algorithm.slug, algorithm]));
  const missing = stories.filter((story) => !algorithmBySlug.has(story.algorithmSlug));
  if (missing.length) throw new Error(`Missing algorithms: ${missing.map((story) => story.algorithmSlug).join(', ')}`);

  const reviewer = await prisma.user.findFirst({
    where: { jurisdictionId, email: reviewerEmail },
    select: { id: true, name: true, email: true },
  });
  if (!reviewer) throw new Error(`Reviewer not found: ${reviewerEmail}`);

  const preview = stories.map((story) => ({
    sourceId: `synthetic-briefings-v1-${story.key}`,
    title: story.title,
    affectedDomain: story.affectedDomain,
    algorithm: algorithmBySlug.get(story.algorithmSlug).name,
  }));
  if (!apply) {
    console.log(JSON.stringify({ mode: 'dry-run', reviewer, records: preview }, null, 2));
    return;
  }

  const results = [];
  for (let index = 0; index < stories.length; index += 1) {
    const story = stories[index];
    const algorithm = algorithmBySlug.get(story.algorithmSlug);
    const sourceId = `synthetic-briefings-v1-${story.key}`;
    const submittedAt = new Date(Date.UTC(2026, 6, 1 + index, 14, 0, 0));
    const testimony = await prisma.testimony.upsert({
      where: { sourceId },
      create: {
        sourceId,
        jurisdictionId,
        title: story.title,
        summary: story.summary,
        narrativeText: story.narrativeText,
        city: 'Pittsburgh',
        referralSource: 'Synthetic model-evaluation fixture',
        publicPosting: true,
        isAnonymous: true,
        storyType: 'text',
        submissionMethod: 'WEB_FORM',
        originalLanguage: 'en',
        affectedDomain: story.affectedDomain,
        aiLinkedAlgorithmIds: [algorithm.id],
        moderationStatus: 'APPROVED',
        moderatorId: reviewer.id,
        moderationNotes: 'Synthetic model-evaluation fixture. Reviewed by Xiangyu Li.',
        submittedAt,
      },
      update: {
        title: story.title,
        summary: story.summary,
        narrativeText: story.narrativeText,
        affectedDomain: story.affectedDomain,
        aiLinkedAlgorithmIds: [algorithm.id],
        moderationStatus: 'APPROVED',
        moderatorId: reviewer.id,
        moderationNotes: 'Synthetic model-evaluation fixture. Reviewed by Xiangyu Li.',
        referralSource: 'Synthetic model-evaluation fixture',
        publicPosting: true,
        clusterId: null,
        topicId: null,
        umapX: null,
        umapY: null,
        isOutlier: false,
      },
      select: { id: true, sourceId: true, title: true },
    });
    await prisma.testimonyAlgorithmLink.upsert({
      where: { testimonyId_algorithmId: { testimonyId: testimony.id, algorithmId: algorithm.id } },
      create: { testimonyId: testimony.id, algorithmId: algorithm.id, linkType: 'FACILITATOR_TAGGED', confidence: 1 },
      update: { linkType: 'FACILITATOR_TAGGED', confidence: 1 },
    });
    results.push({ ...testimony, algorithm: algorithm.name });
  }

  const resultBySourceId = new Map(results.map((row) => [row.sourceId, row]));
  const taskInput = stories.map((story) => ({
    id: resultBySourceId.get(`synthetic-briefings-v1-${story.key}`).id,
    title: story.title,
    narrativeText: story.narrativeText,
  }));
  const reviewRecords = stories.map((story) => {
    const [expectedImpact, expectedThemes] = reviewLabels[story.key];
    const expectedTopicGroup = ['data-correction', 'routing-and-categorization', 'accountability-and-delay', 'human-review'][Math.floor(stories.indexOf(story) / 4)];
    return {
      id: resultBySourceId.get(`synthetic-briefings-v1-${story.key}`).id,
      title: story.title,
      narrativeText: story.narrativeText,
      expectedImpact,
      expectedThemes,
      expectedTopicGroup,
      reviewedBy: 'Xiangyu Li',
      reviewNotes: 'Synthetic evaluation fixture reviewed against the full narrative.',
    };
  });
  fs.mkdirSync('task-briefings-results', { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ records: taskInput }, null, 2)}\n`);
  fs.writeFileSync(reviewPath, `${JSON.stringify({
    name: 'Briefings synthetic evaluation review',
    curatedBy: 'Xiangyu Li',
    approvedForRelease: false,
    reviewMethod: 'Full-narrative review of explicitly synthetic evaluation fixtures.',
    records: reviewRecords,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ mode: 'apply', reviewer, records: results.length, taskInput: outputPath, review: reviewPath, results }, null, 2));
}

main().finally(async () => prisma.$disconnect());
