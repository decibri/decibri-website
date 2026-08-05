#!/usr/bin/env node
/*
 * check-shared-css.mjs - drift verifier for decibri.com's duplicated CSS.
 *
 * WHY THIS EXISTS
 * ---------------
 * The four root pages (docs/index.html, docs/404.html, docs/privacy.html,
 * docs/cli/index.html) each carry their shared CSS inline, and docs/docs/styles.css
 * carries a fifth copy of much of it. That split is deliberate and measured: moving
 * the root pages' CSS into a stylesheet costs +104 ms to +2,424 ms of first paint on
 * cold throttled mobile. The duplication stays, so the sync is enforced here instead
 * of remembered.
 *
 * Two assertions live in this file:
 *
 *   1. CSS drift. Every rule that appears in two or more sources must carry identical
 *      declarations in all of them, unless an entry in EXCEPTIONS says otherwise and
 *      gives a reason. Named guard groups add presence checks on top for the things
 *      whose absence would be silent.
 *
 *   2. Codepoint coverage. The inline critical font subsets cover a limited character
 *      set. A page that adds a character outside it falls through to the full font,
 *      which on a cold mobile load has not arrived, and then to the metric-matched
 *      fallback, producing mixed typefaces inside a single heading. Every codepoint in
 *      the rendered text of every page is checked against the cmap decoded from the
 *      inline subsets themselves.
 *
 * HOW TO RUN
 * ----------
 *   node tools/check-shared-css.mjs              # both checks, exit 1 on any failure
 *   node tools/check-shared-css.mjs --verbose    # also print the passing inventory
 *   node tools/check-shared-css.mjs --only=css
 *   node tools/check-shared-css.mjs --only=codepoints
 *   node tools/check-shared-css.mjs --root <dir> # check a tree other than this repo
 *
 * WHEN IT FAILS
 * -------------
 * A drift failure names the rule, the sources that disagree and the differing
 * declarations. Decide which copy is correct, then either propagate the fix to every
 * copy or, if the divergence is deliberate, add an EXCEPTIONS entry with a written
 * reason. An exception without a real reason is how drift hides; do not add one to
 * silence a failure you have not understood.
 *
 * A coverage failure names the codepoint, the page and the surrounding text. It is not
 * automatically a page bug: it may mean the subsets should be widened instead. Both
 * fixes are the maintainer's call. Regenerating the subsets is documented in CLAUDE.md
 * under "Inline critical font subsets"; the covered set is read from the shipped
 * payloads, so it needs no update here when they change.
 *
 * NO DEPENDENCIES, NO BUILD STEP. Plain Node, node: builtins only. Nothing this script
 * does affects what ships; deleting it would not change a byte of the site.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* ============================================================================
 * 1. Configuration: guard groups and exceptions
 * ========================================================================== */

/*
 * Guard groups add presence and count assertions on top of the universal identity
 * check. Every rule is claimed by the first claiming group that matches it, so the
 * order below is meaningful.
 *
 *   selectors  - explicit rule keys. A key is "<selector>" at the top level, or
 *                "<at-rule scope>||<selector>" inside one. Run --inventory to see them.
 *   match      - predicate, for groups whose membership is derived rather than listed.
 *   claims     - false for a group that only asserts and does not take keys away from
 *                the groups after it.
 *   require.sources
 *                'all'  - every rule in the group must appear in every source
 *                'root' - every rule must appear in every root page (a source outside
 *                         that class carrying it is still checked for identity)
 *                'any'  - no presence requirement
 *   require.exactRules    - each required source must carry exactly this many
 *   require.minRules      - the group must hold at least this many distinct rules
 *   require.minSources    - the group's rules must appear in at least this many sources
 *   require.minLargestSet - the largest single presence set inside the group must hold
 *                           at least this many rules, which catches a shared block
 *                           being gutted out of one page without enumerating it
 *   redactValues          - values too large to print; compared and reported by hash
 *
 * The counts below were read off the current tree with --inventory, not guessed.
 */
const GUARD_GROUPS = [
  {
    id: 'inline-font-subsets',
    title: 'Inline critical font subsets: Outfit Inline, JetBrains Mono Inline',
    why: 'Roughly 60 KB of base64 duplicated five ways. One differing byte means one page renders a different font, and no reviewer can see it.',
    match: (r) => r.fontFamily !== null && /\bInline\b/.test(r.fontFamily),
    require: { sources: 'all', exactRules: 2 },
    redactValues: true,
  },
  {
    id: 'linked-font-faces',
    title: 'Linked @font-face set, including both metric-matched fallbacks',
    why: 'size-adjust: 99.8204% is not a value anyone spots by eye, and a drifted override reintroduces the layout shift the fallbacks exist to prevent.',
    match: (r) => r.fontFamily !== null,
    require: { sources: 'all', exactRules: 6 },
  },
  {
    id: 'font-stack-vars',
    title: '--font-display and --font-mono stacks',
    why: 'The inline families are attached to the page only through these two variables. A copy that lost the prepended family renders the wrong font on that page alone, and nothing else would show it.',
    claims: false,
    selectors: [':root', 'html'],
    declarations: ['--font-display', '--font-mono'],
    valueMustContain: {
      '--font-display': "'Outfit Inline'",
      '--font-mono': "'JetBrains Mono Inline'",
    },
    require: { sources: 'all' },
  },
  {
    id: 'shared-tokens',
    title: 'Design tokens and element resets shared by all five sources',
    why: 'The colour and spacing tokens every other rule resolves through. The two smaller root pages carry narrower token sets on purpose; see EXCEPTIONS.',
    selectors: ['*', ':root', '[data-theme="light"]', 'body', 'html'],
    require: { sources: 'all' },
  },
  {
    id: 'shared-chrome',
    title: 'Shared chrome: nav logo, mobile nav, mobile menu, close button',
    why: 'Present in all five sources. The mobile-menu overflow bug lived here: a scroll fix applied to three copies and not to the two pages that needed it.',
    selectors: [
      '.mobile-menu',
      '.mobile-menu a',
      '.mobile-menu a:hover',
      '.mobile-menu a:last-child',
      '.mobile-menu-close',
      '.mobile-menu-close svg',
      '.mobile-menu-close:focus-visible',
      '.mobile-menu-close:hover',
      '.mobile-menu-overlay',
      '.mobile-menu-overlay.open',
      '.mobile-menu.open',
      '.mobile-nav',
      '.mobile-nav .nav-cta',
      '.mobile-nav .nav-cta svg',
      '.mobile-nav .nav-cta:hover',
      '.mobile-nav-btn',
      '.mobile-nav-btn .icon-moon',
      '.mobile-nav-btn .icon-sun',
      '.mobile-nav-btn svg',
      '.mobile-nav-btn:hover',
      '.nav-logo',
      '.nav-logo span',
      '.nav-logo::before',
      '[data-theme="light"] .mobile-nav-btn .icon-moon',
      '[data-theme="light"] .mobile-nav-btn .icon-sun',
    ],
    require: { sources: 'all' },
  },
  {
    id: 'shared-footer',
    title: 'Footer inner components, compared across the .doc-footer prefix',
    why: 'The docs stylesheet writes these under a .doc-footer prefix and says in a comment that it mirrors the root-page footer, but nothing enforced it. SELECTOR_PREFIX_MAP aligns the keys so the two sides are compared at all.',
    selectors: [
      '.footer-badge',
      '.footer-badge svg',
      '.footer-badge:hover',
      '.footer-badges',
      '.footer-copyright',
      '.footer-legal',
      '.footer-legal a',
      '.footer-legal a + a::before',
      '.footer-legal a:hover',
    ],
    require: { sources: 'all' },
  },
  {
    id: 'root-chrome',
    title: 'Root-page chrome: nav, footer container, theme toggle',
    why: 'Present in all four root pages and copied verbatim into every new one, so it is the set most likely to be pasted stale.',
    selectors: [
      '.footer-container',
      '.mobile-menu a:first-of-type',
      '.nav-links',
      '.nav-links .nav-cta',
      '.nav-links .nav-cta:hover',
      '.nav-links a',
      '.nav-links a:hover',
      '.theme-toggle',
      '.theme-toggle .icon-moon',
      '.theme-toggle .icon-sun',
      '.theme-toggle svg',
      '.theme-toggle:hover',
      '[data-theme="light"] .nav-links .nav-cta',
      '[data-theme="light"] .theme-toggle .icon-moon',
      '[data-theme="light"] .theme-toggle .icon-sun',
      '[data-theme="light"] nav',
      'footer',
      'nav',
      'nav .nav-inner',
      '@media (max-width:640px)||.mobile-nav',
      '@media (max-width:640px)||.nav-links',
      '@media (max-width:640px)||nav',
    ],
    require: { sources: 'root' },
  },
  {
    id: 'code-tabs',
    title: 'Tabbed code-block system, shared between the homepage and the docs',
    why: 'The homepage comments its copy as "shared markup with docs/styles.css .code-tabs system". Shared markup driven by a shared script, so the two copies have to agree or the same DOM renders differently on the two sides of the site.',
    selectors: [
      '.code-tab-bar',
      '.code-tab-bar::-webkit-scrollbar',
      '.code-tab-btn',
      '.code-tab-btn:focus-visible',
      '.code-tab-btn:hover:not([aria-selected="true"])',
      '.code-tab-btn[aria-selected="true"]',
      '.code-tab-panel',
      '.code-tab-panel[hidden]',
      '.code-tabs',
      '[data-theme="light"] .code-tab-bar',
      '[data-theme="light"] .code-tab-btn',
      '[data-theme="light"] .code-tab-btn:hover:not([aria-selected="true"])',
      '[data-theme="light"] .code-tab-btn[aria-selected="true"]',
      '@media (max-width:640px)||.code-tab-btn',
    ],
    require: { sources: 'any', minSources: 2 },
  },
  {
    id: 'root-shared-components',
    title: 'Everything else shared between root pages and absent from the docs stylesheet',
    why: 'Holds the largest duplication in the repository: 93 rules of hero, feature-grid, badge and section CSS held identically in the two marketing pages. Any convention scoped to "header and footer" misses it entirely. Derived rather than enumerated, so a component added to two root pages is guarded the moment it lands.',
    match: (r, ctx) => ctx.rootOnlyShared.has(r.key),
    require: { sources: 'any', minSources: 2, minRules: 90, minLargestSet: 90 },
  },
];

