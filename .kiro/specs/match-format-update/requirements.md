# Requirements Document

## Introduction

The Junebug Pickleball League is updating its match format to reflect the full MLP-style structure. Previously, each match included one Mixed Doubles game; the new format expands this to four separate Mixed Doubles games (mixed_doubles_1 through mixed_doubles_4), making the required game count six (Men's Doubles, Women's Doubles, and four Mixed Doubles). The Dreambreaker tiebreaker remains but becomes explicitly optional — it is only recorded when actually played.

This update touches the season data schema, the match submission form, the schedule and standings UI templates, the JavaScript utility functions, and the property-based test suite.

## Glossary

- **Match**: A head-to-head competition between two teams consisting of six required games and one optional tiebreaker
- **Game**: A single discipline within a match (Men's Doubles, Women's Doubles, Mixed Doubles 1–4, or Dreambreaker)
- **Mixed_Doubles_Game**: One of four Mixed Doubles games played per match, identified as mixed_doubles_1, mixed_doubles_2, mixed_doubles_3, or mixed_doubles_4
- **Dreambreaker**: An optional singles tiebreaker game; only present in a match result when it was actually played
- **Match_Result**: The YAML object under a schedule entry's `result` key containing scores for all played games
- **Match_Submission_Form**: The web form at `/submit-match` used to submit match results via GitHub PR
- **Standings**: A ranked table of teams by match win/loss record within a season, with game wins as tiebreaker
- **Season_Data_File**: A YAML file in `_data/seasons/` describing a season's teams and schedule
- **Match_Utils**: The pure JavaScript module at `assets/js/match-utils.js` containing `validateForm`, `serializeMatchYaml`, `computeStandings`, and `partitionEvents`

---

## Requirements

### Requirement 1: Updated Match Result Schema

**User Story:** As a league administrator, I want the match result data format to include four Mixed Doubles games and an optional Dreambreaker, so that the data accurately reflects the new match format.

#### Acceptance Criteria

1. THE Season_Data_File SHALL represent Mixed Doubles results as four separate keys: `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, and `mixed_doubles_4`, each containing `home` and `away` score fields
2. THE Season_Data_File SHALL represent the Dreambreaker as an optional key `dreambreaker` under `result`; the key SHALL be omitted entirely when the Dreambreaker was not played
3. WHEN a Match_Result is present, THE Season_Data_File SHALL include scores for `mens_doubles`, `womens_doubles`, `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, and `mixed_doubles_4`
4. THE Season_Data_File SHALL NOT include a `mixed_doubles` key in any match result (the singular form is replaced by the four numbered keys)
5. FOR ALL existing match entries in `_data/seasons/spring-2026.yml`, THE Season_Data_File SHALL be migrated to use `mixed_doubles_1` through `mixed_doubles_4` in place of the former `mixed_doubles` key

---

### Requirement 2: Updated Match Submission Form

**User Story:** As a team captain, I want the match submission form to include score fields for all four Mixed Doubles games and treat the Dreambreaker as optional, so that I can accurately record the new match format.

#### Acceptance Criteria

1. THE Match_Submission_Form SHALL include four score rows for Mixed Doubles, labeled "Mixed Doubles 1", "Mixed Doubles 2", "Mixed Doubles 3", and "Mixed Doubles 4", each with a home score input and an away score input
2. THE Match_Submission_Form SHALL include score inputs for the Dreambreaker that are NOT required fields; the form SHALL submit successfully when Dreambreaker score inputs are left empty
3. THE Match_Submission_Form SHALL use input names `mixed_1_home`, `mixed_1_away`, `mixed_2_home`, `mixed_2_away`, `mixed_3_home`, `mixed_3_away`, `mixed_4_home`, `mixed_4_away` for the four Mixed Doubles score fields
4. THE Match_Submission_Form SHALL use input names `dream_home` and `dream_away` for the optional Dreambreaker score fields
5. WHEN a visitor submits the form with all six required game score fields completed and Dreambreaker fields empty, THE Match_Submission_Form SHALL proceed with submission without a validation error
6. IF a visitor submits the form with one or more of the six required game score fields empty, THEN THE Match_Submission_Form SHALL display a validation error identifying the missing fields

---

### Requirement 3: Updated Form Validation Logic

**User Story:** As a team captain, I want the form validation to enforce the new required fields and treat Dreambreaker as optional, so that I am not blocked from submitting a valid result.

#### Acceptance Criteria

1. THE Match_Utils `validateForm` function SHALL treat `mixed_1_home`, `mixed_1_away`, `mixed_2_home`, `mixed_2_away`, `mixed_3_home`, `mixed_3_away`, `mixed_4_home`, and `mixed_4_away` as required fields
2. THE Match_Utils `validateForm` function SHALL NOT treat `dream_home` or `dream_away` as required fields
3. WHEN `validateForm` is called with all required fields populated and Dreambreaker fields absent or empty, THE Match_Utils SHALL return `{ valid: true, missing: [] }`
4. WHEN `validateForm` is called with one or more required fields empty, THE Match_Utils SHALL return `{ valid: false, missing: [...] }` where `missing` contains every empty required field name
5. THE Match_Utils `validateForm` function SHALL NOT include `mixed_home` or `mixed_away` in the required fields list (the singular Mixed Doubles fields are replaced by the four numbered variants)

