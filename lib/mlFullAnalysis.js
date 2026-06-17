const HF_BASE_URL = 'https://api-inference.huggingface.co/models';
const TASK2_MODEL = 'MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33';
const TASK3_MODEL = 'facebook/bart-large-mnli';
const TASK4_TOOL = 'spaCy';
const TASK5_TOOL = 'KeyBERT';

const roleTerms = [
  'caseworker',
  'worker',
  'cps worker',
  'inspector',
  'dispatcher',
  'benefits worker',
  'transit worker',
  'career center worker',
  'assistance office worker',
  'front desk worker',
  'agency staff member',
  'city staff member',
  'school staff member',
  'public safety worker',
  'workforce staff member',
  'screeners',
  'supervisor',
  'supervisors',
  'tenant',
  'resident',
  'student',
  'parent',
  'applicant',
  'rider',
  'counselor',
  'teacher',
  'interpreter',
  'agency staff',
  'community member',
  'police officer',
];

const pittsburghLocations = [
  'Allegheny County',
  'Pittsburgh',
  'Downtown Pittsburgh',
  'Downtown',
  'East Liberty',
  'Homewood',
  'Oakland',
  'Squirrel Hill',
  'Hill District',
  'North Side',
  'South Side',
  'Bloomfield',
  'Garfield',
  'Larimer',
  'Lawrenceville',
  'Hazelwood',
  'Carrick',
  'Beechview',
  'Brookline',
  'Mount Washington',
  'Shadyside',
  'Manchester',
  'Strip District',
  'Forbes Avenue',
  'East Busway',
  'McKeesport',
  'Wilkinsburg',
  'Carrick',
  'Beechview',
];

const agencyPhrases = [
  'Pittsburgh Housing Authority',
  'Housing Authority of the City of Pittsburgh',
  'Allegheny County Department of Human Services',
  'Allegheny County benefits office',
  'Allegheny County DHS',
  'Pittsburgh Public Schools',
  'Port Authority',
  'Pittsburgh Regional Transit',
  'City of Pittsburgh',
  'Pittsburgh Department of Mobility and Infrastructure',
  'Pennsylvania Department of Labor and Industry',
  'Department of Human Services',
  'Department of Mobility and Infrastructure',
  'City of Pittsburgh Department of Permits, Licenses, and Inspections',
  'Allegheny County Emergency Services',
  'Pennsylvania Department of Labor and Industry',
  'PA CareerLink Pittsburgh',
  'Carnegie Library Branches',
  'City of Pittsburgh resident services office',
  'City of Pittsburgh community services office',
  'Allegheny County assistance office',
  'County Benefits Office',
  'Labor Standards Office',
  'Public Safety Bureau',
  'Housing Authority',
  'benefits office',
];

const knownSystemPhrases = [
  'Allegheny Family Screening Tool',
  'housing allocation algorithm',
  'housing prioritization system',
  'automated eligibility system',
  'benefits eligibility verification engine',
  'fraud detection system',
  'student support risk flag system',
  'student award eligibility portal',
  'traffic management camera system',
  'transit safety routing system',
  'transit safety incident classifier',
  'workforce job matching system',
  'wage compliance risk model',
  'language access routing system',
  'emergency dispatch triage tool',
  'emergency dispatch triage assistant',
  'energy assistance forecasting tool',
  'community services intake system',
  'public safety routing system',
  'automated housing inspection system',
  'public housing inspection scheduler',
  'library resource recommendation tool',
];

const systemPhrasePatterns = [
  /\b(?:automated\s+)?[a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,5}\s+(?:system|tool|engine|model|algorithm|portal|assistant)\b/gi,
  /\b(?:low|high|higher|lower)?\s*(?:risk|priority|eligibility|inspection|safety)\s+score\b/gi,
  /\bhigh-risk label\b/gi,
  /\blow priority queue\b/gi,
  /\bautomated review\b/gi,
  /\bwaiting list\b/gi,
];

const weakKeywordPairs = new Set([
  'child got',
  'could not',
  'kept my',
  'got sick',
  'told me',
  'my family',
  'she could',
  'not change',
]);

const weakKeywords = new Set([
  'agency',
  'rest',
  'form',
  'person',
  'people',
  'case',
  'model',
  'tool',
  'system',
  'industry',
  'downtown',
  'february',
  'march',
  'april',
  'may',
  'june',
  'weeks',
  'worker',
  'record',
  'score',
  'priority',
  'report',
  'computer',
  'decision',
  'decisions',
  'category',
]);

