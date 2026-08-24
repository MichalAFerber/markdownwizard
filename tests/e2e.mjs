/* End-to-end test for Markdown Wizard.
   Serves the app, drives it in headless Chromium, downloads every export
   format, and validates the outputs. Run from this directory:

     npm install && node e2e.mjs

   Downloads land in tests/downloads/ for manual inspection afterwards. */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const dlDir = path.join(__dirname, 'downloads');
fs.rmSync(dlDir, { recursive: true, force: true });
fs.mkdirSync(dlDir, { recursive: true });

/* ------------------------------------------------------------ static server */

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown'
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(appDir, rel);
  try {
    const data = fs.readFileSync(file);
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

/* ------------------------------------------------------------ test document */

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect fill="#ff0000" width="40" height="20"/></svg>';
const svgURI = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const TESTDOC = [
  '# Wizard Test Document',
  '',
  'Intro with **bold**, *italic*, ~~struck~~, `inline < code`, a [styled **link**](https://ex.com/a?b=1&c=2), and AT&T entity handling.',
  '',
  'Hard break line one\\',
  'line two.',
  '',
  '## Lists',
  '',
  '1. First ordered',
  '2. Second ordered',
  '   - Nested bullet',
  '   - Another nested',
  '     1. Deep ordered',
  '3. Third',
  '',
  '- [ ] Unchecked task',
  '- [x] Checked task',
  '',
  '## Quote and code',
  '',
  '> Outer quote with **bold**',
  '> > Inner nested quote',
  '',
  '```python',
  'def hello(name):',
  '    return f"hi {name}"   # keep    spacing',
  '```',
  '',
  '## Table',
  '',
  '| Feature | Status | Score |',
  '|:--------|:------:|------:|',
  '| Export & import | **done** | 10 |',
  '| Sync scroll | [ok](https://ex.com) | 9 |',
  '',
  '## Images',
  '',
  '![tiny box](' + svgURI + ')',
  '',
  '![missing](https://127.0.0.1:1/x.png)',
  '',
  '---',
  '',
  'Unicode: café, 中文, emoji 🪄 end.',
  ''
].join('\n');

/* -------------------------------------------------------------- test driver */

let failures = [];
function check(name, cond, extra) {
  if (cond) console.log('  ok   - ' + name);
  else { console.log('  FAIL - ' + name + (extra != null ? '  [' + extra + ']' : '')); failures.push(name); }
}

// Use an explicitly provided Chromium (e.g. a preinstalled one) when the
// Playwright-managed download is not present.
const exe = process.env.MDW_CHROMIUM ||
  (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push({ text: 'pageerror: ' + e.message, url: '' }));
page.on('console', m => {
  if (m.type() === 'error') errors.push({ text: m.text(), url: (m.location() || {}).url || '' });
});

console.log('\n== first load, sample document ==');
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForSelector('#sheet h1');
check('sample h1 renders', (await page.textContent('#sheet h1')).includes('Welcome to Markdown Wizard'));
check('sample table renders', await page.locator('#sheet table').count() > 0);
check('sample task checkboxes render', await page.locator('#sheet input[type=checkbox]').count() >= 2);
check('word count shows', /\d+ words/.test(await page.textContent('#counts')));

console.log('\n== toolbar and editor behaviors ==');
await page.click('#editor');
await page.evaluate(() => {
  const ta = document.getElementById('editor');
  ta.value = 'make me bold';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
  ta.setSelectionRange(5, 7);
});
await page.click('[data-action="bold"]');
check('bold wraps selection', (await page.inputValue('#editor')) === 'make **me** bold', await page.inputValue('#editor'));
await page.waitForTimeout(300);
check('preview shows <strong>', await page.locator('#sheet strong').count() === 1);
await page.click('[data-action="bold"]');
check('bold toggles off', (await page.inputValue('#editor')) === 'make me bold', await page.inputValue('#editor'));

await page.evaluate(() => document.getElementById('editor').setSelectionRange(0, 0));
await page.click('[data-action="heading"][data-arg="2"]');
check('heading applies', (await page.inputValue('#editor')).startsWith('## make'));
await page.click('[data-action="heading"][data-arg="2"]');
check('heading toggles off', !(await page.inputValue('#editor')).startsWith('##'));

await page.evaluate(() => {
  const ta = document.getElementById('editor');
  ta.value = '- item one';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
});
await page.keyboard.press('Enter');
check('list continues on Enter', (await page.inputValue('#editor')) === '- item one\n- ', JSON.stringify(await page.inputValue('#editor')));
await page.keyboard.press('Enter');
check('empty item ends list', (await page.inputValue('#editor')) === '- item one\n', JSON.stringify(await page.inputValue('#editor')));

console.log('\n== load full test document, export all formats ==');
await page.evaluate((doc) => {
  const ta = document.getElementById('editor');
  ta.value = doc;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}, TESTDOC);
await page.fill('#docTitle', 'Wizard Test');
await page.waitForTimeout(400);
check('test doc renders img', await page.locator('#sheet img').count() >= 1);

const fmts = ['md', 'txt', 'html', 'doc', 'dot', 'rtf', 'docx', 'pdf'];
const files = {};
for (const fmt of fmts) {
  await page.click('#btnDownload');
  await page.waitForSelector('#downloadMenu:not([hidden])');
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 45000 }),
    page.click(`.mitem[data-fmt="${fmt}"]`)
  ]);
  const name = dl.suggestedFilename();
  const to = path.join(dlDir, name);
  await dl.saveAs(to);
  files[fmt] = to;
  const size = fs.statSync(to).size;
  check(`${fmt}: downloads as "Wizard Test.${fmt}"`, name === `Wizard Test.${fmt}`, name);
  check(`${fmt}: non-empty (${size}b)`, size > 0);
}

