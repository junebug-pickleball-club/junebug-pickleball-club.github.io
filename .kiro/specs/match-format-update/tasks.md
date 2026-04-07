# Implementation Plan: Match Format Update

## Overview

Migrate the match format from one Mixed Doubles game + required Dreambreaker to four Mixed Doubles games + optional Dreambreaker. Changes span the YAML data schema, JavaScript utilities, the submission form, Liquid templates, and the property-based test suite.

## Tasks

- [x] 1. Migrate season data schema
  - Update `_data/seasons/spring-2026.yml` week-1 result: replace `mixed_doubles` with `mixed_doubles_1` through `mixed_doubles_4`; assign the original score to `mixed_doubles_1` and confirm scores for 2–4 with the league administrator (use the same score as a placeholder if unconfirmed)
  - Verify no `mixed_doubles` singular key remains in the file
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Update `validateForm` and `serializeMatchYaml` in `assets/js/match-utils.js`
  - [x] 2.1 Update `validateForm` required fields list
    - Replace `mixed_home`, `mixed_away` with `mixed_1_home`, `mixed_1_away`, `mixed_2_home`, `mixed_2_away`, `mixed_3_home`, `mixed_3_away`, `mixed_4_home`, `mixed_4_away`
    - Remove `dream_home` and `dream_away` from the required list
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 2.2 Update `serializeMatchYaml` to emit four mixed doubles keys and conditional dreambreaker
    - Replace the single `mixed_doubles` lines with four `mixed_doubles_1`–`mixed_doubles_4` lines
    - Wrap the `dreambreaker` block in `if (match.result.dreambreaker != null)` guard
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Update `computeStandings` in `assets/js/match-utils.js`
  - Replace `'mixed_doubles'` in the games array with `'mixed_doubles_1'`, `'mixed_doubles_2'`, `'mixed_doubles_3'`, `'mixed_doubles_4'`
  - Confirm the existing `if (!g) continue` guard handles the optional dreambreaker — no additional change needed
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Update the match submission form in `submit-match.html`
  - [x] 4.1 Replace the single Mixed Doubles score row with four rows labeled "Mixed Doubles 1"–"Mixed Doubles 4"
    - Use input names `mixed_1_home`, `mixed_1_away`, `mixed_2_home`, `mixed_2_away`, `mixed_3_home`, `mixed_3_away`, `mixed_4_home`, `mixed_4_away`
    - _Requirements: 2.1, 2.3_

  - [x] 4.2 Make Dreambreaker inputs optional in the form
    - Remove `required` attribute from `dream_home` and `dream_away` inputs
    - Update the inline `validateForm` copy inside the `<script>` block to match the updated required fields list from task 2.1
    - Update the inline `serializeMatchYaml` copy to match the updated serialization from task 2.2
    - Update `submitMatchResult` to pass `null` for dreambreaker when those inputs are empty
    - _Requirements: 2.2, 2.4, 2.5, 2.6_

- [x] 5. Update `_includes/match-row.html`
  - Replace the single `mixed_doubles` `<td>` with four `<td>` cells for `mixed_doubles_1`–`mixed_doubles_4`
  - Wrap the dreambreaker `<td>` in `{% if match.result.dreambreaker %}` / `{% else %}<td>—</td>{% endif %}`
  - Update the scheduled fallback `colspan` from 4 to 7
  - Remove any reference to `result.mixed_doubles` (singular)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Update `_includes/standings-table.html`
  - In both the sort-key loop and the table-body rendering loop, replace the `mixed_doubles` block with four identical blocks for `mixed_doubles_1` through `mixed_doubles_4`
  - Confirm the existing `{% if match.result.dreambreaker %}` guards are in place; no structural change needed for dreambreaker
  - Remove any reference to `result.mixed_doubles` (singular)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Checkpoint — verify templates and data are consistent
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update property-based test suite in `tests/match-utils.test.js`
  - [x] 8.1 Update `matchResultArb` to generate the new schema
    - Include `mixed_doubles_1`–`mixed_doubles_4` as required fields and `dreambreaker` as optional (using `fc.option`)
    - _Requirements: 8.1_

  - [x] 8.2 Update `validFormArb` to use the new field names
    - Replace `mixed_home`/`mixed_away` with `mixed_1_home`/`mixed_1_away` through `mixed_4_home`/`mixed_4_away`
    - Remove `dream_home` and `dream_away` from the record
    - _Requirements: 8.2_

  - [x] 8.3 Update `requiredFields` constant
    - Include the eight new mixed doubles field names; exclude `dream_home` and `dream_away`
    - _Requirements: 8.3_

  - [x] 8.4 Write property test for Property 1: Form validation detects all missing required fields
    - **Property 1: Form validation detects all missing required fields**
    - **Validates: Requirements 3.1, 3.4, 2.6**

  - [x] 8.5 Write property test for Property 2: Form validation accepts complete form without Dreambreaker
    - **Property 2: Form validation accepts complete form without Dreambreaker**
    - **Validates: Requirements 3.2, 3.3, 2.5**

  - [x] 8.6 Update Property 9 (YAML round-trip) to cover new schema
    - Verify `mixed_doubles_1`–`mixed_doubles_4` round-trip correctly
    - Verify `dreambreaker` is present in parsed output when input had it, and absent when it did not
    - **Property 3: YAML serialization round-trip preserves all match fields**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [x] 8.7 Update Property 4 (standings comparator invariant) to use updated `matchResultArb`
    - Ensures standings are computed over the new six-game format with optional dreambreaker
    - **Property 4: Standings ranking satisfies the comparator invariant**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The inline JS copies of `validateForm` and `serializeMatchYaml` in `submit-match.html` must be kept in sync with `assets/js/match-utils.js`
- The `_site/` directory is build output — do not edit files there directly
- Existing `if (!g) continue` guards in `computeStandings` and `{% if match.result.dreambreaker %}` guards in Liquid already handle the optional dreambreaker pattern
