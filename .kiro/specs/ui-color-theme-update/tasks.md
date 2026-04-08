# Implementation Plan: UI Color Theme Update

## Overview

Replace the existing dark navy/red palette with the Logo_Palette across both SCSS entry points, move `submit-match.html`'s inline `<style>` block into the shared stylesheet, convert two inline `style=` attributes to utility classes, and swap the header text title for the logo image.

## Tasks

- [x] 1. Update SCSS design tokens in `assets/main.scss`
  - Replace the Minima variable overrides block (`$background-color`, `$brand-color`, `$text-color`, `$grey-color`, `$grey-color-dark`, `$grey-color-light`) with the Logo_Palette values
  - Replace the design token block with the new Logo_Palette variables, renaming `$border` → `$border-color`
  - Update every component rule that references `$border` to use `$border-color` instead
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 2. Sync `assets/css/style.scss` to match `assets/main.scss`
  - Apply the identical variable and component-rule changes made in task 1
  - _Requirements: 2.1, 3.2_

- [x] 3. Move `submit-match.html` inline styles into `assets/main.scss`
  - Remove the entire `<style>` block from `pages/submit-match.html`
  - Add a clearly marked `// ─── Submit Match ───` section to `assets/main.scss` containing all the moved rules, with every hardcoded hex value replaced by the corresponding Design_Token variable (see design mapping table)
  - Mirror the same section addition in `assets/css/style.scss`
  - _Requirements: 4.1, 4.2, 4.3, 5.1_

- [x] 4. Replace inline `style=` attributes in `submit-match.html` with utility classes
  - Replace `<span style="color:#a0a0b8;font-size:0.8em;">` with `<span class="text-secondary text-sm">`
  - Replace `<div id="score-errors" style="color:#f44336;font-size:0.8rem;margin-top:8px;display:none;">` with `<div id="score-errors" class="score-errors">`
  - Add `.text-secondary`, `.text-sm`, and `.score-errors` utility rules to `assets/main.scss` (and `assets/css/style.scss`) using Design_Token variables
  - _Requirements: 4.1, 4.2, 5.1_

- [x] 5. Update `_includes/header.html` to render the logo image
  - Replace `{{ site.title }}` text inside the `.site-title` anchor with an `<img>` element pointing to `assets/images/JuneBug_Logo_main.png`, with `alt="{{ site.title }}"` and an `onerror` fallback that hides the image and injects the title text
  - Add a `.site-logo` rule to `assets/main.scss` (and `assets/css/style.scss`) with `max-height: 48px; width: auto; display: block;`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Checkpoint — verify no hardcoded hex values remain in rule bodies
  - Confirm `assets/main.scss` and `assets/css/style.scss` contain no bare hex literals outside the variable declaration blocks
  - Confirm `pages/submit-match.html` contains no `<style>` block and no `style=` attributes with color values
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write unit tests for WCAG contrast ratios and header rendering
  - Add tests to `tests/rendering.test.js` verifying contrast ratio ≥ 4.5:1 for each text/background pairing defined in the design:
    - `#FFFFFF` on `#1E2A3A`, `#2C3E50`, `#34495E`
    - `#A0AAB4` on `#1E2A3A`
    - `#C8E64B` on `#1E2A3A`
  - Add a test asserting the compiled header HTML contains an `<img>` with `src` matching `JuneBug_Logo_main.png` and a non-empty `alt` attribute
  - _Requirements: 1.2, 6.3, 6.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster pass
- Both SCSS entry points (`assets/main.scss` and `assets/css/style.scss`) must stay in sync — changes to one must be mirrored in the other
- The `_site/` directory is build output; never edit it directly
- Run `bundle exec jekyll build` after changes to verify SCSS compiles without errors
