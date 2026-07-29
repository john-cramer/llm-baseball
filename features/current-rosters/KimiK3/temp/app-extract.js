
'use strict';

/* ================= Configuration ================= */

const API = 'https://statsapi.mlb.com/api/v1';
// Season year: derived from the current date; the value reported back by the API
// (teams[0].season) is what actually gets displayed in the header.
const SEASON = new Date().getFullYear();

const PHOTO_URL = id =>
  'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png' +
  '/w_300,q_auto:best/v1/people/' + id + '/headshot/67/current';
const LOGO_URL = id => 'https://www.mlbstatic.com/team-logos/' + id + '.svg';

// Presentation-only accents (not stats data).
const TEAM_COLORS = {
  ATH:'#003831', HOU:'#002D62', SEA:'#0C2C56', LAA:'#BA0021', TEX:'#003278',
  BOS:'#BD3039', BAL:'#DF4601', TOR:'#134A8E', NYY:'#0C2340', TB:'#092C5C',
  MIN:'#002B5C', KC:'#004687',  CWS:'#27251F', DET:'#0C2340', CLE:'#00385D',
  LAD:'#005A9C', COL:'#33006F', SF:'#FD5A1E',  SD:'#2F241D', AZ:'#A71930',
  WSH:'#AB0003', MIA:'#00A3E0', ATL:'#CE1141', PHI:'#E81828', NYM:'#002D72',
  STL:'#C41E3A', CHC:'#0E3386', CIN:'#C6011F', MIL:'#12284B', PIT:'#27251F'
};

// Mascots are not available from the API — supplied from general knowledge.
// Teams without an official mascot (Yankees, Dodgers) are omitted gracefully.
const MASCOTS = {
  108: 'Rally Monkey (unofficial)', 109: 'Baxter the Bobcat', 110: 'The Oriole Bird',
  111: 'Wally the Green Monster', 112: 'Clark', 113: 'Mr. Red', 114: 'Slider',
  115: 'Dinger', 116: 'Paws', 117: 'Orbit', 118: 'Sluggerrr', 120: 'Screech',
  121: 'Mr. Met', 133: 'Stomper', 134: 'Pirate Parrot', 135: 'Swinging Friar',
  136: 'Mariner Moose', 137: 'Lou Seal', 138: 'Fredbird', 139: 'Raymond',
  140: 'Rangers Captain', 141: 'Ace', 142: 'T.C. Bear', 143: 'Phillie Phanatic',
  144: 'Blooper', 145: 'Southpaw', 146: 'Billy the Marlin', 158: 'Bernie Brewer'
  // 147 Yankees and 119 Dodgers have no official mascot
};

const DIVISION_ORDER = ['East', 'Central', 'West'];

// Candidate card stats, in canonical display order. Four are chosen per card.
const HITTER_STATS = [
  { key: 'avg',         label: 'AVG' },
  { key: 'ops',         label: 'OPS' },
  { key: 'homeRuns',    label: 'HR'  },
  { key: 'rbi',         label: 'RBI' },
  { key: 'runs',        label: 'R'   },
  { key: 'hits',        label: 'H'   },
  { key: 'doubles',     label: '2B'  },
  { key: 'stolenBases', label: 'SB'  },
  { key: 'baseOnBalls', label: 'BB'  }
];
const PITCHER_STATS = [
  { key: 'wins',           label: 'W'    },
  { key: 'era',            label: 'ERA',  lowerBetter: true },
  { key: 'whip',           label: 'WHIP', lowerBetter: true },
  { key: 'strikeOuts',     label: 'SO'   },
  { key: 'inningsPitched', label: 'IP',   isIp: true },
  { key: 'saves',          label: 'SV'   },
  { key: 'holds',          label: 'HLD'  },
  { key: 'gamesPitched',   label: 'G'    }
];
const STATS_PER_CARD = 4;

/* ================= State ================= */

const state = {
  teams: [],
  standings: {},     // teamId -> teamRecord
  seasonYear: SEASON,
  currentTeam: null,
  loading: false
};

/* ================= Small helpers ================= */

const $ = id => document.getElementById(id);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from ' + url);
  return res.json();
}

