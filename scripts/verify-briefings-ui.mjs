import { chromium } from 'playwright';

const baseUrlArgument = process.argv.find((value, index, values) => values[index - 1] === '--base-url');
const baseUrl = baseUrlArgument || process.env.BRIEFINGS_BASE_URL || 'http://127.0.0.1:3011';
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

async function openPage(page, url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
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
      await openPage(page, url);
      await page.getByRole('heading', { name: 'Briefings' }).waitFor();
      for (const code of route.codes) {
        await page.getByText(code, { exact: true }).first().waitFor({ timeout: 15000 });
      }
      if (route.lens === 'community' && route.scope === 'overview') {
        const treemapArticle = page.locator('article').filter({ hasText: 'CC1' }).first();
        await treemapArticle.getByText('Loading live data for this chart...').waitFor({ state: 'detached', timeout: 90000 });
        const cells = await treemapArticle.locator('[data-treemap-cell]').evaluateAll((nodes) => nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            value: Number(node.dataset.treemapValue),
            area: Number.parseFloat(node.style.width) * Number.parseFloat(node.style.height),
            aspect: Math.max(rect.width / rect.height, rect.height / rect.width),
          };
        }));
        assert(cells.length > 0, `${viewport.name} CC1 returned no treemap cells.`);
        const areaPerValue = cells.map((cell) => cell.area / cell.value);
        const maxAreaPerValue = Math.max(...areaPerValue);
        const areaRange = Math.max(...areaPerValue) - Math.min(...areaPerValue);
        assert(areaRange / maxAreaPerValue < 0.00001, `${viewport.name} CC1 cell area was not proportional to count (relative range ${areaRange / maxAreaPerValue}).`);
        const maxAspect = Math.max(...cells.map((cell) => cell.aspect));
        assert(maxAspect < 5, `${viewport.name} CC1 contained an excessively narrow cell (aspect ratio ${maxAspect}).`);
      }
      const unexpected = await page.locator('article').evaluateAll((articles, expected) => articles
        .map((article) => article.textContent.match(/\b(?:CC|IC|GC|C|L|G)\d+\b/)?.[0])
        .filter(Boolean)
        .filter((code) => !expected.includes(code)), route.codes);
      assert(!unexpected.length, `${viewport.name} ${route.lens}/${route.scope} had unexpected blocks: ${unexpected.join(', ')}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 2, `${viewport.name} ${route.lens}/${route.scope} overflowed by ${overflow}px`);
      const reading = page.getByLabel('Reading level').first();
      for (let attempt = 0; attempt < 100 && await reading.inputValue() !== 'detailed'; attempt += 1) await page.waitForTimeout(100);
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
  const auditContext = await browser.newContext({ viewport: viewports[0] });
  const auditPage = await auditContext.newPage();
  for (const audit of [
    { lens: 'community', code: 'CC3' },
    { lens: 'community', code: 'CC4' },
    { lens: 'community', code: 'CC5' },
    { lens: 'intermediary', code: 'IC4' },
  ]) {
    await openPage(auditPage, `${baseUrl}/briefings?lens=${audit.lens}&scope=overview&reading=detailed&language=en`);
    const article = auditPage.locator('article').filter({ hasText: audit.code }).first();
    await article.getByText('Loading live data for this chart...').waitFor({ state: 'detached', timeout: 90000 });
    await article.getByRole('button', { name: 'View evidence' }).click();
    const details = auditPage.getByRole('button', { name: 'Details' }).first();
    await details.waitFor({ timeout: 30000 });
    await details.click();
    const countText = await auditPage.getByText(/Counted total:/).last().textContent();
    const countedTotal = Number(countText?.match(/\d+/)?.[0]);
    const storyRows = await auditPage.getByRole('link', { name: 'Open story' }).count();
    assert(countedTotal === storyRows, `${audit.code} counted ${countedTotal}, but the drilldown showed ${storyRows} stories.`);
    await auditPage.getByRole('button', { name: 'Close count details' }).click();
    await auditPage.getByRole('button', { name: 'Close evidence' }).click();
  }
  await auditContext.close();

  const navigationContext = await browser.newContext({ viewport: viewports[0] });
  const navigationPage = await navigationContext.newPage();
  await openPage(navigationPage, `${baseUrl}/briefings/explore?lens=community&scope=algorithm&algorithm=energy-consumption-predictor&domain=Energy+Forecasting&reading=detailed&language=en`);
  const algorithmSelect = navigationPage.getByLabel('Algorithm');
  await algorithmSelect.waitFor();
  for (let attempt = 0; attempt < 100 && await algorithmSelect.inputValue() !== 'energy-consumption-predictor'; attempt += 1) await navigationPage.waitForTimeout(100);
  await navigationPage.waitForTimeout(1000);
  assert(new URL(navigationPage.url()).searchParams.get('algorithm') === 'energy-consumption-predictor', 'A dynamic algorithm deep link was replaced by a fallback algorithm.');
  assert(new URL(navigationPage.url()).searchParams.get('domain') === 'Energy Forecasting', 'A dynamic domain deep link was discarded.');
  await openPage(navigationPage, `${baseUrl}/briefings/explore?lens=community&scope=overview&reading=detailed&language=en`);
  const evidenceButton = navigationPage.getByRole('button', { name: 'View evidence' }).first();
  await evidenceButton.click();
  assert(await navigationPage.getByRole('button', { name: 'Close evidence' }).evaluate((node) => node === document.activeElement), 'Evidence dialog did not receive initial focus.');
  await navigationPage.goBack();
  await navigationPage.getByRole('button', { name: 'Close evidence' }).waitFor({ state: 'detached' });
  await navigationPage.goForward();
  await navigationPage.getByRole('button', { name: 'Close evidence' }).waitFor();
  await navigationPage.keyboard.press('Escape');
  await navigationPage.getByRole('button', { name: 'Close evidence' }).waitFor({ state: 'detached' });
  assert(await evidenceButton.evaluate((node) => node === document.activeElement), 'Evidence dialog did not restore focus after Escape.');
  await navigationContext.close();

  const [briefings, communityClaims, governmentClaims] = await Promise.all([
    fetch(`${baseUrl}/api/briefings`).then((response) => response.json()),
    fetch(`${baseUrl}/api/explore/claim-vs-experience?lens=community`).then((response) => response.json()),
    fetch(`${baseUrl}/api/explore/claim-vs-experience?lens=government`).then((response) => response.json()),
  ]);
  assert(briefings.items?.every((item) => item.reviewStatus === 'PUBLISHED' && item.reviewedAt && item.reviewedBy?.name), 'A published briefing is missing review provenance.');
  assert(communityClaims.rows?.every((row) => row.experienceCount === row.experienceMembers?.length), 'A claim count does not match its story members.');
  assert(governmentClaims.rows?.every((row) => !row.experienceExamples?.length && !row.experienceMembers?.length), 'Government claim rows exposed story members.');
  console.log(JSON.stringify({
    baseUrl,
    views: results.length,
    blocksChecked: results.reduce((sum, item) => sum + item.blocks, 0),
    drilldownsChecked: 4,
    navigationAndDialogState: 'verified',
    publishedReviewProvenance: 'verified',
    governmentStoryPrivacy: 'verified',
    results,
  }, null, 2));
} finally {
  await browser.close();
}
