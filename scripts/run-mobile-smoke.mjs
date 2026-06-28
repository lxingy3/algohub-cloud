import { chromium, devices } from 'playwright';

const baseUrl = (process.env.MOBILE_SMOKE_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const adminEmail = process.env.MOBILE_SMOKE_ADMIN_EMAIL || 'admin@algostories.local';
const adminPassword = process.env.MOBILE_SMOKE_ADMIN_PASSWORD || '';

const publicRoutes = ['/', '/algorithms', '/stories', '/events', '/about', '/submit-testimony'];
const adminRoutes = ['/admin', '/admin/algorithms', '/admin/events', '/admin/organizations', '/admin/testimonies', '/admin/comments', '/admin/users'];
const profiles = ['iPhone 13', 'Pixel 5', { name: 'Small 320px', viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }];

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});

try {
  for (const profile of profiles) {
    await runProfile(profile);
  }

  console.log(`mobile smoke PASS ${baseUrl} (${profiles.map(profileName).join(', ')})`);
} finally {
  await browser.close();
}

async function runProfile(profile) {
  const name = profileName(profile);
  const page = await browser.newPage(typeof profile === 'string' ? { ...devices[profile] } : profile);
  try {
  await runLanguageSelectorSmoke(page, name);
  for (const route of publicRoutes) {
    await goto(page, route);
    await assertNoHorizontalOverflow(page, `${name} ${route}`);
    await assertNoTinyTapTargets(page, `${name} ${route}`);
  }
  await runPublicDetailSmoke(page, name);
  await runEventModalSmoke(page, name);
  await runPartnerApplicationSmoke(page, name);
  await runSubmitReviewSmoke(page, name);
  await runSubmitVideoMediaSmoke(page, name);

  await page.getByRole('button', { name: /^Login$/i }).click();
  await page.getByRole('heading', { name: /^Login$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${name} login modal`);
  await assertNoTinyTapTargets(page, `${name} login modal`);
  await runAuthModalSmoke(page, name);

  await login(page);
  await dismissPasswordReminder(page);
  await runMyStoriesSmoke(page, name);

  for (const route of adminRoutes) {
    await goto(page, route);
    await assertNoHorizontalOverflow(page, `${name} ${route}`);
    await assertNoTinyTapTargets(page, `${name} ${route}`);
  }
  await runRoleSettingsSmoke(page, name);
  await runAdminAddEventSmoke(page, name);
  await runAdminAddOrganizationSmoke(page, name);
  await runAdminAlgorithmCardSmoke(page, name);

  await goto(page, '/admin/testimonies');
  await page.getByTestId('ml-quick-test').waitFor({ timeout: 15000 });
  await runAdminTestimonyPanelsSmoke(page, name);
  const accept = await page.locator('#ml-quick-test-audio').getAttribute('accept');
  if (!String(accept || '').includes('video/*')) throw new Error('ML Quick Test media input does not accept video.');
  await runMlQuickTestVideoSmoke(page);
  await runMlQuickTestSmoke(page);

  await goto(page, '/admin/algorithms');
  await page.getByRole('button', { name: /Add algorithm/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${name} add algorithm modal`);
  await assertNoTinyTapTargets(page, `${name} add algorithm modal`);
  const closeButton = page.getByRole('button', { name: /Close add algorithm/i }).last();
  const box = await closeButton.boundingBox();
  if (!box || box.width < 40 || box.height < 40) {
    throw new Error(`${name} add algorithm close button is too small on mobile: ${JSON.stringify(box)}`);
  }
  } finally {
    await page.close();
  }
}

function profileName(profile) {
  return typeof profile === 'string' ? profile : profile.name;
}

async function goto(page, route) {
  const url = `${baseUrl}${route}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (error) {
    if (!String(error?.message || error).includes('ERR_NETWORK_IO_SUSPENDED')) throw error;
    await page.waitForTimeout(1000);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

async function runLanguageSelectorSmoke(page, profile) {
  await goto(page, '/');
  const selector = page.locator('header select').first();
  await selector.selectOption('es');
  await page.waitForFunction(() => document.documentElement.lang.startsWith('es'), null, { timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} Spanish language switch`);
  await assertNoTinyTapTargets(page, `${profile} Spanish language switch`);
  await selector.selectOption('ar');
  await page.waitForFunction(() => document.documentElement.lang.startsWith('ar') && document.documentElement.dir === 'rtl', null, { timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} Arabic RTL language switch`);
  await assertNoTinyTapTargets(page, `${profile} Arabic RTL language switch`);
  await selector.selectOption('en');
  await page.waitForFunction(() => document.documentElement.lang.startsWith('en') && document.documentElement.dir === 'ltr', null, { timeout: 15000 });
}

async function login(page) {
  await page.evaluate(async ({ adminEmail, adminPassword }) => {
    const form = new FormData();
    form.set('email', adminEmail);
    form.set('password', adminPassword);
    form.set('callbackUrl', '/admin');
    await fetch('/api/auth/login', { method: 'POST', body: form, redirect: 'manual' });
  }, { adminEmail, adminPassword });
}

async function dismissPasswordReminder(page) {
  const laterButton = page.getByRole('button', { name: /^Later$/i });
  await laterButton.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
  if (await laterButton.isVisible().catch(() => false)) await laterButton.click();
}

async function runPublicDetailSmoke(page, profile) {
  await goto(page, '/algorithms');
  const algorithmLink = page.locator('a[href^="/algorithms/"]').first();
  if (await algorithmLink.count()) {
    await algorithmLink.click();
    await page.waitForURL(/\/algorithms\/[^/?#]+/, { timeout: 15000 });
    await assertNoHorizontalOverflow(page, `${profile} algorithm detail`);
    await assertNoTinyTapTargets(page, `${profile} algorithm detail`);
  }

  await goto(page, '/stories');
  const storyLink = page.locator('a[href^="/stories/"]').first();
  if (await storyLink.count()) {
    await storyLink.click();
    await page.waitForURL(/\/stories\/[^/?#]+/, { timeout: 15000 });
    await assertNoHorizontalOverflow(page, `${profile} story detail`);
    await assertNoTinyTapTargets(page, `${profile} story detail`);
    const shareSummary = page.locator('summary').filter({ hasText: /^Share$/ }).first();
    if (await shareSummary.count()) {
      await shareSummary.click();
      await page.getByRole('menu').waitFor({ timeout: 15000 });
      await assertNoHorizontalOverflow(page, `${profile} story share menu`);
      await assertNoTinyTapTargets(page, `${profile} story share menu`);
    }
  }
}

async function runEventModalSmoke(page, profile) {
  await goto(page, '/events');
  const detailsButton = page.getByRole('button', { name: /details for/i }).first();
  if (!await detailsButton.count()) return;

  await detailsButton.click();
  await page.getByRole('dialog').waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} event details modal`);
  await assertNoTinyTapTargets(page, `${profile} event details modal`);
  await page.getByRole('button', { name: /^Close event details$/i }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });
}

