# Implementation Plan

## Data Architecture
1. **Initial Load**:
   - Fetch all MLB teams: `https://statsapi.mlb.com/api/v1/teams?sportId=1`
   - Fetch standings: `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104` (Contains win/loss, streak, L10)
2. **Team Selection**:
   - Fetch Team Manager: `https://statsapi.mlb.com/api/v1/teams/{teamId}/coaches` (Filter by `job === "Manager"`)
   - Fetch Roster with Stats: `https://statsapi.mlb.com/api/v1/teams/{teamId}/roster?hydrate=person(stats(type=season))`
3. **Player Photos**:
   - Use standard MLB image CDN: `https://securea.mlb.com/mlb/images/players/head_shot/{playerId}.jpg`

## UI Layout
- **Single Page Application**: Built with vanilla HTML/CSS/JS.
- **Header**: Simple title ("Current MLB Rosters").
- **Main Container**: Flexbox or Grid layout.
  - **Left Area (Content)**:
    - **Team Overview**: Flex container with Logo, Name, Manager, Mascot (hardcoded map), Stadium, and Stats (W-L, Streak, L10, Division Rank).
    - **Roster Grid**: CSS Grid (`grid-template-columns: repeat(3, 1fr)`). Shows max 12 cards.
    - **Remaining Roster**: Simple unstyled or list styled text at the bottom.
  - **Right Area (Navigation)**:
    - Sticky sidebar.
    - Grouped by League -> Division.

## Player Selection Logic
- **Position Players (9)**: C, 1B, 2B, 3B, SS, OF, DH. Find the player with the most `plateAppearances` at each position. For OF, take the top 3 if we grouped them, but the prompt says "the outfield (left unspecified rather than broken out as LF/CF/RF)". This means we need *three* outfielders, wait, "nine position players - the player with the most plate appearances at each position: catcher, the four infield positions, the outfield (left unspecified rather than broken out as LF/CF/RF), and the designated hitter." 
Wait, C (1) + 1B (1) + 2B (1) + 3B (1) + SS (1) + DH (1) = 6. 
If we need 9 position players, then "the outfield" must provide 3 players. We will group LF, CF, RF into "OF" and pick the top 3 by plate appearances.
- **Pitchers (3)**: 
  - Separate by `gamesStarted > 0` (Starters) vs `gamesStarted == 0` (Relievers). Or check their primary position.
  - Need >= 2 Starters, >= 1 Reliever.
  - Sort Starters by `inningsPitched` or `strikeOuts`. Sort Relievers by `saves` or `gamesPlayed`.

## Stats Selection
- **Consistent Count**: 4 stats per card.
- **Hitters**: Will look at HR and SB. If SB > 15, show SB. Otherwise, standard: AVG, HR, RBI, OPS.
- **Pitchers**: 
  - Starters: W-L, ERA, SO, WHIP
  - Relievers: ERA, SO, SV, WHIP

## Aesthetics
- Use CSS variables for a modern feel.
- Card styling: shadows, rounded corners, neat typography. Baseball card vibe (maybe a slight border or colored header).
- Add copyright and self-attribution footer.
