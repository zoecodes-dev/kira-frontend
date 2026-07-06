const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleMsgs.push(`[pageerror] ${err.message}`);
  });

  const networkLog = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/files') || url.includes('/api/suppliers') && url.includes('/detail')) {
      networkLog.push(`${res.request().method()} ${url} -> ${res.status()}`);
    }
  });

  console.log('--- nav to login ---');
  await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('text=협력사 계정', { timeout: 15000 });
  await page.click('text=협력사 계정');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/partner**', { timeout: 15000 });
  console.log('logged in, url=', page.url());

  console.log('--- nav to company-info ---');
  await page.goto('http://localhost:3001/partner/company-info', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_company_info.png'), fullPage: true });

  // enter edit mode
  console.log('--- clicking 자료 제출 · 정보 입력 (edit mode) ---');
  await page.click('text=자료 제출 · 정보 입력');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_edit_mode.png'), fullPage: true });

  // Prepare a tiny VALID 1x1 PNG (avoids pdf.js choking on a fake PDF)
  const dummyPath = path.join(SCREENSHOT_DIR, 'dummy.png');
  const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  fs.writeFileSync(dummyPath, Buffer.from(pngB64, 'base64'));

  // Find upload label/input near "소재구성 문서"
  const uploadInputs = await page.locator('input[type="file"]').all();
  console.log('file inputs found:', uploadInputs.length);
  for (let i = 0; i < uploadInputs.length; i++) {
    const accept = await uploadInputs[i].getAttribute('accept');
    console.log(`  input[${i}] accept=`, accept);
  }

  // material doc input has accept=".pdf,.png,.jpg,.jpeg" (MATERIAL_DOC_ACCEPT)
  let fileInput = null;
  for (const inp of uploadInputs) {
    const accept = await inp.getAttribute('accept');
    if (accept === '.pdf,.png,.jpg,.jpeg') { fileInput = inp; break; }
  }
  if (!fileInput) { console.log('material doc input not found by accept attr, falling back to index 0'); fileInput = uploadInputs[0]; }

  console.log('--- uploading file ---');
  await fileInput.setInputFiles(dummyPath);

  // give it time to process
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_after_upload.png'), fullPage: true });

  // Check text state — find the container holding "소재구성 문서" and print its text
  const panelText = await page.locator('text=소재구성 문서').first().locator('xpath=ancestor::div[contains(@class,"rounded-sm")][1]').innerText().catch(e => '(could not read panel text: ' + e.message + ')');
  console.log('--- panel text after upload ---');
  console.log(panelText);
  const bodyText = await page.locator('body').innerText();
  const idx = bodyText.indexOf('소재구성 문서');
  console.log('--- surrounding text (body slice) ---');
  console.log(bodyText.slice(Math.max(0, idx - 20), idx + 200));

  console.log('--- network log (files/detail) ---');
  networkLog.forEach(l => console.log(l));

  console.log('--- console messages ---');
  consoleMsgs.forEach(m => console.log(m));

  await browser.close();
})().catch(e => {
  console.error('SCRIPT ERROR:', e);
  process.exit(1);
});
