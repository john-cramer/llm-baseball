"use strict";

const API_ROOT = "https://statsapi.mlb.com/api/v1";
const PHOTO_ROOT = "https://img.mlbstatic.com/mlb-photos/image/upload/w_640,q_auto:best,f_auto/v1/people";
const LOGO_ROOT = "https://www.mlbstatic.com/team-logos";

const LEAGUES = [
  { id: 103, abbreviation: "AL", name: "American League" },
  { id: 104, abbreviation: "NL", name: "National League" }
];

const DIVISION_ORDER = { East: 0, Central: 1, West: 2 };

const TEAM_COLORS = {
  108: ["#003263", "#ba0021"], 109: ["#a71930", "#e3d4ad"],
  110: ["#171717", "#df4601"], 111: ["#0c2340", "#bd3039"],
  112: ["#0e3386", "#cc3433"], 113: ["#c6011f", "#111111"],
  114: ["#00385d", "#e50022"], 115: ["#333366", "#c4ced4"],
  116: ["#0c2340", "#fa4616"], 117: ["#002d62", "#eb6e1f"],
  118: ["#004687", "#bd9b60"], 119: ["#005a9c", "#ef3e42"],
  120: ["#14225a", "#ab0003"], 121: ["#002d72", "#ff5910"],
  133: ["#003831", "#efb21e"], 134: ["#27251f", "#fdb827"],
  135: ["#2f241d", "#ffc425"], 136: ["#0c2c56", "#00a5b5"],
  137: ["#27251f", "#fd5a1e"], 138: ["#0c2340", "#c41e3a"],
  139: ["#092c5c", "#8fbce6"], 140: ["#003278", "#c0111f"],
  141: ["#134a8e", "#1d2d5c"], 142: ["#002b5c", "#d31145"],
  143: ["#002d72", "#e81828"], 144: ["#13274f", "#ce1141"],
  145: ["#27251f", "#c4ced4"], 146: ["#005778", "#ef3340"],
  147: ["#0c2340", "#c4ced4"], 158: ["#12284b", "#ffc52f"]
};

// MLB does not publish mascot data through Stats API.
const MASCOTS = {
  109: "D. Baxter the Bobcat",
  110: "The Oriole Bird",
  111: "Wally the Green Monster",
  112: "Clark the Cub",
  113: "Mr. Redlegs",
  114: "Slider",
  115: "Dinger",
  116: "Paws",
  117: "Orbit",
  118: "Sluggerrr",
  120: "Screech",
  121: "Mr. Met",
  133: "Stomper",
  134: "Pirate Parrot",
  135: "Swinging Friar",
  136: "Mariner Moose",
  137: "Lou Seal",
  138: "Fredbird",
  139: "Raymond",
  140: "Rangers Captain",
  141: "Ace",
  142: "T.C. Bear",
  143: "Phillie Phanatic",
  144: "Blooper",
  145: "Southpaw",
  146: "Billy the Marlin",
  158: "Bernie Brewer"
};

const state = {
  season: String(new Date().getFullYear()),
  teams: [],
  standings: new Map(),
  selectedTeamId: null,
  copyright: "",
  cache: new Map(),
  bootRequestNumber: 0,
  bootController: null,
  requestNumber: 0,
  controller: null
};

const elements = {
  announcer: document.querySelector("#announcer"),
  copyright: document.querySelector("#copyright"),
  featuredTitle: document.querySelector("#featuredTitle"),
  menuButton: document.querySelector("#menuButton"),
  notice: document.querySelector("#notice"),
  panelBackdrop: document.querySelector("#panelBackdrop"),
  panelClose: document.querySelector("#panelClose"),
  playerGrid: document.querySelector("#playerGrid"),
  refreshButton: document.querySelector("#refreshButton"),
  remainingRoster: document.querySelector("#remainingRoster"),
  rosterCount: document.querySelector("#rosterCount"),
  selectionNote: document.querySelector("#selectionNote"),
  teamPanel: document.querySelector("#teamPanel"),
  teamNavigation: document.querySelector("#teamNavigation"),
  teamOverview: document.querySelector("#teamOverview")
};

const mobilePanelQuery = window.matchMedia("(max-width: 1080px)");

bindEvents();
syncTeamPanelAccessibility();
initialize();

function bindEvents() {
  elements.menuButton.addEventListener("click", openTeamPanel);
  elements.panelClose.addEventListener("click", closeTeamPanel);
  elements.panelBackdrop.addEventListener("click", closeTeamPanel);

  elements.teamNavigation.addEventListener("click", (event) => {
    const retryButton = event.target.closest("[data-retry-boot]");
    if (retryButton) {
      initialize();
      return;
    }

    const teamButton = event.target.closest("[data-team-id]");
    if (!teamButton) return;
    selectTeam(Number(teamButton.dataset.teamId));
    closeTeamPanel();
  });

  elements.teamOverview.addEventListener("click", (event) => {
    if (event.target.closest("[data-retry-boot]")) initialize();
  });

  elements.playerGrid.addEventListener("click", (event) => {
    if (event.target.closest("[data-retry-team]") && state.selectedTeamId) {
      state.cache.delete(state.selectedTeamId);
      loadTeam(state.selectedTeamId, true);
    }
  });

  elements.refreshButton.addEventListener("click", () => {
    if (!state.selectedTeamId) return;
    state.cache.delete(state.selectedTeamId);
    loadTeam(state.selectedTeamId, true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("panel-open")) {
      closeTeamPanel();
    }
  });

  mobilePanelQuery.addEventListener("change", syncTeamPanelAccessibility);
}

