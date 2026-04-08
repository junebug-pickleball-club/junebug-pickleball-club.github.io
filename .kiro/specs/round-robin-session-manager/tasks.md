# Implementation Plan: Round-Robin Session Manager

## Overview

Implement the round-robin session manager as a pure logic module (`assets/js/session-manager.js`) and a Jekyll page shell with inline controller (`pages/session-manager.html`), plus a Vitest + fast-check test suite (`tests/session-manager.test.js`). Each task builds incrementally toward a fully wired, sessionStorage-backed SPA.

## Tasks

- [x] 1. Create the pure logic module scaffold
  - Create `assets/js/session-manager.js` with all eight exported function stubs: `validateConfig`, `resolvePlayerNames`, `generateSchedule`, `validateScores`, `recordRoundScores`, `computeLeaderboard`, `serializeState`, `deserializeState`
  - Each stub should throw `Error('not implemented')` so tests fail clearly before implementation
  - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.1_

- [x] 2. Implement `validateConfig` and `resolvePlayerNames`
  - [x] 2.1 Implement `validateConfig`
    - Validate playerCount ∈ [2,32], courtCount ∈ [1,16], roundCount ∈ [1,64], format ∈ ['single','double']
    - Return `{ valid, errors }` where errors is an array of `{ field, message }`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [x] 2.2 Write property test for `validateConfig` (Property 1)
    - **Property 1: Config validation accepts exactly the valid range**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  - [x] 2.3 Implement `resolvePlayerNames`
    - Replace empty/whitespace-only entries with "Player N" (1-based); preserve non-empty entries unchanged
    - _Requirements: 1.8_
  - [x] 2.4 Write property test for `resolvePlayerNames` (Property 2)
    - **Property 2: Player name resolution substitutes empty slots**
    - **Validates: Requirements 1.8**

- [x] 3. Implement `generateSchedule`
  - [x] 3.1 Implement circle-method schedule generation
    - Fix player 0, rotate the rest each round to produce single round-robin pairings
    - For odd player counts, the "ghost" player position becomes the bye slot
    - For double round-robin, run the rotation twice
    - Truncate or extend to exactly `config.roundCount` rounds
    - Assign pairs to courts 1–N; excess pairs beyond `courtCount` are deferred or given byes
    - Attach `matchId` strings in the format `r{round}-c{court}`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.2 Write property test for schedule round count (Property 3)
    - **Property 3: Schedule has exactly the configured number of rounds**
    - **Validates: Requirements 2.1**
  - [x] 3.3 Write property test for pair frequency invariant (Property 4)
    - **Property 4: Round-robin pair frequency invariant**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 3.4 Write property test for bye distribution fairness (Property 5)
    - **Property 5: Bye distribution fairness for odd player counts**
    - **Validates: Requirements 2.4**
  - [x] 3.5 Write property test for court count invariant (Property 6)
    - **Property 6: Court count invariant**
    - **Validates: Requirements 2.5, 2.7**

- [x] 4. Checkpoint — Ensure all schedule-related tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `validateScores`, `recordRoundScores`, and `computeLeaderboard`
  - [x] 5.1 Implement `validateScores`
    - Accept scores as non-negative integers (string input); reject negative values and non-numeric strings
    - Return `{ valid, errors }` where errors is an array of `{ matchId, field, message }`
    - _Requirements: 4.2, 4.3_
  - [x] 5.2 Write property test for `validateScores` (Property 7)
    - **Property 7: Score validation accepts non-negative integers only**
    - **Validates: Requirements 4.2**
  - [x] 5.3 Implement `recordRoundScores`
    - Write scores into the matching `Match` objects in `state.schedule[currentRound-1]`
    - If `currentRound < schedule.length`, increment `currentRound`; otherwise set `status` to `'complete'`
    - Return a new `SessionState` object (do not mutate input)
    - _Requirements: 4.4, 4.5, 4.6, 4.7_
  - [x] 5.4 Write property test for score re-submission overwrites (Property 8)
    - **Property 8: Score re-submission overwrites previous scores**
    - **Validates: Requirements 4.7**
  - [x] 5.5 Write property test for round advancement (Property 9)
    - **Property 9: Round advancement on non-final score submission**
    - **Validates: Requirements 4.5**
  - [x] 5.6 Implement `computeLeaderboard`
    - Iterate all completed rounds in `state.schedule`, accumulate wins/losses/pointsScored/pointsConceded per player
    - Sort by wins desc → pointDiff desc → pointsScored desc
    - Return `LeaderboardEntry[]` with rank, name, wins, losses, pointDiff, pointsScored
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [x] 5.7 Write property test for leaderboard sort order (Property 10)
    - **Property 10: Leaderboard sort order invariant**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Implement `serializeState` and `deserializeState`
  - [x] 6.1 Implement `serializeState` and `deserializeState`
    - `serializeState` returns `JSON.stringify(state)`
    - `deserializeState` returns `JSON.parse(json)` and throws on malformed input
    - _Requirements: 6.1, 6.2_
  - [x] 6.2 Write property test for serialization round-trip (Property 11)
    - **Property 11: Session state serialization round-trip**
    - **Validates: Requirements 6.1, 6.2**

