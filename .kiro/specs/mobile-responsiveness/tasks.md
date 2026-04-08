# Implementation Plan: Mobile Responsiveness

## Overview

Fix six categories of mobile layout issues across the site using pure CSS additions and minimal HTML structural changes. All fixes are additive — desktop rendering is unchanged.

## Tasks

- [x] 1. Add table scroll wrapper styles to `assets/main.scss`
  - Add `.table-scroll-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }` outside any media query
  - _Requirements: 3.1, 3.4_

- [x] 2. Wrap schedule and standings tables in scroll containers
  - [x] 2.1 Wrap `<table class="schedule-table">` in `_layouts/season.html` with `<div class="table-scroll-wrapper">`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.2 Wrap `<table class="standings-table">` in `_includes/standings-table.html` with `<div class="table-scroll-wrapper">`
    - _Requirements: 3.4_
  - [x] 2.3 Write snapshot tests in `tests/rendering.test.js` for table wrapper structure
    - Assert `<table class="schedule-table">` is a descendant of `<div class="table-scroll-wrapper">`
    - Assert `<table class="standings-table">` is a descendant of `<div class="table-scroll-wrapper">`
    - _Requirements: 3.1, 3.4_

- [x] 3. Add mobile CSS overrides to `assets/main.scss` inside `@media (max-width: 768px)`
  - [x] 3.1 Fix nav overflow: add `overflow: hidden` to `.site-header` and `box-sizing: border-box` to `.site-nav`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 3.2 Fix team carousel card min-width: add `min-width: 200px` to `.teams-carousel .team-card`
    - _Requirements: 2.1, 2.2, 2.4_
  - [x] 3.3 Fix form-row to single column: add `.form-row { grid-template-columns: 1fr }`
    - _Requirements: 5.3_
  - [x] 3.4 Fix score section layout: hide `.score-header`, switch `.score-row` to `display: grid; grid-template-columns: 1fr 1fr`, make `.score-row label` span full width with `grid-column: 1 / -1`, and hide `.score-row .vs-sep`
    - _Requirements: 5.1, 5.2_
  - [x] 3.5 Fix season banner height: add `.season-card__banner { height: 220px }`
    - _Requirements: 6.4_
  - [x] 3.6 Fix image overflow: add `img { max-width: 100%; height: auto; }` inside the media query
    - _Requirements: 6.2, 6.3_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add responsive breakpoints to `_includes/season-podium.html`
  - [x] 5.1 Add `@media (max-width: 768px) and (min-width: 481px)` block in the inline `<style>`: reduce `.podium-entry__logo-wrap` to 72×72px, reduce `.podium-entry__name` to `0.8rem`, reduce `.podium-entry__medal` to `0.85rem`
    - _Requirements: 4.1, 4.4, 4.5_
  - [x] 5.2 Add `@media (max-width: 480px)` block: set `.podium-entries` to `flex-direction: column; align-items: stretch`, set `.podium-entry` to `flex: none; width: 100%`, reset `order` values (gold → 1, silver → 2, bronze → 3), set `.podium-entry--gold { padding-top: 0.6rem }`, set `.podium-entry__logo-wrap` to 64×64px
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design uses no JavaScript changes — all fixes are CSS and HTML structure only
- Desktop rendering (> 768px) must remain unchanged for all tasks
- The `table-scroll-wrapper` rule (task 1) must be added outside any media query so it applies on all viewports
