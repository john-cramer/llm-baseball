const API_BASE = 'https://statsapi.mlb.com/api/v1';

const mascots = {
    143: "Phillie Phanatic", 121: "Mr. Met", 144: "Blooper", 111: "Wally the Green Monster",
    145: "Southpaw", 117: "Orbit", 136: "Mariner Moose", 135: "Swinging Friar",
    158: "Bernie Brewer", 110: "The Oriole Bird", 113: "Mr. Redlegs / Rosie Red",
    140: "Rangers Captain", 142: "T.C. Bear", 116: "Paws", 133: "Stomper",
    146: "Billy The Marlin", 114: "Slider", 118: "Sluggerrr", 141: "ACE",
    115: "Dinger", 109: "D. Baxter the Bobcat", 139: "Raymond", 138: "Fredbird",
    120: "Screech", 134: "Pirate Parrot", 137: "Lou Seal", 112: "Clark the Cub"
};

let allStandings = {};
let copyrightText = "";

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const currentYear = new Date().getFullYear();
    document.getElementById('season-year').textContent = currentYear;
    
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-date').textContent = today;

    try {
        await Promise.all([fetchTeams(), fetchStandings()]);
    } catch (error) {
        console.error("Initialization error:", error);
        document.querySelector('.welcome-message h2').textContent = "Failed to load MLB data. Please try again.";
    }
}

async function fetchTeams() {
    const response = await fetch(`${API_BASE}/teams?sportId=1`);
    const data = await response.json();
    if (data.copyright) copyrightText = data.copyright;
    
    const teams = data.teams;
    renderNavigation(teams);
}

async function fetchStandings() {
    const response = await fetch(`${API_BASE}/standings?leagueId=103,104`);
    const data = await response.json();
    if (data.copyright) copyrightText = data.copyright;
    
    data.records.forEach(record => {
        record.teamRecords.forEach(teamRec => {
            let lastTen = "N/A";
            if (teamRec.records && teamRec.records.splitRecords) {
                const l10Obj = teamRec.records.splitRecords.find(r => r.type === 'lastTen');
                if (l10Obj) lastTen = `${l10Obj.wins}-${l10Obj.losses}`;
            }
            allStandings[teamRec.team.id] = {
                wins: teamRec.wins,
                losses: teamRec.losses,
                divisionRank: teamRec.divisionRank,
                streak: teamRec.streak ? teamRec.streak.streakCode : 'None',
                lastTen: lastTen
            };
        });
    });
}

function renderNavigation(teams) {
    const navContainer = document.getElementById('teams-list');
    
    // Group by League then Division
    const grouped = {};
    teams.forEach(team => {
        if (!team.league || !team.division) return;
        const league = team.league.name;
        const division = team.division.name.replace(league + ' ', '');
        
        if (!grouped[league]) grouped[league] = {};
        if (!grouped[league][division]) grouped[league][division] = [];
        
        grouped[league][division].push(team);
    });
    
    let html = '';
    
    // Sort leagues (AL first usually, or alphabetical)
    const leagues = Object.keys(grouped).sort();
    
    leagues.forEach(league => {
        html += `<div class="league-section">`;
        html += `<div class="league-title">${league}</div>`;
        
        const divisions = Object.keys(grouped[league]).sort();
        divisions.forEach(division => {
            html += `<div class="division-section">`;
            html += `<div class="division-title">${division}</div>`;
            
            // Sort teams alphabetically
            grouped[league][division].sort((a, b) => a.name.localeCompare(b.name));
            
            grouped[league][division].forEach(team => {
                html += `<button class="team-btn" data-team-id="${team.id}">${team.name}</button>`;
            });
            
            html += `</div>`;
        });
        html += `</div>`;
    });
    
    navContainer.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadTeam(e.target.dataset.teamId, teams.find(t => t.id == e.target.dataset.teamId));
        });
    });
}

