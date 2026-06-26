import { chromium, devices } from 'playwright';

const baseUrl = (process.env.MOBILE_SMOKE_BASE_URL || 'https://algohub-cloud-ls7r.vercel.app').replace(/\/$/, '');
const adminEmail = process.env.MOBILE_SMOKE_ADMIN_EMAIL || 'admin@algostories.local';
const adminPassword = process.env.MOBILE_SMOKE_ADMIN_PASSWORD || '';

const publicRoutes = ['/', '/algorithms', '/stories', '/events', '/about', '/submit-testimony'];
const adminRoutes = ['/admin', '/admin/algorithms', '/admin/events', '/admin/organizations', '/admin/testimonies', '/admin/comments', '/admin/users'];

const browser = await chromium.launch({
  headless: true,
  args: ['--host-resolver-rules=MAP algohub-cloud-ls7r.vercel.app 76.76.21.21'],
});

try {
  const page = await browser.newPage({ ...devices['iPhone 13'] });

  for (const route of publicRoutes) {
    await goto(page, route);
    await assertNoHorizontalOverflow(page, route);
  }

  await page.getByRole('button', { name: /^Login$/i }).click();
  await page.getByRole('heading', { name: /^Login$/i }).waitFor({ timeout: 15000 });
  await assertNoHorizontalOverflow(page, 'login modal');

  await login(page);
  for (const route of adminRoutes) {
    await goto(page, route);
    await assertNoHorizontalOverflow(page, route);
  }

  await goto(page, '/admin/testimonies');
  await page.getByTestId('ml-quick-test').waitFor({ timeout: 15000 });
  const accept = await page.locator('#ml-quick-test-audio').getAttribute('accept');
  if (!String(accept || '').includes('video/*')) throw new Error('ML Quick Test media input does not accept video.');

  await goto(page, '/admin/algorithms');
  await page.getByRole('button', { name: /Add algorithm/i }).click();
  const closeButton = page.getByRole('button', { name: /Close add algorithm/i }).last();
  const box = await closeButton.boundingBox();
  if (!box || box.width < 40 || box.height < 40) {
    throw new Error(`Add algorithm close button is too small on mobile: ${JSON.stringify(box)}`);
  }

  console.log(`mobile smoke PASS ${baseUrl}`);
} finally {
  await browser.close();
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

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
  });
  if (overflow > 1) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}
