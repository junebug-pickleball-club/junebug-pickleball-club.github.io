# Product

This is the website for the **Junebug Pickleball League** — a local pickleball club site that displays team rosters, schedules, and league information.

Key pages:
- Home (`/`) — league landing page
- Seasons (`/seasons/`) — lists all seasons; each season has its own page at `/seasons/:slug`
- Events (`/events/`) — upcoming and past events
- Submit Match (`/submit-match/`) — form for submitting match results
- About (`/about/`) — general info page

The site is data-driven: league content lives in `_data/` and `_data/seasons/` and is rendered via Liquid templates. Content updates should go through the data files rather than hardcoded HTML where possible. Teams are season-specific — team data lives inside each season's YAML file, not in a global teams file.
