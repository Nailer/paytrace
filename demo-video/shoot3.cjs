const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1.6 });
  await p.goto('https://paytrace-tau.vercel.app/guide', { waitUntil: 'networkidle' });
  await p.locator('summary', { hasText: 'Needs review' }).click();
  await p.waitForTimeout(400);
  await p.locator('.guide-faq').screenshot({ path: 'pages/guide_faq.png' });
  await b.close();
})();
