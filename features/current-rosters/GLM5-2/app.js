'use strict';

const API_BASE = 'https://statsapi.mlb.com/api/v1';
const PHOTO_URL = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/{id}/headshot/67/current';
const LOGO_BASE = 'https://www.mlbstatic.com/team-logos';

const MASCOTS = {
    109: 'D. Baxter the Bobcat',
    110: 'The Bird',
    111: 'Wally the Green Monster',
    112: 'Clark the Cub',
    113: 'Mr. Red',
    114: 'Slider',
    115: 'Dinger',
    116: 'Paws',
    117: 'Orbit',
    118: 'Sluggerrr',
    119: null,
    120: 'Screech',
    121: 'Mr. Met',
    133: 'Stomper',
    134: 'Pirate Parrot',
    135: 'The Swinging Friar',
    136: 'Mariner Moose',
    137: 'Lou Seal',
    138: 'Fredbird',
    139: 'Raymond',
    140: 'Rangers Captain',
    141: 'Ace',
    142: 'T.C. Bear',
    143: 'Phillie Phanatic',
    144: 'Blooper',
    145: 'Southpaw',
    146: 'Billy the Marlin',
    147: null,
    158: 'Bernie Brewer',
    108: null,
};

const LEAGUES = [
    { id: 103, name: 'American League', divisions: [
        { id: 201, name: 'East' },
        { id: 202, name: 'Central' },
        { id: 200, name: 'West' },
    ]},
    { id: 104, name: 'National League', divisions: [
        { id: 204, name: 'East' },
        { id: 205, name: 'Central' },
        { id: 203, name: 'West' },
    ]},
];

const POSITION_SLOTS = [
    { key: 'C',  codes: ['2'],                label: 'Catcher',           abbr: 'C'  },
    { key: '1B', codes: ['3'],                label: 'First Base',         abbr: '1B' },
    { key: '2B', codes: ['4'],                label: 'Second Base',        abbr: '2B' },
    { key: '3B', codes: ['5'],                label: 'Third Base',         abbr: '3B' },
    { key: 'SS', codes: ['6'],                label: 'Shortstop',          abbr: 'SS' },
    { key: 'OF', codes: ['7','8','9','O'],    label: 'Outfield',           abbr: 'OF', count: 3 },
    { key: 'DH', codes: ['10'],               label: 'Designated Hitter',  abbr: 'DH' },
];

let season = null;
let teams = [];
let standingsData = null;
let apiCopyright = '';
let currentTeamId = null;

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
}

async function init() {
    $('#gen-date').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    try {
        const data = await fetchJSON(`${API_BASE}/teams?sportId=1`);
        apiCopyright = data.copyright;
        teams = data.teams.filter(t => t.active);
        season = teams[0]?.season || new Date().getFullYear();

        $('#api-copyright').textContent = apiCopyright;
        $('#season-label').textContent = `${season} Season`;

        buildNav();

        if (teams.length > 0) {
            loadTeam(teams[0].id);
        }
    } catch (err) {
        showError('Failed to load teams: ' + err.message +
            '<br><br>If the page was opened from the filesystem, try serving it via a local web server.');
    }
}

function buildNav() {
    let html = '';
    for (const league of LEAGUES) {
        html += `<div class="nav-league"><div class="nav-league-title">${league.name}</div>`;
        for (const division of league.divisions) {
            html += `<div class="nav-division-title">${division.name}</div>`;
            const leagueTeams = teams.filter(t =>
                t.league.id === league.id && t.division.id === division.id
            );
            for (const team of leagueTeams) {
                html += `<div class="nav-team" data-team-id="${team.id}" onclick="loadTeam(${team.id})">` +
                    `<img class="nav-team-logo" src="${LOGO_BASE}/${team.id}.svg" onerror="this.style.display='none'" alt="">` +
                    `<span>${team.name}</span></div>`;
            }
        }
        html += `</div>`;
    }
    $('#nav-content').innerHTML = html;
}

async function fetchStandings() {
    try {
        const data = await fetchJSON(
            `${API_BASE}/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason`
        );
        standingsData = data;
    } catch (err) {
        console.warn('Standings fetch failed:', err);
    }
}

