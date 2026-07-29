# Work Log — Current Rosters (Kimi K3)

## 2026-07-28 23:55 — Start
Beginning work on the "Current Rosters" feature: a single-page app showing current MLB team
rosters as baseball-card-style player cards, fed live from the MLB Stats API.
First step: explore and verify the API endpoints I plan to rely on (teams, rosters, season
stats, standings, coaches, player photos) before writing any code.

## 2026-07-29 00:05 — API exploration complete
Verified against the live API (curl, saved samples in temp/):
- `GET /teams?sportId=1&season=2026` — 30 teams; has id, name, abbreviation, venue (stadium),
  league, division, season. Response embeds the copyright string to reuse in the footer.
- `GET /teams/{id}/roster?rosterType=active&season=2026&hydrate=person(stats(type=season,group=[hitting,pitching]))`
  — 26-man active roster with season hitting/pitching stats attached to each person.
  Gotchas found: (a) curl needs `-g` for the bracketed hydrate param (browsers fine, but worth
  noting); (b) traded players have MULTIPLE splits — an aggregate split with empty team plus one
  per team, so code must prefer the aggregate (no team id) split; (c) pitchers can carry a
  hitting group and vice versa, so group selection must be explicit.
- `GET /standings?leagueId=103,104&season=2026&standingsTypes=regularSeason` — per team:
  wins/losses, divisionRank, streak.streakCode (e.g. "L1"), records.splitRecords type=lastTen.
- `GET /teams/{id}/coaches?season=2026` — staff list under `roster`; manager is job === "Manager".
- Player photos: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/{id}/headshot/67/current`
  returns 200 JPEG for real players AND a generic headshot for unknown ids (no broken images).
- Team logo: `https://www.mlbstatic.com/team-logos/{id}.svg` — 200 SVG.
Next: write plan.md, then build the single-file index.html.

## 2026-07-29 00:10 — Plan written, build started
plan.md captures architecture, endpoints, layout, selection rules, and styling. Building
index.html as one self-contained file (embedded CSS/JS, no dependencies).

## 2026-07-29 00:20 — index.html built; logic verified in Node
Full page implemented: right-hand nav (AL/NL x East/Central/West), team overview (logo,
manager via /coaches, mascot from built-in map, stadium, record/streak/last-10/division
rank), 12 three-across baseball cards (9 position players by PA per slot + 2 SP by IP + 1 RP
by appearances), 4 "standout" stats per card scored against the featured peer group,
remaining-roster list, footer with verbatim API copyright and self-attribution.
Extracted the script and ran it in Node against four saved live rosters (NYY, BOS, LAD,
ATH): every team yields exactly 12 featured players (9+3, >=2 SP, >=1 RP), no duplicates,
4 stats each. Traded players correctly use the aggregate season split. Ohtani comes through
as primary position "TWP" — added a "Two-Way Player" label mapping.

## 2026-07-29 00:26 — End-to-end browser verification
Rendered the real page in headless Chrome from file:// with live API calls:
- NYY via #team=147: badge "2026 Season", 12 cards, manager Aaron Boone, Yankee Stadium,
  mascot row correctly omitted, copyright in footer, no errors.
- BAL via #team=110: mascot "The Oriole Bird" shown; found and fixed a formatting bug
  ("2nd, NYY East" -> "2nd, AL East"); Orioles have no primary-DH on the active roster, and
  the fallback (next-best hitter by PA) filled the 9th slot as designed.
- Screenshot reviewed: layout, stitching, watermarked jersey numbers, dynamic stats
  (SB for speedsters, SV/HLD for the reliever) all render as intended.
Cleaned up the temporary Chrome profile; sample API responses kept in temp/.

## 2026-07-29 00:27 — Complete
Feature finished and verified. Files: index.html (the app), plan.md, log.md, temp/ (test
artifacts and API samples).
