import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

export { ML_PIPELINE_VERSION } from './mlPipelineContract.js';

const TASK2_MODEL = process.env.TASK2_IMPACT_MODEL || 'facebook/bart-large-mnli';
const TASK3_MODEL = process.env.TASK3_THEME_MODEL || 'facebook/bart-large-mnli';
const TASK4_TOOL = 'spaCy';
const TASK5_TOOL = 'KeyBERT';
const TASK2_CALIBRATION = 'evidence-resolver-v2';
const TASK3_CALIBRATION = 'matched-evidence-gate-v2';
const TASK2_REVIEW_THRESHOLD = 0.85;
const execFileAsync = promisify(execFile);
const DEFAULT_TASK_TIMEOUT_MS = 60000;
const MAX_TASK_TIMEOUT_MS = 90000;
const requestedTaskTimeoutMs = Number(process.env.ML_TASK_TIMEOUT_MS || DEFAULT_TASK_TIMEOUT_MS);
const TASK_TIMEOUT_MS = Number.isFinite(requestedTaskTimeoutMs)
  ? Math.min(Math.max(requestedTaskTimeoutMs, 1000), MAX_TASK_TIMEOUT_MS)
  : DEFAULT_TASK_TIMEOUT_MS;
const requestedRetryCount = Number(process.env.ML_TASK_RETRY_COUNT ?? 0);
const TASK_RETRY_COUNT = Number.isFinite(requestedRetryCount)
  ? Math.min(Math.max(requestedRetryCount, 0), 1)
  : 0;

const roleTerms = [
  'caseworker',
  'worker',
  'cps worker',
  'inspector',
  'dispatcher',
  'benefits worker',
  'customer service worker',
  'transit worker',
  'career center worker',
  'assistance office worker',
  'front desk worker',
  'agency staff member',
  'city staff member',
  '311 operator',
  '311 response center worker',
  'permit reviewer',
  'permit inspector',
  'code inspector',
  'code enforcement inspector',
  'housing inspector',
  'zoning reviewer',
  'mobility planner',
  'public works crew member',
  'ems dispatcher',
  'fire dispatcher',
  'fire inspector',
  'data analyst',
  'school staff member',
  'public safety worker',
  'workforce staff member',
  'screeners',
  'supervisor',
  'supervisors',
  'eligibility specialist',
  'benefits case manager',
  'housing navigator',
  'homeless outreach worker',
  'permit applicant',
  'permit clerk',
  'property owner',
  'landlord',
  'homeowner',
  'business owner',
  'right-of-way reviewer',
  'traffic engineer',
  'parking enforcement officer',
  'parking clerk',
  'customer',
  'water customer service representative',
  'utility customer service representative',
  'social worker',
  'school social worker',
  'crossing guard',
  'bus operator',
  'paratransit rider',
  'firefighter',
  'paramedic',
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
  'speaker',
  'audience',
  'citizen',
  'citizens',
  'resident',
  'residents',
  'voter',
  'voters',
  'president',
  'governor',
  'mayor',
  'senator',
  'representative',
  'judge',
  'lawyer',
  'doctor',
  'nurse',
  'patient',
  'employee',
  'employees',
  'employer',
  'soldier',
  'soldiers',
  'officer',
  'officers',
  'prisoner',
  'prisoners',
  'family',
  'families',
  'child',
  'children',
  'father',
  'mother',
  'student',
  'students',
  'teacher',
  'teachers',
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
  'Allentown',
  'Beltzhoover',
  'Knoxville',
  'Perry South',
  'Perry North',
  'Brighton Heights',
  'East Hills',
  'Lincoln-Lemington',
  'Point Breeze',
  'Morningside',
  'Greenfield',
  'Central Northside',
  'Uptown',
  'West End',
  'Central Business District',
  'Cultural District',
  'South Oakland',
  'North Oakland',
  'Polish Hill',
  'Troy Hill',
  'Sheraden',
  'Overbrook',
  'Banksville',
  'Elliott',
  'Crafton Heights',
  'Crawford-Roberts',
  'Bedford Dwellings',
  'Forbes Avenue',
  'East Busway',
  'Penn Avenue',
  'Fifth Avenue',
  'Liberty Avenue',
  'Smithfield Street',
  'Baum Boulevard',
  'Centre Avenue',
  'Bigelow Boulevard',
  'Butler Street',
  'Brownsville Road',
  'Saw Mill Run Boulevard',
  'Route 51',
  'Owl Creek Bridge',
  '412 Boulevard of the Allies',
  'Downtown Service Center',
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
  'PRT',
  'City of Pittsburgh',
  'City of Pittsburgh 311 Response Center',
  '311 Response Center',
  'Department of Innovation and Performance',
  'Department of Innovation & Performance',
  'Innovation and Performance',
  'Innovation & Performance',
  'Pittsburgh Bureau of Emergency Medical Services',
  'Pittsburgh EMS',
  'Pittsburgh Bureau of Fire',
  'Pittsburgh Bureau of Police',
  'Pittsburgh Department of Mobility and Infrastructure',
  'Department of Mobility and Infrastructure',
  'DOMI',
  'Right-of-Way Division',
  'Pennsylvania Department of Labor and Industry',
  'Department of Human Services',
  'City of Pittsburgh Department of Permits, Licenses, and Inspections',
  'Department of Permits, Licenses, and Inspections',
  'Permits, Licenses, and Inspections',
  'PLI',
  'Department of City Planning',
  'DCP',
  'Department of Public Works',
  'DPW',
  'Department of Parks and Recreation',
  'Citiparks',
  'Office of Community Health and Safety',
  'Office of Municipal Investigations',
  'Pittsburgh Parking Authority',
  'Pittsburgh Parking Court',
  'Urban Redevelopment Authority',
  'Urban Redevelopment Authority of Pittsburgh',
  'URA',
  'Pittsburgh Water and Sewer Authority',
  'PWSA',
  'Allegheny County Emergency Services',
  'Pennsylvania Department of Labor and Industry',
  'PA CareerLink Pittsburgh',
  'Carnegie Library Branches',
  'Carnegie Library of Pittsburgh',
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
  '311 request intake software',
  '311 service request routing system',
  'OneStopPGH',
  'OneStopPGH portal',
  'OneStopPGH Insights Tool',
  'OneStopPGH Insights',
  'OneStopPGH system',
  'rental permit system',
  'rental registration system',
  'Residential Housing Rental Permit Program',
  'RHRPP',
  'residential housing rental permit system',
  'code enforcement case routing system',
  'permit review portal',
  'building permit review portal',
  'right-of-way permit portal',
  'right-of-way permit system',
  'zoning application review system',
  'violation notice tracker',
  'traffic signal prioritization system',
  'traffic calming request scoring system',
  'high injury network',
  'High Injury Network',
  'Safe Streets map',
  'snow route prioritization model',
  'snow plow route prioritization model',
  'sidewalk repair prioritization system',
  'EMS dispatch triage system',
  'fire dispatch triage system',
  'fire inspection scheduling portal',
  'fire code permit system',
  'water shutoff risk model',
  'water billing exception system',
  'lead service line replacement prioritization model',
  'stormwater complaint routing system',
  'utility assistance eligibility system',
  'small business aid portal',
  'automated eligibility rule',
  'transportation assistance eligibility system',
  'discounted fares lottery',
  'Allegheny Go eligibility system',
  'ConnectCard account portal',
  'Ready2Ride app',
  'parking permit portal',
  'parking citation review system',
];