/*
 * Legitimate divergence. Every entry needs a reason, and every entry was re-verified
 * against the current tree before being written in.
 *
 *   key       - "<at-rule scope>||<normalised selector>", or just the selector when the
 *               rule is at the top level. Run with --verbose to see the exact keys.
 *   sources   - repo-relative paths allowed to diverge on this rule. Omit to allow any.
 *   props     - restrict the exception to these properties. Omit to except the whole
 *               rule, which is blunter; prefer naming the properties.
 *   reason    - required. Why the difference is correct, not just what it is.
 */
const EXCEPTIONS = [
  {
    key: 'body',
    sources: ['docs/docs/styles.css'],
    props: ['display', 'min-height'],
    reason:
      'The docs pages lay out a sidebar next to the content, so the docs stylesheet sets display:flex and min-height:100vh on body. The root pages have no sidebar and must not be flex containers.',
  },
  {
    key: '.mobile-menu-overlay',
    sources: ['docs/docs/styles.css'],
    props: ['z-index'],
    reason:
      'The docs sidebar occupies the intermediate stacking range, so the overlay needs z-index 250 there against 150 on the root pages. Matching them would put the overlay behind the sidebar.',
  },
  {
    key: ':root',
    sources: ['docs/404.html', 'docs/privacy.html', 'docs/docs/styles.css'],
    reason:
      'privacy.html and 404.html declare a correctly narrower token set: they reference none of the variables they omit. styles.css adds --sidebar-width, which only the docs layout uses. Verified by grepping each omitted variable against each page.',
  },
  {
    key: '[data-theme="light"]',
    sources: ['docs/404.html', 'docs/privacy.html', 'docs/docs/styles.css'],
    reason:
      'The light-theme override block mirrors :root and is narrower on the same two pages for the same reason.',
  },
  {
    key: 'html',
    sources: ['docs/404.html', 'docs/privacy.html', 'docs/docs/styles.css'],
    props: ['scroll-behavior', 'overflow-x'],
    reason:
      'scroll-behavior:smooth is absent from privacy.html and 404.html deliberately. 404.html has no in-page anchors at all, and privacy.html has exactly one, the accessibility skip link, where animating the jump delays focus arrival and works against the purpose. overflow-x:hidden is absent for the same pair: both were measured at nine widths with scrollWidth === clientWidth, and the only element past the right edge is the closed .mobile-menu at translateX(100%), which is position:fixed and contributes no scrollable overflow. Adding it would also silently disable position:sticky for descendants.',
  },
  {
    key: '.code-tabs',
    sources: ['docs/index.html'],
    props: ['margin'],
    reason:
      'The homepage omits margin:16px 0 because both .code-tabs instances there also carry .hero-code-tabs, which sets margin:0 0 36px later in source at equal specificity and wins outright, and the second also carries an inline margin-top. Adding the declaration was tested by CSSOM injection into the real rule and changed no computed margin and no element position. It would be inert, and it would imply the homepage inherits docs spacing when it deliberately does not.',
  },
  {
    key: '.mobile-menu',
    sources: ['docs/docs/styles.css'],
    props: ['z-index'],
    reason:
      'Same stacking offset as .mobile-menu-overlay. The docs stylesheet puts .sidebar at position:fixed z-index:251 and .sidebar-overlay at 250, so the mobile menu pair is offset by exactly +100 there (250/251 against the root pages\' 150/151) to clear the sidebar. Matching the root value would put the open menu underneath the sidebar.',
  },
  {
    key: 'body',
    sources: ['docs/docs/styles.css'],
    props: ['overflow-x'],
    reason:
      'The docs stylesheet applies the horizontal-overflow guard one level down, at .doc-container, under a section commented "Mobile hardening: prevent horizontal overflow regressions". That placement is deliberate: it sits below .doc-content pre, .table-wrap, .breadcrumb and the code-tab bar, each of which sets overflow-x:auto and has to keep its own scroll container. Hoisting the guard to body would clamp above them.',
  },
  {
    key: '.footer-badge:hover',
    sources: ['docs/docs/styles.css'],
    props: ['opacity'],
    reason:
      'The docs copy adds opacity:1, and the reason is written above the rule in styles.css: it neutralises .doc-content a:hover { opacity: 0.8 }, which exists on the docs side and not on the root pages. The extra declaration is there to make the docs footer hover match the root-page footer, so removing it would create the visual divergence rather than close one.',
  },
  {
    key: '.footer-legal a:hover',
    sources: ['docs/docs/styles.css'],
    props: ['opacity'],
    reason:
      'Same override, same cause: .doc-content a:hover { opacity: 0.8 } applies to the legal links on docs pages only, and opacity:1 restores the root pages\' pure colour change.',
  },
  {
    key: '.footer-copyright',
    sources: ['docs/docs/styles.css'],
    props: ['margin'],
    reason:
      'The docs copy adds margin:0 to cancel .doc-content p { margin-bottom: 16px }, which the root pages do not have. Again additive, and again in service of matching the root-page rendering rather than diverging from it.',
  },
  {
    key: 'main',
    sources: ['docs/404.html'],
    reason:
      'Not a shared component. 404.html centres a single error block in the viewport (display:flex, min-height:100vh, text-align:center) while privacy.html uses main as an ordinary document column. Two different layouts that happen to be written against the same element selector, so the keys collide without the rules being related.',
  },
];

