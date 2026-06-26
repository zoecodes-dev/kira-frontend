import { chromium } from 'playwright';
const SHOT = '/private/tmp/claude-501/-Users-zoe-kira-workspace/478acc58-7c5b-459f-96d1-3e380410e77d/scratchpad';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto('http://localhost:3137/supply-chain/map', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOT}/diag-01-initial.png`, fullPage: true });

// 데모 로드
const demo = page.locator('button', { hasText: '데모 데이터 불러오기' });
if (await demo.count()) { await demo.click(); await page.waitForTimeout(1000); }
await page.screenshot({ path: `${SHOT}/diag-02-demo.png`, fullPage: true });

console.log('=== ERRORS (' + errs.length + ') ===');
errs.slice(0, 40).forEach(e => console.log(e));
await browser.close();
