# Requirements Document

## Introduction

The Round-Robin Session Manager is a new interactive page on the Junebug Pickleball League website that allows a session organizer to run a round-robin play session in real time. The organizer configures the session (number of players, courts, rounds, and format), the system generates a match schedule, and players can track the current round's court assignments and a live leaderboard. After each round, the organizer submits scores, and the leaderboard updates accordingly.

Because the site is a Jekyll static site hosted on GitHub Pages, all interactive behavior — session state, schedule generation, score tracking, and leaderboard computation — must be implemented entirely in client-side JavaScript. Jekyll/Liquid is used only to render the static page shell.

## Glossary

- **Session**: A single round-robin play event with a defined set of players, courts, and rounds.
- **Session_Manager**: The client-side JavaScript application that manages session state, schedule generation, score submission, and leaderboard computation.
- **Organizer**: The person running the session who configures it and submits scores.
- **Player**: An individual participant registered in the session.
- **Court**: A physical pickleball court on which a match is played.
- **Round**: One iteration of play in which all (or most) players are assigned to matches simultaneously across available courts.
- **Match**: A single game played between two players or two pairs of players on one court during one round.
- **Single Round-Robin**: A format in which every player faces every other player exactly once.
- **Double Round-Robin**: A format in which every player faces every other player exactly twice.
- **Leaderboard**: A ranked list of players sorted by wins, then by point differential as a tiebreaker.
- **Bye**: An unplayed slot assigned to a player when the number of players cannot fill all courts in a round.
- **Session_Storage**: The browser's `sessionStorage` API used to persist session state across page refreshes without a backend.

## Requirements

### Requirement 1: Session Configuration

**User Story:** As an organizer, I want to configure a round-robin session before it starts, so that the session matches the number of players and courts available at my venue.

#### Acceptance Criteria

1. THE Session_Manager SHALL provide a configuration form with the following fields: player count (integer), number of courts (integer), number of rounds (integer), and format (single or double round-robin).
2. WHEN the organizer submits the configuration form, THE Session_Manager SHALL validate that player count is between 2 and 32 inclusive.
3. WHEN the organizer submits the configuration form, THE Session_Manager SHALL validate that court count is between 1 and 16 inclusive.
4. WHEN the organizer submits the configuration form, THE Session_Manager SHALL validate that round count is between 1 and 64 inclusive.
5. IF any configuration field contains an invalid value, THEN THE Session_Manager SHALL display an inline error message identifying the invalid field and the allowed range, and SHALL NOT start the session.
6. WHEN the organizer submits a valid configuration form, THE Session_Manager SHALL transition from the configuration view to the session view.
7. THE Session_Manager SHALL provide a field for the organizer to enter each player's name before starting the session, with one name input per player slot derived from the configured player count.
8. IF a player name field is left empty when the session is started, THEN THE Session_Manager SHALL substitute a default name in the format "Player N" where N is the 1-based index of that player slot.

### Requirement 2: Round-Robin Schedule Generation

**User Story:** As an organizer, I want the system to automatically generate a fair match schedule, so that I don't have to manually pair players each round.

#### Acceptance Criteria

1. WHEN a session is started, THE Session_Manager SHALL generate a complete match schedule covering all configured rounds.
2. THE Session_Manager SHALL use a standard round-robin rotation algorithm (e.g. circle method) to produce the schedule such that, in a single round-robin format, each player pair appears as opponents exactly once across all rounds.
3. WHERE double round-robin format is selected, THE Session_Manager SHALL generate a schedule in which each player pair appears as opponents exactly twice across all rounds.
4. WHEN the number of players is odd, THE Session_Manager SHALL assign one player per round a bye, distributing byes as evenly as possible across players.
5. THE Session_Manager SHALL assign matches to courts such that the number of active matches per round does not exceed the configured court count.
6. WHEN the number of player pairs in a round exceeds the configured court count, THE Session_Manager SHALL queue the excess pairs and carry them into subsequent rounds or assign byes, maintaining schedule fairness.
7. THE Session_Manager SHALL label each court assignment with a court number (1 through N, where N is the configured court count).

### Requirement 3: Current Round Display

