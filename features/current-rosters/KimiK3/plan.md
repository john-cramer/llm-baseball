# Plan — Current Rosters

## Architecture
Single self-contained `index.html` (embedded CSS + JS, no build step, no dependencies).
Runs from the filesystem; all data fetched live from the MLB Stats API at view time.

## Endpoints (verified)
- Teams: `/teams?sportId=1&season={year}` — nav, overview (stadium), season year, copyright
- Standings: `/standings?leagueId=103,104&season={year}&standingsTypes=regularSeason` — W/L,
  streak, last-10, division rank
- Roster + stats: `/teams/{id}/roster?rosterType=active&season={year}&hydrate=person(stats(type=season,group=[hitting,pitching]))`
- Coaches: `/teams/{id}/coaches?season={year}` — manager (`job === "Manager"`)
- Photos: `img.mlbstatic.com` headshot URL keyed by API player id (generic-headshot fallback)
- Logos: `www.mlbstatic.com/team-logos/{id}.svg`

## Layout
- Header: wordmark + "{year} Season" badge (year from API, fallback to current date)
- Right-hand sidebar nav: 30 teams grouped AL/NL, divisions ordered East, Central, West
- Main content: team overview panel (logo, manager, mascot*, stadium, record, streak,
  last 10, division rank) → 12-card grid (3 per row) → remaining-roster text list
- Footer: API copyright verbatim + self-attribution (Kimi K3 / Moonshot AI, date)
- *Mascot from a built-in map by team id; row omitted for teams without one (NYY, LAD)

## Featured-player selection
- 9 position players: most plate appearances at C, 1B, 2B, 3B, SS, DH + 3 outfielders
  (`primaryPosition.type === "Outfielder"`) by PA; fallback to best unused hitter if a slot is empty
- 3 pitchers: 2 starters with most innings pitched + 1 reliever with most relief appearances
  (ERA tiebreak); criteria stated on the page
- Traded players: use the aggregate season split (the one with no team id)

## Card stats (4 per card, consistent)
- Score each candidate stat vs. the featured peer group (ratio to group best; inverted for
  ERA/WHIP), keep the player's 4 strongest, render in a fixed canonical order
- Hitters: AVG, OPS, HR, RBI, R, H, 2B, SB, BB — so a base stealer surfaces SB, a run
  producer surfaces RBI, etc.
- Pitchers: W, ERA, WHIP, SO, IP, SV, HLD, G

## Style
Modern baseball: deep navy + ballpark red + cream card stock, red "stitch" dashed borders,
jersey-number watermark on cards, condensed display type via system font stacks.

## Error/loading
Skeleton/status messages while fetching; try/catch with a visible error banner + retry.
