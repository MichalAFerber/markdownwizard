// Serve the repo with the EXACT CSP from _headers and exercise the app,
// failing on any securitypolicyviolation or console error.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/user/markdownwizard';
const CSP = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8')
  .split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'))
  .split('Content-Security-Policy:')[1].trim();
console.log('CSP under test:\n  ' + CSP + '\n');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(ROOT, url === '/' ? 'index.html' : decodeURIComponent(url));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('nope');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Content-Security-Policy': CSP,
  });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
const violations = [];
const errors = [];
await page.addInitScript(() => {
  document.addEventListener('securitypolicyviolation', (e) => {
    (window.__csp ||= []).push(`${e.violatedDirective} blocked ${e.blockedURI}`);
  });
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });

// Exercise the real features the CSP could plausibly break.
const md = [
  '# Heading', '', 'Text with **bold** and a [link](https://ex.com).', '',
  '![data uri](data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22%3E%3Crect width=%2210%22 height=%2210%22 fill=%22red%22/%3E%3C/svg%3E)', '',
  '![remote](https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png)', '',
  '| a | b |', '|---|---|', '| 1 | 2 |', '', '```js', 'const x = 1;', '```',
].join('\n');
await page.evaluate((t) => {
  const ed = document.querySelector('textarea') || document.querySelector('[contenteditable]');
  if (ed && 'value' in ed) { ed.value = t; ed.dispatchEvent(new Event('input', { bubbles: true })); }
}, md);
await page.waitForTimeout(1200);

const previewHtml = await page.evaluate(() => document.body.innerHTML.length);
await page.click('#btnTheme').catch(() => {});
await page.waitForTimeout(300);

// The print path builds an iframe srcdoc with an inline <style> — the directive
// most likely to trip. Trigger the build without opening a print dialog.
await page.evaluate(() => {
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
  f.srcdoc = '<!doctype html><html><head><style>body{color:red}</style></head><body><p>x</p></body></html>';
  document.body.appendChild(f);
  return new Promise((r) => { f.onload = r; setTimeout(r, 2000); });
});
await page.waitForTimeout(500);

const csp = await page.evaluate(() => window.__csp || []);
violations.push(...csp);
await browser.close(); server.close();

console.log(`preview rendered: ${previewHtml > 1000 ? 'yes' : 'NO'}`);
console.log(`CSP violations: ${violations.length ? '\n  - ' + violations.join('\n  - ') : 'none'}`);
console.log(`console errors: ${errors.length ? '\n  - ' + errors.join('\n  - ') : 'none'}`);
process.exit(violations.length || errors.length ? 1 : 0);