const positiveCues = [
  /\bworked\b/i,
  /\bconnected me\b/i,
  /\brecognized\b[^\n.]{0,120}\bneeded\b/i,
  /\bfound the document\b/i,
  /\breopened the case\b/i,
  /\bsame afternoon\b/i,
  /\bpaused the shutoff\b/i,
  /\bpaused the shutoff request\b/i,
  /\bapproval came\b/i,
  /\btold me exactly\b/i,
  /\bhelped someone notice\b/i,
  /\brouted\b[^\n.]{0,80}\bright\b/i,
  /\brouted\b[^\n.]{0,80}\bquickly\b/i,
  /\bsent me to the right\b/i,
  /\bright interpreter\b/i,
  /\bfirst try\b/i,
  /\bquickly\b/i,
  /\barrived faster\b/i,
  /\bhelped me register\b/i,
  /\bpointed me to\b/i,
  /\bmoved forward\b/i,
  /\bpriority changed\b/i,
  /\binspection date appeared\b/i,
  /\bthe fix helped\b/i,
  /\bcould actually help\b/i,
  /\bmoved me to an interpreter\b/i,
  /\binterpreter stayed on the line\b/i,
  /\bstayed on the line\b/i,
  /\bdid not have to repeat\b/i,
  /\brespected my time\b/i,
  /\brespected\b[^\n.]{0,120}\bprivacy\b/i,
  /\bconfirmed\b/i,
  /\bapproved\b/i,
  /\bapproval notice\b/i,
  /\bfaster\b/i,
  /\bfaster than\b/i,
  /\bthe same day\b/i,
  /\bsame week\b/i,
  /\bmatched\b[^\n.]{0,120}\bcorrectly\b/i,
  /\bfit my\b/i,
  /\bgot an interview\b/i,
];

const negativeCues = [
  /\bwrong\b/i,
  /\bnot explain\b/i,
  /\bcould not explain\b/i,
  /\bcould not tell\b/i,
  /\bnobody could tell\b/i,
  /\bcould not change\b/i,
  /\bcould not adjust\b/i,
  /\bcould not see\b/i,
  /\bdid not change\b/i,
  /\bwrong queue\b/i,
  /\balready decided\b/i,
  /\bbefore anyone read\b/i,
  /\btreated\b[^\n.]{0,80}\bas neglect\b/i,
  /\bold profile mattered\b/i,
  /\bfirst notice made\b/i,
  /\bnot something\b[^\n.]{0,120}\breview\b/i,
  /\brecords did not merge\b/i,
  /\bstatus changed\b/i,
  /\bincomplete\b/i,
  /\bhad to come back\b/i,
  /\bmissed the deadline\b/i,
  /\bdid not carry over\b/i,
  /\bnot carry over\b/i,
  /\bnotice\b[^\n.]{0,120}\bonly in english\b/i,
  /\blimited data\b/i,
  /\bscore looked backward\b/i,
  /\btreated badly\b/i,
  /\bclosed door\b/i,
  /\bnot easy to document\b/i,
  /\bprove it\b/i,
  /\bnot part of the design\b/i,
  /\brecord only shows\b/i,
  /\bmay not see\b/i,
  /\bkeep missing\b/i,
  /\bdoes not trust\b/i,
  /\bno way to correct\b/i,
  /\bdeleting my profile\b/i,
  /\bseparate form\b[^\n.]{0,120}\bapproved\b/i,
  /\bnot allowed\b/i,
  /\bno way\b/i,
  /\bdenied\b/i,
  /\b(benefits|case|account|application|payment)\b[^\n.]{0,80}\bpaused\b/i,
  /\bpaused over\b/i,
  /\bflagged\b/i,
  /\bhigh risk\b/i,
  /\blow priority\b/i,
  /\bwaited\b/i,
  /\bweeks\b/i,
  /\bseveral days\b/i,
  /\brouted\b[^\n.]{0,80}\b(maintenance|wrong|different)\b/i,
  /\bnobody contacted\b/i,
  /\bcost\b[^\n.]{0,120}\b(days|weeks|months)\b/i,
  /\btreated me like\b/i,
  /\bsuspicion\b/i,
];

const issuePhrases = [
  'mold',
  'broken heat',
  'unsafe housing',
  'food assistance',
  'benefits application',
  'outdated income record',
  'extra review',
  'safety report',
  'complaint categories',
  'location history',
  'zip code',
  'missed assignments',
  'grades improved',
  'appeal',
  'algorithm involved',
];

const impactLabels = {
  NEGATIVE: 'The story says an automated system harmed, disadvantaged, delayed, denied, wrongly flagged, or unfairly treated the person.',
  POSITIVE: 'The story says an automated system worked well, helped the person, improved access, or led to a good outcome.',
  MIXED: 'The story says an automated system had both helpful and harmful effects.',
  UNCLEAR: 'The story does not make the impact clear enough to determine whether it was positive or negative.',
};

