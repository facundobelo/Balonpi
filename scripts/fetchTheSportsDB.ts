/**
 * TheSportsDB Data Fetcher
 *
 * Fetches real football data from TheSportsDB
 * with proper rate limiting for free tier.
 *
 * Usage:
 *   npx tsx scripts/fetchTheSportsDB.ts
 *
 * The free tier has rate limits, so we fetch gradually.
 * Progress is saved and can be resumed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.SPORTSDB_KEY || '3';
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

const OUTPUT_FILE = path.join(__dirname, '../public/data/master_db_2026.json');
const PROGRESS_FILE = path.join(__dirname, '../data/sportsdb_progress.json');

// Leagues to fetch
const LEAGUES = [
  { name: 'English Premier League', country: 'England', tier: 1, shortName: 'EPL' },
  { name: 'English League Championship', country: 'England', tier: 2, shortName: 'EFL' },
  { name: 'Spanish La Liga', country: 'Spain', tier: 1, shortName: 'LAL' },
  { name: 'German Bundesliga', country: 'Germany', tier: 1, shortName: 'BUN' },
  { name: 'Italian Serie A', country: 'Italy', tier: 1, shortName: 'SEA' },
  { name: 'French Ligue 1', country: 'France', tier: 1, shortName: 'L1' },
  { name: 'Argentine Primera Division', country: 'Argentina', tier: 2, shortName: 'LPA' },
  { name: 'Brazilian Serie A', country: 'Brazil', tier: 2, shortName: 'BRA' },
];

// Position mapping
const POSITION_MAP: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  'Goalkeeper': 'GK',
  'Defender': 'DEF',
  'Centre-Back': 'DEF',
  'Left-Back': 'DEF',
  'Right-Back': 'DEF',
  'Midfielder': 'MID',
  'Central Midfield': 'MID',
  'Defensive Midfield': 'MID',
  'Attacking Midfield': 'MID',
  'Left Midfield': 'MID',
  'Right Midfield': 'MID',
  'Forward': 'FWD',
  'Centre-Forward': 'FWD',
  'Left Winger': 'FWD',
  'Right Winger': 'FWD',
  'Striker': 'FWD',
  'Second Striker': 'FWD',
};

interface Progress {
  leagues_fetched: string[];
  teams_fetched: string[];
  last_updated: string;
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { leagues_fetched: [], teams_fetched: [], last_updated: '' };
}

function saveProgress(progress: Progress) {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  [${attempt}/${retries}] Fetching...`);
      const response = await fetch(url);

      if (response.status === 429) {
        console.log(`  ⏳ Rate limited. Waiting 30 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }

      if (!response.ok) {
        console.error(`  HTTP Error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      // Longer delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));
      return data;
    } catch (error) {
      console.error(`  Error:`, error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return null;
}

async function searchTeamsByLeague(leagueName: string): Promise<any[]> {
  const url = `${BASE_URL}/search_all_teams.php?l=${encodeURIComponent(leagueName)}`;
  const data = await fetchJson(url);
  return data?.teams || [];
}

async function getPlayersForTeam(teamId: string): Promise<any[]> {
  const url = `${BASE_URL}/lookup_all_players.php?id=${teamId}`;
  const data = await fetchJson(url);
  return data?.player || [];
}

function calculateAge(birthDate: string | null): number {
  if (!birthDate) return 25;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age || 25;
}

function estimateSkill(tier: number, age: number): number {
  const tierRanges: Record<number, [number, number]> = {
    1: [72, 92], 2: [65, 82], 3: [58, 75],
  };
  const [min, max] = tierRanges[tier] || [60, 75];
  let skill = min + Math.floor(Math.random() * (max - min));
  if (age < 22) skill = Math.max(min, skill - Math.floor((22 - age) * 1.5));
  else if (age > 32) skill = Math.max(min, skill - Math.floor((age - 32) * 2));
  return Math.min(99, Math.max(40, skill));
}

function estimatePotential(skill: number, age: number): number {
  if (age <= 21) return Math.min(99, skill + 5 + Math.floor(Math.random() * 15));
  if (age <= 25) return Math.min(99, skill + Math.floor(Math.random() * 8));
  if (age <= 29) return Math.min(99, skill + Math.floor(Math.random() * 3));
  return skill;
}

function calculateMarketValue(skill: number, potential: number, age: number): number {
  const baseValue = Math.pow(skill, 2.5) * 100;
  let mult = 1;
  if (age <= 23 && potential >= 85) mult = 2.5;
  else if (age <= 25 && potential >= 80) mult = 1.8;
  else if (age >= 32) mult = 0.5;
  else if (age >= 30) mult = 0.7;
  return Math.round(baseValue * mult);
}

function transformTeam(apiTeam: any, leagueInfo: typeof LEAGUES[0], leagueId: string): any {
  const budgetByTier: Record<number, [number, number]> = {
    1: [50000000, 500000000], 2: [15000000, 80000000],
  };
  const [minBudget, maxBudget] = budgetByTier[leagueInfo.tier] || [10000000, 50000000];
  const budget = minBudget + Math.random() * (maxBudget - minBudget);

  const repByTier: Record<number, [number, number]> = { 1: [75, 99], 2: [55, 80] };
  const [minRep, maxRep] = repByTier[leagueInfo.tier] || [50, 70];

  return {
    id: `t_${apiTeam.idTeam}`,
    name: apiTeam.strTeam,
    shortCode: apiTeam.strTeamShort || apiTeam.strTeam.substring(0, 3).toUpperCase(),
    country: leagueInfo.country,
    tier: leagueInfo.tier,
    reputation: Math.floor(minRep + Math.random() * (maxRep - minRep)),
    budget: Math.round(budget),
    wageBudget: Math.round(budget * 0.02),
    stadium: apiTeam.strStadium || `${apiTeam.strTeam} Stadium`,
    stadiumCapacity: parseInt(apiTeam.intStadiumCapacity) || 30000,
    rivalClubIds: [],
    leagueId: leagueId,
    isNationalTeam: false,
    logo: apiTeam.strTeamBadge,
  };
}

function transformPlayer(apiPlayer: any, teamId: string, tier: number): any {
  const position = POSITION_MAP[apiPlayer.strPosition] || 'MID';
  const age = calculateAge(apiPlayer.dateBorn);
  const skill = estimateSkill(tier, age);
  const potential = estimatePotential(skill, age);

  const formOptions = ['UP', 'SLIGHT_UP', 'STABLE', 'STABLE', 'STABLE', 'SLIGHT_DOWN', 'DOWN'];

  return {
    id: `p_${apiPlayer.idPlayer}`,
    name: apiPlayer.strPlayer,
    nationality: apiPlayer.strNationality || 'Unknown',
    age,
    positionMain: position,
    positionAlt: null,
    skillBase: skill,
    potential,
    form: 65 + Math.floor(Math.random() * 20),
    conditionArrow: formOptions[Math.floor(Math.random() * formOptions.length)],
    clubId: teamId,
    wage: Math.round(skill * skill * 20 + Math.random() * 10000),
    contractEnd: `202${6 + Math.floor(Math.random() * 3)}-06-30`,
    marketValue: calculateMarketValue(skill, potential, age),
    transferStatus: Math.random() < 0.1 ? 'LISTED' : 'UNAVAILABLE',
    isIdol: Math.random() < 0.05,
    currentSeasonStats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, avgRating: 6.5 },
    careerStats: {
      appearances: Math.floor(Math.random() * 200),
      goals: position === 'FWD' ? Math.floor(Math.random() * 80) : position === 'MID' ? Math.floor(Math.random() * 40) : Math.floor(Math.random() * 15),
      assists: Math.floor(Math.random() * 50),
      trophies: Math.floor(Math.random() * 5),
    },
  };
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  TheSportsDB Fetcher (with rate limit handling)');
  console.log('═'.repeat(60));

  const progress = loadProgress();
  console.log(`\n📊 Progress: ${progress.leagues_fetched.length}/${LEAGUES.length} leagues fetched\n`);

  // Load or create database
  let database: any;
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      database = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`📂 Loaded: ${database.clubs.length} clubs, ${database.players.length} players\n`);
    } else {
      throw new Error('No existing database');
    }
  } catch {
    database = {
      meta: { version: '2.0.0', lastUpdated: new Date().toISOString(), season: '2024-2025', source: 'TheSportsDB' },
      players: [], clubs: [], managers: [], competitions: [], nationalities: [],
    };
  }

  for (const leagueInfo of LEAGUES) {
    const leagueId = `l_${leagueInfo.shortName.toLowerCase()}`;

    if (progress.leagues_fetched.includes(leagueInfo.name)) {
      console.log(`✓ ${leagueInfo.name} already fetched, skipping...`);
      continue;
    }

    console.log(`\n🏆 Fetching ${leagueInfo.name}...`);
    const teams = await searchTeamsByLeague(leagueInfo.name);

    if (!teams || teams.length === 0) {
      console.log(`  ⚠️  No teams found (may retry later)`);
      continue;
    }

    console.log(`  ✓ Found ${teams.length} teams`);
    const teamIds: string[] = [];

    for (const apiTeam of teams) {
      const teamId = `t_${apiTeam.idTeam}`;

      if (progress.teams_fetched.includes(teamId)) {
        console.log(`  ✓ ${apiTeam.strTeam} already fetched`);
        teamIds.push(teamId);
        continue;
      }

      // Add team
      if (!database.clubs.find((c: any) => c.id === teamId)) {
        database.clubs.push(transformTeam(apiTeam, leagueInfo, leagueId));
      }
      teamIds.push(teamId);

      // Fetch players
      console.log(`  📋 ${apiTeam.strTeam}...`);
      const players = await getPlayersForTeam(apiTeam.idTeam);

      if (players && players.length > 0) {
        for (const p of players) {
          if (!database.players.find((x: any) => x.id === `p_${p.idPlayer}`)) {
            database.players.push(transformPlayer(p, teamId, leagueInfo.tier));
          }
        }
        console.log(`     ✓ ${players.length} players`);
      }

      progress.teams_fetched.push(teamId);
      saveProgress(progress);

      // Save database after each team
      database.meta.lastUpdated = new Date().toISOString();
      const outputDir = path.dirname(OUTPUT_FILE);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));
    }

    // Add/update competition
    const existingComp = database.competitions.find((c: any) => c.id === leagueId);
    if (!existingComp) {
      database.competitions.push({
        id: leagueId,
        name: leagueInfo.name,
        shortName: leagueInfo.shortName,
        country: leagueInfo.country,
        type: 'LEAGUE',
        tier: leagueInfo.tier,
        teamIds,
        standings: teamIds.map(clubId => ({ clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] })),
      });
    }

    progress.leagues_fetched.push(leagueInfo.name);
    saveProgress(progress);
    console.log(`  💾 Saved: ${database.clubs.length} clubs, ${database.players.length} players`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  DONE!');
  console.log('═'.repeat(60));
  console.log(`  📊 Clubs: ${database.clubs.length}`);
  console.log(`  👤 Players: ${database.players.length}`);
  console.log(`  🏆 Competitions: ${database.competitions.length}`);
  console.log('═'.repeat(60));

  const remaining = LEAGUES.filter(l => !progress.leagues_fetched.includes(l.name));
  if (remaining.length > 0) {
    console.log(`\n⏳ ${remaining.length} leagues remaining. Run again to continue.`);
  }
}

main().catch(console.error);
