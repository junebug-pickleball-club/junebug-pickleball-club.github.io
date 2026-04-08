/**
 * Round-Robin Session Manager — Pure Logic Module (Doubles)
 *
 * All functions are pure (no DOM, no sessionStorage references).
 * Importable in Node/Vitest without a browser environment.
 *
 * Doubles format: each court has 4 players (2v2).
 * partnerMode:
 *   'fixed'    — partners are assigned once at session start and stay together;
 *                the schedule rotates which pair they face each round.
 *   'rotating' — both partners and opponents change each round.
 */

/**
 * Validates a session configuration object.
 * @param {{ playerCount: number, courtCount: number, roundCount: number, partnerMode: string }} config
 * @returns {{ valid: boolean, errors: { field: string, message: string }[] }}
 */
export function validateConfig(config) {
  const errors = [];
  const { playerCount, courtCount, roundCount, partnerMode } = config ?? {};

  if (!Number.isInteger(playerCount) || playerCount < 4 || playerCount > 32) {
    errors.push({ field: 'playerCount', message: 'Player count must be an integer between 4 and 32.' });
  }

  if (!Number.isInteger(courtCount) || courtCount < 1 || courtCount > 16) {
    errors.push({ field: 'courtCount', message: 'Court count must be an integer between 1 and 16.' });
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
 * @param {string[]} names - raw name inputs (may be empty strings)
 * @returns {string[]}     - resolved names, same length
 */
export function resolvePlayerNames(names) {
  return names.map((name, i) =>
    (typeof name === 'string' && name.trim().length > 0) ? name : `Player ${i + 1}`
  );
}

/**
 * Generates a full doubles round-robin schedule.
 *
 * Each match is 2v2: { team1: [p1, p2], team2: [p3, p4] }.
 * Players who cannot fill a court group get a bye.
 *
 * partnerMode 'fixed':
 *   Players are paired into fixed teams at the start (indices 0+1, 2+3, …).
 *   The schedule rotates which team faces which using the circle method on teams.
 *   Excess players (not forming a complete pair) get byes.
 *
 * partnerMode 'rotating':
 *   Each round, players are grouped into sets of 4 using a circle-method rotation
 *   on individual players. Within each group of 4, the two pairings alternate each
 *   round to ensure everyone partners with everyone over time.
 *   Players who don't fit into a group of 4 get byes.
 *
 * @param {{ playerCount: number, courtCount: number, roundCount: number, partnerMode: string }} config
 * @param {string[]} playerNames
 * @returns {Round[]}
 */
export function generateSchedule(config, playerNames) {
  const { courtCount, roundCount, partnerMode } = config;
  const players = playerNames.slice(0, config.playerCount);

  return partnerMode === 'fixed'
    ? generateFixedSchedule(players, courtCount, roundCount)
    : generateRotatingSchedule(players, courtCount, roundCount);
}

// ── Fixed partner schedule ────────────────────────────────────────────────────

function generateFixedSchedule(players, courtCount, roundCount) {
  // Pair players into fixed teams: [0,1], [2,3], [4,5], …
  // If odd number of players, the last player has no partner and always gets a bye.
  const teams = [];
  const soloByePlayers = [];
  for (let i = 0; i + 1 < players.length; i += 2) {
    teams.push([players[i], players[i + 1]]);
  }
  if (players.length % 2 !== 0) {
    soloByePlayers.push(players[players.length - 1]);
  }

  // Use circle method on teams to rotate matchups.
  // For odd team count, add a ghost team — the team paired with ghost gets a bye.
  const slots = teams.slice();
  if (slots.length % 2 !== 0) slots.push(null); // ghost team

  const n = slots.length; // always even
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
      if (courtNum <= courtCount) {
        matches.push({
          matchId: `r${roundNum}-c${courtNum}`,
          courtNum,
          team1: t1,
          team2: t2,
          team1Score: null,
          team2Score: null,
        });
        courtNum++;
      } else {
        byes.push(...t1, ...t2);
      }
    }

    schedule.push({ roundNum, matches, byes });
  }

  return schedule;
}

// ── Rotating partner schedule ─────────────────────────────────────────────────
//
// Uses a round-level optimal matching to maximise partner novelty.
// Rather than greedily picking pairs sequentially (which can paint itself
// into a corner), we enumerate all valid court assignments for the round
// and pick the one with the minimum total repeat-partnership cost.
// For typical session sizes (≤16 players, ≤4 courts) this is fast enough.

