# CLAUDE.md

## What this repo is

This is the static website and documentation source for decibri.com. The site is plain HTML with no build step. GitHub Pages serves the `docs/` folder as the site root. Cloudflare provides DNS and proxying in front of Pages.

Runnable code snippets in the documentation are inline in the HTML files under `docs/docs/`.

## The API source of truth

This repo does NOT define the decibri API or the decibri-cli command surface. Two upstream code repositories do, and you must read them before writing or editing code examples, command documentation, or capability claims here.

If you have a local checkout of these repositories configured (see CLAUDE.local.md), prefer it. If you have neither a working local checkout nor the ability to fetch the public URLs, stop and ask the maintainer rather than writing API or CLI content from memory or by trusting the current page.

### decibri (core library, Node, Python, browser, Rust crate)

Repository: <https://github.com/decibri/decibri>

Verify against this public repository when writing or editing content about the core library or any language binding: Node.js, Python, browser, and the underlying Rust crate. Authoritative subpaths to read:

- `bindings/node` and `npm/decibri` for the Node.js API surface
- `bindings/python` for the Python API surface, especially the type stubs under `bindings/python/python/`
- `crates/decibri` for the underlying Rust behaviour
- `README.md` for the documented API tables
- `CHANGELOG.md` and `bindings/python/CHANGELOG.md` for recent shipped changes
- The decibri repo's own `CLAUDE.md` for upstream project rules (frozen Node API, code-quality gates)

### decibri-cli (the Decibri command-line tool)

Repository: <https://github.com/decibri/decibri-cli>

Verify against this public repository for the Decibri CLI: commands, flags, exit codes, JSON output schemas, install methods, and release artifacts. Authoritative subpaths to read:

- `src/main.rs` for the top-level clap `Cli`/`Commands` enum, global flags (`--json`, `--quiet`), and exit-code wiring
- `src/commands/` for per-subcommand modules (`version.rs`, `devices.rs`, `capture.rs`, `play.rs`)
- `src/device_resolve.rs` for the shared `--device` parser
- `src/exit.rs` for exit-code definitions and the `classify()` mapping
- `Cargo.toml` for the canonical CLI version and the `[[bin]]` definition
- `npm/decibri-cli/package.json` for the npm wrapper version (must be kept in sync with `Cargo.toml`)
- `npm/decibri-cli/` for the npm install/uninstall scripts and platform tests
- `README.md` for the documented CLI surface
- `CHANGELOG.md` for shipped CLI changes
- The decibri-cli repo's own `CLAUDE.md` for guardrails, code-quality gates, and the API-stability contract
- `.github/workflows/build-release.yml` for release artifacts, SHA256SUMS generation, and SLSA provenance (only read when verifying release-artifact claims)
- `tests/snapshots/` for the JSON schema snapshot tests (especially `version_snapshot__version_json_schema_locked.snap`)

**JSON schema stability**: only `version --json` is contractually locked at v0.1.0 per the decibri-cli repo's own `CLAUDE.md`. The schemas for `devices --json`, `capture --json` completion, and `play --json` completion are explicitly unstable until v1.0.0. Any documentation claiming a single "stable JSON output schema" across the whole CLI overstates the actual contract. When verifying CLI JSON claims, read the decibri-cli `CLAUDE.md` for the current stability status.

### Which repo to read

- When writing or verifying **API reference content** (the Node, Python, browser API pages, integration pages, getting-started, and marketing-landing claims about platforms, formats, or VAD), read the decibri repo.
- When writing or verifying **CLI content** (`docs/cli/`, `docs/docs/apis/cli.html`, the CLI section of `docs/llms.txt`, and CLI-related sitemap entries), read the decibri-cli repo.
- Some pages (the marketing landing, `apis.html` overview, `llms.txt`) make claims spanning both repos and require reading both.
- Provider integration pages (under `docs/docs/integrations/stt/`, `docs/docs/integrations/vad/`, and `docs/docs/integrations/kws/`) additionally require reading the integration test for that provider, not just the decibri repo. See the Integration provider pages subsection below.

Before writing or editing any code example, command documentation, or capability claim in this repo, read the actual source from whichever upstream repo owns the claim. Do not write API examples or CLI command descriptions from memory or assumption.

### Integration provider pages

Pages under `docs/docs/integrations/stt/`, `docs/docs/integrations/vad/`, and `docs/docs/integrations/kws/` document how to wire decibri's audio into specific third-party providers. These pages have a third source of truth beyond the decibri repo: the maintainer's integration test directory, which contains working adapter code for each provider against both the npm and PyPI decibri packages.

The integration tests are authoritative for the provider-specific half of these pages: the third-party API surface (class names, method names, event names, configuration parameters), the working sample rate and encoding for that provider, and any provider-specific constraints (for example, minimum or maximum chunk durations) that the test has had to handle.

