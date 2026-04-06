# Project Structure

```
_config.yml          # Site-wide config (title, theme, plugins, baseurl)
_data/
  data.yml           # All league data: teams, rosters, schedules
_includes/
  team.html          # Reusable team card partial
_posts/              # Blog/news posts (Markdown, date-prefixed filenames)
_site/               # Build output — do not edit directly
index.markdown       # Home page (layout: home)
about.markdown       # About page (layout: page)
teams.html           # Teams page — iterates site.data.data.teams
Gemfile              # Ruby gem dependencies
```

## Conventions

- **Data first**: add/update league content (teams, schedules) in `_data/data.yml`, not in page files.
- **Partials**: reusable UI fragments go in `_includes/`. Pass data via Liquid include parameters (e.g. `{% include team.html team=teamToRender %}`).
- **Pages**: use front matter to set `layout`, `title`, and `permalink`. Prefer `layout: page` for standard pages.
- **Posts**: filename format is `YYYY-MM-DD-title.markdown` inside `_posts/`.
- **Styles**: inline `<style>` blocks are used in some page files; prefer keeping styles scoped to the page they belong to until a shared stylesheet is warranted.
