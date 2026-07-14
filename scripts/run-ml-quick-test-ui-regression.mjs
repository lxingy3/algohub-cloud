import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = (process.env.ML_QUICK_TEST_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const inputPath = process.argv[2] || 'data/task2-5-pittsburgh-input.json';
const outputPath = process.argv[3] || 'task345-results/production-regression/ml-quick-test-ui-regression.json';
const records = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const sample = records.find((record) => record.id === 'pittsburgh-onestoppgh-pli-003') || records[0];

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});

const checks = [];

try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page);
  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  const quickTest = page.getByTestId('ml-quick-test');
  await expectVisible(quickTest, 'quick_test_section_visible');
  await expectVisible(quickTest.getByText(/Test only .* results use the production Task 1.*5 format and are not saved/i), 'quick_test_not_saved_notice_visible');
  await runAdminPipelineRenderingCheck(page);

  const textarea = quickTest.locator('textarea[name="narrative_text"]');
  await textarea.fill(sample.narrativeText);
  const runButton = quickTest.getByRole('button', { name: 'Run ML test' });
  await expectEnabled(runButton, 'run_button_enabled_with_text_input');
  await runButton.click();

  await expectVisible(quickTest.getByText('Task 2 impact classification').first(), 'task2_heading_visible');
  await expectVisible(quickTest.getByText('NEGATIVE').first(), 'task2_negative_visible');
  await expectVisible(quickTest.getByText('Task 3 theme detection').first(), 'task3_heading_visible');
  await expectVisible(quickTest.getByText('Data Accuracy').first(), 'task3_data_accuracy_visible');
  await expectVisible(quickTest.getByText('Opacity').first(), 'task3_opacity_visible');
  await expectVisible(quickTest.getByText('Task 4 entity extraction').first(), 'task4_heading_visible');
  await expectVisible(quickTest.getByText('Agencies').first(), 'task4_agencies_label_visible');
  await expectVisible(quickTest.getByText('Department of Permits, Licenses, and Inspections').first(), 'task4_agency_value_visible');
  await expectVisible(quickTest.getByText('Lawrenceville').first(), 'task4_location_value_visible');
  await expectVisible(quickTest.getByText('OneStopPGH portal').first(), 'task4_system_value_visible');
  await expectVisible(quickTest.getByText('permit reviewer').first(), 'task4_role_value_visible');
  await expectVisible(quickTest.getByText('Task 5 keyword extraction').first(), 'task5_heading_visible');
  await expectVisible(quickTest.getByText('wrong parcel number').first(), 'task5_keyword_visible');
  await expectCount(quickTest.getByText(/^Summary$/), 0, 'quick_test_summary_not_part_of_task1_5');

  await textarea.fill(`${sample.narrativeText}\nChanged input should clear stale output.`);
  await expectHidden(quickTest.getByText('Task 2 impact classification').first(), 'result_cleared_after_text_change');
  await textarea.fill('');
  await expectDisabled(quickTest.getByRole('button', { name: 'Run ML test' }), 'run_button_disabled_without_input');

  await runAudioInterimRenderingCheck(page);
  await runAudioFallbackApiCheck(page, sample);

  writeReport('PASS');
} catch (error) {
  writeReport('FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}

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

async function runAdminPipelineRenderingCheck(page) {
  const testimonyForms = page.locator('form[action*="/moderate"]');
  const formCount = await testimonyForms.count();
  if (formCount < 1) throw new Error('admin_pipeline_testimony_forms_visible failed: no testimony cards found');
  checks.push({ name: 'admin_pipeline_testimony_forms_visible', status: 'PASS' });

  await expectCount(page.getByText(/^Open$/), 0, 'admin_pipeline_old_open_control_removed');
  await expectCount(page.getByText(/Show full story details/i), 0, 'admin_pipeline_old_show_full_copy_removed');

  let targetForm = null;
  for (let index = 0; index < formCount; index += 1) {
    const form = testimonyForms.nth(index);
    const storyDetails = form.locator('section').filter({ hasText: /Story details/i }).first();
    const pipeline = form.locator('section').filter({ hasText: /ML Pipeline/i }).first();
    if (await storyDetails.count().catch(() => 0) && await pipeline.count().catch(() => 0)) {
      targetForm = form;
      break;
    }
  }
  targetForm ??= testimonyForms.first();

  const storyDetails = targetForm.locator('section').filter({ hasText: /Story details/i }).first();
  await expectVisible(storyDetails, 'admin_pipeline_story_details_box_visible');
  await expectVisible(storyDetails.getByText(/Story details/i).first(), 'admin_pipeline_story_details_label_visible');
  const storyToggle = storyDetails.locator('button[aria-expanded]').first();
  if (await storyDetails.getByRole('button', { name: /Expand Story details/i }).count()) {
    const wasOpen = await storyToggle.getAttribute('aria-expanded');
    if (wasOpen === 'true') throw new Error('admin_pipeline_story_details_initially_collapsed failed: Story details started open');
    await storyToggle.click();
    const isOpen = await storyToggle.getAttribute('aria-expanded');
    if (isOpen !== 'true') throw new Error('admin_pipeline_story_details_inline_expand failed: Story details did not open');
    checks.push({ name: 'admin_pipeline_story_details_inline_expand', status: 'PASS' });
  } else {
    checks.push({ name: 'admin_pipeline_story_details_short_text_no_expand_needed', status: 'PASS' });
  }

  const pipeline = targetForm.locator('section').filter({ hasText: /ML Pipeline/i }).first();
  await expectVisible(pipeline, 'admin_pipeline_box_visible');
  await expectVisible(pipeline.getByText(/ML Pipeline/i).first(), 'admin_pipeline_label_visible');
  const task2Before = await pipeline.getByText(/Task 2 impact classification/i).isVisible().catch(() => false);
  if (task2Before) throw new Error('admin_pipeline_tasks_hidden_before_expand failed: Task 2 details visible before expansion');
  checks.push({ name: 'admin_pipeline_tasks_hidden_before_expand', status: 'PASS' });
  await pipeline.locator('button[aria-expanded]').first().click();
  await expectVisible(pipeline.getByText(/Task 2 impact classification/i).first(), 'admin_pipeline_task2_visible_after_expand');
  await expectVisible(pipeline.getByText(/Task 3 theme detection/i).first(), 'admin_pipeline_task3_visible_after_expand');
  await expectVisible(pipeline.getByText(/Task 4 entity extraction/i).first(), 'admin_pipeline_task4_visible_after_expand');
  await expectVisible(pipeline.getByText(/Task 5 keyword extraction/i).first(), 'admin_pipeline_task5_visible_after_expand');
  await expectCount(targetForm.getByText(/Page estimate|Not stored yet/i), 0, 'admin_pipeline_page_estimates_removed');
}

async function runAudioInterimRenderingCheck(page) {
  await page.unroute('**/api/ml/quick-test').catch(() => {});
  let callCount = 0;
  let secondRoute = null;

  await page.route('**/api/ml/quick-test', async (route) => {
    callCount += 1;
    if (callCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          result: {
            inputField: 'audio',
            source: 'audio-upload',
            status: 'PARTIAL',
            summary: 'Short transcript summary.',
            task1: {
              status: 'COMPLETED',
              tool: 'small',
              inputFile: 'mobile-test.m4a',
              transcript: 'This is the transcript from the audio file.',
              rawTranscript: 'This is the transcript from the audio file.',
              segments: [{ start: 0.1, end: 2.4, text: 'This is the transcript from the audio file.' }],
            },
          },
        }),
      });
      return;
    }
    secondRoute = route;
  });

  await page.goto(`${baseUrl}/admin/testimonies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  const quickTest = page.getByTestId('ml-quick-test');
  await quickTest.locator('#ml-quick-test-audio').setInputFiles({
    name: 'mobile-test.m4a',
    mimeType: 'audio/mp4',
    buffer: Buffer.from('fake audio'),
  });
  await quickTest.getByRole('button', { name: /Run ML test/i }).click();
  await quickTest.getByRole('button', { name: /Running Task 2-5/i }).waitFor({ timeout: 30000 });

  await expectCount(quickTest.getByText(/Task 1 transcription/i), 1, 'audio_interim_task1_visible');
  await expectCount(quickTest.getByText(/Task 2 impact classification/i), 0, 'audio_interim_task2_hidden');
  await expectCount(quickTest.getByText(/Task 3 theme detection/i), 0, 'audio_interim_task3_hidden');
  await expectCount(quickTest.getByText(/Task 4 entity extraction/i), 0, 'audio_interim_task4_hidden');
  await expectCount(quickTest.getByText(/Task 5 keyword extraction/i), 0, 'audio_interim_task5_hidden');
  await expectCount(quickTest.getByText(/confidence not available/i), 0, 'audio_interim_no_empty_confidence');
  await expectCount(quickTest.getByText(/None found/i), 0, 'audio_interim_no_empty_none_found');

  if (!secondRoute) throw new Error('audio_interim_final_request_missing failed: no Task 2-5 request was captured');
  await secondRoute.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      result: {
        inputField: 'narrativeText',
        source: 'model',
        status: 'COMPLETED',
        task1: { status: 'SKIPPED', reason: 'Text input does not need transcription.' },
        task2: { status: 'COMPLETED', aiImpactClassification: 'NEGATIVE', aiConfidenceScore: 0.85, humanReviewRequired: true },
        task3: { status: 'COMPLETED', aiThemes: [{ theme: 'opacity', confidence: 0.82 }] },
        task4: {
          status: 'COMPLETED',
          entities: {
            agencies: ['Pittsburgh Housing Authority'],
            locations: ['East Liberty'],
            systems: ['housing inspection system'],
            dates: ['May 2026'],
            people_roles: ['caseworker'],
          },
        },
        task5: { status: 'COMPLETED', keywords: ['housing inspection system'] },
      },
    }),
  });
  await expectVisible(quickTest.getByText(/Task 2 impact classification/i).first(), 'audio_final_task2_visible');
  await expectVisible(quickTest.getByText(/Task 3 theme detection/i).first(), 'audio_final_task3_visible');
  await expectVisible(quickTest.getByText(/Task 4 entity extraction/i).first(), 'audio_final_task4_visible');
  await expectVisible(quickTest.getByText(/Task 5 keyword extraction/i).first(), 'audio_final_task5_visible');
  await expectVisible(quickTest.getByText(/Needs review/i).first(), 'impact_confidence_085_needs_review');
  await page.unroute('**/api/ml/quick-test').catch(() => {});
}

async function runAudioFallbackApiCheck(page, sample) {
  const response = await page.evaluate(async (narrativeText) => {
    const formData = new FormData();
    formData.append('audio', new File([new Blob(['not actually audio'], { type: 'audio/mp4' })], 'broken-mobile.m4a', { type: 'audio/mp4' }));
    formData.append('task', 'task1');
    formData.append('narrativeText', narrativeText);
    const request = await fetch('/api/ml/quick-test', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });
    const body = await request.json().catch(() => null);
    const result = body?.result || {};
    return {
      status: request.status,
      ok: request.ok,
      task1Status: result.task1?.status,
      task2Status: result.task2?.status,
      task2Impact: result.task2?.aiImpactClassification,
      task3Status: result.task3?.status,
      task3ThemeCount: result.task3?.aiThemes?.length || 0,
      task4Status: result.task4?.status,
      task4EntityCount: Object.values(result.task4?.entities || {}).reduce((count, values) => count + (Array.isArray(values) ? values.length : 0), 0),
      task5Status: result.task5?.status,
      task5KeywordCount: result.task5?.keywords?.length || 0,
      error: body?.error || result.task1?.error || null,
    };
  }, sample.narrativeText);

  if (response.status !== 200 || !response.ok) {
    throw new Error(`audio_fallback_status failed: ${JSON.stringify(response)}`);
  }
  checks.push({ name: 'audio_fallback_status_ok', status: 'PASS' });
  if (response.task1Status !== 'SKIPPED') {
    throw new Error(`audio_fallback_task1_skipped failed: ${JSON.stringify(response)}`);
  }
  checks.push({ name: 'audio_fallback_task1_skipped', status: 'PASS' });
  if (response.task2Status !== 'COMPLETED' || !response.task2Impact) {
    throw new Error(`audio_fallback_task2_completed failed: ${JSON.stringify(response)}`);
  }
  checks.push({ name: 'audio_fallback_task2_completed', status: 'PASS' });
  if (response.task3Status !== 'COMPLETED' || response.task3ThemeCount < 1) {
    throw new Error(`audio_fallback_task3_completed failed: ${JSON.stringify(response)}`);
  }
  checks.push({ name: 'audio_fallback_task3_completed', status: 'PASS' });
  if (response.task4Status !== 'COMPLETED' || response.task4EntityCount < 1) {
    throw new Error(`audio_fallback_task4_completed failed: ${JSON.stringify(response)}`);
  }
  checks.push({ name: 'audio_fallback_task4_completed', status: 'PASS' });
  if (response.task5Status !== 'COMPLETED' || response.task5KeywordCount < 1) {
    throw new Error(`audio_fallback_task5_completed failed: ${JSON.stringify(response)}`);
  }
  checks.push({ name: 'audio_fallback_task5_completed', status: 'PASS' });
}

async function expectVisible(locator, name) {
  await locator.waitFor({ state: 'visible', timeout: 180000 });
  checks.push({ name, status: 'PASS' });
}

async function expectHidden(locator, name) {
  await locator.waitFor({ state: 'hidden', timeout: 5000 });
  checks.push({ name, status: 'PASS' });
}

async function expectDisabled(locator, name) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await locator.isDisabled()) {
      checks.push({ name, status: 'PASS' });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${name} failed: button was not disabled`);
}

async function expectCount(locator, expectedCount, name) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const actualCount = await locator.count();
    if (actualCount === expectedCount) {
      checks.push({ name, status: 'PASS' });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${name} failed: expected ${expectedCount}, got ${await locator.count()}`);
}

async function expectEnabled(locator, name) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (!await locator.isDisabled()) {
      checks.push({ name, status: 'PASS' });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${name} failed: button was not enabled`);
}

function writeReport(status, error = null) {
  const report = {
    status,
    baseUrl,
    inputId: sample.id,
    checkCount: checks.length,
    checks,
    error: error ? (error.stack || error.message || String(error)) : null,
  };
  fs.mkdirSync(outputPath.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}