async function initialize() {
  if (state.bootController) state.bootController.abort();
  if (state.controller) state.controller.abort();
  const bootRequestNumber = ++state.bootRequestNumber;
  state.requestNumber++;
  state.bootController = new AbortController();
  state.controller = null;
  const requestedSeason = String(new Date().getFullYear());
  state.season = requestedSeason;
  state.cache.clear();
  hideNotice();
  setSeasonLabels();
  renderInitialLoading();

  const teamsQuery = queryString({
    sportId: 1,
    season: requestedSeason,
    hydrate: "venue,league,division"
  });
  const standingsQuery = queryString({
    leagueId: "103,104",
    season: requestedSeason,
    standingsTypes: "regularSeason",
    hydrate: "team,division"
  });

  const [seasonResult, teamsResult, standingsResult] = await Promise.allSettled([
    fetchApi(`/seasons/${requestedSeason}?sportId=1`, { signal: state.bootController.signal }),
    fetchApi(`/teams?${teamsQuery}`, { signal: state.bootController.signal }),
    fetchApi(`/standings?${standingsQuery}`, { signal: state.bootController.signal })
  ]);

  if (bootRequestNumber !== state.bootRequestNumber) return;
  state.bootController = null;

  if (teamsResult.status === "rejected") {
    renderBootError();
    return;
  }

  if (seasonResult.status === "fulfilled") {
    state.season = seasonResult.value.seasons?.[0]?.seasonId || requestedSeason;
    setSeasonLabels();
  }

  state.teams = (teamsResult.value.teams || []).filter((team) => team.active && team.sport?.id === 1);
  if (!state.teams.length) {
    renderBootError("MLB returned no active teams for this season.");
    return;
  }

  state.standings = standingsResult.status === "fulfilled"
    ? buildStandingsMap(standingsResult.value.records || [])
    : new Map();

  if (standingsResult.status === "rejected") {
    showNotice("Team rosters are available, but standings could not be loaded. Record fields will remain unavailable.");
  }

  renderNavigation();
  const requestedTeamId = Number(new URL(window.location.href).searchParams.get("team"));
  const initialTeam = state.teams.find((team) => team.id === requestedTeamId) || sortedTeams(state.teams)[0];
  selectTeam(initialTeam.id, false);
}

async function fetchApi(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`MLB Stats API returned ${response.status}.`);
  }

  const data = await response.json();
  captureCopyright(data.copyright);
  return data;
}

function captureCopyright(value) {
  if (!value) return;
  state.copyright = value;
  elements.copyright.textContent = value;
}

function selectTeam(teamId, updateAddress = true) {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  if (!team) return;

  state.selectedTeamId = team.id;
  applyTeamTheme(team.id);
  updateNavigationSelection();

  if (updateAddress) {
    try {
      const address = new URL(window.location.href);
      address.searchParams.set("team", String(team.id));
      window.history.replaceState({}, "", address);
    } catch (_) {
      // A team selection still works if a browser restricts file URL history changes.
    }
  }

  loadTeam(team.id);
}

async function loadTeam(teamId, force = false) {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  if (!team) return;

  if (state.controller) state.controller.abort();
  state.controller = null;
  const requestNumber = ++state.requestNumber;

  if (!force && state.cache.has(teamId)) {
    renderTeam(team, state.cache.get(teamId));
    return;
  }

  state.controller = new AbortController();
  renderTeamLoading(team);

  const hydrate = `person(stats(group=[hitting,pitching,fielding],type=[season],season=${state.season}))`;
  const rosterQuery = queryString({ rosterType: "active", season: state.season, hydrate });

  const standingsQuery = queryString({
    leagueId: "103,104",
    season: state.season,
    standingsTypes: "regularSeason",
    hydrate: "team,division"
  });
  const standingsRequest = force
    ? fetchApi(`/standings?${standingsQuery}`, { signal: state.controller.signal })
    : Promise.resolve(null);

  const [rosterResult, coachesResult, standingsResult] = await Promise.allSettled([
    fetchApi(`/teams/${teamId}/roster?${rosterQuery}`, { signal: state.controller.signal }),
    fetchApi(`/teams/${teamId}/coaches?season=${encodeURIComponent(state.season)}`, { signal: state.controller.signal }),
    standingsRequest
  ]);

  if (requestNumber !== state.requestNumber) return;
  if (rosterResult.status === "rejected") {
    if (rosterResult.reason?.name !== "AbortError") renderTeamError(team);
    finishLoading(requestNumber);
    return;
  }

  const manager = coachesResult.status === "fulfilled"
    ? findManager(coachesResult.value.roster || [])
    : null;
  const payload = {
    manager,
    managerUnavailable: coachesResult.status === "rejected",
    roster: rosterResult.value.roster || []
  };

  if (standingsResult.status === "fulfilled" && standingsResult.value) {
    state.standings = buildStandingsMap(standingsResult.value.records || []);
    hideNotice();
  } else if (force && standingsResult.status === "rejected" && standingsResult.reason?.name !== "AbortError") {
    showNotice("The roster refreshed, but current standings could not be retrieved.");
  }

  state.cache.set(teamId, payload);
  renderTeam(team, payload);
  finishLoading(requestNumber);
}

