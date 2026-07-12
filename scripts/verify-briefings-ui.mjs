import { chromium } from 'playwright';

const baseUrl = process.env.BRIEFINGS_BASE_URL || 'http://127.0.0.1:3011';
const routes = [
  { lens: 'community', scope: 'overview', codes: range('CC', 8) },
  { lens: 'intermediary', scope: 'overview', codes: range('IC', 9) },
  { lens: 'government', scope: 'overview', codes: range('GC', 9) },
  { lens: 'community', scope: 'algorithm', codes: range('C', 9) },
  { lens: 'intermediary', scope: 'algorithm', codes: range('L', 8) },
  { lens: 'government', scope: 'algorithm', codes: range('G', 9) },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

function range(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    for (const route of routes) {
      const url = `${baseUrl}/briefings?lens=${route.lens}&scope=${route.scope}&reading=detailed&language=en`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.getByRole('heading', { name: 'Briefings' }).waitFor();
      for (const code of route.codes) {
        await page.getByText(code, { exact: true }).first().waitFor({ timeout: 15000 });
      }
      const unexpected = await page.locator('article').evaluateAll((articles, expected) => articles
        .map((article) => article.textContent.match(/\b(?:CC|IC|GC|C|L|G)\d+\b/)?.[0])
        .filter(Boolean)
        .filter((code) => !expected.includes(code)), route.codes);
      assert(!unexpected.length, `${viewport.name} ${route.lens}/${route.scope} had unexpected blocks: ${unexpected.join(', ')}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 2, `${viewport.name} ${route.lens}/${route.scope} overflowed by ${overflow}px`);
      const reading = page.getByLabel('Reading level').first();
      for (let attempt = 0; attempt < 30 && await reading.inputValue() !== 'detailed'; attempt += 1) await page.waitForTimeout(100);
      assert(await reading.inputValue() === 'detailed', `${viewport.name} ${route.lens}/${route.scope}: URL reading level did not initialize.`);
      await reading.selectOption('plain');
      await page.waitForTimeout(400);
      const firstBlock = page.locator('article').first();
      assert(await firstBlock.getByText('ML/NLP method', { exact: true }).count() === 0, `${viewport.name} ${route.lens}/${route.scope}: plain reading level still showed method details.`);
      await reading.selectOption('detailed');
      if (viewport.name === 'mobile') await firstBlock.locator('details > summary').click();
      await page.waitForFunction(() => [...document.querySelectorAll('article h4')]
        .some((node) => node.textContent?.trim() === 'ML/NLP method' && node.getBoundingClientRect().height > 0));
      const firstEvidence = page.getByRole('button', { name: 'View evidence' }).first();
      await firstEvidence.click();
      await page.getByText('Evidence', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close evidence' }).click();
      results.push({ viewport: viewport.name, lens: route.lens, scope: route.scope, blocks: route.codes.length });
    }
    assert(!errors.length, `${viewport.name} browser errors: ${errors.join(' | ')}`);
    await context.close();
  }
  console.log(JSON.stringify({ baseUrl, views: results.length, blocksChecked: results.reduce((sum, item) => sum + item.blocks, 0), results }, null, 2));
} finally {
  await browser.close();
}
