# Implementation Plan: Match Submission Form Update

## Overview

Extend the match submission form to capture player participation per game. Changes are confined to three files: `pages/submit-match.html` (Liquid data embedding + player dropdown HTML + runtime JS), `assets/js/match-utils.js` (updated `validateForm` and `serializeMatchYaml`), and `tests/match-utils.test.js` (new property tests).

## Tasks

- [x] 1. Extend `serializeMatchYaml` to emit `home_players` / `away_players`
  - In `assets/js/match-utils.js`, update each of the 6 non-Dreambreaker game blocks to append two lines after `home`/`away`:
    - `'        home_players: [' + game.home_players.map(n => '"' + n + '"').join(', ') + ']'`
    - `'        away_players: [' + game.away_players.map(n => '"' + n + '"').join(', ') + ']'`
  - Quote each name defensively so commas, brackets, and colons in names don't break YAML inline sequence syntax
  - Omit the player lines when `home_players`/`away_players` are absent (backward-compatible)
  - Dreambreaker block remains score-only — no player lines
  - _Requirements: 5.1, 5.2, 6.2_

  - [ ]* 1.1 Write property test — YAML round-trip preserves player arrays (Property 4)
    - **Property 4: YAML serialization round-trip preserves player arrays**
    - Extend `matchArb` so each game result includes `home_players` and `away_players` (arrays of 1–4 player name strings via `fc.array(fc.stringMatching(/^[A-Za-z ]{1,20}$/), { minLength: 1, maxLength: 4 })`)
    - Assert that `yaml.load('schedule:\n' + serializeMatchYaml(match))` recovers each game's `home_players` and `away_players` arrays equal to the originals
    - Tag: `Feature: match-submission-form-update, Property 4: YAML serialization round-trip preserves player arrays`
    - **Validates: Requirements 5.1, 5.2, 6.1**

  - [ ]* 1.2 Write property test — special character names survive round-trip (Property 5)
    - **Property 5: Player names with special characters survive round-trip**
    - Reuse the extended `matchArb` from 1.1 but override the name generator with `fc.stringMatching(/^[A-Za-zÀ-ÿ' -]{1,30}$/)`
    - Assert round-trip equality for every player name in every game
    - Tag: `Feature: match-submission-form-update, Property 5: Player names with special characters survive round-trip`
    - **Validates: Requirements 6.2**

- [x] 2. Extend `validateForm` to require all 24 player dropdown fields
  - In `assets/js/match-utils.js`, append the 24 player field names to the `required` array:
    `'mens_home_p1', 'mens_home_p2', 'mens_away_p1', 'mens_away_p2'` (repeat pattern for `womens`, `mixed_1`–`mixed_4`)
  - _Requirements: 3.3, 4.2_

  - [ ]* 2.1 Write property test — validation rejects any missing player field (Property 3)
    - **Property 3: Validation rejects any missing player field**
    - Extend `validFormArb` with all 24 player fields (each `fc.stringMatching(/^[A-Za-z ]{1,20}$/)`)
    - Extend `requiredFields` array with the same 24 names
    - Blank a random non-empty subset via `fc.subarray(allRequiredFields, { minLength: 1 })` and assert `valid === false` with every blanked field in `missing`
    - Tag: `Feature: match-submission-form-update, Property 3: Validation rejects any missing player field`
    - **Validates: Requirements 3.3, 4.1, 4.2**

- [x] 3. Checkpoint — run `npm test` and ensure all existing and new tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Embed roster data in `pages/submit-match.html` at build time
  - Locate the existing `<script type="application/json" id="season-teams-data">` block
  - Extend the Liquid loop to include a `"roster"` array per team, iterating `team.roster` and emitting each `p.name` as a JSON string
  - Result shape per team: `{ "slug": "...", "name": "...", "roster": ["Amy Tucker", ...] }`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Add 24 player `<select>` elements to the form HTML
  - In `pages/submit-match.html`, for each of the 6 non-Dreambreaker game rows (`mens`, `womens`, `mixed_1`–`mixed_4`), add four `<select>` elements inside the row:
    - `name="{game}_home_p1"`, `name="{game}_home_p2"` (home side)
    - `name="{game}_away_p1"`, `name="{game}_away_p2"` (away side)
  - Each `<select>` starts with `disabled` attribute and a single blank `<option value="">` placeholder
  - Dreambreaker row gets no player selects
  - _Requirements: 3.1, 3.2, 2.4_

