# Contributing

Contributions to the Decibri documentation are welcome, including from integration partners adding or improving provider pages. The site is small and every change goes through pull request review.

## Adding a new integration provider page

1. **Copy the template.** Copy `templates/integration.html` to `docs/docs/integrations/<type>/`, where `<type>` is the integration type: `stt`, `tts`, `vad`, or `kws`.
2. **Rename the file** to your provider slug, lowercase and hyphen-separated, with no spaces (for example, `openai.html` or `aws-transcribe.html`).
3. **Replace every `[[PLACEHOLDER]]` token** in the file. The placeholder list and what each token expects is documented in the comment block at the top of the template, including `[[INTEGRATION_TYPE]]`, which you set to your chosen type.
4. **Add a card in the parent index page** at `docs/docs/integrations/<type>.html`. Place the card in the correct alphabetical position relative to the existing entries.
5. **Add a sitemap entry** in `docs/sitemap.xml` in the correct alphabetical position. Documented URLs do not have trailing slashes.
6. **Verify all code examples** against the actual Decibri API at <https://github.com/decibri/decibri>. Do not write API identifiers, method signatures, option names, event names, or error message strings from memory.
7. **Open a pull request.** GitHub will pre-populate a checklist that mirrors these steps.

## Improving existing pages

Smaller changes do not need the template, an issue, or coordination ahead of time. A pull request is fine for:

- Typos and broken links.
- Factual corrections.
- Prose clarifications.
- Updates to reflect new API versions, model versions, or provider features.

## Conventions

- Use `Decibri` capitalised in user-facing prose, not `decibri`. The footer attribution link text is the one place where lowercase is retained, to match the rest of the site.
- No em dashes anywhere in site content. Rewrite using periods, commas, colons, or parentheses.
- No commercial claims. Avoid words like "best", "fastest", "industry-leading", "trusted by", or "production-ready" without qualification. No comparative claims against other libraries. No performance numbers without methodology. Documentation describes what Decibri does, not how good it is.
- API identifiers must match the actual Decibri code repository at <https://github.com/decibri/decibri>. Class names, method signatures, constructor option names, event names, property names, and error message strings must be copied from source, not guessed.
- Documented URLs do not have trailing slashes. Use `/docs/integrations/stt/openai`, not `/docs/integrations/stt/openai/`.
- Provider lists are alphabetical. The parent index page card order, the sitemap entries, and any cross-references in Related lists follow the same order.

## Larger changes

If you are planning any of the following, open an issue first so we can coordinate before you spend time on the work:

- A new integration type beyond `stt`, `tts`, `vad`, `kws`.
- Structural changes to the site (navigation, breadcrumbs, page layout).
- A new section that spans multiple pages.
- Non-trivial reorganisation of existing content.

Provider pull requests within the four existing types do not need an issue first.

## License

By submitting a pull request, you agree that your contribution will be licensed under the same Apache-2.0 license as the rest of this repository.