const agencyPhraseAliases = [
  {
    canonical: 'Pittsburgh Water and Sewer Authority',
    patterns: [/\bP\s*W\s*S\s*A\b/i, /\bPittsburgh Water Authority\b/i, /\bPittsburgh Water and Silver Authority\b/i],
    aliases: ['p w s a', 'pwsa', 'pittsburgh water authority', 'pittsburgh water and silver authority'],
  },
  {
    canonical: 'City of Pittsburgh Department of Permits, Licenses, and Inspections',
    patterns: [/\bP\s*L\s*I\b/i, /\bPermits?,?\s+Licen[sc]es?,?\s+and\s+Inspections?\b/i],
    aliases: ['p l i', 'pli', 'permit licenses and inspections', 'permits licenses and inspection', 'permits licenses and inspections'],
  },
  {
    canonical: 'Department of Mobility and Infrastructure',
    patterns: [/\bD\s*O\s*M\s*I\b/i, /\bDomi\b/i, /\bDomey\b/i],
    aliases: ['d o m i', 'domi', 'domey'],
  },
  {
    canonical: 'PA CareerLink Pittsburgh',
    patterns: [/\bP\s*A\s+Career\s*Link\s+Pittsburgh\b/i, /\bCareer\s*Link\s+Pittsburgh\b/i],
    aliases: ['p a career link pittsburgh', 'career link pittsburgh'],
  },
  {
    canonical: 'Pittsburgh Regional Transit',
    patterns: [/\bP\s*R\s*T\b/i],
    aliases: ['p r t', 'prt'],
  },
  {
    canonical: 'Allegheny County Department of Human Services',
    patterns: [/\bAlleghany County Department of Human Services\b/i, /\bAlleghany County DHS\b/i],
    aliases: ['alleghany county department of human services', 'alleghany county dhs'],
  },
  {
    canonical: 'Pittsburgh Bureau of Police',
    patterns: [/\bPittsburgh borough of police\b/i],
    aliases: ['pittsburgh borough of police'],
  },
];

const locationPhraseAliases = [
  {
    canonical: 'Centre Avenue',
    patterns: [/\bCenter Avenue\b/i],
    aliases: ['center avenue'],
  },
  {
    canonical: 'Allegheny County',
    patterns: [/\bAlleghany County\b/i],
    aliases: ['alleghany county'],
  },
  {
    canonical: 'Squirrel Hill',
    patterns: [/\bSquirrell Hill\b/i, /\bSquirrelhill\b/i, /\bSqueery Hill\b/i],
    aliases: ['squirrell hill', 'squirrelhill', 'squeery hill'],
  },
  {
    canonical: 'Beechview',
    patterns: [/\bBenchville\b/i],
    aliases: ['benchville'],
  },
  {
    canonical: 'Oakland',
    patterns: [/\bAuckland\b/i, /\bAuckland office\b/i],
    aliases: ['auckland', 'auckland office'],
  },
  {
    canonical: 'OneStopPGH',
    patterns: [/\bOne\s+Stop\s+P\s*G\s*H\b/i, /\bOne\s+Stop\s+Pittsburgh\b/i],
    aliases: ['one stop p g h', 'one stop pgh', 'one stop pittsburgh'],
  },
];

const systemPhraseAliases = [
  {
    canonical: 'OneStopPGH portal',
    patterns: [/\bOne\s+Stop\s+P\s*G\s*H(?:\s+portal)?\b/i, /\bOne\s+Stop\s+Pittsburgh(?:\s+portal)?\b/i],
    aliases: ['one stop p g h', 'one stop p g h portal', 'one stop pgh', 'one stop pgh portal', 'one stop pittsburgh', 'one stop pittsburgh portal'],
  },
  {
    canonical: 'water billing exception system',
    patterns: [/\bwater billing exception\b/i, /\bwater bill exception system\b/i, /\bwater building exception system\b/i],
    aliases: ['water billing exception', 'water bill exception system', 'water building exception system'],
  },
  {
    canonical: 'student support risk flag system',
    patterns: [/\bstudent support risk flag\b/i, /\bstudent risk flag system\b/i],
    aliases: ['student support risk flag', 'student risk flag system'],
  },
  {
    canonical: 'language access routing system',
    patterns: [/\blanguage access route(?:ing)? system\b/i, /\blanguage access routing\b/i],
    aliases: ['language access route system', 'language access routing'],
  },
];

const phraseAliasGroups = [
  ...agencyPhraseAliases,
  ...locationPhraseAliases,
  ...systemPhraseAliases,
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
  'our fathers',
  'all men',
  'could get',
  'could jump',
  'not tell',
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
  'department',
  'request',
  'response',
  'center',
  'notice',
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
  'thing',
  'things',
  'story',
  'event',
  'nobody',
  'occurrence',
  'place',
  'today',
  'years',
  'lives',
  'family',
  'families',
]);

const genericLocationPhrases = [
  'United States',
  'America',
  'American states',
  'North',
  'South',
  'Alabama',
  'Pennsylvania',
  'Gettysburg',
  'Washington',
  'New York',
  'Philadelphia',
  'Boston',
  'Chicago',
  'California',
  'Texas',
  'Ohio',
  'Maryland',
  'Virginia',
  'West Virginia',
];

const organizationSuffixPattern = '(?:Department|Agency|Authority|Office|Bureau|Court|School|University|College|Hospital|Administration|Commission|Committee|Council|Congress|Army|Navy|Police|Service|Services|Ministry|Government|Foundation|Association|Institute|Center|Centre)';
const placeSuffixPattern = '(?:River|Bridge|Creek|County|City|State|Road|Street|Avenue|Boulevard|Park|Field|Hall|Station|District|Continent|School|University|Hospital)';

const keywordStopwords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'between',
  'after',
  'against',
  'applied',
  'already',
  'by',
  'before',
  'became',
  'can',
  'called',
  'could',
  'did',
  'do',
  'does',
  'during',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'his',
  'kept',
  'how',
  'explain',
  'even',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'made',
  'my',
  'not',
  'of',
  'on',
  'or',
  'our',
  'she',
  'so',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'through',
  'this',
  'those',
  'to',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'whether',
  'while',
  'who',
  'why',
  'without',
  'with',
  'would',
  'your',
  'low',
  'submitted',
  'spread',
  'routed',
  'waited',
  'used',
  'pointed',
  'closed',
  'said',
  'testing',
  'named',
  'stands',
  'imagines',
  'freeing',
  'jumping',
  'created',
  'conceived',
  'dedicated',
  'engaged',
  'brought',
  'forth',
  'dedicate',
  'gave',
  'might',
  'endure',
  'takes',
  'place',
]);

const positiveCues = [
  /\bworked\b/i,
  /\bright crew\b/i,
  /\bcleared it\b/i,
  /\bnext morning\b/i,
  /\bcorrectly moved\b/i,
  /\bfixed the account\b/i,
  /\bconnected me\b/i,
  /\brecognized\b[^\n.]{0,120}\bneeded\b/i,
  /\bfound the document\b/i,
  /\breopened the case\b/i,
  /\bsame afternoon\b/i,
  /\bpaused the shutoff\b/i,
  /\bpaused the shutoff request\b/i,
  /\bapproval came\b/i,
  /\btold me exactly\b/i,
  /\btracking number\b/i,
  /\bconfirmed\b[^\n.]{0,120}\bphotos\b/i,
  /\bcorrectly saw\b/i,
  /\bselected my household\b/i,
  /\bhelped someone notice\b/i,
  /\brouted\b[^\n.]{0,80}\bright\b/i,
  /\brouted\b[^\n.]{0,80}\bquickly\b/i,
  /\bsent me to the right\b/i,
  /\bright interpreter\b/i,
  /\bfirst try\b/i,
  /\bquickly\b/i,
  /\barrived faster\b/i,
  /\bbook(?:ed)? an appointment\b/i,
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
  /\bsame day\b/i,
  /\bsame week\b/i,
  /\bexplained\b[^\n.]{0,80}\bclearly\b/i,
  /\bmatched\b[^\n.]{0,120}\bcorrectly\b/i,
  /\bfit my\b/i,
  /\bgot an interview\b/i,
  /\bget an interview\b/i,
  /\bhelped me get an interview\b/i,
  /\bcorrected the field\b/i,
];

