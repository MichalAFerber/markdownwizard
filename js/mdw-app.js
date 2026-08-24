/* ---------------------------------------------------------------------------
   Markdown Wizard — application wiring.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SAMPLE = [
    '# Welcome to Markdown Wizard',
    '',
    'Paste text on the **left**, watch the finished document appear on the **right**,',
    'then download it in whatever format the moment calls for. Everything happens',
    'right here in your browser — your words are never uploaded anywhere.',
    '',
    '## Why this exists',
    '',
    'Sometimes someone hands you text that *may or may not* contain Markdown.',
    'Clean it up here, make it look the way you want, and send back a proper',
    'document — no vault, no sync, no cloud, ~~no drama~~.',
    '',
    '## Things to try',
    '',
    '- Format with the toolbar below, or just type Markdown by hand',
    '- Use shortcuts: **Ctrl/Cmd+B** bold, *Ctrl/Cmd+I* italic, `Ctrl/Cmd+K` link',
    '- Press Enter inside a list — it continues itself',
    '- Drag the divider between the panes to resize them',
    '- Track work with task lists:',
    '  - [x] Open Markdown Wizard',
    '  - [ ] Paste in that text someone sent you',
    '  - [ ] Download it as `.docx` and look like a professional',
    '',
    '## Download formats',
    '',
    '| Format | Best for |',
    '|:-------|:---------|',
    '| PDF | Sharing anywhere, print-ready |',
    '| DOCX | Word, Google Docs, LibreOffice |',
    '| DOC / DOT | Older Word workflows and templates |',
    '| RTF | Nearly every word processor ever made |',
    '| TXT | Plain text with formatting flattened |',
    '| HTML | A clean, self-contained web page |',
    '',
    '> **Privacy note:** this page makes no network requests with your content.',
    '> The only things ever fetched are images *you* embed by URL.',
    '',
    '```js',
    '// Even code blocks survive the trip to DOCX, RTF and PDF',
    'const wizard = { hat: true, cloud: null };',
    '```',
    '',
    '---',
    '',
    'Ready? Select everything, delete it, and paste your own text.',
    'Your work autosaves to this browser as you type.',
    ''
  ].join('\n');

  var editor, preview, sheet, titleInput, counts, divider, splitEl;
  var downloadBtn, downloadMenu;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    editor = document.getElementById('editor');
    preview = document.getElementById('preview');
    sheet = document.getElementById('sheet');
    titleInput = document.getElementById('docTitle');
    counts = document.getElementById('counts');
    divider = document.getElementById('divider');
    splitEl = document.getElementById('split');
    downloadBtn = document.getElementById('btnDownload');
    downloadMenu = document.getElementById('downloadMenu');

    MDW.getSource = function () { return editor.value; };
    MDW.getTitle = function () { return titleInput.value; };
    MDW.initEditor(editor);

    // Restore document + title (sample on first visit).
    var savedDoc = MDW.store.get('doc');
    editor.value = savedDoc != null ? savedDoc : SAMPLE;
    titleInput.value = MDW.store.get('title') || '';

    var savedSplit = parseFloat(MDW.store.get('split'));
    if (savedSplit >= 20 && savedSplit <= 80) setSplit(savedSplit);

    editor.addEventListener('input', debouncedRender);
    titleInput.addEventListener('input', MDW.debounce(function () {
      MDW.store.set('title', titleInput.value);
    }, 300));

    wireToolbar();
    wireDownloadMenu();
    wireScrollSync();
    wireDivider();
    wireTheme();
    wireFiles();
    wireGlobalKeys();

    document.getElementById('btnNew').addEventListener('click', newDoc);

    render();
  }

  /* --------------------------------------------------------------- render */

  var debouncedRender = MDW.debounce(render, 120);

  function render() {
    sheet.innerHTML = MDW.renderHTML(editor.value);
    // Links open in a new tab so a click never navigates away from your work.
    sheet.querySelectorAll('a[href]').forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    var text = sheet.textContent || '';
    var words = (text.trim().match(/\S+/g) || []).length;
    counts.textContent = words + ' word' + (words === 1 ? '' : 's') + ' · ' + text.length + ' chars';
    MDW.store.set('doc', editor.value);
  }

  /* -------------------------------------------------------------- toolbar */

  function wireToolbar() {
    var toolbar = document.getElementById('toolbar');
    // Keep focus (and the selection) in the textarea while clicking tools.
    toolbar.addEventListener('mousedown', function (ev) {
      if (ev.target.closest('.tbtn')) ev.preventDefault();
    });
    toolbar.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.tbtn');
      if (!btn) return;
      var action = btn.dataset.action;
      if (MDW.actions[action]) MDW.actions[action](btn.dataset.arg);
    });
  }

  /* -------------------------------------------------------- download menu */

  function wireDownloadMenu() {
    downloadBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleMenu();
    });
    document.addEventListener('click', function (ev) {
      if (!downloadMenu.hidden && !ev.target.closest('.download-wrap')) toggleMenu(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !downloadMenu.hidden) toggleMenu(false);
    });
    downloadMenu.addEventListener('click', function (ev) {
      var item = ev.target.closest('.mitem');
      if (!item) return;
      toggleMenu(false);
      if (item.dataset.fmt) doExport(item.dataset.fmt);
      else if (item.dataset.cmd === 'print') MDW.printDoc();
      else if (item.dataset.cmd === 'copyrich') copyRich();
      else if (item.dataset.cmd === 'copyhtml') copyHtml();
    });
  }

  function toggleMenu(show) {
    var next = show != null ? show : downloadMenu.hidden;
    downloadMenu.hidden = !next;
    downloadBtn.setAttribute('aria-expanded', String(next));
  }

  var exporting = false;

  function doExport(fmt) {
    if (exporting) return;
    exporting = true;
    downloadBtn.disabled = true;
    MDW.exportAs(fmt).then(function (res) {
      MDW.download(res.blob, res.name);
      MDW.toast('Downloaded ' + res.name);
    }).catch(function (err) {
      console.error('Export failed', err);
      MDW.toast('Export failed: ' + (err && err.message ? err.message : err));
    }).then(function () {
      exporting = false;
      downloadBtn.disabled = false;
    });
  }

  function copyRich() {
    var html = MDW.exporters.htmlPage(editor.value);
    var plain = MDW.exporters.txt(editor.value);
    if (navigator.clipboard && window.ClipboardItem) {
      var item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      });
      navigator.clipboard.write([item]).then(function () {
        MDW.toast('Copied — paste into Gmail, Word, Docs…');
      }, function () { copyPlain(plain); });
    } else {
      copyPlain(plain);
    }
  }

  function copyHtml() {
    copyPlain(MDW.renderHTML(editor.value), 'HTML copied to clipboard');
  }

  function copyPlain(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        MDW.toast(msg || 'Copied as plain text');
      }, function () { MDW.toast('Clipboard unavailable in this browser'); });
    } else {
      MDW.toast('Clipboard unavailable in this browser');
    }
  }

  /* ---------------------------------------------------------- scroll sync */

  function wireScrollSync() {
    var lock = null;
    function sync(from, to) {
      if (lock && lock !== from) return;
      lock = from;
      var ratio = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight);
      to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
      requestAnimationFrame(function () { lock = null; });
    }
    editor.addEventListener('scroll', function () { sync(editor, preview); }, { passive: true });
    preview.addEventListener('scroll', function () { sync(preview, editor); }, { passive: true });
  }

  /* -------------------------------------------------------------- divider */

  function setSplit(pct) {
    pct = Math.min(80, Math.max(20, pct));
    splitEl.style.setProperty('--split', pct + '%');
    MDW.store.set('split', String(pct));
  }

  function wireDivider() {
    divider.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      divider.setPointerCapture(ev.pointerId);
      divider.classList.add('active');
      document.body.classList.add('dragging');

      function move(e) {
        var rect = splitEl.getBoundingClientRect();
        setSplit(((e.clientX - rect.left) / rect.width) * 100);
      }
      function up(e) {
        divider.releasePointerCapture(e.pointerId);
        divider.classList.remove('active');
        document.body.classList.remove('dragging');
        divider.removeEventListener('pointermove', move);
        divider.removeEventListener('pointerup', up);
      }
      divider.addEventListener('pointermove', move);
      divider.addEventListener('pointerup', up);
    });
    divider.addEventListener('dblclick', function () { setSplit(50); });
    divider.addEventListener('keydown', function (ev) {
      var cur = parseFloat(MDW.store.get('split')) || 50;
      if (ev.key === 'ArrowLeft') { setSplit(cur - 2); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { setSplit(cur + 2); ev.preventDefault(); }
    });
  }

  /* ---------------------------------------------------------------- theme */

  function wireTheme() {
    document.getElementById('btnTheme').addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      MDW.store.set('theme', next);
    });
  }

  /* ----------------------------------------------------------- file open */

  function wireFiles() {
    var input = document.getElementById('fileInput');
    document.getElementById('btnOpen').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) openFile(input.files[0]);
      input.value = '';
    });

    var dragDepth = 0;
    document.addEventListener('dragover', function (ev) { ev.preventDefault(); });
    document.addEventListener('dragenter', function (ev) {
      ev.preventDefault();
      dragDepth++;
      document.body.classList.add('dropping');
    });
    document.addEventListener('dragleave', function () {
      if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dropping'); }
    });
    document.addEventListener('drop', function (ev) {
      ev.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('dropping');
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) openFile(f);
    });
  }

  function openFile(file) {
    if (file.size > 5 * 1024 * 1024) { MDW.toast('That file is too large (5 MB max)'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      editor.value = String(reader.result || '');
      var name = (file.name || '').replace(/\.[^.]+$/, '');
      if (name) { titleInput.value = name; MDW.store.set('title', name); }
      render();
      editor.focus();
      editor.setSelectionRange(0, 0);
      editor.scrollTop = 0;
      MDW.toast('Opened ' + file.name);
    };
    reader.readAsText(file);
  }

  function newDoc() {
    if (editor.value.trim() && !confirm('Start a new document? The current one will be cleared (it was autosaved until now, but New empties the editor).')) return;
    editor.value = '';
    titleInput.value = '';
    MDW.store.set('title', '');
    render();
    editor.focus();
  }

  /* ----------------------------------------------------------- global keys */

  function wireGlobalKeys() {
    document.addEventListener('keydown', function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        toggleMenu(true);
      }
    });
  }
})();
