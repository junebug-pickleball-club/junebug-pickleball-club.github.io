# Design Document: Junebug Pickleball Club Site

## Overview

The Junebug Pickleball Club site is a Jekyll static site hosted on GitHub Pages. This redesign transforms the minimal starter into a full-featured club hub with a custom dark theme, multi-season league data, a match submission form backed by the GitHub Contents API, an events page, and a blog.

The site remains 100% static — no server-side code, no custom Jekyll plugins beyond `jekyll-feed`. All dynamic behavior (match submission, navigation dropdowns) is handled client-side via vanilla JavaScript.

Key design principles:
- Data-driven: all league content lives in `_data/`; pages are templates
- GitHub Pages compatible: only whitelisted plugins, no custom Ruby
- Progressive enhancement: pages render without JS; JS enhances the match form and mobile nav
- Dark-first: a single custom SCSS file overrides Minima variables site-wide

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   GitHub Pages                       │
│  ┌──────────────────────────────────────────────┐   │
│  │              Jekyll Build                    │   │
│  │                                              │   │
│  │  _config.yml ──► site variables              │   │
│  │  _data/ ────────► Liquid data objects        │   │
│  │  _seasons/ ─────► Jekyll collection          │   │
│  │  _posts/ ───────► Jekyll posts collection    │   │
│  │  _layouts/ ─────► page templates             │   │
│  │  _includes/ ────► reusable partials          │   │
│  │  assets/css/ ───► compiled SCSS              │   │
│  └──────────────────────────────────────────────┘   │
│                        │                             │
│                   _site/ (output)                    │
└─────────────────────────────────────────────────────┘
         │ served as static files
         ▼
    Browser
         │ match submission only
         ▼
    GitHub Contents API (REST)
         │ creates branch + commit + PR
         ▼
    Repository PR (human reviews & merges)
```

### Technology Constraints

- Jekyll via `github-pages` ~232 gem — no custom plugins
- Minima ~2.5 theme — overridden via `assets/css/style.scss` and `_includes/` overrides
- Liquid templating — no Ruby logic beyond what Jekyll provides
- Vanilla JS only — no build step, no npm, no bundler
- GitHub Contents API v3 — authenticated with a user-supplied PAT stored in `localStorage`

---

## Components and Interfaces

### Layouts

| Layout | File | Purpose |
|--------|------|---------|
| `default` | `_layouts/default.html` | Base HTML shell; includes header, footer, dark theme |
| `page` | `_layouts/page.html` | Standard content page (inherits default) |
| `home` | `_layouts/home.html` | Hero section + recent posts feed |
| `season` | `_layouts/season.html` | Season detail: standings + schedule |
| `post` | `_layouts/post.html` | Blog post with author + date |

### Includes (Partials)

| Partial | File | Purpose |
|---------|------|---------|
| Header | `_includes/header.html` | Nav bar with Seasons dropdown, mobile hamburger |
| Footer | `_includes/footer.html` | Club name, contact email |
| Team card | `_includes/team-card.html` | Single team display (name, court, roster) |
| Match row | `_includes/match-row.html` | Single match in schedule table |
| Standings table | `_includes/standings-table.html` | Computed standings for a season |
| Event card | `_includes/event-card.html` | Single event display |

### Pages

| URL | File | Data source |
|-----|------|-------------|
| `/` | `index.markdown` | `_config.yml` active_season |
| `/teams` | `teams.html` | `_data/teams.yml` |
| `/seasons` | `seasons/index.html` | `_seasons/` collection |
| `/seasons/{slug}` | `_seasons/{slug}.md` | `_data/seasons/{slug}.yml` |
| `/events` | `events.html` | `_data/events.yml` |
| `/blog` | `blog/index.html` | `_posts/` collection |
| `/submit-match` | `submit-match.html` | `_data/teams.yml`, `_seasons/` |

### Navigation Structure

```
Home
Teams
Seasons ▼
  ├── [Active Season name] → /seasons/{active-slug}   (always first)
  ├── All Seasons → /seasons
  └── [other seasons listed if >1]