/*
 * Selector prefix mapping. The footer is duplicated under a different prefix: the root
 * pages use `.footer-badges`, the docs stylesheet uses `.doc-footer .footer-badges`.
 * Six of nine inner components are declaration-identical and styles.css carries a
 * comment saying the block mirrors the root-page footer, but a selector-keyed check
 * would never see them drift apart because the keys do not match. Stripping the
 * container prefix aligns them.
 *
 * The container itself (`.doc-footer` alone) is deliberately NOT mapped onto `footer`:
 * the two containers have genuinely different layout and are not meant to match.
 */
const SELECTOR_PREFIX_MAP = [
  {
    source: 'docs/docs/styles.css',
    // ".doc-footer X" -> "X", but not bare ".doc-footer".
    from: /^\.doc-footer\s+(?=\S)/,
    to: '',
    reason: 'The docs footer mirrors the root-page footer under a .doc-footer prefix.',
  },
];

/*
 * Attribute values that render as visible text. Everything else is excluded: href/src
 * URLs, <title> and <meta> content (rendered by browser chrome and social cards, not by
 * the page's fonts), data-* hooks, and all <script> content including JSON-LD.
 */
const RENDERED_ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];

/* ============================================================================
 * 2. Source discovery
 * ========================================================================== */

/*
 * Sources are discovered by listing directories, never from a fixed list, so a root
 * page added tomorrow is checked tomorrow. A page that links the shared stylesheet
 * gets its shared CSS from there and is classified as a docs page; a page that does
 * not must carry the shared CSS inline and is classified as a root page. A new root
 * page added without the shared block is therefore still classified as a root page,
 * and fails the presence checks rather than escaping them.
 */
const SHARED_STYLESHEET = 'docs/docs/styles.css';
const STYLESHEET_LINK = /<link[^>]+href=["']\/docs\/styles\.css["']/i;

function discoverSources(root) {
  const docsDir = path.join(root, 'docs');
  const candidates = [];

  for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      candidates.push(path.join('docs', entry.name));
    } else if (entry.isDirectory()) {
      const index = path.join(docsDir, entry.name, 'index.html');
      if (existsFile(index)) candidates.push(path.join('docs', entry.name, 'index.html'));
    }
  }

  const sources = [];
  for (const rel of candidates.sort()) {
    const abs = path.join(root, rel);
    const text = readFileSync(abs, 'utf8');
    const kind = STYLESHEET_LINK.test(text) ? 'docs-page' : 'root-page';
    if (kind === 'root-page') sources.push({ rel: toPosix(rel), abs, kind, text });
  }

  const sheetAbs = path.join(root, SHARED_STYLESHEET);
  if (existsFile(sheetAbs)) {
    sources.push({
      rel: SHARED_STYLESHEET,
      abs: sheetAbs,
      kind: 'stylesheet',
      text: readFileSync(sheetAbs, 'utf8'),
    });
  }

  return sources.sort((a, b) => a.rel.localeCompare(b.rel));
}

/* Every HTML page under the root, for the codepoint check. */
function discoverPages(root) {
  const out = [];
  walk(path.join(root, 'docs'), (abs) => {
    if (abs.toLowerCase().endsWith('.html')) out.push(toPosix(path.relative(root, abs)));
  });
  return out.sort();
}

/*
 * External scripts, also for the codepoint check. nav.js injects the whole docs footer
 * at runtime, so its text is painted with the page's fonts but never appears in any
 * HTML file. Only string literals are read, not comments: the one non-ASCII character
 * in an inline script on this site today sits in a JS comment, and flagging that would
 * be a false positive.
 */
function discoverScripts(root) {
  const out = [];
  walk(path.join(root, 'docs'), (abs) => {
    if (abs.toLowerCase().endsWith('.js')) out.push(toPosix(path.relative(root, abs)));
  });
  return out.sort();
}

const JS_STRING = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

function scriptLiterals(js) {
  const out = [];
  const stripped = js
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1 ');
  for (const m of stripped.matchAll(JS_STRING)) out.push(decodeJsEscapes(m[2]));
  return out;
}

function decodeJsEscapes(s) {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\(.)/g, '$1');
}

function walk(dir, onFile) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, onFile);
    else if (entry.isFile()) onFile(abs);
  }
}

function existsFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

const toPosix = (p) => p.split(path.sep).join('/');

/* ============================================================================
 * 3. CSS tokeniser
 * ========================================================================== */

/*
 * Hand-rolled rather than a dependency. The site has no build step and no package.json
 * at the repository root, so adding one for a script that reads five files would cost
 * more than it saves. The grammar in play here is small and closed: style rules,
 * @media, @font-face, declarations, comments, strings and url() payloads. The tokeniser
 * below handles exactly that and reports anything it cannot account for rather than
 * guessing, so a future construct it does not know about surfaces as an error instead
 * of being silently dropped.
 */
const CONDITIONAL_AT_RULES = new Set([
  'media', 'supports', 'layer', 'container', 'scope', 'document',
  'keyframes', '-webkit-keyframes', '-moz-keyframes',
]);

function parseCss(text, { origin, lineOffset = 0 }) {
  const rules = [];
  const problems = [];
  const stack = [];
  let buf = '';
  let bufStart = 0;
  let i = 0;
  const n = text.length;

  const lineAt = (idx) => lineOffset + countLines(text, idx);

  while (i < n) {
    const c = text[i];

    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const { value, next } = readString(text, i);
      buf += value;
      i = next;
      continue;
    }
    if (c === '{') {
      const prelude = buf.trim();
      const preludeLine = lineAt(bufStart);
      buf = '';
      bufStart = i + 1;
      const atName = prelude.startsWith('@')
        ? prelude.slice(1).split(/[\s({]/, 1)[0].toLowerCase()
        : null;

      if (atName !== null && CONDITIONAL_AT_RULES.has(atName)) {
        stack.push(normaliseScope(prelude));
        i++;
        continue;
      }

      const body = readBlock(text, i);
      if (body === null) {
        problems.push(`${origin}:${preludeLine}: unterminated block after "${prelude}"`);
        break;
      }
      const { declarations, unparsed } = parseDeclarations(body.inner);
      for (const u of unparsed) {
        problems.push(`${origin}:${preludeLine}: unparsed fragment in "${prelude}": ${u}`);
      }
      rules.push(makeRule({ origin, scopeStack: stack, prelude, declarations, line: preludeLine }));
      i = body.next;
      bufStart = i;
      continue;
    }
    if (c === '}') {
      if (buf.trim() !== '') {
        problems.push(`${origin}:${lineAt(bufStart)}: stray text before "}": ${buf.trim().slice(0, 60)}`);
      }
      if (stack.length === 0) {
        problems.push(`${origin}:${lineAt(i)}: unbalanced "}"`);
      } else {
        stack.pop();
      }
      buf = '';
      i++;
      bufStart = i;
      continue;
    }
    if (c === ';' && buf.trim().startsWith('@')) {
      // Statement at-rule such as @import or @charset. Recorded, not compared.
      buf = '';
      i++;
      bufStart = i;
      continue;
    }
    if (buf === '' && /\s/.test(c)) {
      i++;
      bufStart = i;
      continue;
    }
    buf += c;
    i++;
  }

  if (stack.length !== 0) problems.push(`${origin}: ${stack.length} unclosed at-rule block(s)`);
  return { rules, problems };
}

function readString(text, start) {
  const quote = text[start];
  let out = quote;
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      out += c + (text[i + 1] ?? '');
      i += 2;
      continue;
    }
    out += c;
    i++;
    if (c === quote) break;
  }
  return { value: out, next: i };
}

/* Reads the block starting at the "{" at `start`, returning its inner text. */
function readBlock(text, start) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i = readString(text, i).next;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { inner: text.slice(start + 1, i), next: i + 1 };
    }
    i++;
  }
  return null;
}

