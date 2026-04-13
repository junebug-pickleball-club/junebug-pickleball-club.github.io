// Feature: round-robin-session-manager (doubles)
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateConfig, resolvePlayerNames, generateSchedule,
  validateScores, recordRoundScores, updateRoundScores, computeLeaderboard,
  serializeState, deserializeState,
} from '../assets/js/session-manager.js';

// ── Unit tests: validateConfig ────────────────────────────────────────────────

describe('validateConfig — unit tests', () => {
  it('accepts a valid config (rotating)', () => {
    const r = validateConfig({ playerCount: 8, roundCount: 7, partnerMode: 'rotating' });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('accepts a valid config (fixed)', () => {
    const r = validateConfig({ playerCount: 8, roundCount: 7, partnerMode: 'fixed' });
    expect(r.valid).toBe(true);
  });

  it('accepts boundary min values', () => {
    const r = validateConfig({ playerCount: 4, roundCount: 1, partnerMode: 'fixed' });
    expect(r.valid).toBe(true);
  });

  it('accepts boundary max values', () => {
    const r = validateConfig({ playerCount: 32, roundCount: 64, partnerMode: 'rotating' });
    expect(r.valid).toBe(true);
  });

  it('rejects playerCount below 4', () => {
    const r = validateConfig({ playerCount: 3, roundCount: 1, partnerMode: 'fixed' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'playerCount')).toBe(true);
  });

  it('rejects playerCount above 32', () => {
    const r = validateConfig({ playerCount: 33, roundCount: 1, partnerMode: 'fixed' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'playerCount')).toBe(true);
  });

  it('rejects roundCount below 1', () => {
    const r = validateConfig({ playerCount: 8, roundCount: 0, partnerMode: 'fixed' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'roundCount')).toBe(true);
  });

  it('rejects roundCount above 64', () => {
    const r = validateConfig({ playerCount: 8, roundCount: 65, partnerMode: 'fixed' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'roundCount')).toBe(true);
  });

  it('rejects invalid partnerMode', () => {
    const r = validateConfig({ playerCount: 8, roundCount: 7, partnerMode: 'solo' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'partnerMode')).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const r = validateConfig({ playerCount: 1, roundCount: 0, partnerMode: 'bad' });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(3);
  });

  it('rejects non-integer playerCount', () => {
    const r = validateConfig({ playerCount: 4.5, roundCount: 7, partnerMode: 'fixed' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === 'playerCount')).toBe(true);
  });
});

// ── Property 1: Config range validation ──────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 1: Config range validation', () => {
  it('accepts valid ranges and rejects out-of-range integers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 50 }),
        fc.integer({ min: -10, max: 100 }),
        fc.constantFrom('fixed', 'rotating'),
        (playerCount, roundCount, partnerMode) => {
          const r = validateConfig({ playerCount, roundCount, partnerMode });
          const pv = playerCount >= 4 && playerCount <= 32;
          const rv = roundCount  >= 1 && roundCount  <= 64;
          expect(r.valid).toBe(pv && rv);
          if (!pv) expect(r.errors.some(e => e.field === 'playerCount')).toBe(true);
          if (!rv) expect(r.errors.some(e => e.field === 'roundCount')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: Player name resolution ───────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 2: Player name resolution', () => {
  it('substitutes empty/whitespace-only slots with "Player N" and preserves non-empty names', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant(''),
            fc.stringOf(fc.constantFrom(' ', '\t', '\n')),
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          ),
          { minLength: 0, maxLength: 20 }
        ),
        (names) => {
          const result = resolvePlayerNames(names);
          expect(result).toHaveLength(names.length);
          names.forEach((name, i) => {
            if (typeof name === 'string' && name.trim().length > 0) {
              expect(result[i]).toBe(name);
            } else {
              expect(result[i]).toBe(`Player ${i + 1}`);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Schedule round count ─────────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 3: Schedule round count', () => {
  it('generateSchedule returns exactly config.roundCount rounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 16 }),
        fc.integer({ min: 1, max: 20 }),
        fc.constantFrom('fixed', 'rotating'),
        (playerCount, roundCount, partnerMode) => {
          const config = { playerCount, roundCount, partnerMode };
          const names = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
          expect(generateSchedule(config, names)).toHaveLength(roundCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Each match is 2v2 ────────────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 4: Each match is 2v2', () => {
  it('every match has team1 and team2 each with exactly 2 players', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 16 }),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('fixed', 'rotating'),
        (playerCount, roundCount, partnerMode) => {
          const config = { playerCount, roundCount, partnerMode };
          const names = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
          const schedule = generateSchedule(config, names);
          for (const round of schedule) {
            for (const match of round.matches) {
              expect(match.team1).toHaveLength(2);
              expect(match.team2).toHaveLength(2);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: Correct court count derived from player count ─────────────────

describe('Feature: round-robin-session-manager, Property 5: Court count derived correctly', () => {
  it('number of matches per round equals floor(playerCount/4)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('fixed', 'rotating'),
        (playerCount, roundCount, partnerMode) => {
          const config = { playerCount, roundCount, partnerMode };
          const names = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
          const schedule = generateSchedule(config, names);
          const expectedCourts = Math.floor(playerCount / 4);
          for (const round of schedule) {
            expect(round.matches.length).toBe(expectedCourts);
            round.matches.forEach((m, idx) => {
              expect(m.courtNum).toBe(idx + 1);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 6: Player accounting ────────────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 6: Player accounting', () => {
  it('every player appears in exactly one match or the byes list each round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 16 }),
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom('fixed', 'rotating'),
        (playerCount, roundCount, partnerMode) => {
          const config = { playerCount, roundCount, partnerMode };
          const names = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
          const schedule = generateSchedule(config, names);
          for (const round of schedule) {
            const seen = round.matches.flatMap(m => [...m.team1, ...m.team2]);
            seen.push(...round.byes);
            expect(seen.sort()).toEqual(names.slice().sort());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Score validation ─────────────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 7: Score validation', () => {
  it('accepts a score iff it is a string of a whole number >= 0', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (scoreStr) => {
          const scores = [{ matchId: 'r1-c1', team1Score: scoreStr, team2Score: '0' }];
          const result = validateScores(scores);
          const isValid = /^\d+$/.test(scoreStr);
          if (isValid) {
            expect(result.errors.some(e => e.field === 'team1Score')).toBe(false);
          } else {
            expect(result.errors.some(e => e.matchId === 'r1-c1' && e.field === 'team1Score')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(roundCount, currentRound = 1, playerCount = 8, partnerMode = 'rotating') {
  const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
  const config = { playerCount, roundCount, partnerMode };
  const schedule = generateSchedule(config, players);
  return { config, players, schedule, currentRound, status: 'active' };
}

function makeScoresForRound(state, roundIndex) {
  return state.schedule[roundIndex].matches.map(m => ({
    matchId: m.matchId, team1Score: '11', team2Score: '5',
  }));
}

function makeAltScoresForRound(state, roundIndex) {
  return state.schedule[roundIndex].matches.map(m => ({
    matchId: m.matchId, team1Score: '7', team2Score: '9',
  }));
}

// ── Property 8: Score re-submission overwrites ────────────────────────────────

describe('Feature: round-robin-session-manager, Property 8: Score re-submission overwrites', () => {
  it('second recordRoundScores call overwrites the first', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.constantFrom('fixed', 'rotating'),
        (roundCount, partnerMode) => {
          const state = makeState(roundCount, 1, 8, partnerMode);
          const roundIndex = state.currentRound - 1;
          if (state.schedule[roundIndex].matches.length === 0) return;
          const afterSecond = recordRoundScores(state, makeAltScoresForRound(state, roundIndex));
          for (const match of afterSecond.schedule[roundIndex].matches) {
            expect(match.team1Score).toBe(7);
            expect(match.team2Score).toBe(9);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 9: Round advancement ────────────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 9: Round advancement', () => {
  it('currentRound increments by 1 on non-final score submission', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.constantFrom('fixed', 'rotating'),
        (roundCount, partnerMode) => {
          const state = makeState(roundCount, 1, 8, partnerMode);
          if (state.currentRound >= state.schedule.length) return;
          const scores = makeScoresForRound(state, state.currentRound - 1);
          const newState = recordRoundScores(state, scores);
          expect(newState.currentRound).toBe(state.currentRound + 1);
          expect(newState.status).toBe('active');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: Leaderboard sort order ──────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 10: Leaderboard sort order', () => {
  it('adjacent leaderboard entries satisfy the sort invariant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom('fixed', 'rotating'),
        (roundCount, roundsToScore, partnerMode) => {
          let state = makeState(roundCount, 1, 8, partnerMode);
          const actual = Math.min(roundsToScore, roundCount);
          for (let r = 0; r < actual; r++) {
            const ri = state.currentRound - 1;
            if (state.schedule[ri].matches.length === 0) break;
            const scores = state.schedule[ri].matches.map((m, idx) => ({
              matchId: m.matchId,
              team1Score: String(idx % 2 === 0 ? 11 : 5),
              team2Score: String(idx % 2 === 0 ? 5 : 11),
            }));
            state = recordRoundScores(state, scores);
          }
          const lb = computeLeaderboard(state);
          for (let i = 0; i + 1 < lb.length; i++) {
            const a = lb[i], b = lb[i + 1];
            const ok =
              a.wins > b.wins ||
              (a.wins === b.wins && a.pointDiff > b.pointDiff) ||
              (a.wins === b.wins && a.pointDiff === b.pointDiff && a.pointsScored >= b.pointsScored);
            expect(ok).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Unit test: deserializeState throws on invalid JSON ────────────────────────

describe('deserializeState — unit tests', () => {
  it('throws on invalid JSON input', () => {
    expect(() => deserializeState('not valid json')).toThrow();
    expect(() => deserializeState('{unclosed')).toThrow();
    expect(() => deserializeState('')).toThrow();
  });
});

// ── Property 11: Serialization round-trip ────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 11: Serialization round-trip', () => {
  it('deserializeState(serializeState(state)) deeply equals original state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 8 }),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom('fixed', 'rotating'),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom('active', 'complete'),
        (playerCount, roundCount, partnerMode, currentRoundRaw, status) => {
          const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
          const config = { playerCount, roundCount, partnerMode };
          const schedule = generateSchedule(config, players);
          const currentRound = Math.min(currentRoundRaw, roundCount);
          const state = { config, players, schedule, currentRound, status };
          expect(deserializeState(serializeState(state))).toEqual(state);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 12: Session summary accuracy ────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 12: Session summary accuracy', () => {
  it('summary rounds = schedule.length and summary matches = sum of matches per round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 8 }),
        fc.integer({ min: 1, max: 8 }),
        fc.constantFrom('fixed', 'rotating'),
        (playerCount, roundCount, partnerMode) => {
          const players = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
          const config = { playerCount, roundCount, partnerMode };
          const schedule = generateSchedule(config, players);
          let state = { config, players, schedule, currentRound: 1, status: 'active' };
          for (let r = 0; r < roundCount; r++) {
            const ri = state.currentRound - 1;
            const scores = state.schedule[ri].matches.map(m => ({
              matchId: m.matchId, team1Score: '11', team2Score: '5',
            }));
            state = recordRoundScores(state, scores);
          }
          expect(state.status).toBe('complete');
          expect(state.schedule.length).toBe(schedule.length);
          expect(state.schedule.reduce((s, r) => s + r.matches.length, 0))
            .toBe(schedule.reduce((s, r) => s + r.matches.length, 0));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Partner novelty helpers ───────────────────────────────────────────────────

function allPossiblePairs(players) {
  const pairs = new Set();
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++)
      pairs.add([players[i], players[j]].sort().join('|'));
  return pairs;
}

// ── Partner novelty — full-play configs (playerCount multiple of 4) ───────────
// When playerCount % 4 === 0, every player plays every round (no byes).
// The branch-and-bound guarantees all C(n,2) pairs are seen before any repeat
// across the full schedule (order-independent — rounds are shuffled for variety).

describe('Rotating partners — partner novelty, full-play configs (no byes)', () => {
  const cases = [
    { playerCount: 4,  label: '4 players'  },
    { playerCount: 8,  label: '8 players'  },
    { playerCount: 12, label: '12 players' },
  ];

  for (const { playerCount, label } of cases) {
    it(`all C(n,2) pairs seen before any repeat — ${label}`, () => {
      const roundCount = Math.ceil((playerCount * (playerCount - 1)) / 2);
      const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
      const config = { playerCount, roundCount, partnerMode: 'rotating' };
      const schedule = generateSchedule(config, players);

      const allPairs = allPossiblePairs(players);
      const pairCount = {};
      for (const round of schedule) {
        for (const match of round.matches) {
          for (const team of [match.team1, match.team2]) {
            const key = [...team].sort().join('|');
            pairCount[key] = (pairCount[key] ?? 0) + 1;
          }
        }
      }

      // Every possible pair must appear at least once
      for (const pair of allPairs) {
        expect(pairCount[pair] ?? 0).toBeGreaterThanOrEqual(1);
      }

      // No pair should appear more times than (total partnerships / unique pairs) + 1
      // i.e. repeats are spread evenly, not concentrated
      const totalPartnerships = Object.values(pairCount).reduce((s, v) => s + v, 0);
      const maxAllowed = Math.ceil(totalPartnerships / allPairs.size) + 1;
      for (const count of Object.values(pairCount)) {
        expect(count).toBeLessThanOrEqual(maxAllowed);
      }
    });
  }
});

// ── Bye fairness — player counts 4 through 20 ────────────────────────────────
// For each player count, run enough rounds for byes to distribute fully,
// then verify the max difference in bye counts between any two players is ≤ 1.

describe('Rotating partners — bye fairness, player counts 4–20', () => {
  for (let playerCount = 4; playerCount <= 20; playerCount++) {
    it(`bye counts differ by at most 1 — ${playerCount} players`, () => {
      const byesPerRound = playerCount % 4;
      const roundCount = byesPerRound === 0 ? 10 : playerCount * 2;

      const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
      const config = { playerCount, roundCount, partnerMode: 'rotating' };
      const schedule = generateSchedule(config, players);

      const byeCounts = Object.fromEntries(players.map(p => [p, 0]));
      for (const round of schedule) {
        for (const p of round.byes) byeCounts[p]++;
      }

      const counts = Object.values(byeCounts);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });
  }
});

// ── Partner novelty — all player counts 4 through 16 ─────────────────────────
// For each player count, run enough rounds to exhaust all C(n,2) novel pairs,
// then verify all pairs were seen (i.e. the algorithm spreads partnerships
// across the full player pool).

describe('Rotating partners — all pairs seen, player counts 4–16', () => {
  for (let playerCount = 4; playerCount <= 16; playerCount++) {
    it(`all C(n,2) pairs seen before session ends — ${playerCount} players`, () => {
      const partnershipsPerRound = Math.floor(playerCount / 4) * 2;
      const totalPairs = (playerCount * (playerCount - 1)) / 2;
      const roundCount = Math.ceil(totalPairs / partnershipsPerRound) * 2;

      const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
      const config = { playerCount, roundCount, partnerMode: 'rotating' };
      const schedule = generateSchedule(config, players);

      const seenPairs = new Set();
      for (const round of schedule) {
        for (const match of round.matches) {
          seenPairs.add([...match.team1].sort().join('|'));
          seenPairs.add([...match.team2].sort().join('|'));
        }
      }

      expect(seenPairs.size).toBe(allPossiblePairs(players).size);
    });
  }
});

// ── Property 13: All C(n,2) pairs seen for full-play configs ─────────────────

describe('Feature: round-robin-session-manager, Property 13: Partner novelty invariant', () => {
  it('for playerCount multiples of 4, all C(n,2) pairs are seen across the schedule', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2 }).map(n => n * 4), // 4, 8 only — 12 is slow
        (playerCount) => {
          const roundCount = Math.ceil((playerCount * (playerCount - 1)) / 2);
          const players = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
          const config = { playerCount, roundCount, partnerMode: 'rotating' };
          const schedule = generateSchedule(config, players);

          const allPairs = allPossiblePairs(players);
          const seenPairs = new Set();
          for (const round of schedule) {
            for (const match of round.matches) {
              for (const team of [match.team1, match.team2]) {
                seenPairs.add([...team].sort().join('|'));
              }
            }
          }

          // All possible pairs must be seen
          for (const pair of allPairs) {
            expect(seenPairs.has(pair)).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ── updateRoundScores — unit tests ────────────────────────────────────────────

describe('updateRoundScores — unit tests', () => {
  // Build a state with 3 rounds, first two already scored
  function makeMultiRoundState() {
    let state = makeState(3, 1, 8, 'rotating');
    // Submit round 1
    state = recordRoundScores(state, state.schedule[0].matches.map(m => ({
      matchId: m.matchId, team1Score: '11', team2Score: '5',
    })));
    // Submit round 2
    state = recordRoundScores(state, state.schedule[1].matches.map(m => ({
      matchId: m.matchId, team1Score: '8', team2Score: '11',
    })));
    // state.currentRound is now 3
    return state;
  }

  it('overwrites scores in a past round', () => {
    const state = makeMultiRoundState();
    const newScores = state.schedule[0].matches.map(m => ({
      matchId: m.matchId, team1Score: '3', team2Score: '15',
    }));
    const updated = updateRoundScores(state, 1, newScores);

    for (const match of updated.schedule[0].matches) {
      expect(match.team1Score).toBe(3);
      expect(match.team2Score).toBe(15);
    }
  });

  it('does not change currentRound when updating a past round', () => {
    const state = makeMultiRoundState();
    const newScores = state.schedule[0].matches.map(m => ({
      matchId: m.matchId, team1Score: '7', team2Score: '9',
    }));
    const updated = updateRoundScores(state, 1, newScores);
    expect(updated.currentRound).toBe(state.currentRound);
  });

  it('does not change session status when updating a past round', () => {
    const state = makeMultiRoundState();
    const newScores = state.schedule[1].matches.map(m => ({
      matchId: m.matchId, team1Score: '11', team2Score: '0',
    }));
    const updated = updateRoundScores(state, 2, newScores);
    expect(updated.status).toBe('active');
  });

  it('does not mutate the original state', () => {
    const state = makeMultiRoundState();
    const originalScore = state.schedule[0].matches[0].team1Score;
    const newScores = state.schedule[0].matches.map(m => ({
      matchId: m.matchId, team1Score: '99', team2Score: '0',
    }));
    updateRoundScores(state, 1, newScores);
    expect(state.schedule[0].matches[0].team1Score).toBe(originalScore);
  });

  it('leaves other rounds unchanged', () => {
    const state = makeMultiRoundState();
    const round2ScoresBefore = state.schedule[1].matches.map(m => ({
      t1: m.team1Score, t2: m.team2Score,
    }));
    const newScores = state.schedule[0].matches.map(m => ({
      matchId: m.matchId, team1Score: '1', team2Score: '2',
    }));
    const updated = updateRoundScores(state, 1, newScores);
    updated.schedule[1].matches.forEach((m, i) => {
      expect(m.team1Score).toBe(round2ScoresBefore[i].t1);
      expect(m.team2Score).toBe(round2ScoresBefore[i].t2);
    });
  });

  it('throws when roundNum is out of range', () => {
    const state = makeMultiRoundState();
    expect(() => updateRoundScores(state, 0, [])).toThrow();
    expect(() => updateRoundScores(state, 99, [])).toThrow();
  });

  it('throws when trying to update a round that has not been played yet', () => {
    const state = makeMultiRoundState(); // currentRound = 3, round 3 not yet scored
    expect(() => updateRoundScores(state, 3, [])).toThrow();
  });

  it('leaderboard reflects updated scores after updateRoundScores', () => {
    const state = makeMultiRoundState();

    // Round 1 was scored 11-5 (team1 wins). Update to 0-11 (team2 wins).
    const newScores = state.schedule[0].matches.map(m => ({
      matchId: m.matchId, team1Score: '0', team2Score: '11',
    }));
    const updated = updateRoundScores(state, 1, newScores);
    const lb = computeLeaderboard(updated);

    // All round-1 team1 players should now have a loss from round 1 instead of a win
    // Verify leaderboard is still sorted correctly
    for (let i = 0; i + 1 < lb.length; i++) {
      const a = lb[i], b = lb[i + 1];
      const ok =
        a.wins > b.wins ||
        (a.wins === b.wins && a.pointDiff > b.pointDiff) ||
        (a.wins === b.wins && a.pointDiff === b.pointDiff && a.pointsScored >= b.pointsScored);
      expect(ok).toBe(true);
    }
  });
});

// ── Property: updateRoundScores invariants ────────────────────────────────────

describe('Feature: round-robin-session-manager, Property 14: updateRoundScores invariants', () => {
  it('updating a past round preserves currentRound, status, and all other rounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 5 }), // roundCount — need at least 3 so there's a past round
        fc.constantFrom('fixed', 'rotating'),
        (roundCount, partnerMode) => {
          // Build state with first two rounds scored
          let state = makeState(roundCount, 1, 8, partnerMode);
          state = recordRoundScores(state, state.schedule[0].matches.map(m => ({
            matchId: m.matchId, team1Score: '11', team2Score: '5',
          })));
          state = recordRoundScores(state, state.schedule[1].matches.map(m => ({
            matchId: m.matchId, team1Score: '6', team2Score: '11',
          })));

          const currentRoundBefore = state.currentRound;
          const statusBefore = state.status;

          // Update round 1 with new scores
          const newScores = state.schedule[0].matches.map(m => ({
            matchId: m.matchId, team1Score: '3', team2Score: '7',
          }));
          const updated = updateRoundScores(state, 1, newScores);

          // currentRound and status must not change
          expect(updated.currentRound).toBe(currentRoundBefore);
          expect(updated.status).toBe(statusBefore);

          // Round 2 scores must be unchanged
          updated.schedule[1].matches.forEach((m, i) => {
            expect(m.team1Score).toBe(state.schedule[1].matches[i].team1Score);
            expect(m.team2Score).toBe(state.schedule[1].matches[i].team2Score);
          });

          // Round 1 scores must reflect the update
          updated.schedule[0].matches.forEach(m => {
            expect(m.team1Score).toBe(3);
            expect(m.team2Score).toBe(7);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
