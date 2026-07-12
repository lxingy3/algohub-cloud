import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const baseUrl = process.argv[2] || 'http://127.0.0.1:3100';
const outputDir = 'output/playwright/ux-filters';
const sessionToken = `ux-filter-check-${randomUUID()}`;
await mkdir(outputDir, { recursive: true });

const admin = await prisma.user.findFirst({
  where: { userRoles: { some: { role: { name: 'ADMIN' } } } },
  select: { id: true, email: true },
});
if (!admin) throw new Error('No admin user is available for the UX check.');
await prisma.session.create({ data: { sessionToken, userId: admin.id, expires: new Date(Date.now() + 3_600_000) } });

const browser = await chromium.launch({ headless: true });
const checks = {};
const failures = [];

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'algohub_session', value: sessionToken, url: baseUrl }]);
  const page = await context.newPage();

  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.dashboardCards = await page.locator('a[href^="/admin/"]').filter({ has: page.locator('.text-3xl') }).count();
  checks.dashboardHrefs = await page.locator('a[href^="/admin/"]').filter({ has: page.locator('.text-3xl') }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
  const pendingOrganizations = Number(await page.locator('a[href="/admin/organizations?status=pending"] .text-3xl').textContent());
  const draftBriefings = Number(await page.locator('a[href="/admin/briefings?status=DRAFT"] .text-3xl').textContent());

  await page.goto(`${baseUrl}/admin/events?period=upcoming`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.eventPeriod = await page.locator('select[name="period"]').inputValue();
  checks.eventReturnTo = await page.locator('input[name="returnTo"]').first().inputValue();
  page.once('dialog', async (dialog) => {
    checks.eventDeleteConfirmation = dialog.type() === 'confirm';
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await page.goto(`${baseUrl}/admin/events?search=__no_such_event__`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.eventEmpty = await page.getByText('No events match these filters.').isVisible();

  await page.goto(`${baseUrl}/admin/organizations?status=pending`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.pendingOrganizationRows = await page.locator('article').count();
  checks.organizationStatus = await page.locator('select[name="status"]').inputValue();

  await page.goto(`${baseUrl}/admin/users?search=${encodeURIComponent(admin.email)}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const userList = page.locator('section').filter({ has: page.getByRole('heading', { name: 'All users' }) }).last();
  checks.userSearchMatches = await userList.getByText(admin.email, { exact: true }).count();
  checks.userEditActions = await userList.getByRole('button', { name: 'Edit profile' }).count();
  checks.userSignOutActions = await userList.getByRole('button', { name: /Sign out/ }).count();
  checks.currentAdminSignOutOthers = await userList.getByRole('button', { name: /Sign out others/ }).count();
  await userList.getByRole('button', { name: 'Edit profile' }).first().click();
  checks.userEditorVisible = await page.getByRole('heading', { name: 'Edit user profile' }).isVisible();
  await page.getByRole('button', { name: 'Close user editor' }).click();
  await page.screenshot({ path: `${outputDir}/admin-users.png`, fullPage: true });

  await page.goto(`${baseUrl}/admin/briefings?status=DRAFT`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.draftBriefingRows = await page.locator('article').count();
  checks.briefingSearchVisible = await page.locator('input[name="search"]').isVisible();

  await page.goto(`${baseUrl}/admin/comments`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.commentStoryLinks = await page.locator('a[href^="/stories/"]').count();

  await page.goto(`${baseUrl}/algorithms?search=Housing&location=Pittsburgh&useCase=${encodeURIComponent('Housing Prioritization')}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.algorithmUseCasePreserved = await page.locator('input[name="useCase"]').inputValue();
  checks.allUseCasesHref = await page.getByRole('link', { name: 'All Use Cases' }).getAttribute('href');
  await page.goto(`${baseUrl}/algorithms?search=__no_such_algorithm__`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.algorithmEmpty = await page.getByText('No algorithms match these filters').isVisible();

  await page.goto(`${baseUrl}/stories?search=__no_such_story__`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.storyEmpty = await page.getByText('No stories match these filters').isVisible();
  checks.storyClear = await page.getByRole('link', { name: 'Clear filters' }).first().isVisible();
  const storyImpact = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Community Impact' }) }).last();
  checks.filteredStoryMetric = await storyImpact.getByText('Stories Shared').locator('..').getByText('0', { exact: true }).count();

  await page.goto(`${baseUrl}/events?filter=upcoming`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  checks.eventClear = await page.getByRole('link', { name: 'Clear filters' }).isVisible();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobileContext.addCookies([{ name: 'algohub_session', value: sessionToken, url: baseUrl }]);
  const mobile = await mobileContext.newPage();
  for (const [name, route] of [['events', '/admin/events?period=upcoming'], ['organizations', '/admin/organizations?status=pending'], ['stories', '/stories?search=__no_such_story__']]) {
    if (name === 'stories') await mobileContext.clearCookies();
    await mobile.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    checks[`${name}MobileWidth`] = await mobile.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
  }
  await page.goto(`${baseUrl}/admin/events?period=upcoming`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.screenshot({ path: `${outputDir}/admin-events.png`, fullPage: true });
  await mobile.screenshot({ path: `${outputDir}/mobile-stories-empty.png`, fullPage: true });

  if (checks.dashboardCards !== 8) failures.push(`Expected 8 dashboard cards, got ${checks.dashboardCards}`);
  for (const href of ['/admin/events?period=upcoming', '/admin/organizations?status=pending']) {
    if (!checks.dashboardHrefs.includes(href)) failures.push(`Missing dashboard link ${href}`);
  }
  if (checks.eventPeriod !== 'upcoming' || checks.eventReturnTo !== '/admin/events?period=upcoming' || !checks.eventDeleteConfirmation) failures.push('Event filter, return path, or delete confirmation is incomplete');
  if (!checks.eventEmpty) failures.push('Event empty state is missing');
  if (checks.pendingOrganizationRows !== pendingOrganizations || checks.organizationStatus !== 'pending') failures.push('Pending organization filter does not match the dashboard count');
  if (checks.userSearchMatches !== 1 || checks.userEditActions < 1 || checks.userSignOutActions !== checks.userEditActions || checks.currentAdminSignOutOthers !== 1 || !checks.userEditorVisible) failures.push('Admin user search or account actions are incomplete');
  if (checks.draftBriefingRows !== draftBriefings || !checks.briefingSearchVisible) failures.push('Draft briefing filter does not match the dashboard count');
  if (!checks.commentStoryLinks) failures.push('Comment rows do not link to their source stories');
  if (checks.algorithmUseCasePreserved !== 'Housing Prioritization' || !checks.allUseCasesHref?.includes('search=Housing') || !checks.allUseCasesHref?.includes('location=Pittsburgh')) failures.push('Public algorithm filters do not preserve search and location');
  if (!checks.algorithmEmpty || !checks.storyEmpty || !checks.storyClear || checks.filteredStoryMetric !== 1 || !checks.eventClear) failures.push('Public filter empty/reset states or filtered metrics are incomplete');
  for (const name of ['events', 'organizations', 'stories']) {
    const [width, scrollWidth] = checks[`${name}MobileWidth`];
    if (width !== scrollWidth) failures.push(`${name} overflows on mobile (${scrollWidth} > ${width})`);
  }

  console.log(JSON.stringify({ checks, failures, outputDir }, null, 2));
  if (failures.length) process.exitCode = 1;
  await mobileContext.close();
  await context.close();
} finally {
  await browser.close();
  await prisma.session.deleteMany({ where: { sessionToken } });
  await prisma.$disconnect();
}