Events
Blog
Submit Match
```

On mobile (<768px): hamburger icon toggles a full-width dropdown. The Seasons sub-menu expands inline.

---

## Data Models

### `_data/teams.yml`

```yaml
- id: servers-of-the-court          # kebab-case unique identifier
  name: Servers of the Court
  home_court: Pickleball Hideout
  roster:
    - name: Amy Tucker
      role: captain                  # "captain" | "member"
    - name: Nathan Cross
      role: member
```

Fields:
- `id` (string, required) — used to reference teams from season data
- `name` (string, required)
- `home_court` (string, optional)
- `roster` (array, optional) — empty array or omitted triggers "roster pending" message
- `roster[].name` (string, required)
- `roster[].role` (string, required) — `captain` or `member`

### `_data/seasons/{slug}.yml`

Example: `_data/seasons/spring-2026.yml`

```yaml
name: Spring 2026
slug: spring-2026
start_date: 2026-03-01
end_date: 2026-05-31
teams:
  - servers-of-the-court
  - pickle-posse
schedule:
  - week: 1
    date: 2026-03-08
    location: Pickleball Hideout
    home_team: servers-of-the-court   # references teams[].id
    away_team: pickle-posse
    result:                           # omit entirely if not yet played
      mens_doubles:
        home: 11
        away: 7
      womens_doubles:
        home: 9
        away: 11
      mixed_doubles:
        home: 11
        away: 6
      dreambreaker:
        home: 15
        away: 12
```

Fields:
- `name` (string, required)
- `slug` (string, required) — must match filename and `_seasons/` collection file
- `start_date` / `end_date` (date, required)
- `teams` (array of team ids, required)
- `schedule` (array, required)
- `schedule[].week` (integer, required)
- `schedule[].date` (date, optional)
- `schedule[].location` (string, optional)
- `schedule[].home_team` / `away_team` (string, required) — team id references
- `schedule[].result` (object, optional) — omit for unplayed matches; presence indicates played
- `schedule[].result.{game}` — `mens_doubles`, `womens_doubles`, `mixed_doubles`, `dreambreaker`
- `schedule[].result.{game}.home` / `.away` (integer, required when result present)

### `_data/events.yml`

```yaml
- name: Spring Kickoff Social
  date: 2026-03-01
  location: Pickleball Hideout
  description: Season opener social event for all club members.
- name: Summer Tournament
  date: 2026-07-15
  location: City Park Courts
  description: Open tournament for all skill levels.
```

Fields:
- `name` (string, required)
- `date` (date, required) — used to split upcoming vs. past
- `location` (string, optional)
- `description` (string, optional)

### `_seasons/{slug}.md` (Jekyll Collection)

```yaml
---
layout: season
title: Spring 2026
slug: spring-2026
data_file: spring-2026    # matches _data/seasons/{data_file}.yml
---
```

The collection file contains only front matter. All content is rendered by the `season` layout using `site.data.seasons[page.data_file]`.

### `_config.yml` additions

```yaml
active_season: spring-2026    # slug of the active season

collections:
  seasons:
    output: true
    permalink: /seasons/:name

defaults:
  - scope:
      path: ""
      type: seasons
    values:
      layout: season
```

---

## Dark Theme Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `$bg-primary` | `#0f0f1a` | Page background |
| `$bg-secondary` | `#1a1a2e` | Card/section backgrounds |
| `$bg-tertiary` | `#16213e` | Input fields, table rows |
| `$accent` | `#e94560` | Links, buttons, active nav, highlights |
| `$accent-hover` | `#c73652` | Hover state for accent elements |
| `$text-primary` | `#e8e8f0` | Body text (contrast ≥ 4.5:1 on `$bg-primary`) |
| `$text-secondary` | `#a0a0b8` | Muted labels, metadata |
| `$border` | `#2a2a4a` | Card borders, table dividers |
| `$success` | `#4caf50` | Win indicators |
| `$danger` | `#f44336` | Loss indicators, form errors |

