# Implementation Plan: Horizontal Navigation Bar

## Overview

Formalize and complete the horizontal nav bar already partially implemented in `_includes/header.html` and `assets/css/style.scss`. The work covers three files: the header partial (HTML + inline JS), the stylesheet (SCSS), and optionally `_layouts/default.html` for body padding.

## Tasks

- [x] 1. Finalize `_includes/header.html` structure and JavaScript
  - [x] 1.1 Audit header.html against the design spec and fix any gaps
    - Verify all 6 nav links are present with correct hrefs: `/`, `/teams`, `/events`, `/blog`, `/submit-match`, and the Seasons dropdown
    - Ensure site title anchor has `href="/"`
    - Confirm Liquid active-link conditionals use `page.url == '/'` for Home and `page.url contains` for all other links
    - Confirm `.nav-dropdown` receives `active` class when `page.url contains '/seasons'`
    - Ensure no inline `style` attributes exist anywhere in the file
    - _Requirements: 2.3, 2.4, 3.1, 4.4, 6.5_

  - [x] 1.2 Add Escape-key keyboard support to the dropdown JS
    - In the inline `<script>`, add a `keydown` listener on `document` that closes the dropdown and resets `aria-expanded` when `event.key === 'Escape'`
    - _Requirements: 4.5_

  - [x]* 1.3 Write unit tests for hamburger toggle behavior
    - In `tests/rendering.test.js`, add tests that simulate hamburger clicks and assert `nav-open` class toggles on `#site-nav` and `aria-expanded` syncs correctly
    - _Requirements: 5.2, 5.3, 5.4_

  - [x]* 1.4 Write unit tests for dropdown toggle behavior
    - Add tests that simulate dropdown toggle clicks and outside-clicks, asserting `.open` class and `aria-expanded` behave correctly
    - _Requirements: 4.2, 4.3_

  - [x]* 1.5 Write property test for aria-expanded mirroring nav visibility (Property 3)
    - **Property 3: aria-expanded mirrors nav visibility**
    - Generate random sequences of hamburger click events, simulate against the JS toggle logic, assert `aria-expanded` always equals the string representation of `nav-open` class presence
    - **Validates: Requirements 5.3, 5.4**

- [x] 2. Complete SCSS rules in `assets/css/style.scss`
  - [x] 2.1 Add sticky positioning and min-height to `.site-header`
    - Add `position: sticky; top: 0; z-index: 1000; min-height: 56px;` to the `.site-header` block
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Fix `.site-nav` to use `flex-wrap: nowrap` on desktop
    - Change the existing `flex-wrap: wrap` to `flex-wrap: nowrap` in the `.site-nav` block (outside the media query)
    - _Requirements: 2.2_

  - [x] 2.3 Add underline accent to `.nav-dropdown.active .nav-dropdown-toggle`
    - Extend the existing `.nav-dropdown.active .nav-dropdown-toggle` rule to also include `text-decoration: underline; text-decoration-color: $accent;`
    - _Requirements: 3.2, 4.4_

  - [x]* 2.4 Write smoke tests for SCSS rules
    - In `tests/rendering.test.js`, add string-match assertions against the raw `assets/css/style.scss` content for: `position: sticky`, `min-height: 56px`, `flex-wrap: nowrap`, `background: $bg-secondary` / `#1a1a2e`, `border-bottom`, `color: $text-secondary`, `color: $text-primary` on hover, `color: $accent` and `text-decoration: underline` for active state, and the `@media (max-width: 768px)` block
    - _Requirements: 1.2, 1.3, 2.2, 3.2, 6.1, 6.2, 6.3, 6.4_

- [x] 3. Checkpoint — Ensure all tests pass
  - Run `npx jest --testPathPattern="rendering" --run` (or equivalent) and confirm no failures. Ask the user if any questions arise.

- [x] 4. Handle body padding for sticky header
  - [x] 4.1 Copy Minima's default.html into `_layouts/default.html` if it doesn't already exist
    - Run `bundle show minima` to locate the gem, then copy `_layouts/default.html` from the gem into the project's `_layouts/` directory
    - _Requirements: 1.4_

  - [x] 4.2 Add `padding-top` to the page body in `_layouts/default.html`
    - In the copied `_layouts/default.html`, add a `style` attribute or a CSS class to the `<body>` element that applies `padding-top` equal to the header height (56px minimum) so sticky header does not overlap content
    - Alternatively, add a `.page-content { padding-top: 56px; }` rule to `assets/css/style.scss` if the layout already wraps content in that class
    - _Requirements: 1.4_

- [x] 5. Implement property-based and structural tests
  - [x] 5.1 Write structural unit tests for header HTML
    - In `tests/rendering.test.js`, assert the rendered/static header HTML contains all 6 nav links with correct hrefs and that the site title has `href="/"`
    - Assert `aria-haspopup` and `aria-expanded` attributes are present on the dropdown toggle
    - Assert no inline `style` attributes exist in `_includes/header.html`
    - _Requirements: 2.3, 2.4, 4.5, 6.5_

  - [x]* 5.2 Write property test for active link class matching page URL (Property 1)
    - **Property 1: Active link class matches current page URL**
    - Using `fast-check`, generate page URLs from the set `['/', '/teams', '/events', '/blog', '/submit-match']`, simulate Liquid rendering logic in JS, assert exactly one nav item has the `active` class and its href matches the generated URL
    - **Validates: Requirements 3.1, 3.2**

  - [x]* 5.3 Write property test for dropdown active state matching URL prefix (Property 2)
    - **Property 2: Dropdown active state matches URL prefix**
    - Using `fast-check`, generate page URLs with and without `/seasons` prefix, simulate Liquid conditional logic, assert `.nav-dropdown` has `active` class iff URL contains `/seasons`
    - **Validates: Requirements 4.4**

- [x] 6. Final checkpoint — Ensure all tests pass
  - Run the full test suite with `npx jest --run` and confirm all tests pass. Ask the user if any questions arise.
