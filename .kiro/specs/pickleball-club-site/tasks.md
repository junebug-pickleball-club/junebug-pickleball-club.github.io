# Implementation Plan: Junebug Pickleball Club Site

## Overview

Transforms the minimal Jekyll starter into a full-featured club hub: dark theme, multi-season league data, match submission form with GitHub API integration, events page, and blog. All implementation is Jekyll + Liquid + vanilla JS — no custom plugins, no build step.

## Tasks

- [ ] 1. Migrate and extend data files
  - [x] 1.1 Migrate `_data/data.yml` to `_data/teams.yml`
    - Copy teams array from `data.yml` into a new `_data/teams.yml` file
    - Add a kebab-case `id` field to each team entry (e.g. `servers-of-the-court`, `pickle-posse`)
    - Keep `data.yml` in place temporarily so existing `teams.html` doesn't break until it is updated in task 4
    - _Requirements: 2.1_

  - [x] 1.2 Create `_data/seasons/spring-2026.yml`
    - Create the `_data/seasons/` directory
    - Add a `spring-2026.yml` file with `name`, `slug`, `start_date`, `end_date`, `teams` array (using team ids), and a `schedule` array containing at least two matches — one with a `result` block and one without
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.7_

  - [x] 1.3 Create `_data/events.yml`
    - Add at least two events: one with a future date (upcoming) and one with a past date
    - Each entry must have `name`, `date`, `location`, and `description`
    - _Requirements: 5.1, 5.2_

  - [x] 1.4 Update `_config.yml`
    - Add `active_season: spring-2026`
    - Add `collections:` block for `seasons` with `output: true` and `permalink: /seasons/:name`
    - Add `defaults:` block setting `layout: season` for the `seasons` collection type
    - _Requirements: 3.9, 7.6_

- [ ] 2. Dark theme SCSS
  - [x] 2.1 Create `assets/css/style.scss`
    - Add the Jekyll front matter triple-dash header so Jekyll processes the file
    - Override Minima SCSS variables: `$background-color`, `$brand-color`, `$text-color`, `$grey-color`, `$grey-color-dark`, `$grey-color-light` using the design palette (`#0f0f1a`, `#e94560`, `#e8e8f0`, etc.)
    - Import `minima` after variable declarations
    - Add custom component styles: cards (`.team-card`, `.event-card`), primary button, table alternating rows, form inputs with focus ring, nav active-link underline
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [ ] 3. Layouts and includes
  - [x] 3.1 Create `_includes/footer.html`
    - Render a `<footer>` element containing `site.title` and `site.email`
    - _Requirements: 7.2_

  - [x] 3.2 Create `_includes/header.html`
    - Override Minima's default header with a custom nav bar
    - Include links to Home, Teams, Events, Blog, and Submit Match
    - Add a Seasons nav item: first entry links directly to `/seasons/{{ site.active_season }}` (active season), second entry links to `/seasons` (all seasons index)
    - Apply an `active` CSS class to the link whose `page.url` matches the current page
    - Add a hamburger button (`<button class="nav-toggle">`) that toggles a `.nav-open` class on the nav via inline `<script>` — no external JS file needed
    - _Requirements: 1.4, 1.5, 7.1, 7.3, 7.6, 7.7_

  - [x] 3.3 Create `_includes/team-card.html`
    - Accept a `team` parameter via Liquid include
    - Render team name, home court, and roster list with each player's name and role
    - When `team.roster` is empty or absent, render a "Roster pending" placeholder
    - Apply `.team-card` CSS class
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 3.4 Create `_includes/match-row.html`
    - Accept a `match` parameter and a `teams` parameter (the full teams array for id→name lookup)
    - Render home team name, away team name, week, location
    - When `match.result` is present, render per-game scores for `mens_doubles`, `womens_doubles`, `mixed_doubles`, and `dreambreaker`
    - When `match.result` is absent, render a "Scheduled" badge
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 3.5 Create `_includes/standings-table.html`
    - Accept a `season` parameter
    - Iterate over `season.teams`, compute match wins and total game wins for each team by scanning `season.schedule`
    - Build a sortable standings array using Liquid's `sort` filter on a pre-keyed structure; use `standings_order` override array from season data if present
    - Render an HTML table with columns: Rank, Team, W, L, Game Wins
    - _Requirements: 3.3, 3.4_

  - [x] 3.6 Create `_includes/event-card.html`
    - Accept an `event` parameter
    - Render event name, date (formatted), location, and description
    - Apply `.event-card` CSS class
    - _Requirements: 5.2_

  - [x] 3.7 Create `_layouts/season.html`
    - Inherit from `default` layout (set `layout: default` in front matter)
    - Load season data via `site.data.seasons[page.data_file]`
    - Render season name, date range, and participating team names
    - Include `standings-table.html` passing the season object
    - Iterate `season.schedule` and include `match-row.html` for each match
    - _Requirements: 3.3, 3.5, 3.6, 3.7_

  - [x] 3.8 Create `_layouts/post.html`
    - Inherit from `default` layout
    - Render post title, publication date, author (from `page.author` front matter), and `content`
    - _Requirements: 6.3, 6.4, 6.6_

