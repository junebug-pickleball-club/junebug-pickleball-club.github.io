# Design Document: Mobile Responsiveness

## Overview

This feature fixes six categories of mobile layout issues on the Junebug Pickleball League site. All fixes are pure CSS — no JavaScript changes are needed. The approach is to add mobile-specific overrides inside existing `@media (max-width: 768px)` blocks (and a new `@media (max-width: 480px)` block for the podium stacking), wrap wide tables in `overflow-x: auto` containers, and apply a global image constraint.

The desktop experience is unchanged. Every fix is additive: new rules inside media queries or new wrapper elements that do not affect rendering above 768px.

---

## Architecture

The site uses a single compiled stylesheet (`assets/main.scss`) plus inline `<style>` blocks scoped to individual includes and pages. The fix strategy follows the existing pattern:

- **Global rules** (images, banner height, form-row, score-row) → `assets/main.scss` inside the existing `@media (max-width: 768px)` block.
- **Component-scoped rules** (podium breakpoints) → inline `<style>` in `_includes/season-podium.html`.
- **Structural wrappers** (table overflow) → `_layouts/season.html` and `_includes/standings-table.html`.

No new files are created. No JavaScript is modified.

### Breakpoints

| Breakpoint | Usage |
|---|---|
| `≤ 768px` | Existing mobile breakpoint — nav, carousel, form, images, banner |
| `≤ 480px` | New "very small screen" breakpoint — podium vertical stack |

---

## Components and Interfaces

### 1. Nav — `_includes/header.html` + `assets/main.scss`

The existing `@media (max-width: 768px)` block in `assets/main.scss` already sets `.site-nav` to `display: none` / `flex-direction: column` when open. The gap is that `.site-header .wrapper` uses `flex-wrap: nowrap` globally, and the open nav can push content wider than the viewport.

Fix: add `overflow: hidden` to `.site-header` and ensure `.site-nav` gets `width: 100%` and `box-sizing: border-box` inside the mobile block. The `.nav-dropdown-menu` is already `position: static` on mobile, so no further change is needed there.

### 2. Team Carousel Cards — `assets/main.scss`

The carousel card currently has `width: calc(20% - 0.8rem)` with `min-width: 0`. On mobile this renders cards at ~60–70px wide.

Fix: inside `@media (max-width: 768px)`, override `.teams-carousel .team-card` with `min-width: 200px`. The carousel already has `overflow-x: auto` and `scroll-snap-type: x mandatory`, so horizontal scrollability is preserved automatically.

### 3. Schedule + Standings Table Wrappers — `_layouts/season.html` + `_includes/standings-table.html`

Wide tables cause the page body to overflow horizontally because they have no containing scroll context.

Fix:
- In `_layouts/season.html`, wrap the `<table class="schedule-table">` in `<div class="table-scroll-wrapper">`.
- In `_includes/standings-table.html`, wrap the `<table class="standings-table">` in `<div class="table-scroll-wrapper">`.
- Add `.table-scroll-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }` to `assets/main.scss` (not inside a media query — the wrapper is harmless on desktop and avoids a flash of layout on resize).

### 4. Season Podium — `_includes/season-podium.html`

The podium uses `display: flex; flex-wrap: wrap; align-items: flex-end` with `flex: 1 1 0` on each entry. On narrow viewports the entries shrink below readable size but don't stack because `flex-wrap: wrap` only wraps when items can't fit at their minimum content size.

Two breakpoints are needed, both added as `<style>` additions inside `season-podium.html`:

**481px – 768px (side-by-side, adjusted sizing):**
- `.podium-entry__logo-wrap`: reduce from 120×120px to 72×72px.
- `.podium-entry__name`: reduce font-size to `0.8rem`.
- `.podium-entry__medal`: reduce font-size to `0.85rem`.
- Keep `flex-direction: row` and `align-items: flex-end` (gold stagger preserved).

**≤ 480px (vertical stack):**
- `.podium-entries`: `flex-direction: column; align-items: stretch`.
- `.podium-entry`: `flex: none; width: 100%`.
- `.podium-entry--gold`: `padding-top: 0.6rem` (remove height stagger — same as silver/bronze).
- `.podium-entry__logo-wrap`: 64×64px.
- Reorder entries to natural document order (gold first) by resetting `order` values: gold → `order: 1`, silver → `order: 2`, bronze → `order: 3`.

### 5. Scores Section + Form Rows — `assets/main.scss`

The `.score-row` and `.score-header` use an 8-column grid (`grid-template-columns: 160px 1fr 1fr 64px 32px 64px 1fr 1fr`) that is ~600px+ wide. The `.form-row` uses `grid-template-columns: 1fr 1fr`.

