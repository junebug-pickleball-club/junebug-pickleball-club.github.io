# Product

This is the website for the **Junebug Pickleball League** — a local pickleball club site that displays team rosters, schedules, and league information.

Key pages:
- Home (`/`) — league landing page
- Teams (`/teams`) — lists all teams with rosters
- About (`/about`) — general info page

The site is data-driven: team and schedule data lives in `_data/data.yml` and is rendered via Liquid templates. Content updates should go through the data file rather than hardcoded HTML where possible.