async function runPartnerApplicationSmoke(page, profile) {
  await goto(page, '/about');
  await page.getByRole('button', { name: /^Apply to partner$/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} partner application modal`);
  await assertNoTinyTapTargets(page, `${profile} partner application modal`);
  await page.getByRole('button', { name: /^Close partner application$/i }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });
}

async function runMyStoriesSmoke(page, profile) {
  await goto(page, '/my-stories');
  await dismissPasswordReminder(page);
  await assertNoHorizontalOverflow(page, `${profile} my stories`);
  await assertNoTinyTapTargets(page, `${profile} my stories`);

  const editLink = page.locator('a[href^="/my-stories/"][href$="/edit"]').first();
  if (await editLink.count()) {
    await editLink.click();
    await page.waitForURL(/\/my-stories\/[^/?#]+\/edit/, { timeout: 15000 });
    await page.getByRole('button', { name: /Resubmit for Review/i }).waitFor({ timeout: 15000 });
    await assertNoHorizontalOverflow(page, `${profile} edit my story`);
    await assertNoTinyTapTargets(page, `${profile} edit my story`);
  }
}

async function runAuthModalSmoke(page, profile) {
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Sign up$/i }).click();
  await page.getByRole('heading', { name: /^Signup$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} signup modal`);
  await assertNoTinyTapTargets(page, `${profile} signup modal`);

  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Login$/i }).click();
  await page.getByRole('heading', { name: /^Login$/i }).waitFor({ timeout: 15000 });
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Forgot password\?$/i }).click();
  await page.getByRole('heading', { name: /^Reset password$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} reset password modal`);
  await assertNoTinyTapTargets(page, `${profile} reset password modal`);

  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Back to login$/i }).click();
  await page.getByRole('heading', { name: /^Login$/i }).waitFor({ timeout: 15000 });
}

async function runRoleSettingsSmoke(page, profile) {
  await goto(page, '/admin/users');
  await page.getByRole('button', { name: /^Role settings$/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} role settings modal`);
  await assertNoTinyTapTargets(page, `${profile} role settings modal`);
  await page.getByRole('button', { name: /^Close role settings$/i }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });
}