function getStandingsInfo(teamId) {
    if (!standingsData) return null;
    for (const rec of standingsData.records) {
        for (const tr of rec.teamRecords) {
            if (tr.team.id === teamId) {
                const lastTen = tr.records?.splitRecords?.find(s => s.type === 'lastTen');
                return {
                    wins: tr.leagueRecord.wins,
                    losses: tr.leagueRecord.losses,
                    streak: tr.streak?.streakCode || '—',
                    divisionRank: tr.divisionRank || '—',
                    lastTenWins: lastTen?.wins || 0,
                    lastTenLosses: lastTen?.losses || 0,
                };
            }
        }
    }
    return null;
}

async function loadTeam(teamId) {
    if (currentTeamId === teamId) return;
    currentTeamId = teamId;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    $$('.nav-team').forEach(el => el.classList.remove('active'));
    const navEl = document.querySelector(`.nav-team[data-team-id="${teamId}"]`);
    if (navEl) navEl.classList.add('active');

    $('#welcome').style.display = 'none';
    $('#team-view').style.display = 'none';
    $('#error').style.display = 'none';
    $('#loading').style.display = 'block';

    try {
        if (!standingsData) await fetchStandings();

        const [rosterData, coachesData] = await Promise.all([
            fetchJSON(`${API_BASE}/teams/${teamId}/roster?season=${season}&hydrate=person`),
            fetchJSON(`${API_BASE}/teams/${teamId}/coaches?season=${season}`),
        ]);

        const roster = rosterData.roster || [];
        const coaches = coachesData.roster || [];
        const manager = coaches.find(c => c.job === 'Manager');

        const positionPlayers = roster.filter(p => p.position.code !== '1');
        const pitchers = roster.filter(p => p.position.code === '1');

        const [hittingStats, pitchingStats] = await Promise.all([
            fetchAllStats(positionPlayers, 'hitting'),
            fetchAllStats(pitchers, 'pitching'),
        ]);

        const featuredPosition = selectPositionPlayers(positionPlayers, hittingStats);
        const featuredPitchers = selectPitchers(pitchers, pitchingStats);
        const featured = [...featuredPosition, ...featuredPitchers];

        const standingsInfo = getStandingsInfo(teamId);

        $('#loading').style.display = 'none';
        $('#team-view').style.display = 'block';

        renderTeamOverview(team, manager, standingsInfo);
        renderPitcherCriteria();
        renderPlayerCards(featured, hittingStats, pitchingStats);
        renderRemainingRoster(roster, featured);

    } catch (err) {
        showError('Failed to load team roster: ' + err.message);
    }
}

async function fetchAllStats(players, group) {
    const results = {};
    await Promise.all(players.map(async p => {
        try {
            const data = await fetchJSON(
                `${API_BASE}/people/${p.person.id}/stats?stats=season&group=${group}&season=${season}`
            );
            if (data.stats?.[0]?.splits?.[0]) {
                results[p.person.id] = data.stats[0].splits[0].stat;
            }
        } catch (e) { /* skip */ }
    }));
    return results;
}

function selectPositionPlayers(players, hittingStats) {
    const selected = [];
    const usedIds = new Set();

    for (const slot of POSITION_SLOTS) {
        const slotPlayers = players.filter(p =>
            slot.codes.includes(p.position.code) && !usedIds.has(p.person.id)
        );

        slotPlayers.sort((a, b) => {
            const paA = hittingStats[a.person.id]?.plateAppearances || 0;
            const paB = hittingStats[b.person.id]?.plateAppearances || 0;
            return paB - paA;
        });

        const count = slot.count || 1;
        for (let i = 0; i < count && i < slotPlayers.length; i++) {
            usedIds.add(slotPlayers[i].person.id);
            selected.push({ ...slotPlayers[i], displayPosition: slot.abbr });
        }
    }
    return selected;
}