console.log('\n== validate export contents ==');
const md = fs.readFileSync(files.md, 'utf8');
check('md: exact source round-trip', md === TESTDOC);

const txt = fs.readFileSync(files.txt, 'utf8');
check('txt: heading underlined', /Wizard Test Document\n=+/.test(txt));
check('txt: entities decoded', txt.includes('AT&T'));
check('txt: bold markers stripped', txt.includes('Intro with bold, italic'));
check('txt: link keeps url', txt.includes('(https://ex.com/a?b=1&c=2)'));
check('txt: task markers', txt.includes('- [ ] Unchecked task') && txt.includes('- [x] Checked task'));
check('txt: nested list indented', /\n {3,}- Nested bullet/.test(txt) || txt.includes('   - Nested bullet'));
check('txt: table drawn', txt.includes('Feature') && txt.includes('--+--'));
check('txt: code indented', txt.includes('    def hello(name):'));
check('txt: unicode preserved', txt.includes('café, 中文'));

const html = fs.readFileSync(files.html, 'utf8');
check('html: full document', html.startsWith('<!DOCTYPE html>') && html.includes('</html>'));
check('html: styled', html.includes('<style>'));
check('html: strong rendered', html.includes('<strong>bold</strong>'));
check('html: table rendered', html.includes('<table>'));
check('html: title set', html.includes('<title>Wizard Test</title>'));
check('html: no raw script injection', !html.includes('<script'));

const doc = fs.readFileSync(files.doc, 'utf8');
check('doc: BOM present', doc.charCodeAt(0) === 0xFEFF);
check('doc: Word ProgId marker', doc.includes('Word.Document'));
check('doc: Word xml namespace', doc.includes('xmlns:w='));
const dot = fs.readFileSync(files.dot, 'utf8');
check('dot: same Word vehicle', dot.includes('Word.Document'));

const rtf = fs.readFileSync(files.rtf, 'latin1');
check('rtf: header', rtf.startsWith('{\\rtf1\\ansi'));
check('rtf: bold group', rtf.includes('{\\b bold}'));
check('rtf: hyperlink field', rtf.includes('HYPERLINK "https://ex.com/a?b=1&c=2"'));
check('rtf: table rows', rtf.includes('\\trowd') && rtf.includes('\\row'));
check('rtf: bullets', rtf.includes('\\bullet'));
check('rtf: task glyphs', rtf.includes('\\u9744?') && rtf.includes('\\u9745?'));
check('rtf: unicode escapes', rtf.includes('\\u233?') /* é */ && rtf.includes('\\u20013?') /* 中 */);
check('rtf: balanced braces', (rtf.match(/(?<!\\)\{/g) || []).length === (rtf.match(/(?<!\\)\}/g) || []).length);

const pdfHead = fs.readFileSync(files.pdf).subarray(0, 5).toString();
check('pdf: magic header', pdfHead === '%PDF-');
check('pdf: reasonable size', fs.statSync(files.pdf).size > 20000);

check('docx: zip magic', fs.readFileSync(files.docx).subarray(0, 2).toString() === 'PK');

console.log('\n== persistence, theme, reload ==');
await page.reload();
await page.waitForSelector('#sheet h1');
check('doc persists across reload', (await page.inputValue('#editor')) === TESTDOC);
check('title persists across reload', (await page.inputValue('#docTitle')) === 'Wizard Test');

const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme);
await page.click('#btnTheme');
const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
check('theme toggles', themeBefore !== themeAfter, themeBefore + '->' + themeAfter);
await page.click('#btnTheme');

await page.screenshot({ path: path.join(dlDir, 'screenshot-http.png') });

console.log('\n== file:// operation (offline / double-click use) ==');
const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors2 = [];
page2.on('pageerror', e => errors2.push('pageerror: ' + e.message));
page2.on('console', m => { if (m.type() === 'error') errors2.push(m.text()); });
await page2.goto('file://' + path.join(appDir, 'index.html'));
await page2.waitForSelector('#sheet h1');
check('file:// renders sample', (await page2.textContent('#sheet h1')).includes('Welcome'));
check('file:// no page errors', errors2.length === 0, errors2.join(' | '));

console.log('\n== console/page error audit ==');
const realErrors = errors.filter(e =>
  !e.url.includes('127.0.0.1:1/') && !e.text.includes('127.0.0.1:1/') &&
  !/Failed to load resource.*net::ERR/.test(e.text));
check('no unexpected page errors', realErrors.length === 0,
  realErrors.map(e => e.text).join(' | ').slice(0, 500));

await browser.close();
server.close();

console.log('\n' + (failures.length ? 'FAILED: ' + failures.length + ' check(s):\n  - ' + failures.join('\n  - ') : 'ALL CHECKS PASSED'));
process.exit(failures.length ? 1 : 0);