Contrast check: `#e8e8f0` on `#0f0f1a` ≈ 14.5:1 (exceeds 4.5:1 WCAG AA requirement).

### Typography

- Headings: system sans-serif stack — `'Segoe UI', system-ui, -apple-system, sans-serif`
- Body: same stack at 16px base, 1.6 line-height
- Monospace (scores): `'Courier New', monospace`
- Scale: h1 2.5rem → h2 2rem → h3 1.5rem → h4 1.25rem

### Spacing

8px base unit. Common values: 8, 16, 24, 32, 48, 64px.

### Component Styles

- Cards: `background: $bg-secondary`, `border: 1px solid $border`, `border-radius: 8px`, `padding: 24px`
- Buttons (primary): `background: $accent`, `color: #fff`, `border-radius: 4px`, `padding: 10px 20px`
- Tables: alternating rows `$bg-secondary` / `$bg-tertiary`, header `$bg-tertiary`
- Form inputs: `background: $bg-tertiary`, `border: 1px solid $border`, `color: $text-primary`, focus ring `$accent`
- Nav: `background: $bg-secondary`, active link underlined with `$accent`

### SCSS Implementation

`assets/css/style.scss`:
```scss
---
---
// Override Minima SCSS variables before importing
$background-color: #0f0f1a;
$brand-color: #e94560;
$text-color: #e8e8f0;
$grey-color: #a0a0b8;
$grey-color-dark: #2a2a4a;
$grey-color-light: #1a1a2e;

@import "minima";

// Custom overrides follow...
```

---

## Match Submission GitHub API Flow

### Overview

The `/submit-match` page is a static HTML form. On submit, client-side JavaScript:
1. Validates all required fields
2. Reads a GitHub PAT from `localStorage` (or prompts the user to enter one)
3. Fetches the current season data file via the GitHub Contents API
4. Appends the new match result to the schedule array
5. Creates a new branch named `match/{date}-{home}-vs-{away}`
6. Commits the updated YAML to that branch
7. Opens a Pull Request against `main`
8. Displays a success message with a link to the PR

### API Call Sequence

```
1. GET /repos/{owner}/{repo}/contents/_data/seasons/{slug}.yml
   → returns file content (base64) + sha

2. PUT /repos/{owner}/{repo}/contents/_data/seasons/{slug}.yml
   body: { message, content (base64 updated YAML), sha, branch: new-branch }
   → creates branch + commit atomically (GitHub creates branch if it doesn't exist
     when sha of base ref is provided via the `branch` param on a new branch name)

   Actually: two-step for new branch:
   2a. POST /repos/{owner}/{repo}/git/refs
       body: { ref: "refs/heads/match/...", sha: <main HEAD sha> }
   2b. PUT /repos/{owner}/{repo}/contents/_data/seasons/{slug}.yml
       body: { message, content, sha (file sha), branch: new-branch-name }

3. POST /repos/{owner}/{repo}/pulls
   body: { title, body, head: new-branch, base: "main" }
   → returns PR URL
```

### PAT Storage

- On first use, a modal prompts for the GitHub PAT
- PAT is stored in `localStorage` under key `jpl_github_pat`
- A "Clear token" link is provided on the form page
- The PAT requires scopes: `repo` (to read/write contents and open PRs)

### YAML Serialization

The form serializes the match result to a YAML snippet that is appended to the `schedule` array in the season data file. A minimal hand-rolled YAML serializer handles the match object structure (no external library needed given the fixed schema).

The serialized block for a new match entry:
```yaml
  - week: 2
    date: 2026-03-15
    location: Pickleball Hideout
    home_team: servers-of-the-court
    away_team: pickle-posse
    result:
      mens_doubles:
        home: 11
        away: 9
      womens_doubles:
        home: 7
        away: 11
      mixed_doubles:
        home: 11
        away: 8
      dreambreaker:
        home: 15
        away: 13
```

### Standings Computation