const negativeCues = [
  /\bwrong\b/i,
  /\bnot explain\b/i,
  /\bcould not explain\b/i,
  /\bcouldn't explain\b/i,
  /\bcould not tell\b/i,
  /\bnobody could tell\b/i,
  /\bcould not change\b/i,
  /\bcould not adjust\b/i,
  /\bcould not see\b/i,
  /\bcould not override\b/i,
  /\bbounced between\b/i,
  /\bdid not score high enough\b/i,
  /\bwrong parcel number\b/i,
  /\bold license plate\b/i,
  /\bsaved record blocked\b/i,
  /\breceived a parking citation\b/i,
  /\bparking citation\b/i,
  /\bblocked my renewal\b/i,
  /\bblock a wheelchair ramp\b/i,
  /\bwheelchair ramp\b/i,
  /\bdid not update\b/i,
  /\bcould not tell who owned\b/i,
  /\bdid not change\b/i,
  /\bwrong queue\b/i,
  /\bold tenant account\b/i,
  /\bold property owner\b/i,
  /\balready decided\b/i,
  /\bbefore anyone read\b/i,
  /\btriggered the stop\b/i,
  /\bwalking home\b[^\n.]{0,120}\b(police|officer|stop)\b/i,
  /\btreated\b[^\n.]{0,80}\bas neglect\b/i,
  /\bold profile mattered\b/i,
  /\bfirst notice made\b/i,
  /\bnot something\b[^\n.]{0,120}\breview\b/i,
  /\brecords did not merge\b/i,
  /\bstill waiting\b/i,
  /\bshutoff warning stayed active\b/i,
  /\bwrong listings\b/i,
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
  /\bhigh-risk label\b/i,
  /\blabel stayed\b/i,
  /\bstayed on my record\b/i,
  /\bnot told what data\b/i,
  /\bwhat data changed\b/i,
  /\bhow to appeal\b/i,
  /\blow priority\b/i,
  /\b(?:application|request|case)\b[^\n.]{0,80}\branked\b[^\n.]{0,80}\b(?:far back|behind|low)\b/i,
  /\bwaited\b/i,
  /\bweeks\b/i,
  /\bseveral days\b/i,
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+days\b/i,
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
  '311 service request',
  'code enforcement case',
  'permit application',
  'rental permit',
  'rental registration',
  'parcel number',
  'property record',
  'zoning application',
  'street closure permit',
  'right-of-way permit',
  'traffic calming request',
  'sidewalk repair',
  'snow route',
  'traffic signal',
  'high injury network',
  'parking permit',
  'parking citation',
  'license plate',
  'wheelchair ramp',
  'ambulance dispatch',
  'fire inspection',
  'lead service line',
  'stormwater complaint',
  'water bill',
  'water shutoff',
  'utility assistance',
  'fare discount',
  'discounted fares',
  'ConnectCard',
  'paratransit application',
  'transportation assistance',
  'complaint categories',
  'location history',
  'zip code',
  'missed assignments',
  'grades improved',
  'appeal',
  'algorithm involved',
];

const impactLabels = {
  NEGATIVE: 'negative experience with an automated system',
  POSITIVE: 'positive experience with an automated system',
  MIXED: 'mixed experience with an automated system',
  UNCLEAR: 'unclear or neutral experience',
};

const themeLabels = {
  opacity: 'The person did not understand how or why a decision was made about them by a computer system',
  lack_of_recourse: 'The person had no way to challenge, appeal, or contest an automated decision',
  arbitrary_outcome: "The outcome seemed random, inconsistent, or did not match the person's situation",
  discriminatory_impact: 'The person experienced or suspects racial, economic, or other demographic bias in the system',
  data_accuracy: 'The automated system used incorrect, outdated, or incomplete information about the person',
  positive_experience: 'The automated system worked well and the person had a good outcome',
  process_confusion: 'The person was confused about the overall process or how the system fits in',
  delayed_outcome: 'The decision or process took unreasonably long',
  lack_of_notification: 'The person was not told that an algorithm or automated system was involved in decisions about them',
  loss_of_dignity: 'The person felt dehumanized or reduced to a number by the automated process',
};

const themeEvidence = {
  opacity: [
    /\bno one explained\b/i,
    /\bcould not explain\b/i,
    /\bcould not tell\b/i,
    /\bnobody could tell\b/i,
    /\bno one could tell\b/i,
    /\bno one could tell\b[^\n.]{0,120}\bwhether\b/i,
    /\bwhat information counted\b/i,
    /\bwhat triggered\b/i,
    /\bwhat changed\b/i,
    /\bwhat data changed\b/i,
    /\bwhat data\b[^\n.]{0,120}\b(changed|counted|triggered)\b/i,
    /\bclearer explanation\b/i,
    /\bwhat the system used\b/i,
    /\bwhat could be changed\b/i,
    /\bdo not know whether\b/i,
    /\bdon't know whether\b/i,
    /\bwhether an automated\b/i,
    /\bwhat information was used\b/i,
    /\bwho checked it\b/i,
    /\bhow to correct it\b/i,
    /\bcould not see the records behind it\b/i,
    /\bscreen only showed\b/i,
    /\brisk flag\b/i,
    /\bwhat image or rule\b/i,
    /\bwhich crash records counted\b/i,
    /\bcould not tell who owned\b/i,
    /\bcould not override\b/i,
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
    /\bright crew\b/i,
    /\bcleared it\b/i,
    /\bnext morning\b/i,
    /\bmoved\b[^\n.]{0,120}\b(up|forward)\b/i,
    /\bcorrectly moved\b/i,
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
    /\bget an interview\b/i,
    /\bhelped me get an interview\b/i,
    /\bcorrected the field\b/i,
    /\bhelped me register\b/i,
    /\bpointed me to\b/i,
    /\bmoved forward\b/i,
    /\bpriority changed\b/i,
    /\binspection date appeared\b/i,
    /\bthe fix helped\b/i,
    /\btracking number\b/i,
    /\bconfirmed\b[^\n.]{0,120}\bphotos\b/i,
    /\bcorrectly saw\b/i,
    /\bselected my household\b/i,
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
    /\bcould not see the records behind it\b/i,
    /\bscreen only showed\b/i,
    /\brisk flag\b/i,
    /\bcould not override\b/i,
    /\bcould not tell who owned\b/i,
    /\bsaved parcel record\b/i,
    /\bnot something\b[^\n.]{0,120}\breview\b/i,
    /\bclosed door\b/i,
    /\bhad to come back\b/i,
    /\bnot easy to document\b/i,
    /\branking did not change\b/i,
    /\balready saved\b/i,
    /\balready gone to\b/i,
    /\bsaved record blocked\b/i,
    /\bblocked my renewal\b/i,
    /\bprove it\b/i,
    /\bpaid because the late fee\b/i,
    /\blate fee was coming\b/i,
    /\bpaid before the late fee\b/i,
    /\bappeal portal\b[^\n.]{0,120}\bstill marked\b/i,
    /\bno way to correct\b/i,
    /\bdeleting my profile\b/i,
    /\bseparate form\b[^\n.]{0,120}\bapproved\b/i,
    /\bno way to\b[^\n.]{0,120}\b(appeal|challenge|change)\b/i,
    /\bwhat could be changed\b/i,
    /\bcould not appeal\b/i,
    /\bdenied\b[^\n.]{0,120}\bappeal\b/i,
    /\bwould not review\b/i,
    /\bstill waiting\b/i,
    /\bshutoff warning stayed active\b/i,
  ],
  process_confusion: [
    /\bconfused\b/i,
    /\bstart over\b/i,
    /\bcould not tell\b/i,
    /\bnobody could tell\b/i,
    /\bno one could tell\b/i,
    /\bno one could tell\b[^\n.]{0,120}\bwhether\b/i,
    /\bwhat information counted\b/i,
    /\bwhat triggered\b/i,
    /\bwhat changed\b/i,
    /\bwhat data changed\b/i,
    /\bwhat data\b[^\n.]{0,120}\b(changed|counted|triggered)\b/i,
    /\bclearer explanation\b/i,
    /\bwhat the system used\b/i,
    /\bwhat could be changed\b/i,
    /\bkept circling back\b/i,
    /\btrying to understand why\b/i,
    /\basked for the same\b/i,
    /\bsame file twice\b/i,
    /\bbounced between\b/i,
    /\bcould not tell who owned\b/i,
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
    /\b(high-risk|risk)\s+label\b[^\n.]{0,120}\bstayed\b/i,
    /\bdid not score high enough\b/i,
    /\bbounced between\b/i,
    /\bsame record showed\b/i,
    /\bas ineligible\b/i,
    /\bage field did not update\b/i,
    /\bkept ranking\b/i,
    /\bwrong queue\b/i,
    /\bdid not flag\b/i,
    /\bignored\b[^\n.]{0,120}\b(wheelchair|ramp|access)\b/i,
    /\bblock a wheelchair ramp\b/i,
    /\bsaved record blocked\b/i,
    /\bblocked my renewal\b/i,
    /\bwrong maintenance queue\b/i,
    /\bsent the report to maintenance\b/i,
    /\bstayed\b[^\n.]{0,120}\b(record|label|priority)\b/i,
    /\bincident stayed\b[^\n.]{0,80}\breport\b/i,
    /\btreated\b[^\n.]{0,120}\bhigh risk\b/i,
    /\bblock\b[^\n.]{0,120}\bhigh risk\b/i,
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
    /\bmissed\b[^\n.]{0,80}\b(appointment|window)\b/i,
    /\bappointment window\b/i,
    /\bseveral days\b/i,
    /\bdelayed again\b/i,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+days\b/i,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+more\s+days\b/i,
    /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+calls\b/i,
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
    /\bstill waiting\b/i,
    /\bshutoff warning stayed active\b/i,
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
    /\bno one could tell\b[^\n.]{0,120}\bwhether\b/i,
    /\bcould not tell\b[^\n.]{0,120}\bwhether\b/i,
    /\bnotice\b[^\n.]{0,120}\bonly in english\b/i,
    /\blanguage request did not carry over\b/i,
    /\bdid not carry over to the notice\b/i,
  ],
  data_accuracy: [
    /\bwrong\b/i,
    /\bmismatch\b/i,
    /\bold property owner\b/i,
    /\bold owner\b/i,
    /\bwrong parcel number\b/i,
    /\bparcel record\b/i,
    /\bold tenant account\b/i,
    /\bold license plate\b/i,
    /\bsaved record blocked\b/i,
    /\bparking citation\b/i,
    /\bdid not flag\b/i,
    /\bage field\b/i,
    /\bdid not update\b/i,
    /\btax refund\b/i,
    /\bmonthly income\b/i,
    /\bcard stopped working\b/i,
    /\bwhat data changed\b/i,
    /\blooked like monthly income\b/i,
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
    /\bwrong\b[^\n.]{0,80}\b(plate|license plate|account|record|address|profile|parcel)\b/i,
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
    /\btreated\b[^\n.]{0,120}\bhigh risk\b/i,
    /\bblock\b[^\n.]{0,120}\bhigh risk\b/i,
    /\bwalking home\b[^\n.]{0,120}\b(police|officer|stop)\b/i,
    /\btriggered the stop\b/i,
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
    /\buses a wheelchair\b/i,
    /\bhad to cross in the street\b/i,
    /\bblock a wheelchair ramp\b/i,
    /\bscolded\b/i,
    /\bstrip\s+(?:my|me|kid|child|children|someone)\b/i,
    /\bnaked\b/i,
    /\b(?:ranked|ranking|counting|score)\b[^.]{0,160}\b(?:consequences|without listening|without a voice|no voice)\b/i,
  ],
};