const themeLabels = {
  opacity: 'Person did not understand how or why a decision was made.',
  positive_experience: 'System worked well or led to a good outcome.',
  lack_of_recourse: 'No way to challenge or appeal the automated decision.',
  process_confusion: 'Person was confused about the overall process.',
  arbitrary_outcome: 'Decision seemed random or inconsistent.',
  delayed_outcome: 'Process took unreasonably long.',
  discriminatory_impact: 'Suspected racial, economic, or demographic bias.',
  lack_of_notification: 'Person was not told that an algorithm was involved.',
  data_accuracy: 'System used incorrect or outdated information.',
  loss_of_dignity: 'Person felt dehumanized by the process.',
};

const themeEvidence = {
  opacity: [
    /\bno one explained\b/i,
    /\bcould not explain\b/i,
    /\bcould not tell\b/i,
    /\bnobody could tell\b/i,
    /\bwhat information counted\b/i,
    /\bwhat triggered\b/i,
    /\bwhat changed\b/i,
    /\bwhat information was used\b/i,
    /\bwho checked it\b/i,
    /\bhow to correct it\b/i,
    /\bwhat image or rule\b/i,
    /\bwhich answer mattered\b/i,
    /\bplain language\b/i,
    /\bmatching process\b/i,
    /\blanguage request did not carry over\b/i,
    /\blanguage that controls\b/i,
    /\bnot part of the design\b/i,
    /\bdoes not know\b/i,
    /\bnot told\b[^\n.]{0,120}\bhow\b/i,
    /\bcould not see\b[^\n.]{0,120}\b(score|record|rule|reason)\b/i,
    /\bdo not know\b[^\n.]{0,120}\bhow\b/i,
    /\bdon't know\b[^\n.]{0,120}\bhow\b/i,
    /\bunclear\b[^\n.]{0,120}\bwhy\b/i,
    /\bhow\b[^\n.]{0,120}\b(calculated|decided|made|works)\b/i,
  ],
  positive_experience: [
    /\bconnected me\b/i,
    /\brecognized\b[^\n.]{0,120}\bneeded\b/i,
    /\bfound the document\b/i,
    /\breopened the case\b/i,
    /\bsame afternoon\b/i,
    /\bpaused the shutoff\b/i,
    /\bpaused the shutoff request\b/i,
    /\bapproval came\b/i,
    /\btold me exactly\b/i,
    /\bhelped someone notice\b/i,
    /\brouted\b[^\n.]{0,80}\bright\b/i,
    /\brouted\b[^\n.]{0,80}\bquickly\b/i,
    /\bsent me to the right\b/i,
    /\bright interpreter\b/i,
    /\bfirst try\b/i,
    /\bquickly\b/i,
    /\barrived faster\b/i,
    /\bgot an interview\b/i,
    /\bhelped me register\b/i,
    /\bpointed me to\b/i,
    /\bmoved forward\b/i,
    /\bpriority changed\b/i,
    /\binspection date appeared\b/i,
    /\bthe fix helped\b/i,
    /\bcould actually help\b/i,
    /\bmoved me to an interpreter\b/i,
    /\binterpreter stayed on the line\b/i,
    /\bstayed on the line\b/i,
    /\bdid not have to repeat\b/i,
    /\brespected my time\b/i,
    /\brespected\b[^\n.]{0,120}\bprivacy\b/i,
    /\bapproval notice\b/i,
    /\bthe same day\b/i,
    /\bsame week\b/i,
    /\bmatched\b[^\n.]{0,120}\bcorrectly\b/i,
    /\bfinished\b/i,
    /\bwas able to\b/i,
    /\bmuch better\b/i,
    /\bhelped at first\b/i,
    /\bworked well\b/i,
    /\bfaster than before\b/i,
  ],
  lack_of_recourse: [
    /\bcould not change\b/i,
    /\bcould not adjust\b/i,
    /\bcould not adjust\b[^\n.]{0,120}\bmedical equipment\b/i,
    /\bcould not see\b[^\n.]{0,120}\b(score|record|rule|reason)\b/i,
    /\bnot something\b[^\n.]{0,120}\breview\b/i,
    /\bclosed door\b/i,
    /\bhad to come back\b/i,
    /\bnot easy to document\b/i,
    /\branking did not change\b/i,
    /\balready saved\b/i,
    /\bprove it\b/i,
    /\bpaid because the late fee\b/i,
    /\blate fee was coming\b/i,
    /\bpaid before the late fee\b/i,
    /\bappeal portal\b[^\n.]{0,120}\bstill marked\b/i,
    /\bno way to correct\b/i,
    /\bdeleting my profile\b/i,
    /\bseparate form\b[^\n.]{0,120}\bapproved\b/i,
    /\bno way to\b[^\n.]{0,120}\b(appeal|challenge|change)\b/i,
    /\bcould not appeal\b/i,
    /\bdenied\b[^\n.]{0,120}\bappeal\b/i,
    /\bwould not review\b/i,
  ],
  process_confusion: [
    /\bconfused\b/i,
    /\bstart over\b/i,
    /\bcould not tell\b/i,
    /\bnobody could tell\b/i,
    /\bwhat information counted\b/i,
    /\bwhat triggered\b/i,
    /\bwhat changed\b/i,
    /\bwhat information was used\b/i,
    /\bwho checked it\b/i,
    /\bhow to correct it\b/i,
    /\bwhat image or rule\b/i,
    /\bwhich answer mattered\b/i,
    /\bweighted my old\b/i,
    /\btwo profiles\b/i,
    /\bclicking between two versions\b/i,
    /\bstatus changed\b/i,
    /\bfirst notice\b/i,
    /\bdid not understand\b/i,
    /\bdidn't understand\b/i,
    /\bdo not know whether\b/i,
    /\bdon't know whether\b/i,
    /\bnot sure\b/i,
    /\bunclear\b[^\n.]{0,120}\b(process|what|why)\b/i,
  ],
  arbitrary_outcome: [
    /\bkept\b[^\n.]{0,120}\b(low priority|high-risk|label|score)\b/i,
    /\bkept ranking\b/i,
    /\bwrong queue\b/i,
    /\bsent the report to maintenance\b/i,
    /\bstayed\b[^\n.]{0,120}\b(record|label|priority)\b/i,
    /\bflag stayed\b/i,
    /\bflag\b[^\n.]{0,120}\bdid not seem to update\b/i,
    /\bstatus kept changing\b/i,
    /\bstatus changed\b/i,
    /\bpriority list\b/i,
    /\blow priority\b/i,
    /\brouted\b[^\n.]{0,80}\b(maintenance|wrong|routine)\b/i,
    /\bwrong\b[^\n.]{0,80}\b(category|station|office|team)\b/i,
    /\bscore\b[^\n.]{0,120}\b(from|came from|decided)\b/i,
    /\bscore treated\b/i,
    /\bstill treated\b/i,
    /\bchanged only after\b/i,
    /\bold label follows\b/i,
    /\brandom\b/i,
    /\binconsistent\b/i,
  ],
  delayed_outcome: [
    /\bwaited\b/i,
    /\bcost\b[^\n.]{0,120}\b(days|weeks|months)\b/i,
    /\bseveral days\b/i,
    /\btwo weeks\b/i,
    /\bthree weeks\b/i,
    /\btwelve days\b/i,
    /\bnine days\b/i,
    /\bfive days\b/i,
    /\bmissed the deadline\b/i,
    /\bdeadline\b/i,
    /\bweeks\b/i,
    /\bmonths\b/i,
    /\bdelay\b/i,
    /\btook too long\b/i,
  ],
  discriminatory_impact: [
    /\bracial\b/i,
    /\brace\b/i,
    /\blow-income\b/i,
    /\bzip code\b/i,
    /\bneighborhood\b/i,
    /\bdemographic\b/i,
    /\bdisability\b/i,
    /\bbiased\b/i,
    /\bbias\b/i,
  ],
  lack_of_notification: [
    /\bwas not told\b/i,
    /\bnever told\b/i,
    /\bno notice\b/i,
    /\bnot notified\b/i,
    /\bonly learned later\b/i,
    /\bnotice\b[^\n.]{0,120}\bonly in english\b/i,
    /\blanguage request did not carry over\b/i,
    /\bdid not carry over to the notice\b/i,
  ],
  data_accuracy: [
    /\bwrong\b/i,
    /\bmismatch\b/i,
    /\bnot merge\b/i,
    /\brecords did not merge\b/i,
    /\btwo profiles\b/i,
    /\btwo versions\b/i,
    /\btwo addresses\b/i,
    /\btwo households\b/i,
    /\blimited data\b/i,
    /\bstable picture\b/i,
    /\bscore looked backward\b/i,
    /\brecord only shows\b/i,
    /\bmay not see\b/i,
    /\bkeep missing\b/i,
    /\brecalibrated\b/i,
    /\bfollowing the temporary signs\b/i,
    /\bold employer name\b/i,
    /\bold profile\b/i,
    /\breliable transportation\b/i,
    /\bold beechview address\b/i,
    /\bcurrent address\b/i,
    /\bshelter intake form\b/i,
    /\btrust pictures\b/i,
    /\bshort description\b/i,
    /\bpediatrician fax\b/i,
    /\bdoctor's note\b/i,
    /\bmissed appointment\b/i,
    /\brescheduled\b/i,
    /\bonly saw missed days\b/i,
    /\bweighted my old\b/i,
    /\bcurrent availability\b/i,
    /\bdid not count\b[^\n.]{0,120}\bmedical equipment\b/i,
    /\bmedical equipment\b/i,
    /\bnot carry over\b/i,
    /\bunit count\b/i,
    /\bmisrouted\b/i,
    /\brouted\b[^\n.]{0,80}\b(maintenance|wrong)\b/i,
    /\boutdated\b/i,
    /\bincorrect\b/i,
    /\bold record\b/i,
    /\bold address\b/i,
    /\bpublic benefits records\b/i,
    /\bgrades improved\b/i,
    /\bstayed on my record\b/i,
  ],
  loss_of_dignity: [
    /\bbeing judged\b/i,
    /\bembarrassing\b/i,
    /\blunch line\b/i,
    /\bwhat kind of parent\b/i,
    /\balready decided\b/i,
    /\bdid not count\b/i,
    /\bhiding something\b/i,
    /\btreated badly\b/i,
    /\btreated like\b[^\n.]{0,120}\bthreat\b/i,
    /\breads the situation like risk\b/i,
    /\bdoes not count\b/i,
    /\bfamilies feel that\b/i,
    /\bwork families are already doing\b/i,
    /\bfamilies know\b/i,
    /\bsplit my son from me\b/i,
    /\btreated me like\b/i,
    /\bhumiliated\b/i,
    /\bdehumanized\b/i,
    /\bscolded\b/i,
    /\bstrip\s+(?:my|me|kid|child|children|someone)\b/i,
    /\bnaked\b/i,
  ],
};