Standings are computed in Liquid at render time (no JS needed):

```liquid
{% assign standings = "" | split: "" %}
{% for team_id in season.teams %}
  {% assign wins = 0 %}
  {% assign game_wins = 0 %}
  {% for match in season.schedule %}
    {% if match.result %}
      {% comment %}count match wins and game wins per team{% endcomment %}
    {% endif %}
  {% endfor %}
{% endfor %}
```

Since Liquid lacks sorting by computed values, standings are pre-sorted by iterating all teams, computing wins, building an array of objects, and using a bubble-sort pattern via Liquid filters (`sort` on a pre-keyed array). The season data file can optionally include a `standings_order` array of team ids as an override for manual control.

---

## File/Directory Structure

```
_config.yml                          # updated: active_season, collections
_data/
  teams.yml                          # migrated from data.yml
  seasons/
    spring-2026.yml                  # season data
  events.yml                         # new
_seasons/                            # Jekyll collection
  spring-2026.md                     # front matter only, references data file
_posts/                              # unchanged
_layouts/
  season.html                        # new: season detail
  post.html                          # new: blog post override
_includes/
  header.html                        # new: custom nav with dropdown
  footer.html                        # new: custom footer
  team-card.html                     # replaces team.html
  match-row.html                     # new
  standings-table.html               # new
  event-card.html                    # new
assets/
  css/
    style.scss                       # new: dark theme overrides
index.markdown                       # updated: hero layout
teams.html                           # updated: new data source + dark theme
seasons/
  index.html                         # new: seasons listing
events.html                          # new
blog/
  index.html                         # new
submit-match.html                    # new
404.html                             # unchanged
about.markdown                       # unchanged
```

---

## Error Handling

### Match Submission Form

| Scenario | Handling |
|----------|----------|
| Required field empty | Inline validation message below field; form not submitted |
| No PAT stored | Modal prompts for PAT before API calls begin |
| GitHub API 401 | Error banner: "Authentication failed. Check your token." |
| GitHub API 403 | Error banner: "Permission denied. Ensure token has `repo` scope." |
| GitHub API 404 (file not found) | Error banner: "Season data file not found. Contact admin." |
| GitHub API 422 (branch exists) | Retry with timestamp suffix on branch name |
| Network error / timeout | Error banner: "Network error. Check connection and try again." |
| PR opened successfully | Success banner with clickable PR URL |

### Data Rendering

| Scenario | Handling |
|----------|----------|
| Team referenced in season not in `teams.yml` | Display team id as fallback text |
| Match has no `result` | Display "Scheduled" badge, no score columns |
| Empty roster | Display "Roster pending" placeholder in team card |
| No upcoming events | Display "No upcoming events scheduled" message |
| Empty seasons collection | Seasons index shows "No seasons yet" message |

---

## Testing Strategy

This feature is a Jekyll static site with Liquid templates, a custom SCSS theme, and a client-side JavaScript GitHub API integration. The testable logic falls into two categories:

1. **Liquid/data rendering** — mostly declarative; tested via Jekyll build output inspection
2. **JavaScript** — the match submission form contains pure functions (YAML serialization, form validation, standings computation helpers) that are suitable for property-based testing

### PBT Applicability Assessment

The match submission form's JavaScript contains pure functions with clear input/output behavior and large input spaces:
- YAML serializer: takes a match object, returns a YAML string
- Form validator: takes form field values, returns validation result
- Score parser: takes string inputs, returns numeric scores or errors

These are well-suited for property-based testing. The GitHub API calls themselves are integration concerns and should use mocks.

The Liquid templates and SCSS are not suitable for PBT — use build output snapshot checks and visual inspection instead.

### Unit / Integration Tests

- Jekyll build smoke test: `bundle exec jekyll build` exits 0
- Snapshot tests: compare `_site/` output for key pages against known-good snapshots
- Form integration test: mock GitHub API, submit form, verify PR creation call shape

### Property-Based Testing

