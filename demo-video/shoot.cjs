const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' in {} ? undefined : undefined });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
  for (const [name, url] of [['home','/'],['guide','/guide'],['verify','/verify'],['checkout','/track/e76f80af43868eb8e969587eacd853851a3c6eb1b02e895d']]) {
    await p.goto('https://paytrace-tau.vercel.app' + url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `pages/${name}.png`, fullPage: true });
    console.log(name, await p.evaluate(() => document.body.scrollHeight));
  }
  await b.close();
})();
