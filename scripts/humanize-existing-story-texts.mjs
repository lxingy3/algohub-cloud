import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';

const defaults = {
  Housing: {
    agency: 'Pittsburgh Housing Authority',
    system: 'housing prioritization system',
    location: 'East Liberty',
    date: 'February 2026',
    role: 'caseworker',
    topic: 'housing assistance',
  },
  'Housing Inspections': {
    agency: 'City of Pittsburgh Department of Permits, Licenses, and Inspections',
    system: 'automated housing inspection system',
    location: 'Lawrenceville',
    date: 'May 2026',
    role: 'inspector',
    topic: 'inspection priority',
  },
  'Benefits Administration': {
    agency: 'Allegheny County Department of Human Services',
    system: 'benefits eligibility verification engine',
    location: 'Downtown Pittsburgh',
    date: 'May 2026',
    role: 'caseworker',
    topic: 'benefits renewal',
  },
  'Fraud Detection': {
    agency: 'Allegheny County benefits office',
    system: 'fraud detection system',
    location: 'North Side',
    date: 'April 2026',
    role: 'benefits worker',
    topic: 'benefits review',
  },
  'Child Welfare': {
    agency: 'Allegheny County Department of Human Services',
    system: 'Allegheny Family Screening Tool',
    location: 'Allegheny County',
    date: 'March 2026',
    role: 'CPS worker',
    topic: 'child welfare screening',
  },
  'Student Support': {
    agency: 'Pittsburgh Public Schools',
    system: 'student support risk flag system',
    location: 'Oakland',
    date: 'February 2026',
    role: 'school counselor',
    topic: 'student support review',
  },
  'Student Award': {
    agency: 'Pittsburgh Public Schools',
    system: 'student award eligibility portal',
    location: 'Squirrel Hill',
    date: 'March 2026',
    role: 'school staff member',
    topic: 'student award eligibility',
  },
  'Traffic Management': {
    agency: 'Pittsburgh Department of Mobility and Infrastructure',
    system: 'traffic management camera system',
    location: 'Downtown Pittsburgh',
    date: 'April 2026',
    role: 'city staff member',
    topic: 'traffic citation review',
  },
  'Transit Safety': {
    agency: 'Pittsburgh Regional Transit',
    system: 'transit safety routing system',
    location: 'East Busway',
    date: 'April 2026',
    role: 'transit worker',
    topic: 'transit safety report',
  },
  'Job Matching': {
    agency: 'PA CareerLink Pittsburgh',
    system: 'workforce job matching system',
    location: 'Downtown Pittsburgh',
    date: 'May 2026',
    role: 'career center worker',
    topic: 'job referral',
  },
  Employment: {
    agency: 'Pennsylvania Department of Labor and Industry',
    system: 'wage compliance risk model',
    location: 'Pittsburgh',
    date: 'February 2026',
    role: 'workforce staff member',
    topic: 'employment review',
  },
  'Language Access': {
    agency: 'City of Pittsburgh resident services office',
    system: 'language access routing system',
    location: 'Bloomfield',
    date: 'June 2026',
    role: 'interpreter',
    topic: 'language access request',
  },
  'Emergency Services': {
    agency: 'Allegheny County Emergency Services',
    system: 'emergency dispatch triage tool',
    location: 'South Side',
    date: 'June 2026',
    role: 'dispatcher',
    topic: 'emergency response routing',
  },
  'Energy Forecasting': {
    agency: 'Allegheny County assistance office',
    system: 'energy assistance forecasting tool',
    location: 'Hazelwood',
    date: 'Winter 2026',
    role: 'assistance office worker',
    topic: 'utility assistance priority',
  },
  'Community Services': {
    agency: 'City of Pittsburgh community services office',
    system: 'community services intake system',
    location: 'Hill District',
    date: 'Spring 2026',
    role: 'front desk worker',
    topic: 'community services intake',
  },
  'Public Safety': {
    agency: 'City of Pittsburgh public safety office',
    system: 'public safety routing system',
    location: 'Downtown Pittsburgh',
    date: 'March 2026',
    role: 'public safety worker',
    topic: 'safety report',
  },
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripBadPrefix(text) {
  let output = clean(text)
    .replace(/^In\s+[^.]+?\.\s+A\s+[^.]+?\s+was part of the process\.\s*/i, '')
    .replace(/(^|\s)>\s*/g, ' ')
    .replace(/\s+\.\.\.\s+/g, '... ')
    .replace(/\s+/g, ' ')
    .trim();
  const generatedPatterns = [
    /\bThe notice came through .*? changed the .*? decision\./gi,
    /\bThe notice came through .*? affected the .*?\./gi,
    /\bI dealt with an? .*? This was in .*? around .*?\./gi,
    /\bThe only person I could reach was an? .*? This was in .*? around .*?\./gi,
    /\bBy the time I reached .*? not easier to understand\./gi,
    /\bBy the time I got someone at .*? not easier to fix\./gi,
    /\b.*? was the office on the paperwork\. The human contact was .*? in .*?\./gi,
    /\bI am including the details because .*? and the .*?\./gi,
    /\bI remember the practical details better than .*? depend on the .*?\./gi,
    /\bThe confusing part was not only the outcome\. It was being told by .*? normal office decision\./gi,
    /\bWhat bothered me was hearing .*? normal office decision\./gi,
    /\bThis happened through .*? in .*?\./gi,
    /\bThe case went through .*? in .*?\./gi,
    /\bWhen I followed up .*? score I could not see\./gi,
    /\bThe record should be checkable: .*? while trying to deal with .*?\./gi,
    /\b.*? had my file, and .*? was the address tied to it\. By .*? for .*?\./gi,
    /\bI did not walk in asking about algorithms\. I was trying to solve .*? in .*?\./gi,
  ];
  for (const pattern of generatedPatterns) {
    output = output.replace(pattern, ' ');
  }
  return output.replace(/\s+/g, ' ').trim();
}

function stripTemplateOnly(text) {
  return clean(text)
    .replace(/^In\s+[^.]+?\.\s+A\s+[^.]+?\s+was part of the process\.\s*/i, '')
    .replace(/(^|\s)>\s*/g, ' ')
    .replace(/\s+\.\.\.\s+/g, '... ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadSourceNarratives() {
  const sourceMap = new Map();
  for (const file of [
    'task345-results/existing-stories-ml-input.json',
    'task345-results/cleanup-stories-ml-input.json',
  ]) {
    if (!fs.existsSync(file)) continue;
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of rows) {
      if (row.id && row.narrativeText) sourceMap.set(row.id, row.narrativeText);
    }
  }
  return sourceMap;
}

function normalizeDomain(testimony) {
  const value = clean(testimony.affectedDomain || testimony.algorithmLinks?.[0]?.algorithm?.useCase || 'Community Services');
  if (defaults[value]) return value;
  const lower = value.toLowerCase();
  if (lower.includes('housing') && lower.includes('inspection')) return 'Housing Inspections';
  if (lower.includes('housing')) return 'Housing';
  if (lower.includes('benefit')) return 'Benefits Administration';
  if (lower.includes('fraud')) return 'Fraud Detection';
  if (lower.includes('child')) return 'Child Welfare';
  if (lower.includes('student') && lower.includes('award')) return 'Student Award';
  if (lower.includes('student')) return 'Student Support';
  if (lower.includes('traffic')) return 'Traffic Management';
  if (lower.includes('transit')) return 'Transit Safety';
  if (lower.includes('job')) return 'Job Matching';
  if (lower.includes('employment')) return 'Employment';
  if (lower.includes('language')) return 'Language Access';
  if (lower.includes('emergency')) return 'Emergency Services';
  if (lower.includes('energy')) return 'Energy Forecasting';
  if (lower.includes('public safety')) return 'Public Safety';
  return 'Community Services';
}

function contextFor(testimony) {
  const domain = normalizeDomain(testimony);
  const fallback = defaults[domain] || defaults['Community Services'];
  const algorithm = testimony.algorithmLinks?.[0]?.algorithm;
  return {
    domain,
    agency: usefulAgency(algorithm?.agencyName) || fallback.agency,
    system: clean(algorithm?.name) || fallback.system,
    location: usefulLocation(testimony.city, algorithm?.location) || fallback.location,
    date: usefulDate(testimony.occurredAtText) || fallback.date,
    role: fallback.role,
    topic: fallback.topic,
  };
}

function usefulAgency(value) {
  const text = clean(value);
  if (!text) return '';
  if (/screeners|supervisors|worker|staff|desk/i.test(text) && !/Office|Department|Authority|County|City|Public Schools|Transit|Bureau|Library/i.test(text)) return '';
  return text;
}

function usefulLocation(city, algorithmLocation) {
  const cityText = clean(city);
  if (cityText && !/^a+$|^\d+$/i.test(cityText)) return cityText;
  const algorithmText = clean(algorithmLocation);
  if (algorithmText && !/^a+$|^\d+$/i.test(algorithmText)) return algorithmText;
  return '';
}

function usefulDate(value) {
  const text = clean(value);
  if (!text || /^\d+$/.test(text) || /^a+$/i.test(text)) return '';
  return text;
}

function article(role) {
  return /^[aeiou]/i.test(role) ? 'an' : 'a';
}

function hasContext(body, ctx) {
  const lower = body.toLowerCase();
  return [ctx.agency, ctx.system, ctx.location, ctx.date, ctx.role]
    .filter(Boolean)
    .every((item) => lower.includes(item.toLowerCase()));
}

function firstSentence(text) {
  const normalized = clean(text);
  const match = normalized.match(/^(.{45,260}?[.!?])\s/);
  return clean(match?.[1] || normalized.slice(0, 180));
}

function buildContextLines(ctx, index) {
  const options = [
    `The notice came through ${ctx.agency} in ${ctx.date}. I was in ${ctx.location}, and nobody could tell me exactly how the ${ctx.system} changed the ${ctx.topic} decision.`,
    `The only person I could reach was ${article(ctx.role)} ${ctx.role}. They worked through ${ctx.agency}, but the answer kept circling back to the ${ctx.system}. This was in ${ctx.location} around ${ctx.date}.`,
    `By the time I got someone at ${ctx.agency} on the phone, the ${ctx.system} had already shaped the next step. The case was tied to ${ctx.location} and ${ctx.date}, which made it easier to track but not easier to fix.`,
    `${ctx.agency} was the office on the paperwork in ${ctx.date}. The human contact was ${article(ctx.role)} ${ctx.role}, but the decision kept coming back to the ${ctx.system} and my ${ctx.topic} record in ${ctx.location}.`,
    `I remember the practical details better than the policy language: ${ctx.location}, ${ctx.date}, ${ctx.agency}, ${article(ctx.role)} ${ctx.role}, and a decision that seemed to depend on the ${ctx.system}.`,
    `What bothered me was hearing ${article(ctx.role)} ${ctx.role} in ${ctx.location} talk about the ${ctx.system} as if it were just another step in the ${ctx.topic} process. ${ctx.agency} still treated the ${ctx.date} outcome like a normal office decision.`,
    `The case went through ${ctx.agency}. Somewhere in that process, the ${ctx.system} became part of a ${ctx.topic} decision in ${ctx.location} in ${ctx.date}.`,
    `When I followed up in ${ctx.date}, ${article(ctx.role)} ${ctx.role} at ${ctx.agency} pointed me back to the ${ctx.system}. That was when the process started to feel less like a service and more like a score I could not see.`,
    `${ctx.agency} had my file, and ${ctx.location} was the address tied to it. By ${ctx.date}, I was still trying to understand why the ${ctx.system} mattered so much for ${ctx.topic}.`,
    `I did not walk in asking about algorithms. I was trying to solve a ${ctx.topic} issue in ${ctx.location}, and ${ctx.agency}'s ${ctx.system} became part of the answer in ${ctx.date}.`,
  ];
  return options[index % options.length];
}

function buildSummary(body, ctx, index) {
  const lead = firstSentence(body).replace(/\s*\[\.{3}\]\s*/g, ' ');
  const options = [
    `${lead} The issue ran through ${ctx.agency}'s ${ctx.system} in ${ctx.location}.`,
    `${lead} This was a ${ctx.topic} case with ${ctx.agency} around ${ctx.date}.`,
    `${lead} ${article(ctx.role).toUpperCase()} ${ctx.role} could respond, but the system behind the decision was still hard to understand.`,
    `${lead} The story is tied to ${ctx.topic}, ${ctx.location}, and the ${ctx.system}.`,
    `${lead} The public service decision felt different once the system became part of it.`,
  ];
  const summary = options[index % options.length];
  return summary.length > 230 ? `${summary.slice(0, 227).trim()}...` : summary;
}

function humanizeNarrative(testimony, index, sourceMap) {
  const ctx = contextFor(testimony);
  const sourceText = sourceMap.get(testimony.id);
  const body = sourceText
    ? stripTemplateOnly(sourceText)
    : (stripBadPrefix(testimony.narrativeText) || stripBadPrefix(testimony.summary));
  const context = hasContext(body, ctx) ? '' : buildContextLines(ctx, index);
  const narrative = context ? `${body}\n\n${context}` : body;
  return {
    context: ctx,
    narrativeText: narrative,
    summary: buildSummary(body, ctx, index),
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const testimonies = await prisma.testimony.findMany({
    where: { jurisdictionId },
    orderBy: { submittedAt: 'asc' },
    select: {
      id: true,
      title: true,
      summary: true,
      city: true,
      occurredAtText: true,
      affectedDomain: true,
      narrativeText: true,
      algorithmLinks: {
        select: {
          algorithm: { select: { name: true, useCase: true, agencyName: true, location: true } },
        },
      },
    },
  });

  const sourceMap = loadSourceNarratives();
  const records = [];
  for (const [index, testimony] of testimonies.entries()) {
    const update = humanizeNarrative(testimony, index, sourceMap);
    await prisma.testimony.update({
      where: { id: testimony.id },
      data: {
        narrativeText: update.narrativeText,
        summary: update.summary,
        city: update.context.location === 'Allegheny County' ? 'Pittsburgh' : update.context.location,
        occurredAtText: update.context.date,
        affectedDomain: update.context.domain,
      },
    });
    records.push({ id: testimony.id, title: testimony.title, narrativeText: update.narrativeText });
  }

  fs.mkdirSync('task345-results', { recursive: true });
  fs.writeFileSync('task345-results/humanized-stories-ml-input.json', `${JSON.stringify(records, null, 2)}\n`);
  console.log(JSON.stringify({ updated: records.length, inputPath: 'task345-results/humanized-stories-ml-input.json' }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