function selectPitchers(pitchers, pitchingStats) {
    const withStats = pitchers
        .map(p => ({ ...p, stat: pitchingStats[p.person.id] }))
        .filter(p => p.stat);

    const starters = withStats
        .filter(p => (p.stat.gamesStarted || 0) >= 5)
        .sort((a, b) => parseFloat(a.stat.era) - parseFloat(b.stat.era));

    const relievers = withStats
        .filter(p => (p.stat.gamesStarted || 0) < 5)
        .sort((a, b) => (b.stat.saves || 0) - (a.stat.saves || 0) ||
                        (b.stat.holds || 0) - (a.stat.holds || 0));

    const selected = [];
    const usedIds = new Set();

    for (let i = 0; i < 2 && i < starters.length; i++) {
        selected.push({ ...starters[i], role: 'SP' });
        usedIds.add(starters[i].person.id);
    }
    if (relievers.length > 0) {
        selected.push({ ...relievers[0], role: 'RP' });
        usedIds.add(relievers[0].person.id);
    }
    if (selected.length < 3) {
        const remaining = [
            ...starters.filter(s => !usedIds.has(s.person.id)),
            ...relievers.filter(r => !usedIds.has(r.person.id)),
        ];
        for (const p of remaining) {
            if (selected.length >= 3) break;
            const role = (p.stat.gamesStarted || 0) >= 5 ? 'SP' : 'RP';
            selected.push({ ...p, role });
            usedIds.add(p.person.id);
        }
    }
    return selected.slice(0, 3);
}

function pickHittingStats(stat) {
    if (!stat) return [];
    const candidates = [
        { label: 'HR',  value: stat.homeRuns || 0,      score: (stat.homeRuns || 0) / 20 },
        { label: 'RBI', value: stat.rbi || 0,           score: (stat.rbi || 0) / 60 },
        { label: 'SB',  value: stat.stolenBases || 0,   score: (stat.stolenBases || 0) / 15 },
        { label: 'AVG', value: stat.avg || '.000',      score: ((parseFloat(stat.avg) || 0) - 0.250) / 0.050 },
        { label: 'OPS', value: stat.ops || '.000',      score: ((parseFloat(stat.ops) || 0) - 0.700) / 0.150 },
        { label: 'R',   value: stat.runs || 0,          score: (stat.runs || 0) / 70 },
        { label: '2B',  value: stat.doubles || 0,       score: (stat.doubles || 0) / 25 },
        { label: 'BB',  value: stat.baseOnBalls || 0,   score: (stat.baseOnBalls || 0) / 50 },
    ];
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 4);
}

function pickPitchingStats(stat) {
    if (!stat) return [];
    const era = parseFloat(stat.era) || 99;
    const whip = parseFloat(stat.whip) || 99;
    const candidates = [
        { label: 'ERA',  value: stat.era || '—',           score: (4.00 - era) / 1.00 },
        { label: 'K',    value: stat.strikeOuts || 0,      score: (stat.strikeOuts || 0) / 100 },
        { label: 'W',    value: stat.wins || 0,            score: (stat.wins || 0) / 10 },
        { label: 'SV',   value: stat.saves || 0,           score: (stat.saves || 0) / 15 },
        { label: 'HLD',  value: stat.holds || 0,           score: (stat.holds || 0) / 15 },
        { label: 'WHIP', value: stat.whip || '—',          score: (1.30 - whip) / 0.20 },
        { label: 'IP',   value: stat.inningsPitched || '0.0', score: (parseFloat(stat.inningsPitched) || 0) / 120 },
    ];
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 4);
}

