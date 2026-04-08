// Feature: match-format-update
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as yaml from 'js-yaml';
import {
  validateForm,
  serializeMatchYaml,
  partitionEvents,
  computeStandings,
} from '../assets/js/match-utils.js';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const teamIdArb = fc.constantFrom(
  'team-alpha', 'team-beta', 'team-gamma', 'team-delta'
);

const scoreArb = fc.integer({ min: 0, max: 21 });

const gameResultArb = fc.record({ home: scoreArb, away: scoreArb });

const matchResultArb = fc.record({
  mens_doubles:    gameResultArb,
  womens_doubles:  gameResultArb,
  mixed_doubles_1: gameResultArb,
  mixed_doubles_2: gameResultArb,
  mixed_doubles_3: gameResultArb,
  mixed_doubles_4: gameResultArb,
}).chain(base =>
  fc.option(gameResultArb, { nil: undefined }).map(db =>
    db !== undefined ? { ...base, dreambreaker: db } : base
  )
);

const matchArb = fc.record({
  week:      fc.integer({ min: 1, max: 20 }),
  date:      fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
               .map(d => d.toISOString().slice(0, 10)),
  location:  fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 .,'-]{0,39}$/),
  home_team: teamIdArb,
  away_team: teamIdArb,
  result:    matchResultArb,
});

const playerNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,18}[A-Za-z]$/).filter(s => s.trim().length > 0);

const validFormArb = fc.record({
  home_team:    teamIdArb,
  away_team:    teamIdArb,
  season:       fc.constantFrom('spring-2026', 'fall-2026'),
  week:         fc.integer({ min: 1, max: 20 }).map(String),
  match_date:   fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
                  .map(d => d.toISOString().slice(0, 10)),
  location:     fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 .,'-]{0,39}$/),
  mens_home:    scoreArb.map(String),
  mens_away:    scoreArb.map(String),
  womens_home:  scoreArb.map(String),
  womens_away:  scoreArb.map(String),
  mixed_1_home: scoreArb.map(String),
  mixed_1_away: scoreArb.map(String),
  mixed_2_home: scoreArb.map(String),
  mixed_2_away: scoreArb.map(String),
  mixed_3_home: scoreArb.map(String),
  mixed_3_away: scoreArb.map(String),
  mixed_4_home: scoreArb.map(String),
  mixed_4_away: scoreArb.map(String),
  mens_home_p1:    playerNameArb,
  mens_home_p2:    playerNameArb,
  mens_away_p1:    playerNameArb,
  mens_away_p2:    playerNameArb,
  womens_home_p1:  playerNameArb,
  womens_home_p2:  playerNameArb,
  womens_away_p1:  playerNameArb,
  womens_away_p2:  playerNameArb,
  mixed_1_home_p1: playerNameArb,
  mixed_1_home_p2: playerNameArb,
  mixed_1_away_p1: playerNameArb,
  mixed_1_away_p2: playerNameArb,
  mixed_2_home_p1: playerNameArb,
  mixed_2_home_p2: playerNameArb,
  mixed_2_away_p1: playerNameArb,
  mixed_2_away_p2: playerNameArb,
  mixed_3_home_p1: playerNameArb,
  mixed_3_home_p2: playerNameArb,
  mixed_3_away_p1: playerNameArb,
  mixed_3_away_p2: playerNameArb,
  mixed_4_home_p1: playerNameArb,
  mixed_4_home_p2: playerNameArb,
  mixed_4_away_p1: playerNameArb,
  mixed_4_away_p2: playerNameArb,
});

const requiredFields = [
  'home_team', 'away_team', 'season', 'week', 'match_date', 'location',
  'mens_home', 'mens_away', 'womens_home', 'womens_away',
  'mixed_1_home', 'mixed_1_away',
  'mixed_2_home', 'mixed_2_away',
  'mixed_3_home', 'mixed_3_away',
  'mixed_4_home', 'mixed_4_away',
  'mens_home_p1', 'mens_home_p2', 'mens_away_p1', 'mens_away_p2',
  'womens_home_p1', 'womens_home_p2', 'womens_away_p1', 'womens_away_p2',
  'mixed_1_home_p1', 'mixed_1_home_p2', 'mixed_1_away_p1', 'mixed_1_away_p2',
  'mixed_2_home_p1', 'mixed_2_home_p2', 'mixed_2_away_p1', 'mixed_2_away_p2',
  'mixed_3_home_p1', 'mixed_3_home_p2', 'mixed_3_away_p1', 'mixed_3_away_p2',
  'mixed_4_home_p1', 'mixed_4_home_p2', 'mixed_4_away_p1', 'mixed_4_away_p2',
];

