# Plan — Current Rosters (Fable 5)

Single file: `index.html` (inline CSS + JS, no dependencies, works from `file://`).

## Data flow

1. On load: `GET /teams?sportId=1` → build right-hand nav grouped AL/NL → East/Central/West
   (division sort order fixed manually; API division names end in "East"/"Central"/"West").
   Season year = `teams[0].season`; fallback `GET /seasons/current?sportId=1`.
2. On load (parallel): `GET /standings?leagueId=103,104&season={yr}` → cache map
   `teamId → { W, L, streakCode, lastTen, divisionRank, gamesBack }`.
3. On team click, fetch in parallel:
   - `GET /teams/{id}/roster?rosterType=active&hydrate=person(stats(group=[hitting,pitching],type=[season],season={yr}))`
   - `GET /teams/{id}/coaches` → manager = jobId "MNGR", else any job containing "Manager".
4. Render overview panel (logo, manager, mascot from local knowledge table keyed by
   team id — omitted when null, stadium from `venue.name`, standings stats), card grid,
   remaining-roster list, footer copyright from the live response's `copyright` field.

## Selection logic

**9 position players** — bucket non-pitchers by roster position (LF/CF/RF/OF → one
OF bucket; TWP counts as a hitter). Pick max `plateAppearances` for C, 1B, 2B, 3B,
SS, DH; top three from the OF bucket. If a bucket is empty (e.g. no listed DH),
fill with the highest-PA unselected non-pitcher so the grid always has nine.

**3 pitchers** — starters = `gamesStarted >= 3` and `gamesStarted / gamesPitched >= 0.5`.
Notability scores (stated on the page): starters by innings + strikeouts + wins,
penalized by ERA; relievers by saves + holds, penalized by ERA. Take top 2 starters +
top 1 reliever.

**Card stats** — 4 stats per card, always. Chosen per player by salience: each
candidate stat is scored against a typical-value baseline (e.g. SB/20, HR/25, RBI/80,
AVG/.270 …) and the four most distinctive are shown; pitchers likewise (SV, W, ERA,
SO, WHIP, IP, K/9, HLD). Guarantees a consistent count with per-player character.

## Images

All keyed by API-supplied IDs (verified live):
- Headshot: `img.mlbstatic.com/mlb-photos/image/upload/…/people/{id}/headshot/67/current`
  with `midfield.mlbstatic.com/v1/people/{id}/spots/120` as onerror fallback, then an
  inline-SVG silhouette.
- Team logo: `www.mlbstatic.com/team-logos/{teamId}.svg`.

## Style

Modern baseball: ballpark green + chalk white + clay red accents, scoreboard-style
numerals for stats, stitched-seam accents on cards, pennant-shaped division headers,
sticky right-hand nav, responsive 3-per-row grid. Loading skeletons + error state
with retry.