async function runAdminAddEventSmoke(page, profile) {
  await goto(page, '/admin/events');
  await page.getByRole('button', { name: /^Add event$/i }).click();
  await page.getByRole('heading', { name: /^Add event$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} add event form`);
  await assertNoTinyTapTargets(page, `${profile} add event form`);
}

async function runAdminAddOrganizationSmoke(page, profile) {
  await goto(page, '/admin/organizations');
  await page.getByRole('button', { name: /^Add organization$/i }).click();
  await page.getByRole('heading', { name: /^Add organization$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} add organization form`);
  await assertNoTinyTapTargets(page, `${profile} add organization form`);
}

async function runAdminAlgorithmCardSmoke(page, profile) {
  await goto(page, '/admin/algorithms');
  const firstCard = page.locator('article').first();
  if (!await firstCard.count()) return;

  await firstCard.getByRole('button', { name: /^View$/i }).click();
  await firstCard.getByRole('button', { name: /^Edit this algorithm$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} algorithm card details`);
  await assertNoTinyTapTargets(page, `${profile} algorithm card details`);

  await firstCard.getByRole('button', { name: /^Edit$/i }).click();
  await firstCard.getByRole('button', { name: /^Save changes$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} algorithm edit form`);
  await assertNoTinyTapTargets(page, `${profile} algorithm edit form`);
}

async function runAdminTestimonyPanelsSmoke(page, profile) {
  const firstTestimony = page.locator('form[action*="/api/admin/testimonies/"]').first();
  if (!await firstTestimony.count()) return;

  const storyDetails = firstTestimony.getByRole('button', { name: /^Expand Story details$/i }).first();
  if (await storyDetails.count()) {
    await storyDetails.click();
    await assertNoHorizontalOverflow(page, `${profile} expanded story details`);
    await assertNoTinyTapTargets(page, `${profile} expanded story details`);
  }

  const mlPipeline = firstTestimony.getByRole('button', { name: /^Expand ML Pipeline$/i }).first();
  if (await mlPipeline.count()) {
    await mlPipeline.click();
    await firstTestimony.getByText(/Task 2 impact classification/i).waitFor({ timeout: 15000 });
    await assertNoHorizontalOverflow(page, `${profile} expanded ML Pipeline`);
    await assertNoTinyTapTargets(page, `${profile} expanded ML Pipeline`);
  }
}

