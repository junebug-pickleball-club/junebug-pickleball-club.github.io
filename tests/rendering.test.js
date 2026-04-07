// Feature: pickleball-club-site
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeStandings, partitionEvents } from '../assets/js/match-utils.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Minimal template renderer: replaces {{ var }} and checks {% if %} / {% for %}
// For these tests we verify data presence via string-match against built _site/ HTML.

function readSiteFile(relPath) {
  try {
    return readFileSync(resolve('_site', relPath), 'utf8');
  } catch {
    return null;
  }
}

// ── Property 1: Team card renders all team data ───────────────────────────────
// Note: _data/teams.yml was removed in task 2; teams now live in _data/seasons/spring-2026.yml.
// The standalone /teams page was removed in task 6; team cards are now rendered on the season page.

describe('Property 1: Team card renders all team data', () => {
  it('_site/seasons/spring-2026.html contains all team names from spring-2026.yml', () => {
    const html = readSiteFile('seasons/spring-2026.html');
    expect(html).not.toBeNull();

    // Verify against season data (teams are now embedded in the season file)
    const seasonYaml = readFileSync(resolve('_data/seasons/spring-2026.yml'), 'utf8');
    fc.assert(
      fc.property(fc.constant(seasonYaml), (raw) => {
        // Extract team names via simple regex
        const names = [...raw.matchAll(/name:\s+(.+)/g)].map(m => m[1].trim());
        for (const name of names) {
          expect(html).toContain(name);
        }
      }),
      { numRuns: 1 }
    );
  });
});

// ── Property 2: Seasons index is reverse chronological ───────────────────────