async function loadTeam(teamId, teamObj) {
    document.querySelector('.welcome-message').classList.add('hidden');
    document.getElementById('team-overview').classList.add('hidden');
    document.getElementById('roster-grid').classList.add('hidden');
    document.getElementById('remaining-roster-container').classList.add('hidden');
    document.getElementById('roster-notability').classList.add('hidden');

    try {
        const [coachesRes, rosterRes] = await Promise.all([
            fetch(`${API_BASE}/teams/${teamId}/coaches`),
            fetch(`${API_BASE}/teams/${teamId}/roster?rosterType=active&hydrate=person(stats(type=season))`)
        ]);
        
        const coachesData = await coachesRes.json();
        const rosterData = await rosterRes.json();
        
        if (rosterData.copyright) copyrightText = rosterData.copyright;
        
        const managerObj = coachesData.roster.find(c => c.job === 'Manager');
        const managerName = managerObj ? managerObj.person.fullName : "Unknown";
        
        renderTeamOverview(teamId, teamObj, managerName);
        processAndRenderRoster(rosterData.roster);
        
        document.getElementById('copyright-text').innerHTML = copyrightText;
        
    } catch (error) {
        console.error("Error loading team data:", error);
        alert("Failed to load team data.");
    }
}

function renderTeamOverview(teamId, teamObj, managerName) {
    document.getElementById('team-logo').src = `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
    document.getElementById('team-name').textContent = teamObj.name;
    document.getElementById('team-manager').textContent = managerName;
    document.getElementById('team-mascot').textContent = mascots[teamId] || "None";
    document.getElementById('team-stadium').textContent = teamObj.venue ? teamObj.venue.name : "Unknown Stadium";
    
    const stats = allStandings[teamId] || { wins: 0, losses: 0, divisionRank: '-', streak: '-', lastTen: '-' };
    document.getElementById('team-record').textContent = `${stats.wins}-${stats.losses}`;
    document.getElementById('team-division-rank').textContent = stats.divisionRank;
    document.getElementById('team-streak').textContent = stats.streak;
    document.getElementById('team-l10').textContent = stats.lastTen;
    
    document.getElementById('team-overview').classList.remove('hidden');
}

function processAndRenderRoster(roster) {
    const positionGroups = {
        'C': [], '1B': [], '2B': [], '3B': [], 'SS': [], 'OF': [], 'DH': []
    };
    const starters = [];
    const relievers = [];
    
    roster.forEach(player => {
        const p = {
            id: player.person.id,
            name: player.person.fullName,
            number: player.jerseyNumber,
            posAbbr: player.position.abbreviation,
            posName: player.position.name,
            stats: getSeasonStats(player)
        };
        
        const pos = p.posAbbr;
        
        if (['LF', 'CF', 'RF'].includes(pos)) p.posName = 'Outfielder';
        
        if (pos === 'P' || pos === 'SP' || pos === 'RP' || pos === 'TWP') {
            const gs = p.stats.gamesStarted || 0;
            if (gs > 0) {
                starters.push(p);
            } else {
                relievers.push(p);
            }
        } else {
            let group = pos;
            if (['LF', 'CF', 'RF'].includes(pos)) group = 'OF';
            
            // Some players might not have a primary position mapped to our standard 9, put them in a fallback if needed
            if (!positionGroups[group]) group = 'DH'; // Fallback for utility
            
            positionGroups[group].push(p);
        }
    });
    
    // Sort hitters by Plate Appearances
    Object.keys(positionGroups).forEach(key => {
        positionGroups[key].sort((a, b) => (b.stats.plateAppearances || 0) - (a.stats.plateAppearances || 0));
    });
    
    // Select 9 position players
    let selectedHitters = [];
    const requiredPositions = ['C', '1B', '2B', '3B', 'SS', 'DH'];
    
    requiredPositions.forEach(pos => {
        if (positionGroups[pos].length > 0) {
            selectedHitters.push(positionGroups[pos].shift()); // take the top one
        }
    });
    
    // Add up to 3 OFs
    for (let i = 0; i < 3; i++) {
        if (positionGroups['OF'].length > 0) {
            selectedHitters.push(positionGroups['OF'].shift());
        }
    }
    
    // If we are short of 9 hitters (e.g. no DH), backfill with remaining highest PA hitters
    const remainingHitters = [];
    Object.values(positionGroups).forEach(group => remainingHitters.push(...group));
    remainingHitters.sort((a, b) => (b.stats.plateAppearances || 0) - (a.stats.plateAppearances || 0));
    
    while (selectedHitters.length < 9 && remainingHitters.length > 0) {
        selectedHitters.push(remainingHitters.shift());
    }
    
    // Pitchers: need 3 (>= 2 starters, >= 1 reliever)
    starters.sort((a, b) => (b.stats.strikeOuts || 0) - (a.stats.strikeOuts || 0));
    relievers.sort((a, b) => {
        if ((b.stats.saves || 0) !== (a.stats.saves || 0)) {
            return (b.stats.saves || 0) - (a.stats.saves || 0);
        }
        return (b.stats.gamesPlayed || 0) - (a.stats.gamesPlayed || 0);
    });
    
    let selectedPitchers = [];
    
    if (starters.length >= 2 && relievers.length >= 1) {
        selectedPitchers.push(starters.shift());
        selectedPitchers.push(starters.shift());
        selectedPitchers.push(relievers.shift());
    } else if (starters.length >= 3) { // Fallback if no relievers
        selectedPitchers.push(starters.shift(), starters.shift(), starters.shift());
    } else if (relievers.length >= 3) { // Fallback if no starters
        selectedPitchers.push(relievers.shift(), relievers.shift(), relievers.shift());
    } else {
        // Just take what we can
        selectedPitchers = [...starters, ...relievers].slice(0, 3);
    }
    
    const featuredPlayers = [...selectedHitters, ...selectedPitchers];
    
    // Remaining roster
    const remainingRoster = [...remainingHitters, ...starters, ...relievers];
    
    renderCards(featuredPlayers);
    renderRemaining(remainingRoster);
}

function getSeasonStats(playerObj) {
    if (playerObj.person.stats) {
        const seasonStats = playerObj.person.stats.find(s => s.type.displayName === 'season');
        if (seasonStats && seasonStats.splits && seasonStats.splits.length > 0) {
            return seasonStats.splits[0].stat;
        }
    }
    return {};
}

function renderCards(players) {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '';
    
    players.forEach(p => {
        const isPitcher = ['P', 'SP', 'RP', 'TWP'].includes(p.posAbbr);
        let statHtml = '';
        
        if (isPitcher) {
            const isReliever = (p.stats.gamesStarted || 0) === 0;
            statHtml = `
                <div class="stat-item"><span class="stat-label">ERA</span><span class="stat-value">${p.stats.era || '-'}</span></div>
                <div class="stat-item"><span class="stat-label">SO</span><span class="stat-value">${p.stats.strikeOuts || '0'}</span></div>
                <div class="stat-item"><span class="stat-label">WHIP</span><span class="stat-value">${p.stats.whip || '-'}</span></div>
                <div class="stat-item"><span class="stat-label">${isReliever ? 'SV' : 'W'}</span><span class="stat-value">${isReliever ? (p.stats.saves || '0') : (p.stats.wins || '0')}</span></div>
            `;
        } else {
            statHtml = `
                <div class="stat-item"><span class="stat-label">AVG</span><span class="stat-value">${p.stats.avg || '.---'}</span></div>
                <div class="stat-item"><span class="stat-label">HR</span><span class="stat-value">${p.stats.homeRuns || '0'}</span></div>
                <div class="stat-item"><span class="stat-label">RBI</span><span class="stat-value">${p.stats.rbi || '0'}</span></div>
                <div class="stat-item"><span class="stat-label">OPS</span><span class="stat-value">${p.stats.ops || '.---'}</span></div>
            `;
        }
        
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="card-header">
                <img src="https://securea.mlb.com/mlb/images/players/head_shot/${p.id}.jpg" alt="${p.name}" class="player-photo" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23ccc%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22 font-size=%2230%22%3E?%3C/text%3E%3C/svg%3E'">
                <div class="player-info">
                    <div class="player-name">${p.name}</div>
                    <div class="player-meta">#${p.number || '--'} | ${p.posName}</div>
                </div>
            </div>
            <div class="card-stats">
                ${statHtml}
            </div>
        `;
        grid.appendChild(card);
    });
    
    document.getElementById('roster-grid').classList.remove('hidden');
    document.getElementById('roster-notability').classList.remove('hidden');
}

function renderRemaining(players) {
    const list = document.getElementById('remaining-roster-list');
    list.innerHTML = '';
    
    // Sort alphabetically
    players.sort((a, b) => a.name.localeCompare(b.name));
    
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.name} - ${p.posName} (#${p.number || '--'})`;
        list.appendChild(li);
    });
    
    document.getElementById('remaining-roster-container').classList.remove('hidden');
}