// A player's season stat object for a group ('hitting' | 'pitching').
// Traded players have one split per team plus an aggregate split with no team id —
// always prefer the aggregate.
function seasonStat(person, group) {
  const entry = (person.stats || []).find(s => s.group && s.group.displayName === group);
  if (!entry || !entry.splits || !entry.splits.length) return null;
  const agg = entry.splits.find(sp => !sp.team || !sp.team.id);
  return (agg || entry.splits[0]).stat || null;
}

// "69.2" -> 209 outs, so innings pitched compare numerically.
function ipToOuts(ip) {
  if (ip == null) return 0;
  const parts = String(ip).split('.');
  return (parseInt(parts[0], 10) || 0) * 3 + (parseInt(parts[1] || '0', 10) || 0);
}

function num(v) { return typeof v === 'number' ? v : (parseFloat(v) || 0); }

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= UI state helpers ================= */

function showStatus(text) {
  $('welcome').style.display = 'none';
  $('error-box').style.display = 'none';
  $('status').style.display = 'block';
  $('status-text').textContent = text || 'Loading…';
}
function hideStatus() { $('status').style.display = 'none'; }

function showError(msg, retryFn) {
  hideStatus();
  $('error-box').style.display = 'block';
  $('error-text').textContent = msg;
  $('retry-btn').onclick = retryFn;
}

/* ================= Boot ================= */

async function init() {
  showStatus('Loading teams…');
  try {
    const [teamsData, standingsData] = await Promise.all([
      fetchJson(API + '/teams?sportId=1&season=' + SEASON),
      fetchJson(API + '/standings?leagueId=103,104&season=' + SEASON + '&standingsTypes=regularSeason')
    ]);

    state.teams = (teamsData.teams || []).filter(t => t.active !== false);
    // Season year taken from the API itself when present.
    if (state.teams.length && state.teams[0].season) state.seasonYear = state.teams[0].season;

    state.standings = {};
    (standingsData.records || []).forEach(div => {
      (div.teamRecords || []).forEach(tr => { state.standings[tr.team.id] = tr; });
    });

    $('season-badge').textContent = state.seasonYear + ' Season';
    $('welcome-season').textContent = state.seasonYear + ' MLB season';
    $('criteria-season').textContent = state.seasonYear;
    $('copyright').textContent = teamsData.copyright || '';

    buildNav();
    hideStatus();
    $('welcome').style.display = 'block';

    // Deep link: #team=147 keeps the selection across refreshes.
    const m = location.hash.match(/team=(\d+)/);
    if (m && state.teams.some(t => t.id === +m[1])) selectTeam(+m[1]);
  } catch (err) {
    console.error(err);
    showError('Could not reach the MLB Stats API. Check your connection and try again.', init);
  }
}

/* ================= Navigation ================= */

function buildNav() {
  const leagues = {};
  state.teams.forEach(t => {
    const lg = t.league.name;
    const dv = t.division.name.replace(lg + ' ', '');
    (leagues[lg] = leagues[lg] || {})[dv] = (leagues[lg][dv] || []).concat(t);
  });

  const nav = $('nav-body');
  nav.innerHTML = '';
  ['American League', 'National League'].forEach(lg => {
    if (!leagues[lg]) return;
    const lgEl = document.createElement('div');
    lgEl.className = 'league-label display';
    lgEl.textContent = lg;
    nav.appendChild(lgEl);

    DIVISION_ORDER.forEach(dv => {
      const teams = (leagues[lg][dv] || []).sort((a, b) => a.name.localeCompare(b.name));
      if (!teams.length) return;
      const dvEl = document.createElement('div');
      dvEl.className = 'division-label';
      dvEl.textContent = dv;
      nav.appendChild(dvEl);

      teams.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'team-btn';
        btn.dataset.teamId = t.id;
        btn.innerHTML =
          '<span class="team-dot" style="background:' + (TEAM_COLORS[t.abbreviation] || '#888') + '"></span>' +
          '<span class="team-abbr">' + escapeHtml(t.abbreviation) + '</span>' +
          '<span class="team-name">' + escapeHtml(t.name) + '</span>';
        btn.addEventListener('click', () => selectTeam(t.id));
        nav.appendChild(btn);
      });
    });
  });
}

