/**
 * Builds src/ide/components/terminal/xtermHtml.generated.ts by inlining the
 * xterm.js distribution (lib + fit addon + web-links addon + css) into a
 * single offline HTML page. The generated blob is JSON-escaped so xterm
 * source can contain any characters safely; runtime colors are token-replaced
 * by buildXtermHtml().
 *
 * Run: node scripts/build-xterm-html.js
 * Re-run after any `npm install xterm` / `@xterm/addon-*` upgrade.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const xtermJs = read("node_modules/xterm/lib/xterm.js");
const fitJs = read("node_modules/@xterm/addon-fit/lib/addon-fit.js");
const linksJs = read("node_modules/@xterm/addon-web-links/lib/addon-web-links.js");
const xtermCss = read("node_modules/xterm/css/xterm.css");

const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>__XTERM_CSS__</style>
<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background: __BG__;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#terminal {
  height: 100%;
  width: 100%;
  padding: 6px 8px;
  box-sizing: border-box;
}
.xterm-helper-textarea { opacity: 0 !important; }
.xterm .xterm-viewport { background-color: transparent !important; }
</style>
</head>
<body>
<div id="terminal"></div>
<script>__XTERM_JS__</script>
<script>__FIT_JS__</script>
<script>__WEBLINKS_JS__</script>
<script>
(function () {
  var term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    cursorWidth: 2,
    fontSize: __FONT__,
    fontFamily: 'ui-monospace, "SF Mono", "Roboto Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    fontWeight: '500',
    fontWeightBold: '700',
    letterSpacing: 0.3,
    lineHeight: 1.25,
    scrollback: 5000,
    theme: __THEME_JSON__,
    minimumContrastRatio: 7,
    convertEol: false
  });
  var fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  // Tappable URLs (CLI login links, etc.): underline on hover/click, tap
  // posts the URL to React Native which opens the system browser. Touch
  // needs no modifier; desktop keeps the addon's default Ctrl+click.
  try {
    var links = new WebLinksAddon.WebLinksAddon(function (ev, uri) {
      post({ type: 'link', url: uri });
    });
    term.loadAddon(links);
  } catch (e) {}
  term.open(document.getElementById('terminal'));
  // Soft-keyboard input is owned by the React Native hidden catcher (it
  // ingests Gboard composition bursts reliably; xterm 5.3's textarea races
  // and drops fast input). Disabling the helper textarea keeps it from
  // stealing IME focus; hardware keydowns still reach a focused terminal.
  try {
    var ta = term.textarea;
    if (ta) { ta.setAttribute('disabled', 'disabled'); ta.setAttribute('inputmode', 'none'); }
  } catch (e) {}
  var termEl = document.getElementById('terminal');
  termEl.addEventListener('click', function () { post({ type: 'tap' }); });
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var resizeTimer = null;
  var fitAttempts = 0;
  var lastC = 0, lastR = 0;
  var reportSize = function () {
    try {
      // Never fit or report before layout exists: fitting a zero-size parent
      // slams xterm to a 2-col grid whose soft wraps never rejoin on grow —
      // that stale wrap is exactly the "frozen UI" look. Retry quietly; the
      // kernel keeps its ptyOpen size until the first real measurement, and
      // the JS side replays history once the true grid lands.
      var parent = term.element && term.element.parentElement;
      var pw = parent ? parent.clientWidth : 0;
      var ph = parent ? parent.clientHeight : 0;
      if (pw < 100 || ph < 100) {
        if (fitAttempts < 200) {
          fitAttempts++;
          setTimeout(reportSize, 100);
        }
        return;
      }
      fitAttempts = 0;
      fit.fit();
      // Clamp: never wedge the shell below a usable grid; dedupe so only
      // real changes signal (each post is a SIGWINCH + shell redraw).
      var c = Math.max(term.cols, 20), r = Math.max(term.rows, 10);
      if (c === lastC && r === lastR) return;
      lastC = c; lastR = r;
      post({ type: 'resize', cols: c, rows: r,
             vw: window.innerWidth, vh: window.innerHeight });
    } catch (e) {}
  };
  term.onData(function (d) { post({ type: 'data', data: d }); });
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reportSize, 200);
  });
  window.__astraWrite = function (b64) {
    try {
      var bin = atob(b64), n = bin.length, bytes = new Uint8Array(n);
      for (var i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
      term.write(bytes);
    } catch (e) {}
  };
  window.__astraReset = function () { try { term.reset(); } catch (e) {} };
  window.__astraFit = function () { reportSize(); };
  window.__astraFocus = function () { try { term.focus(); } catch (e) {} };
  window.__astraSetFontSize = function (px) { try { term.options.fontSize = px; reportSize(); } catch (e) {} };
  window.__astraSetTheme = function (thm) {
    try {
      term.options.theme = thm;
      if (thm && thm.background) {
        document.body.style.backgroundColor = thm.background;
      }
      reportSize();
    } catch (e) {}
  };
  window.__astraGetSelection = function () {
    try { post({ type: 'selection', text: term.getSelection() }); }
    catch (e) { post({ type: 'selection', text: '' }); }
  };
  window.__astraSelectAll = function () { try { term.selectAll(); } catch (e) {} };
  reportSize();
  post({ type: 'ready' });
  // Layout often settles after first paint (keyboard, flex): re-fit once so
  // the kernel grid matches the true viewport, not a transient one.
  setTimeout(reportSize, 800);
})();
</script>
</body>
</html>`;

const withLibs = html
  .replaceAll("__XTERM_CSS__", () => xtermCss)
  .replaceAll("__XTERM_JS__", () => xtermJs)
  .replaceAll("__FIT_JS__", () => fitJs)
  .replaceAll("__WEBLINKS_JS__", () => linksJs);

const out = `// GENERATED — do not hand-edit. Regenerate with: node scripts/build-xterm-html.js
// Inlines xterm.js + fit addon + css into one offline page; colors/fonts are
// token-replaced at runtime by buildXtermHtml().
// Speed: the ~300KB page literal evaluates on first terminal use, not app
// start (this module loads with the IDE shell). Cached after first build.
export interface XtermHtmlOptions {
  background: string;
  foreground: string;
  cursor: string;
  fontSize: number;
  theme?: Record<string, string>;
}

let blobCache: string | null = null;
function getBlob(): string {
  if (blobCache !== null) return blobCache;
  blobCache = ${JSON.stringify(withLibs)};
  return blobCache;
}

export function buildXtermHtml(o: XtermHtmlOptions): string {
  const themeObj = o.theme || {
    background: o.background,
    foreground: o.foreground,
    cursor: o.cursor,
  };
  return getBlob().replaceAll("__BG__", () => o.background)
    .replaceAll("__FG__", () => o.foreground)
    .replaceAll("__CURSOR__", () => o.cursor)
    .replaceAll("__FONT__", () => String(o.fontSize))
    .replaceAll("__THEME_JSON__", () => JSON.stringify(themeObj));
}
`;

const outPath = path.join(ROOT, "src/ide/components/terminal/xtermHtml.generated.ts");
fs.writeFileSync(outPath, out);
console.log("wrote", outPath, Buffer.byteLength(out), "bytes");