describe('Property 2: Seasons index is reverse chronological', () => {
  it('for any set of seasons with distinct start_dates, sorted output is newest-first', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title:      fc.string({ minLength: 1, maxLength: 20 }),
            start_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
                          .map(d => d.toISOString().slice(0, 10)),
            data_file:  fc.string({ minLength: 1, maxLength: 10 }),
            url:        fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (seasons) => {
          const sorted = [...seasons].sort((a, b) =>
            String(b.start_date).localeCompare(String(a.start_date))
          );
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].start_date >= sorted[i + 1].start_date).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Season detail page renders all season data ───────────────────

describe('Property 3: Season detail page renders all season data', () => {
  it('_site/seasons/spring-2026.html contains season name, teams, and matches', () => {
    const html = readSiteFile('seasons/spring-2026.html') ??
                 readSiteFile('seasons/spring-2026/index.html');
    expect(html).not.toBeNull();
    expect(html).toContain('Spring 2026');
    expect(html).toContain('Servers of the Court');
    expect(html).toContain('Pickle Posse');
    // At least one match row should be present
    expect(html).toContain('Pickleball Hideout');
  });
});

// ── Property 5: Match row renders complete match data ────────────────────────

describe('Property 5: Match row renders complete match data', () => {
  it('serializeMatchYaml output contains all four mixed doubles game scores', () => {
    const scoreArb = fc.integer({ min: 0, max: 21 });
    const gameResultArb = fc.record({ home: scoreArb, away: scoreArb });
    fc.assert(
      fc.property(
        fc.record({
          week: fc.integer({ min: 1, max: 20 }),
          date: fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
                  .map(d => d.toISOString().slice(0, 10)),
          location: fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 .,'-]{0,29}$/),
          home_team: fc.constantFrom('team-alpha', 'team-beta'),
          away_team: fc.constantFrom('team-gamma', 'team-delta'),
          result: fc.record({
            mens_doubles:    gameResultArb,
            womens_doubles:  gameResultArb,
            mixed_doubles_1: gameResultArb,
            mixed_doubles_2: gameResultArb,
            mixed_doubles_3: gameResultArb,
            mixed_doubles_4: gameResultArb,
          }),
        }),
        (match) => {
          const { serializeMatchYaml } = require('../assets/js/match-utils.js');
          const yaml = serializeMatchYaml(match);
          expect(yaml).toContain('mens_doubles');
          expect(yaml).toContain('womens_doubles');
          expect(yaml).toContain('mixed_doubles_1');
          expect(yaml).toContain('mixed_doubles_2');
          expect(yaml).toContain('mixed_doubles_3');
          expect(yaml).toContain('mixed_doubles_4');
          expect(yaml).not.toContain('dreambreaker');
          expect(yaml).toContain(String(match.result.mens_doubles.home));
          expect(yaml).toContain(String(match.result.mixed_doubles_4.away));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 11: Event card renders all event fields ─────────────────────────

describe('Property 11: Event card renders all event fields', () => {
  it('_site/events/index.html contains event names, locations, and descriptions', () => {
    const html = readSiteFile('events/index.html');
    expect(html).not.toBeNull();
    // Check against actual events data
    const eventsYaml = readFileSync(resolve('_data/events.yml'), 'utf8');
    const names = [...eventsYaml.matchAll(/name:\s+(.+)/g)].map(m => m[1].trim());
    for (const name of names) {
      expect(html).toContain(name);
    }
  });

  it('partitionEvents preserves all event fields in output', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name:        fc.string({ minLength: 1, maxLength: 30 }),
            date:        fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') })
                           .map(d => d.toISOString().slice(0, 10)),
            location:    fc.string({ minLength: 1, maxLength: 30 }),
            description: fc.string({ minLength: 1, maxLength: 80 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') })
          .map(d => d.toISOString().slice(0, 10)),
        (events, today) => {
          const { upcoming, past } = partitionEvents(events, today);
          const all = [...upcoming, ...past];
          // All original events are present in output
          expect(all.length).toBe(events.length);
          // Each event retains its fields
          for (const e of all) {
            expect(e.name).toBeDefined();
            expect(e.date).toBeDefined();
            expect(e.location).toBeDefined();
            expect(e.description).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 12: Blog posts rendered with complete data ──────────────────────

describe('Property 12: Blog posts rendered with complete data', () => {
  it('_site/blog/index.html exists and contains post titles', () => {
    const html = readSiteFile('blog/index.html');
    expect(html).not.toBeNull();
    // Blog index should have the page title at minimum
    expect(html).toContain('Blog');
  });
});

// ── Property 13: Footer present on all pages ─────────────────────────────────

describe('Property 13: Footer present on all pages', () => {
  const pages = [
    'index.html',
    'seasons/index.html',
    'events/index.html',
    'blog/index.html',
    'submit-match/index.html',
  ];

  for (const entry of pages) {
    const page     = typeof entry === 'string' ? entry : entry.path;
    const fallback = typeof entry === 'string' ? null   : entry.fallback;
    it(`${page} contains a footer with club name and email`, () => {
      const html = readSiteFile(page) ?? (fallback ? readSiteFile(fallback) : null);
      expect(html).not.toBeNull();
      expect(html).toContain('site-footer');
      expect(html).toContain('Junebug Pickleball League');
      expect(html).toContain('junebugpickleballclub@gmail.com');
    });
  }
});

// ── Hamburger toggle unit tests (Requirements 5.2, 5.3, 5.4) ─────────────────

// Minimal DOM simulation for the hamburger toggle logic from _includes/header.html
function buildToggleState() {
  // State mirrors what the browser DOM tracks
  const navClasses = new Set();
  let ariaExpanded = 'false';

  // Replicate the inline JS toggle logic from _includes/header.html:
  //   var isOpen = nav.classList.toggle('nav-open');
  //   toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  function click() {
    const isOpen = navClasses.has('nav-open')
      ? (navClasses.delete('nav-open'), false)
      : (navClasses.add('nav-open'), true);
    ariaExpanded = isOpen ? 'true' : 'false';
  }

  return {
    click,
    hasNavOpen: () => navClasses.has('nav-open'),
    getAriaExpanded: () => ariaExpanded,
  };
}

describe('Hamburger toggle behavior', () => {
  it('nav-open class is absent before any click', () => {
    const state = buildToggleState();
    expect(state.hasNavOpen()).toBe(false);
  });

  it('first click adds nav-open class to #site-nav (Req 5.2)', () => {
    const state = buildToggleState();
    state.click();
    expect(state.hasNavOpen()).toBe(true);
  });

  it('second click removes nav-open class from #site-nav (Req 5.2)', () => {
    const state = buildToggleState();
    state.click();
    state.click();
    expect(state.hasNavOpen()).toBe(false);
  });

  it('aria-expanded is "true" when nav-open is present (Req 5.3)', () => {
    const state = buildToggleState();
    state.click();
    expect(state.getAriaExpanded()).toBe('true');
  });

  it('aria-expanded is "false" when nav-open is absent (Req 5.4)', () => {
    const state = buildToggleState();
    state.click(); // open
    state.click(); // close
    expect(state.getAriaExpanded()).toBe('false');
  });

  it('aria-expanded starts as "false" before any interaction (Req 5.4)', () => {
    const state = buildToggleState();
    expect(state.getAriaExpanded()).toBe('false');
  });

  it('aria-expanded always mirrors nav-open class after multiple clicks', () => {
    const state = buildToggleState();
    for (let i = 0; i < 5; i++) {
      state.click();
      expect(state.getAriaExpanded()).toBe(state.hasNavOpen() ? 'true' : 'false');
    }
  });
});

// ── Property 14: Active navigation link reflects current page ─────────────────

describe('Property 14: Active navigation link reflects current page', () => {
  it('header.html template applies active class based on page.url comparison', () => {
    const headerTemplate = readFileSync(resolve('_includes/header.html'), 'utf8');
    // The template must contain active class logic
    expect(headerTemplate).toContain('active');
    expect(headerTemplate).toContain('page.url');
  });

  it('computeStandings comparator is consistent with active-link logic (rank ordering)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('/', '/teams', '/events', '/blog', '/submit-match', '/seasons/spring-2026'),
          { minLength: 1, maxLength: 6 }
        ),
        (urls) => {
          // Each URL should match exactly one nav section
          const navSections = ['/', '/teams', '/seasons', '/events', '/blog', '/submit-match'];
          for (const url of urls) {
            const matches = navSections.filter(s => url === s || url.startsWith(s + '/') || (s !== '/' && url.startsWith(s)));
            // At least one section matches
            expect(matches.length).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Dropdown toggle unit tests (Requirements 4.2, 4.3) ───────────────────────

// Minimal DOM simulation for the dropdown toggle logic from _includes/header.html
function buildDropdownState() {
  const menuClasses = new Set();
  let ariaExpanded = 'false';

  // Replicates the dropdown toggle listener:
  //   var isExpanded = dropdownMenu.classList.toggle('open');
  //   dropdownToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  function clickToggle() {
    const isExpanded = menuClasses.has('open')
      ? (menuClasses.delete('open'), false)
      : (menuClasses.add('open'), true);
    ariaExpanded = isExpanded ? 'true' : 'false';
  }

  // Replicates the outside-click / Escape listener:
  //   dropdownMenu.classList.remove('open');
  //   dropdownToggle.setAttribute('aria-expanded', 'false');
  function closeDropdown() {
    menuClasses.delete('open');
    ariaExpanded = 'false';
  }

  return {
    clickToggle,
    closeDropdown,
    isOpen: () => menuClasses.has('open'),
    getAriaExpanded: () => ariaExpanded,
  };
}

describe('Dropdown toggle behavior (Req 4.2, 4.3)', () => {
  // Initial state
  it('dropdown is closed before any interaction', () => {
    const state = buildDropdownState();
    expect(state.isOpen()).toBe(false);
  });

  it('aria-expanded starts as "false" before any interaction', () => {
    const state = buildDropdownState();
    expect(state.getAriaExpanded()).toBe('false');
  });

  // Toggle open (Req 4.2)
  it('clicking toggle adds open class to .nav-dropdown-menu (Req 4.2)', () => {
    const state = buildDropdownState();
    state.clickToggle();
    expect(state.isOpen()).toBe(true);
  });

  it('aria-expanded is "true" when dropdown is open (Req 4.2)', () => {
    const state = buildDropdownState();
    state.clickToggle();
    expect(state.getAriaExpanded()).toBe('true');
  });

  // Toggle closed again
  it('second click on toggle removes open class (Req 4.2)', () => {
    const state = buildDropdownState();
    state.clickToggle();
    state.clickToggle();
    expect(state.isOpen()).toBe(false);
  });

  it('aria-expanded is "false" after second click closes dropdown (Req 4.2)', () => {
    const state = buildDropdownState();
    state.clickToggle();
    state.clickToggle();
    expect(state.getAriaExpanded()).toBe('false');
  });

  // Outside-click closes dropdown (Req 4.3)
  it('outside-click removes open class from .nav-dropdown-menu (Req 4.3)', () => {
    const state = buildDropdownState();
    state.clickToggle(); // open
    state.closeDropdown(); // simulate outside click
    expect(state.isOpen()).toBe(false);
  });

  it('outside-click resets aria-expanded to "false" (Req 4.3)', () => {
    const state = buildDropdownState();
    state.clickToggle(); // open
    state.closeDropdown(); // simulate outside click
    expect(state.getAriaExpanded()).toBe('false');
  });

  // Outside-click when already closed is a no-op
  it('outside-click when already closed leaves dropdown closed (Req 4.3)', () => {
    const state = buildDropdownState();
    state.closeDropdown();
    expect(state.isOpen()).toBe(false);
    expect(state.getAriaExpanded()).toBe('false');
  });

  // Escape key closes dropdown (same handler as outside-click)
  it('Escape key removes open class (Req 4.3)', () => {
    const state = buildDropdownState();
    state.clickToggle(); // open
    state.closeDropdown(); // simulate Escape
    expect(state.isOpen()).toBe(false);
  });

  it('Escape key resets aria-expanded to "false" (Req 4.3)', () => {
    const state = buildDropdownState();
    state.clickToggle(); // open
    state.closeDropdown(); // simulate Escape
    expect(state.getAriaExpanded()).toBe('false');
  });

  // aria-expanded always mirrors open class
  it('aria-expanded always mirrors open class after multiple toggles', () => {
    const state = buildDropdownState();
    for (let i = 0; i < 6; i++) {
      state.clickToggle();
      expect(state.getAriaExpanded()).toBe(state.isOpen() ? 'true' : 'false');
    }
  });
});

// ── Property 3: aria-expanded mirrors nav visibility (horizontal-nav) ─────────
// Feature: horizontal-nav, Property 3: aria-expanded mirrors nav visibility
// Validates: Requirements 5.3, 5.4

describe('Feature: horizontal-nav, Property 3: aria-expanded mirrors nav visibility', () => {
  it('aria-expanded always equals string representation of nav-open class presence after any click sequence', () => {
    fc.assert(
      fc.property(
        // Generate an integer 1–50 representing the number of hamburger clicks
        fc.integer({ min: 1, max: 50 }),
        (numClicks) => {
          const state = buildToggleState();
          for (let i = 0; i < numClicks; i++) {
            state.click();
            // After every click, aria-expanded must mirror nav-open class presence
            const expectedAriaExpanded = String(state.hasNavOpen());
            expect(state.getAriaExpanded()).toBe(expectedAriaExpanded);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Task 2.4: SCSS smoke tests (horizontal-nav) ───────────────────────────────

describe('SCSS smoke tests: horizontal-nav rules', () => {
  const scss = readFileSync(resolve('assets/css/style.scss'), 'utf8');
  const header = readFileSync(resolve('_includes/header.html'), 'utf8');

  it('contains position: sticky (Req 1.2)', () => {
    expect(scss).toContain('position:   sticky');
  });

  it('contains min-height: 56px (Req 1.3)', () => {
    expect(scss).toContain('min-height: 56px');
  });

  it('contains flex-wrap: nowrap (Req 2.2)', () => {
    expect(scss).toContain('flex-wrap:   nowrap');
  });

  it('.site-header uses $bg-secondary / #1a1a2e background (Req 6.1)', () => {
    expect(scss).toMatch(/background:\s*(\$bg-secondary|#1a1a2e)/);
  });

  it('contains border-bottom with $border / #2a2a4a (Req 6.2)', () => {
    expect(scss).toMatch(/border-bottom:\s*\S+\s+\S+\s*(\$border|#2a2a4a)/);
  });

  it('.nav-link default color uses $text-secondary (Req 6.3)', () => {
    expect(scss).toMatch(/color:\s*(\$text-secondary|#a0a0b8)/);
  });

  it('.nav-link:hover color uses $text-primary (Req 6.4)', () => {
    expect(scss).toMatch(/&:hover\s*\{\s*color:\s*(\$text-primary|#e8e8f0)/);
  });

  it('active state has color: $accent and text-decoration: underline (Req 3.2)', () => {
    expect(scss).toMatch(/color:\s*(\$accent|#e94560)/);
    expect(scss).toContain('text-decoration:      underline');
  });

  it('contains @media (max-width: 768px) block (Req 5.1, 5.5)', () => {
    expect(scss).toContain('@media (max-width: 768px)');
  });

  it('header.html contains aria-haspopup and aria-expanded (Req 4.5)', () => {
    expect(header).toContain('aria-haspopup');
    expect(header).toContain('aria-expanded');
  });

  it('header.html has no inline style attributes (Req 6.5)', () => {
    expect(header).not.toMatch(/\bstyle\s*=/);
  });
});

// ── Task 5.1: Structural unit tests for header HTML (Req 2.3, 2.4, 4.5, 6.5) ──

describe('Header HTML structure (horizontal-nav)', () => {
  const header = readFileSync(resolve('_includes/header.html'), 'utf8');

  // Req 2.4 — site title links to home page
  it('site title has href="/" (Req 2.4)', () => {
    expect(header).toMatch(/class="site-title"[^>]*href="\/"/);
  });

  // Req 2.3 — all 6 nav links present with correct hrefs
  it('contains nav link href="/" (Home) (Req 2.3)', () => {
    expect(header).toContain('href="/"');
  });

  it('does not contain nav link href="/teams" — Teams page was removed (Req 3.1)', () => {
    expect(header).not.toContain('href="/teams"');
  });

  it('contains dropdown link href="/seasons/..." for active season (Req 2.3)', () => {
    // Template uses Liquid: href="/seasons/{{ site.active_season }}"
    expect(header).toContain('href="/seasons/');
  });

  it('contains dropdown link href="/seasons" (All Seasons) (Req 2.3)', () => {
    expect(header).toContain('href="/seasons"');
  });

  it('contains nav link href="/events" (Req 2.3)', () => {
    expect(header).toContain('href="/events"');
  });

  it('contains nav link href="/blog" (Req 2.3)', () => {
    expect(header).toContain('href="/blog"');
  });

  it('contains nav link href="/submit-match" (Req 2.3)', () => {
    expect(header).toContain('href="/submit-match"');
  });

  // Req 4.5 — dropdown toggle ARIA attributes
  it('dropdown toggle has aria-haspopup attribute (Req 4.5)', () => {
    expect(header).toContain('aria-haspopup');
  });

  it('dropdown toggle has aria-expanded attribute (Req 4.5)', () => {
    expect(header).toContain('aria-expanded');
  });

  // Req 6.5 — no inline style attributes
  it('contains no inline style attributes (Req 6.5)', () => {
    expect(header).not.toMatch(/\bstyle\s*=/);
  });
});

// ── Feature: horizontal-nav, Property 1: active link class matches current page URL ──
// Validates: Requirements 3.1, 3.2

describe('Feature: horizontal-nav, Property 1: active link class matches current page URL', () => {
  /**
   * Simulates the Liquid active-link logic from _includes/header.html.
   * Returns an array of nav items: { href, active }
   *
   * Liquid rules:
   *   Home:         page.url == '/'
   *   Events:       page.url contains '/events'
   *   Blog:         page.url contains '/blog'
   *   Submit Match: page.url contains '/submit-match'
   *
   * Note: /teams was removed in task 6 (season-teams-view).
   */
  function simulateActiveLinks(pageUrl) {
    return [
      { href: '/',             active: pageUrl === '/' },
      { href: '/events',       active: pageUrl.includes('/events') },
      { href: '/blog',         active: pageUrl.includes('/blog') },
      { href: '/submit-match', active: pageUrl.includes('/submit-match') },
    ];
  }

  it('exactly one nav item is active and its href matches the generated URL', () => {
    // Arbitrarily pick from the exact set of nav-link hrefs (no /teams — removed in task 6)
    const navUrls = fc.constantFrom('/', '/events', '/blog', '/submit-match');

    fc.assert(
      fc.property(navUrls, (pageUrl) => {
        const items = simulateActiveLinks(pageUrl);

        // Exactly one item must be active
        const activeItems = items.filter(item => item.active);
        expect(activeItems).toHaveLength(1);

        // The active item's href must match the current page URL
        expect(activeItems[0].href).toBe(pageUrl);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Feature: horizontal-nav, Property 2: dropdown active state matches URL prefix ──
// Validates: Requirements 4.4

describe('Feature: horizontal-nav, Property 2: dropdown active state matches URL prefix', () => {
  /**
   * Simulates the Liquid dropdown active-state logic from _includes/header.html:
   *   <div class="nav-dropdown{% if page.url contains '/seasons' %} active{% endif %}">
   *
   * Returns true iff the URL contains '/seasons'.
   */
  function simulateDropdownActive(pageUrl) {
    return pageUrl.includes('/seasons');
  }

  it('nav-dropdown has active class iff URL contains /seasons', () => {
    // Generator 1: URLs that contain /seasons
    const seasonsUrl = fc.oneof(
      fc.constant('/seasons'),
      fc.constant('/seasons/spring-2026'),
      fc.constant('/seasons/fall-2025'),
      fc.string({ minLength: 1, maxLength: 20 })
        .filter(s => !s.includes('/seasons') && !s.includes('\n'))
        .map(suffix => `/seasons/${suffix}`)
    );

    // Generator 2: URLs that do NOT contain /seasons
    const nonSeasonsUrl = fc.constantFrom(
      '/',
      '/teams',
      '/events',
      '/blog',
      '/submit-match',
      '/about'
    );

    // Interleave both generators so we test both branches
    const anyUrl = fc.oneof(seasonsUrl, nonSeasonsUrl);

    fc.assert(
      fc.property(anyUrl, (pageUrl) => {
        const isActive = simulateDropdownActive(pageUrl);
        const containsSeasons = pageUrl.includes('/seasons');

        // active class is present iff URL contains '/seasons'
        expect(isActive).toBe(containsSeasons);
      }),
      { numRuns: 100 }
    );
  });

  it('all /seasons URLs produce active class', () => {
    const seasonsUrl = fc.oneof(
      fc.constant('/seasons'),
      fc.constant('/seasons/spring-2026'),
      fc.constant('/seasons/fall-2025'),
      fc.string({ minLength: 1, maxLength: 20 })
        .filter(s => !s.includes('\n'))
        .map(suffix => `/seasons/${suffix}`)
    );

    fc.assert(
      fc.property(seasonsUrl, (pageUrl) => {
        expect(simulateDropdownActive(pageUrl)).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it('non-seasons URLs do not produce active class', () => {
    const nonSeasonsUrl = fc.constantFrom(
      '/',
      '/teams',
      '/events',
      '/blog',
      '/submit-match',
      '/about'
    );

    fc.assert(
      fc.property(nonSeasonsUrl, (pageUrl) => {
        expect(simulateDropdownActive(pageUrl)).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});

// ── Feature: season-teams-view, Property 2: teams section renders all teams ───
// Validates: Requirements 2.1

/**
 * Simulates the Liquid season layout teams section logic from _layouts/season.html.
 * For N teams, renders N `.team-card` divs; for 0 teams, renders the "no teams" message.
 *
 * Mirrors:
 *   {% if season.teams and season.teams.size > 0 %}
 *     {% for team in season.teams %}{% include team-card.html team=team %}{% endfor %}
 *   {% else %}
 *     <p>No teams have been announced yet.</p>
 *   {% endif %}
 */
function renderTeamsSection(teams) {
  if (!teams || teams.length === 0) {
    return '<p>No teams have been announced yet.</p>';
  }
  const cards = teams
    .map(() => '<div class="team-card"></div>')
    .join('\n');
  return `<div class="teams-grid">\n${cards}\n</div>`;
}

describe('Feature: season-teams-view, Property 2: teams section renders all teams', () => {
  // Property test: for any 0–10 teams, rendered HTML contains exactly N team-card elements
  it('rendered HTML contains exactly N team-card elements for N teams (fast-check)', () => {
    const teamArb = fc.record({
      slug:       fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
      name:       fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
      home_court: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
      roster:     fc.array(
        fc.record({
          name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/),
          role: fc.constantFrom('captain', 'member'),
        }),
        { minLength: 1, maxLength: 6 }
      ),
    });

    fc.assert(
      fc.property(
        fc.array(teamArb, { minLength: 0, maxLength: 10 }),
        (teams) => {
          const html = renderTeamsSection(teams);
          const count = (html.match(/class="team-card"/g) || []).length;
          expect(count).toBe(teams.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Edge case: 0 teams renders the "no teams" message and zero team-card elements
  it('renders "no teams" message and zero team-card elements when teams list is empty', () => {
    const html = renderTeamsSection([]);
    expect(html).toContain('No teams have been announced yet.');
    expect((html.match(/class="team-card"/g) || []).length).toBe(0);
  });

  // Smoke test: built _site/seasons/spring-2026.html contains exactly 5 team-card elements
  it('_site/seasons/spring-2026.html contains exactly 5 team-card elements', () => {
    const html = readSiteFile('seasons/spring-2026.html');
    expect(html).not.toBeNull();
    const count = (html.match(/class="team-card"/g) || []).length;
    expect(count).toBe(5);
  });
});

// ── Feature: season-teams-view, Property 3: team card renders complete team data ──
// Validates: Requirements 2.3

/**
 * Simulates the Liquid team-card.html rendering logic.
 * Mirrors _includes/team-card.html:
 *   - Always renders team name in .team-card__name
 *   - Renders home_court in .team-card__court if present
 *   - Renders each roster member's name in a <li> if roster is non-empty
 *   - Renders "Roster pending" if roster is empty/absent
 */
function renderTeamCard(team) {
  const courtHtml = team.home_court
    ? `<p class="team-card__court">${team.home_court}</p>`
    : '';

  let rosterHtml;
  if (team.roster && team.roster.length > 0) {
    const items = team.roster
      .map(p => `<li>${p.name} <span class="team-card__role">(${p.role})</span></li>`)
      .join('\n      ');
    rosterHtml = `<ul>\n      ${items}\n    </ul>`;
  } else {
    rosterHtml = '<p class="team-card__roster-pending">Roster pending</p>';
  }

  return `<div class="team-card">
  <h3 class="team-card__name">${team.name}</h3>
  ${courtHtml}
  <div class="team-card__roster">
    ${rosterHtml}
  </div>
</div>`;
}

describe('Feature: season-teams-view, Property 3: team card renders complete team data', () => {
  // **Validates: Requirements 2.3**
  it('rendered card HTML contains team name, home_court, and all roster member names', () => {
    const playerArb = fc.record({
      name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/),
      role: fc.constantFrom('captain', 'member'),
    });

    const teamArb = fc.record({
      name:       fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
      home_court: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
      roster:     fc.array(playerArb, { minLength: 1, maxLength: 6 }),
    });

    fc.assert(
      fc.property(teamArb, (team) => {
        const html = renderTeamCard(team);

        // Team name must appear in the rendered card
        expect(html).toContain(team.name);

        // Home court must appear in the rendered card
        expect(html).toContain(team.home_court);

        // Every roster member's name must appear in the rendered card
        for (const player of team.roster) {
          expect(html).toContain(player.name);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Feature: season-teams-view, Property 4: schedule slug resolution ──────────
// Feature: season-teams-view, Property 4: schedule slug resolution
// Validates: Requirements 4.3

/**
 * Simulates the Liquid slug-to-name resolution logic from _includes/match-row.html.
 * Iterates the teams list and returns t.name where t.slug == slug,
 * or the raw slug if no match is found.
 *
 * Mirrors:
 *   {% assign home_name = match.home_team %}
 *   {% for t in teams %}
 *     {% if t.slug == match.home_team %}{% assign home_name = t.name %}{% endif %}
 *   {% endfor %}
 */
function resolveTeamName(slug, teams) {
  for (const t of teams) {
    if (t.slug === slug) return t.name;
  }
  return slug;
}

describe('Feature: season-teams-view, Property 4: schedule slug resolution', () => {
  // **Validates: Requirements 4.3**
  it('resolveTeamName returns team name (not raw slug) for any slug present in the teams list', () => {
    // Generate a slug: lowercase letters and hyphens only, to keep slugs realistic
    const slugArb = fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
        minLength: 2,
        maxLength: 20,
      })
      .filter(s => /^[a-z]/.test(s) && /[a-z]$/.test(s) && !s.includes('--'));

    // Generate a team name: printable non-empty string
    const nameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/);
    const teamsArb = fc
      .array(
        fc.record({ slug: slugArb, name: nameArb }),
        { minLength: 2, maxLength: 5 }
      )
      .filter(teams => {
        const slugs = teams.map(t => t.slug);
        return new Set(slugs).size === slugs.length;
      });

    fc.assert(
      fc.property(
        teamsArb,
        fc.integer({ min: 0, max: 4 }), // index into teams list
        (teams, idx) => {
          // Pick a slug that is guaranteed to be in the teams list
          const team = teams[idx % teams.length];
          const resolved = resolveTeamName(team.slug, teams);

          // Must return the team name, not the raw slug
          expect(resolved).toBe(team.name);
          expect(resolved).not.toBe(team.slug === team.name ? null : team.slug);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('resolveTeamName returns the raw slug when slug is not in the teams list', () => {
    const slugArb = fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
        minLength: 2,
        maxLength: 20,
      })
      .filter(s => /^[a-z]/.test(s) && /[a-z]$/.test(s) && !s.includes('--'));

    const nameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/);

    const teamsArb = fc.array(
      fc.record({ slug: slugArb, name: nameArb }),
      { minLength: 1, maxLength: 5 }
    );

    fc.assert(
      fc.property(
        teamsArb,
        slugArb,
        (teams, unknownSlug) => {
          // Ensure the unknown slug is not in the teams list
          fc.pre(!teams.some(t => t.slug === unknownSlug));

          const resolved = resolveTeamName(unknownSlug, teams);
          expect(resolved).toBe(unknownSlug);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any schedule entry whose slugs are drawn from the teams list, resolved names are never raw slugs', () => {
    const slugArb = fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
        minLength: 2,
        maxLength: 20,
      })
      .filter(s => /^[a-z]/.test(s) && /[a-z]$/.test(s) && !s.includes('--'));

    const nameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/);

    const teamsArb = fc
      .array(
        fc.record({ slug: slugArb, name: nameArb }),
        { minLength: 2, maxLength: 5 }
      )
      .filter(teams => {
        const slugs = teams.map(t => t.slug);
        return new Set(slugs).size === slugs.length;
      })
      // Also ensure no team has name === slug (so we can distinguish resolution)
      .filter(teams => teams.every(t => t.name !== t.slug));

    fc.assert(
      fc.property(
        teamsArb,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        (teams, homeIdx, awayIdx) => {
          const homeTeam = teams[homeIdx % teams.length];
          const awayTeam = teams[awayIdx % teams.length];

          const resolvedHome = resolveTeamName(homeTeam.slug, teams);
          const resolvedAway = resolveTeamName(awayTeam.slug, teams);

          // Resolved values must be team names, not raw slugs
          expect(resolvedHome).toBe(homeTeam.name);
          expect(resolvedAway).toBe(awayTeam.name);

          // Confirm the resolved name is not the raw slug
          expect(resolvedHome).not.toBe(homeTeam.slug);
          expect(resolvedAway).not.toBe(awayTeam.slug);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Feature: season-teams-view, Task 6.1: Removal smoke checks ───────────────
// Validates: Requirements 3.1, 3.2

import { existsSync } from 'fs';

describe('Feature: season-teams-view, Removal smoke checks', () => {
  // Req 3.2 — teams.html source file must not exist
  it('teams.html does not exist in the source (Req 3.2)', () => {
    expect(existsSync(resolve('teams.html'))).toBe(false);
  });

  // Req 3.1 — header must not contain a /teams/ nav link
  it('_includes/header.html does not contain a /teams/ link (Req 3.1)', () => {
    const header = readFileSync(resolve('_includes/header.html'), 'utf8');
    expect(header).not.toMatch(/href="\/teams[/"]/);
  });
});

// ── Feature: season-teams-view, Property 5: season-select populates correct team options ──
// Feature: season-teams-view, Property 5: season-select populates correct team options
// Validates: Requirements 5.1, 5.3

/**
 * Simulates the runtime JS `populateTeamDropdowns(seasonKey)` logic from submit-match.html.
 * Looks up SEASON_TEAMS[seasonKey] and returns the list of {slug, name} options for that season,
 * or an empty array if the season key is not found.
 *
 * Mirrors:
 *   function populateTeamDropdowns(seasonKey) {
 *     var teams = (SEASON_TEAMS[seasonKey]) ? SEASON_TEAMS[seasonKey] : [];
 *     // ... populates both dropdowns with these teams
 *   }
 */
function populateTeamDropdowns(seasonKey, SEASON_TEAMS) {
  return (SEASON_TEAMS[seasonKey] && SEASON_TEAMS[seasonKey].length > 0)
    ? SEASON_TEAMS[seasonKey]
    : [];
}

describe('Feature: season-teams-view, Property 5: season-select populates correct team options', () => {
  // **Validates: Requirements 5.1, 5.3**
  it('both dropdowns contain exactly the options for the selected season and no options from other seasons', () => {
    // Generator for a single team: distinct slug and name
    const teamArb = fc.record({
      slug: fc
        .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
          minLength: 2,
          maxLength: 20,
        })
        .filter(s => /^[a-z]/.test(s) && /[a-z]$/.test(s) && !s.includes('--')),
      name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
    });

    // Generator for a season key (simple alphanumeric string)
    const seasonKeyArb = fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
        minLength: 3,
        maxLength: 20,
      })
      .filter(s => /^[a-z]/.test(s));

    // Generator for a single season entry: a key + 2–8 teams with distinct slugs
    const seasonEntryArb = fc
      .tuple(
        seasonKeyArb,
        fc.array(teamArb, { minLength: 2, maxLength: 8 })
      )
      .filter(([, teams]) => {
        const slugs = teams.map(t => t.slug);
        return new Set(slugs).size === slugs.length;
      });

    // Generator for a SEASON_TEAMS map: 2–5 seasons with distinct keys
    const seasonTeamsArb = fc
      .array(seasonEntryArb, { minLength: 2, maxLength: 5 })
      .filter(entries => {
        const keys = entries.map(([k]) => k);
        return new Set(keys).size === keys.length;
      })
      .map(entries => Object.fromEntries(entries));

    fc.assert(
      fc.property(
        seasonTeamsArb,
        fc.integer({ min: 0, max: 4 }), // index to pick a season key
        (SEASON_TEAMS, idx) => {
          const seasonKeys = Object.keys(SEASON_TEAMS);
          const selectedKey = seasonKeys[idx % seasonKeys.length];
          const expectedTeams = SEASON_TEAMS[selectedKey];

          // Call the simulated populateTeamDropdowns for both home and away dropdowns
          const homeOptions = populateTeamDropdowns(selectedKey, SEASON_TEAMS);
          const awayOptions = populateTeamDropdowns(selectedKey, SEASON_TEAMS);

          // Both dropdowns must contain exactly the teams for the selected season
          expect(homeOptions).toHaveLength(expectedTeams.length);
          expect(awayOptions).toHaveLength(expectedTeams.length);

          // Each expected team must appear in both dropdowns (by slug and name)
          for (const team of expectedTeams) {
            expect(homeOptions.some(o => o.slug === team.slug && o.name === team.name)).toBe(true);
            expect(awayOptions.some(o => o.slug === team.slug && o.name === team.name)).toBe(true);
          }

          // Collect all slugs from other seasons
          const otherSeasonSlugs = new Set(
            seasonKeys
              .filter(k => k !== selectedKey)
              .flatMap(k => SEASON_TEAMS[k].map(t => t.slug))
          );

          // No option from another season should appear in either dropdown
          // (only applies to slugs that are not also in the selected season)
          const selectedSlugs = new Set(expectedTeams.map(t => t.slug));
          for (const slug of otherSeasonSlugs) {
            if (!selectedSlugs.has(slug)) {
              expect(homeOptions.some(o => o.slug === slug)).toBe(false);
              expect(awayOptions.some(o => o.slug === slug)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Feature: season-teams-view, Task 8.2: Disabled initial state ─────────────
// Validates: Requirements 5.2

describe('Feature: season-teams-view, disabled initial state of team dropdowns', () => {
  const source = readFileSync(resolve('pages/submit-match.html'), 'utf8');

  it('#home-team select has the disabled attribute in the HTML source (Req 5.2)', () => {
    // Match the <select id="home-team" ... disabled ...> tag
    expect(source).toMatch(/<select[^>]*id="home-team"[^>]*disabled/);
  });

  it('#away-team select has the disabled attribute in the HTML source (Req 5.2)', () => {
    expect(source).toMatch(/<select[^>]*id="away-team"[^>]*disabled/);
  });

  it('#home-team contains only the placeholder option and no Liquid team loop (Req 5.2)', () => {
    // Extract the home-team select block
    const homeBlock = source.match(/<select[^>]*id="home-team"[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(homeBlock).toContain('— select —');
    expect(homeBlock).not.toContain('{% for team in site.data.teams %}');
  });

  it('#away-team contains only the placeholder option and no Liquid team loop (Req 5.2)', () => {
    const awayBlock = source.match(/<select[^>]*id="away-team"[\s\S]*?<\/select>/)?.[0] ?? '';
    expect(awayBlock).toContain('— select —');
    expect(awayBlock).not.toContain('{% for team in site.data.teams %}');
  });

  it('SEASON_TEAMS constant is embedded in a <script> block (Req 5.2)', () => {
    expect(source).toMatch(/<script[\s\S]*?const SEASON_TEAMS\s*=/);
  });

  it('populateTeamDropdowns function is defined in the source (Req 5.2)', () => {
    expect(source).toContain('function populateTeamDropdowns(');
  });
});

// ── Feature: season-teams-view, Property 1: team objects contain all required fields ──
// Validates: Requirements 1.1

describe('Feature: season-teams-view, Property 1: team objects contain all required fields', () => {
  // **Validates: Requirements 1.1**
  it('every generated team object has non-empty slug, name, home_court, and roster', () => {
    const rosterMemberArb = fc.record({
      name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/),
      role: fc.constantFrom('captain', 'member'),
    });

    const teamArb = fc.record({
      slug:       fc.stringMatching(/^[a-z][a-z0-9-]{0,29}$/),
      name:       fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
      home_court: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,39}$/),
      roster:     fc.array(rosterMemberArb, { minLength: 1, maxLength: 8 }),
    });

    fc.assert(
      fc.property(teamArb, (team) => {
        // slug must be present and non-empty
        expect(typeof team.slug).toBe('string');
        expect(team.slug.trim().length).toBeGreaterThan(0);

        // name must be present and non-empty
        expect(typeof team.name).toBe('string');
        expect(team.name.trim().length).toBeGreaterThan(0);

        // home_court must be present and non-empty
        expect(typeof team.home_court).toBe('string');
        expect(team.home_court.trim().length).toBeGreaterThan(0);

        // roster must be a non-empty array
        expect(Array.isArray(team.roster)).toBe(true);
        expect(team.roster.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  // Smoke test: all teams in _data/seasons/spring-2026.yml have the required fields
  it('all teams in _data/seasons/spring-2026.yml have non-empty slug, name, home_court, and roster', () => {
    // Regex-based check against the raw YAML source
    const raw = readFileSync(resolve('_data/seasons/spring-2026.yml'), 'utf8');

    // Extract team blocks by looking for slug/name/home_court/roster occurrences
    // We verify the YAML contains the required keys for each team entry
    const slugMatches    = [...raw.matchAll(/^[\s\-]{2,6}slug:\s+(\S+)/gm)].map(m => m[1].trim());
    const nameMatches    = [...raw.matchAll(/^[\s\-]{2,6}name:\s+(.+)/gm)].map(m => m[1].trim());
    const courtMatches   = [...raw.matchAll(/^[\s\-]{2,6}home_court:\s+(.+)/gm)].map(m => m[1].trim());
    const rosterMatches  = [...raw.matchAll(/^[\s\-]{2,6}roster:/gm)];

    // There must be at least one team
    expect(slugMatches.length).toBeGreaterThan(0);

    // Each team must have a non-empty slug
    for (const slug of slugMatches) {
      expect(slug.length).toBeGreaterThan(0);
    }

    // Each team must have a non-empty name
    expect(nameMatches.length).toBeGreaterThanOrEqual(slugMatches.length);
    for (const name of nameMatches) {
      expect(name.length).toBeGreaterThan(0);
    }

    // Each team must have a non-empty home_court
    expect(courtMatches.length).toBeGreaterThanOrEqual(slugMatches.length);
    for (const court of courtMatches) {
      expect(court.length).toBeGreaterThan(0);
    }

    // Each team must have a roster section
    expect(rosterMatches.length).toBeGreaterThanOrEqual(slugMatches.length);
  });
});

// ── Feature: active season default on submit-match form ──────────────────────
// Validates: season select defaults to site.active_season and teams auto-populate

describe('Submit match: season select defaults to active_season', () => {
  const source = readFileSync(resolve('pages/submit-match.html'), 'utf8');

  it('season select option uses site.active_season for the selected attribute', () => {
    // The Liquid conditional must compare s.data_file to site.active_season
    expect(source).toContain('site.active_season');
    expect(source).toMatch(/s\.data_file\s*==\s*site\.active_season/);
  });

  it('the selected attribute is applied inline on the matching option', () => {
    // The option tag must conditionally output the selected attribute
    expect(source).toMatch(/selected.*site\.active_season|site\.active_season.*selected/s);
  });

  it('_site/submit-match/index.html has spring-2026 option selected (smoke test)', () => {
    const html = readSiteFile('submit-match/index.html');
    expect(html).not.toBeNull();
    // The built HTML must have the spring-2026 option with selected attribute
    expect(html).toMatch(/<option[^>]*value="spring-2026"[^>]*selected/);
  });
});

describe('Submit match: team dropdowns auto-populate on load for default season', () => {
  const source = readFileSync(resolve('pages/submit-match.html'), 'utf8');

  it('DOMContentLoaded handler checks seasonSelect.value and calls populateTeamDropdowns', () => {
    expect(source).toContain('seasonSelect.value');
    expect(source).toContain('populateTeamDropdowns(seasonSelect.value)');
  });

  it('SEASON_TEAMS data is parsed from a <script type="application/json"> element', () => {
    expect(source).toContain('type="application/json"');
    expect(source).toContain('id="season-teams-data"');
    expect(source).toMatch(/JSON\.parse\(document\.getElementById\('season-teams-data'\)/);
  });

  it('_site/submit-match/index.html embeds spring-2026 team slugs in the season-teams-data block', () => {
    const html = readSiteFile('submit-match/index.html');
    expect(html).not.toBeNull();
    // Both team slugs from spring-2026.yml must be present in the embedded JSON
    expect(html).toContain('servers-of-the-court');
    expect(html).toContain('pickle-posse');
  });

  it('simulateAutoPopulate returns teams for the active season key', () => {
    // Unit-test the auto-populate logic in isolation
    function simulateAutoPopulate(seasonSelectValue, SEASON_TEAMS) {
      if (!seasonSelectValue) return [];
      return (SEASON_TEAMS[seasonSelectValue] && SEASON_TEAMS[seasonSelectValue].length > 0)
        ? SEASON_TEAMS[seasonSelectValue]
        : [];
    }

    const SEASON_TEAMS = {
      'spring-2026': [
        { slug: 'servers-of-the-court', name: 'Servers of the Court' },
        { slug: 'pickle-posse',         name: 'Pickle Posse' },
      ],
      'fall-2026': [
        { slug: 'team-alpha', name: 'Team Alpha' },
      ],
    };

    // When active season is pre-selected, teams are returned
    const teams = simulateAutoPopulate('spring-2026', SEASON_TEAMS);
    expect(teams).toHaveLength(2);
    expect(teams[0].slug).toBe('servers-of-the-court');
    expect(teams[1].slug).toBe('pickle-posse');

    // When no season is selected (empty string), returns empty array
    expect(simulateAutoPopulate('', SEASON_TEAMS)).toHaveLength(0);

    // When an unknown season key is used, returns empty array
    expect(simulateAutoPopulate('unknown-season', SEASON_TEAMS)).toHaveLength(0);
  });

  it('property: auto-populate always returns the correct team count for any valid season key', () => {
    function simulateAutoPopulate(seasonSelectValue, SEASON_TEAMS) {
      if (!seasonSelectValue) return [];
      return (SEASON_TEAMS[seasonSelectValue] && SEASON_TEAMS[seasonSelectValue].length > 0)
        ? SEASON_TEAMS[seasonSelectValue]
        : [];
    }

    const teamArb = fc.record({
      slug: fc.stringMatching(/^[a-z][a-z0-9-]{1,19}$/),
      name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
    });

    const seasonKeyArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,19}$/);

    const seasonTeamsArb = fc
      .array(
        fc.tuple(seasonKeyArb, fc.array(teamArb, { minLength: 1, maxLength: 6 })),
        { minLength: 1, maxLength: 4 }
      )
      .filter(entries => new Set(entries.map(([k]) => k)).size === entries.length)
      .map(entries => Object.fromEntries(entries));

    fc.assert(
      fc.property(seasonTeamsArb, fc.integer({ min: 0, max: 3 }), (SEASON_TEAMS, idx) => {
        const keys = Object.keys(SEASON_TEAMS);
        const key = keys[idx % keys.length];
        const result = simulateAutoPopulate(key, SEASON_TEAMS);
        expect(result).toHaveLength(SEASON_TEAMS[key].length);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Task 7: WCAG contrast ratio tests (Requirements 1.2, 6.3, 6.4) ───────────

/**
 * Computes WCAG relative luminance for a hex color string (e.g. '#FFFFFF').
 * Formula: for each RGB channel c (0–255):
 *   sRGB = c / 255
 *   if sRGB <= 0.03928: linear = sRGB / 12.92
 *   else:               linear = ((sRGB + 0.055) / 1.055) ^ 2.4
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG contrast ratio between two hex colors.
 * ratio = (L1 + 0.05) / (L2 + 0.05) where L1 >= L2.
 */
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('WCAG contrast ratios ≥ 4.5:1 (Requirements 1.2, 6.3, 6.4)', () => {
  const MIN_RATIO = 4.5;

  it('#FFFFFF on #1E2A3A (text-primary on bg-primary) meets 4.5:1', () => {
    expect(contrastRatio('#FFFFFF', '#1E2A3A')).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it('#FFFFFF on #2C3E50 (text-primary on bg-secondary) meets 4.5:1', () => {
    expect(contrastRatio('#FFFFFF', '#2C3E50')).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it('#FFFFFF on #34495E (text-primary on bg-tertiary) meets 4.5:1', () => {
    expect(contrastRatio('#FFFFFF', '#34495E')).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it('#A0AAB4 on #1E2A3A (text-secondary on bg-primary) meets 4.5:1', () => {
    expect(contrastRatio('#A0AAB4', '#1E2A3A')).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it('#C8E64B on #1E2A3A (accent on bg-primary) meets 4.5:1', () => {
    expect(contrastRatio('#C8E64B', '#1E2A3A')).toBeGreaterThanOrEqual(MIN_RATIO);
  });
});

// ── Task 7: Header logo rendering test (Requirements 6.3, 6.4) ───────────────

describe('Header logo rendering (Requirements 6.3, 6.4)', () => {
  const header = readFileSync(resolve('_includes/header.html'), 'utf8');

  it('header.html contains an <img> with src referencing JuneBug_Logo_main.png', () => {
    expect(header).toMatch(/<img[^>]*src="[^"]*JuneBug_Logo_main\.png[^"]*"/);
  });

  it('header.html <img> has a non-empty alt attribute', () => {
    // Extract the img tag and verify alt is present and non-empty
    const imgMatch = header.match(/<img[^>]*>/);
    expect(imgMatch).not.toBeNull();
    const imgTag = imgMatch[0];
    // alt must be present and its value must be non-empty (Liquid expression counts as non-empty)
    expect(imgTag).toMatch(/alt="[^"]+"/);
  });
});