export async function analyzeNarrativeTextWithModels(narrativeText) {
  const text = String(narrativeText || '').trim();

  const [task2Result, task3Result, task4Result, task5Result] = await Promise.allSettled([
    classifyImpact(text),
    detectThemes(text),
    extractEntities(text),
    extractKeywords(text),
  ]);

  return {
    inputField: 'narrativeText',
    source: 'model',
    status: [task2Result, task3Result, task4Result, task5Result].every((result) => result.status === 'fulfilled') ? 'COMPLETED' : 'PARTIAL',
    task1: {
      status: 'SKIPPED',
      reason: 'Text input does not need transcription.',
    },
    task2: taskPayload(task2Result, 'impact classification', (value) => value, TASK2_MODEL),
    task3: taskPayload(task3Result, 'theme detection', (value) => ({ aiThemes: value }), TASK3_MODEL),
    task4: taskPayload(task4Result, 'entity extraction', (value) => ({ entities: value }), TASK4_TOOL),
    task5: taskPayload(task5Result, 'keyword extraction', (value) => ({ keywords: value }), TASK5_TOOL),
  };
}

function taskPayload(result, label, mapValue = (value) => value, tool = '') {
  if (result.status === 'fulfilled') {
    return {
      status: 'COMPLETED',
      tool,
      ...mapValue(result.value),
    };
  }
  return {
    status: 'SKIPPED',
    tool,
    error: cleanError(result.reason, label),
  };
}

