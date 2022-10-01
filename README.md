
# Obsidian-Zola-Publish

A free alternative to [Obsidian Publish](https://obsidian.md/publish). Converts your Obsidian vault into a static site using [Zola](https://www.getzola.org/) and deploys to [Netlify](https://www.netlify.com/).

**Live demo:** [https://swe.auspham.dev/](https://swe.auspham.dev/)

**Feature demo:** [Java Concurrency in Practice — Chapter 05](https://swe.auspham.dev/docs/java-concurrency-in-practice/chapter-05-building-block/) (showcases callouts, code blocks, navigation, TOC, and graph)

## Features

- Obsidian Publish-style theme (dark/light mode)
- Knowledge graph (global + per-page)
- Nested folder structure with collapsible sidebar
- Docs navigation (previous/next)
- Nested page preview on hover
- [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) rendering with drag/zoom
- Native Obsidian callout support
- Mermaid diagram support
- Full-text search
- Table of contents with scroll-spy
- Resizable sidebar and TOC panels

## Setup

**Step 1:** Turn your Obsidian vault into a Git repository and create a Netlify site pointing to it.

**Step 2:** Create a `netlify.toml` in your vault root. Copy from [`netlify.example.toml`](netlify.example.toml) and fill in the required values (`SITE_URL`, `REPO_URL`, `LANDING_PAGE`).

**Step 3:** Push your changes. Netlify will build and publish your vault automatically.

See [CONFIG.md](CONFIG.md) for detailed descriptions of every option.


# Question
Check [FAQs](CONFIG.md#faqs) or post in [Discussions](https://github.com/auspham/obsidian-zola/discussions)

## Excalidraw

To render Excalidraw diagrams on your site, the [Obsidian Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) must be configured to export as SVG:

1. Open Obsidian Settings > Excalidraw
2. Under **Embedding Excalidraw into your Notes and Exporting**, set the export format to **SVG Image**

## Local Testing

1. Install [Zola](https://www.getzola.org/documentation/getting-started/installation/)
2. Install Python dependencies: `pip install python-slugify rtoml natsort`
3. Clone this repo somewhere outside your vault
4. Set the vault path via a `.vault_path` file or the `$VAULT` environment variable
5. Run `./local-run.sh`

## Acknowledgements

Forked from [ppeetteerrs/obsidian-zola](https://github.com/ppeetteerrs/obsidian-zola). Wikilink parsing powered by [obsidian-export](https://github.com/zoni/obsidian-export). Thanks to [@DoNotResuscitate](https://github.com/DoNotResuscitate/) for finding and fixing nested folder bugs.

## Disclaimer

This software is provided "as is" without warranty of any kind (see [LICENSE](LICENSE)). This is a community-driven project — it is not actively maintained and there is no guarantee of ongoing support or issue resolution. Bug fixes and improvements rely on community contributions. Pull requests are welcome.