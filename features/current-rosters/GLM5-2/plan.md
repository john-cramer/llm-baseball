# Plan — Current Rosters Feature

## Architecture

Single-page app with three files:
- `index.html` — page structure
- `styles.css` — baseball-themed styling
- `app.js` — API integration, state management, rendering

No build step, no dependencies. Works from filesystem.

## Layout

```
+------------------------------------------+----------------+
| Header (title + season year)             |  Navigation    |
+------------------------------------------+  (right panel)  |
|                                          |                |
|  Team Overview                           |  AL East       |
|  (logo, manager, mascot, stadium,        |    - Yankees   |
|   W/L, streak, last 10, div rank)        |    - Red Sox   |
|                                          |    - ...       |
|  Player Cards (3 per row, 12 cards)      |  AL Central    |
|  +---+ +---+ +---+                       |    - ...       |
|  |   | |   | |   |                       |  AL West       |
|  +---+ +---+ +---+                       |    - ...       |
|  +---+ +---+ +---+                       |  NL East       |
|  |   | |   | |   |                       |    - ...       |
|  +---+ +---+ +---+                       |  ...           |
|  +---+ +---+ +---+                       |                |
|  |   | |   | |   |                       |                |
|  +---+ +---+ +---+                       |                |
|  +---+ +---+ +---+                       |                |
|  |   | |   | |   |                       |                |
|  +---+ +---+ +---+                       |                |
|                                          |                |
|  Remaining Roster (text list)            |                |
|                                          |                |
+------------------------------------------+----------------+
| Footer (copyright + self-attribution)                     |
+-----------------------------------------------------------+
```

## API endpoints

| Purpose | Endpoint |
|---|---|
| All teams | `GET /teams?sportId=1` |
| Roster | `GET /teams/{id}/roster?season={year}&hydrate=person` |
| Coaches | `GET /teams/{id}/coaches?season={year}` |
| Standings | `GET /standings?leagueId=103,104&season={year}&standingsTypes=regularSeason` |
| Hitting stats | `GET /people/{id}/stats?stats=season&group=hitting&season={year}` |
| Pitching stats | `GET /people/{id}/stats?stats=season&group=pitching&season={year}` |

All rooted at `https://statsapi.mlb.com/api/v1`.

## Player selection logic

### 9 position players
Pick the player with the most plate appearances at each position:
- C, 1B, 2B, 3B, SS, DH — one each
- OF — top 3 outfielders by plate appearances (LF, CF, RF, OF combined)

### 3 pitchers
At least 2 starters (ranked by ERA, min 5 starts) + at least 1 reliever (ranked by saves, then holds). Criteria stated on page.

## Stats per card
4 stats per card, consistent count across all cards. Stats chosen per-player based on what they're notable for (e.g., SB for a base stealer, RBI for a run producer, ERA for an ace, SV for a closer).

## Season year
Derived from the `season` field in the teams API response (2026), with fallback to current date year.
