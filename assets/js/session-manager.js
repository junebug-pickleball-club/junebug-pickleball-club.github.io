/**
 * Round-Robin Session Manager — Pure Logic Module (Doubles)
 *
 * All functions are pure (no DOM, no sessionStorage references).
 * Importable in Node/Vitest without a browser environment.
 *
 * Doubles format: each court has 4 players (2v2).
 * Courts are derived automatically: floor(playerCount / 4).
 * Byes occur only when playerCount % 4 !== 0.
 *
 * partnerMode:
 *   'fixed'    — partners assigned once at session start; schedule rotates opponents.
 *   'rotating' — both partners and opponents change each round using optimal matching.
 */

/**
 * Validates a session configuration object.
 * @param {{ playerCount: number, roundCount: number, partnerMode: string }} config
 * @returns {{ valid: boolean, errors: { field: string, message: string }[] }}
 */
export function validateConfig(config) {
  const errors = [];
  const { playerCount, roundCount, partnerMode } = config ?? {};

  if (!Number.isInteger(playerCount) || playerCount < 4 || playerCount > 32) {
    errors.push({ field: 'playerCount', message: 'Player count must be an integer between 4 and 32.' });
  }

  if (!Number.isInteger(roundCount) || roundCount < 1 || roundCount > 64) {
    errors.push({ field: 'roundCount', message: 'Round count must be an integer between 1 and 64.' });
  }

  if (partnerMode !== 'fixed' && partnerMode !== 'rotating') {
    errors.push({ field: 'partnerMode', message: "Partner mode must be 'fixed' or 'rotating'." });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolves player names, substituting "Player N" for any empty/whitespace-only slot.
 * @param {string[]} names
 * @returns {string[]}
 */
export function resolvePlayerNames(names) {
  return names.map((name, i) =>
    (typeof name === 'string' && name.trim().length > 0) ? name : `Player ${i + 1}`
  );
}

/**
 * Generates a full doubles round-robin schedule.
 * Courts = floor(playerCount / 4). Byes when playerCount % 4 !== 0.
 *
 * @param {{ playerCount: number, roundCount: number, partnerMode: string }} config
 * @param {string[]} playerNames
 * @returns {Round[]}
 */
export function generateSchedule(config, playerNames) {
  const { roundCount, partnerMode } = config;
  const players = playerNames.slice(0, config.playerCount);
  const courtCount = Math.floor(players.length / 4);

  return partnerMode === 'fixed'
    ? generateFixedSchedule(players, courtCount, roundCount)
    : generateRotatingSchedule(players, courtCount, roundCount);
}

// ── Fixed partner schedule ────────────────────────────────────────────────────

function generateFixedSchedule(players, courtCount, roundCount) {
  const teams = [];
  const soloByePlayers = [];
  for (let i = 0; i + 1 < players.length; i += 2) {
    teams.push([players[i], players[i + 1]]);
  }
  if (players.length % 2 !== 0) {
    soloByePlayers.push(players[players.length - 1]);
  }

  const slots = teams.slice();
  if (slots.length % 2 !== 0) slots.push(null);

  const n = slots.length;
  const naturalRounds = n - 1;

  function generateCycle(slotArr) {
    const rounds = [];
    const rotating = slotArr.slice(1);
    for (let r = 0; r < n - 1; r++) {
      const matchups = [];
      const current = [slotArr[0], ...rotating];
      for (let i = 0; i < n / 2; i++) {
        matchups.push([current[i], current[n - 1 - i]]);
      }
      rounds.push(matchups);
      rotating.unshift(rotating.pop());
    }
    return rounds;
  }

  const allRoundMatchups = generateCycle(slots);
  const schedule = [];

  for (let i = 0; i < roundCount; i++) {
    const matchups = allRoundMatchups[i % naturalRounds];
    const roundNum = i + 1;
    const matches = [];
    const byes = [...soloByePlayers];
    let courtNum = 1;

    for (const [t1, t2] of matchups) {
      if (t1 === null || t2 === null) {
        const byeTeam = t1 === null ? t2 : t1;
        if (byeTeam !== null) byes.push(...byeTeam);
        continue;
      }
      matches.push({
        matchId: `r${roundNum}-c${courtNum}`,
        courtNum,
        team1: t1,
        team2: t2,
        team1Score: null,
        team2Score: null,
      });
      courtNum++;
    }

    schedule.push({ roundNum, matches, byes });
  }

  return schedule;
}

// ── Rotating partner schedule ─────────────────────────────────────────────────
//
// Uses a round-level optimal matching (branch-and-bound) to maximise partner
// novelty. Evaluates all valid court assignments for the round and picks the
// one with the minimum total repeat-partnership cost.
//
// Byes: playerCount % 4 players sit out each round, rotating fairly.

function generateRotatingSchedule(players, courtCount, roundCount) {
  const n = players.length;
  const byesPerRound = n % 4; // 0, 1, 2, or 3

  // partnerCount[i][j] = times players[i] and players[j] have been partners
  const partnerCount = Array.from({ length: n }, () => new Array(n).fill(0));
  // byeCount[i] = times players[i] has had a bye
  const byeCount = new Array(n).fill(0);

  const schedule = [];

  for (let round = 0; round < roundCount; round++) {
    const roundNum = round + 1;

    // Choose who sits out: most byes first (they've sat out the most, so they
    // should play now). Tiebreak: most novel partners remaining sits out last.
    const sorted = players
      .map((p, i) => ({ p, i }))
      .sort((a, b) => {
        const byeDiff = byeCount[b.i] - byeCount[a.i];
        if (byeDiff !== 0) return byeDiff;
        const novelA = players.filter((_, k) => k !== a.i && partnerCount[a.i][k] === 0).length;
        const novelB = players.filter((_, k) => k !== b.i && partnerCount[b.i][k] === 0).length;
        return novelB - novelA;
      });

    // Players with the most byes play; the last byesPerRound sit out
    const playingIdx = sorted.slice(0, n - byesPerRound).map(x => x.i);
    const sittingIdx = sorted.slice(n - byesPerRound).map(x => x.i);

    const byes = sittingIdx.map(i => players[i]);
    for (const i of sittingIdx) byeCount[i]++;

    // Find the optimal assignment of playingIdx into courtCount groups of 4
    const bestAssignment = findBestAssignment(playingIdx, courtCount, partnerCount);

    const matches = bestAssignment.map(([a, b, c, d], courtIdx) => {
      partnerCount[a][b]++; partnerCount[b][a]++;
      partnerCount[c][d]++; partnerCount[d][c]++;
      return {
        matchId: `r${roundNum}-c${courtIdx + 1}`,
        courtNum: courtIdx + 1,
        team1: [players[a], players[b]],
        team2: [players[c], players[d]],
        team1Score: null,
        team2Score: null,
      };
    });

    schedule.push({ roundNum, matches, byes });
  }

  return schedule;
}

/**
 * Finds the assignment of playerIndices into `courts` groups of 4 that
 * minimises total partner-repeat cost. Branch-and-bound with pruning.
 */
function findBestAssignment(playerIndices, courts, partnerCount) {
  if (courts === 0) return [];

  let bestCost = Infinity;
  let bestGroups = null;

  function pairCost(a, b) { return partnerCount[a][b]; }

  function groupCost(a, b, c, d) {
    return Math.min(
      pairCost(a, b) + pairCost(c, d),
      pairCost(a, c) + pairCost(b, d),
      pairCost(a, d) + pairCost(b, c)
    );
  }

  function bestTeamSplit(a, b, c, d) {
    const s1 = pairCost(a, b) + pairCost(c, d);
    const s2 = pairCost(a, c) + pairCost(b, d);
    const s3 = pairCost(a, d) + pairCost(b, c);
    const min = Math.min(s1, s2, s3);
    if (min === s1) return [a, b, c, d];
    if (min === s2) return [a, c, b, d];
    return [a, d, b, c];
  }

  function search(remaining, groups, costSoFar) {
    if (groups.length === courts) {
      if (costSoFar < bestCost) {
        bestCost = costSoFar;
        bestGroups = groups.map(g => bestTeamSplit(...g));
      }
      return;
    }
    if (costSoFar >= bestCost) return;

    const first = remaining[0];
    const rest = remaining.slice(1);

    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        for (let k = j + 1; k < rest.length; k++) {
          const group = [first, rest[i], rest[j], rest[k]];
          const cost = groupCost(...group);
          const newRemaining = rest.filter((_, idx) => idx !== i && idx !== j && idx !== k);
          search(newRemaining, [...groups, group], costSoFar + cost);
        }
      }
    }
  }

  search(playerIndices, [], 0);
  return bestGroups;
}

