import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.TEST_URL || 'https://palbreed.space/tools/breeding-calculator/';
const commit = process.env.COMMIT_SHA || '';
const viewports = [375, 390, 412, 430];

const browser = await chromium.launch({ headless: true });
const report = {
  url,
  commit,
  generatedAt: new Date().toISOString(),
  viewports: [],
};

try {
  for (const width of viewports) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const initial = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 500),
      runtimeTextVisible: document.body.innerText.includes('astro-island,astro-slot'),
    }));

    await page.getByRole('button', { name: 'Target → Parents' }).click();
    const target = page.locator('#pal-target');
    await target.fill('Anubis');
    await page.waitForFunction(() => {
      const text = document.querySelector('.reverse-results-panel')?.textContent || '';
      return text.includes('234') && text.includes('parent pairs');
    }, { timeout: 30000 });

    const result = await page.evaluate(() => {
      const describe = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id,
          class: typeof el.className === 'string' ? el.className : '',
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
          rect: { x: rect.x, width: rect.width, right: rect.right },
          style: {
            display: style.display,
            position: style.position,
            width: style.width,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth,
            flex: style.flex,
            flexBasis: style.flexBasis,
            overflowX: style.overflowX,
          },
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        };
      };

      const viewport = innerWidth;
      const all = [...document.querySelectorAll('body *')];
      const outsideCalculator = all.filter((el) => !el.closest('#calculator'));
      const overflowNodes = outsideCalculator
        .filter((el) => el.getBoundingClientRect().right > viewport + 0.5)
        .map(describe)
        .slice(0, 30);

      const panel = document.querySelector('.reverse-results-panel');
      const rows = [...document.querySelectorAll('.reverse-combo-row')];
      const body = document.body;
      const doc = document.documentElement;
      const panelRect = panel?.getBoundingClientRect();
      const calculator = document.querySelector('#calculator')?.getBoundingClientRect();

      return {
        viewport,
        document: {
          clientWidth: doc.clientWidth,
          scrollWidth: doc.scrollWidth,
        },
        body: {
          clientWidth: body.clientWidth,
          scrollWidth: body.scrollWidth,
        },
        calculator: calculator && { x: calculator.x, width: calculator.width, right: calculator.right },
        panel: panelRect && { x: panelRect.x, width: panelRect.width, right: panelRect.right },
        rows: rows.slice(0, 3).map((row) => {
          const rect = row.getBoundingClientRect();
          return { x: rect.x, width: rect.width, right: rect.right };
        }),
        resultText: panel?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 240),
        overflowNodes,
        pass: Boolean(
          panelRect &&
          panelRect.right <= viewport + 0.5 &&
          panelRect.width <= viewport + 0.5 &&
          body.scrollWidth === body.clientWidth
        ),
      };
    });

    report.viewports.push({ width, initial, pageErrors, ...result });
    await page.close();
  }
} finally {
  await browser.close();
}

await mkdir('qa-evidence', { recursive: true });
await writeFile('qa-evidence/mobile-dom-qa.json', JSON.stringify(report, null, 2));

const failed = report.viewports.filter((item) => !item.pass || item.pageErrors.length > 0);
console.log(JSON.stringify(report, null, 2));
if (failed.length > 0) {
  console.error(`Mobile DOM QA failed at ${failed.map((item) => `${item.width}px`).join(', ')}`);
  process.exitCode = 1;
}