function finishLoading(requestNumber) {
  if (requestNumber !== state.requestNumber) return;
  elements.refreshButton.disabled = false;
  elements.refreshButton.classList.remove("is-spinning");
}

function renderInitialLoading() {
  elements.teamNavigation.setAttribute("aria-busy", "true");
  elements.refreshButton.disabled = true;
  elements.selectionNote.textContent = `Building the ${state.season} card set from live season statistics...`;
}

function renderTeamLoading(team) {
  elements.announcer.textContent = `Loading the ${team.name} active roster.`;
  elements.featuredTitle.textContent = `${team.teamName || team.clubName || "Team"} featured twelve`;
  elements.refreshButton.disabled = true;
  elements.refreshButton.classList.add("is-spinning");
  elements.teamOverview.setAttribute("aria-busy", "true");
  elements.playerGrid.setAttribute("aria-busy", "true");
  elements.remainingRoster.setAttribute("aria-busy", "true");
  elements.teamOverview.classList.add("is-loading");
  elements.playerGrid.classList.add("is-loading");
  elements.remainingRoster.classList.add("is-loading");

  elements.teamOverview.innerHTML = `
    <div class="overview-skeleton">
      <span class="skeleton skeleton-logo"></span>
      <div class="skeleton-copy">
        <span class="skeleton skeleton-short"></span>
        <span class="skeleton skeleton-title"></span>
        <span class="skeleton skeleton-line"></span>
      </div>
      <div class="skeleton-stats">
        <span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span>
      </div>
    </div>`;
  elements.playerGrid.innerHTML = Array.from({ length: 6 }, () => '<article class="card-skeleton"></article>').join("");
  elements.remainingRoster.innerHTML = Array.from({ length: 3 }, () => '<span class="skeleton skeleton-row"></span>').join("");
  elements.rosterCount.textContent = "-- players";
  elements.selectionNote.textContent = `Reading ${state.season} plate appearances, fielding roles, and pitching results...`;
}

function renderTeam(team, payload) {
  const players = payload.roster.map((entry) => normalizePlayer(entry, team.id));
  const selection = selectFeaturedPlayers(players);
  const standing = state.standings.get(team.id);

  renderOverview(team, standing, payload.manager, payload.managerUnavailable);
  renderPlayerCards(team, selection.featured, players);
  renderRemainingRoster(selection.remaining);

  elements.featuredTitle.textContent = `${team.teamName || team.clubName || "Team"} featured twelve`;
  elements.selectionNote.textContent = `${state.season} criteria: highest PA at C, 1B, 2B, 3B, SS and DH, plus the top three OF. Multi-position players are assigned where they have made the most starts. Starters rank by starts, innings and strikeouts; relievers by saves plus holds, then ERA.`;
  elements.announcer.textContent = `Loaded ${payload.roster.length} active ${team.name} players and ${selection.featured.length} featured cards.`;
  elements.rosterCount.textContent = `${selection.remaining.length} ${selection.remaining.length === 1 ? "player" : "players"}`;
  document.title = `${team.name} ${state.season} Roster | Roster Room`;

  elements.teamOverview.classList.remove("is-loading");
  elements.playerGrid.classList.remove("is-loading");
  elements.remainingRoster.classList.remove("is-loading");
  elements.teamOverview.setAttribute("aria-busy", "false");
  elements.playerGrid.setAttribute("aria-busy", "false");
  elements.remainingRoster.setAttribute("aria-busy", "false");
  elements.refreshButton.disabled = false;
  elements.refreshButton.classList.remove("is-spinning");
}

