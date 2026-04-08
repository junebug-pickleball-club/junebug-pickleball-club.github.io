// Feature: pickleball-club-site
// Pure utility functions extracted for testability.

/**
 * Validates required form fields.
 * @param {Object} fields - map of fieldName -> value
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateForm(fields) {
  const required = [
    'home_team', 'away_team', 'season', 'week', 'match_date', 'location',
    'mens_home', 'mens_away', 'womens_home', 'womens_away',
    'mixed_1_home', 'mixed_1_away',
    'mixed_2_home', 'mixed_2_away',
    'mixed_3_home', 'mixed_3_away',
    'mixed_4_home', 'mixed_4_away',
    // dream_home and dream_away are intentionally absent
    'mens_home_p1', 'mens_home_p2', 'mens_away_p1', 'mens_away_p2',
    'womens_home_p1', 'womens_home_p2', 'womens_away_p1', 'womens_away_p2',
    'mixed_1_home_p1', 'mixed_1_home_p2', 'mixed_1_away_p1', 'mixed_1_away_p2',
    'mixed_2_home_p1', 'mixed_2_home_p2', 'mixed_2_away_p1', 'mixed_2_away_p2',
    'mixed_3_home_p1', 'mixed_3_home_p2', 'mixed_3_away_p1', 'mixed_3_away_p2',
    'mixed_4_home_p1', 'mixed_4_home_p2', 'mixed_4_away_p1', 'mixed_4_away_p2',
  ];
  const missing = required.filter(function (key) {
    const val = fields[key];
    return val === undefined || val === null || String(val).trim() === '';
  });
  return { valid: missing.length === 0, missing };
}

/**
 * Serializes a match object to a YAML schedule entry string.
 * @param {Object} match
 * @returns {string}
 */
export function serializeMatchYaml(match) {
  function playerLines(game) {
    const out = [];
    if (game.home_players && game.home_players.length > 0) {
      out.push('        home_players: [' + game.home_players.map(n => '"' + n + '"').join(', ') + ']');
    }
    if (game.away_players && game.away_players.length > 0) {
      out.push('        away_players: [' + game.away_players.map(n => '"' + n + '"').join(', ') + ']');
    }
    return out;
  }

  const lines = [
    '  - week: ' + match.week,
    '    date: ' + match.date,
    '    location: "' + match.location + '"',
    '    home_team: ' + match.home_team,
    '    away_team: ' + match.away_team,
    '    result:',
    '      mens_doubles:',
    '        home: ' + match.result.mens_doubles.home,
    '        away: ' + match.result.mens_doubles.away,
    ...playerLines(match.result.mens_doubles),
    '      womens_doubles:',
    '        home: ' + match.result.womens_doubles.home,
    '        away: ' + match.result.womens_doubles.away,
    ...playerLines(match.result.womens_doubles),
    '      mixed_doubles_1:',
    '        home: ' + match.result.mixed_doubles_1.home,
    '        away: ' + match.result.mixed_doubles_1.away,
    ...playerLines(match.result.mixed_doubles_1),
    '      mixed_doubles_2:',
    '        home: ' + match.result.mixed_doubles_2.home,
    '        away: ' + match.result.mixed_doubles_2.away,
    ...playerLines(match.result.mixed_doubles_2),
    '      mixed_doubles_3:',
    '        home: ' + match.result.mixed_doubles_3.home,
    '        away: ' + match.result.mixed_doubles_3.away,
    ...playerLines(match.result.mixed_doubles_3),
    '      mixed_doubles_4:',
    '        home: ' + match.result.mixed_doubles_4.home,
    '        away: ' + match.result.mixed_doubles_4.away,
    ...playerLines(match.result.mixed_doubles_4),
  ];
  if (match.result.dreambreaker != null) {
    lines.push(
      '      dreambreaker:',
      '        home: ' + match.result.dreambreaker.home,
      '        away: ' + match.result.dreambreaker.away
    );
  }
  return lines.join('\n');
}

/**
 * Partitions and sorts events relative to a reference date string (YYYY-MM-DD).
 * @param {Array} events - array of event objects with a `date` field
 * @param {string} today - reference date in YYYY-MM-DD format
 * @returns {{ upcoming: Array, past: Array }}
 */
export function partitionEvents(events, today) {
  const upcoming = [];
  const past = [];
  for (const event of events) {
    const d = String(event.date).slice(0, 10);
    if (d >= today) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }
  upcoming.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  past.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { upcoming, past };
}

/**
 * Computes standings for a season.
 * @param {string[]} teamIds
 * @param {Array} schedule
 * @returns {Array} sorted array of { id, matchWins, matchLosses, gameWins }
 */
export function computeStandings(teamIds, schedule) {
  const stats = {};
  for (const id of teamIds) {
    stats[id] = { id, matchWins: 0, matchLosses: 0, gameWins: 0 };
  }

  for (const match of schedule) {
    if (!match.result) continue;
    const games = ['mens_doubles', 'womens_doubles', 'mixed_doubles_1', 'mixed_doubles_2', 'mixed_doubles_3', 'mixed_doubles_4', 'dreambreaker'];
    let homeGames = 0, awayGames = 0;

    for (const game of games) {
      const g = match.result[game];
      if (!g) continue;
      if (g.home > g.away) homeGames++;
      else awayGames++;
      if (stats[match.home_team]) stats[match.home_team].gameWins += g.home;
      if (stats[match.away_team]) stats[match.away_team].gameWins += g.away;
    }

    if (stats[match.home_team] && stats[match.away_team]) {
      if (homeGames > awayGames) {
        stats[match.home_team].matchWins++;
        stats[match.away_team].matchLosses++;
      } else {
        stats[match.away_team].matchWins++;
        stats[match.home_team].matchLosses++;
      }
    }
  }

  return Object.values(stats).sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    return b.gameWins - a.gameWins;
  });
}
