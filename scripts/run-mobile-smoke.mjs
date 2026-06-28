import { chromium, devices } from 'playwright';

const baseUrl = (process.env.MOBILE_SMOKE_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const adminEmail = process.env.MOBILE_SMOKE_ADMIN_EMAIL || 'admin@algostories.local';
const adminPassword = process.env.MOBILE_SMOKE_ADMIN_PASSWORD || '';

const publicRoutes = ['/', '/algorithms', '/stories', '/events', '/about', '/submit-testimony'];
const adminRoutes = ['/admin', '/admin/algorithms', '/admin/events', '/admin/organizations', '/admin/testimonies', '/admin/comments', '/admin/users'];
const profiles = ['iPhone 13', 'Pixel 5'];

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});

try {
  for (const profile of profiles) {
    await runProfile(profile);
  }

  console.log(`mobile smoke PASS ${baseUrl} (${profiles.join(', ')})`);
} finally {
  await browser.close();
}

async function runProfile(profile) {
  const page = await browser.newPage({ ...devices[profile] });
  try {
  for (const route of publicRoutes) {
    await goto(page, route);
    await assertNoHorizontalOverflow(page, `${profile} ${route}`);
    await assertNoTinyTapTargets(page, `${profile} ${route}`);
  }
  await runSubmitReviewSmoke(page, profile);

  await page.getByRole('button', { name: /^Login$/i }).click();
  await page.getByRole('heading', { name: /^Login$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, `${profile} login modal`);

  await login(page);
  for (const route of adminRoutes) {
    await goto(page, route);
    await assertNoHorizontalOverflow(page, `${profile} ${route}`);
    await assertNoTinyTapTargets(page, `${profile} ${route}`);
  }

  await goto(page, '/admin/testimonies');
  await page.getByTestId('ml-quick-test').waitFor({ timeout: 15000 });
  const accept = await page.locator('#ml-quick-test-audio').getAttribute('accept');
  if (!String(accept || '').includes('video/*')) throw new Error('ML Quick Test media input does not accept video.');
  await runMlQuickTestSmoke(page);

  await goto(page, '/admin/algorithms');
  await page.getByRole('button', { name: /Add algorithm/i }).click();
  const closeButton = page.getByRole('button', { name: /Close add algorithm/i }).last();
  const box = await closeButton.boundingBox();
  if (!box || box.width < 40 || box.height < 40) {
    throw new Error(`${profile} add algorithm close button is too small on mobile: ${JSON.stringify(box)}`);
  }
  } finally {
    await page.close();
  }
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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

async function runSubmitReviewSmoke(page, profile) {
  await goto(page, '/submit-testimony');
  await page.evaluate(() => window.localStorage.removeItem('algostories-submit-draft'));
  await page.reload({ waitUntil: 'domcontentloaded' });

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
      const hitElement = (element.matches('input[type="checkbox"],input[type="radio"]') && element.closest('label')) || element;
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
