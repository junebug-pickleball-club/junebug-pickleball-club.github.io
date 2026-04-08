# Requirements Document

## Introduction

The Junebug Pickleball Club website is a Jekyll-based static site hosted on GitHub Pages. It serves as the central hub for the club's MLP-style pickleball league, providing a modern dark-themed UI for members and visitors to view teams, browse multi-season league standings and schedules, submit match results, and stay up to date with events and blog posts.

MLP (Major League Pickleball) format uses team-based competition where each match consists of multiple game types: Men's Doubles, Women's Doubles, Mixed Doubles, and a Singles Dreambreaker tiebreaker. Teams accumulate points across a season to determine standings.

## Glossary

- **Site**: The Jekyll + GitHub Pages pickleball club website
- **League**: A season of MLP-style team pickleball competition
- **Season**: A named period of league play (e.g., "Spring 2025") containing scheduled matches
- **Match**: A head-to-head competition between two teams consisting of multiple games
- **Game**: A single discipline within a match (Men's Doubles, Women's Doubles, Mixed Doubles, or Dreambreaker)
- **Dreambreaker**: A singles tiebreaker game used in MLP format to decide tied matches
- **Team**: A named group of players competing together in a season
- **Player**: An individual club member belonging to a team
- **Match_Submission_Form**: The web form used to submit match results
- **Standings**: A ranked table of teams by win/loss record within a season
- **Event**: A scheduled club activity (tournament, social, clinic, etc.)
- **Blog_Post**: A written article published on the site
- **Dark_Theme**: The site-wide visual style using dark backgrounds with high-contrast accents
- **Active_Season**: The single season currently in progress, designated in site configuration, whose data file receives new match results
- **GitHub_PR**: A GitHub Pull Request opened against the site repository to propose changes to a data file

---

## Requirements

### Requirement 1: Dark Theme UI

**User Story:** As a site visitor, I want a modern sleek dark-themed interface, so that the site feels professional and visually appealing.

#### Acceptance Criteria

1. THE Site SHALL apply a dark background color (no lighter than `#1a1a2e`) across all pages
2. THE Site SHALL use high-contrast text (minimum 4.5:1 contrast ratio against the background) for all body content
3. THE Site SHALL use a consistent accent color for interactive elements such as links, buttons, and active navigation items
4. THE Site SHALL render a responsive navigation bar on all pages containing links to Teams, Seasons, Events, Blog, and Match Submission pages
5. WHEN a visitor views the site on a viewport narrower than 768px, THE Site SHALL collapse the navigation into a mobile-friendly menu
6. THE Site SHALL use a consistent typographic scale with a sans-serif font for headings and body text

---

### Requirement 2: Teams Page

**User Story:** As a club member, I want to view all registered teams and their rosters, so that I can see who is on each team.

#### Acceptance Criteria

1. THE Site SHALL render a `/teams` page listing all teams defined in the `_data` directory
2. WHEN the Teams page loads, THE Site SHALL display each team's name, home court, and roster
3. THE Site SHALL identify each player's role (captain or member) within their team roster
4. WHEN a team has no players defined, THE Site SHALL display a placeholder message indicating the roster is pending
5. THE Site SHALL render team cards using the Dark_Theme styling consistent with the rest of the site

---

### Requirement 3: Multi-Season League Pages

**User Story:** As a league participant, I want to browse multiple seasons of league history, so that I can review past and current standings and schedules.

#### Acceptance Criteria

1. THE Site SHALL render a `/seasons` index page listing all available seasons in reverse chronological order
2. WHEN a visitor selects a season, THE Site SHALL navigate to a season detail page at `/seasons/{season-slug}`
3. THE Season detail page SHALL display the season name, date range, participating teams, match schedule, and Standings table
4. THE Standings table SHALL rank teams by total match wins, with ties broken by total game wins
5. THE Season detail page SHALL display each scheduled Match with home team, away team, week number, location, and final score
6. WHEN a Match has been played, THE Site SHALL display the per-game scores for Men's Doubles, Women's Doubles, Mixed Doubles, and Dreambreaker
7. WHEN a Match has not yet been played, THE Site SHALL display the match as "Scheduled" with no score
8. THE Site SHALL support adding new seasons by creating a new data file in `_data/seasons/` without requiring code changes
9. THE Site SHALL designate exactly one season as the active season, accessible via a direct navigation link to `/seasons/{active-season-slug}` from the primary navigation

