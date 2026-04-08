# Requirements Document

## Introduction

The Junebug Pickleball League site has several components that break or become unusable on mobile viewports (≤ 768px wide). This feature audits all page styles and fixes mobile layout issues across the site, with five known problem areas and a general audit pass to catch anything else. The goal is a site that works well on both desktop and mobile browsers without changing the desktop experience.

## Glossary

- **Site**: The Junebug Pickleball League Jekyll site.
- **Mobile viewport**: A browser viewport with a width of 768px or less (the existing breakpoint used in `assets/main.scss`).
- **Desktop viewport**: A browser viewport wider than 768px.
- **Nav**: The site-wide navigation bar rendered by `_includes/header.html`.
- **Mobile nav**: The hamburger-toggled navigation menu shown on mobile viewports.
- **Teams Carousel**: The horizontally scrollable row of team cards on the season detail page, rendered by `_layouts/season.html` using `_includes/team-card.html`.
- **Team Card**: A single card in the Teams Carousel, styled via `.team-card` in `assets/main.scss`.
- **Schedule Table**: The match schedule `<table class="schedule-table">` on the season detail page.
- **Standings Table**: The `<table class="standings-table">` rendered by `_includes/standings-table.html`.
- **Season Podium**: The champions section rendered by `_includes/season-podium.html`.
- **Scores Section**: The `.scores-section` grid inside `pages/submit-match.html`.
- **Submit Form**: The full match submission form at `/submit-match/`.
- **Horizontal overflow**: A condition where an element's rendered width exceeds the viewport width, causing the page body to scroll horizontally.

---

## Requirements

### Requirement 1: Mobile Navigation Fits Within the Viewport

**User Story:** As a mobile user, I want the navigation menu to open and display all links within the screen, so that I can navigate the site without the menu overflowing off-screen.

#### Acceptance Criteria

1. WHEN the mobile nav is open on a mobile viewport, THE Nav SHALL display all navigation links within the visible viewport height without requiring vertical scrolling of the nav itself.
2. WHEN the mobile nav is open on a mobile viewport, THE Nav SHALL not cause horizontal overflow of the page body.
3. WHILE the mobile nav is open, THE Nav SHALL render the Seasons dropdown sub-links indented and fully visible within the viewport width.
4. WHEN the site is viewed on a desktop viewport, THE Nav SHALL display the horizontal nav bar layout unchanged.

---

### Requirement 2: Team Carousel Cards Are Readable on Mobile

**User Story:** As a mobile user, I want team cards in the carousel to be wide enough to read team names and rosters, so that I can browse teams on my phone.

#### Acceptance Criteria

1. WHEN the Teams Carousel is viewed on a mobile viewport, THE Team Card SHALL have a minimum rendered width of 200px.
2. WHEN the Teams Carousel is viewed on a mobile viewport, THE Teams Carousel SHALL remain horizontally scrollable so all team cards are reachable.
3. WHEN the Teams Carousel is viewed on a desktop viewport, THE Team Card SHALL retain its existing `calc(20% - 0.8rem)` width behaviour.
4. WHEN the Teams Carousel is viewed on a mobile viewport, THE Team Card SHALL display the team logo, team name, and roster list without truncation or overflow.

---

### Requirement 3: Schedule Table Is Horizontally Scrollable on Mobile

**User Story:** As a mobile user, I want to view the match schedule without the table breaking the page layout, so that I can read match results on my phone.

#### Acceptance Criteria

1. WHEN the Schedule Table is viewed on a mobile viewport, THE Schedule Table SHALL be contained within a horizontally scrollable wrapper so the page body does not overflow horizontally.
2. WHEN the Schedule Table is viewed on a mobile viewport, THE Schedule Table SHALL preserve all columns and data — no columns SHALL be hidden or removed.
3. WHEN the Schedule Table is viewed on a desktop viewport, THE Schedule Table SHALL display with its existing full-width layout unchanged.
4. WHEN the Standings Table is viewed on a mobile viewport, THE Standings Table SHALL also be contained within a horizontally scrollable wrapper.

---

### Requirement 4: Season Podium Renders Correctly on Mobile

**User Story:** As a mobile user, I want the season podium section to display the top three teams with correctly sized icons and consistent container heights, so that the champions section looks intentional rather than broken.

#### Acceptance Criteria

1. WHEN the Season Podium is viewed on a viewport wider than 480px and no wider than 768px, THE Season Podium SHALL retain a side-by-side layout with adjusted sizing and proportions so all three entries fit within the viewport width.
2. WHEN the Season Podium is viewed on a viewport of 480px or less, THE Season Podium SHALL stack the three podium entries vertically in a single column.
3. WHEN the Season Podium is viewed on a viewport of 480px or less, THE Season Podium SHALL render all three podium entry containers at equal height (the gold/silver/bronze height stagger SHALL be disabled).
4. WHEN the Season Podium is viewed on any mobile viewport (768px or less), THE Season Podium SHALL display each podium entry logo at a consistent, proportional size that fits within the viewport width without overflow.
5. WHEN the Season Podium is viewed on a desktop viewport, THE Season Podium SHALL retain the existing side-by-side layout with the gold entry visually elevated.

---

### Requirement 5: Match Submission Scores Section Is Usable on Mobile

**User Story:** As a mobile user submitting a match result, I want the scores section to be laid out so I can fill in all score fields and player selects without horizontal scrolling, so that I can submit results from my phone.

#### Acceptance Criteria

1. WHEN the Scores Section is viewed on a mobile viewport, THE Scores Section SHALL not cause horizontal overflow of the page body.
2. WHEN the Scores Section is viewed on a mobile viewport, THE Scores Section SHALL display each game row as a stacked layout (game label, home side inputs, away side inputs each on their own line or clearly grouped) rather than an 8-column horizontal grid.
3. WHEN the Submit Form is viewed on a mobile viewport, THE Submit Form SHALL display the two-column `.form-row` fields (home/away team selects, week/date fields) as a single-column layout.
4. WHEN the Scores Section is viewed on a desktop viewport, THE Scores Section SHALL retain the existing 8-column grid layout unchanged.
5. WHEN the Submit Form is viewed on a desktop viewport, THE Submit Form SHALL retain the existing two-column `.form-row` layout unchanged.

---

### Requirement 6: General Mobile Audit — No Unintended Horizontal Overflow

**User Story:** As a mobile user, I want every page on the site to fit within my screen width, so that I never have to scroll horizontally to read content.

#### Acceptance Criteria

1. THE Site SHALL be audited for horizontal overflow on all pages (Home, Seasons archive, Season detail, Events, Submit Match, About, News/Posts) at a 375px viewport width.
2. WHEN any page is viewed on a mobile viewport, THE Site SHALL not produce horizontal overflow of the page body caused by any element other than an intentionally scrollable container (such as the Teams Carousel or a table wrapper).
3. WHEN images are displayed on a mobile viewport, THE Site SHALL constrain all images to a maximum width of 100% of their containing element so they do not cause overflow.
4. WHEN the season banner image is displayed on a mobile viewport, THE Site SHALL scale the banner image height proportionally so it does not appear excessively tall.