**User Story:** As a player, I want to see who I'm playing and on which court for the current round, so that I can get to the right court without asking the organizer.

#### Acceptance Criteria

1. WHILE a session is active, THE Session_Manager SHALL display the current round number and the total number of rounds (e.g. "Round 2 of 5").
2. WHILE a session is active, THE Session_Manager SHALL display each match for the current round as a card showing: court number, player 1 name, and player 2 name (or pair names for doubles).
3. WHILE a session is active, THE Session_Manager SHALL display any players assigned a bye for the current round in a clearly labeled "Sitting Out" section.
4. WHEN a new round begins, THE Session_Manager SHALL update the current round display to reflect the new round's court assignments without requiring a page reload.

### Requirement 4: Score Submission

**User Story:** As an organizer, I want to submit scores after each round, so that the leaderboard stays current throughout the session.

#### Acceptance Criteria

1. WHILE a session is active, THE Session_Manager SHALL display a score submission form listing each match in the current round with input fields for each player's score.
2. THE Session_Manager SHALL accept scores as non-negative integers.
3. IF a score field is submitted with a non-numeric or negative value, THEN THE Session_Manager SHALL display an inline validation error for that field and SHALL NOT advance the round.
4. WHEN the organizer submits valid scores for all matches in the current round, THE Session_Manager SHALL record the results and update the leaderboard.
5. WHEN the organizer submits valid scores for all matches in the current round and the current round is not the final round, THE Session_Manager SHALL advance the session to the next round.
6. WHEN the organizer submits valid scores for the final round, THE Session_Manager SHALL mark the session as complete and display the final leaderboard.
7. THE Session_Manager SHALL allow the organizer to correct scores for the current round before advancing by re-submitting the score form.

### Requirement 5: Live Leaderboard

**User Story:** As a player, I want to see a live leaderboard during the session, so that I know where I stand relative to other players.

#### Acceptance Criteria

1. WHILE a session is active, THE Session_Manager SHALL display a leaderboard ranking all players by wins in descending order.
2. WHEN two or more players have the same number of wins, THE Session_Manager SHALL rank them by cumulative point differential (points scored minus points conceded) in descending order.
3. WHEN two or more players have the same wins and the same point differential, THE Session_Manager SHALL rank them by total points scored in descending order.
4. WHEN scores are submitted for a round, THE Session_Manager SHALL update the leaderboard immediately without requiring a page reload.
5. THE Session_Manager SHALL display each leaderboard row with: rank, player name, wins, losses, and point differential.
6. WHILE a session is active, THE Session_Manager SHALL visually distinguish the top-ranked player(s) from the rest of the leaderboard.

### Requirement 6: Session Persistence

**User Story:** As an organizer, I want the session to survive an accidental page refresh, so that I don't lose progress mid-session.

#### Acceptance Criteria

1. WHEN session state changes (configuration saved, round advanced, scores submitted), THE Session_Manager SHALL persist the full session state to Session_Storage.
2. WHEN the page is loaded and Session_Storage contains a saved session, THE Session_Manager SHALL restore the session to its last known state and resume from the current round.
3. THE Session_Manager SHALL provide a "Reset Session" button visible during an active session that clears Session_Storage and returns the page to the configuration view with all configuration fields restored to their default values.
4. WHEN the organizer clicks "Reset Session", THE Session_Manager SHALL display a confirmation prompt warning that all round data and scores will be permanently lost before proceeding.
5. IF the organizer cancels the confirmation prompt, THEN THE Session_Manager SHALL dismiss the prompt and leave the session state unchanged.

### Requirement 7: Session Completion

**User Story:** As an organizer, I want a clear end state when all rounds are done, so that I can announce the final results.

#### Acceptance Criteria

1. WHEN the final round's scores are submitted, THE Session_Manager SHALL display a "Session Complete" banner.
2. WHEN the session is complete, THE Session_Manager SHALL display the final leaderboard with the winner highlighted.
3. WHEN the session is complete, THE Session_Manager SHALL display a "Start New Session" button that clears the current session and returns to the configuration view.
4. WHEN the session is complete, THE Session_Manager SHALL display a summary showing total rounds played and total matches played.
