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
    'mixed_home', 'mixed_away', 'dream_home', 'dream_away'
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
  return [
    '  - week: ' + match.week,
    '    date: ' + match.date,
    '    location: "' + match.location + '"',
    '    home_team: ' + match.home_team,
    '    away_team: ' + match.away_team,
    '    result:',
    '      mens_doubles:',
    '        home: ' + match.result.mens_doubles.home,
    '        away: ' + match.result.mens_doubles.away,
    '      womens_doubles:',
    '        home: ' + match.result.womens_doubles.home,
    '        away: ' + match.result.womens_doubles.away,
    '      mixed_doubles:',
    '        home: ' + match.result.mixed_doubles.home,
    '        away: ' + match.result.mixed_doubles.away,
    '      dreambreaker:',
    '        home: ' + match.result.dreambreaker.home,
    '        away: ' + match.result.dreambreaker.away
  ].join('\n');
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
    const games = ['mens_doubles', 'womens_doubles', 'mixed_doubles', 'dreambreaker'];
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
