// Test harness: load the app's script (minus init()) and exercise the pure
// selection/scoring logic against the saved live-API roster samples.
const fs = require('fs');

let src = fs.readFileSync('temp/app-extract.js', 'utf8');
src = src.replace(/init\(\);\s*$/, '');           // strip the boot call
src = src.replace(/'use strict';/, '');           // allow eval'd fns into this scope
eval(src);

function loadPlayers(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (data.roster || []).map(r => ({
    id: r.person.id,
    name: r.person.fullName,
    number: r.jerseyNumber || '',
    pos: (r.person.primaryPosition && r.person.primaryPosition.abbreviation) || r.position.abbreviation,
    posType: (r.person.primaryPosition && r.person.primaryPosition.type) || r.position.type,
    hitting: seasonStat(r.person, 'hitting'),
    pitching: seasonStat(r.person, 'pitching')
  }));
}

function testTeam(file, label) {
  const players = loadPlayers(file);
  const featured = pickFeatured(players);
  pickStats(featured);

  console.log('=== ' + label + ' ===');
  console.log('featured count: ' + featured.length);
  const pos = featured.filter(f => f.role !== 'SP' && f.role !== 'RP');
  const pit = featured.filter(f => f.role === 'SP' || f.role === 'RP');
  console.log('position players: ' + pos.length + ' | pitchers: ' + pit.length +
              ' (SP: ' + pit.filter(p => p.role === 'SP').length +
              ', RP: ' + pit.filter(p => p.role === 'RP').length + ')');
  const dupes = featured.length - new Set(featured.map(f => f.player.id)).size;
  console.log('duplicates: ' + dupes);
  featured.forEach(f => {
    const stats = (f.cardStats || []).map(s => s.d.label + '=' + s.display).join(' ');
    console.log('  ' + f.role.padEnd(3) + ' ' + f.player.name.padEnd(22) +
                ' stats(' + (f.cardStats || []).length + '): ' + stats);
  });
  const rest = players.filter(p => !featured.some(f => f.player.id === p.id));
  console.log('remaining roster: ' + rest.length + ' (total ' + players.length + ')');
  console.log('');
}

testTeam('temp/mlb-roster.json', 'New York Yankees');
testTeam('temp/mlb-roster-bos.json', 'Boston Red Sox');
testTeam('temp/mlb-roster-lad.json', 'Los Angeles Dodgers');
testTeam('temp/mlb-roster-ath.json', 'Athletics');