/**
 * Validates score inputs for a round.
 * @param {{ matchId: string, team1Score: string, team2Score: string }[]} scores
 * @returns {{ valid: boolean, errors: { matchId: string, field: string, message: string }[] }}
 */
export function validateScores(scores) {
  const errors = [];
  const isValid = (s) => typeof s === 'string' && /^\d+$/.test(s);

  for (const { matchId, team1Score, team2Score } of scores) {
    if (!isValid(team1Score)) errors.push({ matchId, field: 'team1Score', message: 'Score must be a non-negative integer.' });
    if (!isValid(team2Score)) errors.push({ matchId, field: 'team2Score', message: 'Score must be a non-negative integer.' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Records scores for the current round. Returns new state (does not mutate).
 */
export function recordRoundScores(state, scores) {
  const newState = JSON.parse(JSON.stringify(state));
  const round = newState.schedule[newState.currentRound - 1];
  const scoreMap = new Map(scores.map(s => [s.matchId, s]));

  for (const match of round.matches) {
    const s = scoreMap.get(match.matchId);
    if (s) {
      match.team1Score = Number(s.team1Score);
      match.team2Score = Number(s.team2Score);
    }
  }

  if (newState.currentRound < newState.schedule.length) {
    newState.currentRound += 1;
  } else {
    newState.status = 'complete';
  }

  return newState;
}

/**
 * Computes the leaderboard. Wins/losses tracked per individual player.
 * Sorted: wins desc → pointDiff desc → pointsScored desc.
 */
export function computeLeaderboard(state) {
  const stats = new Map();
  for (const player of state.players) {
    stats.set(player, { wins: 0, losses: 0, pointsScored: 0, pointsConceded: 0 });
  }

  for (const round of state.schedule) {
    for (const match of round.matches) {
      if (match.team1Score === null || match.team2Score === null) continue;
      const t1Won = match.team1Score > match.team2Score;
      const t2Won = match.team2Score > match.team1Score;

      for (const player of match.team1) {
        const s = stats.get(player);
        if (!s) continue;
        s.pointsScored += match.team1Score;
        s.pointsConceded += match.team2Score;
        if (t1Won) s.wins++; else if (t2Won) s.losses++;
      }
      for (const player of match.team2) {
        const s = stats.get(player);
        if (!s) continue;
        s.pointsScored += match.team2Score;
        s.pointsConceded += match.team1Score;
        if (t2Won) s.wins++; else if (t1Won) s.losses++;
      }
    }
  }

  const entries = [...stats.entries()].map(([name, s]) => ({
    name, wins: s.wins, losses: s.losses,
    pointDiff: s.pointsScored - s.pointsConceded,
    pointsScored: s.pointsScored,
  }));

  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsScored - a.pointsScored;
  });

  let rank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const p = entries[i - 1], c = entries[i];
      if (c.wins !== p.wins || c.pointDiff !== p.pointDiff || c.pointsScored !== p.pointsScored) rank = i + 1;
    }
    entries[i].rank = rank;
  }

  return entries;
}

export function serializeState(state) { return JSON.stringify(state); }
export function deserializeState(json) { return JSON.parse(json); }