---

### Requirement 4: Updated YAML Serialization

**User Story:** As a team captain, I want submitted match results to be serialized in the new YAML format, so that the generated Pull Request contains correctly structured data.

#### Acceptance Criteria

1. THE Match_Utils `serializeMatchYaml` function SHALL output `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, and `mixed_doubles_4` keys under `result`, each with `home` and `away` sub-keys
2. THE Match_Utils `serializeMatchYaml` function SHALL NOT output a `mixed_doubles` key (the singular form)
3. WHEN the match object passed to `serializeMatchYaml` includes a `dreambreaker` result, THE Match_Utils SHALL include the `dreambreaker` key with `home` and `away` sub-keys in the serialized YAML
4. WHEN the match object passed to `serializeMatchYaml` does not include a `dreambreaker` result (the field is absent or null), THE Match_Utils SHALL omit the `dreambreaker` key from the serialized YAML entirely
5. FOR ALL valid match objects with the new schema, parsing the YAML string produced by `serializeMatchYaml` SHALL yield an object with equivalent field values (round-trip property)

---

### Requirement 5: Updated Standings Computation

**User Story:** As a league participant, I want the standings to correctly reflect wins and game totals across all four Mixed Doubles games, so that the rankings are accurate.

#### Acceptance Criteria

1. THE Match_Utils `computeStandings` function SHALL count each of `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, and `mixed_doubles_4` as individual games when determining game wins and match outcomes
2. THE Match_Utils `computeStandings` function SHALL NOT reference `mixed_doubles` (the singular key) when computing standings
3. WHEN a match result includes a `dreambreaker`, THE Match_Utils `computeStandings` function SHALL include it in the game win count
4. WHEN a match result does not include a `dreambreaker`, THE Match_Utils `computeStandings` function SHALL compute standings using only the six required games
5. THE Match_Utils `computeStandings` function SHALL rank teams such that team A appears before team B if and only if A has strictly more match wins than B, or A and B have equal match wins and A has at least as many total game wins as B

---

### Requirement 6: Updated Schedule Display

**User Story:** As a league participant, I want the season schedule to display scores for all four Mixed Doubles games and handle the optional Dreambreaker gracefully, so that I can see the full match breakdown.

#### Acceptance Criteria

1. THE `_includes/match-row.html` partial SHALL render four separate score columns for `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, and `mixed_doubles_4` when a match result is present
2. WHEN a match result includes a `dreambreaker`, THE `_includes/match-row.html` partial SHALL render the Dreambreaker score column
3. WHEN a match result does not include a `dreambreaker`, THE `_includes/match-row.html` partial SHALL render an em dash (—) or "N/A" in the Dreambreaker column rather than leaving it blank or erroring
4. THE `_includes/match-row.html` partial SHALL NOT reference `result.mixed_doubles` (the singular key)

---

### Requirement 7: Updated Standings Table Template

**User Story:** As a league participant, I want the standings table to count all four Mixed Doubles games when computing team records, so that the standings reflect the full match format.

#### Acceptance Criteria

1. THE `_includes/standings-table.html` partial SHALL iterate over `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, and `mixed_doubles_4` when computing game wins and match outcomes for each team
2. THE `_includes/standings-table.html` partial SHALL NOT reference `result.mixed_doubles` (the singular key)
3. WHEN a match result includes a `dreambreaker`, THE `_includes/standings-table.html` partial SHALL include it in the game win and match outcome computation
4. WHEN a match result does not include a `dreambreaker`, THE `_includes/standings-table.html` partial SHALL compute standings using only the six required games without error

---

### Requirement 8: Updated Property-Based Tests

**User Story:** As a developer, I want the property-based test suite to cover the new match format, so that regressions in the updated logic are caught automatically.

#### Acceptance Criteria

1. THE `tests/match-utils.test.js` file SHALL define a `matchResultArb` arbitrary that generates results with `mixed_doubles_1`, `mixed_doubles_2`, `mixed_doubles_3`, `mixed_doubles_4`, and an optional `dreambreaker`
2. THE `tests/match-utils.test.js` file SHALL define a `validFormArb` arbitrary that includes `mixed_1_home`, `mixed_1_away`, `mixed_2_home`, `mixed_2_away`, `mixed_3_home`, `mixed_3_away`, `mixed_4_home`, `mixed_4_away` fields and does NOT include `mixed_home` or `mixed_away`
3. THE `tests/match-utils.test.js` file SHALL define a `requiredFields` list that includes the eight new Mixed Doubles score field names and excludes `dream_home` and `dream_away`
4. THE `tests/match-utils.test.js` Property 9 (YAML round-trip) SHALL verify round-trip fidelity for all four `mixed_doubles_N` keys and for the optional `dreambreaker` key when present
5. THE `tests/match-utils.test.js` Property 4 (standings comparator invariant) SHALL use the updated `matchResultArb` so that standings are computed over the new six-game format
