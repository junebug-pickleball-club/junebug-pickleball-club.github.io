# Design Document: Match Format Update

## Overview

This update migrates the Junebug Pickleball League match format from the old structure (1 Men's Doubles + 1 Women's Doubles + 1 Mixed Doubles + 1 Dreambreaker) to the new MLP-style structure (1 Men's Doubles + 1 Women's Doubles + 4 Mixed Doubles + optional Dreambreaker).

The change touches six files:
- `_data/seasons/spring-2026.yml` — data migration
- `submit-match.html` — form fields
- `assets/js/match-utils.js` — validation, serialization, standings logic
- `_includes/match-row.html` — schedule row rendering
- `_includes/standings-table.html` — standings computation in Liquid
- `tests/match-utils.test.js` — property-based test suite

The core design principle is that the Dreambreaker is now **optional at every layer**: the YAML schema omits the key when not played, the form does not require those inputs, `validateForm` excludes them from required fields, `serializeMatchYaml` conditionally emits the block, `computeStandings` skips it when absent, and the Liquid templates render a fallback when the key is missing.

---

## Architecture

The system is a Jekyll static site. There is no server-side runtime — all dynamic behavior is either Liquid template logic (rendered at build time from YAML data) or client-side JavaScript (form validation and GitHub API submission).

```
_data/seasons/spring-2026.yml
        │
        ├─► _includes/standings-table.html  (Liquid, build-time)
        ├─► _includes/match-row.html        (Liquid, build-time)
        │
        └─► submit-match.html (inline JS)
                │
                ├─► assets/js/match-utils.js
                │     ├── validateForm()
                │     ├── serializeMatchYaml()
                │     └── computeStandings()
                │
                └─► GitHub API  (creates PR with updated YAML)
```

The data flow for a match submission:
1. User fills form → `validateForm` checks required fields
2. `serializeMatchYaml` converts form data to a YAML snippet
3. The snippet is appended to the season file content and committed via GitHub API as a PR

---

## Components and Interfaces

### YAML Schema (`_data/seasons/spring-2026.yml`)

New `result` block structure:

```yaml
result:
  mens_doubles:
    home: 11
    away: 7
  womens_doubles:
    home: 9
    away: 11
  mixed_doubles_1:
    home: 11
    away: 6
  mixed_doubles_2:
    home: 8
    away: 11
  mixed_doubles_3:
    home: 11
    away: 9
  mixed_doubles_4:
    home: 7
    away: 11
  dreambreaker:        # optional — omit entirely when not played
    home: 15
    away: 12
```

The singular `mixed_doubles` key is removed entirely. The `dreambreaker` key is present only when the tiebreaker was actually played.

### Form Fields (`submit-match.html`)

New score input names:

| Game | Home input name | Away input name | Required |
|---|---|---|---|
| Men's Doubles | `mens_home` | `mens_away` | yes |
| Women's Doubles | `womens_home` | `womens_away` | yes |
| Mixed Doubles 1 | `mixed_1_home` | `mixed_1_away` | yes |
| Mixed Doubles 2 | `mixed_2_home` | `mixed_2_away` | yes |
| Mixed Doubles 3 | `mixed_3_home` | `mixed_3_away` | yes |
| Mixed Doubles 4 | `mixed_4_home` | `mixed_4_away` | yes |
| Dreambreaker | `dream_home` | `dream_away` | **no** |

The old `mixed_home` / `mixed_away` inputs are replaced by the four numbered variants.

### `validateForm(fields)` — `assets/js/match-utils.js`

Updated required fields list:

```js
const required = [
  'home_team', 'away_team', 'season', 'week', 'match_date', 'location',
  'mens_home', 'mens_away', 'womens_home', 'womens_away',
  'mixed_1_home', 'mixed_1_away',
  'mixed_2_home', 'mixed_2_away',
  'mixed_3_home', 'mixed_3_away',
  'mixed_4_home', 'mixed_4_away',
  // dream_home and dream_away are intentionally absent
];
```

Signature and return type are unchanged: `{ valid: boolean, missing: string[] }`.

### `serializeMatchYaml(match)` — `assets/js/match-utils.js`

The `match.result` object now has the shape:

```js
{
  mens_doubles:   { home, away },
  womens_doubles: { home, away },
  mixed_doubles_1: { home, away },
  mixed_doubles_2: { home, away },
  mixed_doubles_3: { home, away },
  mixed_doubles_4: { home, away },
  dreambreaker:   { home, away } | null | undefined  // optional
}
```

Conditional dreambreaker serialization:

```js
const lines = [
  // ... fixed lines for week, date, location, home_team, away_team, result, mens, womens, mixed_1..4
];
if (match.result.dreambreaker != null) {
  lines.push(
    '      dreambreaker:',
    '        home: ' + match.result.dreambreaker.home,
    '        away: ' + match.result.dreambreaker.away
  );
}
return lines.join('\n');
```

### `computeStandings(teamIds, schedule)` — `assets/js/match-utils.js`

The games array is updated to enumerate all four mixed doubles keys:

```js
const games = [
  'mens_doubles', 'womens_doubles',
  'mixed_doubles_1', 'mixed_doubles_2', 'mixed_doubles_3', 'mixed_doubles_4',
  'dreambreaker'
];
```

The existing `if (!g) continue;` guard already handles the optional dreambreaker — no additional change needed for that case.

### `_includes/match-row.html`

Four mixed doubles columns replace the single one. The dreambreaker column always renders but shows `—` when the key is absent:

```liquid
<td>{{ match.result.mixed_doubles_1.home }}–{{ match.result.mixed_doubles_1.away }}</td>
<td>{{ match.result.mixed_doubles_2.home }}–{{ match.result.mixed_doubles_2.away }}</td>
<td>{{ match.result.mixed_doubles_3.home }}–{{ match.result.mixed_doubles_3.away }}</td>
<td>{{ match.result.mixed_doubles_4.home }}–{{ match.result.mixed_doubles_4.away }}</td>
{% if match.result.dreambreaker %}
  <td>{{ match.result.dreambreaker.home }}–{{ match.result.dreambreaker.away }}</td>
{% else %}
  <td>—</td>
{% endif %}
```

The `colspan` on the "Scheduled" fallback row increases from 4 to 7 (4 mixed + dreambreaker + mens + womens = 7 game columns total).

### `_includes/standings-table.html`

The four mixed doubles blocks replace the single `mixed_doubles` block in both the sort-key computation loop and the table-body rendering loop. The pattern is identical to the existing `mens_doubles` / `womens_doubles` blocks, repeated for `mixed_doubles_1` through `mixed_doubles_4`. The `dreambreaker` block already uses `{% if match.result.dreambreaker %}` guards and requires no structural change.

---

## Data Models

### MatchResult (JavaScript)

```ts
interface GameResult {
  home: number;
  away: number;
}

interface MatchResult {
  mens_doubles:    GameResult;
  womens_doubles:  GameResult;
  mixed_doubles_1: GameResult;
  mixed_doubles_2: GameResult;
  mixed_doubles_3: GameResult;
  mixed_doubles_4: GameResult;
  dreambreaker?:   GameResult;  // optional
}

interface Match {
  week:      number;
  date:      string;   // YYYY-MM-DD
  location:  string;
  home_team: string;
  away_team: string;
  result?:   MatchResult;  // absent for scheduled-but-unplayed matches
}
```

### FormFields (JavaScript)

```ts
interface FormFields {
  home_team:    string;
  away_team:    string;
  season:       string;
  week:         string;
  match_date:   string;
  location:     string;
  mens_home:    string;
  mens_away:    string;
  womens_home:  string;
  womens_away:  string;
  mixed_1_home: string;
  mixed_1_away: string;
  mixed_2_home: string;
  mixed_2_away: string;
  mixed_3_home: string;
  mixed_3_away: string;
  mixed_4_home: string;
  mixed_4_away: string;
  dream_home?:  string;  // optional
  dream_away?:  string;  // optional
}
```

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The feature involves pure JavaScript functions (`validateForm`, `serializeMatchYaml`, `computeStandings`) with clear input/output behavior and large input spaces, making property-based testing appropriate. The Liquid template changes are integration-level and are not covered by PBT.

**Property reflection:** Requirements 2.6 and 3.4 both describe the same missing-field detection behavior — they are merged into one property. Requirements 3.2 and 3.3 both describe the optional-dreambreaker validation behavior — merged into one property. Requirements 4.3 and 4.4 (conditional dreambreaker in YAML) are subsumed by the round-trip property (4.5), which verifies both the presence and absence cases. Requirements 5.1, 5.2, 5.3, and 5.4 are all subsumed by the standings comparator invariant (5.5), since correct ranking requires correct game-win counting.

### Property 1: Form validation detects all missing required fields

*For any* valid form data and any non-empty subset of required fields that are blanked, `validateForm` SHALL return `{ valid: false }` and `missing` SHALL contain every blanked field name.

**Validates: Requirements 2.6, 3.1, 3.4**

### Property 2: Form validation accepts complete form without Dreambreaker

*For any* valid form data that includes all eight Mixed Doubles score fields and omits `dream_home` and `dream_away`, `validateForm` SHALL return `{ valid: true, missing: [] }`.