function parseDeclarations(body) {
  const declarations = [];
  const unparsed = [];
  let buf = '';
  let paren = 0;
  let i = 0;

  const flush = () => {
    const raw = buf.trim();
    buf = '';
    if (raw === '') return;
    const colon = indexOfTopLevel(raw, ':');
    if (colon === -1) {
      unparsed.push(raw.slice(0, 80));
      return;
    }
    const prop = raw.slice(0, colon).trim();
    const value = collapse(raw.slice(colon + 1));
    if (prop === '') {
      unparsed.push(raw.slice(0, 80));
      return;
    }
    declarations.push({
      prop: prop.startsWith('--') ? prop : prop.toLowerCase(),
      value,
    });
  };

  while (i < body.length) {
    const c = body[i];
    if (c === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const s = readString(body, i);
      buf += s.value;
      i = s.next;
      continue;
    }
    if (c === '(') paren++;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === ';' && paren === 0) {
      flush();
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return { declarations, unparsed };
}

function indexOfTopLevel(s, ch) {
  let paren = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      i = readString(s, i).next - 1;
      continue;
    }
    if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === ch && paren === 0) return i;
  }
  return -1;
}

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

function normaliseScope(prelude) {
  return collapse(prelude)
    .replace(/\s*:\s*/g, ':')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/^@([a-zA-Z-]+)/, (_, name) => '@' + name.toLowerCase());
}

/*
 * Selector normalisation for the key. Whitespace and combinator spacing are collapsed,
 * and a selector list is sorted. Sorting is safe: every selector in a list applies the
 * same declarations at its own specificity, so their order carries no meaning, and
 * without sorting a reordered list would report as two unrelated missing rules.
 */
function normaliseSelector(sel) {
  const parts = splitTopLevel(sel, ',').map((p) =>
    collapse(p)
      .replace(/\s*([>+~])\s*/g, ' $1 ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  return parts.filter((p) => p !== '').sort().join(', ');
}

function splitTopLevel(s, ch) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const r = readString(s, i);
      buf += r.value;
      i = r.next - 1;
      continue;
    }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ch && depth === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  out.push(buf);
  return out;
}