function renderOverview(team, standing, manager, managerUnavailable = false) {
  const divisionName = shortDivisionName(team.division?.name);
  const managerName = manager?.person?.fullName || (managerUnavailable ? "Unavailable" : "Not listed");
  const details = [
    { label: "Manager", value: managerName },
    MASCOTS[team.id] ? { label: "Mascot", value: MASCOTS[team.id] } : null,
    { label: "Ballpark", value: team.venue?.name || "Not listed" }
  ].filter(Boolean);

  const lastTen = standing?.records?.splitRecords?.find((record) => record.type === "lastTen");
  const divisionSize = standing ? countDivisionTeams(team.division?.id) : 0;
  const recordItems = [
    { label: "Record", value: standing ? `${standing.wins}-${standing.losses}` : "--" },
    { label: "Current streak", value: standing?.streak?.streakCode || "--" },
    { label: "Last 10", value: lastTen ? `${lastTen.wins}-${lastTen.losses}` : "--" },
    {
      label: "Division",
      value: standing?.divisionRank
        ? `${ordinal(Number(standing.divisionRank))}${divisionSize ? ` of ${divisionSize}` : ""}`
        : "--"
    }
  ];

  elements.teamOverview.innerHTML = `
    <div class="overview-main">
      <div class="team-identity">
        <div class="team-logo-wrap" data-team-logo-wrap data-abbreviation="${escapeHtml(team.abbreviation || "MLB")}">
          <img src="${teamLogoUrl(team.id)}" alt="${escapeHtml(team.name)} logo" data-team-logo>
        </div>
        <div>
          <p class="team-eyebrow">Active roster / ${escapeHtml(state.season)} season</p>
          <h2>${escapeHtml(team.name)}</h2>
          <p class="team-context">${escapeHtml(team.league?.abbreviation || team.league?.name || "MLB")} / ${escapeHtml(divisionName)}</p>
        </div>
      </div>
      <div class="club-details">
        ${details.map((detail) => `
          <div class="club-detail">
            <span>${escapeHtml(detail.label)}</span>
            <strong>${escapeHtml(detail.value)}</strong>
          </div>`).join("")}
      </div>
    </div>
    <div class="record-strip">
      ${recordItems.map((item) => `
        <div class="record-item">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>`).join("")}
    </div>`;

  const teamLogo = elements.teamOverview.querySelector("[data-team-logo]");
  const logoWrap = elements.teamOverview.querySelector("[data-team-logo-wrap]");
  teamLogo?.addEventListener("error", () => logoWrap?.classList.add("is-missing"), { once: true });
}

function renderPlayerCards(team, featured, allPlayers) {
  if (!featured.length) {
    elements.playerGrid.innerHTML = `
      <div class="empty-state">
        <h3>No qualified cards yet</h3>
        <p>MLB returned an active roster, but no current-season player statistics were available.</p>
      </div>`;
    return;
  }

  const hitters = allPlayers.filter((player) => !player.isPitcher && player.hitting);
  const pitchers = allPlayers.filter((player) => player.isPitcher && player.pitching);
  elements.playerGrid.innerHTML = featured.map((player, index) => {
    const pitchingCard = player.cardPosition === "SP" || player.cardPosition === "RP";
    const stats = pitchingCard
      ? choosePitchingStats(player, pitchers)
      : chooseHittingStats(player, hitters);
    const side = pitchingCard
      ? `Throws ${player.pitchHand || "--"}`
      : `Bats ${player.batSide || "--"} / Throws ${player.pitchHand || "--"}`;
    const type = pitchingCard ? "Pitching" : "Batting";
    const initials = player.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);

    return `
      <article class="player-card">
        <div class="player-photo" data-photo-wrap>
          <img src="${playerPhotoUrl(player.id)}" alt="${escapeHtml(player.fullName)} headshot" ${index < 3 ? 'fetchpriority="high"' : 'loading="lazy"'} data-player-photo>
          <span class="photo-fallback" aria-hidden="true">${escapeHtml(initials)}</span>
          <span class="position-badge">${escapeHtml(player.cardPosition)}</span>
          <span class="jersey-badge">#${escapeHtml(player.jerseyNumber || "--")}</span>
        </div>
        <div class="card-body">
          <p class="card-kicker">${escapeHtml(state.season)} ${type} / Active</p>
          <h3>${escapeHtml(player.fullName)}</h3>
          <div class="card-stats" aria-label="${escapeHtml(player.fullName)} notable season statistics">
            ${stats.map((stat) => `
              <div class="card-stat">
                <strong>${escapeHtml(stat.value)}</strong>
                <span>${escapeHtml(stat.label)}</span>
              </div>`).join("")}
          </div>
          <p class="card-meta"><span>${escapeHtml(side)}</span><span>${escapeHtml(team.abbreviation || "MLB")}</span></p>
        </div>
      </article>`;
  }).join("");

  elements.playerGrid.querySelectorAll("[data-player-photo]").forEach((image) => {
    const markMissing = () => image.closest("[data-photo-wrap]")?.classList.add("is-missing");
    image.addEventListener("error", markMissing, { once: true });
    if (image.complete && image.naturalWidth === 0) markMissing();
  });
}

function renderRemainingRoster(players) {
  if (!players.length) {
    elements.remainingRoster.innerHTML = `
      <div class="empty-state"><h3>Everyone made the set</h3><p>No additional active-roster players were returned.</p></div>`;
    return;
  }

  const ordered = [...players].sort((left, right) => {
    const order = { C: 1, "1B": 2, "2B": 3, "3B": 4, SS: 5, LF: 6, CF: 6, RF: 6, OF: 6, DH: 7, TWP: 8, P: 9, SP: 9, RP: 9 };
    const positionDifference = (order[left.positionAbbreviation] || 8) - (order[right.positionAbbreviation] || 8);
    return positionDifference || left.fullName.localeCompare(right.fullName);
  });

  elements.remainingRoster.innerHTML = `
    <ul class="roster-list">
      ${ordered.map((player) => `
        <li>
          <span class="remaining-number">#${escapeHtml(player.jerseyNumber || "--")}</span>
          <span class="remaining-name">
            <strong>${escapeHtml(player.fullName)}</strong>
            <span>${escapeHtml(remainingStatLine(player))}</span>
          </span>
          <span class="remaining-position">${escapeHtml(player.positionAbbreviation || "--")}</span>
        </li>`).join("")}
    </ul>`;
}

