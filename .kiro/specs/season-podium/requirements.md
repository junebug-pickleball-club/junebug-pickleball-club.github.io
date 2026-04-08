# Requirements Document

## Introduction

Add a "podium" section to the season detail page that celebrates the top three finishing teams (gold, silver, bronze) for completed seasons. Because the season finale/playoff is seeded by regular-season standings but scored independently, final rankings must be stored in a dedicated data structure rather than derived from the regular-season schedule. The podium section is only shown when a season is marked as finished and finale rankings are present.

## Glossary

- **Season_Page**: The Jekyll page rendered by `_layouts/season.html` for a single season at `/seasons/:slug`.
- **Season_Data**: The YAML file at `_data/seasons/{slug}.yml` that is the source of truth for all season content.
- **Finale_Rankings**: An ordered list of team slugs stored in `Season_Data` under a `finale_rankings` key, representing the final placement of teams after the season finale/playoff. Position 1 = first place, position 2 = second place, position 3 = third place.
- **Podium**: The UI section on the Season_Page that displays the top three medalist teams with their medal tier (gold, silver, bronze).
- **Medalist_Team**: A team that finished in first, second, or third place according to `Finale_Rankings`.
- **Completed_Season**: A season whose `Season_Data` contains a `status: completed` field.
- **Team**: An entry in the `teams` list of `Season_Data`, identified by a `slug` and having optional `name`, `logo`, and `roster` fields.
- **Podium_Include**: The Liquid partial `_includes/season-podium.html` responsible for rendering the Podium section.

## Requirements

### Requirement 1: Finale Rankings Data Structure

**User Story:** As a league administrator, I want to record the final placement of teams after the season finale, so that the site can display accurate podium results independently of regular-season standings.

#### Acceptance Criteria

1. THE Season_Data SHALL support an optional `finale_rankings` key whose value is an ordered list of team slugs, where the first entry represents first place, the second entry represents second place, and the third entry represents third place.
2. THE Season_Data SHALL support a `status` field that accepts the value `completed` to indicate a finished season.
3. WHEN a `finale_rankings` entry references a team slug, THE Season_Data SHALL require that slug to match a slug present in the `teams` list of the same Season_Data file.

### Requirement 2: Podium Section Visibility

**User Story:** As a site visitor, I want the podium section to appear only for completed seasons, so that in-progress seasons do not show incomplete or misleading results.

#### Acceptance Criteria

1. WHEN `Season_Data.status` equals `completed` AND `Season_Data.finale_rankings` contains at least one entry, THE Season_Page SHALL render the Podium section.
2. WHEN `Season_Data.status` does not equal `completed`, THE Season_Page SHALL NOT render the Podium section.
3. WHEN `Season_Data.finale_rankings` is absent or empty, THE Season_Page SHALL NOT render the Podium section, regardless of the value of `Season_Data.status`.

### Requirement 3: Podium Display Content

**User Story:** As a site visitor, I want to see the top three teams displayed with their logo and medal tier, so that I can quickly identify the season champions and runners-up.

#### Acceptance Criteria

1. WHEN the Podium section is rendered, THE Podium_Include SHALL display one podium entry for each team slug present in positions 1, 2, and 3 of `Finale_Rankings`.
2. WHEN a team occupies position 1 in `Finale_Rankings`, THE Podium_Include SHALL label that entry as the gold medal (1st place).
3. WHEN a team occupies position 2 in `Finale_Rankings`, THE Podium_Include SHALL label that entry as the silver medal (2nd place).
4. WHEN a team occupies position 3 in `Finale_Rankings`, THE Podium_Include SHALL label that entry as the bronze medal (3rd place).
5. WHEN rendering a podium entry, THE Podium_Include SHALL display the team's `name` resolved from the `teams` list in Season_Data.
6. WHEN a team in `Finale_Rankings` has a `logo` value in the `teams` list, THE Podium_Include SHALL display that logo image in the podium entry.
7. IF a team in `Finale_Rankings` does not have a `logo` value in the `teams` list, THEN THE Podium_Include SHALL display a placeholder in place of the logo image.

### Requirement 4: Partial Podium Support

**User Story:** As a league administrator, I want to be able to record a partial podium (e.g. only first place is known), so that I can publish results incrementally as the finale concludes.

#### Acceptance Criteria

1. WHEN `Finale_Rankings` contains exactly one entry, THE Podium_Include SHALL render only the gold medal entry.
2. WHEN `Finale_Rankings` contains exactly two entries, THE Podium_Include SHALL render the gold and silver medal entries only.
3. WHEN `Finale_Rankings` contains three or more entries, THE Podium_Include SHALL render gold, silver, and bronze medal entries using only the first three entries.

### Requirement 5: Season Page Section Order

**User Story:** As a site visitor, I want to see the podium at the top of a completed season page, and the schedule before the teams list, so that the most prominent results are immediately visible.

#### Acceptance Criteria

1. WHEN the Podium section is rendered, it SHALL appear at the top of the Season_Page, before all other sections.
2. THE Season_Page SHALL render sections in the following order: podium (when present), standings, schedule, teams.
3. WHEN `Season_Data.status` does not equal `completed`, the Podium section SHALL be hidden and SHALL NOT occupy any space in the page layout.

### Requirement 6: Podium Include Interface

**User Story:** As a developer, I want the podium rendered via a reusable Liquid partial, so that the component stays consistent with the project's include-based architecture.

#### Acceptance Criteria

1. THE Podium_Include SHALL accept a `season` parameter containing the Season_Data object.
2. THE Season_Page SHALL pass the resolved Season_Data object to the Podium_Include via the `season` parameter.
3. THE Podium_Include SHALL NOT access `site.data` directly; all data SHALL be received through the `season` include parameter.