function makeRule({ origin, scopeStack, prelude, declarations, line }) {
  const scope = scopeStack.join(' ');
  const isFontFace = /^@font-face$/i.test(prelude.trim());
  let fontFamily = null;
  if (isFontFace) {
    const fam = declarations.find((d) => d.prop === 'font-family');
    fontFamily = fam ? fam.value.replace(/^['"]|['"]$/g, '') : '(unnamed)';
  }
  const selectorKey = isFontFace ? '@font-face' : normaliseSelector(prelude);
  return {
    origin,
    line,
    scope,
    selectorRaw: collapse(prelude),
    selectorKey,
    fontFamily,
    declarations,
    key: null, // assigned after per-file disambiguation
  };
}

function countLines(text, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/* ============================================================================
 * 4. Extracting CSS from a source
 * ========================================================================== */

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

function cssOf(source) {
  if (source.kind === 'stylesheet') {
    return parseCss(source.text, { origin: source.rel, lineOffset: 0 });
  }
  const rules = [];
  const problems = [];
  for (const m of source.text.matchAll(STYLE_BLOCK)) {
    const lineOffset = countLines(source.text, m.index) - 1;
    const parsed = parseCss(m[1], { origin: source.rel, lineOffset });
    rules.push(...parsed.rules);
    problems.push(...parsed.problems);
  }
  return { rules, problems };
}

/*
 * Keys are (at-rule scope, selector). Two rules in one file can share a key - the docs
 * stylesheet deliberately extends .doc-footer in a second block - so same-key rules
 * within a file are merged in source order, which is what the cascade does anyway.
 * @font-face has no selector, so it is keyed by family plus its ordinal among faces of
 * the same family, which distinguishes the latin and latin-ext splits while still
 * reporting a changed unicode-range as a changed declaration rather than a missing rule.
 */
function indexRules(source, rules) {
  const famCount = new Map();
  const byKey = new Map();

  for (const r of rules) {
    let selector = r.selectorKey;
    if (r.fontFamily !== null) {
      const nth = famCount.get(r.fontFamily) ?? 0;
      famCount.set(r.fontFamily, nth + 1);
      selector = `@font-face[${r.fontFamily}${nth > 0 ? `#${nth}` : ''}]`;
    } else {
      for (const map of SELECTOR_PREFIX_MAP) {
        if (map.source === source.rel && map.from.test(selector)) {
          selector = normaliseSelector(selector.replace(map.from, map.to));
          r.mappedFrom = r.selectorRaw;
        }
      }
    }
    const key = r.scope === '' ? selector : `${r.scope}||${selector}`;
    r.key = key;
    r.selectorKey = selector;

    const existing = byKey.get(key);
    if (existing) {
      existing.declarations.push(...r.declarations);
      existing.blocks.push(r.line);
    } else {
      byKey.set(key, {
        key,
        scope: r.scope,
        selectorKey: selector,
        selectorRaw: r.selectorRaw,
        mappedFrom: r.mappedFrom ?? null,
        fontFamily: r.fontFamily,
        declarations: [...r.declarations],
        blocks: [r.line],
        origin: source.rel,
      });
    }
  }
  return byKey;
}

/* ============================================================================
 * 5. Comparison
 * ========================================================================== */

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/*
 * Any value too long to read in a terminal is reported as a length and a hash instead.
 * That is what keeps a drifted font subset from dumping 30 KB of base64 into the
 * output, and it applies to every large value, not only the ones known about today.
 */
const REDACT_OVER = 120;
function renderValue(value, redact) {
  if (redact || value.length > REDACT_OVER) {
    return `<${value.length} bytes, sha256 ${sha(value).slice(0, 16)}>`;
  }
  return value;
}

/*
 * Set by --no-exceptions, which shows exactly what the exception list is holding back.
 * Useful when auditing whether an entry has outlived its reason, and it is how the
 * verifier was shown to fail on this tree before the list was written.
 */
let exceptionsEnabled = true;

function exceptionFor(key, source, prop) {
  if (!exceptionsEnabled) return null;
  for (const ex of EXCEPTIONS) {
    if (ex.key !== key) continue;
    if (ex.sources && !ex.sources.includes(source)) continue;
    if (ex.props && prop !== null && !ex.props.includes(prop)) continue;
    return ex;
  }
  return null;
}

function compare(sources, indexed) {
  const failures = [];
  const usedExceptions = new Set();
  const rootSources = sources.filter((s) => s.kind === 'root-page').map((s) => s.rel);
  const allSources = sources.map((s) => s.rel);

  /* Which sources carry each key. */
  const presence = new Map();
  for (const s of sources) {
    for (const key of indexed.get(s.rel).keys()) {
      if (!presence.has(key)) presence.set(key, []);
      presence.get(key).push(s.rel);
    }
  }

  /* Rules shared between root pages only, for the marketing-components group. */
  const rootOnlyShared = new Set();
  for (const [key, where] of presence) {
    const roots = where.filter((w) => rootSources.includes(w));
    if (roots.length >= 2 && roots.length === where.length) rootOnlyShared.add(key);
  }
  const ctx = { rootOnlyShared, rootSources, allSources };

  /*
   * Every key matched by a group's predicate is that group's business. A key is then
   * *claimed* by the first claiming group that matches it, so the derived
   * root-shared-components group picks up only what the explicit groups left behind.
   */
  const matchedBy = new Map(GUARD_GROUPS.map((g) => [g.id, []]));
  const groupOf = new Map();
  for (const [key] of presence) {
    const sample = indexed.get(presence.get(key)[0]).get(key);
    for (const g of GUARD_GROUPS) {
      const hit = g.selectors ? g.selectors.includes(key) : g.match(sample, ctx);
      if (!hit) continue;
      matchedBy.get(g.id).push(key);
      if (g.claims !== false && !groupOf.has(key)) groupOf.set(key, g);
    }
  }

  /* --- Universal identity check ------------------------------------------- */
  for (const [key, where] of [...presence].sort()) {
    if (where.length < 2) continue;
    const group = groupOf.get(key) ?? null;
    const redact = group?.redactValues === true;

    /* Union of properties, in first-seen order. */
    const props = [];
    const seen = new Set();
    for (const src of where) {
      for (const d of indexed.get(src).get(key).declarations) {
        if (!seen.has(d.prop)) {
          seen.add(d.prop);
          props.push(d.prop);
        }
      }
    }

    const diffs = [];
    for (const prop of props) {
      const values = new Map();
      for (const src of where) {
        const decls = indexed.get(src).get(key).declarations.filter((d) => d.prop === prop);
        values.set(src, decls.length === 0 ? null : decls.map((d) => d.value).join(' | '));
      }
      if (new Set(values.values()).size === 1) continue;

      /*
       * An exception excuses one named source from agreeing on one named property.
       * Excused sources are set aside and the rest must still agree with each other,
       * so an exception can never quiet a divergence it does not name.
       */
      const excused = new Set();
      const excusedBy = new Map();
      for (const src of where) {
        const ex = exceptionFor(key, src, prop);
        if (ex) {
          excused.add(src);
          excusedBy.set(src, ex);
        }
      }
      const remaining = where.filter((s) => !excused.has(s));
      const remainingValues = new Set(remaining.map((s) => values.get(s)));

      /*
       * An exception counts as used only when its source actually disagrees with a
       * source that is not excused, so an exception that has outlived its cause
       * reports as stale rather than sitting there looking load-bearing.
       */
      const compareAgainst = remaining.length > 0 ? remainingValues : new Set(values.values());
      for (const src of excused) {
        const own = values.get(src);
        if ([...compareAgainst].some((v) => v !== own)) usedExceptions.add(excusedBy.get(src));
      }

      if (remainingValues.size <= 1) continue;
      diffs.push({ prop, values, excused });
    }

    if (diffs.length > 0) {
      failures.push({
        kind: 'drift',
        key,
        group,
        where,
        diffs,
        redact,
        sample: indexed.get(where[0]).get(key),
      });
    }
  }

  /* --- Guard group presence and count checks ------------------------------- */
  const groupReport = [];
  for (const g of GUARD_GROUPS) {
    const keys = (g.claims === false
      ? matchedBy.get(g.id)
      : [...groupOf].filter(([, gg]) => gg === g).map(([k]) => k)
    ).sort();
    const required =
      g.require.sources === 'all' ? allSources : g.require.sources === 'root' ? rootSources : [];

    const perSource = new Map();
    for (const src of allSources) {
      perSource.set(src, keys.filter((k) => presence.get(k).includes(src)).length);
    }

    for (const src of required) {
      const missing = keys.filter((k) => !presence.get(k).includes(src));
      /* Also catch a source that carries none of the group at all. */
      if (keys.length === 0) continue;
      if (missing.length > 0) {
        failures.push({
          kind: 'missing',
          group: g,
          source: src,
          missing,
        });
      }
    }

    /* Explicitly declared selectors that exist in no source at all: the list has gone
     * stale, or a shared component was renamed everywhere. Either way, say so. */
    if (g.selectors) {
      const found = new Set(keys);
      const absent = g.selectors.filter((s) => !found.has(s));
      if (absent.length > 0) {
        failures.push({ kind: 'stale-selectors', group: g, absent });
      }
    }

    if (g.require.exactRules !== undefined) {
      for (const src of required.length ? required : allSources) {
        const count = perSource.get(src);
        if (count !== g.require.exactRules) {
          failures.push({
            kind: 'count',
            group: g,
            source: src,
            expected: `exactly ${g.require.exactRules}`,
            actual: count,
          });
        }
      }
    }
    if (g.require.minRules !== undefined && keys.length < g.require.minRules) {
      failures.push({
        kind: 'count',
        group: g,
        source: '(all sources)',
        expected: `at least ${g.require.minRules} rules`,
        actual: keys.length,
      });
    }
    if (g.require.minSources !== undefined) {
      const carriers = new Set();
      for (const k of keys) for (const s of presence.get(k)) carriers.add(s);
      if (keys.length > 0 && carriers.size < g.require.minSources) {
        failures.push({
          kind: 'count',
          group: g,
          source: '(all sources)',
          expected: `present in at least ${g.require.minSources} sources`,
          actual: carriers.size,
        });
      }
    }
    /*
     * The largest single presence set inside the group. This is what stops the 93-rule
     * marketing block being deleted from one of its two pages without anyone noticing:
     * the rules would still be identical, because only one copy would be left.
     */
    const bySet = new Map();
    for (const k of keys) {
      const label = presence.get(k).join(' + ');
      bySet.set(label, (bySet.get(label) ?? 0) + 1);
    }
    const largest = [...bySet].sort((a, b) => b[1] - a[1])[0] ?? ['(none)', 0];
    if (g.require.minLargestSet !== undefined && largest[1] < g.require.minLargestSet) {
      failures.push({
        kind: 'count',
        group: g,
        source: largest[0],
        expected: `its largest shared block to hold at least ${g.require.minLargestSet} rules`,
        actual: largest[1],
      });
    }

    /* Declaration-level assertions (the font stack variables). */
    if (g.declarations) {
      for (const src of required) {
        for (const key of keys) {
          if (!presence.get(key).includes(src)) continue;
          const rule = indexed.get(src).get(key);
          for (const prop of g.declarations) {
            const decl = rule.declarations.filter((d) => d.prop === prop).pop();
            if (!decl) continue;
            const needle = g.valueMustContain?.[prop];
            if (needle && !decl.value.includes(needle)) {
              failures.push({
                kind: 'value',
                group: g,
                source: src,
                key,
                prop,
                needle,
                actual: decl.value,
              });
            }
          }
        }
      }
      /* The variables must exist somewhere in every required source. */
      for (const src of required) {
        for (const prop of g.declarations) {
          const anywhere = keys.some((k) =>
            presence.get(k).includes(src) &&
            indexed.get(src).get(k).declarations.some((d) => d.prop === prop),
          );
          if (!anywhere) {
            failures.push({ kind: 'missing-decl', group: g, source: src, prop });
          }
        }
      }
    }

    groupReport.push({ group: g, keys, presence, perSource, largest });
  }

  const staleExceptions = EXCEPTIONS.filter((e) => !usedExceptions.has(e));
  return { failures, groupReport, presence, groupOf, staleExceptions, rootSources, allSources };
}

/*
 * --inventory prints every rule key with the sources that carry it, grouped by
 * presence set. It is how you find the exact key string an EXCEPTIONS entry needs,
 * and how you see at a glance which pages share which block.
 */
function inventory(sources, indexed) {
  const presence = new Map();
  for (const s of sources) {
    for (const key of indexed.get(s.rel).keys()) {
      if (!presence.has(key)) presence.set(key, []);
      presence.get(key).push(s.rel);
    }
  }
  const bySet = new Map();
  for (const [key, where] of presence) {
    const label = where.join(' + ');
    if (!bySet.has(label)) bySet.set(label, []);
    bySet.get(label).push(key);
  }
  const lines = [];
  const sets = [...bySet].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [label, keys] of sets) {
    lines.push('');
    lines.push(`${keys.length} rule(s) in: ${label}`);
    for (const k of keys.sort()) lines.push(`    ${k}`);
  }
  return lines;
}

/* ============================================================================
 * 6. woff2 -> cmap, so the covered codepoint set is derived, not declared
 * ========================================================================== */

/*
 * The alternative was to hardcode the 104 codepoints in this file, which is simple but
 * drifts silently the moment the subsets are regenerated with a different --unicodes
 * argument. Decoding the shipped payload removes that failure mode entirely: the check
 * always describes the bytes that actually ship. node:zlib provides Brotli, which is
 * the only part of woff2 that would otherwise need a dependency.
 */
const WOFF2_KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern',
  'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'ltag', 'meta', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
  'Silf', 'Glat', 'Gloc',
];

function readUIntBase128(buf, offset) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[offset + i];
    if (b === undefined) throw new Error('UIntBase128 ran past the end of the buffer');
    if (i === 0 && b === 0x80) throw new Error('UIntBase128 has a leading zero');
    if (value & 0xfe000000) throw new Error('UIntBase128 overflow');
    value = (value << 7) | (b & 0x7f);
    if ((b & 0x80) === 0) return { value: value >>> 0, next: offset + i + 1 };
  }
  throw new Error('UIntBase128 longer than 5 bytes');
}