function renderTeamOverview(team, manager, standingsInfo) {
    const mascot = MASCOTS[team.id];
    const stadium = team.venue?.name || 'Unknown';

    let html = `
        <img class="team-overview-logo" src="${LOGO_BASE}/${team.id}.svg"
             onerror="this.style.display='none'" alt="${team.name} logo">
        <div class="team-overview-info">
            <div class="team-overview-name">${team.name}</div>
            <div class="team-overview-sub">${team.league.name} &middot; ${team.division.name}</div>
            <div class="team-overview-details">
                <div class="detail-item"><span class="detail-label">Manager</span>
                    <span class="detail-value">${manager?.person?.fullName || 'Unknown'}</span></div>
                ${mascot ? `<div class="detail-item"><span class="detail-label">Mascot</span>
                    <span class="detail-value">${mascot}</span></div>` : ''}
                <div class="detail-item"><span class="detail-label">Stadium</span>
                    <span class="detail-value">${stadium}</span></div>
            </div>
        </div>`;

    if (standingsInfo) {
        html += `<div class="team-stats">
            <div class="stat-box"><div class="stat-val">${standingsInfo.wins}-${standingsInfo.losses}</div><div class="stat-lbl">Record</div></div>
            <div class="stat-box streak"><div class="stat-val">${standingsInfo.streak}</div><div class="stat-lbl">Streak</div></div>
            <div class="stat-box"><div class="stat-val">${standingsInfo.lastTenWins}-${standingsInfo.lastTenLosses}</div><div class="stat-lbl">Last 10</div></div>
            <div class="stat-box rank"><div class="stat-val">${standingsInfo.divisionRank}</div><div class="stat-lbl">Div Rank</div></div>
        </div>`;
    }

    $('#team-overview').innerHTML = html;
}

function renderPitcherCriteria() {
    $('#pitcher-criteria').innerHTML =
        `<strong>Pitcher selection criteria:</strong> Starters ranked by lowest ERA ` +
        `(min. 5 starts); reliever ranked by most saves. Two starters and one reliever ` +
        `selected as the most notable pitchers. All stats reflect the ${season} MLB season.`;
}

function renderPlayerCards(featured, hittingStats, pitchingStats) {
    let html = '';

    for (const player of featured) {
        const isPitcher = player.position.code === '1';
        const stats = isPitcher ? pitchingStats[player.person.id] : hittingStats[player.person.id];
        const statPicks = isPitcher ? pickPitchingStats(stats) : pickHittingStats(stats);

        const photoUrl = PHOTO_URL.replace('{id}', player.person.id);
        const name = player.person.fullName;
        const jerseyNum = player.jerseyNumber || '—';
        const position = player.role || player.displayPosition || player.position.abbreviation;

        html += `<div class="player-card">
            <div class="card-top-bar"></div>
            <div class="card-photo-area">
                <div class="card-jersey">${jerseyNum}</div>
                <img class="card-photo" src="${photoUrl}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"
                     alt="${name}">
                <span class="card-photo-placeholder" style="display:none;">&#9918;</span>
            </div>
            <div class="card-info">
                <div class="card-name">${name}</div>
                <div class="card-position">${position}</div>
                <div class="card-stats">
                    ${statPicks.map(s => `<div class="card-stat">
                        <div class="card-stat-val">${s.value}</div>
                        <div class="card-stat-lbl">${s.label}</div>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    }

    $('#player-cards').innerHTML = html;
}

function renderRemainingRoster(roster, featured) {
    const featuredIds = new Set(featured.map(p => p.person.id));
    const remaining = roster.filter(p => !featuredIds.has(p.person.id));

    const posOrder = { '2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':6,'9':6,'O':6,'10':7,'1':8 };
    remaining.sort((a, b) => {
        const pa = posOrder[a.position.code] || 99;
        const pb = posOrder[b.position.code] || 99;
        if (pa !== pb) return pa - pb;
        return a.person.fullName.localeCompare(b.person.fullName);
    });

    let html = '<h3>Roster</h3><ul class="roster-list">';
    for (const p of remaining) {
        const pos = p.position.abbreviation;
        const num = p.jerseyNumber || '';
        const bat = p.person?.batSide?.code || '';
        const throwHand = p.person?.pitchHand?.code || '';
        const batThrow = bat && throwHand ? ` &middot; B/T: ${bat}/${throwHand}` : '';

        html += `<li class="roster-list-item">
            <span class="player-pos">${pos}</span>
            <span class="player-num">#${num}</span>
            <span class="player-name">${p.person.fullName}</span>
            <span class="player-detail">${batThrow}</span>
        </li>`;
    }
    html += '</ul>';
    $('#remaining-roster').innerHTML = html;
}

function showError(msg) {
    $('#loading').style.display = 'none';
    $('#team-view').style.display = 'none';
    $('#welcome').style.display = 'none';
    $('#error').style.display = 'block';
    $('#error-message').innerHTML = msg;
}

window.loadTeam = loadTeam;

init();