async function runSubmitReviewSmoke(page, profile) {
  await goto(page, '/submit-testimony');
  await page.evaluate(() => window.localStorage.removeItem('algostories-submit-draft'));
  await goto(page, '/submit-testimony');

  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.locator('input[name="uncertainSystem"]').check();
  await page.locator('select[name="affectedDomain"]').selectOption('Housing');
  await assertNoHorizontalOverflow(page, `${profile} submit step 2`);
  await assertNoTinyTapTargets(page, `${profile} submit step 2`);

  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.locator('input[name="title"]').fill('Mobile smoke story');
  await page.locator('textarea[name="narrativeText"]').fill('A short mobile smoke story about a housing decision that needs review.');
  await assertNoHorizontalOverflow(page, `${profile} submit step 3`);
  await assertNoTinyTapTargets(page, `${profile} submit step 3`);

  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.locator('input[name="city"]').fill('Pittsburgh');
  await assertNoHorizontalOverflow(page, `${profile} submit step 4`);
  await assertNoTinyTapTargets(page, `${profile} submit step 4`);

  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.getByText('Mobile smoke story', { exact: true }).waitFor({ timeout: 15000 });
  await page.getByText('A short mobile smoke story about a housing decision that needs review.').waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} submit review`);
  await assertNoTinyTapTargets(page, `${profile} submit review`);
}

async function runSubmitVideoMediaSmoke(page, profile) {
  let presignBody = null;
  let uploaded = false;

  await page.route('**/api/uploads/presign', async (route) => {
    presignBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uploadUrl: `${baseUrl}/submit-video-smoke-upload`,
        objectKey: 'testimonies/video/submit-video-smoke.mov',
        storageUri: 'gcs://mobile-smoke/testimonies/video/submit-video-smoke.mov',
        provider: 'firebase-gcs',
        contentType: presignBody.contentType,
      }),
    });
  });
  await page.route('**/submit-video-smoke-upload', async (route) => {
    uploaded = route.request().method() === 'PUT';
    await route.fulfill({ status: 200, body: '' });
  });

  try {
    await goto(page, '/submit-testimony');
    await page.evaluate(() => window.localStorage.removeItem('algostories-submit-draft'));
    await goto(page, '/submit-testimony');

    await page.getByRole('button', { name: /Record your story/i }).click();
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.locator('input[name="uncertainSystem"]').check();
    await page.locator('select[name="affectedDomain"]').selectOption('Housing');
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.locator('input[name="title"]').fill('Mobile video smoke story');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'submit-video-smoke.mov',
      mimeType: 'video/quicktime',
      buffer: Buffer.from('submit video smoke placeholder'),
    });
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.locator('input[name="city"]').waitFor({ timeout: 20000 });

    if (presignBody?.kind !== 'video') {
      throw new Error(`Submit video media used wrong presign kind: ${JSON.stringify(presignBody)}`);
    }
    if (!uploaded) throw new Error('Submit video media did not PUT the selected video file.');

    await page.locator('input[name="city"]').fill('Pittsburgh');
    await assertNoHorizontalOverflow(page, `${profile} submit video details`);
    await assertNoTinyTapTargets(page, `${profile} submit video details`);
    await page.getByRole('button', { name: /^Next$/i }).click();
    await page.getByText('Mobile video smoke story', { exact: true }).waitFor({ timeout: 15000 });
    await page.getByText(/Media uploaded/i).waitFor({ timeout: 15000 });
    await assertNoHorizontalOverflow(page, `${profile} submit video review`);
    await assertNoTinyTapTargets(page, `${profile} submit video review`);
  } finally {
    await page.unroute('**/api/uploads/presign').catch(() => {});
    await page.unroute('**/submit-video-smoke-upload').catch(() => {});
  }
}

async function runMlQuickTestSmoke(page) {
  await page.route('**/api/ml/quick-test', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        result: {
          summary: 'A resident reports a housing decision that needs review.',
          task1: { status: 'SKIPPED', reason: 'Text input does not need transcription.' },
          task2: { status: 'COMPLETED', aiImpactClassification: 'NEGATIVE', aiConfidenceScore: 0.88, humanReviewRequired: false },
          task3: { status: 'COMPLETED', aiThemes: [{ theme: 'ACCESS_TO_SERVICES', confidence: 0.81 }] },
          task4: { status: 'COMPLETED', entities: { agencies: ['Housing Authority'], locations: ['Pittsburgh'], systems: ['voucher portal'], dates: [], people_roles: ['caseworker'] } },
          task5: { status: 'COMPLETED', keywords: ['housing voucher', 'caseworker'] },
        },
      }),
    });
  });

  const quickTest = page.getByTestId('ml-quick-test');
  await quickTest.locator('textarea[name="narrative_text"]').fill('My housing voucher review was delayed by an automated portal.');
  await quickTest.getByRole('button', { name: /^Run ML test$/i }).click();
  await quickTest.getByText(/Task 2 impact classification/i).waitFor({ timeout: 15000 });
  await quickTest.getByText('NEGATIVE').waitFor({ timeout: 15000 });
  await quickTest.getByText('housing voucher', { exact: true }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, 'admin ML Quick Test result');
  await assertNoTinyTapTargets(page, 'admin ML Quick Test result');
  await page.unroute('**/api/ml/quick-test');
}

async function runMlQuickTestVideoSmoke(page) {
  let presignBody = null;
  let uploaded = false;
  const quickTestBodies = [];

  await page.route('**/api/uploads/presign', async (route) => {
    presignBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uploadUrl: `${baseUrl}/mobile-smoke-video-upload`,
        objectKey: 'testimonies/video/mobile-smoke.mov',
        storageUri: 'gcs://mobile-smoke/testimonies/video/mobile-smoke.mov',
        provider: 'firebase-gcs',
        contentType: presignBody.contentType,
      }),
    });
  });
  await page.route('**/mobile-smoke-video-upload', async (route) => {
    uploaded = route.request().method() === 'PUT';
    await route.fulfill({ status: 200, body: '' });
  });
  await page.route('**/api/ml/quick-test', async (route) => {
    const quickTestBody = route.request().postDataJSON();
    quickTestBodies.push(quickTestBody);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        result: {
          summary: 'A short video story was transcribed from its audio track.',
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          task1: {
            status: 'COMPLETED',
            tool: 'openai/whisper-large-v3',
            inputFile: 'mobile-smoke.mov',
            transcript: 'A short video story was transcribed from its audio track.',
            rawTranscript: 'A short video story was transcribed from its audio track.',
            segments: [],
          },
        },
      }),
    });
  });

  try {
    const quickTest = page.getByTestId('ml-quick-test');
    await quickTest.locator('textarea[name="narrative_text"]').fill('');
    await quickTest.locator('#ml-quick-test-audio').setInputFiles({
      name: 'mobile-smoke.mov',
      mimeType: 'video/quicktime',
      buffer: Buffer.from('mobile smoke video placeholder'),
    });
    await quickTest.getByRole('button', { name: /^Run ML test$/i }).click();
    await quickTest.getByText(/Task 1 transcription/i).waitFor({ timeout: 20000 });
    await quickTest.getByText(/A short video story was transcribed/i).first().waitFor({ timeout: 20000 });
    if (presignBody?.kind !== 'video') {
      throw new Error(`ML Quick Test video upload used wrong presign kind: ${JSON.stringify(presignBody)}`);
    }
    if (!uploaded) throw new Error('ML Quick Test video upload did not PUT the selected video file.');
    if (!quickTestBodies.some((body) => body?.mediaObjectKey === 'testimonies/video/mobile-smoke.mov')) {
      throw new Error(`ML Quick Test video did not run from stored media: ${JSON.stringify(quickTestBodies)}`);
    }
    await assertNoHorizontalOverflow(page, 'admin ML Quick Test video result');
    await assertNoTinyTapTargets(page, 'admin ML Quick Test video result');
  } finally {
    await page.unroute('**/api/uploads/presign').catch(() => {});
    await page.unroute('**/mobile-smoke-video-upload').catch(() => {});
    await page.unroute('**/api/ml/quick-test').catch(() => {});
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
  });
  if (overflow > 1) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}

async function assertNoTinyTapTargets(page, label) {
  const badTargets = await page.evaluate(() => Array.from(document.querySelectorAll('button,a,input:not([type="hidden"]),select,textarea'))
    .map((element) => {
      const hitElement = (element.matches('input[type="checkbox"],input[type="radio"],input[type="file"]') && element.closest('label')) || element;
      const box = hitElement.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        text: (element.innerText || element.value || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('href') || '').trim().slice(0, 80),
        width: Math.round(box.width),
        height: Math.round(box.height),
        display: style.display,
        visibility: style.visibility,
        disabled: Boolean(element.disabled),
      };
    })
    .filter((target) => target.display !== 'none'
      && target.visibility !== 'hidden'
      && !target.disabled
      && target.width > 0
      && target.height > 0
      && (target.width < 32 || target.height < 32))
    .slice(0, 5));

  if (badTargets.length) {
    throw new Error(`${label} has tiny tap targets: ${JSON.stringify(badTargets)}`);
  }
}