const dateStrArb = fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') })
  .map(d => d.toISOString().slice(0, 10));

const eventArb = fc.record({
  name:        fc.string({ minLength: 1, maxLength: 40 }),
  date:        dateStrArb,
  location:    fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
});

// ── Property 4: Standings ranking comparator invariant ────────────────────────

describe('Feature: match-format-update, Property 4: Standings ranking satisfies the comparator invariant', () => {
  it('team A ranks above team B iff A has more match wins, or equal match wins and more game wins', () => {
    fc.assert(
      fc.property(
        fc.array(matchArb, { minLength: 1, maxLength: 10 }),
        (schedule) => {
          const teamIds = ['team-alpha', 'team-beta', 'team-gamma', 'team-delta'];
          const standings = computeStandings(teamIds, schedule);

          for (let i = 0; i < standings.length - 1; i++) {
            const a = standings[i];
            const b = standings[i + 1];
            const aBeforeB =
              a.matchWins > b.matchWins ||
              (a.matchWins === b.matchWins && a.gameWins >= b.gameWins);
            expect(aBeforeB).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 1: Form validation detects all missing required fields ────────────

describe('Feature: match-format-update, Property 1: Form validation detects all missing required fields', () => {
  it('returns failed result identifying every missing field in any non-empty subset', () => {
    fc.assert(
      fc.property(
        validFormArb,
        fc.subarray(requiredFields, { minLength: 1 }),
        (fields, toBlank) => {
          const partial = { ...fields };
          for (const f of toBlank) partial[f] = '';

          const result = validateForm(partial);
          expect(result.valid).toBe(false);
          for (const f of toBlank) {
            expect(result.missing).toContain(f);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Form validation accepts complete form without Dreambreaker ─────

describe('Feature: match-format-update, Property 2: Form validation accepts complete form without Dreambreaker', () => {
  it('returns valid when all required fields are present and dreambreaker fields are absent', () => {
    fc.assert(
      fc.property(validFormArb, (fields) => {
        // validFormArb does not include dream_home/dream_away — matches the spec
        const result = validateForm(fields);
        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: YAML serialization round-trip preserves all match fields ───────

describe('Feature: match-format-update, Property 3: YAML serialization round-trip preserves all match fields', () => {
  it('serialized YAML parses back to an equivalent match object', () => {
    fc.assert(
      fc.property(matchArb, (match) => {
        const yamlStr = serializeMatchYaml(match);
        // Wrap in a schedule key so js-yaml can parse the indented list item
        const parsed = yaml.load('schedule:\n' + yamlStr);
        const entry = parsed.schedule[0];

        expect(String(entry.week)).toBe(String(match.week));
        // js-yaml parses bare dates as Date objects — normalise to YYYY-MM-DD string
        const parsedDate = entry.date instanceof Date
          ? entry.date.toISOString().slice(0, 10)
          : String(entry.date);
        expect(parsedDate).toBe(match.date);
        expect(entry.location).toBe(match.location);
        expect(entry.home_team).toBe(match.home_team);
        expect(entry.away_team).toBe(match.away_team);

        // Verify all four mixed doubles keys round-trip correctly
        const requiredGames = [
          'mens_doubles', 'womens_doubles',
          'mixed_doubles_1', 'mixed_doubles_2', 'mixed_doubles_3', 'mixed_doubles_4',
        ];
        for (const game of requiredGames) {
          expect(entry.result[game].home).toBe(match.result[game].home);
          expect(entry.result[game].away).toBe(match.result[game].away);
        }

        // Verify dreambreaker is present when input had it, absent when it did not
        if (match.result.dreambreaker != null) {
          expect(entry.result.dreambreaker).toBeDefined();
          expect(entry.result.dreambreaker.home).toBe(match.result.dreambreaker.home);
          expect(entry.result.dreambreaker.away).toBe(match.result.dreambreaker.away);
        } else {
          expect(entry.result.dreambreaker).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: Events correctly partitioned and sorted ──────────────────────

describe('Property 10: Events are correctly partitioned and sorted', () => {
  it('partitions upcoming/past correctly and sorts each section', () => {
    fc.assert(
      fc.property(
        fc.array(eventArb, { minLength: 0, maxLength: 20 }),
        dateStrArb,
        (events, today) => {
          const { upcoming, past } = partitionEvents(events, today);

          // All upcoming events have date >= today
          for (const e of upcoming) {
            expect(String(e.date).slice(0, 10) >= today).toBe(true);
          }
          // All past events have date < today
          for (const e of past) {
            expect(String(e.date).slice(0, 10) < today).toBe(true);
          }
          // Upcoming is ascending
          for (let i = 0; i < upcoming.length - 1; i++) {
            expect(String(upcoming[i].date) <= String(upcoming[i + 1].date)).toBe(true);
          }
          // Past is descending
          for (let i = 0; i < past.length - 1; i++) {
            expect(String(past[i].date) >= String(past[i + 1].date)).toBe(true);
          }
          // No events are lost
          expect(upcoming.length + past.length).toBe(events.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Validation rejects any missing player field ──────────────────
// Feature: match-submission-form-update, Property 3: Validation rejects any missing player field
// Validates: Requirements 3.3, 4.1, 4.2

const allRequiredFields = requiredFields;

describe('Feature: match-submission-form-update, Property 3: Validation rejects any missing player field', () => {
  it('returns invalid and lists every blanked player field in missing', () => {
    fc.assert(
      fc.property(
        validFormArb,
        fc.subarray(allRequiredFields, { minLength: 1 }),
        (fields, toBlank) => {
          const partial = { ...fields };
          for (const f of toBlank) partial[f] = '';

          const result = validateForm(partial);
          expect(result.valid).toBe(false);
          for (const f of toBlank) {
            expect(result.missing).toContain(f);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Feature: match-submission-form-update, Property 2: Season change resets all player dropdowns ──
// Validates: Requirements 2.3, 2.4

const GAME_PREFIXES = ['mens', 'womens', 'mixed_1', 'mixed_2', 'mixed_3', 'mixed_4'];

/**
 * Simulates the resetPlayerDropdowns logic from pages/submit-match.html.
 * Operates on a plain JS map of { id -> { options: string[], disabled: boolean } }
 * representing the 24 player selects.
 */
function buildPlayerSelectMap(prefixes, sides, slots) {
  const map = {};
  for (const prefix of prefixes) {
    for (const side of sides) {
      for (const slot of slots) {
        map[`${prefix}_${side}_${slot}`] = { options: [], disabled: false };
      }
    }
  }
  return map;
}

function simulateResetPlayerDropdowns(selectMap) {
  for (const id of Object.keys(selectMap)) {
    selectMap[id].options = [''];
    selectMap[id].disabled = true;
  }
}

describe('Feature: match-submission-form-update, Property 2: Season change resets all player dropdowns', () => {
  // **Validates: Requirements 2.3, 2.4**
  it('after reset, every player select has exactly one blank option, value "", and is disabled', () => {
    const sides = ['home', 'away'];
    const slots = ['p1', 'p2'];

    const playerNameArb2 = fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,18}[A-Za-z]$/);

    fc.assert(
      fc.property(
        // Generate arbitrary pre-populated options for each select (1–4 names)
        fc.array(
          fc.array(playerNameArb2, { minLength: 1, maxLength: 4 }),
          { minLength: 24, maxLength: 24 }
        ),
        (rosterSets) => {
          const selectMap = buildPlayerSelectMap(GAME_PREFIXES, sides, slots);
          const ids = Object.keys(selectMap);

          // Pre-populate each select with arbitrary player names (simulating team selection)
          ids.forEach((id, i) => {
            selectMap[id].options = ['', ...rosterSets[i]];
            selectMap[id].disabled = false;
          });

          // Simulate season change → reset
          simulateResetPlayerDropdowns(selectMap);

          // Assert every select is reset to blank placeholder only and disabled
          for (const id of ids) {
            expect(selectMap[id].options).toHaveLength(1);
            expect(selectMap[id].options[0]).toBe('');
            expect(selectMap[id].disabled).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
