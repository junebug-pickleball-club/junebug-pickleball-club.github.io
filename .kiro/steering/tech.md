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

# Run tests (always use this — do NOT use `npx vitest` directly as it enters watch mode)
npm test
```

## Notes

- Always run Jekyll via `bundle exec` to ensure the correct gem versions are used.
- The `_site/` directory is the build output — do not edit files there directly.
- GitHub Pages compatibility is managed via the `github-pages` gem; avoid adding plugins not supported by GitHub Pages.
- Always use `npm test` to run the test suite. It runs `vitest --run` (single-pass, no watch mode). Using `npx vitest` without `--run` will stall in interactive watch mode.
