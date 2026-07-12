import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

for (const file of ['.env.production.local', '.env.ml-run.local', '.env.local', '../LOCAL_SECRETS_DO_NOT_COMMIT.md']) loadEnvFile(file);
const prisma = new PrismaClient();
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

async function main() {
  const jobs = await prisma.briefingGenerationJob.findMany({
    where: { jurisdictionId, status: 'PENDING' },
    include: { targetAlgorithm: { select: { slug: true } } },
    orderBy: { createdAt: 'asc' },
  });
  for (const job of jobs) {
    await prisma.briefingGenerationJob.update({ where: { id: job.id }, data: { status: 'RUNNING', startedAt: new Date(), message: 'Generating the offline draft.' } });
    const args = ['scripts/briefings-narrative-draft.mjs', '--apply', '--output', `task-briefings-results/job-${job.id}.json`];
    if (job.briefingType === 'CROSS_CUTTING') args.push('--scope', 'corpus');
    else args.push('--algorithm', job.targetAlgorithm.slug);
    if (job.useClaude) args.push('--claude');
    let usedLocalFallback = false;
    let run = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
    if (run.status !== 0 && job.useClaude) {
      usedLocalFallback = true;
      const localArgs = args.filter((arg) => arg !== '--claude');
      run = spawnSync(process.execPath, localArgs, { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
    }
    if (run.status !== 0) {
      const rawError = `${run.stderr || ''}\n${run.stdout || ''}`;
      const reason = rawError.includes('fetch failed') || rawError.includes('ECONNRESET')
        ? 'The model service could not be reached after three attempts. Retry this job when the connection is stable.'
        : 'Draft generation failed. Check the worker log, then submit the job again.';
      await prisma.briefingGenerationJob.update({ where: { id: job.id }, data: { status: 'FAILED', completedAt: new Date(), message: reason } });
      continue;
    }
    const slug = job.briefingType === 'CROSS_CUTTING' ? 'local-draft-cross-cutting' : `local-draft-${job.targetAlgorithm.slug}`;
    const briefing = await prisma.briefing.findUnique({ where: { slug }, select: { id: true } });
    await prisma.briefingGenerationJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resultBriefingId: briefing?.id || null,
        message: briefing
          ? usedLocalFallback
            ? 'Local draft ready for admin review. Optional language polishing was unavailable.'
            : 'Draft ready for admin review.'
          : 'Generation finished, but no matching draft was found.',
      },
    });
  }
  console.log(JSON.stringify({ processed: jobs.length }, null, 2));
}

main().finally(() => prisma.$disconnect());