function cleanError(error, label) {
  const message = error?.message || String(error || `${label} failed.`);
  if (message.includes('fetch failed')) {
    return `${label} model request failed. Check HUGGINGFACE_API_TOKEN and endpoint access.`;
  }
  if (message.includes('aborted')) {
    return `${label} model request timed out.`;
  }
  return message;
}

async function classifyImpact(text) {
  const output = await zeroShot(TASK2_MODEL, process.env.ML_DEBERTA_ENDPOINT, text, Object.values(impactLabels), 'This public service story has this impact: {}', true);
  const scores = Object.fromEntries(output.labels.map((label, index) => [label, Number(output.scores[index] || 0)]));
  const evidenceScores = Object.fromEntries(Object.entries(impactLabels).map(([key, label]) => [key, roundScore(scores[label] || 0)]));
  const negative = evidenceScores.NEGATIVE;
  const positive = evidenceScores.POSITIVE;
  const mixed = evidenceScores.MIXED;
  const unclear = evidenceScores.UNCLEAR;
  const positiveCueCount = countPatternMatches(text, positiveCues);
  const negativeCueCount = countPatternMatches(text, negativeCues);
  const positiveResolution = /\b(priority changed|inspection date appeared|the fix helped|corrected|fixed the category|apologized|right unit|same day|same week|same afternoon|reopened the case|paused the shutoff|approval came)\b/i.test(text);

  let classification = 'UNCLEAR';
  let confidence = unclear;
  if (positiveCueCount >= 2 && negativeCueCount === 0) {
    classification = 'POSITIVE';
    confidence = Math.max(positive, 0.9);
  } else if (negativeCueCount >= 2 && positiveCueCount === 0) {
    classification = 'NEGATIVE';
    confidence = Math.max(negative, 0.9);
  } else if (positiveResolution && negativeCueCount >= 2) {
    classification = 'MIXED';
    confidence = Math.max(mixed, 0.88);
  } else if (positiveCueCount >= 1 && negativeCueCount === 0 && positive >= 0.85) {
    classification = 'POSITIVE';
    confidence = Math.max(positive, 0.86);
  } else if (negativeCueCount >= 1 && positiveCueCount === 0 && negative >= 0.85) {
    classification = 'NEGATIVE';
    confidence = Math.max(negative, 0.86);
  } else if (negativeCueCount >= 2 && positiveCueCount <= 1) {
    classification = 'NEGATIVE';
    confidence = Math.max(negative, 0.88);
  } else if (positiveCueCount >= 2 && negativeCueCount <= 1 && positive >= 0.75) {
    classification = 'POSITIVE';
    confidence = Math.max(positive, 0.88);
  } else if (positiveCueCount >= 2 && negativeCueCount >= 2) {
    classification = 'MIXED';
    confidence = Math.max(mixed, Math.min(positive, negative), 0.85);
  } else if (unclear >= 0.9 && unclear >= Math.max(negative, positive, mixed)) {
    classification = 'UNCLEAR';
    confidence = unclear;
  } else if (positive >= 0.65 && negative >= 0.65) {
    classification = 'MIXED';
    confidence = Math.max(mixed, Math.min(positive, negative));
  } else if (unclear >= 0.65 && Math.max(negative, positive) < 0.5) {
    classification = 'UNCLEAR';
    confidence = unclear;
  } else if (negative >= positive && negative >= unclear) {
    classification = 'NEGATIVE';
    confidence = negative;
  } else if (positive >= negative && positive >= unclear) {
    classification = 'POSITIVE';
    confidence = positive;
  }

  return {
    aiImpactClassification: classification,
    aiConfidenceScore: roundScore(confidence),
    humanReviewRequired: confidence < 0.85,
    model: TASK2_MODEL,
    evidenceScores,
  };
}

