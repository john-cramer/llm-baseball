# Work Log — Current Rosters Feature

## Start time
2026-07-29 00:00 -04:00

## API exploration

### 2026-07-29 00:01 — Teams endpoint confirmed
`GET /teams?sportId=1` returns all 30 MLB teams with league, division, venue, and season (2026). Each team has `id`, `name`, `abbreviation`, `league.id`, `league.name`, `division.id`, `division.name`, `venue.name`.

### 2026-07-29 00:02 — Roster endpoint confirmed
`GET /teams/{id}/roster?season=2026&hydrate=person` returns active roster with player IDs, names, jersey numbers, positions, and full person details (height, weight, batSide, pitchHand, etc.). The `hydrate=person` parameter embeds personal details. Stats hydration via `hydrate=stats(...)` did NOT embed stats — stats must be fetched per-player.

### 2026-07-29 00:03 — Coaches endpoint confirmed
`GET /teams/{id}/coaches?season=2026` returns coaching staff. Manager found by filtering `job === "Manager"`. Phillies manager: Rob Thomson.

### 2026-07-29 00:03 — Standings endpoint confirmed
`GET /standings?leagueId=103,104&season=2026&standingsTypes=regularSeason` returns team records with: `leagueRecord.wins`, `leagueRecord.losses`, `leagueRecord.pct`, `streak.streakCode`, `divisionRank`, `records.splitRecords` (type "lastTen" gives W/L over last 10).

### 2026-07-29 00:04 — Player stats confirmed
- Hitting: `GET /people/{id}/stats?stats=season&group=hitting&season=2026` — returns `plateAppearances`, `homeRuns`, `rbi`, `avg`, `obp`, `slg`, `ops`, `stolenBases`, `runs`, `hits`, `doubles`, etc.
- Pitching: `GET /people/{id}/stats?stats=season&group=pitching&season=2026` — returns `era`, `wins`, `losses`, `saves`, `holds`, `strikeOuts`, `inningsPitched`, `whip`, `gamesStarted`, `gamesPlayed`, etc.

### 2026-07-29 00:05 — Player photos (initial attempt)
The `/people/{id}` endpoint does not include a photo URL. Initially tried `https://midfieldr.mlbstatic.com/v1/people/{playerId}/spots/290` — host did not resolve. Also tried `https://img.mlbstatic.com/mlb-photos/image/upload/d_people/mlb/{id}.png` — returned a 6542-byte default silhouette for all players (not real photos).

### 2026-07-29 00:10 — Player photos (correct URL found)
Scraped MLB.com player page for J.T. Realmuto and found the actual headshot URL pattern used by MLB.com:
`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/{playerId}/headshot/67/current`
Verified this returns real JPEG photos (60–82 KB, different per player). The `d_people:generic:headshot:67:current.png` parameter provides a fallback silhouette for players without photos. Team logos confirmed at `https://www.mlbstatic.com/team-logos/{teamId}.svg` (200 OK, SVG).

### 2026-07-29 00:06 — Mascots
Mascots are not in the API. Supplying from knowledge. Teams without official mascots: Yankees, Dodgers, Angels — will omit gracefully.

## Milestones

### 2026-07-29 00:07 — Page structure built
Created `index.html` with header (title + season label), main content area (welcome state, team overview, pitcher criteria, player cards grid, remaining roster), right-hand navigation panel, and footer (API copyright + self-attribution). Created `styles.css` with modern baseball vibe: field-green header, clay accent stitching, card-style player cards, dark navigation panel.

### 2026-07-29 00:08 — API integration built
Created `app.js` with:
- Teams fetch on load → builds right-side nav grouped by AL/NL × East/Central/West
- Team click → parallel fetch of roster (`hydrate=person`), coaches (manager), and standings
- Per-player stat fetches (hitting for position players, pitching for pitchers) in parallel
- Position player selection: most PAs at C, 1B, 2B, 3B, SS, 3×OF, DH = 9 players
- Pitcher selection: 2 starters by ERA (min 5 GS) + 1 reliever by saves = 3 players
- Notable stat selection: 4 stats per card, scored/normalized per player to highlight strengths
- Remaining roster listed below cards with name, position, jersey number, B/T
- Season year derived from API `season` field (2026)
- Auto-loads first team on page load

### 2026-07-29 00:11 — Photo URL corrected
Updated `PHOTO_URL` from the non-resolving midfieldr CDN to the correct `img.mlbstatic.com` headshot path discovered from MLB.com page HTML. All test player photos now return real JPEGs.

### 2026-07-29 00:12 — Card display refined
Added pitcher role (SP/RP) to card position display. Updated remaining roster heading to "Roster". Page loaded in browser for testing.

### 2026-07-29 00:13 — Testing
Page opened in default browser. All files are self-contained (HTML, CSS, JS) with no build step or dependencies. Data is fetched live from the MLB Stats API.

## Completion time
2026-07-29 00:13 -04:00
