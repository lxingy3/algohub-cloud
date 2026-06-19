import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const baseUrl = (process.env.ML_QUICK_TEST_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const inputPath = process.argv[2] || 'data/task2-5-pittsburgh-input.json';
const packageDir = process.argv[3] || 'task2-5-results/task2-5-quick-test-web-package';
const zipPath = `${packageDir}.zip`;
const selectedIds = [
  'pittsburgh-pwsa-stormwater-mixed-015',
  'pittsburgh-onestoppgh-pli-003',
  'pittsburgh-careerlink-positive-014',
];

const records = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const samples = selectedIds.map((id, index) => {
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Missing input record: ${id}`);
  const number = String(index + 1).padStart(2, '0');
  const cleanName = record.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return {
    ...record,
    fileStem: `${number}-${cleanName}`,
  };
});

await fs.rm(packageDir, { recursive: true, force: true });
await fs.mkdir(path.join(packageDir, 'inputs'), { recursive: true });
await fs.mkdir(path.join(packageDir, 'screenshots'), { recursive: true });

for (const sample of samples) {
  await fs.writeFile(
    path.join(packageDir, 'inputs', `${sample.fileStem}.txt`),
    `${sample.title}\n\n${sample.narrativeText}\n`,
    'utf8',
  );
}

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page);
  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  const quickTest = page.getByTestId('ml-quick-test');
  await quickTest.waitFor({ state: 'visible', timeout: 60000 });
  const textarea = quickTest.locator('textarea[name="narrative_text"]');
  const runButton = quickTest.getByRole('button', { name: 'Run ML test' });

  for (const sample of samples) {
    await textarea.fill(sample.narrativeText);
    await runButton.click();
    await quickTest.getByText(/Task 2 impact classification/i).first().waitFor({ state: 'visible', timeout: 180000 });
    await quickTest.getByText(/Task 5 keyword extraction/i).first().waitFor({ state: 'visible', timeout: 180000 });
    await page.waitForTimeout(500);
    await quickTest.screenshot({
      path: path.join(packageDir, 'screenshots', `${sample.fileStem}.png`),
      animations: 'disabled',
    });
    await textarea.fill('');
  }
} finally {
  await browser.close();
}

await fs.rm(zipPath, { force: true });
const archive = spawnSync('powershell', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path '${packageDir}\\inputs','${packageDir}\\screenshots' -DestinationPath '${zipPath}' -Force`,
], { stdio: 'inherit' });
if (archive.status !== 0) {
  throw new Error(`Compress-Archive failed with status ${archive.status}`);
}

console.log(JSON.stringify({
  baseUrl,
  packageDir,
  zipPath,
  sampleCount: samples.length,
  files: await listFiles(packageDir),
}, null, 2));

async function login(page) {
  const email = process.env.ADMIN_EMAIL || 'admin@algostories.local';
  const password = process.env.ADMIN_PASSWORD || '';
  await page.evaluate(async ({ email, password }) => {
    const form = new FormData();
    form.set('email', email);
    form.set('password', password);
    form.set('callbackUrl', '/admin/testimonies');
    await fetch('/api/auth/login', {
      method: 'POST',
      body: form,
      redirect: 'manual',
    });
  }, { email, password });
}

async function listFiles(root) {
  const entries = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        entries.push(path.relative(root, absolute).replaceAll('\\', '/'));
      }
    }
  }
  await walk(root);
  return entries;
}
