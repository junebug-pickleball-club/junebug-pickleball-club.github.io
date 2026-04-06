# Tech Stack

- **Framework**: Jekyll (static site generator)
- **Theme**: Minima ~2.5 (skin: solarized-dark)
- **Hosting target**: GitHub Pages (`github-pages` ~232 gem)
- **Templating**: Liquid
- **Plugins**: jekyll-feed

## Common Commands

```bash
# Install dependencies
bundle install

# Local dev server (live reload)
bundle exec jekyll serve

# Production build (outputs to _site/)
bundle exec jekyll build

# Update dependencies
bundle update
```

## Notes

- Always run Jekyll via `bundle exec` to ensure the correct gem versions are used.
- The `_site/` directory is the build output — do not edit files there directly.
- GitHub Pages compatibility is managed via the `github-pages` gem; avoid adding plugins not supported by GitHub Pages.