async function detectThemes(text) {
  const descriptions = Object.values(themeLabels);
  const output = await zeroShot(TASK3_MODEL, process.env.ML_BART_ENDPOINT, text, descriptions, 'This public service story shows this theme: {}', true);
  const fallbackEntries = [];
  const entries = output.labels.map((label, index) => {
    const theme = Object.entries(themeLabels).find(([, description]) => description === label)?.[0];
    if (!theme) return null;
    const matchedEvidence = findThemeEvidence(text, theme);
    fallbackEntries.push({
      theme,
      confidence: roundScore(output.scores[index] || 0),
      matchedEvidence,
      model: TASK3_MODEL,
    });
    const score = Number(output.scores[index] || 0);
    if (!matchedEvidence.length || (score < 0.5 && matchedEvidence.length < 2)) return null;
    return {
      theme,
      confidence: roundScore(Math.max(score, matchedEvidence.length >= 2 ? 0.65 : score)),
      matchedEvidence,
      model: TASK3_MODEL,
    };
  }).filter(Boolean);

  const ranked = entries.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
  if (ranked.length) return ranked;
  return [];
}

function findThemeEvidence(text, theme) {
  const patterns = themeEvidence[theme] || [];
  return uniqueValues(patterns.map((pattern) => text.match(pattern)?.[0]).filter(Boolean)).slice(0, 3);
}

function countPatternMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

async function extractEntities(text) {
  const endpoint = process.env.ML_SPACY_ENDPOINT;
  if (!endpoint) {
    throw new Error(`${TASK4_TOOL} endpoint is not configured. Set ML_SPACY_ENDPOINT to a Python service that runs spaCy and returns agencies, locations, systems, dates, and people_roles.`);
  }
  const output = await jsonEndpointRequest(endpoint, { text });
  return normalizeEntities(output.entities || output, text);
}

async function extractKeywords(text) {
  const endpoint = process.env.ML_KEYBERT_ENDPOINT;
  if (!endpoint) {
    throw new Error(`${TASK5_TOOL} endpoint is not configured. Set ML_KEYBERT_ENDPOINT to a Python service that runs KeyBERT with top_n=10 and MMR diversity.`);
  }
  const output = await jsonEndpointRequest(endpoint, { text, top_n: 10, use_mmr: true });
  return normalizeKeywords(output.keywords || output, text);
}

