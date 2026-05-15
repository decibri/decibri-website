# CLAUDE.md

## What this repo is

This is the static website and documentation source for decibri.com. The site is plain HTML with no build step. GitHub Pages serves the `docs/` folder as the site root. Cloudflare provides DNS and proxying in front of Pages.

Runnable code snippets in the documentation are inline in the HTML files under `docs/docs/`.

## The API source of truth

This repo does NOT define the decibri API. The decibri code repository does. The decibri repo is checked out locally at:

  `C:\development\decibri\rust\decibri\repository\decibri`

This path is machine-specific. If the decibri repo is moved, or if this file is used on another machine, update the path above.

Before writing or editing any code example in this repo, read the actual API from the decibri repo. Do not write API examples from memory or assumption.

Authoritative files to read in the decibri repo:

- `bindings/node` and `npm/decibri` for the Node.js API surface.
- `bindings/python` for the Python API surface (type stubs).
- `crates/decibri` for the underlying Rust behaviour.
- `README.md` for the documented API tables.

## Upstream rules pointer

The decibri repo's own CLAUDE.md at `C:\development\decibri\rust\decibri\repository\decibri\CLAUDE.md` is the upstream source of project rules (frozen Node API, code-quality gates, etc.). Read that file first rather than relying on rules re-listed here, which the upstream may evolve.

## Documentation accuracy

- Never invent API identifiers. Class names, method signatures, constructor option names, event names, property names, and error message strings must be copied from the decibri repo, not guessed.
- This rule applies to identifiers and quoted code only. Prose explanations of how and when to use the API are written by the docs author and do not need to be byte-for-byte from source.
- Error messages, when referenced in docs, must be quoted exactly as they appear in source.
- If the decibri repo and an existing website page disagree, the decibri repo is correct and the website page is the bug. Flag it.
- If something cannot be found in the decibri repo, say so. Do not fill the gap with a plausible-looking example.

## Site structure rules

- Static HTML only. There is no build step. Do not introduce one without explicit approval.
- Do not rename or move `docs/docs/` or `docs/cli/`. Their paths map directly to live URLs; renaming them breaks those URLs.
- The three shared assets `docs/docs/code-tabs.js`, `docs/docs/nav.js`, and `docs/docs/styles.css` are load-bearing. Every page imports them via absolute paths starting with `/docs/`. Do not rename, move, or restructure them.
- `docs/CNAME` must stay in the `docs/` folder. It binds the custom domain.
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

- Stage changes with `git add` only. Do not run `git commit`, `git push`, create tags, or push to any remote. Commits are made manually in VS Code.
- This is a standalone repository. All git operations apply only to this repo.
