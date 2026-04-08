# Requirements Document

## Introduction

The match submission form at `/submit-match/` currently collects scores but does not capture which players participated in each game. The season data structure in `_data/seasons/{slug}.yml` already includes a `roster` array per team (each entry has a `name` and `role`). This feature updates the form to add player-name dropdowns for each game type, dynamically populated from the selected team's roster, and updates the YAML serializer to include `home_players` and `away_players` arrays in the submitted result.

## Glossary

- **Form**: The HTML match submission form at `/submit-match/`.
- **Season_Data**: The JSON object embedded at build time from `_data/seasons/{slug}.yml`, keyed by season slug.
- **Team_Roster**: The list of player objects (`name`, `role`) under a team's `roster` key in Season_Data.
- **Player_Dropdown**: A `<select>` element populated with player names from a Team_Roster.
- **Game_Row**: A single score row in the form representing one game (e.g. Men's Doubles, Mixed Doubles 1).
- **YAML_Serializer**: The `serializeMatchYaml` JavaScript function that converts form data into a YAML schedule entry string.
- **Season_Teams_Data**: The `<script type="application/json">` block embedded by Liquid at build time, containing team slugs, names, and rosters keyed by season slug.

## Requirements

### Requirement 1: Embed Roster Data at Build Time

**User Story:** As a form submitter, I want player names to be available for selection, so that I can record who played in each game without manually typing names.

#### Acceptance Criteria

1. THE Season_Teams_Data SHALL include each team's `roster` array (player `name` values) alongside the existing `slug` and `name` fields.
2. WHEN Jekyll builds the site, THE Season_Teams_Data SHALL be generated from `_data/seasons/{slug}.yml` for every season in `site.seasons`.
3. IF a team has no roster entries, THEN THE Season_Teams_Data SHALL represent that team's roster as an empty array.

---

### Requirement 2: Populate Player Dropdowns on Team Selection

**User Story:** As a form submitter, I want the player dropdowns to update automatically when I choose a team, so that I only see players from the correct roster.

#### Acceptance Criteria

1. WHEN a home team is selected, THE Form SHALL populate all home-side Player_Dropdowns with the names from that team's Team_Roster.
2. WHEN an away team is selected, THE Form SHALL populate all away-side Player_Dropdowns with the names from that team's Team_Roster.
3. WHEN a season is changed, THE Form SHALL reset all Player_Dropdowns to their empty placeholder state and disable them until a team is selected.
4. WHILE no team is selected for a side, THE Form SHALL keep that side's Player_Dropdowns disabled.
5. IF a selected team has an empty roster, THEN THE Form SHALL keep that team's Player_Dropdowns disabled.

---

### Requirement 3: Player Selection Fields per Game

**User Story:** As a form submitter, I want to select two players per side for each game, so that the submitted result accurately reflects who played.

#### Acceptance Criteria

1. THE Form SHALL display two home-side Player_Dropdowns and two away-side Player_Dropdowns for each Game_Row (Men's Doubles, Women's Doubles, Mixed Doubles 1–4).
2. WHEN a Player_Dropdown is rendered, THE Form SHALL include a blank placeholder option as the first option (value `""`).
3. THE Form SHALL treat all player dropdowns for non-Dreambreaker Game_Rows as required fields.

---

### Requirement 4: Form Validation Includes Player Fields

**User Story:** As a form submitter, I want the form to prevent submission when required player fields are empty, so that incomplete match records are not submitted.

#### Acceptance Criteria

1. WHEN the form is submitted with one or more required Player_Dropdown values empty, THE Form SHALL prevent submission and display an error message.
2. THE `validateForm` function SHALL include all required player dropdown field names in its required fields list.

---

### Requirement 5: YAML Serializer Includes Player Arrays

**User Story:** As a league admin, I want submitted match results to include player names in the YAML output, so that the season data file matches the established data structure.

#### Acceptance Criteria

1. WHEN a match is serialized, THE YAML_Serializer SHALL include a `home_players` array and an `away_players` array under each game key (e.g. `mens_doubles`, `mixed_doubles_1`).
2. WHEN a match is serialized, THE YAML_Serializer SHALL format each `home_players` and `away_players` value as an inline YAML sequence (e.g. `[Player One, Player Two]`).
3. IF a Dreambreaker result is absent, THEN THE YAML_Serializer SHALL omit the Dreambreaker block entirely, consistent with current behavior.

---

### Requirement 6: Round-Trip Data Integrity

**User Story:** As a developer, I want the serialized YAML to be parseable back into an equivalent structure, so that the submitted data can be reliably read by Jekyll.

#### Acceptance Criteria

1. FOR ALL valid match form submissions, THE YAML_Serializer SHALL produce output that, when appended to the season file and parsed by a YAML parser, yields a schedule entry equivalent to the original form input.
2. THE YAML_Serializer SHALL not introduce characters in player name values that would break YAML inline sequence syntax.
