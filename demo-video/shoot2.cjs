const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
  await p.goto('https://paytrace-tau.vercel.app/guide', { waitUntil: 'networkidle' });
  for (const t of ['Needs review']) await p.locator('summary', { hasText: t }).click();
  await p.waitForTimeout(500);
  console.log(await p.locator('details[open]').allInnerTexts());
  await p.locator('text=Know what each result means').scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollBy(0, -120));
  await p.screenshot({ path: 'pages/guide_review.png' });
  await p.goto('https://paytrace-tau.vercel.app/', { waitUntil: 'networkidle' });
  await p.screenshot({ path: 'pages/home_view.png' });
  await b.close();
})();