/* ================= Team loading ================= */

async function selectTeam(teamId) {
  if (state.loading) return;
  state.loading = true;
  state.currentTeam = teamId;
  location.hash = 'team=' + teamId;

  document.querySelectorAll('.team-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.teamId === teamId));

  $('overview').style.display = 'none';
  $('cards').innerHTML = '';
  $('rest').style.display = 'none';
  $('criteria').style.display = 'none';
  showStatus('Loading roster…');

  try {
    const hydrate = encodeURIComponent('person(stats(type=season,group=[hitting,pitching]))');
    const [rosterData, coachesData] = await Promise.all([
      fetchJson(API + '/teams/' + teamId + '/roster?rosterType=active&season=' + state.seasonYear +
                '&hydrate=' + hydrate),
      fetchJson(API + '/teams/' + teamId + '/coaches?season=' + state.seasonYear)
    ]);
    renderTeam(teamId, rosterData, coachesData);
    hideStatus();
  } catch (err) {
    console.error(err);
    showError('Failed to load the roster. The API may be unavailable — please retry.',
              () => { state.loading = false; selectTeam(teamId); });
  }
  state.loading = false;
}

/* ================= Rendering ================= */

function renderTeam(teamId, rosterData, coachesData) {
  const team = state.teams.find(t => t.id === teamId);
  const standing = state.standings[teamId];
  const color = TEAM_COLORS[team.abbreviation] || '#0b1f3a';

  renderOverview(team, standing, coachesData, color);

  const players = (rosterData.roster || []).map(r => ({
    id: r.person.id,
    name: r.person.fullName,
    number: r.jerseyNumber || '',
    pos: (r.person.primaryPosition && r.person.primaryPosition.abbreviation) || r.position.abbreviation,
    posType: (r.person.primaryPosition && r.person.primaryPosition.type) || r.position.type,
    hitting: seasonStat(r.person, 'hitting'),
    pitching: seasonStat(r.person, 'pitching')
  }));

  const featured = pickFeatured(players);
  renderCards(featured, color);
  renderRest(players, featured);

  $('criteria').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderOverview(team, standing, coachesData, color) {
  $('ov-logo').src = LOGO_URL(team.id);
  $('ov-logo').alt = team.name + ' logo';
  $('ov-name').textContent = team.name;

  const divisionShort = team.division.name.replace(team.league.name + ' ', '');
  $('ov-meta').textContent = team.league.name + ' · ' + divisionShort + ' Division';

  const manager = ((coachesData.roster || []).find(c => c.job === 'Manager') || {}).person;
  const mascot = MASCOTS[team.id];

  const facts = [];
  facts.push(['Manager', manager ? manager.fullName : '—']);
  if (mascot) facts.push(['Mascot', mascot]);
  facts.push(['Stadium', team.venue ? team.venue.name : '—']);

  if (standing) {
    const last10 = ((standing.records && standing.records.splitRecords) || [])
      .find(s => s.type === 'lastTen');
    facts.push(['Record', standing.wins + '–' + standing.losses + ' (' + standing.winningPercentage + ')']);
    facts.push(['Streak', standing.streak ? standing.streak.streakCode : '—']);
    facts.push(['Last 10', last10 ? last10.wins + '–' + last10.losses : '—']);
    facts.push(['Division Place', ordinal(parseInt(standing.divisionRank, 10)) + ', ' +
                team.abbreviation + ' ' + divisionShort]);
  }

  $('ov-facts').innerHTML = facts.map(f =>
    '<div class="fact" style="border-left-color:' + color + '">' +
      '<div class="k">' + escapeHtml(f[0]) + '</div>' +
      '<div class="v">' + escapeHtml(f[1]) + '</div>' +
    '</div>').join('');

  $('overview').style.display = 'block';
}

/* ---- Featured-player selection ---- */

function pickFeatured(players) {
  const used = new Set();
  const featured = [];

  const hitters = players
    .filter(p => p.posType !== 'Pitcher' && p.hitting && num(p.hitting.plateAppearances) > 0)
    .sort((a, b) => num(b.hitting.plateAppearances) - num(a.hitting.plateAppearances));

  const take = (pred, role) => {
    const p = hitters.find(h => !used.has(h.id) && pred(h));
    if (p) { used.add(p.id); featured.push({ player: p, role }); }
    return p;
  };

  // One per infield/catcher/DH slot, three outfielders — all by plate appearances.
  ['C', '1B', '2B', '3B', 'SS'].forEach(slot => take(h => h.pos === slot, slot));
  for (let i = 0; i < 3; i++) take(h => h.posType === 'Outfielder', 'OF');
  take(h => h.pos === 'DH', 'DH');

  // Fallback: if a slot went unfilled (e.g. no primary DH), take the best remaining hitter.
  while (featured.length < 9) {
    const p = take(() => true, null);
    if (!p) break;
    featured[featured.length - 1].role = p.pos;
  }

  // Pitchers: two starters by innings pitched, one reliever by appearances.
  const pitchers = players.filter(p => p.pitching && !used.has(p.id));
  const starters = pitchers
    .filter(p => num(p.pitching.gamesStarted) > 0)
    .sort((a, b) => ipToOuts(b.pitching.inningsPitched) - ipToOuts(a.pitching.inningsPitched));
  starters.slice(0, 2).forEach(p => { used.add(p.id); featured.push({ player: p, role: 'SP' }); });

  const relievers = pitchers
    .filter(p => !used.has(p.id) && num(p.pitching.gamesStarted) === 0)
    .sort((a, b) => num(b.pitching.gamesPitched) - num(a.pitching.gamesPitched) ||
                    num(a.pitching.era) - num(b.pitching.era));
  if (relievers.length) { used.add(relievers[0].id); featured.push({ player: relievers[0], role: 'RP' }); }

  // Final fallback to reach three pitchers (e.g. early-season edge cases).
  if (featured.filter(f => f.role === 'SP' || f.role === 'RP').length < 3) {
    pitchers
      .filter(p => !used.has(p.id))
      .sort((a, b) => ipToOuts(b.pitching.inningsPitched) - ipToOuts(a.pitching.inningsPitched))
      .slice(0, 3 - featured.filter(f => f.role === 'SP' || f.role === 'RP').length)
      .forEach(p => { used.add(p.id); featured.push({ player: p, role: num(p.pitching.gamesStarted) > 0 ? 'SP' : 'RP' }); });
  }

  return featured;
}

/* ---- Card stats: the four stats each player stands out most in ---- */

function pickStats(featured) {
  const groups = [
    { list: featured.filter(f => f.role !== 'SP' && f.role !== 'RP'), defs: HITTER_STATS, get: p => p.hitting },
    { list: featured.filter(f => f.role === 'SP' || f.role === 'RP'), defs: PITCHER_STATS, get: p => p.pitching }
  ];

  groups.forEach(g => {
    if (!g.list.length) return;
    // Peer bests among the featured group, for "stands out" scoring.
    const best = {}, worst = {};
    g.defs.forEach(d => {
      const vals = g.list.map(f => d.isIp ? ipToOuts(g.get(f.player)[d.key]) : num(g.get(f.player)[d.key]));
      best[d.key] = Math.max.apply(null, vals);
      worst[d.key] = Math.min.apply(null, vals.filter(v => v > 0).concat([Infinity]));
    });

    g.list.forEach(f => {
      const stat = g.get(f.player) || {};
      const scored = g.defs.map((d, idx) => {
        const raw = d.isIp ? ipToOuts(stat[d.key]) : num(stat[d.key]);
        let score = 0;
        if (raw > 0) {
          score = d.lowerBetter
            ? (worst[d.key] > 0 && worst[d.key] !== Infinity ? worst[d.key] / raw : 0)
            : (best[d.key] > 0 ? raw / best[d.key] : 0);
        }
        return { d, idx, score, display: stat[d.key] != null ? String(stat[d.key]) : '—' };
      });
      scored.sort((a, b) => b.score - a.score);
      f.cardStats = scored.slice(0, STATS_PER_CARD).sort((a, b) => a.idx - b.idx);
    });
  });
}

function renderCards(featured, color) {
  pickStats(featured);
  const grid = $('cards');
  grid.innerHTML = '';

  featured.forEach(f => {
    const p = f.player;
    const isPitcher = f.role === 'SP' || f.role === 'RP';
    const roleText = isPitcher
      ? (f.role === 'SP' ? 'Starting Pitcher' : 'Relief Pitcher')
      : (f.role === 'OF' ? 'Outfield' : positionName(f.role));

    const card = document.createElement('article');
    card.className = 'pcard';
    card.innerHTML =
      '<div class="pcard-strip display" style="background:' + color + '">' +
        '<span>' + escapeHtml(p.pos) + '</span>' +
        '<span>' + (p.number ? '#' + escapeHtml(p.number) : '') + '</span>' +
      '</div>' +
      '<div class="pcard-body">' +
        (p.number ? '<div class="pcard-num-bg">' + escapeHtml(p.number) + '</div>' : '') +
        '<img class="pcard-photo" loading="lazy" src="' + PHOTO_URL(p.id) + '" alt="' + escapeHtml(p.name) + ' headshot">' +
        '<div class="pcard-name display">' + escapeHtml(p.name) + '</div>' +
        '<div class="pcard-role">' + escapeHtml(roleText) + '</div>' +
        '<div class="pcard-stats">' +
          (f.cardStats || []).map(s =>
            '<div class="stat-cell"><div class="sl">' + s.d.label + '</div>' +
            '<div class="sv">' + escapeHtml(s.display) + '</div></div>').join('') +
        '</div>' +
      '</div>';
    grid.appendChild(card);
  });
}

function positionName(abbr) {
  return { C: 'Catcher', '1B': 'First Base', '2B': 'Second Base', '3B': 'Third Base',
           SS: 'Shortstop', DH: 'Designated Hitter', OF: 'Outfield', TWP: 'Two-Way Player',
           LF: 'Outfield', CF: 'Outfield', RF: 'Outfield' }[abbr] || abbr;
}

/* ---- Remaining roster list ---- */

function renderRest(players, featured) {
  const featuredIds = new Set(featured.map(f => f.player.id));
  const rest = players.filter(p => !featuredIds.has(p.id));

  const pitchers = rest.filter(p => p.posType === 'Pitcher')
    .sort((a, b) => ipToOuts((b.pitching || {}).inningsPitched) - ipToOuts((a.pitching || {}).inningsPitched));
  const others = rest.filter(p => p.posType !== 'Pitcher')
    .sort((a, b) => num((b.hitting || {}).plateAppearances) - num((a.hitting || {}).plateAppearances));

  const line = p => {
    if (p.posType === 'Pitcher') {
      if (!p.pitching || !ipToOuts(p.pitching.inningsPitched)) return 'No MLB innings yet this season';
      const s = p.pitching;
      return (s.wins || 0) + '–' + (s.losses || 0) + ', ' + (s.era || '—') + ' ERA, ' +
             (s.strikeOuts || 0) + ' SO in ' + (s.inningsPitched || '0.0') + ' IP';
    }
    if (!p.hitting || !num(p.hitting.plateAppearances)) return 'No MLB at-bats yet this season';
    const s = p.hitting;
    return (s.avg || '—') + ' AVG, ' + (s.homeRuns || 0) + ' HR, ' + (s.rbi || 0) + ' RBI, ' +
           (s.stolenBases || 0) + ' SB';
  };

  const group = (title, list) =>
    '<div class="rest-group"><h4>' + title + ' (' + list.length + ')</h4><ul>' +
    list.map(p =>
      '<li><span class="rest-num">' + (p.number ? '#' + escapeHtml(p.number) : '') + '</span>' +
      '<span class="rest-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="rest-pos">' + escapeHtml(p.pos) + '</span>' +
      '<span class="rest-line">' + escapeHtml(line(p)) + '</span></li>').join('') +
    '</ul></div>';

  $('rest-cols').innerHTML = group('Pitchers', pitchers) + group('Position Players', others);
  $('rest').style.display = 'block';
}

/* ================= Go ================= */

init();
