/* ---------------------------------------------------------------------------
   Markdown Wizard — core: rendering, sanitization, storage, shared utilities.
   Everything runs locally in the browser; there is no server component.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var MDW = window.MDW = {};

  marked.use({ gfm: true, breaks: false });

  /* ------------------------------------------------------------- rendering */

  MDW.renderHTML = function (md) {
    var raw = marked.parse(md || '');
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
  };

  MDW.lex = function (md) {
    return marked.lexer(md || '');
  };

  /* ------------------------------------------------------------- utilities */

  var _decoder = document.createElement('textarea');

  // marked escapes HTML entities inside some token text (&amp;, &lt;, &#39; …);
  // decode them so exported documents contain the real characters.
  MDW.decodeEntities = function (s) {
    if (!s) return '';
    if (s.indexOf('&') === -1) return s;
    _decoder.innerHTML = s;
    return _decoder.value;
  };

  MDW.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  MDW.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  };

  /* --------------------------------------------------------------- storage */

  MDW.store = {
    get: function (k) { try { return localStorage.getItem('mdw:' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('mdw:' + k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('mdw:' + k); } catch (e) {} }
  };

  /* -------------------------------------------------------------- document */

  // Set by mdw-app.js; exporters use these instead of touching the DOM.
  MDW.getSource = function () { return ''; };
  MDW.getTitle = function () { return ''; };

  // File name for downloads: the title field, else the first heading, else "document".
  MDW.baseName = function () {
    var name = (MDW.getTitle() || '').trim();
    if (!name) {
      var m = (MDW.getSource() || '').match(/^\s{0,3}#{1,6}\s+(.+)$/m);
      if (m) name = m[1].replace(/[*_~`#]/g, '').trim();
    }
    if (!name) name = 'document';
    name = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim();
    return (name.slice(0, 120) || 'document');
  };

  /* -------------------------------------------------------------- download */

  MDW.download = function (blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 2000);
  };

  /* ----------------------------------------------------------------- toast */

  var toastTimer = null;
  MDW.toast = function (msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 2400);
  };
})();
