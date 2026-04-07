# Requirements Document

## Introduction

The Junebug Pickleball League site currently uses the Minima theme's default header. The goal is to replace it with a polished horizontal navigation bar — site title/logo pinned to the left, nav links flowing right in a single row — styled consistently with the site's solarized-dark theme. The design reference is majorleaguepickleball.co: a full-width sticky bar that stays visible as the user scrolls, with a dropdown for multi-page sections and a hamburger menu on mobile.

## Glossary

- **Header**: The `<header>` element rendered by `_includes/header.html` that appears at the top of every page.
- **Nav_Bar**: The horizontal navigation component inside the Header containing the site title and nav links.
- **Nav_Link**: An anchor element in the Nav_Bar pointing to a top-level site page.
- **Dropdown**: A Nav_Link that reveals a sub-menu of child links on interaction.
- **Hamburger_Menu**: A toggle button shown on narrow viewports that shows/hides the Nav_Bar links.
- **Active_Link**: The Nav_Link whose target URL matches the current page URL.
- **Viewport_Breakpoint**: The CSS breakpoint at 768px that separates desktop and mobile layouts.

---

## Requirements

### Requirement 1: Full-Width Sticky Header

**User Story:** As a site visitor, I want the navigation bar to stay visible as I scroll, so that I can navigate to any page without scrolling back to the top.

#### Acceptance Criteria

1. THE Nav_Bar SHALL span the full width of the browser viewport.
2. THE Nav_Bar SHALL remain fixed at the top of the viewport while the user scrolls.
3. THE Nav_Bar SHALL maintain a consistent height of no less than 56px on desktop viewports.
4. WHEN the Nav_Bar is sticky, THE Header SHALL not overlap page content by applying equivalent top padding to the page body.

---

### Requirement 2: Horizontal Layout with Logo Left, Links Right

**User Story:** As a site visitor, I want to see the league name on the left and navigation links on the right in a single row, so that the layout feels familiar and easy to scan.

#### Acceptance Criteria

1. THE Nav_Bar SHALL display the site title on the left side and Nav_Links on the right side within a single horizontal row.
2. THE Nav_Bar SHALL render all Nav_Links in one row without wrapping on viewports wider than the Viewport_Breakpoint.
3. THE Nav_Bar SHALL include Nav_Links for: Home, Teams, Seasons (Dropdown), Events, Blog, Submit Match.
4. THE site title SHALL link to the home page (`/`).

---

### Requirement 3: Active Link Highlighting

**User Story:** As a site visitor, I want the current page's nav link to be visually distinct, so that I always know where I am on the site.

#### Acceptance Criteria

1. WHEN a Nav_Link's target URL matches the current page URL, THE Nav_Bar SHALL render that Nav_Link as the Active_Link using the site's accent color (`#e94560`).
2. THE Active_Link SHALL be visually distinguishable from inactive Nav_Links via color and an underline accent.

---

### Requirement 4: Seasons Dropdown

**User Story:** As a site visitor, I want to access the active season and the full seasons archive from a single nav entry, so that I don't need separate top-level links for each.

#### Acceptance Criteria

1. THE Nav_Bar SHALL include a "Seasons" Dropdown containing links to the active season page and the all-seasons archive page.
2. WHEN a visitor clicks or focuses the Seasons Dropdown toggle, THE Dropdown SHALL reveal its sub-menu.
3. WHEN a visitor clicks outside the open Dropdown, THE Dropdown SHALL close.
4. WHEN the current page URL contains `/seasons`, THE Dropdown toggle SHALL be styled as an Active_Link.
5. THE Dropdown sub-menu SHALL be keyboard-navigable and meet WCAG 2.1 AA focus-visibility requirements.

---

### Requirement 5: Mobile Hamburger Menu

**User Story:** As a visitor on a mobile device, I want a hamburger button to show and hide the nav links, so that the header doesn't consume excessive vertical space on small screens.

#### Acceptance Criteria

1. WHILE the viewport width is less than or equal to the Viewport_Breakpoint, THE Nav_Bar SHALL hide all Nav_Links and display the Hamburger_Menu button instead.
2. WHEN a visitor taps the Hamburger_Menu button, THE Nav_Bar SHALL toggle the visibility of the Nav_Links as a vertical stack below the site title.
3. WHEN the Nav_Links are visible via the Hamburger_Menu, THE Hamburger_Menu button `aria-expanded` attribute SHALL be set to `"true"`.
4. WHEN the Nav_Links are hidden via the Hamburger_Menu, THE Hamburger_Menu button `aria-expanded` attribute SHALL be set to `"false"`.
5. WHILE the viewport width is greater than the Viewport_Breakpoint, THE Hamburger_Menu button SHALL not be visible.

---

### Requirement 6: Theme Consistency

**User Story:** As a site owner, I want the nav bar to match the existing solarized-dark color scheme, so that the header feels like a native part of the site rather than a bolt-on.

#### Acceptance Criteria

1. THE Nav_Bar background SHALL use the site's secondary background color (`#1a1a2e`).
2. THE Nav_Bar SHALL render a bottom border using the site's border color (`#2a2a4a`) to visually separate it from page content.
3. THE Nav_Link text color SHALL use the site's secondary text color (`#a0a0b8`) in the default state.
4. WHEN a visitor hovers over a Nav_Link, THE Nav_Link text color SHALL transition to the primary text color (`#e8e8f0`).
5. THE Nav_Bar styles SHALL be defined in `assets/css/style.scss` and SHALL NOT use inline styles in `_includes/header.html`.