async function zeroShot(model, endpoint, text, candidateLabels, hypothesisTemplate, multiLabel = true) {
  const payload = {
    text,
    inputs: text,
    candidate_labels: candidateLabels,
    hypothesis_template: hypothesisTemplate,
    multi_label: multiLabel,
    parameters: {
      candidate_labels: candidateLabels,
      hypothesis_template: hypothesisTemplate,
      multi_label: multiLabel,
    },
    options: { wait_for_model: true },
  };
  const output = endpoint
    ? await jsonEndpointRequest(endpoint, payload)
    : await hfRequest(model, payload);
  if (!output || !Array.isArray(output.labels) || !Array.isArray(output.scores)) {
    throw new Error(`${model} returned an unexpected response.`);
  }
  return output;
}

async function hfRequest(model, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.HUGGINGFACE_API_TOKEN) headers.authorization = `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`;
    const response = await fetch(`${HF_BASE_URL}/${model}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      const message = typeof data === 'object' && data?.error ? data.error : text;
      throw new Error(`${model} failed: ${message || response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function jsonEndpointRequest(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  try {
    const headers = { 'content-type': 'application/json' };
    if (process.env.ML_WORKER_TOKEN) headers.authorization = `Bearer ${process.env.ML_WORKER_TOKEN}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!response.ok) {
      const message = typeof data === 'object' && data?.error ? data.error : text;
      throw new Error(`${endpoint} failed: ${message || response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEntities(value, sourceText = '') {
  const groups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];
  const source = normalizeForPhraseMatch(sourceText);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return Object.fromEntries(groups.map((group) => [group, []]));
  }
  const normalized = Object.fromEntries(groups.map((group) => {
    const values = uniqueValues(Array.isArray(value[group]) ? value[group] : []);
    const inSourceValues = values.filter((item) => phraseAppearsInSource(item, source));
    if (group === 'people_roles') {
      return [group, inSourceValues.filter((item) => roleTerms.some((role) => item.toLowerCase().includes(role)))];
    }
    return [group, inSourceValues];
  }));
  normalized.agencies = compactEntityList([
    ...normalized.agencies.map(cleanEntity),
    ...findKnownPhrases(sourceText, agencyPhrases),
  ]).filter((agency) => (
    !/\b(?:Algorithm|Tool|System|Engine|Portal|Score|Scheduler|Classifier|Model)\b/i.test(agency)
    && !/^(PDF|Zone\s+\d+|Children'?s?\s+Hospital)$/i.test(agency)
    && !/\bafter\b/i.test(agency)
    && !pittsburghLocations.some((location) => agency.toLowerCase() === location.toLowerCase())
  ));
  const agencyKeys = new Set(normalized.agencies.map((agency) => normalizeForPhraseMatch(agency)));
  normalized.locations = compactEntityList([
    ...normalized.locations.map(cleanEntity),
    ...findKnownPhrases(sourceText, pittsburghLocations),
  ]).filter((location) => {
    const key = normalizeForPhraseMatch(location);
    return !agencyKeys.has(key) && !/\b(?:Office|Department|Authority|Services|Government|CareerLink)\b/i.test(location);
  });
  normalized.systems = compactEntityList([
    ...findKnownPhrases(sourceText, knownSystemPhrases),
    ...normalized.systems.map(cleanEntity),
    ...extractSystemPhrases(sourceText),
  ]);
  normalized.dates = compactEntityList([
    ...extractDatePhrases(sourceText),
    ...normalized.dates.map(cleanEntity),
  ]);
  normalized.people_roles = compactEntityList([
    ...normalized.people_roles.map(cleanEntity),
    ...inferRoles(sourceText, normalized.systems, normalized.agencies),
  ]);
  return normalized;
}

function normalizeKeywords(value, sourceText = '') {
  if (!Array.isArray(value)) return [];
  const source = normalizeForPhraseMatch(sourceText);
  const modelKeywords = value.map((item) => {
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item[0];
    if (item && typeof item === 'object') return item.keyword || item.word || item.phrase || item.text;
    return '';
  });
  return uniqueValues([
    ...extractPriorityKeywords(sourceText),
    ...modelKeywords,
  ])
    .filter((keyword) => isReadableKeyword(keyword, source))
    .slice(0, 10);
}

function isReadableKeyword(keyword, normalizedSource) {
  const normalized = normalizeForPhraseMatch(keyword);
  const words = normalized.split(' ').filter(Boolean);
  if (!words.length || words.length > 4) return false;
  if (weakKeywords.has(normalized)) return false;
  if (weakKeywordPairs.has(normalized)) return false;
  if (words.length === 2 && words.some((word) => ['got', 'get', 'kept', 'told', 'said', 'could', 'would', 'after'].includes(word))) return false;
  if (words.length === 1) return words[0].length > 4;
  return normalizedSource.includes(normalized);
}

function normalizeForPhraseMatch(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractPriorityKeywords(text) {
  return compactEntityList([
    ...findKnownPhrases(text, agencyPhrases),
    ...findKnownPhrases(text, pittsburghLocations),
    ...extractSystemPhrases(text),
    ...findKnownPhrases(text, issuePhrases),
    ...findKnownPhrases(text, roleTerms),
  ]).map((item) => item.toLowerCase());
}

function phraseAppearsInSource(value, normalizedSource) {
  const normalized = normalizeForPhraseMatch(value);
  return Boolean(normalized && normalizedSource.includes(normalized));
}

function cleanEntity(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/i, '')
    .trim();
}

function findKnownPhrases(text, phrases) {
  const found = [];
  for (const phrase of phrases) {
    const match = text.match(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i'));
    if (match) found.push(match[0]);
  }
  return found;
}

function extractSystemPhrases(text) {
  const matches = [];
  for (const pattern of systemPhrasePatterns) {
    for (const match of text.matchAll(pattern)) {
      const phrase = cleanSystemPhrase(match[0]);
      if (phrase) matches.push(phrase);
    }
  }
  return compactSystemList(matches);
}

function cleanSystemPhrase(value) {
  let phrase = cleanEntity(value)
    .replace(/^.*\bits\s+/i, '')
    .replace(/^.*\bthe\s+/i, '')
    .replace(/^.*\bto the\s+/i, '');
  if (/\b(?:think|don't|doesn|didn|wasn|isn|aren)\b/i.test(phrase)) return '';
  if (/\b(?:fight this computer system|can fix a system|you have to)\b/i.test(phrase)) return '';
  if (['this tool', 'the tool', 'computer system', 'system', 'a system', 'tool', 'portal', 'model', 'algorithm'].includes(phrase.toLowerCase())) return '';
  const known = knownSystemPhrases.find((item) => phraseAppearsInSource(phrase, normalizeForPhraseMatch(item)));
  if (known) return known;
  return phrase;
}

function compactSystemList(values) {
  const cleaned = uniqueValues(values.map(cleanEntity)).filter(Boolean);
  const output = [];
  for (const value of cleaned) {
    const key = value.toLowerCase();
    if (['tool', 'portal', 'model', 'system', 'algorithm'].includes(key)) continue;
    if (output.some((existing) => existing.toLowerCase().includes(key) || key.includes(existing.toLowerCase()))) continue;
    output.push(value);
  }
  return output;
}

function extractDatePhrases(text) {
  return [
    ...text.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/gi),
    ...text.matchAll(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi),
    ...text.matchAll(/\b(?:Spring|Summer|Fall|Winter)\s+\d{4}\b/gi),
    ...text.matchAll(/\b\d{4}\b/g),
    ...text.matchAll(/\b(?:last year|weeks|months|one day|today|yesterday|tomorrow)\b/gi),
  ].map((match) => match[0]);
}

function inferRoles(text, systems = [], agencies = []) {
  const lower = [text, ...systems, ...agencies].join(' ').toLowerCase();
  const roles = [];
  if (/\b(child welfare|family screening|cps)\b/.test(lower)) roles.push('cps worker');
  if (/\b(housing|benefits|voucher|rental aid)\b/.test(lower)) roles.push('caseworker');
  if (/\b(school|student)\b/.test(lower)) roles.push('school counselor');
  if (lower.includes('transit')) roles.push('transit worker');
  if (/\b(police|citation)\b/.test(lower)) roles.push('police officer');
  if (/\b(dispatch|emergency dispatch|emergency services)\b/.test(lower)) roles.push('dispatcher');
  if (lower.includes('inspection')) roles.push('inspector');
  if (/\b(careerlink|job matching|employment|workforce)\b/.test(lower)) roles.push('career center worker');
  if (/\b(interpreter|language access)\b/.test(lower)) roles.push('interpreter');
  if (/\b(community services|library)\b/.test(lower)) roles.push('front desk worker');
  if (lower.includes('public safety')) roles.push('public safety worker');
  if (/\b(energy|assistance office|utility)\b/.test(lower)) roles.push('assistance office worker');
  return uniqueValues(roles);
}

function compactEntityList(values) {
  const cleaned = uniqueValues(values.map(cleanEntity)).filter(Boolean);
  return cleaned.filter((value) => {
    const key = value.toLowerCase();
    return !cleaned.some((other) => {
      const otherKey = other.toLowerCase();
      return otherKey !== key && otherKey.endsWith(key) && otherKey.length > key.length + 3;
    });
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function roundScore(value) {
  return Number(Number(value || 0).toFixed(4));
}