---

### Requirement 4: Match Submission Form

**User Story:** As a team captain, I want to submit match results through a web form, so that scores are recorded without requiring direct file edits.

#### Acceptance Criteria

1. THE Site SHALL render a `/submit-match` page containing the Match_Submission_Form
2. THE Match_Submission_Form SHALL include fields for: home team, away team, season, week number, match date, location, and per-game scores for Men's Doubles, Women's Doubles, Mixed Doubles, and Dreambreaker
3. THE Match_Submission_Form SHALL include a score field for each game consisting of two numeric inputs (home score and away score)
4. WHEN a visitor submits the form with all required fields completed, THE Match_Submission_Form SHALL open a GitHub Pull Request that appends the submitted match result to the active season's data file in `_data/seasons/`
5. IF a visitor submits the form with one or more required fields empty, THEN THE Match_Submission_Form SHALL display a validation error identifying the missing fields before submission
6. WHEN the GitHub Pull Request is successfully opened, THE Site SHALL display a confirmation message to the submitter including a link to the opened Pull Request
7. IF the GitHub Pull Request cannot be opened (e.g., due to an API error or missing authentication), THEN THE Match_Submission_Form SHALL display an error message describing the failure
8. THE Match_Submission_Form SHALL apply Dark_Theme styling consistent with the rest of the site

---

### Requirement 5: Events Page

**User Story:** As a club member, I want to view upcoming and past club events, so that I can plan my participation.

#### Acceptance Criteria

1. THE Site SHALL render an `/events` page listing all events defined in `_data/events.yml`
2. THE Events page SHALL display each event's name, date, location, and description
3. THE Events page SHALL separate upcoming events (date on or after the current date) from past events in two distinct sections
4. WHEN no upcoming events are defined, THE Site SHALL display a message indicating no upcoming events are scheduled
5. THE Events page SHALL render events in ascending date order within the upcoming section and descending date order within the past section
6. THE Site SHALL support adding new events by editing `_data/events.yml` without requiring code changes

---

### Requirement 6: Blog Page

**User Story:** As a club administrator, I want to publish blog posts about the league, so that members stay informed and engaged.

#### Acceptance Criteria

1. THE Site SHALL render a `/blog` index page listing all published Jekyll posts in reverse chronological order
2. THE Blog index page SHALL display each post's title, publication date, author, and excerpt
3. WHEN a visitor selects a post, THE Site SHALL navigate to the full post at its permalink
4. THE Blog post page SHALL display the post title, author, publication date, and full content
5. THE Site SHALL support authoring new posts by adding Markdown files to the `_posts/` directory following Jekyll's naming convention (`YYYY-MM-DD-title.md`)
6. WHERE an author front matter field is defined on a post, THE Site SHALL display the author name on the post and in the index listing

---

### Requirement 7: Site Navigation and Structure

**User Story:** As a site visitor, I want clear navigation between all sections of the site, so that I can find information quickly.

#### Acceptance Criteria

1. THE Site SHALL include a persistent header navigation with links to: Home, Teams, Seasons (dropdown or direct link), Events, Blog, and Submit Match
2. THE Site SHALL include a footer on all pages displaying the club name and contact email
3. WHEN a visitor is on a given page, THE Site SHALL visually indicate the active navigation link
4. THE Site SHALL render a home page (`/`) with a hero section displaying the club name, a brief description, and links to key sections (Teams, Current Season, Events)
5. THE Site SHALL serve all pages with valid HTML5 and be deployable to GitHub Pages using the `github-pages` gem
6. THE Site navigation SHALL include a direct link to the active season's page at `/seasons/{active-season-slug}` so that the current season is reachable in one click from any page
7. WHERE more than one season exists, THE Site navigation SHALL provide access to the `/seasons` index page listing all seasons