function normalizePlayer(entry, teamId) {
  const person = entry.person || {};
  const hittingGroup = findStatGroup(person.stats, "hitting");
  const pitchingGroup = findStatGroup(person.stats, "pitching");
  const fieldingGroup = findStatGroup(person.stats, "fielding");
  const hitting = preferredSplit(hittingGroup?.splits, teamId)?.stat || null;
  const pitching = preferredSplit(pitchingGroup?.splits, teamId)?.stat || null;
  const fieldingSplits = (fieldingGroup?.splits || []).filter((split) => !split.team?.id || split.team.id === teamId);
  const position = entry.position || person.primaryPosition || {};
  const hasHittingRole = numberValue(hitting?.plateAppearances) > 0;
  const isTwoWay = position.type === "Two-Way Player";
  const isPitcher = position.type === "Pitcher" || (isTwoWay && !hasHittingRole);
  const fieldingRoles = fieldingSplits
    .map((split) => ({
      category: positionCategory(split.position || split.stat?.position),
      games: numberValue(split.stat?.gamesStarted || split.stat?.gamesPlayed),
      innings: parseInnings(split.stat?.innings)
    }))
    .filter((role) => role.category)
    .sort((left, right) => right.games - left.games || right.innings - left.innings);
  const primaryCategory = fieldingRoles[0]?.category || positionCategory(position);
  const eligibleCategories = new Set(fieldingRoles.map((role) => role.category));
  const rosterCategory = positionCategory(position);
  if (rosterCategory) eligibleCategories.add(rosterCategory);

  return {
    id: person.id,
    fullName: person.fullName || "Name unavailable",
    jerseyNumber: entry.jerseyNumber || person.primaryNumber || "",
    positionAbbreviation: position.abbreviation || "--",
    positionName: position.name || "Position unavailable",
    batSide: person.batSide?.code || person.batSide?.description?.slice(0, 1) || "",
    pitchHand: person.pitchHand?.code || person.pitchHand?.description?.slice(0, 1) || "",
    hitting,
    pitching,
    primaryCategory,
    eligibleCategories,
    isPitcher,
    cardPosition: ""
  };
}

function selectFeaturedPlayers(players) {
  const hitters = players
    .filter((player) => !player.isPitcher)
    .sort((left, right) => plateAppearances(right) - plateAppearances(left));
  const pitchers = players.filter((player) => player.isPitcher && player.pitching);
  const lineupSlots = ["C", "1B", "2B", "3B", "SS", "OF", "OF", "OF", "DH"];
  const assignments = lineupSlots.map((slot) => ({ slot, player: null }));
  const used = new Set();

  assignments.forEach((assignment) => {
    const candidate = hitters.find((player) => !used.has(player.id) && player.primaryCategory === assignment.slot);
    if (!candidate) return;
    assignment.player = candidate;
    used.add(candidate.id);
  });

  assignments.filter((assignment) => !assignment.player).forEach((assignment) => {
    const candidate = hitters.find((player) => !used.has(player.id) && player.eligibleCategories.has(assignment.slot));
    if (!candidate) return;
    assignment.player = candidate;
    used.add(candidate.id);
  });

  assignments.filter((assignment) => !assignment.player).forEach((assignment) => {
    const candidate = hitters.find((player) => !used.has(player.id));
    if (!candidate) return;
    assignment.player = candidate;
    used.add(candidate.id);
  });

  const lineup = assignments
    .filter((assignment) => assignment.player)
    .map((assignment) => ({ ...assignment.player, cardPosition: assignment.slot }));

  const starterPool = pitchers
    .filter((player) => numberValue(player.pitching?.gamesStarted) > 0)
    .sort(compareStarters);
  const chosenPitcherIds = new Set();
  const starterSelections = starterPool.slice(0, 2);
  starterSelections.forEach((player) => chosenPitcherIds.add(player.id));

  if (starterSelections.length < 2) {
    const fallbackStarters = [...pitchers]
      .filter((player) => !chosenPitcherIds.has(player.id))
      .sort(compareStarters)
      .slice(0, 2 - starterSelections.length);
    fallbackStarters.forEach((player) => {
      starterSelections.push(player);
      chosenPitcherIds.add(player.id);
    });
  }

  const reliefPool = pitchers
    .filter((player) => !chosenPitcherIds.has(player.id) && numberValue(player.pitching?.gamesPitched) > numberValue(player.pitching?.gamesStarted))
    .sort(compareRelievers);
  const reliever = reliefPool[0] || pitchers.filter((player) => !chosenPitcherIds.has(player.id)).sort(compareRelievers)[0];
  if (reliever) chosenPitcherIds.add(reliever.id);

  const featuredPitchers = [
    ...starterSelections.map((player) => ({ ...player, cardPosition: "SP" })),
    ...(reliever ? [{ ...reliever, cardPosition: "RP" }] : [])
  ];
  const featured = [...lineup, ...featuredPitchers].slice(0, 12);
  const featuredIds = new Set(featured.map((player) => player.id));

  return {
    featured,
    remaining: players.filter((player) => !featuredIds.has(player.id))
  };
}

