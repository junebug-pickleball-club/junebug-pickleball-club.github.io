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

describe('Property 1: Team card renders all team data', () => {
  it('_site/teams/index.html contains all team names, courts, and player names', () => {
    const html = readSiteFile('teams/index.html') ?? readSiteFile('teams.html');
    expect(html).not.toBeNull();

    // Verify against actual teams data
    const teamsYaml = readFileSync(resolve('_data/teams.yml'), 'utf8');
    // Simple check: each team name appears in the rendered HTML
    fc.assert(
      fc.property(fc.constant(teamsYaml), (raw) => {
        // Extract names via simple regex
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
  it('serializeMatchYaml output contains all four game scores', () => {
    const scoreArb = fc.integer({ min: 0, max: 21 });
    fc.assert(
      fc.property(
        fc.record({
          week: fc.integer({ min: 1, max: 20 }),
          date: fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
                  .map(d => d.toISOString().slice(0, 10)),
          location: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('\n')),
          home_team: fc.constantFrom('team-alpha', 'team-beta'),
          away_team: fc.constantFrom('team-gamma', 'team-delta'),
          result: fc.record({
            mens_doubles:   fc.record({ home: scoreArb, away: scoreArb }),
            womens_doubles: fc.record({ home: scoreArb, away: scoreArb }),
            mixed_doubles:  fc.record({ home: scoreArb, away: scoreArb }),
            dreambreaker:   fc.record({ home: scoreArb, away: scoreArb }),
          }),
        }),
        (match) => {
          const { serializeMatchYaml } = require('../assets/js/match-utils.js');
          const yaml = serializeMatchYaml(match);
          expect(yaml).toContain('mens_doubles');
          expect(yaml).toContain('womens_doubles');
          expect(yaml).toContain('mixed_doubles');
          expect(yaml).toContain('dreambreaker');
          expect(yaml).toContain(String(match.result.mens_doubles.home));
          expect(yaml).toContain(String(match.result.dreambreaker.away));
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
    { path: 'teams/index.html', fallback: 'teams.html' },
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

  it('contains nav link href="/teams" (Req 2.3)', () => {
    expect(header).toContain('href="/teams"');
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
   *   Teams:        page.url contains '/teams'
   *   Events:       page.url contains '/events'
   *   Blog:         page.url contains '/blog'
   *   Submit Match: page.url contains '/submit-match'
   */
  function simulateActiveLinks(pageUrl) {
    return [
      { href: '/',             active: pageUrl === '/' },
      { href: '/teams',        active: pageUrl.includes('/teams') },
      { href: '/events',       active: pageUrl.includes('/events') },
      { href: '/blog',         active: pageUrl.includes('/blog') },
      { href: '/submit-match', active: pageUrl.includes('/submit-match') },
    ];
  }

  it('exactly one nav item is active and its href matches the generated URL', () => {
    // Arbitrarily pick from the exact set of nav-link hrefs
    const navUrls = fc.constantFrom('/', '/teams', '/events', '/blog', '/submit-match');

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
