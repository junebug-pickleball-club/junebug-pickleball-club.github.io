# Design Document: Match Submission Form Update

## Overview

The match submission form at `/submit-match/` currently collects scores but not player participation. This design extends the form to add player-name dropdowns for each non-Dreambreaker game row, updates the `serializeMatchYaml` function to emit `home_players` and `away_players` inline YAML sequences, and extends `validateForm` to require all player dropdown fields.

The key constraint is Jekyll's static-site nature: Liquid runs at build time, so roster data must be embedded as JSON in the page and manipulated entirely in client-side JavaScript at runtime.

## Architecture

```
Build time (Jekyll/Liquid)
  _data/seasons/{slug}.yml
        │  teams[].roster[].name
        ▼
  <script type="application/json" id="season-teams-data">
    { "spring-2026": [ { slug, name, roster: ["Amy", ...] }, ... ] }
  </script>

Runtime (JavaScript)
  season-select onChange
        │
        ▼
  populateTeamDropdowns(seasonKey)
        │  reads SEASON_TEAMS[seasonKey]
        ▼
  home-team / away-team onChange
        │
        ▼
  populatePlayerDropdowns(side, teamSlug, seasonKey)
        │  fills <select name="mens_home_p1"> etc.
        ▼
  form submit
        │
        ▼
  validateForm(fields)   ← extended with player field names
        │
        ▼
  serializeMatchYaml(match)  ← extended with home_players / away_players
        │
        ▼
  GitHub API → PR
```

No new files are introduced. Changes are confined to:
- `pages/submit-match.html` — Liquid data embedding + HTML form rows + JS logic
- `assets/js/match-utils.js` — `validateForm` and `serializeMatchYaml` updates
- `tests/match-utils.test.js` — extended property tests

## Components and Interfaces

### Season_Teams_Data (build-time JSON blob)

The existing `<script type="application/json" id="season-teams-data">` block is extended to include a `roster` array per team:

```json
{
  "spring-2026": [
    {
      "slug": "day-dinkers",
      "name": "Day Dinkers",
      "roster": ["James Schonian", "Trent Justice", "Allana Montag", "Colleen Stockert"]
    }
  ]
}
```

Liquid template change (in `pages/submit-match.html`):

```liquid
{% for team in season_data.teams %}
{
  "slug": "{{ team.slug }}",
  "name": "{{ team.name }}",
  "roster": [{% for p in team.roster %}"{{ p.name }}"{% unless forloop.last %},{% endunless %}{% endfor %}]
}{% unless forloop.last %},{% endunless %}
{% endfor %}
```

### Player Dropdown HTML Structure

Each non-Dreambreaker game row gains four `<select>` elements (two home, two away). Field naming convention:

| Field name pattern | Example |
|---|---|
| `{game}_home_p1` | `mens_home_p1` |
| `{game}_home_p2` | `mens_home_p2` |
| `{game}_away_p1` | `mens_away_p1` |
| `{game}_away_p2` | `mens_away_p2` |

Games: `mens`, `womens`, `mixed_1`, `mixed_2`, `mixed_3`, `mixed_4`

Total: 24 player dropdown fields. Dreambreaker has no player dropdowns.

Each `<select>` starts disabled with a single blank placeholder option (`value=""`).

### `populatePlayerDropdowns(side, teamSlug, seasonKey)` (new JS function)

```
side: "home" | "away"
teamSlug: string
seasonKey: string
```

Finds the team in `SEASON_TEAMS[seasonKey]`, then for each of the 6 game prefixes, replaces the options in `{game}_{side}_p1` and `{game}_{side}_p2` with a blank placeholder followed by one `<option>` per roster player name. If the roster is empty, leaves the selects disabled.

### `validateForm(fields)` (updated)

Adds all 24 player field names to the `required` array:

```js
'mens_home_p1', 'mens_home_p2', 'mens_away_p1', 'mens_away_p2',
'womens_home_p1', 'womens_home_p2', 'womens_away_p1', 'womens_away_p2',
'mixed_1_home_p1', 'mixed_1_home_p2', 'mixed_1_away_p1', 'mixed_1_away_p2',
'mixed_2_home_p1', 'mixed_2_home_p2', 'mixed_2_away_p1', 'mixed_2_away_p2',
'mixed_3_home_p1', 'mixed_3_home_p2', 'mixed_3_away_p1', 'mixed_3_away_p2',
'mixed_4_home_p1', 'mixed_4_home_p2', 'mixed_4_away_p1', 'mixed_4_away_p2',
```

### `serializeMatchYaml(match)` (updated)

Each game block gains two new lines using inline YAML sequence syntax:

```yaml
      mens_doubles:
        home: 11
        away: 8
        home_players: [James Schonian, Trent Justice]
        away_players: [Nathan Cross, Stephen Houston]
```

The match object passed to `serializeMatchYaml` is extended so each game result carries `home_players: string[]` and `away_players: string[]`. The serializer formats them as:

```js
'        home_players: [' + game.home_players.join(', ') + ']',
'        away_players: [' + game.away_players.join(', ') + ']',
```

Dreambreaker continues to have no player arrays (score-only), consistent with the existing data structure.

## Data Models

### Extended match object (passed to `serializeMatchYaml`)

```js
{
  week: number,
  date: string,           // YYYY-MM-DD
  location: string,
  home_team: string,      // slug
  away_team: string,      // slug
  result: {
    mens_doubles:    { home: number, away: number, home_players: string[], away_players: string[] },
    womens_doubles:  { home: number, away: number, home_players: string[], away_players: string[] },
    mixed_doubles_1: { home: number, away: number, home_players: string[], away_players: string[] },
    mixed_doubles_2: { home: number, away: number, home_players: string[], away_players: string[] },
    mixed_doubles_3: { home: number, away: number, home_players: string[], away_players: string[] },
    mixed_doubles_4: { home: number, away: number, home_players: string[], away_players: string[] },
    dreambreaker?:   { home: number, away: number }   // no players
  }
}
```