Fix inside `@media (max-width: 768px)`:

**`.form-row`:** `grid-template-columns: 1fr` (single column).

**`.score-header`:** `display: none` (the column labels are redundant when rows are stacked).

**`.score-row`:** Switch to a named-area grid that groups the row into three visual bands:
```
"label label label label label label label label"
"hp1   hp2   hscore .     vscore vp1   vp2   ."
```
Or more practically, use a simpler approach: `display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto auto;` with explicit `grid-column` placement, or just switch to `display: flex; flex-wrap: wrap` with percentage widths. The simplest readable approach:

```css
.score-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 6px;
}
/* label spans full width */
.score-row label { grid-column: 1 / -1; }
/* vs separator hidden — implied by layout */
.score-row .vs-sep { display: none; }
```

This gives: label on row 1 (full width), then pairs of inputs/selects on rows 2–3 (home side left column, away side right column). The score inputs and player selects are naturally paired by column.

### 6. General Audit — `assets/main.scss`

**Images:** Add `img { max-width: 100%; height: auto; }` globally (outside any media query). The `.event-card__banner` already uses `width: calc(100% + 48px)` intentionally — this rule should be scoped to not override that. Use `img:not(.event-card__banner)` or add the rule inside the media query only. Safest: add inside `@media (max-width: 768px)` to avoid touching desktop rendering.

**Season banner height:** `.season-card__banner` is currently `height: 500px`. On mobile this is excessively tall. Inside `@media (max-width: 768px)`: `.season-card__banner { height: 220px; }`.

**Box-sizing:** The global stylesheet already sets `box-sizing: border-box` on inputs via the form input block. No additional audit needed.

---

## Data Models

No data model changes. This feature is purely presentational CSS and HTML structure.

---

## Error Handling

CSS is fault-tolerant by nature — unrecognised properties are ignored. The only structural change (table wrappers) is additive HTML; if the wrapper `<div>` were somehow absent, the table would simply revert to its current overflowing behaviour. No error states to handle.

---

## Testing Strategy

This feature involves CSS layout changes and HTML structural additions. Property-based testing is not applicable here — the changes are declarative CSS rules and wrapper elements, not functions with input/output logic. The appropriate testing strategies are:

**PBT assessment:** All acceptance criteria are CSS configuration checks (SMOKE) or structural HTML checks (EXAMPLE). None involve logic that varies meaningfully with input, and none test code we wrote in the sense of pure functions. PBT is not used for this feature.

### Manual Visual Regression Checklist

Test at 375px viewport width (iPhone SE) and 768px (tablet boundary) using browser DevTools device emulation:

| Page | Check |
|---|---|
| Any page | Nav opens, all links visible, no horizontal scroll |
| Season detail | Standings table scrolls horizontally within wrapper |
| Season detail | Schedule table scrolls horizontally within wrapper |
| Season detail | Podium stacks vertically at ≤480px, side-by-side at 481–768px |
| Season detail | Team carousel cards are ≥200px wide, carousel scrolls |
| Submit Match | `.form-row` fields stack single-column |
| Submit Match | Score rows stack into 2-column grid, no horizontal overflow |
| Home / Events | Images do not overflow their containers |
| Season detail | Banner image is ~220px tall on mobile, not 500px |

### Unit / Snapshot Tests

The existing `tests/rendering.test.js` suite tests Liquid template rendering. Two snapshot-style assertions can be added:

1. **Schedule table wrapper**: render `_layouts/season.html` output and assert the `<table class="schedule-table">` is a descendant of a `<div class="table-scroll-wrapper">`.
2. **Standings table wrapper**: render `_includes/standings-table.html` output and assert the `<table class="standings-table">` is a descendant of a `<div class="table-scroll-wrapper">`.

These are example-based tests (not property-based) since the structure is deterministic — either the wrapper is present or it isn't.

### CSS Rule Presence Checks

For each media query addition, a quick grep/audit confirms the rule exists before shipping:

- `@media (max-width: 768px)` contains `.teams-carousel .team-card { min-width: 200px }`
- `@media (max-width: 768px)` contains `.form-row { grid-template-columns: 1fr }`
- `@media (max-width: 768px)` contains `.score-row { display: grid; grid-template-columns: 1fr 1fr }`
- `@media (max-width: 768px)` contains `.season-card__banner { height: 220px }`
- `@media (max-width: 480px)` in `season-podium.html` contains `flex-direction: column`
- `.table-scroll-wrapper { overflow-x: auto }` exists in `assets/main.scss`