**Validates: Requirements 3.2, 3.3, 2.5**

### Property 3: YAML serialization round-trip preserves all match fields

*For any* valid match object using the new schema (with `mixed_doubles_1` through `mixed_doubles_4`, and with or without an optional `dreambreaker`), parsing the YAML string produced by `serializeMatchYaml` SHALL yield an object with field values equivalent to the original — including the presence or absence of the `dreambreaker` key.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 4: Standings ranking satisfies the comparator invariant

*For any* schedule of matches using the new six-game format (with optional Dreambreaker), the array returned by `computeStandings` SHALL be ordered such that for every adjacent pair (A, B), A has strictly more match wins than B, or A and B have equal match wins and A has at least as many total game wins as B.

**Validates: Requirements 5.1, 5.3, 5.4, 5.5**

---

## Error Handling

**Missing required fields**: `validateForm` returns `{ valid: false, missing: [...] }`. The form UI marks each missing field group with `has-error` and shows the `#score-errors` banner for score fields.

**Optional Dreambreaker absent from form**: `serializeMatchYaml` checks `match.result.dreambreaker != null` before emitting the block. If the user leaves `dream_home`/`dream_away` empty, `submitMatchResult` passes `null` (or omits the key) for dreambreaker when constructing the match object.

**Liquid template — missing dreambreaker key**: The `{% if match.result.dreambreaker %}` guard in `match-row.html` renders `—` when the key is absent. Liquid evaluates a missing key as falsy, so no explicit `nil` check is needed.

**Liquid template — missing result block**: The existing `{% if match.result %}` guard in `match-row.html` already handles unplayed matches. The `colspan` value must be updated from 4 to 7 to span all game columns.

**YAML migration**: The existing week-1 entry in `spring-2026.yml` has a single `mixed_doubles` key. It must be manually split into `mixed_doubles_1` through `mixed_doubles_4` with the original score assigned to `mixed_doubles_1` and placeholder scores (or the same score) for 2–4. Since this is real historical data, the league administrator should confirm the correct scores before migration.

---

## Testing Strategy

### Unit / Example-Based Tests

- `validateForm` with all required fields present → `valid: true`
- `validateForm` with old `mixed_home`/`mixed_away` fields (no new fields) → `valid: false`, missing contains new field names
- `serializeMatchYaml` with no dreambreaker → output does not contain `dreambreaker:`
- `serializeMatchYaml` with dreambreaker → output contains `dreambreaker:` block

### Property-Based Tests (fast-check, 100 iterations each)

The test file uses [fast-check](https://github.com/dubzzz/fast-check) for property-based testing.

**Updated arbitraries:**

```js
// matchResultArb — new schema with optional dreambreaker
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

// validFormArb — new required field names, no dream fields
const validFormArb = fc.record({
  home_team:    teamIdArb,
  away_team:    teamIdArb,
  season:       fc.constantFrom('spring-2026', 'fall-2026'),
  week:         fc.integer({ min: 1, max: 20 }).map(String),
  match_date:   dateStrArb,
  location:     locationArb,
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
});

// requiredFields — excludes dream_home, dream_away
const requiredFields = [
  'home_team', 'away_team', 'season', 'week', 'match_date', 'location',
  'mens_home', 'mens_away', 'womens_home', 'womens_away',
  'mixed_1_home', 'mixed_1_away',
  'mixed_2_home', 'mixed_2_away',
  'mixed_3_home', 'mixed_3_away',
  'mixed_4_home', 'mixed_4_away',
];
```

**Property 1 test** — tag: `Feature: match-format-update, Property 1: Form validation detects all missing required fields`

**Property 2 test** — tag: `Feature: match-format-update, Property 2: Form validation accepts complete form without Dreambreaker`

**Property 3 test** (replaces existing Property 9) — tag: `Feature: match-format-update, Property 3: YAML serialization round-trip preserves all match fields`
- Verify `mixed_doubles_1` through `mixed_doubles_4` round-trip correctly
- Verify `dreambreaker` is present in parsed output when the input had it, and absent when it did not

**Property 4 test** (replaces existing Property 4) — tag: `Feature: match-format-update, Property 4: Standings ranking satisfies the comparator invariant`
- Uses updated `matchResultArb` so schedules include the new six-game format

### Integration Tests

- Render `match-row.html` with a full result (all 4 mixed + dreambreaker) → 7 score `<td>` elements
- Render `match-row.html` with a result missing dreambreaker → dreambreaker column shows `—`
- Render `match-row.html` with no result → single `<td colspan="7">` scheduled badge
- Render `standings-table.html` with the migrated `spring-2026.yml` → standings computed without error
