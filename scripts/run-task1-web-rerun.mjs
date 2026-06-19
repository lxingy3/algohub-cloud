import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.TASK1_WEB_BASE_URL || 'http://127.0.0.1:3010';
const rootDir = process.cwd();
const packageDir = path.join(rootDir, process.env.TASK1_PACKAGE_DIR || path.join('task1-results', 'ml-quick-test-rerun-package'));
const inputsDir = path.join(packageDir, 'inputs');
const screenshotsDir = path.join(packageDir, 'output-screenshots');
const verificationDir = path.join(rootDir, process.env.TASK1_VERIFICATION_DIR || path.join('task1-results', 'worker-verification'));

const defaultSamples = [
  {
    label: 'north-wind-sun-full',
    input: path.join(rootDir, 'public', 'task1-audio-samples', 'north-wind-sun-full.wav'),
    screenshot: 'north-wind-sun-full-task1-output.png',
  },
  {
    label: 'supportive-housing',
    input: path.join(rootDir, 'public', 'task1-audio-samples', 'supportive-housing.wav'),
    screenshot: 'supportive-housing-task1-output.png',
  },
  {
    label: 'owl-creek-full',
    input: path.join(rootDir, 'public', 'task1-audio-samples', 'owl-creek-full.mp3'),
    screenshot: 'owl-creek-full-task1-output.png',
  },
];
const samples = process.env.TASK1_SAMPLE_MANIFEST
  ? JSON.parse(await readFile(path.resolve(process.env.TASK1_SAMPLE_MANIFEST), 'utf8')).map((sample) => ({
      ...sample,
      input: path.resolve(sample.input),
    }))
  : defaultSamples;

await rm(packageDir, { recursive: true, force: true });
await mkdir(inputsDir, { recursive: true });
await mkdir(screenshotsDir, { recursive: true });
await mkdir(verificationDir, { recursive: true });

const browserArgs = [];
if (process.env.TASK1_HOST_RESOLVER_RULES) {
  browserArgs.push(`--host-resolver-rules=${process.env.TASK1_HOST_RESOLVER_RULES}`);
}
const browser = await chromium.launch({ headless: true, args: browserArgs });
browser.on('disconnected', () => console.log(`[${new Date().toISOString()}] browser disconnected`));
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
});

try {
  const page = await context.newPage();
  page.on('close', () => console.log(`[${new Date().toISOString()}] page closed`));
  page.on('crash', () => console.log(`[${new Date().toISOString()}] page crashed`));
  page.on('pageerror', (error) => console.log(`[${new Date().toISOString()}] page error ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.log(`[${new Date().toISOString()}] request failed ${request.method()} ${request.url()} ${failure?.errorText || ''}`);
  });
  await page.goto(`${baseUrl}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  const loginResult = await page.evaluate(async () => {
    const body = new URLSearchParams();
    body.set('email', 'admin@algostories.local');
    body.set('password', '');
    body.set('callbackUrl', '/admin/testimonies');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'same-origin',
    });
    return { status: response.status, redirected: response.redirected, url: response.url };
  });

  if (loginResult.status !== 200) {
    throw new Error(`Admin login failed with status ${loginResult.status}.`);
  }

  for (const sample of samples) {
    console.log(`[${new Date().toISOString()}] running ${sample.label}`);
    await copyFile(sample.input, path.join(inputsDir, sample.inputName || path.basename(sample.input)));

    await page.goto(`${baseUrl}/admin/testimonies`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.getByText('ML Quick Test').waitFor({ timeout: 120000 });
    await page.locator('#ml-quick-test-audio').setInputFiles(sample.input);

    const task1ResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/ml/quick-test') && response.request().method() === 'POST',
      { timeout: 60 * 60 * 1000 },
    );
    await page.getByRole('button', { name: /Run ML test/i }).click();

    const task1Response = await task1ResponsePromise;
    const task1Payload = await task1Response.json();
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(
        path.join(verificationDir, `${sample.label}-web-response.json`),
        JSON.stringify(task1Payload, null, 2),
      ),
    );
    const task1 = task1Payload?.result?.task1 || {};
    if (task1.status !== 'COMPLETED' || !String(task1.transcript || task1.rawTranscript || '').trim()) {
      throw new Error(`${sample.label} did not return a completed Task 1 transcript.`);
    }
    const segments = Array.isArray(task1.segments) ? task1.segments : [];
    const hasTimedSegments = segments.some((segment) => Number(segment.end) > Number(segment.start));
    if (!hasTimedSegments) {
      throw new Error(`${sample.label} returned transcript text but no non-zero Task 1 segment timestamps.`);
    }
    const lastSegment = segments.at(-1);
    console.log(
      `[${new Date().toISOString()}] ${sample.label} provider ${task1.provider || 'unknown'} model ${task1.model || 'unknown'} transcript chars ${String(task1.transcript || task1.rawTranscript).length} last segment ${JSON.stringify(lastSegment)}`,
    );

    await page.waitForTimeout(1500);

    const task1Card = page
      .locator('text=/task 1 transcription/i')
      .locator('xpath=ancestor::div[contains(@class, "rounded-md")][1]')
      .first();

    if ((await task1Card.count()) < 1) {
      await page.screenshot({
        path: path.join(screenshotsDir, `${sample.label}-debug-full-page.png`),
        fullPage: true,
      });
      throw new Error(`${sample.label} returned Task 1 JSON but the page did not render the Task 1 card.`);
    }

    await task1Card.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(500);
    await task1Card.screenshot({
      path: path.join(screenshotsDir, sample.screenshot),
      animations: 'disabled',
    });
    console.log(`[${new Date().toISOString()}] captured ${sample.screenshot}`);
  }
} finally {
  await browser.close();
}

console.log(`[${new Date().toISOString()}] task1 web rerun complete`);
