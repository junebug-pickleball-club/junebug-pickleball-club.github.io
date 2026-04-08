# Design Document

## Overview

This design replaces the current `teams-grid` layout on the season detail page with a horizontally scrollable carousel. Each team card is updated to optionally display a team logo image sourced from the season YAML data. The implementation is pure CSS + minimal Liquid template changes — no JavaScript frameworks, no new Jekyll plugins, and fully compatible with GitHub Pages.

The changes touch three files:
- `_includes/team-card.html` — add logo/placeholder rendering
- `_layouts/season.html` — swap `.teams-grid` for `.teams-carousel` markup
- `assets/main.scss` — add carousel and logo styles

Season YAML files gain an optional `logo` field per team entry.

## Architecture

The carousel is implemented entirely with CSS Flexbox and `overflow-x: auto`. No JavaScript is required for scrolling — the browser's native scroll behavior handles touch and mouse input. A CSS `::after` pseudo-element on the wrapper provides the trailing-edge fade affordance.

```
season.html (layout)
  └── .teams-carousel-wrapper        ← positions the fade overlay
        └── .teams-carousel          ← overflow-x: auto, flex container
              └── team-card.html     ← flex item, fixed min-width
                    ├── .team-card__logo  (img or placeholder)
                    ├── .team-card__name
                    ├── .team-card__court
                    └── .team-card__roster
```

Build-time data flow:

```
_data/seasons/spring-2026.yml
  └── teams[]
        ├── name, home_court, roster  (existing)
        └── logo (optional, new)      → team-card.html renders img or placeholder
```

## Components and Interfaces

### `_layouts/season.html` — Teams Section

Replace the existing `<div class="teams-grid">` block with:

```liquid
<div class="teams-carousel-wrapper">
  <div class="teams-carousel">
    {% for team in season.teams %}
      {% include team-card.html team=team %}
    {% endfor %}
  </div>
</div>
```

The wrapper is a `position: relative` block that hosts the `::after` fade overlay. The inner `.teams-carousel` is the scrollable flex container.

### `_includes/team-card.html` — Logo Block

A new logo block is prepended above the team name. The partial receives the `team` object via `include.team` (existing convention — no interface change needed).

```liquid
<div class="team-card">
  <div class="team-card__logo-wrap">
    {% if include.team.logo %}
      <img
        class="team-card__logo"
        src="{{ include.team.logo }}"
        alt="{{ include.team.name }}"
      >
    {% else %}
      <div class="team-card__logo-placeholder" aria-hidden="true"></div>
    {% endif %}
  </div>
  <h3 class="team-card__name">…</h3>
  …
</div>
```

### `assets/main.scss` — New Style Rules

New rules appended to the existing stylesheet (no existing rules are modified):

| Selector | Purpose |
|---|---|
| `.teams-carousel-wrapper` | `position: relative` block; hosts `::after` fade |
| `.teams-carousel-wrapper::after` | Right-edge gradient fade affordance |
| `.teams-carousel` | `display: flex; overflow-x: auto; gap; scroll-snap-type` |
| `.teams-carousel .team-card` | `flex-shrink: 0; min-width; scroll-snap-align` |
| `.team-card__logo-wrap` | Fixed-height logo area for visual consistency |
| `.team-card__logo` | `max-width: 100%; max-height: 100%; object-fit: contain` |
| `.team-card__logo-placeholder` | Styled empty box shown when no logo is provided |

### Season YAML Schema (additive change)

Each team entry gains an optional `logo` field:

```yaml
teams:
  - slug: servers-of-the-court
    name: Servers of the Court
    home_court: Pickleball Hideout
    logo: /assets/images/teams/servers-of-the-court.png   # optional
    roster: …
```

The field is a root-relative path string. Absence of the field is valid — the template branches to the placeholder.

## Data Models

### Team Entry (extended)

```yaml
# _data/seasons/{slug}.yml  →  teams[]
slug:        string          # kebab-case identifier (existing)
name:        string          # display name (existing)
home_court:  string          # optional (existing)
logo:        string          # optional — root-relative image path (NEW)
roster:                      # optional array (existing)
  - name:    string
    role:    string
```

No other data files are affected. The `logo` field is purely additive; existing season files without it remain valid.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Carousel preserves team order

*For any* array of team objects passed to the carousel, the rendered HTML must contain each team's name in the same order as the input array, with no teams omitted.

**Validates: Requirements 1.4**

### Property 2: Logo renders when present

*For any* team object that includes a `logo` field, the rendered `team-card.html` partial must contain an `<img>` element whose `src` attribute equals the `logo` value and whose `alt` attribute equals the `name` value.

**Validates: Requirements 2.1, 2.3, 2.4**

### Property 3: Placeholder renders when logo is absent

*For any* team object that does not include a `logo` field (or where `logo` is blank), the rendered `team-card.html` partial must contain the placeholder element and must not contain an `<img>` element inside the logo wrap.

**Validates: Requirements 2.2, 3.2**

## Error Handling

| Scenario | Behavior |
|---|---|
| `logo` field present but image file missing | Browser renders broken-image icon; `alt` text is still present for accessibility. No build error — Jekyll does not validate asset existence. |
| `logo` field absent | Placeholder div renders; no error. |
| `teams` array empty or absent | Existing `{% else %}` branch in `season.html` renders "No teams have been announced yet." — unchanged. |
| `logo` path is an absolute URL | Renders as-is; `src` is passed through verbatim by Liquid. |

No JavaScript error handling is needed — the feature is entirely static.

## Testing Strategy

This feature is a Liquid template + CSS change on a Jekyll static site. The rendering logic is pure string transformation (Liquid → HTML), which is well-suited to property-based testing via the existing JavaScript test suite (Vitest).

### Property-Based Tests

Use [fast-check](https://fast-check.io/) (already available or easily added as a dev dependency) to generate arbitrary team objects and assert the rendering properties above.

Each property test must run a minimum of 100 iterations.

**Property 1 — Carousel preserves team order**
- Generator: arbitrary array of team objects (varying length 0–20, varying names)
- Render: call the team-card rendering logic for each team in sequence
- Assert: extracted name strings from rendered HTML match input array order exactly
- Tag: `// Feature: teams-carousel, Property 1: carousel preserves team order`

**Property 2 — Logo renders when present**
- Generator: arbitrary team object with a non-empty `logo` string
- Render: team-card partial HTML
- Assert: rendered HTML contains `<img`, `src="<logo value>"`, `alt="<name value>"`
- Tag: `// Feature: teams-carousel, Property 2: logo renders when present`

**Property 3 — Placeholder renders when logo is absent**
- Generator: arbitrary team object where `logo` is undefined or empty string
- Render: team-card partial HTML
- Assert: rendered HTML contains placeholder class, does not contain `<img` inside logo wrap
- Tag: `// Feature: teams-carousel, Property 3: placeholder renders when logo is absent`

### Unit / Example Tests

These cover structural and CSS concerns that are not universal across inputs:

- Carousel container has `overflow-x: auto` (or `scroll`) in its inline/class styles
- Carousel track has `flex-wrap: nowrap` (no second row)
- `.team-card` has a `min-width` value set
- Trailing-edge fade overlay element is present in the DOM
- Season page with zero teams renders the "no teams" fallback message

### Integration / Smoke

- Jekyll build (`bundle exec jekyll build`) completes without errors after all template changes
- Rendered `_site/seasons/spring-2026.html` contains `.teams-carousel` and at least one `.team-card`
