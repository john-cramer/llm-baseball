# Work Log — Current Rosters (Fable 5)

## 2026-07-29 00:09 — Start

Work begins. Read `prompt.md`. The deliverable is a self-contained single-page app
(`index.html`) that shows current MLB rosters styled as baseball cards, with a
right-hand team nav grouped by league/division, a team overview panel (logo,
manager, mascot, stadium, standings stats), a 12-player card grid (9 position
players by plate appearances + 3 notable pitchers), a text list of the rest of
the roster, live data from `https://statsapi.mlb.com/api/v1`, and the API
copyright verbatim in the footer plus a self-attribution blurb.

Plan of attack:
1. Explore the MLB Stats API with curl to verify endpoints and response shapes
   (teams, rosters, person hydration, season stats, standings, headshots, logos).
2. Sketch the approach in `plan.md`.
3. Build `index.html` (single file: HTML + CSS + JS).
4. Verify in a browser against live data.

Next: API exploration.

## 2026-07-29 00:14 — API exploration complete

Verified every endpoint with curl before trusting it. Findings:

- `GET /teams?sportId=1` → 30 teams with `id`, `name`, `season` (2026 — this is
  how I'll derive the season year), `venue.name` (stadium), `league.{id,name}`,
  `division.{id,name}`, `abbreviation`, `clubName`. Copyright string confirmed:
  "Copyright 2026 MLB Advanced Media, L.P. …" — the page must render whatever
  `copyright` field the live response carries, verbatim.
- `GET /teams/{id}/roster?rosterType=active` → 26-man roster; each entry has
  `person.{id,fullName}`, `jerseyNumber`, `position.{abbreviation,type}`.
  Position abbreviations seen on the Mets: P×13, CF×3, C×2, 1B×2, 3B×2, RF, SS,
  DH, 2B — so outfielders come pre-labeled LF/CF/RF (sometimes OF), which I'll
  bucket together per the prompt.
- Hydration works and saves a per-player fan-out:
  `roster?rosterType=active&hydrate=person(stats(group=[hitting,pitching],type=[season],season=2026))`
  returns the full person (primaryPosition, primaryNumber, batSide, pitchHand)
  plus season stat splits. Hitting split includes `plateAppearances`, `avg`,
  `ops`, `homeRuns`, `rbi`, `stolenBases`, `runs`, `hits`, `doubles`, `obp`,
  `slg`, `strikeOuts`, `baseOnBalls`. Pitching split includes `era`, `whip`,
  `wins`, `losses`, `gamesStarted`, `gamesPitched`, `saves`, `holds`,
  `inningsPitched`, `strikeOuts`, `strikeoutsPer9Inn`, `saveOpportunities`.
- `GET /standings?leagueId=103,104&season=2026` → per-team `leagueRecord`
  (W/L), `streak.streakCode` (e.g. "L1"), `divisionRank`, `gamesBack`, and a
  `records.splitRecords[]` array containing a `type:"lastTen"` entry. One call
  covers all 30 teams, so I'll fetch it once and cache.
- `GET /teams/{id}/coaches` → staff list with `job`/`jobId`; the manager is
  `jobId:"MNGR"` (Mets currently show "Interim Manager", jobId "NTRM", so I'll
  match any job containing "Manager" with plain "Manager" preferred).
- `GET /seasons/current?sportId=1` → `seasonId:"2026"` plus season date ranges;
  a second confirmation of the season year.
- Photos: the Stats API serves JSON only, but MLB's official static image
  service resolves images by the person/team IDs the API returns. Verified:
  `https://midfield.mlbstatic.com/v1/people/{id}/spots/120` → 200 image/png,
  `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best/v1/people/{id}/headshot/67/current`
  → 200 image/jpeg, and `https://www.mlbstatic.com/team-logos/{teamId}.svg` →
  200 image/svg+xml. These are keyed entirely off API-supplied IDs — no
  hardcoded per-player data.

Decision: derive the season from `teams[0].season` (with `seasons/current` as a
fallback), never from a hardcoded year. Next: write plan.md, then build.

Also verified the image endpoints support a built-in generic fallback:
`d_people:generic:headshot:67:current.png` in the transformation path returns a
silhouette for unknown IDs (tested with id 99999999 → 200 image/jpeg), so
missing photos degrade gracefully without JS gymnastics. Kept a one-step
`onerror` chain (spots PNG → inline SVG) as belt-and-suspenders anyway.

## 2026-07-29 00:18 — Plan written

`plan.md` sketched: data flow, the featured-twelve selection rules, the
"salience" scheme for picking each card's four stats, image strategy, style
direction. One wrinkle worth recording: the API has no per-position plate
appearance split, so "most PAs at each position" is implemented as *bucket
players by their roster-listed position, pick the highest season PA in each
bucket* (LF/CF/RF/OF pooled; two-way players compete for the DH slot; empty
buckets back-filled by best remaining bat so the grid is always nine).

Consulted the bundled dataviz guidance before building the overview stat tiles
(label casing, semibold sans values with proportional figures, streak delta
colored by direction but never color-alone — the W/L letter carries it).

## 2026-07-29 00:28 — index.html built

Single self-contained file, no dependencies, works from file://. Highlights:

- Right-hand sticky "dugout" nav: AL/NL → East/Central/West → 30 clubs with
  logos, alphabetical within division; collapses to a two-column panel above
  the content on narrow screens.
- Overview panel: logo in a circular well, manager (from /coaches, handles
  interim titles), mascot from a local knowledge table keyed by team id
  (omitted for the Angels, Dodgers, Yankees — no official mascot), stadium
  from venue.name, and four scoreboard tiles: record, streak (▲/▼), last 10,
  division rank + games back.
- 12 baseball cards, 3 per row: photo framed in team colors, jersey number,
  position chip, name, B/T + age, and a dashed "stitch" divider above exactly
  four stats chosen by per-player salience (counting-stat baselines prorated
  by the team's games played so mid-season numbers rank fairly against rate
  stats). Selection criteria stated on the page above the grid.
- Pitcher notability: starters = GS≥3 and ≥half their appearances as starts,
  scored on IP/SO/W minus an ERA penalty; relievers scored on SV/HLD minus an
  ERA penalty; top two starters + top one reliever, so the ≥2 SP / ≥1 RP
  requirement holds by construction.
- Remaining roster listed below as compact rows: jersey, name, B/T, mini stat
  line, position chip.
- States: welcome ("Step up to the plate"), shimmer skeletons while loading,
  error card with retry; in-flight fetches aborted when switching teams to
  avoid render races.
- Footer: MLB copyright taken verbatim from the live response's `copyright`
  field, plus self-attribution (Claude Fable 5, Anthropic, 2026-07-29).

Next: verify against the live API.

## 2026-07-29 00:33 — Verified headlessly against the live API

Chrome automation wasn't available, so I wrote a Node harness (scratchpad,
not shipped) that stubs a minimal DOM, evals the page's actual `<script>`,
runs `init()` + `selectTeam()` against the live API, and asserts on the
rendered HTML. Tested seven teams across both leagues (Mets, Dodgers,
Yankees, Athletics, Orioles, White Sox, Rockies). Every check passed:

- 30 teams, season derived as 2026, standings map for all 30, copyright
  rendered verbatim.
- Exactly 12 cards per team; exactly 2 SP + 1 RP; exactly 4 stats per card;
  no `undefined`/`null`/`NaN` leaks; overview, tiles, criteria text, and
  rest-of-roster rows (26 − 12 = 14) all present.
- Edge cases confirmed: Shohei Ohtani (two-way) lands once, in the DH slot;
  the Yankees (no roster-listed DH) back-fill the ninth slot with their
  highest-PA remaining bat; the Mets' interim manager renders with his title.
- Salience picks read like a card collector would want: Freeman leads with
  doubles, Chisholm with stolen bases, Bednar with ERA/saves.

Removed the API dump I'd curled into the folder during exploration; the
deliverables are `index.html`, `plan.md`, and this log.

## 2026-07-29 00:34 — Complete

Work finished. Total elapsed: ~25 minutes. Open the page by double-clicking
`index.html`; it needs only an internet connection to reach the MLB Stats API.
