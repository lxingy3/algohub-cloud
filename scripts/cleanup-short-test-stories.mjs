import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();

const fixes = [
  {
    id: '01f91e13-b963-4567-8f89-eb1fb4d0027b',
    title: 'My benefits renewal got stuck after the verification check',
    summary: 'In April 2026 in Downtown Pittsburgh, a benefits verification engine delayed a food assistance renewal and the caseworker could not explain what record caused the hold.',
    city: 'Pittsburgh',
    zipCode: '15222',
    occurredAtText: 'April 2026',
    affectedDomain: 'Benefits Administration',
    referralSource: 'AlgoStories community submission',
    narrativeText: 'In April 2026 in Downtown Pittsburgh, this came up while I was dealing with Allegheny County Department of Human Services and its benefits eligibility verification engine for a food assistance renewal. A caseworker was part of the process. The renewal stayed in review after the system matched my file to an old income record. I wanted a clearer explanation of what the system used and what could be changed.',
  },
  {
    id: 'cdffe12f-28e8-4b67-8a91-ceedca1c48f6',
    title: 'The priority score kept my housing request waiting',
    summary: 'In May 2026 in East Liberty, a housing prioritization system kept a Pittsburgh Housing Authority request waiting even after the family situation changed.',
    city: 'Pittsburgh',
    zipCode: '15206',
    occurredAtText: 'May 2026',
    affectedDomain: 'Housing',
    referralSource: 'AlgoStories community submission',
    narrativeText: 'In May 2026 in East Liberty, this came up while I was dealing with Pittsburgh Housing Authority and its housing prioritization system for housing assistance. A caseworker was part of the process. My request stayed low priority even after my family situation changed. I wanted a clearer explanation of how the priority score was calculated and whether someone could review the record.',
  },
  {
    id: 'c9d67d49-5bb9-4bc9-960c-12dbc72d5818',
    title: 'My safety report was routed to the wrong office',
    summary: 'In March 2026 in Downtown Pittsburgh, a public safety routing system sent a safety report to the wrong office before a city worker corrected it.',
    city: 'Pittsburgh',
    zipCode: '15222',
    occurredAtText: 'March 2026',
    affectedDomain: 'Public Safety',
    referralSource: 'AlgoStories community submission',
    narrativeText: 'In March 2026 in Downtown Pittsburgh, this came up while I was dealing with City of Pittsburgh public safety office and its public safety routing system for a safety report. A public safety worker was part of the process. The report was sent to the wrong office, and I had to call again before someone corrected the category. I wanted a clearer explanation of why the system routed it that way.',
  },
];

const refreshIds = [
  ...fixes.map((item) => item.id),
  '237151df-57b2-453f-9fd3-399a2319383c',
];

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  let updated = 0;
  for (const fix of fixes) {
    const { id, ...data } = fix;
    await prisma.testimony.update({ where: { id }, data });
    updated += 1;
  }
  const rows = await prisma.testimony.findMany({
    where: { id: { in: refreshIds } },
    select: { id: true, title: true, narrativeText: true },
  });
  fs.mkdirSync('task345-results', { recursive: true });
  fs.writeFileSync('task345-results/cleanup-stories-ml-input.json', `${JSON.stringify(rows, null, 2)}\n`);
  console.log(JSON.stringify({ updated, exported: rows.length, inputPath: 'task345-results/cleanup-stories-ml-input.json' }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
