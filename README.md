# Decibri Website

This repository contains the source for [decibri.com](https://decibri.com), the
documentation site for Decibri. The site is plain HTML with no build step.
GitHub Pages currently serves the repository root, and Cloudflare sits in front
for DNS and proxying.

## Repository structure

Published files live at the repository root and inside the `docs/` and `cli/`
folders. At the root: `index.html`, `404.html`, the metadata and asset files
`sitemap.xml`, `robots.txt`, `manifest.json`, `llms.txt`, `CNAME`,
`decibri-social-og.png`, and `favicon.ico`. The `docs/` folder holds all
documentation pages along with the shared assets `nav.js`, `code-tabs.js`, and
`styles.css`. The `cli/` folder holds the CLI landing page.

Repository-only files also live at the root and are never published:
`README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `LICENSE`, `ATTRIBUTION.md`, and
`.gitignore`.

## Contributing

Documentation improvements and integration partner contributions are welcome.
See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

This repository is licensed under the Apache License 2.0. See [LICENSE](LICENSE)
for the full text.