// Feature: pickleball-club-site
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
  mens_doubles:   gameResultArb,
  womens_doubles: gameResultArb,
  mixed_doubles:  gameResultArb,
  dreambreaker:   gameResultArb,
});

const matchArb = fc.record({
  week:      fc.integer({ min: 1, max: 20 }),
  date:      fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
               .map(d => d.toISOString().slice(0, 10)),
  location:  fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0 && !s.includes('\n') && !s.includes('"') && !s.includes('\\')),
  home_team: teamIdArb,
  away_team: teamIdArb,
  result:    matchResultArb,
});

const validFormArb = fc.record({
  home_team:   teamIdArb,
  away_team:   teamIdArb,
  season:      fc.constantFrom('spring-2026', 'fall-2026'),
  week:        fc.integer({ min: 1, max: 20 }).map(String),
  match_date:  fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') })
                 .map(d => d.toISOString().slice(0, 10)),
  location:    fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0 && !s.includes('\n') && !s.includes('"') && !s.includes('\\')),
  mens_home:   scoreArb.map(String),
  mens_away:   scoreArb.map(String),
  womens_home: scoreArb.map(String),
  womens_away: scoreArb.map(String),
  mixed_home:  scoreArb.map(String),
  mixed_away:  scoreArb.map(String),
  dream_home:  scoreArb.map(String),
  dream_away:  scoreArb.map(String),
});

const requiredFields = [
  'home_team', 'away_team', 'season', 'week', 'match_date', 'location',
  'mens_home', 'mens_away', 'womens_home', 'womens_away',
  'mixed_home', 'mixed_away', 'dream_home', 'dream_away',
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

describe('Property 4: Standings ranking satisfies win comparator invariant', () => {
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

// ── Property 6: Form validation identifies all missing required fields ─────────

describe('Property 6: Form validation identifies all missing required fields', () => {
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

  it('returns valid when all required fields are present', () => {
    fc.assert(
      fc.property(validFormArb, (fields) => {
        const result = validateForm(fields);
        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 9: YAML serialization round-trip preserves match data ────────────

describe('Property 9: YAML serialization round-trip preserves match data', () => {
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

        const games = ['mens_doubles', 'womens_doubles', 'mixed_doubles', 'dreambreaker'];
        for (const game of games) {
          expect(entry.result[game].home).toBe(match.result[game].home);
          expect(entry.result[game].away).toBe(match.result[game].away);
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