function chooseHittingStats(player, peers) {
  const stat = player.hitting;
  if (!stat) return fallbackStats([["PA", "--"], ["AVG", "--"], ["OPS", "--"]]);

  const definitions = [
    { key: "ops", label: "OPS", weight: 1.15, rate: true },
    { key: "avg", label: "AVG", weight: 1.02, rate: true },
    { key: "homeRuns", label: "HR", weight: 1.18 },
    { key: "rbi", label: "RBI", weight: 1.08 },
    { key: "stolenBases", label: "SB", weight: 1.3 },
    { key: "doubles", label: "2B", weight: 1.0 },
    { key: "hits", label: "H", weight: .92 },
    { key: "plateAppearances", label: "PA", weight: .72 }
  ];

  const candidates = definitions.map((definition) => {
    const value = numberValue(stat[definition.key]);
    const peerValues = peers.map((peer) => numberValue(peer.hitting?.[definition.key]));
    const valid = definition.rate
      ? numberValue(stat.plateAppearances) > 0 && Number.isFinite(value)
      : value > 0;
    return {
      label: definition.label,
      value: displayStat(stat[definition.key]),
      score: valid ? metricScore(value, peerValues) * definition.weight : -1
    };
  }).filter((candidate) => candidate.score >= 0);

  const selected = candidates.sort((left, right) => right.score - left.score).slice(0, 3);
  return fillStats(selected, [
    { label: "PA", value: displayStat(stat.plateAppearances) },
    { label: "AVG", value: displayStat(stat.avg) },
    { label: "OPS", value: displayStat(stat.ops) }
  ]);
}

function choosePitchingStats(player, peers) {
  const stat = player.pitching;
  if (!stat) return fallbackStats([["IP", "--"], ["ERA", "--"], ["K", "--"]]);
  const reliefCard = player.cardPosition === "RP";
  const definitions = [
    { key: "era", label: "ERA", weight: 1.18, lower: true, requiresInnings: true },
    { key: "whip", label: "WHIP", weight: 1.08, lower: true, requiresInnings: true },
    { key: "strikeOuts", label: "K", weight: reliefCard ? .95 : 1.2 },
    { key: "inningsPitched", label: "IP", weight: reliefCard ? .78 : 1.08, innings: true },
    { key: "wins", label: "W", weight: .88 },
    { key: "saves", label: "SV", weight: reliefCard ? 1.55 : .2 },
    { key: "holds", label: "HLD", weight: reliefCard ? 1.38 : .2 },
    { key: "strikeoutsPer9Inn", label: "K/9", weight: reliefCard ? 1.0 : .82, rate: true }
  ];

  const candidates = definitions.map((definition) => {
    const value = definition.innings ? parseInnings(stat[definition.key]) : numberValue(stat[definition.key]);
    const peerValues = peers.map((peer) => definition.innings
      ? parseInnings(peer.pitching?.[definition.key])
      : numberValue(peer.pitching?.[definition.key]));
    const hasInnings = parseInnings(stat.inningsPitched) > 0;
    const valid = definition.requiresInnings
      ? hasInnings && Number.isFinite(value)
      : definition.rate
        ? hasInnings && Number.isFinite(value)
        : value > 0;
    return {
      label: definition.label,
      value: displayStat(stat[definition.key]),
      score: valid ? metricScore(value, peerValues, definition.lower) * definition.weight : -1
    };
  }).filter((candidate) => candidate.score >= 0);

  const selected = candidates.sort((left, right) => right.score - left.score).slice(0, 3);
  return fillStats(selected, [
    { label: "IP", value: displayStat(stat.inningsPitched) },
    { label: "ERA", value: displayStat(stat.era) },
    { label: "K", value: displayStat(stat.strikeOuts) }
  ]);
}

function fillStats(selected, fallbacks) {
  const labels = new Set(selected.map((stat) => stat.label));
  for (const fallback of fallbacks) {
    if (selected.length === 3) break;
    if (!labels.has(fallback.label)) {
      selected.push(fallback);
      labels.add(fallback.label);
    }
  }
  return selected.slice(0, 3);
}

function fallbackStats(values) {
  return values.map(([label, value]) => ({ label, value }));
}

function metricScore(value, values, lowerIsBetter = false) {
  const validValues = values.filter((candidate) => Number.isFinite(candidate));
  if (!validValues.length || !Number.isFinite(value)) return 0;
  const favorable = validValues.filter((candidate) => lowerIsBetter ? candidate >= value : candidate <= value).length;
  return favorable / validValues.length;
}

function compareStarters(left, right) {
  return numberValue(right.pitching?.gamesStarted) - numberValue(left.pitching?.gamesStarted)
    || parseInnings(right.pitching?.inningsPitched) - parseInnings(left.pitching?.inningsPitched)
    || numberValue(right.pitching?.strikeOuts) - numberValue(left.pitching?.strikeOuts)
    || numberValue(left.pitching?.era) - numberValue(right.pitching?.era);
}

function compareRelievers(left, right) {
  const leftLeverage = numberValue(left.pitching?.saves) + numberValue(left.pitching?.holds);
  const rightLeverage = numberValue(right.pitching?.saves) + numberValue(right.pitching?.holds);
  return rightLeverage - leftLeverage
    || numberValue(left.pitching?.era, 99) - numberValue(right.pitching?.era, 99)
    || numberValue(right.pitching?.strikeOuts) - numberValue(left.pitching?.strikeOuts);
}

