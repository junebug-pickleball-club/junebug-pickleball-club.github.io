# Requirements Document

## Introduction

Redesign the teams section on the season detail page to display team cards in a horizontally scrollable carousel. Each team card will be updated to include a team logo image. This replaces the current grid/list layout with a more visually engaging presentation that scales well as the number of teams grows.

## Glossary

- **Carousel**: A horizontally scrollable container that displays team cards in a single row, with overflow hidden and scroll behavior enabled.
- **Team_Card**: The `_includes/team-card.html` partial that renders a single team's name, home court, and roster.
- **Team_Logo**: An image associated with a team, stored in `assets/images/teams/` and referenced by the team's `logo` field in the season YAML data file.
- **Season_Page**: The individual season detail page rendered by the `season` layout, located at `/seasons/:slug`.
- **Season_Data**: The YAML file at `_data/seasons/{slug}.yml` that is the source of truth for team data.
- **Carousel_Track**: The inner scrollable element that holds all team cards in a horizontal row.

## Requirements

### Requirement 1: Horizontal Carousel Layout

**User Story:** As a league visitor, I want to browse teams in a horizontal carousel, so that I can quickly scan all teams without excessive vertical scrolling.

#### Acceptance Criteria

1. THE Season_Page SHALL render the teams section as a horizontally scrollable Carousel.
2. WHEN the total width of all Team_Cards exceeds the viewport width, THE Carousel SHALL allow horizontal scrolling to reveal additional cards.
3. WHILE a user scrolls horizontally within the Carousel, THE Carousel_Track SHALL not wrap cards onto a second row.
4. THE Carousel SHALL display all teams from the season's `teams` array in the order they appear in Season_Data.

### Requirement 2: Team Logo Display

**User Story:** As a league visitor, I want to see a team logo on each team card, so that teams are visually distinct and easy to identify.

#### Acceptance Criteria

1. WHEN a team entry in Season_Data includes a `logo` field, THE Team_Card SHALL render the logo image above the team name.
2. IF a team entry in Season_Data does not include a `logo` field, THEN THE Team_Card SHALL render a placeholder in place of the logo image.
3. THE Team_Card SHALL render the logo image with an `alt` attribute set to the team's `name` value.
4. THE Team_Logo image SHALL be sourced from the path specified in the team's `logo` field, resolved relative to the site root.

### Requirement 3: Team Logo Data

**User Story:** As a league admin, I want to specify a team logo in the season data file, so that logos are managed alongside other team data without modifying templates.

#### Acceptance Criteria

1. THE Season_Data SHALL support an optional `logo` field on each team entry containing a relative path string to the logo image asset.
2. THE Season_Data SHALL remain valid and renderable when the `logo` field is absent from one or more team entries.

### Requirement 4: Carousel Navigation

**User Story:** As a league visitor, I want clear visual affordances for the carousel, so that I know more team cards are available beyond the visible area.

#### Acceptance Criteria

1. WHEN the Carousel contains more cards than fit in the visible area, THE Carousel SHALL display a visual indicator (such as a fade or shadow) at the trailing edge to suggest additional content.
2. THE Carousel SHALL support native touch and mouse scroll gestures for horizontal navigation.

### Requirement 5: Responsive Behavior

**User Story:** As a league visitor on a mobile device, I want the carousel to work on small screens, so that I can browse teams on any device.

#### Acceptance Criteria

1. THE Carousel SHALL render correctly at viewport widths of 320px and above.
2. THE Team_Card SHALL have a fixed minimum width so that cards remain legible at all viewport sizes.
3. WHEN viewed on a viewport narrower than the width of a single Team_Card, THE Carousel SHALL still allow horizontal scrolling to reveal the full card.
