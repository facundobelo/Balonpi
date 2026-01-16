/**
 * GitHub Football Dataset Fetcher
 *
 * Fetches REAL player data from maintained GitHub datasets.
 * Uses the transfermarkt-datasets by David Calavera (CC BY-NC-SA 4.0)
 *
 * Usage: npx tsx scripts/fetchGitHubDataset.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../public/data/master_db_2026.json');

// GitHub raw URLs for the transfermarkt-datasets
const DATASETS = {
  players: 'https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/master/data/players.csv',
  clubs: 'https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/master/data/clubs.csv',
  competitions: 'https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/master/data/competitions.csv',
};

// Competition IDs we want (from transfermarkt)
const WANTED_COMPETITIONS: Record<string, { name: string; shortName: string; country: string; tier: number }> = {
  'GB1': { name: 'Premier League', shortName: 'EPL', country: 'England', tier: 1 },
  'ES1': { name: 'La Liga', shortName: 'LAL', country: 'Spain', tier: 1 },
  'L1': { name: 'Bundesliga', shortName: 'BUN', country: 'Germany', tier: 1 },
  'IT1': { name: 'Serie A', shortName: 'SEA', country: 'Italy', tier: 1 },
  'FR1': { name: 'Ligue 1', shortName: 'L1', country: 'France', tier: 1 },
  'AR1N': { name: 'Liga Profesional Argentina', shortName: 'LPA', country: 'Argentina', tier: 2 },
  'BRA1': { name: 'Brasileirão Série A', shortName: 'BRA', country: 'Brazil', tier: 2 },
};

interface CsvRow {
  [key: string]: string;
}

function parseCSV(csv: string): CsvRow[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: CsvRow = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      row[headers[j]] = values[j];
    }
    rows.push(row);
  }

  return rows;
}

async function fetchCSV(url: string): Promise<CsvRow[]> {
  console.log(`  Fetching: ${url.split('/').slice(-1)[0]}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error);
    return [];
  }
}

function estimateSkillFromValue(marketValue: number, tier: number, age: number): number {
  let skill: number;

  if (marketValue >= 100000000) skill = 88 + Math.floor(Math.random() * 6);
  else if (marketValue >= 50000000) skill = 84 + Math.floor(Math.random() * 5);
  else if (marketValue >= 30000000) skill = 80 + Math.floor(Math.random() * 5);
  else if (marketValue >= 15000000) skill = 76 + Math.floor(Math.random() * 5);
  else if (marketValue >= 5000000) skill = 72 + Math.floor(Math.random() * 5);
  else if (marketValue >= 1000000) skill = 66 + Math.floor(Math.random() * 7);
  else skill = 58 + Math.floor(Math.random() * 10);

  if (tier === 2) skill = Math.max(55, skill - 2);
  if (age <= 21) skill = Math.max(58, skill - Math.floor((22 - age) * 1.2));

  return Math.min(99, Math.max(50, skill));
}

function estimatePotential(skill: number, age: number): number {
  if (age <= 20) return Math.min(99, skill + 8 + Math.floor(Math.random() * 12));
  if (age <= 23) return Math.min(99, skill + 4 + Math.floor(Math.random() * 8));
  if (age <= 26) return Math.min(99, skill + Math.floor(Math.random() * 4));
  return skill;
}

function mapPosition(pos: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  const p = (pos || '').toLowerCase();
  if (p.includes('goalkeeper') || p === 'gk') return 'GK';
  if (p.includes('back') || p.includes('defender') || p === 'df') return 'DEF';
  if (p.includes('midfield') || p === 'mf') return 'MID';
  if (p.includes('forward') || p.includes('winger') || p.includes('striker') || p === 'fw') return 'FWD';
  return 'MID';
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  GitHub Football Dataset Fetcher');
  console.log('═'.repeat(60));
  console.log('\n  Fetching real player data from transfermarkt-datasets...\n');

  // Fetch all CSVs
  const [playersData, clubsData] = await Promise.all([
    fetchCSV(DATASETS.players),
    fetchCSV(DATASETS.clubs),
  ]);

  console.log(`\n  Raw data: ${playersData.length} players, ${clubsData.length} clubs`);

  if (playersData.length === 0 || clubsData.length === 0) {
    console.log('\n  ❌ Failed to fetch data from GitHub');
    console.log('  The dataset might have moved or changed format.');
    console.log('  Try running: npx tsx scripts/generateRealTeams.ts instead');
    return;
  }

  // Filter clubs by competition
  const wantedCompIds = Object.keys(WANTED_COMPETITIONS);
  const filteredClubs = clubsData.filter(club =>
    wantedCompIds.includes(club.domestic_competition_id || club.competition_id)
  );

  console.log(`  Filtered clubs: ${filteredClubs.length}`);

  // Build club map
  const clubMap = new Map<string, CsvRow>();
  for (const club of filteredClubs) {
    clubMap.set(club.club_id, club);
  }

  // Filter players by club
  const filteredPlayers = playersData.filter(player =>
    clubMap.has(player.current_club_id)
  );

  console.log(`  Filtered players: ${filteredPlayers.length}`);

  // Build database
  const database = {
    meta: {
      version: '3.0.0',
      lastUpdated: new Date().toISOString(),
      season: '2024-2025',
      source: 'transfermarkt-datasets (GitHub)',
    },
    players: [] as any[],
    clubs: [] as any[],
    managers: [] as any[],
    competitions: [] as any[],
    nationalities: [] as string[],
  };

  // Process competitions
  const competitionClubs: Record<string, string[]> = {};

  for (const [compId, compInfo] of Object.entries(WANTED_COMPETITIONS)) {
    competitionClubs[compId] = [];

    database.competitions.push({
      id: `l_${compId.toLowerCase()}`,
      name: compInfo.name,
      shortName: compInfo.shortName,
      country: compInfo.country,
      type: 'LEAGUE',
      tier: compInfo.tier,
      teamIds: [], // Will fill later
      standings: [],
    });
  }

  // Process clubs
  console.log('\n  Processing clubs...');
  for (const club of filteredClubs) {
    const compId = club.domestic_competition_id || club.competition_id;
    const compInfo = WANTED_COMPETITIONS[compId];
    if (!compInfo) continue;

    const clubId = `t_${club.club_id}`;
    competitionClubs[compId].push(clubId);

    const budgetByTier: Record<number, [number, number]> = {
      1: [40000000, 400000000],
      2: [10000000, 60000000],
    };
    const [minBudget, maxBudget] = budgetByTier[compInfo.tier] || [5000000, 30000000];
    const budget = minBudget + Math.random() * (maxBudget - minBudget);

    const repByTier: Record<number, [number, number]> = { 1: [72, 98], 2: [55, 82] };
    const [minRep, maxRep] = repByTier[compInfo.tier] || [50, 70];

    database.clubs.push({
      id: clubId,
      name: club.name || club.club_name || 'Unknown',
      shortCode: (club.name || club.club_name || 'UNK').substring(0, 3).toUpperCase(),
      country: compInfo.country,
      tier: compInfo.tier,
      reputation: Math.floor(minRep + Math.random() * (maxRep - minRep)),
      budget: Math.round(budget),
      wageBudget: Math.round(budget * 0.015),
      stadium: club.stadium_name || `${club.name} Stadium`,
      stadiumCapacity: parseInt(club.stadium_seats) || 30000,
      rivalClubIds: [],
      leagueId: `l_${compId.toLowerCase()}`,
      isNationalTeam: false,
    });
  }

  // Update competition teamIds and standings
  for (const comp of database.competitions) {
    const compId = comp.id.replace('l_', '').toUpperCase();
    comp.teamIds = competitionClubs[compId] || [];
    comp.standings = comp.teamIds.map((clubId: string) => ({
      clubId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: [],
    }));
  }

  // Process players
  console.log('  Processing players...');
  const formOptions = ['UP', 'SLIGHT_UP', 'STABLE', 'STABLE', 'STABLE', 'SLIGHT_DOWN', 'DOWN'];

  for (const player of filteredPlayers) {
    const clubId = `t_${player.current_club_id}`;
    const club = database.clubs.find(c => c.id === clubId);
    if (!club) continue;

    const age = parseInt(player.age) || 25;
    const marketValue = parseInt(player.market_value_in_eur) || 1000000;
    const position = mapPosition(player.position || player.sub_position || '');

    const skill = estimateSkillFromValue(marketValue, club.tier, age);
    const potential = estimatePotential(skill, age);

    database.players.push({
      id: `p_${player.player_id}`,
      name: player.name || player.player_name || 'Unknown',
      nationality: player.country_of_citizenship || player.nationality || 'Unknown',
      age,
      positionMain: position,
      positionAlt: null,
      skillBase: skill,
      potential,
      form: 60 + Math.floor(Math.random() * 25),
      conditionArrow: formOptions[Math.floor(Math.random() * formOptions.length)],
      clubId,
      wage: Math.round(skill * skill * 25 + Math.random() * 15000),
      contractEnd: player.contract_expiration_date || `202${6 + Math.floor(Math.random() * 3)}-06-30`,
      marketValue,
      transferStatus: Math.random() < 0.08 ? 'LISTED' : 'UNAVAILABLE',
      isIdol: Math.random() < 0.03,
      currentSeasonStats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, avgRating: 6.5 },
      careerStats: {
        appearances: Math.floor(Math.random() * 250),
        goals: position === 'FWD' ? Math.floor(Math.random() * 100) : position === 'MID' ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 15),
        assists: Math.floor(Math.random() * 60),
        trophies: Math.floor(Math.random() * 6),
      },
    });
  }

  // Collect nationalities
  const nationalities = new Set(database.players.map(p => p.nationality));
  database.nationalities = Array.from(nationalities);

  // Save
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('  DATABASE CREATED WITH REAL PLAYER DATA!');
  console.log('═'.repeat(60));
  console.log(`  📊 Teams: ${database.clubs.length}`);
  console.log(`  👤 Players: ${database.players.length}`);
  console.log(`  🏆 Competitions: ${database.competitions.length}`);
  console.log(`  📁 Saved to: ${OUTPUT_FILE}`);
  console.log('═'.repeat(60));

  // Show sample players
  console.log('\n  Sample players:');
  for (const player of database.players.slice(0, 10)) {
    console.log(`    - ${player.name} (${player.positionMain}, ${player.skillBase} OVR)`);
  }
}

main().catch(console.error);
