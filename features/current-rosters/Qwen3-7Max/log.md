# Work Log - Current Rosters Feature

## Start Time
**2026-07-28 23:56** — Beginning work on the MLB Current Rosters single-page web app.

## Plan
- Explore MLB Stats API to discover endpoints for teams, rosters, player stats, and photos
- Build a self-contained HTML/CSS/JS page
- Right-side nav with 30 teams organized by league/division
- Team overview panel with logo, manager, mascot, stadium, stats
- Baseball card grid (12 players: 9 position + 3 pitchers)
- Remaining roster as text list
- Modern baseball aesthetic

---

## Milestone 1: API Discovery
**2026-07-29 00:05** — Completed API exploration. Confirmed endpoints:

- `GET /teams?sportId=1` → all 30 teams with league/division/venue
- `GET /teams/{id}/roster` → active roster (person ID, position, jersey #)
- `GET /teams/{id}/roster?rosterType=coach` → coaching staff (manager has jobId "MNGR")
- `GET /people/{id}?hydrate=stats(group=[hitting,pitching],type=season,season=2026)` → player details + season stats
- `GET /standings?leagueId=103,104&season=2026` → standings (W/L, streak, lastTen, divisionRank)
- Player photos: `https://img.mlbstatic.com/mlb-photos/image/upload/v1/people/{id}/headshot/67/current`
- Team logos: `https://www.mlbstatic.com/team-logos/{id}.svg`
- Copyright: "Copyright 2026 MLB Advanced Media, L.P."

**Next:** Build the complete HTML/CSS/JS page.

---

## Milestone 2: Page Built
**2026-07-29 00:07** — Completed the full index.html implementation:

- Self-contained HTML/CSS/JS page with no build step or dependencies
- Right-side navigation panel with all 30 MLB teams organized by League (AL/NL) and Division (East/Central/West)
- Team overview panel with logo (SVG from MLB static), manager (from coaches endpoint), mascot (hardcoded map), stadium, and team stats (W-L, streak, L10, division rank from standings)
- Baseball card grid (3 per row) featuring 12 players:
  - 9 position players: C, 1B, 2B, 3B, SS, 3x OF, DH — selected by most plate appearances at each position
  - 3 pitchers: 2 starters (by IP + K - ERA score) + 1 reliever (by SV + K - ERA score)
  - Criteria stated on page
- Each card: photo, name, jersey number, position, 4 current-season stats
  - Hitters: AVG, HR, RBI, + highlight stat (SB for base stealers, OPS for power hitters, Runs, or OBP)
  - Pitchers: ERA, W-L, SO, + SV (relievers) or WHIP (starters)
- Remaining roster listed below cards with name, position, jersey #, and key stats
- Season year derived from API response
- Copyright notice from API displayed in footer
- Self-attribution in footer (model name, provider, date)
- Loading spinners and error states with retry buttons
- Modern baseball aesthetic: dark navy background, red accents, cream-colored cards with stitching details

**Bugs fixed during build:**
- Division name parsing regex was inconsistent between AL and NL — fixed with `/(?:American|National)\s+League\s+/`
- Featured player ID mapping used wrong property name — corrected to `f.person.id`
- Photo error handler had quote escaping issues — replaced with dedicated JS function
- Added guard for empty roster edge case

---

## Completion Time
**2026-07-29 00:07** — Feature complete. Single file: `index.html`.
