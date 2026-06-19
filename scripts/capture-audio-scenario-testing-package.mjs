import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const baseUrl = (process.env.ML_QUICK_TEST_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const rootDir = process.cwd();
const audioPath = path.resolve(process.argv[2] || 'C:/Users/33672/Documents/xwechat_files/wxid_4siolaey49dr22_e1fb/msg/file/2026-06/Audio scenario testing.m4a');
const draftPath = path.resolve(process.argv[3] || 'task2-5-results/task1-5-read-aloud-scenario.txt');
const packageDir = path.resolve(process.argv[4] || 'task1-results/audio-scenario-testing-package');
const zipPath = `${packageDir}.zip`;

const inputsDir = path.join(packageDir, 'inputs');
const screenshotsDir = path.join(packageDir, 'screenshots');
const verificationDir = path.join(packageDir, 'verification');

await fs.rm(packageDir, { recursive: true, force: true });
await fs.mkdir(inputsDir, { recursive: true });
await fs.mkdir(screenshotsDir, { recursive: true });
await fs.mkdir(verificationDir, { recursive: true });

await fs.copyFile(audioPath, path.join(inputsDir, 'Audio scenario testing.m4a'));
await fs.copyFile(draftPath, path.join(inputsDir, 'Audio scenario testing draft.txt'));

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});
const context = await browser.newContext({
  viewport: { width: 1500, height: 1400 },
  deviceScaleFactor: 1,
});

try {
  const page = await context.newPage();
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.log(`[request failed] ${request.method()} ${request.url()} ${failure?.errorText || ''}`);
  });

  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await login(page);
  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  const quickTest = page.getByTestId('ml-quick-test');
  await quickTest.waitFor({ state: 'visible', timeout: 120000 });
  await quickTest.locator('#ml-quick-test-audio').setInputFiles(audioPath);

  const responses = [];
  page.on('response', async (response) => {
    if (!response.url().includes('/api/ml/quick-test') || response.request().method() !== 'POST') return;
    try {
      responses.push({
        status: response.status(),
        body: await response.json(),
      });
    } catch (error) {
      responses.push({
        status: response.status(),
        body: { error: error?.message || String(error) },
      });
    }
  });

  await quickTest.getByRole('button', { name: /Run ML test/i }).click();
  await quickTest.getByText(/Task 1 transcription/i).first().waitFor({ state: 'visible', timeout: 300000 });
  await quickTest.getByText(/Task 2 impact classification/i).first().waitFor({ state: 'visible', timeout: 300000 });
  await quickTest.getByText(/Task 5 keyword extraction/i).first().waitFor({ state: 'visible', timeout: 300000 });
  await page.waitForTimeout(1000);

  await quickTest.screenshot({
    path: path.join(screenshotsDir, 'Audio scenario testing ML Quick Test output.png'),
    animations: 'disabled',
  });

  await page.screenshot({
    path: path.join(verificationDir, 'Audio scenario testing full page.png'),
    fullPage: true,
    animations: 'disabled',
  });

  await fs.writeFile(
    path.join(verificationDir, 'Audio scenario testing web responses.json'),
    `${JSON.stringify(responses, null, 2)}\n`,
    'utf8',
  );

  const task1Payload = responses.find((response) => response.body?.result?.task1?.status === 'COMPLETED')?.body?.result || null;
  const analysisPayload = responses.find((response) => {
    const result = response.body?.result;
    return ['task2', 'task3', 'task4', 'task5'].every((taskName) => result?.[taskName]?.status === 'COMPLETED');
  })?.body?.result || null;

  if (!task1Payload?.task1 || task1Payload.task1.status !== 'COMPLETED') {
    throw new Error('Task 1 did not complete for Audio scenario testing.');
  }
  for (const taskName of ['task2', 'task3', 'task4', 'task5']) {
    if (!analysisPayload?.[taskName] || analysisPayload[taskName].status !== 'COMPLETED') {
      throw new Error(`${taskName.toUpperCase()} did not complete for Audio scenario testing.`);
    }
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
  packageDir: path.relative(rootDir, packageDir),
  zipPath: path.relative(rootDir, zipPath),
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