function woff2Cmap(buf) {
  if (buf.readUInt32BE(0) !== 0x774f4632) throw new Error('not a wOF2 signature');
  const numTables = buf.readUInt16BE(12);
  let off = 48;
  const dir = [];
  for (let t = 0; t < numTables; t++) {
    const flags = buf[off++];
    const tagIndex = flags & 0x3f;
    let tag;
    if (tagIndex === 0x3f) {
      tag = buf.toString('latin1', off, off + 4);
      off += 4;
    } else {
      tag = WOFF2_KNOWN_TAGS[tagIndex];
      if (tag === undefined) throw new Error(`unknown table tag index ${tagIndex}`);
    }
    const xform = (flags >> 6) & 0x03;
    const orig = readUIntBase128(buf, off);
    off = orig.next;
    const transformed =
      tag === 'glyf' || tag === 'loca' ? xform !== 3 : tag === 'hmtx' ? xform !== 0 : xform !== 0;
    let length = orig.value;
    if (transformed) {
      const xlen = readUIntBase128(buf, off);
      off = xlen.next;
      length = xlen.value;
    }
    dir.push({ tag, length });
  }

  const font = brotliDecompressSync(buf.subarray(off));
  let cursor = 0;
  for (const entry of dir) {
    if (entry.tag === 'cmap') return font.subarray(cursor, cursor + entry.length);
    cursor += entry.length;
  }
  throw new Error('no cmap table in the woff2 directory');
}

function cmapCodepoints(cmap) {
  const covered = new Set();
  const numTables = cmap.readUInt16BE(2);
  const subtables = [];
  for (let i = 0; i < numTables; i++) {
    const rec = 4 + i * 8;
    subtables.push({
      platform: cmap.readUInt16BE(rec),
      encoding: cmap.readUInt16BE(rec + 2),
      offset: cmap.readUInt32BE(rec + 4),
    });
  }
  /* Every Unicode subtable is read and unioned; the subsetter may emit both a format 4
   * and a format 12 table and they must agree, but reading all of them cannot
   * under-report. */
  let read = 0;
  for (const st of subtables) {
    const isUnicode =
      st.platform === 0 || (st.platform === 3 && (st.encoding === 1 || st.encoding === 10));
    if (!isUnicode) continue;
    const format = cmap.readUInt16BE(st.offset);
    if (format === 4) {
      readFormat4(cmap, st.offset, covered);
      read++;
    } else if (format === 12) {
      readFormat12(cmap, st.offset, covered);
      read++;
    } else if (format === 6) {
      const first = cmap.readUInt16BE(st.offset + 6);
      const count = cmap.readUInt16BE(st.offset + 8);
      for (let i = 0; i < count; i++) {
        if (cmap.readUInt16BE(st.offset + 10 + i * 2) !== 0) covered.add(first + i);
      }
      read++;
    }
  }
  if (read === 0) throw new Error('no readable Unicode cmap subtable');
  return covered;
}

function readFormat4(cmap, base, out) {
  const segX2 = cmap.readUInt16BE(base + 6);
  const seg = segX2 / 2;
  const endBase = base + 14;
  const startBase = endBase + segX2 + 2;
  const deltaBase = startBase + segX2;
  const rangeBase = deltaBase + segX2;
  for (let s = 0; s < seg; s++) {
    const end = cmap.readUInt16BE(endBase + s * 2);
    const start = cmap.readUInt16BE(startBase + s * 2);
    const delta = cmap.readInt16BE(deltaBase + s * 2);
    const rangeOffset = cmap.readUInt16BE(rangeBase + s * 2);
    if (start === 0xffff) continue;
    for (let c = start; c <= end && c !== 0x10000; c++) {
      let gid;
      if (rangeOffset === 0) {
        gid = (c + delta) & 0xffff;
      } else {
        const gi = rangeBase + s * 2 + rangeOffset + (c - start) * 2;
        if (gi + 1 >= cmap.length) continue;
        gid = cmap.readUInt16BE(gi);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) out.add(c);
    }
  }
}

function readFormat12(cmap, base, out) {
  const nGroups = cmap.readUInt32BE(base + 12);
  for (let g = 0; g < nGroups; g++) {
    const rec = base + 16 + g * 12;
    const start = cmap.readUInt32BE(rec);
    const end = cmap.readUInt32BE(rec + 4);
    const startGid = cmap.readUInt32BE(rec + 8);
    if (startGid === 0 && start === 0) continue;
    for (let c = start; c <= end; c++) out.add(c);
  }
}

