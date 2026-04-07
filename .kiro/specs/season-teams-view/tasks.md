# Implementation Plan: season-teams-view

## Overview

Migrate team data from global files into per-season YAML, update the season layout to render a Teams section, update includes to resolve team names from season data, remove the global Teams page and nav link, and make the submit-match form season-aware for team dropdowns.

## Tasks

- [x] 1. Migrate team data into `_data/seasons/spring-2026.yml`
  - Add a `teams` key to `_data/seasons/spring-2026.yml` containing fully-inlined team objects (`slug`, `name`, `home_court`, `roster`) for all teams currently in `_data/teams.yml`
  - Verify schedule entries continue to reference teams by slug string only
  - _Requirements: 1.1, 4.1, 4.3_

- [x] 2. Remove global team data files
  - Delete `_data/teams.yml`
  - Remove the `teams` key from `_data/data.yml`
  - _Requirements: 1.3, 1.4_

- [x] 3. Update `_layouts/season.html` to render the Teams section
  - Replace the existing `season-teams` section (which iterates slug strings and looks up `site.data.teams`) with a section that iterates `season.teams` as inline objects and renders each via `{% include team-card.html team=team %}`
  - Add an empty-state message ("No teams have been announced yet.") for seasons with no teams
  - Ensure the Teams section appears before the Standings section
  - Update the `match-row.html` include call to pass `teams=season.teams` instead of `teams=site.data.teams`
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.1 Write property test for teams section rendering (Property 2)
    - **Property 2: Teams section renders all teams**
    - **Validates: Requirements 2.1**
    - Generate season data objects with 0–10 randomly generated team entries; assert rendered HTML contains exactly N `.team-card` elements

  - [x] 3.2 Write property test for team card rendering (Property 3)
    - **Property 3: Team card renders complete team data**
    - **Validates: Requirements 2.3**
    - Generate random team objects; assert rendered card HTML contains `name`, `home_court`, and all roster member names

- [x] 4. Update `_includes/standings-table.html` to use `season.teams`
  - Change team name resolution from iterating `site.data.teams` (matching on `t.id`) to iterating `season.teams` (matching on `t.slug`)
  - _Requirements: 1.2, 4.3_

- [x] 5. Update `_includes/match-row.html` to use `t.slug` as the lookup key
  - Change the team name lookup from `t.id == match.home_team` / `t.id == match.away_team` to `t.slug == match.home_team` / `t.slug == match.away_team`
  - _Requirements: 1.2, 4.3_

  - [x] 5.1 Write property test for schedule slug resolution (Property 4)
    - **Property 4: Schedule slug resolution**
    - **Validates: Requirements 4.3**
    - Generate season data with random teams and schedule entries whose slugs are drawn from the teams list; assert rendered match rows display team names, not raw slugs

- [x] 6. Remove the global Teams page and nav link
  - Delete `teams.html`
  - Remove the Teams nav link (`<a … href="/teams">Teams</a>`) from `_includes/header.html`
  - _Requirements: 3.1, 3.2_

  - [x] 6.1 Write unit tests for removal smoke checks
    - Assert `teams.html` does not exist in the source
    - Assert `_includes/header.html` does not contain `/teams/` link
    - _Requirements: 3.2, 3.1_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update `submit-match.html` for season-aware team dropdowns
  - Add a Liquid `<script>` block that embeds all season team data as a `SEASON_TEAMS` JSON constant at build time, keyed by `s.data_file`
  - Remove the existing static `{% for team in site.data.teams %}` Liquid loops from both team `<select>` elements
  - Set both `#home-team` and `#away-team` to `disabled` with only the `— select —` placeholder on initial page load
  - Add a `change` listener on `#season-select` that calls `populateTeamDropdowns(seasonKey)` to repopulate and enable both dropdowns with the teams for the selected season
  - Clear previously selected values when the season changes
  - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.1 Write property test for season-select dropdown population (Property 5)
    - **Property 5: Season-select populates correct team options**
    - **Validates: Requirements 5.1, 5.3**
    - Generate random `SEASON_TEAMS` maps (2–5 seasons, each with 2–8 teams); pick a random season key; assert both dropdowns contain exactly the options for that season and no options from other seasons

  - [x] 8.2 Write unit test for disabled initial state
    - Assert both team dropdowns are disabled and contain only the placeholder when no season is selected
    - _Requirements: 5.2_

- [ ] 9. Write property test for team object shape (Property 1)
  - [x] 9.1 Write property test for team objects containing all required fields (Property 1)
    - **Property 1: Team objects contain all required fields**
    - **Validates: Requirements 1.1**
    - Generate random team objects with varying slugs, names, courts, and rosters; assert each has non-empty `slug`, `name`, `home_court`, and `roster`

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** (available via npm) with vitest, minimum 100 iterations each
- The `_site/` directory is build output — do not edit it directly
- Schedule entries always reference teams by slug string; resolution to display names happens at render time in the layout and includes
