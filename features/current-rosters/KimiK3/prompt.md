# Feature: Current Rosters

Build a single-page web app that displays current MLB team rosters, styled after baseball cards.

## Process

### Work log (required)

Maintain a `log.md` file as you work. Treat it as a working narrative: use it to record your train of thought — what you are attempting, what you learn, decisions you make, and problems you hit along the way. At minimum it must include:

- **Start time** — when work begins
- **Milestones** — a timestamped entry as each chunk of work is completed, with a brief note of what was done and what comes next
- **Completion time** — when work is finished

Timestamp every entry.

### Plan (optional)

Before writing any code, you may sketch your approach in a `plan.md` file — intended architecture, endpoints you mean to test, layout ideas. The plan is optional; the log is not.

## Requirements

### Style

- The page style, navigation, and controls should have a **modern baseball vibe** — clean, contemporary, and unmistakably baseball.

### Navigation

- Display a navigation panel on the **right-hand side** of the page listing all 30 MLB teams.
- Organize the teams by **League** (American League, National League) and within each league by **Division** (East, Central, West).
- Clicking a team loads that team's active roster in the main content area.

### Team overview

- Above the player cards, display a team overview panel featuring:
  - The **team logo**
  - The **manager**
  - The **mascot**, where the team has one — the API does not provide mascots, so supply this from your own knowledge and omit it gracefully for teams without one
  - The **stadium**
  - **Team stats**: win/loss record, current streak, record over the last 10 games, and position in the division

### Roster display

- Present the featured players as a grid of **baseball-card-style player cards, three per row**.
- Limit the cards to **twelve players**:
  - **Nine position players** — the player with the most plate appearances at each position: catcher, the four infield positions, the outfield (left unspecified rather than broken out as LF/CF/RF), and the designated hitter.
  - **Three pitchers** — the most notable pitchers on the roster, which must include **at least two starters and at least one relief pitcher**. Determine notability from current-season stats and state the criteria on the page.
- Each card should include the player's photo, name, jersey number, position, and current-season stats.
- **Show each player's most notable stats.** Choose stats that reflect what that player is known for this season — for example, feature stolen bases for a prolific base stealer, or RBIs for a big run producer. The **number of stats per card must be consistent** across all cards; pick a count that looks good and makes sense for the layout.
- **Below the cards**, list the remaining roster players as a formatted text list (name, position, and any details you find worthwhile).

### Season context

- The page must state clearly that the data reflects the **current MLB season**, displaying the season year (e.g., "2026 Season"). Derive the year from the API or the current date rather than hardcoding it.

### Data source

Use the public MLB Stats API, rooted at `https://statsapi.mlb.com/api/v1`. It is free, requires no key, and sends permissive CORS headers, so it can be fetched live from the browser.

Season stats and photos for each player must both be retrieved through the API — do not use hardcoded stats, placeholder images, or third-party sources.

The API is undocumented here on purpose. **Discover and test its endpoints before relying on them**: explore the API, determine which endpoints and parameters provide teams, rosters, season stats, and player photos, and verify the actual response shapes in the browser before building against them. Do not hardcode assumptions about fields or structures you have not confirmed.

API responses embed a copyright notice; display it verbatim in the page footer as attribution. Handle loading and error states gracefully.

Also in the footer, post a brief blurb of self-attribution: identify yourself (model name and provider), note that you generated the page, and include the date.

## Technical constraints

- Self-contained static page: HTML, CSS, and JavaScript only. No build step, no backend, no dependencies that require installation.
- The page must work when opened directly in a browser from the filesystem.
- Fetch data live from the API at view time. Do not bundle, mirror, or hardcode roster or stats data.