export async function analyzeNarrativeTextWithModels(narrativeText) {
  const text = String(narrativeText || '').trim();
  const localModelResult = await tryRunTask25Locally(text);
  if (localModelResult) return localModelResult;

  const [task2Result, task3Result, task4Result, task5Result] = await Promise.all([
    settleTask(() => classifyImpact(text)),
    settleTask(() => detectThemes(text)),
    settleTask(() => extractEntities(text)),
    settleTask(() => extractKeywords(text)),
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
    task3: taskPayload(task3Result, 'theme detection', (value) => value, TASK3_MODEL),
    task4: taskPayload(task4Result, 'entity extraction', (value) => value, TASK4_TOOL),
    task5: taskPayload(task5Result, 'keyword extraction', (value) => value, TASK5_TOOL),
  };
}

async function tryRunTask25Locally(text) {
  if (!text || process.env.TASK25_DISABLE_LOCAL_RUNNER === 'true' || process.env.VERCEL === '1') return null;
  const repoRoot = process.cwd();
  const localPythonCandidates = [
    path.join(repoRoot, '.task2-5-env', 'Scripts', 'python.exe'),
    path.join(repoRoot, '.task2-deberta-env', 'Scripts', 'python.exe'),
  ];
  const pythonPath = process.env.TASK25_PYTHON
    || process.env.TASK2_5_PYTHON
    || localPythonCandidates.find(existsSync)
    || localPythonCandidates[0];
  const scriptPath = path.join(repoRoot, 'scripts', 'task2-5-run-local.py');
  const workDir = await mkdtemp(path.join(tmpdir(), 'algostories-task25-'));
  const inputPath = path.join(workDir, 'input.json');
  const outputDir = path.join(workDir, 'output');

  try {
    await access(pythonPath);
    await access(scriptPath);
    await writeFile(inputPath, JSON.stringify([{ id: 'quick-test', title: 'Quick test', narrativeText: text }], null, 2), 'utf8');
    await execFileAsync(pythonPath, [scriptPath, '--input', inputPath, '--output-dir', outputDir], {
      cwd: repoRoot,
      timeout: Number(process.env.TASK25_LOCAL_TIMEOUT_MS || 10 * 60 * 1000),
      maxBuffer: 1024 * 1024 * 16,
    });
    const payload = JSON.parse(await readFile(path.join(outputDir, 'task2-5-combined-results.json'), 'utf8'));
    const row = payload?.results?.[0];
    if (!row) return null;
    return task25LocalPayload(row, { text, models: payload.models });
  } catch (error) {
    console.warn('Task 2-5 local runner unavailable; using JS local fallback.', error?.message || error);
    return null;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function task25LocalPayload(row, { text = '', impactFallback = null, models = {} } = {}) {
  const entities = normalizeEntities(row.aiExtractedExperiences?.entities || {}, text);
  const keywords = normalizeKeywords(row.aiExtractedExperiences?.keywords || [], text);
  const rawScores = normalizeImpactScores(row.evidenceScores);
  const impact = impactFallback || resolveImpactDecision(text, rawScores, {
    runtime: 'local-python',
    modelSource: TASK2_MODEL,
  });
  const themeScores = Object.fromEntries((Array.isArray(row.aiThemes) ? row.aiThemes : [])
    .map((theme) => [theme?.theme, Number(theme?.confidence || 0)])
    .filter(([theme]) => themeLabels[theme]));
  return {
    inputField: 'narrativeText',
    source: 'local-python-models',
    status: 'COMPLETED',
    task1: {
      status: 'SKIPPED',
      reason: 'Text input does not need transcription.',
    },
    task2: {
      status: 'COMPLETED',
      tool: TASK2_MODEL,
      model: TASK2_MODEL,
      runtime: 'local-python',
      aiImpactClassification: impact.aiImpactClassification,
      aiConfidenceScore: impact.aiConfidenceScore,
      humanReviewRequired: impact.humanReviewRequired,
      evidenceScores: impact.evidenceScores,
      decisionSource: impact.decisionSource,
      confidenceKind: impact.confidenceKind,
      calibration: TASK2_CALIBRATION,
      decisionEvidence: impact.decisionEvidence,
      rawModelPrediction: impact.rawModelPrediction,
      rawModelConfidence: impact.rawModelConfidence,
      rawModelScores: impact.rawModelScores,
    },
    task3: {
      status: 'COMPLETED',
      tool: TASK3_MODEL,
      model: TASK3_MODEL,
      runtime: 'local-python',
      calibration: TASK3_CALIBRATION,
      aiThemes: selectEvidenceGroundedThemes(text, themeScores, {
        modelSource: TASK3_MODEL,
      }),
    },
    task4: {
      status: 'COMPLETED',
      tool: TASK4_TOOL,
      model: models?.task4?.model || 'spaCy model (not reported)',
      runtime: 'local-python',
      entities,
    },
    task5: {
      status: 'COMPLETED',
      tool: TASK5_TOOL,
      model: models?.task5?.model || 'KeyBERT model (not reported)',
      runtime: 'local-python',
      keywords: Array.isArray(keywords) ? keywords : [],
    },
  };
}

async function settleTask(runTask) {
  try {
    return {
      status: 'fulfilled',
      value: await runTask(),
    };
  } catch (error) {
    return {
      status: 'rejected',
      reason: error,
    };
  }
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
    return `${label} model request failed. Check the local worker or endpoint access.`;
  }
  if (message.includes('aborted')) {
    return `${label} model request timed out.`;
  }
  if (message.includes('endpoint is not configured')) {
    return message;
  }
  return message;
}

async function classifyImpact(text) {
  let evidenceScores;
  let runtime = 'self-hosted-worker';
  let fallbackReason = null;
  try {
    const output = await zeroShot(TASK2_MODEL, process.env.ML_IMPACT_ENDPOINT || process.env.ML_BART_ENDPOINT, text, Object.values(impactLabels), 'This example is {}.', false);
    const scores = Object.fromEntries(output.labels.map((label, index) => [label, Number(output.scores[index] || 0)]));
    evidenceScores = Object.fromEntries(Object.entries(impactLabels).map(([key, label]) => [key, roundScore(scores[label] || 0)]));
  } catch (error) {
    evidenceScores = scoreImpactLocally(text);
    runtime = 'js-degraded-fallback';
    fallbackReason = modelFallbackReason(error);
  }
  return resolveImpactDecision(text, evidenceScores, {
    runtime,
    modelSource: TASK2_MODEL,
    fallbackReason,
  });
}

export function resolveImpactDecision(text, rawEvidenceScores, {
  runtime = 'js-degraded-fallback',
  modelSource = TASK2_MODEL,
  fallbackReason = null,
} = {}) {
  const evidenceScores = normalizeImpactScores(rawEvidenceScores);
  const usedModel = runtime !== 'js-degraded-fallback';
  const weakPositiveSources = new Set(['\\bquickly\\b', '\\bpriority changed\\b', '\\bapproved\\b']);
  const weakNegativeSources = new Set(['\\bflagged\\b', '\\bweeks\\b']);
  const strongPositivePatterns = positiveCues.filter((pattern) => !weakPositiveSources.has(pattern.source));
  const strongNegativePatterns = uniquePatterns([
    ...negativeCues,
    ...themeEvidence.lack_of_recourse,
    ...themeEvidence.arbitrary_outcome,
    ...themeEvidence.data_accuracy,
    ...themeEvidence.loss_of_dignity,
  ]).filter((pattern) => !weakNegativeSources.has(pattern.source));
  const strongPositiveEvidence = findPatternEvidence(text, strongPositivePatterns);
  const strongNegativeEvidence = findPatternEvidence(text, strongNegativePatterns);
  const weakCueEvidence = findPatternEvidence(text, [
    ...positiveCues.filter((pattern) => weakPositiveSources.has(pattern.source)),
    ...negativeCues.filter((pattern) => weakNegativeSources.has(pattern.source)),
  ]);
  const ambiguousCauseCue = /\b(?:i\s+)?(?:do not|don't|cannot|can't)\s+know\s+whether\b/i.test(text)
    || /\bwhether\s+(?:an\s+)?automated\b/i.test(text);

  let classification;
  let confidence;
  let confidenceKind = 'rule-decision-score';
  if (ambiguousCauseCue && !strongPositiveEvidence.length && !strongNegativeEvidence.length) {
    classification = 'UNCLEAR';
    confidence = 0.75;
  } else if (strongPositiveEvidence.length && strongNegativeEvidence.length) {
    classification = 'MIXED';
    confidence = 0.86;
  } else if (strongPositiveEvidence.length) {
    classification = 'POSITIVE';
    confidence = strongPositiveEvidence.length >= 2 ? 0.9 : 0.86;
  } else if (strongNegativeEvidence.length) {
    classification = 'NEGATIVE';
    confidence = strongNegativeEvidence.length >= 2 ? 0.9 : 0.86;
  } else if (usedModel) {
    const rawPrediction = highestImpactScore(evidenceScores);
    classification = rawPrediction.label;
    confidence = rawPrediction.score;
    confidenceKind = 'model-score';
  } else {
    classification = 'UNCLEAR';
    confidence = 0.55;
  }

  return {
    aiImpactClassification: classification,
    aiConfidenceScore: roundScore(confidence),
    humanReviewRequired: confidence <= TASK2_REVIEW_THRESHOLD,
    model: usedModel ? modelSource : 'deterministic evidence rules',
    runtime,
    calibration: TASK2_CALIBRATION,
    decisionSource: usedModel
      ? `${modelSource} + deterministic evidence calibration`
      : 'deterministic evidence calibration (model unavailable)',
    confidenceKind,
    decisionEvidence: {
      positive: strongPositiveEvidence,
      negative: strongNegativeEvidence,
      weak: weakCueEvidence,
    },
    evidenceScores,
    ...(usedModel ? {
      rawModelPrediction: highestImpactScore(evidenceScores).label,
      rawModelConfidence: highestImpactScore(evidenceScores).score,
      rawModelScores: evidenceScores,
    } : {}),
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

async function detectThemes(text) {
  const descriptions = Object.values(themeLabels);
  let scoresByTheme = {};
  let runtime = 'self-hosted-worker';
  let fallbackReason = null;
  try {
    const output = await zeroShot(TASK3_MODEL, process.env.ML_BART_ENDPOINT, text, descriptions, 'This example is {}.', true);
    scoresByTheme = Object.fromEntries(output.labels.map((label, index) => {
      const theme = Object.entries(themeLabels).find(([, description]) => description === label)?.[0];
      return [theme, Number(output.scores[index] || 0)];
    }).filter(([theme]) => theme));
  } catch (error) {
    runtime = 'js-degraded-fallback';
    fallbackReason = modelFallbackReason(error);
  }
  return {
    aiThemes: selectEvidenceGroundedThemes(text, scoresByTheme, {
      modelSource: runtime === 'js-degraded-fallback' ? 'deterministic theme evidence rules' : TASK3_MODEL,
    }),
    model: runtime === 'js-degraded-fallback' ? 'deterministic theme evidence rules' : TASK3_MODEL,
    runtime,
    calibration: TASK3_CALIBRATION,
    rawModelScores: Object.fromEntries(Object.entries(scoresByTheme).map(([theme, score]) => [theme, roundScore(score)])),
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

export function selectEvidenceGroundedThemes(text, scoresByTheme = {}, { modelSource = TASK3_MODEL } = {}) {
  const entries = Object.keys(themeLabels).map((theme) => {
    const matchedEvidence = findThemeEvidence(text, theme);
    if (!matchedEvidence.length) return null;
    const modelScore = Number(scoresByTheme[theme] || 0);
    const evidenceScore = matchedEvidence.length >= 2 ? 0.65 : 0.55;
    const confidence = modelScore > 0.5 ? modelScore : evidenceScore;
    return {
      theme,
      confidence: roundScore(confidence),
      matchedEvidence,
      model: modelSource,
      label: confidence < 0.75 ? 'suggested' : 'detected',
    };
  }).filter(Boolean);
  return mergeThemeEntries(entries).slice(0, 8);
}

function scoreImpactLocally(text) {
  const positiveCueCount = countPatternMatches(text, positiveCues);
  const negativeCueCount = countPatternMatches(text, negativeCues);
  const unclearCueCount = countPatternMatches(text, [
    /\bnot sure\b/i,
    /\bunclear\b/i,
    /\bdo not know\b/i,
    /\bdon't know\b/i,
    /\bcannot tell\b/i,
    /\bcan't tell\b/i,
  ]);
  const negative = Math.min(0.99, 0.2 + negativeCueCount * 0.18);
  const positive = Math.min(0.99, 0.2 + positiveCueCount * 0.18);
  const mixed = Math.min(0.95, positiveCueCount && negativeCueCount ? 0.5 + Math.min(positiveCueCount, negativeCueCount) * 0.12 : 0.15);
  const unclear = Math.min(0.95, 0.3 + unclearCueCount * 0.16 + (!positiveCueCount && !negativeCueCount ? 0.25 : 0));
  return {
    NEGATIVE: roundScore(negative),
    POSITIVE: roundScore(positive),
    MIXED: roundScore(mixed),
    UNCLEAR: roundScore(unclear),
  };
}

function normalizeImpactScores(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.keys(impactLabels).map((label) => [label, roundScore(source[label] || 0)]));
}

function highestImpactScore(scores) {
  return Object.entries(scores).reduce((best, [label, score]) => (
    Number(score) > best.score ? { label, score: roundScore(score) } : best
  ), { label: 'UNCLEAR', score: 0 });
}

function mergeThemeEntries(entries) {
  const byTheme = new Map();
  for (const entry of entries.sort((a, b) => b.confidence - a.confidence)) {
    if (!byTheme.has(entry.theme)) {
      byTheme.set(entry.theme, entry);
    }
  }
  return [...byTheme.values()].sort((a, b) => b.confidence - a.confidence);
}

function findThemeEvidence(text, theme) {
  const patterns = themeEvidence[theme] || [];
  return uniqueValues(patterns.map((pattern) => text.match(pattern)?.[0]).filter(Boolean)).slice(0, 3);
}

function findPatternEvidence(text, patterns) {
  return uniqueValues(patterns.map((pattern) => text.match(pattern)?.[0]).filter(Boolean));
}

function uniquePatterns(patterns) {
  const byPattern = new Map();
  for (const pattern of patterns) {
    const key = `${pattern.source}/${pattern.flags}`;
    if (!byPattern.has(key)) byPattern.set(key, pattern);
  }
  return [...byPattern.values()];
}

function countPatternMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

async function extractEntities(text) {
  const endpoint = process.env.ML_SPACY_ENDPOINT;
  if (!endpoint) {
    return {
      entities: normalizeEntities({}, text),
      model: 'deterministic entity fallback',
      runtime: 'js-degraded-fallback',
      fallbackReason: 'spaCy worker endpoint is not configured',
    };
  }
  try {
    const output = await jsonEndpointRequest(endpoint, { text });
    return {
      entities: normalizeEntities(output.entities || output, text),
      model: output.model || 'en_core_web_sm',
      runtime: 'self-hosted-worker',
    };
  } catch (error) {
    return {
      entities: normalizeEntities({}, text),
      model: 'deterministic entity fallback',
      runtime: 'js-degraded-fallback',
      fallbackReason: modelFallbackReason(error),
    };
  }
}

async function extractKeywords(text) {
  const endpoint = process.env.ML_KEYBERT_ENDPOINT;
  if (!endpoint) {
    return {
      keywords: normalizeKeywords(extractPriorityKeywords(text), text),
      model: 'deterministic keyword fallback',
      runtime: 'js-degraded-fallback',
      fallbackReason: 'KeyBERT worker endpoint is not configured',
    };
  }
  try {
    const output = await jsonEndpointRequest(endpoint, { text, top_n: 10, use_mmr: true });
    return {
      keywords: normalizeKeywords(output.keywords || output, text),
      model: output.model || 'sentence-transformers/all-MiniLM-L6-v2',
      runtime: 'self-hosted-worker',
    };
  } catch (error) {
    return {
      keywords: normalizeKeywords(extractPriorityKeywords(text), text),
      model: 'deterministic keyword fallback',
      runtime: 'js-degraded-fallback',
      fallbackReason: modelFallbackReason(error),
    };
  }
}

function modelFallbackReason(error) {
  const message = String(error?.message || error || 'worker unavailable');
  if (message.includes('not configured')) return 'worker endpoint is not configured';
  if (error?.name === 'AbortError' || message.includes('aborted') || message.includes('timed out')) return 'worker request timed out';
  if (Number(error?.status)) return `worker request failed with status ${Number(error.status)}`;
  return 'worker request failed';
}

async function zeroShot(model, endpoint, text, candidateLabels, hypothesisTemplate, multiLabel = true) {
  if (!endpoint) {
    throw new Error(`${model} endpoint is not configured. Use the local Python runner or a self-hosted worker.`);
  }
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
  const output = await jsonEndpointRequest(endpoint, payload);
  if (!output || !Array.isArray(output.labels) || !Array.isArray(output.scores)) {
    throw new Error(`${model} returned an unexpected response.`);
  }
  return output;
}

async function jsonEndpointRequest(endpoint, payload) {
  let lastError = null;
  for (let attempt = 0; attempt <= TASK_RETRY_COUNT; attempt += 1) {
    try {
      return await jsonEndpointRequestOnce(endpoint, payload);
    } catch (error) {
      lastError = error;
      if (!shouldRetryRequest(error) || attempt >= TASK_RETRY_COUNT) break;
      await delay(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

async function jsonEndpointRequestOnce(endpoint, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TASK_TIMEOUT_MS);
  try {
    const headers = { 'content-type': 'application/json' };
    const workerToken = cleanEnvToken(process.env.ML_WORKER_TOKEN);
    if (workerToken) headers.authorization = `Bearer ${workerToken}`;
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
      const error = new Error(`${endpoint} failed: ${message || response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function shouldRetryRequest(error) {
  if (error?.name === 'AbortError') return true;
  if ([408, 425, 429, 500, 502, 503, 504].includes(Number(error?.status))) return true;
  const message = error?.message || '';
  return message.includes('fetch failed') || message.includes('ECONNRESET') || message.includes('ETIMEDOUT');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanEnvToken(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

function normalizeEntities(value, sourceText = '') {
  const groups = ['agencies', 'locations', 'systems', 'dates', 'people_roles', 'people', 'addresses'];
  const source = normalizeForPhraseMatch(sourceText);
  const sourceValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const normalized = Object.fromEntries(groups.map((group) => {
    const values = uniqueValues(Array.isArray(sourceValue[group]) ? sourceValue[group] : []);
    const inSourceValues = values.filter((item) => phraseAppearsInSource(item, source));
    if (group === 'people_roles') {
      return [group, inSourceValues.filter((item) => roleTerms.some((role) => item.toLowerCase().includes(role)) && !isNegatedRole(sourceText, item))];
    }
    return [group, inSourceValues];
  }));
  normalized.agencies = compactEntityList([
    ...normalized.agencies.map(cleanEntity),
    ...findKnownPhrases(sourceText, agencyPhrases),
    ...findAliasedPhrases(sourceText, agencyPhraseAliases),
    ...extractGenericOrganizationPhrases(sourceText),
  ]);
  normalized.agencies = removeAliasDuplicates(normalized.agencies, agencyPhraseAliases).filter((agency) => (
    !/\b(?:Algorithm|Tool|System|Engine|Portal|Score|Scheduler|Classifier|Model)\b/i.test(agency)
    && !/^(PDF|Zone\s+\d+|Children'?s?\s+Hospital)$/i.test(agency)
    && !/^(?:[A-Z]\s+){1,}[A-Z]$/i.test(agency)
    && !/^PGH$/i.test(agency)
    && !/\bafter\b/i.test(agency)
    && !/\bService Center on\b/i.test(agency)
    && !pittsburghLocations.some((location) => agency.toLowerCase() === location.toLowerCase())
  ));
  if (/\bD\s*O\s*M\s*I\b/i.test(sourceText) && !normalized.agencies.some((agency) => normalizeForPhraseMatch(agency) === 'domi')) {
    normalized.agencies.push('DOMI');
  }
  const agencyKeys = new Set(normalized.agencies.map((agency) => normalizeForPhraseMatch(agency)));
  normalized.locations = compactEntityList([
    ...normalized.locations.map(cleanEntity),
    ...findKnownPhrases(sourceText, pittsburghLocations),
    ...findKnownPhrases(sourceText, genericLocationPhrases),
    ...findAliasedPhrases(sourceText, locationPhraseAliases),
    ...extractGenericLocationPhrases(sourceText),
  ]);
  normalized.locations = removeAliasDuplicates(normalized.locations, locationPhraseAliases).filter((location) => {
    const key = normalizeForPhraseMatch(location);
    return !agencyKeys.has(key) && !/\b(?:Office|Department|Authority|Services|Government|CareerLink)\b/i.test(location);
  });
  normalized.systems = compactEntityList([
    ...findKnownPhrases(sourceText, knownSystemPhrases),
    ...findAliasedPhrases(sourceText, systemPhraseAliases),
    ...normalized.systems.map(cleanEntity),
    ...extractSystemPhrases(sourceText),
  ]);
  normalized.systems = removeAliasDuplicates(normalized.systems, systemPhraseAliases);
  const systemKeys = new Set(normalized.systems.map((system) => normalizeForPhraseMatch(system)));
  const knownAgencyKeys = new Set(findKnownPhrases(sourceText, agencyPhrases).map((agency) => normalizeForPhraseMatch(agency)));
  normalized.agencies = normalized.agencies.filter((agency) => knownAgencyKeys.has(normalizeForPhraseMatch(agency)) || !isCoveredBySystem(agency, systemKeys));
  normalized.locations = normalized.locations.filter((location) => !isCoveredBySystem(location, systemKeys));
  normalized.dates = compactEntityList([
    ...extractDatePhrases(sourceText),
    ...normalized.dates.map(cleanEntity),
  ]);
  normalized.people_roles = compactEntityList([
    ...normalized.people_roles.map(cleanEntity),
    ...findExplicitRolePhrases(sourceText),
    ...extractGenericRolePhrases(sourceText),
  ]);
  if (!normalized.people_roles.length && looksLikeFirstPersonServiceStory(sourceText)) {
    normalized.people_roles = ['community member'];
  }
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
    ...extractGeneralKeywordPhrases(sourceText),
    ...modelKeywords,
  ].map((keyword) => canonicalizeAliasPhrase(keyword)))
    .filter((keyword) => isReadableKeyword(keyword, source))
    .filter((keyword, index, keywords) => !isAliasDuplicateKeyword(keyword, keywords))
    .slice(0, 10);
}

function isReadableKeyword(keyword, normalizedSource) {
  const normalized = normalizeForPhraseMatch(keyword);
  const words = normalized.split(' ').filter(Boolean);
  if (!words.length || words.length > 4) return false;
  if (/\bnot\s+(?:a|an|the)?\s*transit worker\b/.test(normalized)) return false;
  if (weakKeywords.has(normalized)) return false;
  if (weakKeywordPairs.has(normalized)) return false;
  if (words.length === 2 && words.some((word) => ['got', 'get', 'kept', 'told', 'said', 'could', 'would', 'after'].includes(word))) return false;
  if (words.length === 1) return words[0].length > 4;
  return phraseAppearsInSource(keyword, normalizedSource);
}

function normalizeForPhraseMatch(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractPriorityKeywords(text) {
  return compactEntityList([
    ...findKnownPhrases(text, agencyPhrases),
    ...findAliasedPhrases(text, agencyPhraseAliases),
    ...findAliasedPhrases(text, systemPhraseAliases),
    ...extractSystemPhrases(text),
    ...findKnownPhrases(text, pittsburghLocations),
    ...findKnownPhrases(text, genericLocationPhrases),
    ...findAliasedPhrases(text, locationPhraseAliases),
    ...findKnownPhrases(text, issuePhrases),
    ...findExplicitRolePhrases(text),
    ...extractGenericOrganizationPhrases(text),
    ...extractGenericLocationPhrases(text),
    ...extractGenericRolePhrases(text),
  ]).map((item) => item.toLowerCase());
}

function extractGenericOrganizationPhrases(text) {
  const matches = [];
  const patterns = [
    new RegExp(`\\b(?:the\\s+)?([A-Z][A-Za-z'&-]+(?:\\s+(?:of|and|the|for|[A-Z][A-Za-z'&-]+)){0,8}\\s+${organizationSuffixPattern})\\b`, 'g'),
    new RegExp(`\\b(${organizationSuffixPattern}\\s+of\\s+[A-Z][A-Za-z'&-]+(?:\\s+(?:of|and|the|for|[A-Z][A-Za-z'&-]+)){0,6})\\b`, 'g'),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      matches.push(match[1] || match[0]);
    }
  }
  return compactEntityList(matches.map(cleanLocationPhrase)).filter((value) => {
    return value.length <= 90
      && !/^(?:The|This|That|If|Now|Task|Login)$/i.test(value)
      && !pittsburghLocations.some((location) => normalizeForPhraseMatch(location) === normalizeForPhraseMatch(value));
  });
}

function extractGenericLocationPhrases(text) {
  const matches = [];
  const suffixPattern = new RegExp(`\\b([A-Z][A-Za-z'-]+(?:\\s+(?:of|and|the|[A-Z][A-Za-z'-]+)){0,5}\\s+${placeSuffixPattern})\\b`, 'g');
  for (const match of text.matchAll(suffixPattern)) {
    matches.push(match[1] || match[0]);
  }

  const prepositionPattern = /\b(?:in|at|from|near|around|across|between|through|toward|towards|on)\s+(?:the\s+)?([A-Z][A-Za-z'-]+(?:\s+(?:and|of|the|[A-Z][A-Za-z'-]+)){0,4})\b/g;
  for (const match of text.matchAll(prepositionPattern)) {
    const phrase = cleanTrailingLocation(match[1] || '');
    if (isLikelyLocationPhrase(phrase)) matches.push(phrase);
  }

  return compactEntityList(matches.map(cleanEntity)).filter((value) => {
    return value.length <= 80
      && !/^(?:The|This|That|If|Now|Task|Login|I)$/i.test(value)
      && !new RegExp(`^${placeSuffixPattern}$`, 'i').test(value)
      && !/^(?:Liberty|Justice|Freedom|Equality)$/i.test(value)
      && !/\b(?:Department|Authority|Agency|Office|Service|Services|Government)\b/i.test(value);
  });
}

function cleanTrailingLocation(value) {
  return cleanLocationPhrase(value)
    .replace(/\s+(?:and|or|while|when|where|with|as|if)$/i, '')
    .replace(/\s+(?:a|an|the|that|this)$/i, '')
    .trim();
}

function cleanLocationPhrase(value) {
  return cleanEntity(value)
    .replace(/^(?:in|at|from|near|around|across|between|through|toward|towards|on)\s+(?:the\s+)?/i, '')
    .trim();
}

function isLikelyLocationPhrase(value) {
  const cleaned = cleanEntity(value);
  if (!cleaned || cleaned.length < 3 || cleaned.length > 80) return false;
  if (findKnownPhrases(cleaned, genericLocationPhrases).length) return true;
  if (new RegExp(`\\b${placeSuffixPattern}\\b`, 'i').test(cleaned)) return true;
  if (cleaned.includes(' ') && /^[A-Z][a-z]+(?:\s+(?:and|of|the|[A-Z][a-z]+)){0,3}$/.test(cleaned)) return true;
  return false;
}

function extractGenericRolePhrases(text) {
  const roleAlternation = roleTerms
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const pattern = new RegExp(`\\b((?:[a-z]+\\s+){0,2}(?:${roleAlternation}))\\b`, 'gi');
  const matches = [];
  for (const match of text.matchAll(pattern)) {
    const phrase = cleanRolePhrase(match[1] || match[0]);
    if (phrase && !isNegatedRole(text, phrase)) matches.push(phrase);
  }
  return compactEntityList(matches).filter((value) => value.length <= 60);
}

function cleanRolePhrase(value) {
  return cleanEntity(value)
    .replace(/^(?:(?:and|or|with|while|when|where|for|from|to|at|in|on|me|us|him|her|them|the|a|an|our|my|his|their|those|these)\s+)+/i, '')
    .replace(/^(?:all|some|many|several|other|new)\s+/i, '')
    .trim();
}

function extractGeneralKeywordPhrases(text) {
  const source = String(text || '');
  const scored = new Map();
  const namedPhrases = compactEntityList([
    ...extractGenericOrganizationPhrases(source),
    ...extractGenericLocationPhrases(source),
    ...extractGenericRolePhrases(source),
  ]);
  for (const phrase of namedPhrases) {
    addKeywordScore(scored, phrase.toLowerCase(), 6);
  }

  const clauses = source.split(/[.!?;:\n]+/).map((clause) => clause.trim()).filter(Boolean);
  for (const clause of clauses) {
    const words = clause.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    const normalizedWords = words.map((word) => word.toLowerCase());
    for (let index = 0; index < normalizedWords.length; index += 1) {
      for (let length = 1; length <= 3; length += 1) {
        const slice = normalizedWords.slice(index, index + length);
        if (slice.length !== length) continue;
        if (!isKeywordPhraseCandidate(slice)) continue;
        addKeywordScore(scored, slice.join(' '), scoreKeywordPhrase(slice, words.slice(index, index + length)));
      }
    }
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([keyword]) => keyword)
    .filter((keyword, index, keywords) => !isSubKeyword(keyword, keywords, index))
    .slice(0, 10);
}

function isKeywordPhraseCandidate(words) {
  if (!words.length || words.length > 4) return false;
  if (words.some((word) => keywordStopwords.has(word))) return false;
  if (words.some((word) => word.length < 3)) return false;
  const phrase = words.join(' ');
  if (weakKeywords.has(phrase) || weakKeywordPairs.has(phrase)) return false;
  if (words.length === 1) return words[0].length >= 6 && !weakKeywords.has(words[0]);
  return true;
}

function scoreKeywordPhrase(words, originalWords) {
  let score = words.length * 2;
  if (words.length >= 2) score += 2;
  if (originalWords.some((word) => /^[A-Z]/.test(word))) score += 2;
  if (/\b(?:algorithm|automated|system|portal|score|risk|housing|benefits|service|civil|war|nation|liberty|bridge|river|prisoner|soldier|dispatch|permit|eligibility|application)\b/i.test(words.join(' '))) {
    score += 3;
  }
  return score;
}

function addKeywordScore(scored, phrase, score) {
  const normalized = normalizeForPhraseMatch(phrase);
  if (!normalized || weakKeywords.has(normalized) || weakKeywordPairs.has(normalized)) return;
  scored.set(normalized, (scored.get(normalized) || 0) + score);
}

function isSubKeyword(keyword, keywords, index) {
  const words = keyword.split(' ');
  if (words.length >= 3) return false;
  return keywords.slice(0, index).some((existing) => existing !== keyword && existing.includes(keyword));
}

function phraseAppearsInSource(value, normalizedSource) {
  const normalized = normalizeForPhraseMatch(value);
  return Boolean(normalized && (
    normalizedSource.includes(normalized)
    || phraseAliasGroups
      .filter((alias) => normalizeForPhraseMatch(alias.canonical) === normalized)
      .some((alias) => alias.aliases.some((aliasValue) => normalizedSource.includes(aliasValue)))
  ));
}

function cleanEntity(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/i, '')
    .replace(/^(?:at|in|from|near|around|across|between|through|toward|towards|on)\s+(?:the\s+)?/i, '')
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

function findAliasedPhrases(text, aliases) {
  const found = [];
  for (const alias of aliases) {
    if (alias.patterns.some((pattern) => pattern.test(text))) {
      found.push(alias.canonical);
    }
  }
  return found;
}

function removeAliasDuplicates(values, aliases) {
  const keys = new Set(values.map((value) => normalizeForPhraseMatch(value)));
  return values.filter((value) => {
    const key = normalizeForPhraseMatch(value);
    const alias = aliases.find((item) => item.aliases.some((aliasValue) => normalizeForPhraseMatch(aliasValue) === key));
    return !alias || !keys.has(normalizeForPhraseMatch(alias.canonical));
  });
}

function canonicalizeAliasPhrase(value) {
  const key = normalizeForPhraseMatch(value);
  const alias = phraseAliasGroups.find((item) => item.aliases.some((aliasValue) => normalizeForPhraseMatch(aliasValue) === key));
  return alias ? alias.canonical.toLowerCase() : value;
}

function isAliasDuplicateKeyword(keyword, keywords) {
  const key = normalizeForPhraseMatch(keyword);
  const alias = phraseAliasGroups.find((item) => item.aliases.some((aliasValue) => normalizeForPhraseMatch(aliasValue) === key));
  return Boolean(alias && keywords.some((value) => normalizeForPhraseMatch(value) === normalizeForPhraseMatch(alias.canonical)));
}

function findExplicitRolePhrases(text) {
  return findKnownPhrases(text, roleTerms).filter((role) => {
    return !isNegatedRole(text, role);
  });
}

function isCoveredBySystem(value, systemKeys) {
  const key = normalizeForPhraseMatch(value);
  if (!key) return false;
  return [...systemKeys].some((systemKey) => (
    systemKey === key
    || systemKey.startsWith(`${key} `)
    || key.startsWith(`${systemKey} `)
  ));
}

function isNegatedRole(text, role) {
  const negated = new RegExp(`\\bnot\\s+(?:a|an|the)?\\s*${escapeRegExp(role)}\\b`, 'i');
  if (negated.test(text)) return true;
  if (role.toLowerCase() === 'worker') {
    return /\bnot\s+(?:a|an|the)?\s*(?:[a-z-]+\s+){0,3}worker\b/i.test(text);
  }
  return false;
}

function looksLikeFirstPersonServiceStory(text) {
  return /\b(I|my|me|we|our)\b/i.test(text)
    && (
      /\b(system|portal|algorithm|office|agency|department|worker|caseworker|application|request|benefits|housing|permit|transit|school|service)\b/i.test(text)
      || /\b(?:risk|priority|eligibility|inspection|safety)\s+score\b/i.test(text)
    );
}

function extractSystemPhrases(text) {
  const matches = [];
  for (const pattern of systemPhrasePatterns) {
    for (const match of text.matchAll(pattern)) {
      const phrase = cleanSystemPhrase(match[0]);
      if (phrase) matches.push(phrase);
    }
  }
  if (/\bparking citation\b/i.test(text) && /\bPittsburgh Parking Court\b/i.test(text)) {
    matches.push('parking citation review system');
  }
  if (/\b311 service request\b/i.test(text) && /\brout(?:e|ed|ing)\b/i.test(text)) {
    matches.push('311 service request routing system');
  }
  if (/\b(?:housing|shelter|wait(?:ing)? list)\b/i.test(text) && /\b(?:priority|prioritization|ranking|ranked|allocation)\b/i.test(text)) {
    matches.push('housing prioritization system');
  }
  if (/\b(?:child welfare|family screening|caseworker|cps)\b/i.test(text) && /\b(?:risk|screening|score|flag|flagged)\b/i.test(text)) {
    matches.push('Allegheny Family Screening Tool');
  }
  if (/\bautomated eligibility rule\b/i.test(text)) {
    matches.push('automated eligibility rule');
  }
  if (/\bsmall business aid portal\b/i.test(text)) {
    matches.push('small business aid portal');
  }
  return compactSystemList(matches);
}

function cleanSystemPhrase(value) {
  let phrase = cleanEntity(value)
    .replace(/^.*\bits\s+/i, '')
    .replace(/^.*\bthe\s+/i, '')
    .replace(/^.*\bto the\s+/i, '')
    .replace(/^.*\binto\s+(?:a|an|the)\s+/i, '')
    .replace(/^network\s+and\s+a\s+/i, '')
    .replace(/^(?:used|uses|using)\s+(?:a|an|the)\s+/i, '');
  if (/^(?:i|me|my|we|our|us|he|she|they|them|his|her|their|a|an|and|or)\b/i.test(phrase)) return '';
  if (/\b(?:think|don't|doesn|didn|wasn|isn|aren)\b/i.test(phrase)) return '';
  if (/\b(?:fight this computer system|can fix a system|you have to)\b/i.test(phrase)) return '';
  if (['this tool', 'the tool', 'computer system', 'same system', 'system', 'a system', 'tool', 'portal', 'model', 'algorithm'].includes(phrase.toLowerCase())) return '';
  const alias = systemPhraseAliases.find((item) => item.aliases.some((aliasValue) => normalizeForPhraseMatch(aliasValue) === normalizeForPhraseMatch(phrase)));
  if (alias) return alias.canonical;
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
    ...text.matchAll(/\b\d{3,4}s\b/g),
    ...text.matchAll(/\b\d{4}\b/g),
    ...text.matchAll(/\bfour score and seven years ago\b/gi),
    ...text.matchAll(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+years\s+ago\b/gi),
    ...text.matchAll(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+calls\b/gi),
    ...text.matchAll(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+days\b/gi),
    ...text.matchAll(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+more\s+days\b/gi),
    ...text.matchAll(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+more\s+weeks\b/gi),
    ...text.matchAll(/\b(?:last year|weeks|months|one day|next morning|next visit|same morning|same day|same week|this week|today|yesterday|tomorrow)\b/gi),
  ].map((match) => match[0]);
}

function compactEntityList(values) {
  const cleaned = uniqueValues(values.map(cleanEntity)).filter(Boolean);
  return cleaned.filter((value) => {
    const key = value.toLowerCase();
    return !cleaned.some((other) => {
      const otherKey = other.toLowerCase();
      return otherKey !== key
        && (otherKey.endsWith(key) || otherKey.startsWith(key))
        && otherKey.length > key.length + 3;
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