### Extended form fields object (passed to `validateForm`)

All existing fields plus the 24 player fields listed above.

### Season_Teams_Data shape

```ts
type SeasonTeamsData = {
  [seasonSlug: string]: Array<{
    slug: string;
    name: string;
    roster: string[];   // player names only
  }>;
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Player dropdown population reflects roster

*For any* season data and any team slug with a non-empty roster, after calling `populatePlayerDropdowns` for that team on either side, every player dropdown for that side across all 6 game rows should contain exactly the roster player names (plus a blank placeholder as the first option).

**Validates: Requirements 2.1, 2.2, 3.2**

### Property 2: Season change resets all player dropdowns

*For any* prior player dropdown state, after a season-change event fires, all 24 player dropdowns should be empty (containing only the blank placeholder) and disabled.

**Validates: Requirements 2.3, 2.4**

### Property 3: Validation rejects any missing player field

*For any* otherwise-complete form submission, blanking any non-empty subset of the 24 required player dropdown fields should cause `validateForm` to return `{ valid: false }` with every blanked field name present in `missing`.

**Validates: Requirements 3.3, 4.1, 4.2**

### Property 4: YAML serialization round-trip preserves player arrays

*For any* valid match object (including `home_players` and `away_players` arrays on each game), `serializeMatchYaml` should produce a YAML string that, when parsed by a YAML parser, yields a schedule entry where every game's `home_players` and `away_players` arrays are equal to the originals.

**Validates: Requirements 5.1, 5.2, 6.1**

### Property 5: Player names with special characters survive round-trip

*For any* player name string (including names containing spaces, hyphens, apostrophes, and accented characters), embedding it in an inline YAML sequence via `serializeMatchYaml` and parsing the result should recover the original name unchanged.

**Validates: Requirements 6.2**

## Error Handling

**Empty roster**: If `SEASON_TEAMS[seasonKey]` returns a team with `roster: []`, `populatePlayerDropdowns` leaves all dropdowns for that side disabled. The form cannot be submitted until a team with a non-empty roster is selected (validation will catch the empty player fields).

**Season data missing**: If `SEASON_TEAMS[seasonKey]` is undefined (e.g. a season with no teams), the existing `populateTeamDropdowns` already handles this by disabling team selects. Player dropdowns remain disabled by extension.

**Player name with YAML-unsafe characters**: Names containing `,`, `[`, `]`, `:`, or `#` would break inline sequence syntax. The serializer should quote such names. Design decision: wrap each player name in double quotes in the inline sequence — `[\"Amy Tucker\", \"Nathan Cross\"]` — so the YAML parser handles any embedded special characters. This is safe because the existing data shows names are plain strings, but defensive quoting prevents future breakage.

**Form reset after submission**: On successful submission, `form.reset()` clears all inputs. Player dropdowns should be re-disabled after reset since the team selects are cleared. The existing `change` event on team selects handles re-population; the reset listener should also disable player dropdowns.

## Testing Strategy

The project uses **Vitest** with **fast-check** for property-based testing. Run with `npm test`.

### Unit / Example Tests

- Verify the rendered form HTML contains 24 player `<select>` elements (4 per game × 6 games).
- Verify `validateForm` required list contains all 24 player field names (example assertion).
- Verify `populatePlayerDropdowns` with an empty roster leaves dropdowns disabled.

### Property-Based Tests (fast-check, minimum 100 iterations each)

All new property tests live in `tests/match-utils.test.js` alongside existing tests.

**Property 1** — `populatePlayerDropdowns` reflects roster  
Tag: `Feature: match-submission-form-update, Property 1: Player dropdown population reflects roster`  
Generator: arbitrary team with 0–8 roster players, arbitrary side (`home`/`away`), arbitrary season key.

**Property 2** — Season change resets dropdowns  
Tag: `Feature: match-submission-form-update, Property 2: Season change resets all player dropdowns`  
Generator: arbitrary prior dropdown state (populated with arbitrary names), trigger reset, assert all empty and disabled.

**Property 3** — Validation rejects missing player fields  
Tag: `Feature: match-submission-form-update, Property 3: Validation rejects any missing player field`  
Generator: extend existing `validFormArb` with all 24 player fields, then blank a random non-empty subset.

**Property 4** — YAML round-trip with player arrays  
Tag: `Feature: match-submission-form-update, Property 4: YAML serialization round-trip preserves player arrays`  
Generator: extend existing `matchArb` so each game result includes `home_players` and `away_players` (arrays of 1–4 player name strings). Verify parse-back equality.

**Property 5** — Special character round-trip  
Tag: `Feature: match-submission-form-update, Property 5: Player names with special characters survive round-trip`  
Generator: player names from `fc.stringMatching(/^[A-Za-zÀ-ÿ' -]{1,30}$/)` (covers accents, apostrophes, hyphens, spaces). Verify round-trip.

Properties 4 and 5 can share the same extended `matchArb` generator; Property 5 uses a name generator that specifically includes special characters.

**Existing tests**: Properties 1–4 from the prior `match-format-update` feature continue to pass unchanged. The extended `serializeMatchYaml` is backward-compatible — if `home_players`/`away_players` are absent on a game result, the serializer omits those lines (or the test arbitraries always include them; the implementation should handle both).
