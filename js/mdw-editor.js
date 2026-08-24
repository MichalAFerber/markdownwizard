/* ---------------------------------------------------------------------------
   Markdown Wizard — editor behaviors: toolbar actions, keyboard shortcuts,
   list continuation. All edits go through execCommand('insertText') when
   possible so the browser's native undo/redo history keeps working.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var A = MDW.actions = {};
  var ta = null;

  MDW.initEditor = function (textarea) {
    ta = textarea;
    ta.addEventListener('keydown', onKeydown);
  };

  /* ------------------------------------------------------------ primitives */

  function sel() { return { s: ta.selectionStart, e: ta.selectionEnd }; }

  function replaceRange(start, end, text, selStart, selEnd) {
    ta.focus();
    if (start === end && !text.length) return;
    ta.setSelectionRange(start, end);
    var done = false;
    try {
      done = text.length
        ? document.execCommand('insertText', false, text)
        : document.execCommand('delete', false);
    } catch (e) { done = false; }
    if (!done) {
      ta.setRangeText(text, start, end, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (selStart != null) {
      ta.setSelectionRange(selStart, selEnd != null ? selEnd : selStart);
    }
  }

  /* --------------------------------------------------------- inline wrapping */

  function wrap(before, after, placeholder) {
    if (after == null) after = before;
    var r = sel(), v = ta.value;
    var has = r.e > r.s;
    var inner = has ? v.slice(r.s, r.e) : (placeholder || 'text');

    // Toggle off when the markers sit just outside the selection…
    if (v.slice(r.s - before.length, r.s) === before && v.slice(r.e, r.e + after.length) === after) {
      replaceRange(r.s - before.length, r.e + after.length, has ? inner : '',
        r.s - before.length, r.s - before.length + (has ? inner.length : 0));
      return;
    }
    // …or when the selection itself includes them.
    if (has && inner.length >= before.length + after.length &&
        inner.slice(0, before.length) === before && inner.slice(-after.length) === after) {
      var un = inner.slice(before.length, inner.length - after.length);
      replaceRange(r.s, r.e, un, r.s, r.s + un.length);
      return;
    }
    replaceRange(r.s, r.e, before + inner + after,
      r.s + before.length, r.s + before.length + inner.length);
  }

  A.bold = function () { wrap('**'); };
  A.italic = function () { wrap('*'); };
  A.strike = function () { wrap('~~'); };
  A.codespan = function () { wrap('`', '`', 'code'); };

  /* ------------------------------------------------------- line transforms */

  function lineRange() {
    var v = ta.value, r = sel();
    var ls = v.lastIndexOf('\n', r.s - 1) + 1;
    var le = v.indexOf('\n', r.e);
    if (le === -1) le = v.length;
    return { ls: ls, le: le };
  }

  function transformLines(fn) {
    var v = ta.value, lr = lineRange();
    var block = v.slice(lr.ls, lr.le);
    var out = fn(block.split('\n')).join('\n');
    if (out === block) { ta.focus(); return; }
    replaceRange(lr.ls, lr.le, out, lr.ls, lr.ls + out.length);
  }

  function stripListPrefix(line) {
    return line.replace(/^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/, '$1');
  }

  function splitIndent(line) {
    var m = line.match(/^(\s*)([\s\S]*)$/);
    return { ind: m[1], rest: m[2] };
  }

  A.heading = function (n) {
    n = parseInt(n, 10) || 1;
    transformLines(function (lines) {
      return lines.map(function (l) {
        if (!l.trim()) return l;
        var m = l.match(/^(\s*)(#{1,6})\s+(.*)$/);
        if (m) return m[2].length === n ? m[1] + m[3] : m[1] + '#'.repeat(n) + ' ' + m[3];
        var p = splitIndent(l);
        return p.ind + '#'.repeat(n) + ' ' + p.rest;
      });
    });
  };

  A.ul = function () {
    transformLines(function (lines) {
      var on = lines.every(function (l) { return !l.trim() || /^\s*[-*+]\s+(?!\[[ xX]\]\s)/.test(l); });
      return lines.map(function (l) {
        if (!l.trim()) return l;
        var p = splitIndent(stripListPrefix(l));
        return on ? p.ind + p.rest : p.ind + '- ' + p.rest;
      });
    });
  };

  A.ol = function () {
    transformLines(function (lines) {
      var on = lines.every(function (l) { return !l.trim() || /^\s*\d+[.)]\s+/.test(l); });
      var i = 0;
      return lines.map(function (l) {
        if (!l.trim()) return l;
        var p = splitIndent(stripListPrefix(l));
        i++;
        return on ? p.ind + p.rest : p.ind + i + '. ' + p.rest;
      });
    });
  };

  A.task = function () {
    transformLines(function (lines) {
      var on = lines.every(function (l) { return !l.trim() || /^\s*[-*+]\s+\[[ xX]\]\s+/.test(l); });
      return lines.map(function (l) {
        if (!l.trim()) return l;
        var p = splitIndent(stripListPrefix(l));
        return on ? p.ind + p.rest : p.ind + '- [ ] ' + p.rest;
      });
    });
  };

  A.quote = function () {
    transformLines(function (lines) {
      var on = lines.every(function (l) { return !l.trim() || /^\s*>\s?/.test(l); });
      return lines.map(function (l) {
        if (on) return l.replace(/^(\s*)>\s?/, '$1');
        return l.trim() ? '> ' + l : l;
      });
    });
  };

  /* ---------------------------------------------------------- insertions */

  // Insert `text` as its own block, padded by blank lines as needed.
  function insertBlock(text, caretOffset) {
    var r = sel(), v = ta.value;
    var beforeText = v.slice(0, r.s);
    var afterText = v.slice(r.e);
    var pre = beforeText === '' ? '' : (/\n\n$/.test(beforeText) ? '' : (/\n$/.test(beforeText) ? '\n' : '\n\n'));
    var post = afterText === '' ? '\n' : (/^\n/.test(afterText) ? '' : '\n\n');
    var out = pre + text + post;
    var caret = r.s + pre.length + (caretOffset != null ? caretOffset : text.length);
    replaceRange(r.s, r.e, out, caret);
  }

  A.codeblock = function () {
    var r = sel(), v = ta.value;
    if (r.e > r.s) {
      var inner = v.slice(r.s, r.e);
      if (!/\n$/.test(inner)) inner += '\n';
      insertBlockAt(r.s, r.e, '```\n' + inner + '```', 3); // caret after the opening fence
    } else {
      insertBlock('```\ncode\n```', 4); // caret at "code"
      ta.setSelectionRange(ta.selectionStart, ta.selectionStart + 4);
    }
  };

  // Like insertBlock but replacing an explicit range.
  function insertBlockAt(s, e, text, caretOffset) {
    var v = ta.value;
    var beforeText = v.slice(0, s);
    var afterText = v.slice(e);
    var pre = beforeText === '' ? '' : (/\n\n$/.test(beforeText) ? '' : (/\n$/.test(beforeText) ? '\n' : '\n\n'));
    var post = afterText === '' ? '\n' : (/^\n/.test(afterText) ? '' : '\n\n');
    replaceRange(s, e, pre + text + post, s + pre.length + caretOffset);
  }

  A.link = function () {
    var r = sel(), v = ta.value;
    var t = r.e > r.s ? v.slice(r.s, r.e) : '';
    if (/^https?:\/\/\S+$/i.test(t)) {
      var out = '[text](' + t + ')';
      replaceRange(r.s, r.e, out, r.s + 1, r.s + 5); // select "text"
    } else {
      var label = t || 'link text';
      var out2 = '[' + label + '](https://)';
      var us = r.s + label.length + 3;
      replaceRange(r.s, r.e, out2, us, us + 8); // select "https://"
    }
  };

  A.image = function () {
    var r = sel(), v = ta.value;
    var alt = r.e > r.s ? v.slice(r.s, r.e) : 'alt text';
    var out = '![' + alt + '](https://)';
    var us = r.s + alt.length + 4;
    replaceRange(r.s, r.e, out, us, us + 8); // select "https://"
  };

  A.table = function () {
    insertBlock(
      '| Column 1 | Column 2 | Column 3 |\n' +
      '| -------- | -------- | -------- |\n' +
      '|          |          |          |\n' +
      '|          |          |          |', 2);
  };

  A.hr = function () { insertBlock('---'); };

  A.undo = function () { ta.focus(); document.execCommand('undo'); };
  A.redo = function () { ta.focus(); document.execCommand('redo'); };

  /* ---------------------------------------------------------- key handling */

  var passNextTab = false;

  function onKeydown(ev) {
    var mod = ev.ctrlKey || ev.metaKey;

    if (mod && !ev.altKey) {
      var k = ev.key.toLowerCase();
      if (k === 'b') { ev.preventDefault(); A.bold(); return; }
      if (k === 'i') { ev.preventDefault(); A.italic(); return; }
      if (k === 'k') { ev.preventDefault(); A.link(); return; }
      if (k === 'e') { ev.preventDefault(); A.codespan(); return; }
      if (k === 'x' && ev.shiftKey) { ev.preventDefault(); A.strike(); return; }
    }

    if (ev.key === 'Escape') { passNextTab = true; return; }

    if (ev.key === 'Tab' && !mod && !ev.altKey) {
      if (passNextTab) { passNextTab = false; return; } // Esc-then-Tab escapes the editor
      ev.preventDefault();
      handleTab(ev.shiftKey);
      return;
    }
    passNextTab = false;

    if (ev.key === 'Enter' && !mod && !ev.shiftKey && !ev.altKey) {
      handleEnter(ev);
    }
  }

  function handleTab(outdent) {
    var r = sel(), v = ta.value;
    var multiline = v.slice(r.s, r.e).indexOf('\n') !== -1;
    var lineStart = v.lastIndexOf('\n', r.s - 1) + 1;
    var onListLine = /^\s*(?:[-*+]|\d+[.)])\s/.test(v.slice(lineStart, v.indexOf('\n', lineStart) === -1 ? v.length : v.indexOf('\n', lineStart)));

    if (!outdent && !multiline && !onListLine) {
      replaceRange(r.s, r.e, '  '); // plain indent
      return;
    }
    transformLines(function (lines) {
      return lines.map(function (l) {
        if (outdent) return l.replace(/^ {1,2}/, '');
        return l.trim() ? '  ' + l : l;
      });
    });
  }

  function handleEnter(ev) {
    var r = sel();
    if (r.s !== r.e) return;
    var v = ta.value;
    var ls = v.lastIndexOf('\n', r.s - 1) + 1;
    var line = v.slice(ls, r.s);
    var m = line.match(/^(\s*)((?:[-*+]\s+\[[ xX]\]\s+)|(?:[-*+]\s+)|(?:(\d+)([.)])\s+)|(?:>\s?))(.*)$/);
    if (!m) return;
    ev.preventDefault();
    var ind = m[1], marker = m[2], num = m[3], numSep = m[4], rest = m[5];
    if (!rest.trim()) {
      // Enter on an empty item ends the list / quote.
      replaceRange(ls, r.s, '', ls);
      return;
    }
    var next = ind + marker;
    if (num) next = ind + (parseInt(num, 10) + 1) + numSep + ' ';
    else if (/\[[xX]\]/.test(marker)) next = ind + marker.replace(/\[[xX]\]/, '[ ]');
    replaceRange(r.s, r.e, '\n' + next);
  }
})();