Library: **fast-check** (JavaScript) — run via a minimal test harness (e.g., Vitest or Jest) against the pure JS modules extracted from `submit-match.html`.

Each property test runs a minimum of 100 iterations.

Tag format: `// Feature: pickleball-club-site, Property {N}: {property_text}`


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The properties below focus on the pure JavaScript functions in the match submission form and the Liquid rendering logic. Infrastructure checks (GitHub Pages deployment, CSS visual appearance) are handled by smoke tests and snapshot tests instead.

### Property 1: Team card renders all team data

*For any* team object with a name, home court, and roster of players (each with a name and role), the rendered team card HTML should contain the team name, home court, all player names, and each player's role.

**Validates: Requirements 2.2, 2.3**

---

### Property 2: Seasons index is reverse chronological

*For any* collection of seasons with distinct start dates, the seasons index page should list them in reverse chronological order (newest start date first).

**Validates: Requirements 3.1**

---

### Property 3: Season detail page renders all season data

*For any* valid season data object (with name, date range, teams, schedule, and at least one match), the rendered season detail page should contain the season name, start and end dates, all participating team names, all scheduled matches, and a standings table.

**Validates: Requirements 3.3**

---

### Property 4: Standings ranking satisfies win comparator invariant

*For any* set of match results, the computed standings should satisfy: team A ranks above team B if and only if A has strictly more match wins than B, or A and B have equal match wins and A has strictly more total game wins than B.

**Validates: Requirements 3.4**

---

### Property 5: Match row renders complete match data

*For any* match object that has a result (i.e., has been played), the rendered match row should contain the home team, away team, week number, location, and scores for all four game types (Men's Doubles, Women's Doubles, Mixed Doubles, Dreambreaker).

**Validates: Requirements 3.5, 3.6**

---

### Property 6: Form validation identifies all missing required fields

*For any* non-empty subset of required form fields that are left empty, the form validation function should return a failed result that identifies every missing field in that subset.

**Validates: Requirements 4.5**

---

### Property 7: Valid submission produces correct GitHub API call sequence

*For any* valid match form submission (all required fields populated with valid values), the submission handler should produce an API call sequence that: (1) fetches the current season file, (2) creates a new branch, (3) commits the updated YAML containing the new match, and (4) opens a PR — in that order.

**Validates: Requirements 4.4**

---

### Property 8: API response reflected in UI feedback

*For any* GitHub API response (success or error), the UI feedback handler should display a non-empty message to the user: a success message containing the PR URL on success, or an error message describing the failure on error.

**Validates: Requirements 4.6, 4.7**

---

### Property 9: YAML serialization round-trip preserves match data

*For any* valid match result object, serializing it to a YAML string and then parsing that YAML string back should produce an object equivalent to the original.

**Validates: Requirements 4.4** (the serialized YAML must be valid and parseable by Jekyll)

---

### Property 10: Events are correctly partitioned and sorted

*For any* set of events with varying dates relative to a reference date, the events page logic should: (a) place all events with dates on or after the reference date in the upcoming section, (b) place all events with dates before the reference date in the past section, (c) sort upcoming events in ascending date order, and (d) sort past events in descending date order.

**Validates: Requirements 5.3, 5.5**

---

### Property 11: Event card renders all event fields

*For any* event object with name, date, location, and description, the rendered event card HTML should contain all four fields.

**Validates: Requirements 5.2**

---

### Property 12: Blog posts rendered with complete data

*For any* post object with title, publication date, author, excerpt, and full content, both the blog index entry and the full post page should contain the title, date, and author; the index entry should contain the excerpt; the post page should contain the full content.

**Validates: Requirements 6.1, 6.2, 6.4, 6.6**

---

### Property 13: Footer present on all pages

*For any* page in the built site, the rendered HTML should contain a footer element with the club name and contact email.

**Validates: Requirements 7.2**

---

### Property 14: Active navigation link reflects current page

*For any* page in the built site, the navigation element should apply an active CSS class to exactly the link corresponding to that page's section.

**Validates: Requirements 7.3**