function plateAppearances(player) {
  return numberValue(player.hitting?.plateAppearances);
}

function remainingStatLine(player) {
  if (player.isPitcher && player.pitching) {
    return `${displayStat(player.pitching.era)} ERA / ${displayStat(player.pitching.inningsPitched)} IP`;
  }
  if (player.hitting) {
    return `${displayStat(player.hitting.avg)} AVG / ${displayStat(player.hitting.plateAppearances)} PA`;
  }
  return player.positionName;
}

function renderNavigation() {
  elements.teamNavigation.innerHTML = LEAGUES.map((league) => {
    const leagueTeams = state.teams.filter((team) => team.league?.id === league.id);
    const divisions = [...new Map(leagueTeams.map((team) => [team.division?.id, team.division])).values()]
      .filter(Boolean)
      .sort((left, right) => (DIVISION_ORDER[shortDivisionName(left.name)] ?? 9) - (DIVISION_ORDER[shortDivisionName(right.name)] ?? 9));

    return `
      <section class="league-block" aria-labelledby="league-${league.id}">
        <header class="league-heading">
          <span class="league-monogram" aria-hidden="true">${league.abbreviation}</span>
          <h3 id="league-${league.id}">${league.name}</h3>
        </header>
        ${divisions.map((division) => {
          const divisionTeams = leagueTeams
            .filter((team) => team.division?.id === division.id)
            .sort((left, right) => left.name.localeCompare(right.name));
          return `
            <section class="division-block" aria-labelledby="division-${division.id}">
              <h4 id="division-${division.id}">${escapeHtml(shortDivisionName(division.name))}</h4>
              ${divisionTeams.map((team) => {
                const colors = TEAM_COLORS[team.id] || ["#0c2340", "#c92f32"];
                const clubName = team.teamName || team.clubName || team.name;
                const location = team.locationName && team.locationName !== clubName ? team.locationName : team.abbreviation;
                return `
                  <button class="team-button" type="button" data-team-id="${team.id}" aria-current="false" style="--club-accent: ${colors[1]}">
                    <img src="${teamLogoUrl(team.id)}" alt="" loading="lazy">
                    <span><strong>${escapeHtml(clubName)}</strong><small>${escapeHtml(location || "MLB")}</small></span>
                    <span class="nav-arrow" aria-hidden="true">&rsaquo;</span>
                  </button>`;
              }).join("")}
            </section>`;
        }).join("")}
      </section>`;
  }).join("");
  elements.teamNavigation.setAttribute("aria-busy", "false");
}

function updateNavigationSelection() {
  elements.teamNavigation.querySelectorAll("[data-team-id]").forEach((button) => {
    button.setAttribute("aria-current", Number(button.dataset.teamId) === state.selectedTeamId ? "true" : "false");
  });
}

function renderBootError(message = "Roster Room could not reach MLB Stats API. Check the connection and try again.") {
  elements.teamNavigation.setAttribute("aria-busy", "false");
  elements.teamNavigation.innerHTML = `
    <div class="nav-error"><p>${escapeHtml(message)}</p><button type="button" data-retry-boot>Try again</button></div>`;
  elements.teamOverview.innerHTML = `
    <div class="error-state"><h3>Unable to load the league</h3><p>${escapeHtml(message)}</p><button type="button" data-retry-boot>Try again</button></div>`;
  elements.playerGrid.innerHTML = `
    <div class="error-state"><h3>No roster loaded</h3><p>Select retry in the club directory to request live data again.</p></div>`;
  elements.remainingRoster.innerHTML = "";
  elements.selectionNote.textContent = "Live season statistics are unavailable until MLB responds.";
  elements.rosterCount.textContent = "-- players";
  elements.teamOverview.classList.remove("is-loading");
  elements.playerGrid.classList.remove("is-loading");
  elements.remainingRoster.classList.remove("is-loading");
  elements.teamOverview.setAttribute("aria-busy", "false");
  elements.playerGrid.setAttribute("aria-busy", "false");
  elements.remainingRoster.setAttribute("aria-busy", "false");
  elements.refreshButton.disabled = true;
  elements.refreshButton.classList.remove("is-spinning");
  elements.announcer.textContent = message;
}

function renderTeamError(team) {
  renderOverview(team, state.standings.get(team.id), null, true);
  elements.playerGrid.innerHTML = `
    <div class="error-state">
      <h3>Roster request missed</h3>
      <p>The active ${escapeHtml(team.name)} roster could not be retrieved from MLB. No cached or placeholder players are shown.</p>
      <button type="button" data-retry-team>Try again</button>
    </div>`;
  elements.remainingRoster.innerHTML = `
    <div class="empty-state"><h3>Waiting on the roster</h3><p>Remaining players will appear after a successful request.</p></div>`;
  elements.selectionNote.textContent = "Live season statistics are temporarily unavailable for this club.";
  elements.rosterCount.textContent = "-- players";
  elements.teamOverview.classList.remove("is-loading");
  elements.playerGrid.classList.remove("is-loading");
  elements.remainingRoster.classList.remove("is-loading");
  elements.playerGrid.setAttribute("aria-busy", "false");
  elements.remainingRoster.setAttribute("aria-busy", "false");
  elements.teamOverview.setAttribute("aria-busy", "false");
  elements.announcer.textContent = `The ${team.name} roster could not be loaded.`;
}

