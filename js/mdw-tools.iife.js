var MDWTools = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    FORMATS: () => FORMATS,
    baseName: () => baseName,
    collectImages: () => collectImages,
    debounce: () => debounce,
    decodeEntities: () => decodeEntities,
    docx: () => docx,
    download: () => download,
    escapeHtml: () => escapeHtml,
    exportAs: () => exportAs,
    formatLabel: () => formatLabel,
    groupLinks: () => groupLinks,
    htmlPage: () => htmlPage,
    inlineText: () => inlineText,
    inlines: () => inlines,
    lex: () => lex,
    loadImages: () => loadImages,
    pdf: () => pdf,
    printDoc: () => printDoc,
    renderHTML: () => renderHTML,
    rtf: () => rtf,
    store: () => store,
    toast: () => toast,
    txt: () => txt,
    wordHtml: () => wordHtml
  });

  // build/.shims/marked.js
  var lib = globalThis.marked;
  var _a;
  var marked = (_a = lib == null ? void 0 : lib.marked) != null ? _a : lib;

  // build/.shims/dompurify.js
  var lib2 = globalThis.DOMPurify;
  var dompurify_default = lib2;

  // src/core.js
  marked.use({ gfm: true, breaks: false });
  function renderHTML(md) {
    var raw = marked.parse(md || "");
    return dompurify_default.sanitize(raw, { ADD_ATTR: ["target", "rel"] });
  }
  function lex(md) {
    return marked.lexer(md || "");
  }
  var _decoder = document.createElement("textarea");
  function decodeEntities(s) {
    if (!s) return "";
    if (s.indexOf("&") === -1) return s;
    _decoder.innerHTML = s;
    return _decoder.value;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function debounce(fn, ms) {
    var t = null;
    return function() {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function() {
        fn.apply(self, args);
      }, ms);
    };
  }
  var store = {
    get: function(k) {
      try {
        return localStorage.getItem("mdw:" + k);
      } catch (e) {
        return null;
      }
    },
    set: function(k, v) {
      try {
        localStorage.setItem("mdw:" + k, v);
      } catch (e) {
      }
    },
    del: function(k) {
      try {
        localStorage.removeItem("mdw:" + k);
      } catch (e) {
      }
    }
  };
  function baseName(md, title) {
    var name = (title || "").trim();
    if (!name) {
      var m = (md || "").match(/^\s{0,3}#{1,6}\s+(.+)$/m);
      if (m) name = m[1].replace(/[*_~`#]/g, "").trim();
    }
    if (!name) name = "document";
    name = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\s+/g, " ").trim();
    return name.slice(0, 120) || "document";
  }
  function download(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 2e3);
  }
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      el.classList.remove("show");
    }, ms || 2400);
  }

  // src/common.js
  function inlines(tokens, st) {
    st = st || {};
    var out = [];
    (tokens || []).forEach(function(t) {
      switch (t.type) {
        case "strong":
          out.push.apply(out, inlines(t.tokens, merge(st, { bold: true })));
          break;
        case "em":
          out.push.apply(out, inlines(t.tokens, merge(st, { italic: true })));
          break;
        case "del":
          out.push.apply(out, inlines(t.tokens, merge(st, { strike: true })));
          break;
        case "link":
          out.push.apply(out, inlines(t.tokens, merge(st, { href: t.href || "" })));
          break;
        case "codespan":
          out.push(merge(st, { code: true, text: decodeEntities(t.text) }));
          break;
        case "br":
          out.push(merge(st, { br: true }));
          break;
        case "image":
          out.push(merge(st, { image: { href: t.href || "", alt: t.text || "" } }));
          break;
        case "html":
          if (/^<br[\s/>]/i.test(t.text || "")) out.push(merge(st, { br: true }));
          break;
        default: {
          if (t.tokens && t.tokens.length) {
            out.push.apply(out, inlines(t.tokens, st));
            break;
          }
          var text = decodeEntities(t.text != null ? t.text : t.raw || "").replace(/\n/g, " ");
          if (text) out.push(merge(st, { text }));
        }
      }
    });
    return out;
  }
  function merge(a, b) {
    var o = {};
    for (var k in a) o[k] = a[k];
    for (var j in b) o[j] = b[j];
    return o;
  }
  function groupLinks(runs2) {
    var out = [];
    runs2.forEach(function(r) {
      var href = r.href || null;
      var last = out[out.length - 1];
      if (last && last.href === href) last.runs.push(r);
      else out.push({ href, runs: [r] });
    });
    return out;
  }
  function inlineText(tokens) {
    return inlines(tokens).map(function(r) {
      if (r.br) return "\n";
      if (r.image) return r.image.alt ? "[" + r.image.alt + "]" : "[image]";
      return r.text || "";
    }).join("");
  }
  function collectImages(tokens) {
    var urls = [];
    (function walk2(list3) {
      (list3 || []).forEach(function(t) {
        if (t.type === "image" && t.href && urls.indexOf(t.href) === -1) urls.push(t.href);
        if (t.tokens) walk2(t.tokens);
        if (t.items) t.items.forEach(function(it) {
          walk2(it.tokens);
        });
        if (t.header) t.header.forEach(function(c) {
          walk2(c.tokens);
        });
        if (t.rows) t.rows.forEach(function(row) {
          row.forEach(function(c) {
            walk2(c.tokens);
          });
        });
      });
    })(tokens);
    return urls;
  }
  function loadImages(urls) {
    var map = /* @__PURE__ */ new Map();
    if (!urls.length) return Promise.resolve(map);
    return Promise.all(urls.map(function(u) {
      return withTimeout(loadOne(u), 8e3).then(function(img) {
        map.set(u, img);
      });
    })).then(function() {
      return map;
    });
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function(res) {
      setTimeout(function() {
        res(null);
      }, ms);
    })]).catch(function() {
      return null;
    });
  }
  function loadOne(url) {
    return fetch(url, { mode: "cors" }).then(function(res) {
      if (!res.ok) return null;
      return res.blob();
    }).then(function(blob) {
      if (!blob) return null;
      var type = blob.type || "";
      if (!/^image\//.test(type) && !/^data:image/.test(url)) return null;
      return blobToDataURL(blob).then(function(dataURL) {
        if (!dataURL) return null;
        return imageDims(dataURL).then(function(dim) {
          if (!dim) return null;
          if (/image\/(png|jpe?g|gif)/.test(type)) {
            return blob.arrayBuffer().then(function(buf) {
              return { dataURL, bytes: new Uint8Array(buf), width: dim.w, height: dim.h };
            });
          }
          return rasterize(dataURL, dim.w, dim.h);
        });
      });
    });
  }
  function blobToDataURL(blob) {
    return new Promise(function(res) {
      var fr = new FileReader();
      fr.onload = function() {
        res(fr.result);
      };
      fr.onerror = function() {
        res(null);
      };
      fr.readAsDataURL(blob);
    });
  }
  function imageDims(dataURL) {
    return new Promise(function(res) {
      var im = new Image();
      im.onload = function() {
        res({ w: im.naturalWidth || 600, h: im.naturalHeight || 400, el: im });
      };
      im.onerror = function() {
        res(null);
      };
      im.src = dataURL;
    });
  }
  function rasterize(dataURL, w, h) {
    return imageDims(dataURL).then(function(dim) {
      if (!dim) return null;
      var canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      var ctx = canvas.getContext("2d");
      ctx.drawImage(dim.el, 0, 0, canvas.width, canvas.height);
      var png = canvas.toDataURL("image/png");
      var bytes = dataURLBytes(png);
      return bytes ? { dataURL: png, bytes, width: canvas.width, height: canvas.height } : null;
    }).catch(function() {
      return null;
    });
  }
  function dataURLBytes(dataURL) {
    var idx = dataURL.indexOf(",");
    if (idx === -1) return null;
    try {
      var bin = atob(dataURL.slice(idx + 1));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch (e) {
      return null;
    }
  }
  var FORMATS = {
    md: { ext: ".md", label: "Markdown" },
    txt: { ext: ".txt", label: "plain text" },
    html: { ext: ".html", label: "HTML" },
    doc: { ext: ".doc", label: "Word 97-2003" },
    dot: { ext: ".dot", label: "Word template" },
    rtf: { ext: ".rtf", label: "Rich Text" },
    docx: { ext: ".docx", label: "Word" },
    pdf: { ext: ".pdf", label: "PDF" }
  };
  function formatLabel(fmt) {
    return (FORMATS[fmt] || {}).label || fmt;
  }

  // src/exporters/txt.js
  function inlineText2(tokens) {
    var s = "";
    (tokens || []).forEach(function(t) {
      switch (t.type) {
        case "strong":
        case "em":
        case "del":
          s += inlineText2(t.tokens);
          break;
        case "link": {
          var inner = inlineText2(t.tokens);
          s += inner;
          var href = t.href || "";
          if (href && inner.trim() !== href && href.charAt(0) !== "#") s += " (" + href + ")";
          break;
        }
        case "codespan":
          s += decodeEntities(t.text);
          break;
        case "br":
          s += "\n";
          break;
        case "image":
          s += "[" + (t.text || "image") + "]";
          if (t.href && t.href.slice(0, 5) !== "data:") s += " (" + t.href + ")";
          break;
        case "html":
          break;
        default:
          if (t.tokens && t.tokens.length) s += inlineText2(t.tokens);
          else s += decodeEntities(t.text || "").replace(/\n/g, " ");
      }
    });
    return s;
  }
  function walk(tokens) {
    var blocks3 = [];
    (tokens || []).forEach(function(t) {
      switch (t.type) {
        case "space":
          break;
        case "heading": {
          var text = inlineText2(t.tokens);
          if (t.depth === 1) blocks3.push([text, "=".repeat(Math.max(3, text.length))]);
          else if (t.depth === 2) blocks3.push([text, "-".repeat(Math.max(3, text.length))]);
          else blocks3.push([text]);
          break;
        }
        case "paragraph":
        case "text":
          blocks3.push(inlineText2(t.tokens != null ? t.tokens : [t]).split("\n"));
          break;
        case "code":
          blocks3.push(t.text.split("\n").map(function(l) {
            return "    " + l;
          }));
          break;
        case "blockquote":
          blocks3.push(joinBlocks(walk(t.tokens)).split("\n").map(function(l) {
            return ("> " + l).replace(/\s+$/, "");
          }));
          break;
        case "list":
          blocks3.push(listLines(t));
          break;
        case "table":
          blocks3.push(tableLines(t));
          break;
        case "hr":
          blocks3.push(["-".repeat(40)]);
          break;
        case "html": {
          var stripped = t.text.replace(/<[^>]*>/g, "").trim();
          if (stripped) blocks3.push([decodeEntities(stripped)]);
          break;
        }
        default:
          if (t.tokens) blocks3.push(inlineText2(t.tokens).split("\n"));
      }
    });
    return blocks3;
  }
  function listLines(t) {
    var lines = [];
    var n = typeof t.start === "number" && t.start > 0 ? t.start : 1;
    t.items.forEach(function(item) {
      var marker = t.ordered ? n++ + ". " : "- ";
      if (item.task) marker += item.checked ? "[x] " : "[ ] ";
      var childLines = joinBlocks(walk(item.tokens)).split("\n");
      var pad = " ".repeat(marker.length);
      childLines.forEach(function(l, i) {
        lines.push((i === 0 ? marker : pad) + l);
      });
    });
    return lines;
  }
  function tableLines(t) {
    var head = t.header.map(function(c) {
      return inlineText2(c.tokens).replace(/\n/g, " ");
    });
    var rows = t.rows.map(function(r) {
      return r.map(function(c) {
        return inlineText2(c.tokens).replace(/\n/g, " ");
      });
    });
    var widths = head.map(function(h, i) {
      var w = h.length;
      rows.forEach(function(r) {
        w = Math.max(w, (r[i] || "").length);
      });
      return Math.max(w, 3);
    });
    function fmt(cells) {
      return cells.map(function(c, i) {
        return (c || "") + " ".repeat(widths[i] - (c || "").length);
      }).join("  |  ").replace(/\s+$/, "");
    }
    var lines = [fmt(head)];
    lines.push(widths.map(function(w) {
      return "-".repeat(w);
    }).join("--+--"));
    rows.forEach(function(r) {
      lines.push(fmt(r));
    });
    return lines;
  }
  function joinBlocks(blocks3) {
    return blocks3.map(function(b) {
      return b.join("\n");
    }).join("\n\n");
  }
  function txt(md) {
    return joinBlocks(walk(lex(md))) + "\n";
  }

  // src/exporters/html.js
  var DOC_CSS = [
    'body{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt;line-height:1.55;color:#1a1a24;',
    "  max-width:7.4in;margin:0 auto;padding:24px 16px;}",
    "h1,h2,h3,h4,h5,h6{line-height:1.3;margin:1.2em 0 .45em;}",
    "h1{font-size:22pt;border-bottom:1pt solid #d9d9e3;padding-bottom:4pt;}",
    "h2{font-size:17pt;border-bottom:1pt solid #e4e4ec;padding-bottom:3pt;}",
    "h3{font-size:14pt;}h4{font-size:12pt;}h5{font-size:11pt;}h6{font-size:10pt;color:#666;}",
    "p{margin:.55em 0;}",
    "a{color:#0b62c4;}",
    'code{font-family:Consolas,"Courier New",monospace;font-size:9.5pt;background:#f2f0f7;padding:1pt 4pt;border-radius:3pt;}',
    "pre{background:#f4f3f8;border:1pt solid #e4e2ee;border-radius:6pt;padding:10pt 12pt;overflow-x:auto;line-height:1.45;}",
    "pre code{background:none;padding:0;}",
    "blockquote{margin:.8em 0;padding:2pt 12pt;border-left:3pt solid #b9a8ee;color:#555;}",
    "ul,ol{margin:.55em 0;padding-left:2em;}",
    "li{margin:.2em 0;}",
    "table{border-collapse:collapse;margin:.8em 0;}",
    "th,td{border:1pt solid #c9c9d4;padding:4pt 9pt;}",
    "th{background:#efedf6;}",
    "img{max-width:100%;}",
    "hr{border:0;border-top:1.5pt solid #d9d9e3;margin:1.4em 0;}",
    "@page{size:8.5in 11in;margin:1in;}",
    "@media print{body{max-width:none;padding:0;}pre{white-space:pre-wrap;word-break:break-word;}}"
  ].join("\n");
  function titleOf(md, title) {
    return baseName(md, title);
  }
  function htmlPage(md, title) {
    var body = renderHTML(md);
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + escapeHtml(titleOf(md, title)) + "</title>\n<style>\n" + DOC_CSS + "\n</style>\n</head>\n<body>\n" + body + "\n</body>\n</html>\n";
  }
  function wordHtml(md, title) {
    var body = renderHTML(md);
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n<head>\n<meta charset="utf-8">\n<meta name="ProgId" content="Word.Document">\n<meta name="Generator" content="Markdown Wizard">\n<title>' + escapeHtml(titleOf(md, title)) + "</title>\n<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->\n<style>\n" + DOC_CSS + "\n</style>\n</head>\n<body>\n" + body + "\n</body>\n</html>\n";
  }
  var printFrame = null;
  function printDoc(md, title) {
    if (printFrame) {
      printFrame.remove();
      printFrame = null;
    }
    var f = printFrame = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    f.srcdoc = htmlPage(md, title);
    f.onload = function() {
      try {
        f.contentWindow.focus();
        f.contentWindow.print();
      } catch (e) {
        window.print();
      }
      setTimeout(function() {
        if (printFrame === f) {
          f.remove();
          printFrame = null;
        }
      }, 6e4);
    };
    document.body.appendChild(f);
  }

  // src/exporters/rtf.js
  var HSIZE = { 1: 48, 2: 40, 3: 32, 4: 28, 5: 24, 6: 22 };
  var PAGE_TWIPS = 9360;
  function esc(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      var ch = s[i];
      if (ch === "\\") out += "\\\\";
      else if (ch === "{") out += "\\{";
      else if (ch === "}") out += "\\}";
      else if (code === 10 || code === 13) out += "\\line ";
      else if (code === 9) out += "\\tab ";
      else if (code < 128) out += ch;
      else {
        var n = code;
        if (n > 32767) n -= 65536;
        out += "\\u" + n + "?";
      }
    }
    return out;
  }
  function runRtf(r) {
    if (r.br) return "\\line ";
    if (r.image) {
      var label = "[" + (r.image.alt || "image") + "]";
      if (r.image.href && r.image.href.slice(0, 5) !== "data:") label += " (" + r.image.href + ")";
      return "{\\i\\cf2 " + esc(label) + "}";
    }
    var f = "";
    if (r.bold) f += "\\b";
    if (r.italic) f += "\\i";
    if (r.strike) f += "\\strike";
    if (r.code) f += "\\f1\\fs20";
    return "{" + f + (f ? " " : "") + esc(r.text || "") + "}";
  }
  function inlineRtf(tokens) {
    var groups = groupLinks(inlines(tokens));
    return groups.map(function(g) {
      var inner = g.runs.map(runRtf).join("");
      if (!g.href) return inner;
      return '{\\field{\\*\\fldinst{HYPERLINK "' + esc(g.href).replace(/"/g, "%22") + '"}}{\\fldrslt{\\ul\\cf1 ' + inner + "}}}";
    }).join("");
  }
  function blocksRtf(tokens, ctx) {
    ctx = ctx || { quote: 0, list: 0 };
    var out = "";
    (tokens || []).forEach(function(t) {
      switch (t.type) {
        case "space":
          break;
        case "heading":
          out += "{\\pard" + quoteProps(ctx) + "\\sb240\\sa120\\keepn\\b\\fs" + HSIZE[t.depth] + " " + inlineRtf(t.tokens) + "\\par}\n";
          break;
        case "paragraph":
        case "text":
          out += "{\\pard" + quoteProps(ctx) + "\\sa160 " + inlineRtf(t.tokens != null ? t.tokens : [t]) + "\\par}\n";
          break;
        case "code": {
          var lines = t.text.split("\n").map(esc).join("\\line ");
          out += "{\\pard" + quoteProps(ctx) + "\\sa160\\cbpat3\\f1\\fs18 " + lines + "\\par}\n";
          break;
        }
        case "blockquote":
          out += blocksRtf(t.tokens, { quote: ctx.quote + 1, list: ctx.list });
          break;
        case "list":
          out += listRtf(t, ctx);
          break;
        case "table":
          out += tableRtf(t);
          break;
        case "hr":
          out += "{\\pard\\sa160\\brdrb\\brdrs\\brdrw15\\brdrcf4\\par}\n";
          break;
        case "html": {
          var stripped = t.text.replace(/<[^>]*>/g, "").trim();
          if (stripped) out += "{\\pard\\sa160 " + esc(decodeEntities(stripped)) + "\\par}\n";
          break;
        }
        default:
          if (t.tokens) out += "{\\pard\\sa160 " + inlineRtf(t.tokens) + "\\par}\n";
      }
    });
    return out;
  }
  function quoteProps(ctx) {
    if (!ctx.quote) return "";
    var indent = 360 * ctx.quote;
    return "\\li" + indent + "\\brdrl\\brdrs\\brdrw30\\brdrcf4\\cf2";
  }
  function listRtf(t, ctx) {
    var out = "";
    var level = ctx.list || 0;
    var n = typeof t.start === "number" && t.start > 0 ? t.start : 1;
    t.items.forEach(function(item) {
      var marker;
      if (item.task) marker = item.checked ? "\\u9745?" : "\\u9744?";
      else if (t.ordered) marker = esc(n++ + ".");
      else marker = "\\bullet";
      var indent = 720 * (level + 1);
      var first = true;
      (item.tokens || []).forEach(function(bt) {
        if (bt.type === "list") {
          out += listRtf(bt, { quote: ctx.quote, list: level + 1 });
          first = false;
        } else if (bt.type === "text" || bt.type === "paragraph") {
          if (first) {
            out += "{\\pard\\li" + indent + "\\fi-360\\sa80 " + marker + "\\tab " + inlineRtf(bt.tokens != null ? bt.tokens : [bt]) + "\\par}\n";
            first = false;
          } else {
            out += "{\\pard\\li" + indent + "\\sa80 " + inlineRtf(bt.tokens != null ? bt.tokens : [bt]) + "\\par}\n";
          }
        } else if (bt.type === "code") {
          var lines = bt.text.split("\n").map(esc).join("\\line ");
          out += "{\\pard\\li" + indent + "\\sa80\\cbpat3\\f1\\fs18 " + lines + "\\par}\n";
          first = false;
        } else if (bt.type === "space") {
        } else {
          out += blocksRtf([bt], { quote: ctx.quote, list: level + 1 });
          first = false;
        }
      });
      if (first) {
        out += "{\\pard\\li" + indent + "\\fi-360\\sa80 " + marker + "\\tab\\par}\n";
      }
    });
    return out;
  }
  function tableRtf(t) {
    var cols = t.header.length;
    if (!cols) return "";
    var w = Math.floor(PAGE_TWIPS / cols);
    var alignWord = function(i) {
      var a = (t.align || [])[i];
      return a === "center" ? "\\qc" : a === "right" ? "\\qr" : "\\ql";
    };
    function rowRtf(cells, isHeader) {
      var def = "\\trowd\\trgaph108\\trleft0";
      for (var i = 0; i < cols; i++) {
        def += "\\clbrdrt\\brdrs\\brdrw10\\brdrcf4\\clbrdrl\\brdrs\\brdrw10\\brdrcf4\\clbrdrb\\brdrs\\brdrw10\\brdrcf4\\clbrdrr\\brdrs\\brdrw10\\brdrcf4" + (isHeader ? "\\clcbpat3" : "") + "\\cellx" + w * (i + 1);
      }
      var body = "";
      for (var j = 0; j < cols; j++) {
        var cell = cells[j];
        var content = cell ? inlineRtf(cell.tokens) : "";
        body += "\\pard\\intbl" + alignWord(j) + " " + (isHeader ? "{\\b " + content + "}" : content) + "\\cell";
      }
      return def + body + "\\row\n";
    }
    var out = rowRtf(t.header, true);
    t.rows.forEach(function(r) {
      out += rowRtf(r, false);
    });
    return out + "\\pard\\sa160\\par\n";
  }
  function rtf(md) {
    var body = blocksRtf(lex(md), { quote: 0, list: 0 });
    return "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033\n{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}{\\f1\\fmodern\\fcharset0 Consolas;}}\n{\\colortbl ;\\red11\\green98\\blue196;\\red100\\green100\\blue110;\\red242\\green241\\blue247;\\red201\\green201\\blue212;}\n{\\*\\generator Markdown Wizard}\\viewkind4\\uc1\\fs22\n" + body + "}";
  }

  // build/.shims/docx.js
  var lib3 = globalThis.docx;
  var _a2;
  var AlignmentType = (_a2 = lib3 == null ? void 0 : lib3.AlignmentType) != null ? _a2 : lib3;
  var _a3;
  var BorderStyle = (_a3 = lib3 == null ? void 0 : lib3.BorderStyle) != null ? _a3 : lib3;
  var _a4;
  var Document = (_a4 = lib3 == null ? void 0 : lib3.Document) != null ? _a4 : lib3;
  var _a5;
  var ExternalHyperlink = (_a5 = lib3 == null ? void 0 : lib3.ExternalHyperlink) != null ? _a5 : lib3;
  var _a6;
  var HeadingLevel = (_a6 = lib3 == null ? void 0 : lib3.HeadingLevel) != null ? _a6 : lib3;
  var _a7;
  var ImageRun = (_a7 = lib3 == null ? void 0 : lib3.ImageRun) != null ? _a7 : lib3;
  var _a8;
  var LevelFormat = (_a8 = lib3 == null ? void 0 : lib3.LevelFormat) != null ? _a8 : lib3;
  var _a9;
  var Packer = (_a9 = lib3 == null ? void 0 : lib3.Packer) != null ? _a9 : lib3;
  var _a10;
  var Paragraph = (_a10 = lib3 == null ? void 0 : lib3.Paragraph) != null ? _a10 : lib3;
  var _a11;
  var ShadingType = (_a11 = lib3 == null ? void 0 : lib3.ShadingType) != null ? _a11 : lib3;
  var _a12;
  var Table = (_a12 = lib3 == null ? void 0 : lib3.Table) != null ? _a12 : lib3;
  var _a13;
  var TableCell = (_a13 = lib3 == null ? void 0 : lib3.TableCell) != null ? _a13 : lib3;
  var _a14;
  var TableRow = (_a14 = lib3 == null ? void 0 : lib3.TableRow) != null ? _a14 : lib3;
  var _a15;
  var TextRun = (_a15 = lib3 == null ? void 0 : lib3.TextRun) != null ? _a15 : lib3;
  var _a16;
  var WidthType = (_a16 = lib3 == null ? void 0 : lib3.WidthType) != null ? _a16 : lib3;

  // src/exporters/docx.js
  var MAX_IMG_PX = 620;
  function docx(md) {
    var tokens = lex(md);
    return loadImages(collectImages(tokens)).then(function(images) {
      var ctx = {
        images,
        numInstance: 0,
        quote: 0,
        indent: 0,
        color: null
      };
      var children = blocks(tokens, ctx);
      var doc = new Document({
        creator: "Markdown Wizard",
        title: baseName(md),
        styles: {
          default: {
            document: {
              run: { font: "Calibri", size: 22 },
              paragraph: { spacing: { after: 160, line: 276 } }
            }
          }
        },
        numbering: { config: numberingConfig() },
        sections: [{ properties: {}, children }]
      });
      return Packer.toBlob(doc);
    });
  }
  function numberingConfig() {
    function levels(ordered) {
      var out = [];
      for (var l = 0; l < 9; l++) {
        out.push({
          level: l,
          format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
          text: ordered ? "%" + (l + 1) + "." : ["\u2022", "\u25E6", "\u25AA"][l % 3],
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } }
        });
      }
      return out;
    }
    return [
      { reference: "mdw-bullet", levels: levels(false) },
      { reference: "mdw-number", levels: levels(true) }
    ];
  }
  function runs(tokens, ctx, extraRun) {
    var out = [];
    if (extraRun) out.push(extraRun);
    groupLinks(inlines(tokens)).forEach(function(g) {
      var trs = g.runs.map(function(r) {
        return oneRun(r, ctx, !!g.href);
      });
      if (g.href) {
        out.push(new ExternalHyperlink({ children: trs, link: g.href }));
      } else {
        out.push.apply(out, trs);
      }
    });
    return out;
  }
  function oneRun(r, ctx, inLink) {
    if (r.br) return new TextRun({ text: "", break: 1 });
    if (r.image) return imageRun(r.image, ctx);
    var opts = { text: r.text || "" };
    if (r.bold || ctx.bold) opts.bold = true;
    if (r.italic) opts.italics = true;
    if (r.strike) opts.strike = true;
    if (r.code) {
      opts.font = "Consolas";
      opts.size = 20;
      opts.shading = { type: ShadingType.CLEAR, fill: "F2F1F7", color: "auto" };
    }
    if (inLink) {
      opts.color = "0B62C4";
      opts.underline = {};
    } else if (ctx.color) {
      opts.color = ctx.color;
    }
    return new TextRun(opts);
  }
  function imageRun(img, ctx) {
    var loaded = ctx.images.get(img.href);
    if (!loaded) {
      var label = "[" + (img.alt || "image") + "]";
      if (img.href && img.href.slice(0, 5) !== "data:") label += " (" + img.href + ")";
      return new TextRun({ text: label, italics: true, color: "888888" });
    }
    var w = loaded.width, h = loaded.height;
    if (w > MAX_IMG_PX) {
      h = Math.round(h * MAX_IMG_PX / w);
      w = MAX_IMG_PX;
    }
    return new ImageRun({ data: loaded.bytes, transformation: { width: w, height: h } });
  }
  function blocks(tokens, ctx) {
    var out = [];
    (tokens || []).forEach(function(t) {
      switch (t.type) {
        case "space":
          break;
        case "heading":
          out.push(new Paragraph({
            heading: HeadingLevel["HEADING_" + Math.min(t.depth, 6)],
            children: runs(t.tokens, ctx)
          }));
          break;
        case "paragraph":
        case "text":
          out.push(para(t.tokens != null ? t.tokens : [t], ctx));
          break;
        case "code":
          out.push.apply(out, codeBlocks(t.text, ctx));
          break;
        case "blockquote":
          out.push.apply(out, blocks(t.tokens, merge2(ctx, {
            quote: ctx.quote + 1,
            color: "595959"
          })));
          break;
        case "list":
          out.push.apply(out, list(t, ctx, 0));
          break;
        case "table":
          out.push(table(t, ctx));
          break;
        case "hr":
          out.push(new Paragraph({
            spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } }
          }));
          break;
        case "html": {
          var stripped = t.text.replace(/<[^>]*>/g, "").trim();
          if (stripped) {
            out.push(new Paragraph({
              children: [new TextRun({ text: decodeEntities(stripped) })]
            }));
          }
          break;
        }
        default:
          if (t.tokens) out.push(para(t.tokens, ctx));
      }
    });
    return out;
  }
  function para(inlineTokens, ctx, extraRun, paraOpts) {
    var opts = paraOpts || {};
    opts.children = runs(inlineTokens, ctx, extraRun);
    applyQuote(opts, ctx);
    return new Paragraph(opts);
  }
  function applyQuote(opts, ctx) {
    if (ctx.quote) {
      opts.indent = mergeIndent(opts.indent, { left: 360 * ctx.quote + (ctx.indent || 0) });
      opts.border = {
        left: { style: BorderStyle.SINGLE, size: 18, color: "C9C4E0", space: 8 }
      };
    } else if (ctx.indent) {
      opts.indent = mergeIndent(opts.indent, { left: ctx.indent });
    }
  }
  function mergeIndent(a, b) {
    var o = a || {};
    for (var k in b) o[k] = b[k];
    return o;
  }
  function codeBlocks(text, ctx) {
    var lines = text.split("\n");
    return lines.map(function(line, i) {
      var opts = {
        children: [new TextRun({ text: line || " ", font: "Consolas", size: 18 })],
        shading: { type: ShadingType.CLEAR, fill: "F4F3F8", color: "auto" },
        spacing: { after: i === lines.length - 1 ? 160 : 0, line: 240 }
      };
      if (ctx.indent || ctx.quote) opts.indent = { left: (ctx.indent || 0) + 360 * ctx.quote };
      return new Paragraph(opts);
    });
  }
  function list(t, ctx, level) {
    var out = [];
    var instance = 0;
    if (t.ordered) instance = ++ctx.numInstance;
    t.items.forEach(function(item) {
      var first = true;
      var taskRun = item.task ? new TextRun({ text: item.checked ? "\u2611 " : "\u2610 " }) : null;
      (item.tokens || []).forEach(function(bt) {
        if (bt.type === "list") {
          out.push.apply(out, list(bt, ctx, level + 1));
          first = false;
        } else if (bt.type === "text" || bt.type === "paragraph") {
          if (first) {
            out.push(para(bt.tokens != null ? bt.tokens : [bt], ctx, taskRun, {
              numbering: {
                reference: t.ordered ? "mdw-number" : "mdw-bullet",
                level: Math.min(level, 8),
                instance
              },
              spacing: { after: 80 }
            }));
            first = false;
          } else {
            out.push(para(
              bt.tokens != null ? bt.tokens : [bt],
              merge2(ctx, { indent: 720 * (level + 1) }),
              null,
              { spacing: { after: 80 } }
            ));
          }
        } else if (bt.type === "space") {
        } else {
          out.push.apply(out, blocks([bt], merge2(ctx, { indent: 720 * (level + 1) })));
          first = false;
        }
      });
      if (first) {
        out.push(new Paragraph({
          children: taskRun ? [taskRun] : [],
          numbering: {
            reference: t.ordered ? "mdw-number" : "mdw-bullet",
            level: Math.min(level, 8),
            instance
          },
          spacing: { after: 80 }
        }));
      }
    });
    return out;
  }
  function table(t, ctx) {
    var aligns = (t.align || []).map(function(a) {
      return a === "center" ? AlignmentType.CENTER : a === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;
    });
    function cell(c, i, isHeader) {
      var cellCtx = isHeader ? merge2(ctx, { bold: true }) : ctx;
      return new TableCell({
        children: [new Paragraph({
          children: c ? runs(c.tokens, cellCtx) : [],
          alignment: aligns[i],
          spacing: { after: 0 }
        })],
        shading: isHeader ? { type: ShadingType.CLEAR, fill: "EFEDF6", color: "auto" } : void 0,
        margins: { top: 60, bottom: 60, left: 110, right: 110 }
      });
    }
    var rows = [new TableRow({
      tableHeader: true,
      children: t.header.map(function(c, i) {
        var tc = cell(c, i, true);
        return tc;
      })
    })];
    t.rows.forEach(function(r) {
      rows.push(new TableRow({
        children: r.map(function(c, i) {
          return cell(c, i, false);
        })
      }));
    });
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows
    });
  }
  function merge2(ctx, over) {
    var o = {};
    for (var k in ctx) o[k] = ctx[k];
    for (var j in over) o[j] = over[j];
    return o;
  }

  // build/.shims/pdfmake.js
  var lib4 = globalThis.pdfMake;
  var pdfmake_default = lib4;

  // src/exporters/pdf.js
  var CONTENT_W = 504;
  function pdf(md, base) {
    var tokens = lex(md);
    return loadImages(collectImages(tokens)).then(function(images) {
      var dd = {
        info: { title: base || "document", creator: "Markdown Wizard" },
        pageSize: "LETTER",
        pageMargins: [54, 60, 54, 66],
        defaultStyle: { fontSize: 11, lineHeight: 1.35, color: "#1b1b24" },
        styles: {
          h1: { fontSize: 23, bold: true, margin: [0, 14, 0, 6] },
          h2: { fontSize: 18, bold: true, margin: [0, 13, 0, 5] },
          h3: { fontSize: 14.5, bold: true, margin: [0, 11, 0, 4] },
          h4: { fontSize: 12.5, bold: true, margin: [0, 10, 0, 4] },
          h5: { fontSize: 11.5, bold: true, margin: [0, 9, 0, 3] },
          h6: { fontSize: 11, bold: true, color: "#666672", margin: [0, 9, 0, 3] }
        },
        footer: function(page, total) {
          return { text: page + " / " + total, alignment: "center", fontSize: 9, color: "#9a9aa6", margin: [0, 24, 0, 0] };
        },
        content: blocks2(tokens, { images })
      };
      var pdf2 = pdfmake_default.createPdf(dd);
      return new Promise(function(resolve, reject) {
        try {
          pdf2.getBlob(function(blob) {
            resolve(blob);
          });
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  function textRuns(tokens, ctx) {
    var out = [];
    inlines(tokens).forEach(function(r) {
      if (r.br) {
        out.push({ text: "\n" });
        return;
      }
      if (r.image) {
        out.push({ text: "[" + (r.image.alt || "image") + "]", italics: true, color: "#8a8a96" });
        return;
      }
      var o = { text: r.text || "" };
      if (r.bold) o.bold = true;
      if (r.italic) o.italics = true;
      if (r.strike) o.decoration = "lineThrough";
      if (r.code) {
        o.background = "#F2F1F7";
        o.fontSize = 9.5;
      }
      if (r.href) {
        o.link = r.href;
        o.color = "#0B62C4";
        o.decoration = r.strike ? "lineThrough" : "underline";
      }
      out.push(o);
    });
    return out.length ? out : [{ text: "" }];
  }
  function isImageOnlyParagraph(t) {
    var toks = t.tokens || [];
    var sawImage = false;
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      if (tk.type === "image") {
        sawImage = true;
        continue;
      }
      if (tk.type === "text" && !(tk.text || "").trim()) continue;
      if (tk.type === "br") continue;
      return false;
    }
    return sawImage;
  }
  function blocks2(tokens, ctx) {
    var out = [];
    (tokens || []).forEach(function(t) {
      switch (t.type) {
        case "space":
          break;
        case "heading":
          out.push({ text: textRuns(t.tokens, ctx), style: "h" + Math.min(t.depth, 6) });
          break;
        case "paragraph":
        case "text": {
          if (t.type === "paragraph" && isImageOnlyParagraph(t)) {
            (t.tokens || []).forEach(function(tk) {
              if (tk.type !== "image") return;
              var img = ctx.images.get(tk.href);
              if (img) {
                out.push({ image: img.dataURL, fit: [CONTENT_W, 380], margin: [0, 4, 0, 10] });
              } else {
                var label = "[" + (tk.text || "image") + "]";
                if (tk.href && tk.href.slice(0, 5) !== "data:") label += " (" + tk.href + ")";
                out.push({ text: label, italics: true, color: "#8a8a96", margin: [0, 3, 0, 8] });
              }
            });
            break;
          }
          out.push({ text: textRuns(t.tokens != null ? t.tokens : [t], ctx), margin: [0, 3, 0, 8] });
          break;
        }
        case "code":
          out.push({
            table: { widths: ["*"], body: [[{
              text: t.text,
              preserveLeadingSpaces: true,
              fontSize: 9.5,
              lineHeight: 1.25,
              color: "#2b2b36"
            }]] },
            layout: {
              fillColor: function() {
                return "#F4F3F8";
              },
              hLineWidth: function() {
                return 0;
              },
              vLineWidth: function() {
                return 0;
              },
              paddingLeft: function() {
                return 10;
              },
              paddingRight: function() {
                return 10;
              },
              paddingTop: function() {
                return 8;
              },
              paddingBottom: function() {
                return 8;
              }
            },
            margin: [0, 4, 0, 10]
          });
          break;
        case "blockquote":
          out.push({
            table: { widths: [2.5, "*"], body: [[
              { text: "", fillColor: "#C9C4E0" },
              { stack: blocks2(t.tokens, ctx), margin: [8, 2, 0, 2], color: "#55555f" }
            ]] },
            layout: {
              defaultBorder: false,
              hLineWidth: function() {
                return 0;
              },
              vLineWidth: function() {
                return 0;
              },
              paddingLeft: function() {
                return 0;
              },
              paddingRight: function() {
                return 0;
              },
              paddingTop: function() {
                return 0;
              },
              paddingBottom: function() {
                return 0;
              }
            },
            margin: [0, 4, 0, 10]
          });
          break;
        case "list":
          out.push(list2(t, ctx));
          break;
        case "table":
          out.push(table2(t, ctx));
          break;
        case "hr":
          out.push({
            canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 0.8, lineColor: "#CFCFDA" }],
            margin: [0, 10, 0, 12]
          });
          break;
        case "html": {
          var stripped = t.text.replace(/<[^>]*>/g, "").trim();
          if (stripped) out.push({ text: decodeEntities(stripped), margin: [0, 3, 0, 8] });
          break;
        }
        default:
          if (t.tokens) out.push({ text: textRuns(t.tokens, ctx), margin: [0, 3, 0, 8] });
      }
    });
    return out;
  }
  function list2(t, ctx) {
    var items = t.items.map(function(item) {
      var stack = [];
      (item.tokens || []).forEach(function(bt) {
        if (bt.type === "text" || bt.type === "paragraph") {
          var runsArr = textRuns(bt.tokens != null ? bt.tokens : [bt], ctx);
          if (item.task && stack.length === 0) {
            runsArr.unshift({ text: item.checked ? "[x] " : "[  ] ", fontSize: 9.5, color: "#666672" });
          }
          stack.push({ text: runsArr, margin: [0, 1, 0, 2] });
        } else {
          stack.push.apply(stack, blocks2([bt], ctx));
        }
      });
      if (!stack.length) stack.push({ text: "" });
      return stack.length === 1 ? stack[0] : { stack };
    });
    var node = t.ordered ? { ol: items } : { ul: items };
    if (t.ordered && typeof t.start === "number" && t.start > 1) node.start = t.start;
    node.margin = [0, 2, 0, 8];
    node.markerColor = "#6D28D9";
    return node;
  }
  function table2(t, ctx) {
    var aligns = (t.align || []).map(function(a) {
      return a || "left";
    });
    function cells(row, isHeader) {
      return row.map(function(c, i) {
        var o = { text: c ? textRuns(c.tokens, ctx) : "", alignment: aligns[i] || "left" };
        if (isHeader) {
          o.bold = true;
          o.fillColor = "#EFEDF6";
        }
        return o;
      });
    }
    var body = [cells(t.header, true)];
    t.rows.forEach(function(r) {
      body.push(cells(r, false));
    });
    return {
      table: {
        headerRows: 1,
        widths: t.header.map(function() {
          return "auto";
        }),
        body
      },
      layout: {
        hLineWidth: function() {
          return 0.7;
        },
        vLineWidth: function() {
          return 0.7;
        },
        hLineColor: function() {
          return "#D9D9E3";
        },
        vLineColor: function() {
          return "#D9D9E3";
        },
        paddingLeft: function() {
          return 8;
        },
        paddingRight: function() {
          return 8;
        },
        paddingTop: function() {
          return 4;
        },
        paddingBottom: function() {
          return 4;
        }
      },
      margin: [0, 4, 0, 10]
    };
  }

  // src/index.js
  function exportAs({ fmt, md, title }) {
    const base = baseName(md, title);
    const name = base + (FORMATS[fmt] ? FORMATS[fmt].ext : "." + fmt);
    const wrap = (p) => Promise.resolve(p).then((blob) => ({ blob, name }));
    switch (fmt) {
      case "md":
        return wrap(new Blob([md], { type: "text/markdown;charset=utf-8" }));
      case "txt":
        return wrap(new Blob([txt(md)], { type: "text/plain;charset=utf-8" }));
      case "html":
        return wrap(new Blob([htmlPage(md, title)], { type: "text/html;charset=utf-8" }));
      case "doc":
        return wrap(new Blob(["\uFEFF", wordHtml(md, title)], { type: "application/msword;charset=utf-8" }));
      case "dot":
        return wrap(new Blob(["\uFEFF", wordHtml(md, title)], { type: "application/msword;charset=utf-8" }));
      case "rtf":
        return wrap(new Blob([rtf(md)], { type: "application/rtf" }));
      case "docx":
        return wrap(docx(md));
      case "pdf":
        return wrap(pdf(md, base));
      default:
        return Promise.reject(new Error("Unknown format: " + fmt));
    }
  }
  return __toCommonJS(index_exports);
})();
