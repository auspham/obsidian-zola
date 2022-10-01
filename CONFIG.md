# Configuration Options

> All options are set in `netlify.toml` under `[build.environment]`. See [`netlify.example.toml`](netlify.example.toml) for a ready-to-use template.

## Required

### `SITE_URL`
URL to your Netlify site.

### `REPO_URL`
GitHub repo URL where your Markdown files are hosted.

### `LANDING_PAGE`
The Markdown file linked to the landing page button. URLs are always slugified, so use the slugified name here. E.g. for `/somewhere far/some funny note.md`, enter `LANDING_PAGE=somewhere-far/some-funny-note`.

## Optional

### `SITE_TITLE`
Site title displayed in the sidebar. Default: `"Someone's Second 🧠"`.

### `SITE_TITLE_TAB`
Site title in the browser tab. Leave blank to use `SITE_TITLE`. Default: `""`.

### `LANDING_TITLE`
Title shown on the landing page. Default: `"I love obsidian-zola! 💖"`.

### `LANDING_DESCRIPTION`
Description shown on the landing page. Default: `"I have nothing but intelligence."`.

### `LANDING_BUTTON`
Button text on the landing page. Default: `"Click to steal some👆"`.

### `TIMEZONE`
Site timezone. Default: `"Asia/Hong_Kong"`.

### `GANALYTICS`
Google Analytics Measurement ID. Default: `""`.

### `HOME_GRAPH`
Show knowledge graph on the home page. Set to `""` to disable. Default: `"y"`.

### `PAGE_GRAPH`
Show knowledge graph on every page. Set to `""` to disable. Default: `"y"`.

### `LOCAL_GRAPH`
Page graph only shows directly connected nodes. Default: `""`.

### `STRICT_LINE_BREAKS`
Use standard Markdown strict line breaks (single line breaks ignored unless followed by 2 spaces). Set to `""` for Obsidian-style line breaks. Users who use LaTeX should keep this as `"y"`. Default: `"y"`.

### `SIDEBAR_COLLAPSED`
Collapse sidebar sections by default. Default: `""`.

### `SKIP_LANDING`
Skip the landing page and redirect straight to `LANDING_PAGE`. Set to `"y"` to enable. Default: `""`.

### `SHOW_EXCALIDRAW_LABEL`
Show the "Excalidraw" label next to excalidraw files in the sidebar. Set to `""` to hide. Default: `"y"`.

### `HIDE_SIDEBAR_PATTERNS`
Comma-separated glob patterns for folders to hide from the sidebar (they are still rendered, just not shown in navigation). Matches against both the full relative path and individual path parts.

Examples:
- `assets` — hides any folder named "assets" at any depth
- `assets,drafts` — hides both "assets" and "drafts" folders
- `assets,*-internal` — hides "assets" and any folder ending in "-internal"

Default: `"assets"`.

### `EXCLUDE_PATTERNS`
Comma-separated glob patterns for folders/files to completely exclude from the site. Excluded paths are not rendered, not added to the knowledge graph, and not included in search. Uses the same matching logic as `HIDE_SIDEBAR_PATTERNS`.

Examples:
- `Close Sources` — excludes a folder named "Close Sources"
- `Private,Close Sources` — excludes multiple folders
- `*.tmp` — excludes all `.tmp` files

Default: `""`.

> **Tip:** You can also use `.gitignore` to prevent private notes from being pushed to a public repo in the first place.

### `FOOTER`
Additional HTML content for the footer (only in landing page)

## Do Not Touch

Do not change these:
- `PYTHON_VERSION`
- `ZOLA_VERSION`

## FAQs

### How do I hide certain folders from the sidebar?
Set `HIDE_SIDEBAR_PATTERNS` to a comma-separated list of glob patterns. Matched folders are still rendered and accessible via URL, but won't appear in the sidebar navigation. For example, `HIDE_SIDEBAR_PATTERNS = "assets,drafts"` hides both "assets" and "drafts" folders.

### How do I exclude folders/files from being published entirely?
Set `EXCLUDE_PATTERNS` to a comma-separated list of glob patterns. Matched paths are completely skipped during build — they won't be rendered, won't appear in the knowledge graph, and won't be searchable. For example, `EXCLUDE_PATTERNS = "Private,Close Sources"` excludes both folders.