- [x] 6. Implement `populatePlayerDropdowns(side, teamSlug, seasonKey)` in `pages/submit-match.html`
  - Add the function to the inline `<script>` in `pages/submit-match.html`
  - It reads `SEASON_TEAMS[seasonKey]`, finds the matching team by slug, then for each of the 6 game prefixes replaces options in `{game}_{side}_p1` and `{game}_{side}_p2` with a blank placeholder + one `<option>` per roster name, then enables the selects
  - If the team has an empty roster, leave the selects disabled
  - _Requirements: 2.1, 2.2, 2.5_

  - [ ]* 6.1 Write property test — player dropdown population reflects roster (Property 1)
    - **Property 1: Player dropdown population reflects roster**
    - Set up a minimal DOM (using `jsdom` or Vitest's built-in `happy-dom` environment) with 12 `<select>` elements per side matching the naming convention
    - Generate arbitrary team data with 0–8 roster players via `fc.array(fc.stringMatching(/^[A-Za-z ]{1,20}$/), { minLength: 0, maxLength: 8 })`
    - After calling `populatePlayerDropdowns`, assert each select's options equal `['', ...rosterNames]` and that selects are enabled iff roster is non-empty
    - Tag: `Feature: match-submission-form-update, Property 1: Player dropdown population reflects roster`
    - **Validates: Requirements 2.1, 2.2, 3.2**

- [x] 7. Wire team-select `change` events to call `populatePlayerDropdowns`
  - In the existing `home-team` and `away-team` `change` event listeners in `pages/submit-match.html`, call `populatePlayerDropdowns('home', homeTeamSlug, seasonKey)` and `populatePlayerDropdowns('away', awayTeamSlug, seasonKey)` respectively
  - _Requirements: 2.1, 2.2_

- [x] 8. Reset player dropdowns on season change
  - In the existing `season-select` `change` event listener, after clearing team dropdowns, iterate all 24 player selects, clear their options to a single blank placeholder, and set `disabled = true`
  - Also hook `form.addEventListener('reset', ...)` to perform the same disable/clear so the form reset after submission leaves player selects in the correct initial state
  - _Requirements: 2.3, 2.4_

  - [ ]* 8.1 Write property test — season change resets all player dropdowns (Property 2)
    - **Property 2: Season change resets all player dropdowns**
    - Pre-populate all 24 selects with arbitrary player names, then simulate a season-change event
    - Assert every select has exactly one option (the blank placeholder), `value === ''`, and `disabled === true`
    - Tag: `Feature: match-submission-form-update, Property 2: Season change resets all player dropdowns`
    - **Validates: Requirements 2.3, 2.4**

- [x] 9. Wire form submission to pass player fields into `serializeMatchYaml`
  - In the form `submit` handler in `pages/submit-match.html`, read the 24 player select values from `FormData` and build the extended match object with `home_players`/`away_players` arrays on each game result before calling `serializeMatchYaml`
  - _Requirements: 5.1, 5.2_

- [x] 10. Final checkpoint — run `npm test` and ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Properties 1 and 2 (DOM-based) require the test environment to have a DOM; check `vitest.config.js` for `environment: 'jsdom'` or `'happy-dom'` and configure if needed
- The existing `matchArb` and `validFormArb` in `tests/match-utils.test.js` are extended in-place — existing Property 1–4 tests from `match-format-update` must continue to pass
- Defensive quoting of player names in `serializeMatchYaml` (task 1) ensures Property 5 holds for names with apostrophes, hyphens, and accented characters