The integration test location is configured per-machine in CLAUDE.local.md. If a local checkout is configured, prefer it. If you do not have access to the integration tests for a provider you are documenting, stop and ask the maintainer. Do not write provider API code from memory or by guessing from the provider's marketing docs.

Important rule on what consistency means: docs snippets and integration tests are NOT the same code by design. Integration tests are full working adapters (environment handling, error management, lifecycle orchestration, transcript or result accumulation). Docs snippets are short illustrative examples that demonstrate one concept. They must agree on every API call into both decibri and the provider (class names, methods, parameters, event names, sample rate, encoding, batching constraints, and so on) but they will differ on packaging code. The principle is "same behaviour, same identifiers, no contradictions", not "byte-identical". A docs snippet that inlines a full adapter is wrong, and a test that contains only the docs snippet is also wrong; both have the right job for their own context.

If a provider's docs page and its integration test contradict each other on any API identifier or configuration value, the integration test is correct (because it actually runs against the live provider). The docs page is the bug. Flag and fix.

## Upstream rules pointer

The decibri repo's own CLAUDE.md at <https://github.com/decibri/decibri/blob/main/CLAUDE.md> is the upstream source of project rules (frozen Node API, code-quality gates, etc.). Read that file first rather than relying on rules re-listed here, which the upstream may evolve.

## Documentation accuracy

- Never invent API identifiers. Class names, method signatures, constructor option names, event names, property names, and error message strings must be copied from the decibri repo, not guessed.
- This rule applies to identifiers and quoted code only. Prose explanations of how and when to use the API are written by the docs author and do not need to be byte-for-byte from source.
- Error messages, when referenced in docs, must be quoted exactly as they appear in source.
- If the decibri repo and an existing website page disagree, the decibri repo is correct and the website page is the bug. Flag it.
- If something cannot be found in the decibri repo, say so. Do not fill the gap with a plausible-looking example.

## Site structure rules

- Static HTML only. There is no build step. Do not introduce one.
- Do not rename or move `docs/docs/` or `docs/cli/`. Their paths map directly to live URLs; renaming them breaks those URLs.
- `docs/CNAME`, `docs/docs/code-tabs.js`, `docs/docs/nav.js`, and `docs/docs/styles.css` are load-bearing, maintainer-only files. Do not modify, rename, move, or restructure them. They must not be changed in integration provider page PRs or by integration contributors. Changes to these files are made only by the maintainer. `docs/CNAME` binds the custom domain; the three shared assets are imported by every page via absolute paths.
- The sitemap at `docs/sitemap.xml` is hand-maintained. Any new page requires a `<url>` entry in the correct alphabetical position. Any removed page requires deleting its entry.
- SEO metadata in every page (`<link rel="canonical">`, `<meta property="og:image">`, `<meta name="twitter:image">`, and the OG and Twitter title and description tags) is hardcoded absolute to `https://decibri.com/...`. Any rename, removal, or relocation of a page or asset must update these tags atomically in the same commit.

## Inline critical font subsets

The four root pages (`docs/index.html`, `docs/404.html`, `docs/privacy.html`, `docs/cli/index.html`) and `docs/docs/styles.css` each carry two `@font-face` rules whose `src` is a `data:font/woff2;base64,` payload, declared under the family names `Outfit Inline` and `JetBrains Mono Inline` and prepended to `--font-display` and `--font-mono`. They exist because `font-display: optional` on the linked font files renders the fallback, not the real font, at first paint on every throttled mobile connection. The linked `@font-face` rules below them stay in place as the safety net for characters the subsets do not carry.

There is no build step, so these payloads do not regenerate themselves. **If `docs/fonts/outfit-vf-latin-v15.woff2` or `docs/fonts/jetbrains-mono-vf-latin-v24.woff2` is ever updated, regenerate both subsets and replace all five copies of each payload in the same commit.** Requires `fonttools` and `brotli` (`pip install fonttools brotli`).

