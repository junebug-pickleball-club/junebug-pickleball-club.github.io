# Requirements Document

## Introduction

Update the Junebug Pickleball League Jekyll site's UI color theme across all pages to align with the brand colors present in the main logo (`assets/images/JuneBug_Logo_main.png`). The current theme uses a dark navy/red palette defined via SCSS variables in `assets/main.scss` and `assets/css/style.scss`, plus inline `<style>` blocks in individual page files. This feature replaces those color values with a new logo-derived palette applied consistently site-wide.

## Glossary

- **Theme**: The set of color values applied across all pages of the site.
- **Design_Token**: A named SCSS variable representing a single color value (e.g. `$accent`, `$bg-primary`).
- **Logo_Palette**: The set of colors extracted from `assets/images/JuneBug_Logo_main.png` used as the basis for the new theme.
- **Stylesheet**: The SCSS files `assets/main.scss` and `assets/css/style.scss` that define site-wide styles.
- **Inline_Style**: A `<style>` block embedded directly in a page file (e.g. `pages/submit-match.html`).
- **Site**: The Junebug Pickleball League Jekyll site.

## Requirements

### Requirement 1: Logo-Derived Color Palette

**User Story:** As a league administrator, I want the site's colors to reflect the main logo, so that the brand identity is consistent across all touchpoints.

#### Acceptance Criteria

1. THE Site SHALL define a new Logo_Palette derived from the colors present in `assets/images/JuneBug_Logo_main.png` using the following values:
   - `$bg-primary: #1E2A3A` — main page background
   - `$bg-secondary: #2C3E50` — card/panel backgrounds
   - `$bg-tertiary: #34495E` — subtle section backgrounds, inputs, table rows
   - `$text-primary: #FFFFFF` — main body text
   - `$text-secondary: #A0AAB4` — muted/secondary text
   - `$accent: #C8E64B` — primary brand color
   - `$accent-hover: #A7C93F` — hover state for accent elements
   - `$border-color: #4D5F72` — borders and dividers
   - `$success: #2ECC71` — success states
   - `$danger: #E74C3C` — error/destructive states
2. THE Logo_Palette SHALL maintain a minimum contrast ratio of 4.5:1 between text colors and their respective background colors to meet WCAG AA standards.

### Requirement 2: Centralized Design Tokens

**User Story:** As a developer, I want all color values defined in one place, so that future theme changes require editing only a single file.

#### Acceptance Criteria

1. THE Stylesheet SHALL define all Design_Tokens as SCSS variables at the top of `assets/main.scss`.
2. WHEN a color value is needed anywhere in the Stylesheet, THE Stylesheet SHALL reference a Design_Token variable rather than a hardcoded hex value.
3. THE Stylesheet SHALL override the Minima theme's SCSS variables (`$background-color`, `$brand-color`, `$text-color`, `$grey-color`, `$grey-color-dark`, `$grey-color-light`) using the new Logo_Palette values before the `@import "minima"` statement.

### Requirement 3: Stylesheet Color Update

**User Story:** As a developer, I want the shared SCSS stylesheets updated with the new palette, so that all components styled via the shared stylesheet reflect the new theme.

#### Acceptance Criteria

1. WHEN the site is built, THE Stylesheet SHALL apply the new Logo_Palette Design_Tokens to all component styles including: cards (`.team-card`, `.event-card`), buttons (`.btn-primary`), tables, form inputs, navigation header, nav links, dropdown menus, and the hamburger button.
2. THE Stylesheet SHALL replace all existing hardcoded hex color values with the corresponding Design_Token variables.
3. THE Stylesheet SHALL preserve all existing layout, spacing, and non-color style rules unchanged.

### Requirement 4: Inline Style Color Update

**User Story:** As a developer, I want inline styles in page files updated to use the new palette, so that no page retains the old color values.

#### Acceptance Criteria

1. THE Site SHALL update all hardcoded color values in Inline_Style blocks within `pages/submit-match.html` to match the new Logo_Palette.
2. WHEN a color in an Inline_Style block corresponds to an existing Design_Token, THE Site SHALL use the same color value as that Design_Token.
3. THE Site SHALL preserve all existing layout, spacing, and non-color style rules in Inline_Style blocks unchanged.

### Requirement 5: Site-Wide Color Consistency

**User Story:** As a site visitor, I want a visually consistent color experience across all pages, so that the site feels cohesive and professionally branded.

#### Acceptance Criteria

1. WHEN any page of the Site is rendered, THE Site SHALL display colors exclusively from the Logo_Palette.
2. THE Site SHALL apply the new theme to all pages: Home (`/`), Seasons (`/seasons/`), individual season pages (`/seasons/:slug`), Events (`/events/`), Submit Match (`/submit-match/`), Blog (`/blog/`), and About (`/about/`).
3. IF a page contains component-level color overrides that conflict with the Logo_Palette, THEN THE Site SHALL update those overrides to use the corresponding Logo_Palette values.

### Requirement 6: Logo Display in Header

**User Story:** As a site visitor, I want to see the Junebug logo in the site header, so that the brand is immediately recognizable.

#### Acceptance Criteria

1. THE Site SHALL replace the text site title in the header with `assets/images/JuneBug_Logo_main.png`.
2. THE Site SHALL remove the text-based site title element from the header so only the logo image is rendered.
3. WHEN the header logo is rendered, THE Site SHALL constrain the logo to a maximum height of 48px to fit within the sticky header.
4. THE Site SHALL include descriptive `alt` text on the logo image element for accessibility.
5. IF the logo image fails to load, THEN THE Site SHALL display the site title text as a fallback.