function generateRotatingSchedule(players, courtCount, roundCount) {
  const n = players.length;

  // partnerCount[i][j] = times players[i] and players[j] have been partners
  const partnerCount = Array.from({ length: n }, () => new Array(n).fill(0));
  // byeCount[i] = times players[i] has had a bye
  const byeCount = new Array(n).fill(0);

  const schedule = [];

  for (let round = 0; round < roundCount; round++) {
    const roundNum = round + 1;

    // How many players can play this round (multiples of 4, capped by courts)
    const maxOnCourt = Math.min(courtCount, Math.floor(n / 4)) * 4;

    // Choose who sits out: fewest byes first; tiebreak by most novel partners remaining
    const sorted = players
      .map((p, i) => ({ p, i }))
      .sort((a, b) => {
        const byeDiff = byeCount[a.i] - byeCount[b.i];
        if (byeDiff !== 0) return byeDiff;
        const novelA = players.filter((_, k) => k !== a.i && partnerCount[a.i][k] === 0).length;
        const novelB = players.filter((_, k) => k !== b.i && partnerCount[b.i][k] === 0).length;
        return novelB - novelA;
      });

    const playingIdx = sorted.slice(0, maxOnCourt).map(x => x.i);
    const sittingIdx = sorted.slice(maxOnCourt).map(x => x.i);

    const byes = sittingIdx.map(i => players[i]);
    for (const i of sittingIdx) byeCount[i]++;

    // Find the optimal assignment of playingIdx into courts (groups of 4),
    // minimising total partner-repeat cost across all courts in this round.
    const courts = Math.floor(playingIdx.length / 4);
    const bestAssignment = findBestAssignment(playingIdx, courts, partnerCount);

    const matches = bestAssignment.map(([a, b, c, d], courtIdx) => {
      // Update partner counts
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
 * Finds the assignment of `playerIndices` into `courts` groups of 4 that
 * minimises total partner-repeat cost. Uses branch-and-bound with pruning.
 *
 * Cost of a group [a,b,c,d] = partnerCount[a][b] + partnerCount[c][d]
 * (we only count the two partnerships formed, not the opponent pairing).
 *
 * For ≤16 players / ≤4 courts this search space is manageable.
 */
function findBestAssignment(playerIndices, courts, partnerCount) {
  if (courts === 0) return [];

  let bestCost = Infinity;
  let bestGroups = null;

  function pairCost(a, b) {
    return partnerCount[a][b];
  }

  function groupCost(a, b, c, d) {
    // Try both team splits and pick the cheaper one
    const split1 = pairCost(a, b) + pairCost(c, d);
    const split2 = pairCost(a, c) + pairCost(b, d);
    const split3 = pairCost(a, d) + pairCost(b, c);
    return Math.min(split1, split2, split3);
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

    if (costSoFar >= bestCost) return; // prune

    // Always fix the first remaining player to avoid permutation duplicates
    const first = remaining[0];
    const rest = remaining.slice(1);

    // Choose 3 partners for `first` from rest
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

function removeFromArray(arr, val) {
  const idx = arr.indexOf(val);
  if (idx !== -1) arr.splice(idx, 1);
}

/**
 * Validates a set of score inputs for a round.
 * @param {{ matchId: string, team1Score: string, team2Score: string }[]} scores
 * @returns {{ valid: boolean, errors: { matchId: string, field: string, message: string }[] }}
 */
export function validateScores(scores) {
  const errors = [];
  const isValidScore = (s) => typeof s === 'string' && /^\d+$/.test(s);

  for (const { matchId, team1Score, team2Score } of scores) {
    if (!isValidScore(team1Score)) {
      errors.push({ matchId, field: 'team1Score', message: 'Score must be a non-negative integer.' });
    }
    if (!isValidScore(team2Score)) {
      errors.push({ matchId, field: 'team2Score', message: 'Score must be a non-negative integer.' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Records scores for the current round and returns updated session state.
 * Does not mutate the input state.
 * @param {object} state
 * @param {{ matchId: string, team1Score: string, team2Score: string }[]} scores
 * @returns {object} updated SessionState
 */
export function recordRoundScores(state, scores) {
  const newState = JSON.parse(JSON.stringify(state));
  const roundIndex = newState.currentRound - 1;
  const round = newState.schedule[roundIndex];
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
 * Computes the leaderboard from session state.
 * Wins/losses are tracked per individual player.
 * Sorted by wins desc → pointDiff desc → pointsScored desc.
 * @param {object} state
 * @returns {{ rank: number, name: string, wins: number, losses: number, pointDiff: number, pointsScored: number }[]}
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
        s.pointsScored   += match.team1Score;
        s.pointsConceded += match.team2Score;
        if (t1Won) s.wins++;
        else if (t2Won) s.losses++;
      }
      for (const player of match.team2) {
        const s = stats.get(player);
        if (!s) continue;
        s.pointsScored   += match.team2Score;
        s.pointsConceded += match.team1Score;
        if (t2Won) s.wins++;
        else if (t1Won) s.losses++;
      }
    }
  }

  const entries = [...stats.entries()].map(([name, s]) => ({
    name,
    wins: s.wins,
    losses: s.losses,
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
      const prev = entries[i - 1];
      const curr = entries[i];
      if (curr.wins !== prev.wins || curr.pointDiff !== prev.pointDiff || curr.pointsScored !== prev.pointsScored) {
        rank = i + 1;
      }
    }
    entries[i].rank = rank;
  }

  return entries;
}

/**
 * Serializes session state to a JSON string for sessionStorage.
 * @param {object} state
 * @returns {string}
 */
export function serializeState(state) {
  return JSON.stringify(state);
}

/**
 * Deserializes session state from a JSON string.
 * Throws on malformed input.
 * @param {string} json
 * @returns {object}
 */
export function deserializeState(json) {
  return JSON.parse(json);
}
