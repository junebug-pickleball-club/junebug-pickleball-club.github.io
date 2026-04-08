# Project Structure

```
_config.yml          # Site-wide config (title, theme, plugins, baseurl)
_data/
  data.yml           # League-wide data (events, etc.)
  seasons/           # Per-season YAML files (e.g. spring-2026.yml)
_includes/           # Reusable Liquid partials (team-card.html, header.html, etc.)
_layouts/            # Page layout templates
_posts/              # Blog/news posts (Markdown, date-prefixed filenames)
_seasons/            # Jekyll collection — one .md per season
_site/               # Build output — do not edit directly
pages/               # All standalone pages (about, events, seasons, submit-match, blog)
index.markdown       # Home page (layout: home) — stays in root
404.html             # 404 page — stays in root
Gemfile              # Ruby gem dependencies
```

## Conventions

- **Data first**: add/update league content in `_data/` files, not in page or layout files.
- **Partials**: reusable UI fragments go in `_includes/`. Pass data via Liquid include parameters (e.g. `{% include team-card.html team=team %}`).
- **Pages**: use front matter to set `layout`, `title`, and `permalink`. All standalone pages live in `pages/`. Prefer `layout: page` for standard pages.
- **Posts**: filename format is `YYYY-MM-DD-title.markdown` inside `_posts/`.
- **Styles**: inline `<style>` blocks are used in some page files; prefer keeping styles scoped to the page they belong to until a shared stylesheet is warranted.

## Jekyll & Liquid Best Practices

- **Permalinks over file paths**: always set `permalink` in front matter. Never rely on the file's directory path to determine the output URL.
- **Pass data explicitly to includes**: never access `site.data` directly inside a partial — pass the data in as a parameter so the partial stays reusable and testable.
- **Season data is the source of truth for teams**: team objects live in `_data/seasons/{slug}.yml` under the `teams` key. Do not create a global teams file.
- **Slug-based references in schedules**: schedule entries reference teams by `slug` string only (e.g. `home_team: servers-of-the-court`). Resolution to display names happens at render time in the layout/includes, not in the data file.
- **Static site limitations**: Liquid runs at build time, not runtime. Any data that needs to respond to user interaction (e.g. filtering teams by selected season) must be embedded as JSON at build time and handled with JavaScript at runtime.
- **GitHub Pages plugin constraints**: only use plugins supported by the `github-pages` gem. Check compatibility before adding new gems.
- **Avoid logic in data files**: keep YAML data files as pure data. Put conditional logic and formatting in layouts and includes.
- **`_site/` is always disposable**: never edit files in `_site/` — it is wiped and regenerated on every build.
