# Implementation Plan: Blog-to-News Migration

## Overview

Migrate the standalone `/blog/` page into a News section on the home page, add a `/news/` archive page, and remove the blog page and its nav link. All changes are Liquid/HTML in the Jekyll source tree.

## Tasks

- [x] 1. Create `_includes/news-card.html` partial
  - Create `_includes/news-card.html` that renders a single post as a Post_Card using the `.event-card` CSS class
  - Include `event-card__name` (title as link to post URL), `event-card__date` (formatted date), and `event-card__description` (truncated excerpt)
  - Mirror the field structure of `_includes/event-card.html`
  - _Requirements: 1.2, 1.6_

- [x] 2. Add News section to `index.markdown`
  - [x] 2.1 Append a `<section class="news-section">` block after the existing hero `<div>` in `index.markdown`
    - Loop over `site.posts` with `limit:5` using `{% include news-card.html post=post %}`
    - Render "No news yet." when `site.posts` is empty
    - Render a "View all news →" link to `/news/` only when `site.posts.size > 5`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write unit tests for News section rendering
    - Test that up to 5 post cards render when posts exist
    - Test that the "View all" link appears only when more than 5 posts exist
    - Test that the empty-state message renders when no posts exist
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 3. Create `pages/news.html` archive page
  - Create `pages/news.html` with `layout: page`, `title: News`, `permalink: /news/`
  - Loop over all `site.posts` using `{% include news-card.html post=post %}`
  - Render "No news yet." when `site.posts` is empty
  - Do NOT add a nav link for this page
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Remove Blog nav link from `_includes/header.html`
  - Delete the `<a>` tag for `/blog/` from `_includes/header.html`
  - Verify the Home nav link active state logic is unchanged
  - _Requirements: 3.1, 4.1, 4.2_

- [x] 5. Delete `pages/blog.html`
  - Remove `pages/blog.html` from the source tree so Jekyll no longer generates `/blog/`
  - _Requirements: 3.1, 3.2_

- [x] 6. Checkpoint — Ensure all tests pass
  - Run `npm test` and confirm no regressions
  - Verify Jekyll builds without errors via `bundle exec jekyll build`
  - Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `site.posts` is sorted newest-first by Jekyll automatically — no explicit sort needed
- The `/news/` archive page is reachable only via the "View all" link; it is intentionally excluded from primary navigation
