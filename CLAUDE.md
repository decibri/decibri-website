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

Before writing or editing any code example, command documentation, or capability claim in this repo, read the actual source from whichever upstream repo owns the claim. Do not write API examples or CLI command descriptions from memory or assumption.

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