/* Pulls the base64 payloads out of the inline @font-face rules of one source. */
const DATA_URI = /url\(\s*(?:['"])?data:font\/woff2;base64,([A-Za-z0-9+/=]+)/i;
const FILE_URI = /url\(\s*['"]?(\/fonts\/[^'")]+\.woff2)/gi;

function inlineSubsetPayloads(indexed, sourceRel) {
  const out = [];
  for (const rule of indexed.get(sourceRel).values()) {
    if (rule.fontFamily === null || !/\bInline\b/.test(rule.fontFamily)) continue;
    const src = rule.declarations.filter((d) => d.prop === 'src').pop();
    if (!src) continue;
    const m = DATA_URI.exec(src.value);
    if (!m) continue;
    out.push({ family: rule.fontFamily, base64: m[1] });
  }
  return out;
}

/*
 * The union of every codepoint the linked full fonts can render, read the same way.
 * A character missing from these too can never be covered by any subset: subsetting
 * cannot create a glyph the source font does not have. Those characters already render
 * from a system font on every load and always did, so they are reported and not failed
 * on. A character present here but missing from the subsets is the dangerous case, and
 * that is what fails.
 */
function fullFontCoverage(root, indexed, sources) {
  const files = new Set();
  for (const s of sources) {
    for (const rule of indexed.get(s.rel).values()) {
      if (rule.fontFamily === null) continue;
      const src = rule.declarations.filter((d) => d.prop === 'src').pop();
      if (!src) continue;
      for (const m of src.value.matchAll(FILE_URI)) files.add(m[1].replace(/^\//, ''));
    }
  }
  const covered = new Set();
  const read = [];
  for (const rel of [...files].sort()) {
    const abs = path.join(root, 'docs', rel);
    if (!existsFile(abs)) continue;
    for (const cp of cmapCodepoints(woff2Cmap(readFileSync(abs)))) covered.add(cp);
    read.push(rel);
  }
  return { covered, read };
}

/* ============================================================================
 * 7. Rendered-text extraction and the codepoint check
 * ========================================================================== */

/*
 * Covered: text nodes outside <script> and <style>, the rendered attributes listed in
 * RENDERED_ATTRS, and CSS content: strings from both the inline <style> blocks and the
 * shared stylesheet. HTML entities are decoded, numeric and named.
 *
 * Deliberately excluded, because none of it is painted with the page's fonts:
 * everything inside <script> including JSON-LD, <title> and <meta> content (browser
 * chrome and social cards), HTML comments, href/src/data-* attribute values, and CSS
 * property values other than content:. Script *string literals* are checked separately
 * by discoverScripts, because nav.js injects the docs footer at runtime.
 *
 * The values below are written as escapes so this file stays pure ASCII. It reads
 * other files' encodings and should not depend on its own being guessed correctly.
 * An entity not in this table is left undecoded and reported, rather than being
 * silently treated as literal text and mis-flagged.
 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: '\u00A0', copy: '\u00A9', reg: '\u00AE', trade: '\u2122', deg: '\u00B0',
  middot: '\u00B7', times: '\u00D7', divide: '\u00F7', plusmn: '\u00B1', laquo: '\u00AB',
  raquo: '\u00BB', sect: '\u00A7', para: '\u00B6', dagger: '\u2020', bull: '\u2022',
  hellip: '\u2026', ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019',
  ldquo: '\u201C', rdquo: '\u201D', larr: '\u2190', uarr: '\u2191', rarr: '\u2192',
  darr: '\u2193', harr: '\u2194', minus: '\u2212', ne: '\u2260', le: '\u2264',
  ge: '\u2265', infin: '\u221E', check: '\u2713', micro: '\u00B5', euro: '\u20AC',
  pound: '\u00A3', yen: '\u00A5', cent: '\u00A2', ensp: '\u2002', emsp: '\u2003',
  thinsp: '\u2009', shy: '\u00AD', zwj: '\u200D', zwnj: '\u200C', lrm: '\u200E',
  rlm: '\u200F',
};

function decodeEntities(s, unknown) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    const hit = NAMED_ENTITIES[body];
    if (hit !== undefined) return hit;
    unknown.add(whole);
    return whole;
  });
}

const CONTENT_DECL = /content\s*:\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;

function renderedText(html, unknown) {
  const chunks = [];

  /* content: strings from inline <style> blocks, before the blocks are stripped. */
  for (const m of html.matchAll(STYLE_BLOCK)) {
    for (const c of m[1].matchAll(CONTENT_DECL)) chunks.push(unescapeCss(c[2]));
  }

  let body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(STYLE_BLOCK, ' ')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, ' ');

  /* Rendered attribute values, taken from the tags before the tags are stripped. */
  for (const tag of body.match(/<[^>]*>/g) ?? []) {
    for (const attr of RENDERED_ATTRS) {
      const re = new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'gi');
      for (const m of tag.matchAll(re)) chunks.push(m[2] ?? m[3] ?? '');
    }
  }

  chunks.push(body.replace(/<[^>]*>/g, '\n'));
  return chunks.map((c) => decodeEntities(c, unknown)).join('\n');
}

function unescapeCss(s) {
  return s.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  ).replace(/\\(.)/g, '$1');
}

/*
 * Characters that paint no glyph, so falling through to another font changes nothing
 * visible. The metric-matched fallbacks make even the advance widths agree.
 */
const IGNORED_CODEPOINTS = new Set([
  0x09, 0x0a, 0x0d, 0x20, // tab, newline, carriage return, space
  0xa0, // no-break space
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, // zero-width and word-joiner controls
  0x200e, 0x200f, // bidi marks
  0xad, // soft hyphen
]);

function checkCodepoints(root, pages, scripts, covered, sharedContentStrings) {
  const hits = new Map(); // codepoint -> [{page, context}]
  const unknownEntities = new Set();

  const units = [];
  for (const rel of pages) {
    const html = readFileSync(path.join(root, rel), 'utf8');
    let text = renderedText(html, unknownEntities);
    if (STYLESHEET_LINK.test(html)) text += '\n' + sharedContentStrings.join('\n');
    units.push({ rel, text });
  }
  for (const rel of scripts) {
    units.push({ rel, text: scriptLiterals(readFileSync(path.join(root, rel), 'utf8')).join('\n') });
  }

  for (const { rel, text } of units) {
    const lines = text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      for (const ch of lines[li]) {
        const cp = ch.codePointAt(0);
        if (covered.has(cp) || IGNORED_CODEPOINTS.has(cp)) continue;
        if (!hits.has(cp)) hits.set(cp, []);
        const list = hits.get(cp);
        if (list.length < 3) {
          list.push({ page: rel, context: contextAround(lines[li], ch) });
        } else if (!list.some((h) => h.page === rel)) {
          list.push({ page: rel, context: contextAround(lines[li], ch) });
        }
      }
    }
  }
  return { hits, unknownEntities };
}

function contextAround(line, ch) {
  const idx = line.indexOf(ch);
  const from = Math.max(0, idx - 32);
  const to = Math.min(line.length, idx + 33);
  return (from > 0 ? '...' : '') + line.slice(from, to).trim() + (to < line.length ? '...' : '');
}

const cpName = (cp) =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

/* ============================================================================
 * 8. Reporting
 * ========================================================================== */

const HELP = `check-shared-css.mjs - drift verifier for decibri.com's duplicated CSS

  node tools/check-shared-css.mjs [options]

  --verbose, -v     also list every rule in every guarded set
  --inventory       list every rule key and the sources that carry it, grouped by
                    presence set. Use this to find the exact key an exception needs.
  --no-exceptions   ignore EXCEPTIONS, showing everything the list is holding back
  --only=css        run the drift check only
  --only=codepoints run the font coverage check only
  --root <dir>      check a tree other than the repository this script sits in
  --help, -h        this message

Exit code 0 when both checks pass, 1 otherwise. See the comment at the top of this
file for what it guards and what to do when it fails.`;

function main(argv) {
  const args = parseArgs(argv);
  if (args.help === true) {
    process.stdout.write(HELP + '\n');
    return 0;
  }
  const root = args.root ?? path.resolve(fileURLToPath(import.meta.url), '..', '..');
  const only = args.only ?? 'all';
  const verbose = args.verbose === true;
  exceptionsEnabled = args.noExceptions !== true;

  const out = [];
  const say = (s = '') => out.push(s);
  let failed = false;

  say(`check-shared-css: ${toPosix(root)}`);

  const sources = discoverSources(root);
  if (sources.length === 0) {
    say('FAIL  discovery found no sources under docs/.');
    process.stdout.write(out.join('\n') + '\n');
    return 1;
  }

  const indexed = new Map();
  const parseProblems = [];
  for (const s of sources) {
    const { rules, problems } = cssOf(s);
    indexed.set(s.rel, indexRules(s, rules));
    parseProblems.push(...problems);
  }

  say('');
  say('Sources discovered by glob (docs/*.html, docs/*/index.html, plus the shared stylesheet):');
  for (const s of sources) {
    const rules = indexed.get(s.rel);
    let blocks = 0;
    for (const r of rules.values()) blocks += r.blocks.length;
    const dup = blocks - rules.size;
    say(
      `  ${s.kind === 'stylesheet' ? 'stylesheet' : 'root page '}  ${s.rel}  ` +
        `(${blocks} blocks parsed, ${rules.size} distinct rules` +
        `${dup > 0 ? `, ${dup} written more than once and merged in source order` : ''})`,
    );
  }

  if (parseProblems.length > 0) {
    failed = true;
    say('');
    say(`FAIL  the CSS tokeniser could not account for ${parseProblems.length} fragment(s):`);
    for (const p of parseProblems.slice(0, 20)) say(`  ${p}`);
  }

  if (args.inventory === true) {
    for (const line of inventory(sources, indexed)) say(line);
    process.stdout.write(out.join('\n') + '\n');
    return failed ? 1 : 0;
  }

  let cmpResult = null;
  if (only === 'all' || only === 'css') {
    cmpResult = compare(sources, indexed);
    const { failures, groupReport, presence, staleExceptions } = cmpResult;

    say('');
    say('Guarded sets:');
    for (const { group, keys, largest } of groupReport) {
      const carriers = new Set();
      for (const k of keys) for (const s of presence.get(k)) carriers.add(s);
      const largestNote =
        keys.length > 0 && largest[1] !== keys.length ? `, largest block ${largest[1]}` : '';
      say(
        `  ${group.id.padEnd(24)} ${String(keys.length).padStart(3)} rules across ${carriers.size} source(s)${largestNote}`,
      );
      if (verbose) {
        say(`      ${group.title}`);
        for (const k of keys) say(`      . ${k}   [${presence.get(k).length}]`);
      }
    }

    const shared = [...presence.values()].filter((w) => w.length >= 2).length;
    say(`  ${'(all shared rules)'.padEnd(22)} ${String(shared).padStart(3)} rules appear in 2 or more sources and are checked for identity`);

    if (failures.length > 0) {
      failed = true;
      say('');
      say(`FAIL  ${failures.length} problem(s):`);
      for (const f of failures) say(formatFailure(f));
    }

    if (staleExceptions.length > 0) {
      say('');
      say(`WARN  ${staleExceptions.length} exception(s) matched no divergence and are stale:`);
      for (const e of staleExceptions) say(`  ${e.key} in ${(e.sources ?? ['(any)']).join(', ')}`);
      say('      Remove them, or the list stops describing the tree it guards.');
    }
  }

  if (only === 'all' || only === 'codepoints') {
    say('');
    const sheet = sources.find((s) => s.kind === 'stylesheet');
    const payloads = sheet
      ? inlineSubsetPayloads(indexed, sheet.rel)
      : inlineSubsetPayloads(indexed, sources[0].rel);

    if (payloads.length === 0) {
      failed = true;
      say('FAIL  no inline font-subset payload found, so codepoint coverage cannot be derived.');
    } else {
      let covered = null;
      const perFace = [];
      try {
        for (const p of payloads) {
          const set = cmapCodepoints(woff2Cmap(Buffer.from(p.base64, 'base64')));
          perFace.push({ family: p.family, size: set.size });
          covered = covered === null ? set : new Set([...covered].filter((c) => set.has(c)));
        }
      } catch (err) {
        failed = true;
        covered = null;
        say(`FAIL  could not decode an inline subset to read its cmap: ${err.message}`);
      }

      if (covered !== null) {
        const asciiGap = [];
        for (let c = 0x20; c <= 0x7e; c++) if (!covered.has(c)) asciiGap.push(cpName(c));
        say(`Codepoint coverage read from the shipped inline subsets (not a declared list):`);
        for (const f of perFace) say(`  ${f.family.padEnd(24)} ${f.size} codepoints`);
        say(`  intersection             ${covered.size} codepoints`);
        if (asciiGap.length > 0) {
          failed = true;
          say(`FAIL  the decoded cmap is missing printable ASCII (${asciiGap.slice(0, 10).join(' ')}), so the decode is wrong.`);
        } else {
          let full = { covered: new Set(), read: [] };
          try {
            full = fullFontCoverage(root, indexed, sources);
          } catch (err) {
            say(`WARN  could not read the linked font files: ${err.message}`);
          }
          say(`  linked full fonts       ${full.covered.size} codepoints across ${full.read.length} file(s)`);

          const sharedContent = sheet ? contentStringsOf(sheet.text) : [];
          const pages = discoverPages(root);
          const scripts = discoverScripts(root);
          const { hits, unknownEntities } = checkCodepoints(
            root, pages, scripts, covered, sharedContent,
          );
          say(
            `  checked the rendered text of ${pages.length} page(s) ` +
              `and the string literals of ${scripts.length} script(s)`,
          );
          if (unknownEntities.size > 0) {
            say(`WARN  unrecognised HTML entities left undecoded: ${[...unknownEntities].join(' ')}`);
          }

          const gaps = [...hits].sort((a, b) => a[0] - b[0]);
          const real = gaps.filter(([cp]) => full.covered.has(cp));
          const unfixable = gaps.filter(([cp]) => !full.covered.has(cp));

          if (real.length > 0) {
            failed = true;
            say('');
            say(`FAIL  ${real.length} codepoint(s) render in the full font but are missing from the`);
            say('      inline subsets. On a cold mobile load the full font has not arrived, so these');
            say('      fall to the metric-matched fallback and mix typefaces inside a single heading.');
            say('      Do not assume the page is wrong: widening the subsets may be the right fix.');
            say('      Regeneration is documented in CLAUDE.md, "Inline critical font subsets".');
            for (const [cp, where] of real) say(formatCodepoint(cp, where));
          }
          if (unfixable.length > 0) {
            say('');
            say(`INFO  ${unfixable.length} codepoint(s) are outside the subsets and outside the linked`);
            say('      full fonts as well, so no subset can ever carry them. They render from a system');
            say('      font today and are reported, not failed on.');
            for (const [cp, where] of unfixable) say(formatCodepoint(cp, where));
          }
        }
      }
    }
  }

  say('');
  say(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.stdout.write(out.join('\n') + '\n');
  return failed ? 1 : 0;
}

function formatCodepoint(cp, where) {
  const L = [`  ${cpName(cp)} "${String.fromCodePoint(cp)}"`];
  for (const w of where) L.push(`      ${w.page}: ${w.context}`);
  if (where.length >= 3) L.push('      (first occurrences only)');
  return L.join('\n');
}

function contentStringsOf(css) {
  const out = [];
  for (const c of css.matchAll(CONTENT_DECL)) out.push(unescapeCss(c[2]));
  return out;
}

function formatFailure(f) {
  const L = [];
  if (f.kind === 'drift') {
    L.push('');
    L.push(`  DRIFT  ${f.key}`);
    if (f.sample.mappedFrom) L.push(`         (docs copy written as "${f.sample.mappedFrom}")`);
    if (f.group) L.push(`         guarded set: ${f.group.id}`);
    L.push(`         present in: ${f.where.join(', ')}`);
    for (const d of f.diffs) {
      L.push(`         ${d.prop}:`);
      const byValue = new Map();
      for (const [src, val] of d.values) {
        const shown = val === null ? '(declaration absent)' : renderValue(val, f.redact);
        if (!byValue.has(shown)) byValue.set(shown, []);
        byValue.get(shown).push(src);
      }
      for (const [val, srcs] of byValue) {
        L.push(`           ${val}`);
        for (const s of srcs) {
          L.push(`             <- ${s}${d.excused?.has(s) ? '   (excepted here)' : ''}`);
        }
      }
    }
  } else if (f.kind === 'missing') {
    L.push('');
    L.push(`  MISSING  ${f.source} is missing ${f.missing.length} rule(s) from guarded set "${f.group.id}"`);
    L.push(`           ${f.group.why}`);
    for (const m of f.missing) L.push(`           ${m}`);
  } else if (f.kind === 'stale-selectors') {
    L.push('');
    L.push(`  STALE    guarded set "${f.group.id}" names ${f.absent.length} selector(s) that exist in no source:`);
    for (const a of f.absent) L.push(`           ${a}`);
    L.push('           Either the component was renamed or removed everywhere, or the list is out of date.');
  } else if (f.kind === 'count') {
    L.push('');
    L.push(`  COUNT    guarded set "${f.group.id}" in ${f.source}: expected ${f.expected}, found ${f.actual}`);
    L.push(`           ${f.group.why}`);
  } else if (f.kind === 'value') {
    L.push('');
    L.push(`  VALUE    ${f.source}: ${f.key} { ${f.prop} } does not contain ${f.needle}`);
    L.push(`           found: ${f.actual}`);
    L.push(`           ${f.group.why}`);
  } else if (f.kind === 'missing-decl') {
    L.push('');
    L.push(`  MISSING  ${f.source} declares no ${f.prop} anywhere in guarded set "${f.group.id}"`);
    L.push(`           ${f.group.why}`);
  }
  return L.join('\n');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--inventory') args.inventory = true;
    else if (a === '--no-exceptions') args.noExceptions = true;
    else if (a === '--root') args.root = path.resolve(argv[++i]);
    else if (a.startsWith('--root=')) args.root = path.resolve(a.slice(7));
    else if (a.startsWith('--only=')) args.only = a.slice(7);
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

process.exit(main(process.argv.slice(2)));
