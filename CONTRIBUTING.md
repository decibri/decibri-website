# Contributing

Contributions to the Decibri documentation are welcome, including from integration partners adding or improving provider pages. As this is the official Decibri documentation, every change goes through a pull request review process to ensure a high standard of accuracy and clarity.

## Adding a new integration provider page

1. **Copy the template.** Copy `templates/integration.html` to `docs/docs/integrations/<type>/`, where `<type>` is the integration type: `stt`, `tts`, `vad`, or `kws`.
2. **Rename the file** to your provider slug, lowercase and hyphen-separated, with no spaces (for example, `openai.html` or `aws-transcribe.html`).
3. **Replace every `[[PLACEHOLDER]]` token** in the file. The placeholder list and what each token expects is documented in the comment block at the top of the template, including `[[INTEGRATION_TYPE]]`, which you set to your chosen type.
4. **Add an entry in the parent index page** at `docs/docs/integrations/<type>.html`. The STT index lists providers as rows in a comparison table, so add a `<tr>` following the existing row format. The TTS, VAD, and KWS indexes use a cards grid, so add a `doc-card` link following the existing card format. Place the entry in the correct alphabetical position relative to the existing entries.
5. **Verify all code examples** against the actual Decibri API at <https://github.com/decibri/decibri>. Do not write API identifiers, method signatures, option names, event names, or error message strings from memory.
6. **Open a pull request.** GitHub will pre-populate a checklist that mirrors these steps.

The maintainer adds the corresponding `docs/sitemap.xml` entry when the pull request is merged, so you do not need to edit the sitemap yourself.

## Improving existing pages

Smaller changes do not need the template, an issue, or coordination ahead of time. A pull request is fine for:

- Typos and broken links.
- Factual corrections.
- Prose clarifications.
- Updates to reflect new API versions, model versions, or provider features.

## Conventions

- Use `Decibri` capitalised in user-facing prose, not `decibri`. Lowercase `decibri` is retained only where it is the literal package, command, or class name (for example `npm install decibri` or `import decibri`).
- No em dashes anywhere in site content. Rewrite using periods, commas, colons, or parentheses.
- No commercial claims. Avoid words like "best", "fastest", "industry-leading", "trusted by", or "production-ready" without qualification. No comparative claims against other libraries. No performance numbers without methodology. Documentation describes what Decibri does, not how good it is.
- API identifiers must match the actual Decibri code repository at <https://github.com/decibri/decibri>. Class names, method signatures, constructor option names, event names, property names, and error message strings must be copied from source, not guessed.
- Documented URLs do not have trailing slashes. Use `/docs/integrations/stt/openai`, not `/docs/integrations/stt/openai/`.
- Provider lists are alphabetical. The parent index page order and any cross-references in Related lists follow the same order.

## Larger changes

If you are planning any of the following, open an issue first so we can coordinate before you spend time on the work:

- A new integration type beyond `stt`, `tts`, `vad`, `kws`.
- Structural changes to the site (navigation, breadcrumbs, page layout).
- A new section that spans multiple pages.
- Non-trivial reorganisation of existing content.

Provider pull requests within the four existing types do not need an issue first.

## Contributor License Agreement

Before your first contribution can be merged, we ask you to agree to the Decibri Contributor License Agreement. It is a one-time step that lets the project include your work under its current and future licenses, with clear provenance, and it does not take away your copyright in what you contribute. You are welcome to read the full agreements first: the [Individual CLA](https://github.com/decibri/decibri-cla-action/blob/main/agreements/Individual-CLA-v1.md) and, for contributions made on behalf of a company, the [Corporate CLA](https://github.com/decibri/decibri-cla-action/blob/main/agreements/Corporate-CLA-v1.md).

When you open a pull request, an automated check looks at whether you are already covered. If you are not, it leaves a comment with a short sentence to agree to. Reply with that exact sentence as a comment on your own pull request, and the check turns green. That is the whole process, and once you have done it you are covered for your future contributions too. Until the check passes, the pull request cannot be merged.

If you are contributing as part of your work, your employer may need a Corporate CLA on file instead of an individual one. If that applies to you, or the check asks about it, contact the maintainers and we will sort it out.

The record we keep is deliberately minimal: your GitHub username and account ID, which version of the agreement you agreed to, and the date. How we handle that information, and how to request its removal, is set out in our [Privacy Policy](https://decibri.com/privacy).

The CLA covers your contributions across the decibri organisation's repositories, so you only need to agree once.

## License

The Decibri website source is released under the [Apache License 2.0](LICENSE).

Contributions are governed by the Contributor License Agreement described above. Under the CLA you keep your copyright in what you contribute and grant the project the rights it needs to include and license your work, including under future licenses. Contributed code or content must be your own work, and you confirm that you have the right to grant those rights.