- [x] 7. Checkpoint — Ensure all logic module tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create the Jekyll page shell (`pages/session-manager.html`)
  - Add Jekyll front matter: `layout: page`, `title: Session Manager`, `permalink: /session-manager/`
  - Add three `<section>` elements with ids `view-config`, `view-session`, `view-complete`; only one visible at a time via inline CSS `display` toggling
  - Config view: form with fields for playerCount, courtCount, roundCount, format select, and a dynamically rendered player name inputs area
  - Session view: round header (`Round X of Y`), court assignment cards, "Sitting Out" section, score submission form, live leaderboard table, and "Reset Session" button
  - Complete view: "Session Complete" banner, final leaderboard, session summary (total rounds + total matches), and "Start New Session" button
  - Apply inline styles scoped to the page consistent with the solarized-dark Minima theme
  - _Requirements: 1.1, 1.7, 3.1, 3.2, 3.3, 4.1, 5.5, 5.6, 7.1, 7.2, 7.3, 7.4_

- [x] 9. Implement the inline page controller script
  - [x] 9.1 Wire config form submission
    - On submit: call `validateConfig`, render inline errors if invalid; if valid, call `resolvePlayerNames` + `generateSchedule`, save to `sessionStorage` under `jpl_session_manager`, transition to session view
    - Dynamically render player name inputs when playerCount changes
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1_
  - [x] 9.2 Implement session view rendering
    - Render current round's court cards and "Sitting Out" section from `state.schedule[state.currentRound-1]`
    - Render score submission form with one row per match
    - Render leaderboard table from `computeLeaderboard(state)`, visually distinguishing the top-ranked player(s)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 5.1, 5.5, 5.6_
  - [x] 9.3 Wire score form submission
    - On submit: call `validateScores`, render inline errors if invalid; if valid, call `recordRoundScores`, update leaderboard, persist to `sessionStorage`, advance view (next round or complete view)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 9.4 Implement session persistence and restore on page load
    - On page load: read `jpl_session_manager` from `sessionStorage`; if present, call `deserializeState` and route to session or complete view based on `state.status`; if `deserializeState` throws, clear the key and show config view
    - If `sessionStorage` is unavailable, run in-memory only and show a non-blocking warning
    - _Requirements: 6.1, 6.2_
  - [x] 9.5 Implement Reset Session and Start New Session
    - "Reset Session": call `window.confirm` with warning text; if confirmed, clear `sessionStorage` key and return to config view with default field values; if cancelled, do nothing
    - "Start New Session": clear `sessionStorage` key and return to config view
    - _Requirements: 6.3, 6.4, 6.5, 7.3_
  - [x] 9.6 Write property test for session summary accuracy (Property 12)
    - **Property 12: Session summary accuracy**
    - **Validates: Requirements 7.4**

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fc.assert(..., { numRuns: 100 })` matching the existing `tests/match-utils.test.js` pattern
- The logic module (`assets/js/session-manager.js`) must be importable without a DOM — no `window` or `document` references
- The page controller (inline script in `pages/session-manager.html`) is the only layer that touches the DOM and `sessionStorage`
