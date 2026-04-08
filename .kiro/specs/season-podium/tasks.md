# Implementation Plan: Season Podium

## Overview

Implement the season podium feature across three layers: extend the season YAML data with `status` and `finale_rankings` fields, create the `_includes/season-podium.html` Liquid partial, update `_layouts/season.html` to include the podium and reorder sections, and add property-based tests in `tests/rendering.test.js`.

## Tasks

- [x] 1. Extend `_data/seasons/spring-2026.yml` with podium data fields
  - Add `status: completed` field to the season YAML
  - Add `finale_rankings` list with three team slugs (ordered: gold, silver, bronze)
  - Slugs must match entries already present in the `teams` list of the same file
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create `_includes/season-podium.html` Liquid partial
  - [x] 2.1 Implement the podium partial
    - Accept `include.season` as the sole parameter; do not access `site.data` directly
    - Wrap output in a `<section class="season-podium season-section">` element
    - Loop over `include.season.finale_rankings` with `limit:3`
    - For each entry, find the matching team object from `include.season.teams` by slug
    - Assign CSS modifier class `podium-entry--gold` / `podium-entry--silver` / `podium-entry--bronze` based on `forloop.index`
    - Render `<img>` with team logo `src` when the team has a `logo` value; render a placeholder `<div class="podium-entry__logo-placeholder">` otherwise (mirrors `team-card.html` pattern)
    - Render team name; fall back to the raw slug if no matching team is found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 6.1, 6.3_

  - [ ]* 2.2 Write smoke tests for the podium partial source
    - Verify `_includes/season-podium.html` does not contain `site.data` (Req 6.3)
    - Verify `_layouts/season.html` contains `include season-podium.html season=season` (Req 6.2)
    - _Requirements: 6.2, 6.3_

- [x] 3. Update `_layouts/season.html` to include the podium and reorder sections
  - Add the guarded podium include at the top of `.season-detail`, before all other sections:
    `{% if season.status == "completed" and season.finale_rankings and season.finale_rankings.size > 0 %}`
    `  {% include season-podium.html season=season %}`
    `{% endif %}`
  - Reorder existing sections to: podium → standings → schedule → teams
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 6.2_

- [x] 4. Checkpoint — build the site and verify the podium renders
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add property-based tests in `tests/rendering.test.js`
  - [x] 5.1 Add JS simulation helpers (`shouldShowPodium`, `renderPodium`, `renderSeasonPage`)
    - `shouldShowPodium(season)` — mirrors the Liquid `if` guard: returns true iff `status == "completed"` and `finale_rankings` is non-empty
    - `renderPodium(season)` — simulates the partial: iterates up to 3 rankings, resolves team by slug, emits HTML with `.podium-entry`, medal modifier classes, team name, and `<img>` or placeholder
    - `renderSeasonPage(season)` — wraps `renderPodium` output followed by stub standings, schedule, and teams section markers to test ordering
    - _Requirements: 2.1, 3.1, 5.1_

  - [ ]* 5.2 Write property test for Property 1: rankings slugs ⊆ team slugs
    - **Property 1: Finale rankings slugs are a subset of team slugs**
    - **Validates: Requirements 1.3**

  - [ ]* 5.3 Write property test for Property 2: podium visibility condition
    - **Property 2: Podium visibility matches the completed-with-rankings condition**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 5.4 Write property test for Property 3: entry count equals min(rankings, 3)
    - **Property 3: Rendered podium entry count equals the number of rankings (capped at 3)**
    - **Validates: Requirements 3.1, 4.1, 4.2, 4.3**

  - [ ]* 5.5 Write property test for Property 4: medal labels assigned by position
    - **Property 4: Medal labels are assigned by position**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ]* 5.6 Write property test for Property 5: team name resolved from teams list
    - **Property 5: Team name is resolved from the teams list**
    - **Validates: Requirements 3.5**

  - [ ]* 5.7 Write property test for Property 6: logo or placeholder by team logo presence
    - **Property 6: Logo or placeholder rendered based on team logo presence**
    - **Validates: Requirements 3.6, 3.7**

  - [ ]* 5.8 Write property test for Property 7: podium section precedes all other sections
    - **Property 7: Podium section precedes all other sections in the rendered HTML**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 5.9 Write smoke test against built `_site/seasons/spring-2026.html`
    - Verify the built page contains `.season-podium` after `spring-2026.yml` is updated
    - _Requirements: 2.1_

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The podium partial must never access `site.data` directly — all data flows through the `season` include parameter
- Property tests use `fast-check` with `{ numRuns: 100 }` and the tag format `Feature: season-podium, Property {N}: {description}`
- Run tests with `npm test` (runs `vitest --run`); never use `npx vitest` directly
