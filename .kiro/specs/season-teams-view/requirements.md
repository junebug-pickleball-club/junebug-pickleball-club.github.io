# Requirements Document

## Introduction

Teams in the Junebug Pickleball League are redrafted each season, so a global `/teams` page is misleading — it implies teams are permanent. This feature moves team data and the teams view to live under each individual season, removes the top-level Teams nav link and page, and migrates existing team data from `_data/teams.yml` and `_data/data.yml` into the per-season data files under `_data/seasons/`.

## Glossary

- **Season_Page**: A Jekyll collection document in `_seasons/` that renders a season at `/seasons/:slug`
- **Season_Data_File**: A YAML file in `_data/seasons/` (e.g. `spring-2026.yml`) that holds all data for one season
- **Team**: A named group of players drafted for a specific season, identified by a slug (e.g. `servers-of-the-court`)
- **Team_Card**: The reusable `_includes/team-card.html` partial that renders a single team's name, home court, and roster
- **Teams_Section**: The portion of a Season_Page that lists all teams participating in that season
- **Global_Teams_Page**: The current `teams.html` page at `/teams/` that lists all teams regardless of season
- **Nav**: The site-wide navigation rendered by `_includes/header.html`

## Requirements

### Requirement 1: Team data lives under each season

**User Story:** As a league administrator, I want team rosters stored inside each season's data file, so that roster changes between seasons are tracked per season rather than globally.

#### Acceptance Criteria

1. THE Season_Data_File SHALL contain a `teams` key whose value is a list of fully-inlined team objects, each with `slug`, `name`, `home_court`, and `roster` fields embedded directly in the Season_Data_File (not as slug references to a separate file).
2. WHEN a Season_Data_File is loaded, THE Season_Page SHALL resolve team details directly from the inline `teams` list in that Season_Data_File rather than from a separate global teams file.
3. THE `_data/teams.yml` file SHALL be removed once all team data has been migrated into the relevant Season_Data_File entries.
4. THE `teams` key in `_data/data.yml` SHALL be removed once all team data has been migrated into the relevant Season_Data_File entries.

---

### Requirement 2: Teams are displayed on the season page

**User Story:** As a league member, I want to see the teams for a specific season when I visit that season's page, so that I know which teams competed in that season.

#### Acceptance Criteria

1. WHEN a visitor navigates to a Season_Page, THE Season_Page SHALL display a Teams_Section listing all teams in that season.
2. THE Teams_Section SHALL appear above the standings section on the Season_Page.
3. THE Teams_Section SHALL render each team using the Team_Card partial, showing the team name, home court, and roster.
4. WHEN a season has no teams defined in its Season_Data_File, THE Season_Page SHALL display a message indicating no teams have been announced yet.

---

### Requirement 3: Global Teams page is removed

**User Story:** As a site visitor, I want the navigation to reflect the current site structure, so that I am not directed to a stale or misleading page.

#### Acceptance Criteria

1. THE Nav SHALL NOT contain a link to `/teams/`.
2. THE Global_Teams_Page (`teams.html`) SHALL be removed from the site source.
3. WHEN a visitor navigates to `/teams/`, THE site SHALL return a 404 response.

---

### Requirement 5: Submit match form team dropdowns are season-aware

**User Story:** As a league member submitting a match result, I want the Home Team and Away Team dropdowns to show only the teams from the selected season, so that I cannot accidentally select a team that did not compete in that season.

#### Acceptance Criteria

1. WHEN a season is selected in the submit-match form THEN the system SHALL populate the Home Team and Away Team dropdowns with only the teams from that season's data.
2. WHEN no season has been selected THEN the system SHALL render the Home Team and Away Team dropdowns in a disabled state with no selectable team options.
3. WHEN the selected season changes THEN the system SHALL clear any previously selected team values from both dropdowns and repopulate them with the teams for the newly selected season.

---

### Requirement 4: Existing team data is migrated to Spring 2026

**User Story:** As a league administrator, I want the existing team data for the current season to be preserved and accessible under the Spring 2026 season, so that no roster information is lost during the migration.

#### Acceptance Criteria

1. THE `_data/seasons/spring-2026.yml` Season_Data_File SHALL contain full inline team objects for all teams previously listed in `_data/teams.yml`, with each team's `slug`, `name`, `home_court`, and `roster` embedded directly in the file.
2. WHEN the Spring 2026 Season_Page is rendered, THE Teams_Section SHALL display the same team names and rosters that were previously shown on the Global_Teams_Page.
3. THE season schedule entries SHALL continue to reference teams by slug only (e.g. `home_team: servers-of-the-court`), and THE Season_Page SHALL resolve those slugs to the corresponding inline team objects in the `teams` list at render time.
