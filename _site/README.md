# Junebug Pickleball League

Website for the Junebug Pickleball League — a local pickleball club site displaying team rosters, schedules, and league information.

Built with [Jekyll](https://jekyllrb.com/) and hosted on GitHub Pages.

## Pages

- `/` — league landing page
- `/seasons/` — all seasons; each season has its own page at `/seasons/:slug`
- `/events/` — upcoming and past events
- `/submit-match/` — form for submitting match results
- `/about/` — general info

## Tech Stack

- Jekyll static site generator
- Minima ~2.5 theme (solarized-dark skin)
- Hosted on GitHub Pages via `github-pages` ~232 gem
- Liquid templating
- Vitest for JS unit tests

## Project Structure

```
_config.yml          # Site-wide config (title, theme, plugins, baseurl)
_data/
  data.yml           # League-wide data (events, etc.)
  seasons/           # Per-season YAML files (e.g. spring-2026.yml)
_includes/           # Reusable Liquid partials
_layouts/            # Page layout templates
_posts/              # Blog/news posts (Markdown, date-prefixed filenames)
_seasons/            # Jekyll collection — one .md per season
pages/               # All standalone pages
index.markdown       # Home page
```

## Development

```bash
# Install Ruby dependencies
bundle install

# Install JS dependencies
npm install

# Local dev server (live reload)
bundle exec jekyll serve

# Production build (outputs to _site/)
bundle exec jekyll build

# Run JS tests
npm test
```

## Content Updates

League content lives in `_data/` — update data files rather than editing HTML directly.

- Team data is season-specific and lives in `_data/seasons/{slug}.yml` under the `teams` key
- Schedule entries reference teams by `slug`; display names are resolved at render time
- `_site/` is build output — never edit it directly