function buildStandingsMap(records) {
  const map = new Map();
  records.forEach((divisionRecord) => {
    (divisionRecord.teamRecords || []).forEach((record) => {
      map.set(record.team.id, { ...record, standingsDivisionId: divisionRecord.division?.id });
    });
  });
  return map;
}

function findManager(coaches) {
  return coaches.find((coach) => coach.jobId === "MNGR" || coach.job === "Manager") || null;
}

function findStatGroup(stats = [], groupName) {
  return stats.find((stat) => stat.group?.displayName === groupName);
}

function preferredSplit(splits = [], teamId) {
  return splits.find((split) => split.team?.id === teamId && String(split.season) === state.season)
    || splits.find((split) => split.team?.id === teamId)
    || splits[0];
}

function positionCategory(position = {}) {
  const code = String(position.code || "");
  const abbreviation = position.abbreviation || position.abbrev || "";
  if (code === "2" || abbreviation === "C") return "C";
  if (code === "3" || abbreviation === "1B") return "1B";
  if (code === "4" || abbreviation === "2B") return "2B";
  if (code === "5" || abbreviation === "3B") return "3B";
  if (code === "6" || abbreviation === "SS") return "SS";
  if (["7", "8", "9", "O", "W", "J"].includes(code) || ["LF", "CF", "RF", "OF", "UO", "P-OF"].includes(abbreviation) || position.type === "Outfielder") return "OF";
  if (code === "10" || abbreviation === "DH") return "DH";
  return "";
}

function setSeasonLabels() {
  document.querySelectorAll("[data-season-label]").forEach((label) => {
    label.textContent = `${state.season} Season`;
  });
}

function sortedTeams(teams) {
  return [...teams].sort((left, right) => {
    const leagueDifference = LEAGUES.findIndex((league) => league.id === left.league?.id)
      - LEAGUES.findIndex((league) => league.id === right.league?.id);
    const divisionDifference = (DIVISION_ORDER[shortDivisionName(left.division?.name)] ?? 9)
      - (DIVISION_ORDER[shortDivisionName(right.division?.name)] ?? 9);
    return leagueDifference || divisionDifference || left.name.localeCompare(right.name);
  });
}

function shortDivisionName(name = "Division") {
  return name.split(" ").at(-1) || "Division";
}

function countDivisionTeams(divisionId) {
  if (!divisionId) return 0;
  return state.teams.filter((team) => team.division?.id === divisionId).length;
}

function applyTeamTheme(teamId) {
  const [primary, accent] = TEAM_COLORS[teamId] || ["#0c2340", "#c92f32"];
  document.documentElement.style.setProperty("--team-primary", primary);
  document.documentElement.style.setProperty("--team-accent", accent);
}

function openTeamPanel() {
  elements.teamPanel.inert = false;
  elements.teamPanel.removeAttribute("aria-hidden");
  document.body.classList.add("panel-open");
  elements.menuButton.setAttribute("aria-expanded", "true");
  window.setTimeout(() => {
    if (document.body.classList.contains("panel-open")) elements.panelClose.focus();
  }, 220);
}

function closeTeamPanel(returnFocus = true) {
  const wasOpen = document.body.classList.contains("panel-open");
  document.body.classList.remove("panel-open");
  elements.menuButton.setAttribute("aria-expanded", "false");
  if (wasOpen && returnFocus) elements.menuButton.focus();
  syncTeamPanelAccessibility();
}

function syncTeamPanelAccessibility() {
  if (!mobilePanelQuery.matches) {
    document.body.classList.remove("panel-open");
    elements.menuButton.setAttribute("aria-expanded", "false");
    elements.teamPanel.inert = false;
    elements.teamPanel.removeAttribute("aria-hidden");
    return;
  }

  const isOpen = document.body.classList.contains("panel-open");
  elements.teamPanel.inert = !isOpen;
  if (isOpen) elements.teamPanel.removeAttribute("aria-hidden");
  else elements.teamPanel.setAttribute("aria-hidden", "true");
}

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = false;
}

function hideNotice() {
  elements.notice.hidden = true;
  elements.notice.textContent = "";
}

function queryString(values) {
  return new URLSearchParams(values).toString();
}

function teamLogoUrl(teamId) {
  return `${LOGO_ROOT}/${Number(teamId)}.svg`;
}

function playerPhotoUrl(playerId) {
  return `${PHOTO_ROOT}/${Number(playerId)}/headshot/67/current`;
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInnings(value) {
  if (value === undefined || value === null || value === "") return 0;
  const [innings, outs = "0"] = String(value).split(".");
  return numberValue(innings) + numberValue(outs) / 3;
}

function displayStat(value) {
  return value === undefined || value === null || value === "" ? "--" : String(value);
}

function ordinal(value) {
  if (!Number.isFinite(value)) return "--";
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