```sh
# Coverage: printable ASCII (U+0020-007E) plus the 13 non-ASCII characters the site uses.
# U+03BC, U+2192, U+2500 and U+2713 are listed but are absent from both shipped fonts and so
# cannot enter the subsets; they render from a system font today. Listing them means a future
# font update that adds them picks them up automatically. 104 codepoints land in each subset.
UNI="U+0020-007E,U+00A9,U+00B7,U+00D7,U+03BC,U+2013,U+2018,U+2019,U+201C,U+201D,U+2026,U+2192,U+2500,U+2713"

# --- Display: Outfit, weights 300-800, kern and liga retained ---
fonttools varLib.instancer docs/fonts/outfit-vf-latin-v15.woff2 wght=300:800 -o outfit-300-800.ttf
python -c "
from fontTools.ttLib import TTFont; import sys
f=TTFont(sys.argv[1]); n=f['name']
n.setName('Outfit Inline',1,3,1,0x409); n.setName('Regular',2,3,1,0x409)
n.setName('Outfit Inline',1,1,0,0);      n.setName('Regular',2,1,0,0)
f.save(sys.argv[1])" outfit-300-800.ttf
pyftsubset outfit-300-800.ttf --output-file=outfit-inline.woff2 --flavor=woff2 \
  --unicodes="$UNI" --layout-features=kern,liga --no-hinting --name-IDs=1,2 \
  --drop-tables+=STAT,MVAR,gasp

# --- Mono: JetBrains Mono, weights 400-700, calt retained ---
fonttools varLib.instancer docs/fonts/jetbrains-mono-vf-latin-v24.woff2 wght=400:700 -o jbm-400-700.ttf
python -c "
from fontTools.ttLib import TTFont; import sys
f=TTFont(sys.argv[1]); n=f['name']
n.setName('JetBrains Mono Inline',1,3,1,0x409); n.setName('Regular',2,3,1,0x409)
n.setName('JetBrains Mono Inline',1,1,0,0);     n.setName('Regular',2,1,0,0)
f.save(sys.argv[1])" jbm-400-700.ttf
pyftsubset jbm-400-700.ttf --output-file=jbm-inline.woff2 --flavor=woff2 \
  --unicodes="$UNI" --layout-features=calt --no-hinting --name-IDs=1,2 \
  --drop-tables+=STAT,MVAR,gasp

# Base64 each result into the matching `src: url(data:font/woff2;base64,...)`.
base64 -w0 outfit-inline.woff2
base64 -w0 jbm-inline.woff2
```

Expected output: `outfit-inline.woff2` 22,560 B (30,080 B base64), `jbm-inline.woff2` 22,884 B (30,512 B base64). A materially different size means a parameter changed.

Notes that are load-bearing, not incidental:

- **`calt` on the mono subset is not optional.** JetBrains Mono has no `kern` and no `liga`; its coding ligatures live entirely in `calt`. The site's code blocks contain around 170 `=>`, 165 `//`, 62 `--`, 33 `==`, 30 `>=`, 25 `===`, 21 `::` and 8 `!=` across 23 of the 32 pages. Dropping `calt` saves about 11.4 KB and unligates every one of them.
- **The weight ranges are the ranges the site actually uses.** Display 300-800 and mono 400-700 cover every weight that appears above the fold. A subset narrower than the used range renders the wrong weight rather than falling through.
- **Separate family names are required.** Chrome does not hand characters between faces of the same family via `unicode-range`; an out-of-range character falls to the next family in the stack and the sibling face is never fetched. Do not merge these into the `Outfit` / `JetBrains Mono` families.
- **Do not apply the inline families through selectors.** Prepending to `--font-display` and `--font-mono` is the only attachment point that cannot be beaten by source order.

### Coverage risk

A page that adds a character outside the 104-codepoint subset falls through to the full font, which on a cold mobile load has not arrived, and then to Arial. The result is mixed typefaces inside one heading. This is silent and stays broken until someone looks. The guard is a codepoint check over the rendered text of all pages against the two subsets' `cmap`s. It is a good candidate for the CSS drift verifier rather than a standalone script.

## Content conventions

- Use `Decibri` capitalised in user-facing prose, not `decibri`.
- No em dashes anywhere in site content. Rewrite using periods, commas, colons, or parentheses.
- No commercial claims. No "best", "fastest", "industry-leading", "trusted by", or "production-ready" without qualification. No comparative claims against other libraries. No performance numbers without methodology. Docs describe what decibri does, not how good it is. This applies to partner-submitted PRs too: strip promotional language from provider pages.
- Provider pages under `docs/docs/integrations/stt/`, `vad/`, and `kws/` are ordered alphabetically. The parent index page cards and the sitemap entries follow the same alphabetical order. No provider is excluded from these lists; inclusion is based on technical fit.
- Documented URLs do not have trailing slashes. The sitemap and internal links use `/docs/apis/python`, not `/docs/apis/python/`.

## Sidebar and nav UX

- Parent items are links, not collapse-only headers.
- Sections are collapsible, with a chevron indicator.
- Current-page ancestors auto-expand on page load.
- No "Overview" children under section parents.
- No `localStorage` or any browser storage. Nav state is derived from the current URL.

## Git workflow

- Stage changes with `git add` only. Do not run `git commit`, `git push`, create tags, or push to any remote. Commits are made manually by a human after review.
- This is a standalone repository. All git operations apply only to this repo.
