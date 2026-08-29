/* ---------------------------------------------------------------------------
   Bridges the markdownwizard-tools bundle to the window.MDW surface this page
   has always used.

   The library is now a real module with explicit exports, and it no longer
   reaches into the page: the old MDW.getSource() / MDW.getTitle() stubs are
   gone, so exportAs, baseName and printDoc take the markdown and title as
   arguments. This adapter keeps that seam where it was — mdw-app.js still
   assigns MDW.getSource and MDW.getTitle, and the calls below read them at call
   time rather than capturing them at load.

   It exists so the app code did not have to change in the same commit as the
   module conversion. One of the two can be verified at a time.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var T = window.MDWTools;
  var MDW = window.MDW = window.MDW || {};

  // Straight passthroughs — same names, same behaviour.
  MDW.renderHTML = T.renderHTML;
  MDW.lex = T.lex;
  MDW.decodeEntities = T.decodeEntities;
  MDW.escapeHtml = T.escapeHtml;
  MDW.debounce = T.debounce;
  MDW.store = T.store;
  MDW.download = T.download;
  MDW.toast = T.toast;
  MDW.formatLabel = T.formatLabel;

  // Assigned by mdw-app.js at startup; defaults keep the surface safe before then.
  MDW.getSource = MDW.getSource || function () { return ''; };
  MDW.getTitle = MDW.getTitle || function () { return ''; };

  // The three that used to read the page for themselves.
  MDW.baseName = function () { return T.baseName(MDW.getSource(), MDW.getTitle()); };
  MDW.printDoc = function () { return T.printDoc(MDW.getSource(), MDW.getTitle()); };
  MDW.exportAs = function (fmt) {
    return T.exportAs({ fmt: fmt, md: MDW.getSource(), title: MDW.getTitle() });
  };

  // The old registry object, rebuilt from the named exports.
  // htmlPage and wordHtml need the title, which the old versions read for themselves via
  // MDW.baseName(). Wrapped rather than passed through, so callers keep the one-argument form.
  MDW.exporters = {
    txt: T.txt,
    htmlPage: function (md) { return T.htmlPage(md, MDW.getTitle()); },
    wordHtml: function (md) { return T.wordHtml(md, MDW.getTitle()); },
    rtf: T.rtf,
    docx: T.docx,
    pdf: T.pdf
  };
})();