- [ ] 4. Pages
  - [x] 4.1 Update `index.markdown`
    - Set `layout: home` in front matter
    - Add a hero section (via front matter or inline HTML) with the club name, a brief description, and links to `/teams`, `/seasons/{{ site.active_season }}`, and `/events`
    - _Requirements: 7.4_

  - [x] 4.2 Update `teams.html`
    - Change data source from `site.data.data.teams` to `site.data.teams`
    - Replace the existing team partial with `{% include team-card.html team=t %}` for each team
    - _Requirements: 2.1, 2.5_

  - [x] 4.3 Create `seasons/index.html`
    - Set `layout: page`, `title: Seasons`, `permalink: /seasons/`
    - Iterate `site.collections.seasons.docs` sorted by `start_date` descending
    - Render each season as a card linking to its permalink
    - When the collection is empty, display "No seasons yet"
    - _Requirements: 3.1, 3.8_

  - [x] 4.4 Create `_seasons/spring-2026.md`
    - Front matter only: `layout: season`, `title: Spring 2026`, `slug: spring-2026`, `data_file: spring-2026`
    - _Requirements: 3.2_

  - [x] 4.5 Create `events.html`
    - Set `layout: page`, `title: Events`, `permalink: /events/`
    - Split `site.data.events` into upcoming (date ≥ today) and past (date < today) using Liquid date comparison
    - Render upcoming events in ascending date order; past events in descending date order
    - When no upcoming events exist, display "No upcoming events scheduled"
    - Include `event-card.html` for each event
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.6 Create `blog/index.html`
    - Set `layout: page`, `title: Blog`, `permalink: /blog/`
    - Iterate `site.posts` (already reverse chronological) and render title, date, author, and excerpt for each
    - Link each entry to `post.url`
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [x] 4.7 Create `submit-match.html`
    - Set `layout: page`, `title: Submit Match`, `permalink: /submit-match/`
    - Render a form with fields: home team (select from `site.data.teams`), away team (select), season (select from `site.collections.seasons.docs`), week number, match date, location, and score inputs (home + away) for each of the four game types
    - Apply dark theme form styles
    - Add a PAT input section (stored to `localStorage` under `jpl_github_pat`) with a "Clear token" link
    - Inline a `<script>` block containing: `validateForm(fields)`, `serializeMatchYaml(match)`, `submitMatchResult(formData, pat, repoOwner, repoName)` (orchestrates the GitHub API call sequence from the design), and UI feedback handlers
    - On successful PR creation, display a success banner with a clickable PR URL
    - On API error, display an error banner with the failure description per the error-handling table in the design
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 5. Checkpoint — verify Jekyll build
  - Run `bundle exec jekyll build` and confirm it exits 0 with no errors or warnings
  - Spot-check `_site/` for: `index.html`, `teams/index.html`, `seasons/index.html`, `seasons/spring-2026/index.html`, `events/index.html`, `blog/index.html`, `submit-match/index.html`
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Property-based test harness and pure JS module
  - [x] 6.1 Set up Vitest + fast-check test harness
    - Create `package.json` with `vitest` and `fast-check` as dev dependencies
    - Add a `test` script: `vitest --run`
    - Create `tests/` directory
    - _Requirements: (testing infrastructure)_

  - [x] 6.2 Extract pure JS functions into `assets/js/match-utils.js`
    - Move `validateForm(fields)`, `serializeMatchYaml(match)`, score parsing helpers, events partitioning/sorting logic, and standings comparator logic out of the inline script into a standalone ES module
    - Export each function
    - Update `submit-match.html` to import from this module (or inline-copy for GitHub Pages compatibility — use a `<script type="module">` import if the browser target allows, otherwise duplicate minimally)
    - _Requirements: 4.4, 4.5_

  - [x] 6.3 Write property test — Property 4: Standings ranking comparator invariant
    - **Property 4: Standings ranking satisfies win comparator invariant**
    - For any set of match results, team A ranks above team B iff A has more match wins, or equal match wins and more game wins
    - **Validates: Requirements 3.4**

  - [x] 6.4 Write property test — Property 6: Form validation identifies all missing required fields
    - **Property 6: Form validation identifies all missing required fields**
    - For any non-empty subset of required fields left empty, `validateForm` returns a failed result identifying every missing field
    - **Validates: Requirements 4.5**

  - [x] 6.5 Write property test — Property 9: YAML serialization round-trip preserves match data
    - **Property 9: YAML serialization round-trip preserves match data**
    - For any valid match result object, `serializeMatchYaml(match)` produces a YAML string that parses back to an equivalent object
    - Use `js-yaml` (or a minimal inline parser) in the test to parse the output
    - **Validates: Requirements 4.4**

  - [x] 6.6 Write property test — Property 10: Events correctly partitioned and sorted
    - **Property 10: Events are correctly partitioned and sorted**
    - For any set of events with varying dates relative to a reference date, the partitioning function places events correctly in upcoming/past and sorts each section correctly
    - **Validates: Requirements 5.3, 5.5**

  - [x] 6.7 Write property test — Property 7: Valid submission produces correct GitHub API call sequence
    - **Property 7: Valid submission produces correct GitHub API call sequence**
    - For any valid form submission, mock the fetch API and verify the call sequence: GET file → POST ref → PUT file → POST pull — in that order, with correct payloads
    - **Validates: Requirements 4.4**

  - [x] 6.8 Write property test — Property 8: API response reflected in UI feedback
    - **Property 8: API response reflected in UI feedback**
    - For any GitHub API response (success or error variant), the UI feedback handler displays a non-empty message; success includes the PR URL, error includes a description
    - **Validates: Requirements 4.6, 4.7**

  - [x] 6.9 Write property test — Property 1: Team card renders all team data
    - **Property 1: Team card renders all team data**
    - For any team object with name, home court, and roster, the rendered team-card HTML contains the team name, home court, all player names, and each player's role
    - Use a minimal Liquid renderer or string-match approach against the include template
    - **Validates: Requirements 2.2, 2.3**

  - [x] 6.10 Write property test — Property 2: Seasons index is reverse chronological
    - **Property 2: Seasons index is reverse chronological**
    - For any collection of seasons with distinct start dates, the sorted output lists them newest-first
    - **Validates: Requirements 3.1**

  - [x] 6.11 Write property test — Property 3: Season detail page renders all season data
    - **Property 3: Season detail page renders all season data**
    - For any valid season data object, the rendered output contains season name, date range, all team names, all matches, and a standings table
    - **Validates: Requirements 3.3**

  - [x] 6.12 Write property test — Property 5: Match row renders complete match data
    - **Property 5: Match row renders complete match data**
    - For any match object with a result, the rendered match row contains home team, away team, week, location, and all four game scores
    - **Validates: Requirements 3.5, 3.6**

  - [x] 6.13 Write property test — Property 11: Event card renders all event fields
    - **Property 11: Event card renders all event fields**
    - For any event object with name, date, location, and description, the rendered event card HTML contains all four fields
    - **Validates: Requirements 5.2**

  - [x] 6.14 Write property test — Property 12: Blog posts rendered with complete data
    - **Property 12: Blog posts rendered with complete data**
    - For any post object with title, date, author, excerpt, and content, both the index entry and full post page contain title, date, and author; index has excerpt; post page has full content
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.6**

  - [x] 6.15 Write property test — Property 13: Footer present on all pages
    - **Property 13: Footer present on all pages**
    - For any page in the built site, the rendered HTML contains a footer element with the club name and contact email
    - **Validates: Requirements 7.2**

  - [x] 6.16 Write property test — Property 14: Active navigation link reflects current page
    - **Property 14: Active navigation link reflects current page**
    - For any page in the built site, the nav applies an active CSS class to exactly the link corresponding to that page's section
    - **Validates: Requirements 7.3**

- [x] 7. Final checkpoint — Ensure all tests pass
  - Run `bundle exec jekyll build` to confirm clean build
  - Run `npm test` (or `npx vitest --run`) to confirm all property tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests (6.3–6.16) require the pure JS module from 6.2 to be in place first
- The `_seasons/` collection and `_data/seasons/` directory are separate concerns: the collection file (`_seasons/spring-2026.md`) drives URL generation; the data file (`_data/seasons/spring-2026.yml`) holds the actual match data
- Do not edit files under `_site/` directly — they are build output
