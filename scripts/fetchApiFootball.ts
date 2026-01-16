/**
 * API-Football Data Fetcher
 *
 * Fetches real football data from API-Football (RapidAPI)
 * and transforms it to the game's schema.
 *
 * Usage:
 *   1. Get free API key from: https://rapidapi.com/api-sports/api/api-football
 *   2. Set environment variable: export RAPIDAPI_KEY="your-key-here"
 *   3. Run: npx tsx scripts/fetchApiFootball.ts
 *
 * Free tier: 100 requests/day
 * The script saves progress and can be resumed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.RAPIDAPI_KEY;
const API_HOST = 'api-football-v1.p.rapidapi.com';
const BASE_URL = `https://${API_HOST}/v3`;

// Progress file to track what we've fetched
const PROGRESS_FILE = path.join(__dirname, '../data/fetch_progress.json');
const OUTPUT_FILE = path.join(__dirname, '../public/data/master_db_2026.json');

// Current season
const SEASON = 2024; // API uses calendar year for season start

// League IDs from API-Football with metadata
const LEAGUES: Record<string, { id: number; country: string; tier: number; division: number }> = {
  // Argentina
  'argentina_primera': { id: 128, country: 'Argentina', tier: 2, division: 1 },
  'argentina_nacional': { id: 129, country: 'Argentina', tier: 3, division: 2 },

  // Brazil
  'brazil_serie_a': { id: 71, country: 'Brazil', tier: 2, division: 1 },
  'brazil_serie_b': { id: 72, country: 'Brazil', tier: 3, division: 2 },

  // England
  'england_premier': { id: 39, country: 'England', tier: 1, division: 1 },
  'england_championship': { id: 40, country: 'England', tier: 2, division: 2 },

  // Spain
  'spain_laliga': { id: 140, country: 'Spain', tier: 1, division: 1 },
  'spain_segunda': { id: 141, country: 'Spain', tier: 2, division: 2 },

  // Germany
  'germany_bundesliga': { id: 78, country: 'Germany', tier: 1, division: 1 },
  'germany_2bundesliga': { id: 79, country: 'Germany', tier: 2, division: 2 },

  // Italy
  'italy_serie_a': { id: 135, country: 'Italy', tier: 1, division: 1 },
  'italy_serie_b': { id: 136, country: 'Italy', tier: 2, division: 2 },

  // France
  'france_ligue1': { id: 61, country: 'France', tier: 1, division: 1 },
  'france_ligue2': { id: 62, country: 'France', tier: 2, division: 2 },
};

// Position mapping from API to our schema
const POSITION_MAP: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  'Goalkeeper': 'GK',
  'Defender': 'DEF',
  'Midfielder': 'MID',
  'Attacker': 'FWD',
};

interface Progress {
  leagues_fetched: number[];
  teams_fetched: number[];
  squads_fetched: number[];
  player_stats_fetched: number[];
  coaches_fetched: number[];
  last_updated: string;
  requests_today: number;
  last_request_date: string;
}

interface ApiResponse<T> {
  response: T;
  errors: any;
  results: number;
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('Starting fresh progress...');
  }
  return {
    leagues_fetched: [],
    teams_fetched: [],
    squads_fetched: [],
    player_stats_fetched: [],
    coaches_fetched: [],
    last_updated: new Date().toISOString(),
    requests_today: 0,
    last_request_date: new Date().toISOString().split('T')[0],
  };
}

function saveProgress(progress: Progress) {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function apiRequest<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!API_KEY) {
    console.error('ERROR: RAPIDAPI_KEY environment variable not set');
    console.error('Get your free key at: https://rapidapi.com/api-sports/api/api-football');
    process.exit(1);
  }

  const progress = loadProgress();
  const today = new Date().toISOString().split('T')[0];

  // Reset counter if new day
  if (progress.last_request_date !== today) {
    progress.requests_today = 0;
    progress.last_request_date = today;
  }

  // Check rate limit
  if (progress.requests_today >= 95) { // Leave some buffer
    console.log('\n⚠️  Daily request limit reached (100). Try again tomorrow.');
    console.log(`Progress saved. ${progress.squads_fetched.length} squads fetched so far.`);
    saveProgress(progress);
    process.exit(0);
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  console.log(`[${progress.requests_today + 1}/100] GET ${endpoint}?${url.searchParams.toString()}`);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': API_HOST,
      },
    });

    progress.requests_today++;
    saveProgress(progress);

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as ApiResponse<T>;

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error('API Errors:', data.errors);
      return null;
    }

    // Rate limiting - wait 1.2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 1200));

    return data.response;
  } catch (error) {
    console.error('Request failed:', error);
    return null;
  }
}

interface ApiTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    founded: number | null;
    national: boolean;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
  } | null;
}

interface ApiPlayer {
  id: number;
  name: string;
  age: number;
  number: number | null;
  position: string;
  photo: string;
}

interface ApiSquad {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  players: ApiPlayer[];
}

interface ApiCoach {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  birth: {
    date: string;
    place: string;
    country: string;
  };
  nationality: string;
  photo: string;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  career: Array<{
    team: { id: number; name: string };
    start: string;
    end: string | null;
  }>;
}

// Estimate skill based on team tier and player position
function estimateSkill(teamTier: number, position: string, age: number): number {
  // Base skill ranges by tier
  const tierRanges: Record<number, [number, number]> = {
    1: [72, 92], // Top 5 leagues first division
    2: [68, 85], // Top 5 leagues second division + Argentina/Brazil first
    3: [62, 78], // Second divisions of smaller leagues
    4: [55, 72], // Lower leagues
  };

  const [min, max] = tierRanges[teamTier] || [60, 75];

  // Random within range with slight bias toward middle
  let skill = min + Math.floor(Math.random() * (max - min));

  // Age adjustment - peak at 27-30
  if (age < 22) {
    skill = Math.max(min, skill - Math.floor((22 - age) * 1.5));
  } else if (age > 32) {
    skill = Math.max(min, skill - Math.floor((age - 32) * 2));
  }

  return Math.min(99, Math.max(40, skill));
}

// Estimate potential based on age and skill
function estimatePotential(skill: number, age: number): number {
  if (age <= 21) {
    // Young players have high potential
    return Math.min(99, skill + 5 + Math.floor(Math.random() * 15));
  } else if (age <= 25) {
    return Math.min(99, skill + Math.floor(Math.random() * 8));
  } else if (age <= 29) {
    return Math.min(99, skill + Math.floor(Math.random() * 3));
  } else {
    // Older players - potential is close to current
    return skill;
  }
}

// Calculate market value based on skill, potential, and age
function calculateMarketValue(skill: number, potential: number, age: number): number {
  const baseValue = Math.pow(skill, 2.5) * 100;

  // Young players with high potential are worth more
  let multiplier = 1;
  if (age <= 23 && potential >= 85) {
    multiplier = 2.5;
  } else if (age <= 25 && potential >= 80) {
    multiplier = 1.8;
  } else if (age >= 32) {
    multiplier = 0.5;
  } else if (age >= 30) {
    multiplier = 0.7;
  }

  return Math.round(baseValue * multiplier);
}

// Transform API player to our schema
function transformPlayer(
  apiPlayer: ApiPlayer,
  teamId: string,
  teamTier: number,
  nationality: string = ''
): any {
  const position = POSITION_MAP[apiPlayer.position] || 'MID';
  const age = apiPlayer.age || 25;

  const skill = estimateSkill(teamTier, position, age);
  const potential = estimatePotential(skill, age);
  const marketValue = calculateMarketValue(skill, potential, age);

  // Form arrows distribution
  const formOptions = ['UP', 'SLIGHT_UP', 'STABLE', 'STABLE', 'STABLE', 'SLIGHT_DOWN', 'DOWN'];
  const conditionArrow = formOptions[Math.floor(Math.random() * formOptions.length)];

  return {
    id: `p_${apiPlayer.id}`,
    name: apiPlayer.name,
    nationality: nationality || 'Unknown',
    age: age,
    positionMain: position,
    positionAlt: null,
    skillBase: skill,
    potential: potential,
    form: 65 + Math.floor(Math.random() * 20),
    conditionArrow: conditionArrow,
    clubId: teamId,
    wage: Math.round(skill * skill * 20 + Math.random() * 10000),
    contractEnd: `202${6 + Math.floor(Math.random() * 3)}-06-30`,
    marketValue: marketValue,
    transferStatus: Math.random() < 0.1 ? 'LISTED' : 'UNAVAILABLE',
    isIdol: Math.random() < 0.05,
    currentSeasonStats: {
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      avgRating: 6.5,
    },
    careerStats: {
      appearances: Math.floor(Math.random() * 200),
      goals: position === 'FWD' ? Math.floor(Math.random() * 80) :
             position === 'MID' ? Math.floor(Math.random() * 40) :
             Math.floor(Math.random() * 15),
      assists: Math.floor(Math.random() * 50),
      trophies: Math.floor(Math.random() * 5),
    },
  };
}

// Transform API team to our schema
function transformTeam(
  apiTeam: ApiTeam,
  leagueKey: string,
  leagueMeta: { id: number; country: string; tier: number; division: number }
): any {
  const team = apiTeam.team;

  // Budget based on tier
  const budgetByTier: Record<number, [number, number]> = {
    1: [50000000, 500000000],
    2: [20000000, 100000000],
    3: [5000000, 40000000],
    4: [1000000, 15000000],
  };
  const [minBudget, maxBudget] = budgetByTier[leagueMeta.tier] || [5000000, 30000000];
  const budget = minBudget + Math.random() * (maxBudget - minBudget);

  // Reputation based on tier
  const repByTier: Record<number, [number, number]> = {
    1: [75, 99],
    2: [60, 85],
    3: [45, 70],
    4: [30, 55],
  };
  const [minRep, maxRep] = repByTier[leagueMeta.tier] || [50, 70];
  const reputation = Math.floor(minRep + Math.random() * (maxRep - minRep));

  return {
    id: `t_${team.id}`,
    name: team.name,
    shortCode: team.code || team.name.substring(0, 3).toUpperCase(),
    country: leagueMeta.country,
    tier: leagueMeta.tier,
    reputation: reputation,
    budget: Math.round(budget),
    wageBudget: Math.round(budget * 0.02), // 2% of budget for wages
    stadium: apiTeam.venue?.name || `${team.name} Stadium`,
    stadiumCapacity: apiTeam.venue?.capacity || 25000 + Math.floor(Math.random() * 40000),
    rivalClubIds: [],
    leagueId: `l_${leagueMeta.id}`,
    isNationalTeam: team.national,
    logo: team.logo,
  };
}

// Transform coach to manager
function transformCoach(apiCoach: ApiCoach, teamId: string): any {
  return {
    id: `m_${apiCoach.id}`,
    name: apiCoach.name,
    nationality: apiCoach.nationality || 'Unknown',
    age: apiCoach.age || 50,
    clubId: teamId,
    reputation: 50 + Math.floor(Math.random() * 40),
    tacticalStyle: ['DEFENSIVE', 'BALANCED', 'ATTACKING'][Math.floor(Math.random() * 3)],
    preferredFormation: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'][Math.floor(Math.random() * 4)],
  };
}

// Create competition from league info
function createCompetition(leagueKey: string, leagueMeta: { id: number; country: string; tier: number; division: number }, teamIds: string[]): any {
  const nameMap: Record<string, string> = {
    'argentina_primera': 'Liga Profesional Argentina',
    'argentina_nacional': 'Primera Nacional',
    'brazil_serie_a': 'Brasileirão Série A',
    'brazil_serie_b': 'Brasileirão Série B',
    'england_premier': 'Premier League',
    'england_championship': 'EFL Championship',
    'spain_laliga': 'La Liga',
    'spain_segunda': 'La Liga 2',
    'germany_bundesliga': 'Bundesliga',
    'germany_2bundesliga': '2. Bundesliga',
    'italy_serie_a': 'Serie A',
    'italy_serie_b': 'Serie B',
    'france_ligue1': 'Ligue 1',
    'france_ligue2': 'Ligue 2',
  };

  const shortNameMap: Record<string, string> = {
    'argentina_primera': 'LPA',
    'argentina_nacional': 'NAC',
    'brazil_serie_a': 'BRA',
    'brazil_serie_b': 'BRB',
    'england_premier': 'EPL',
    'england_championship': 'EFL',
    'spain_laliga': 'LAL',
    'spain_segunda': 'LA2',
    'germany_bundesliga': 'BUN',
    'germany_2bundesliga': '2BL',
    'italy_serie_a': 'SEA',
    'italy_serie_b': 'SEB',
    'france_ligue1': 'L1',
    'france_ligue2': 'L2',
  };

  // Create initial standings
  const standings = teamIds.map(clubId => ({
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    form: [] as string[],
  }));

  return {
    id: `l_${leagueMeta.id}`,
    name: nameMap[leagueKey] || leagueKey,
    shortName: shortNameMap[leagueKey] || leagueKey.substring(0, 3).toUpperCase(),
    country: leagueMeta.country,
    type: 'LEAGUE',
    tier: leagueMeta.division,
    teamIds: teamIds,
    standings: standings,
  };
}

async function fetchTeamsForLeague(leagueKey: string, leagueMeta: { id: number; country: string; tier: number; division: number }): Promise<any[]> {
  const progress = loadProgress();

  if (progress.leagues_fetched.includes(leagueMeta.id)) {
    console.log(`League ${leagueKey} already fetched, skipping...`);
    return [];
  }

  const teams = await apiRequest<ApiTeam[]>('teams', {
    league: leagueMeta.id,
    season: SEASON,
  });

  if (!teams) {
    console.log(`Failed to fetch teams for ${leagueKey}`);
    return [];
  }

  console.log(`✓ Found ${teams.length} teams in ${leagueKey}`);

  progress.leagues_fetched.push(leagueMeta.id);
  saveProgress(progress);

  return teams.map(t => transformTeam(t, leagueKey, leagueMeta));
}

async function fetchSquadForTeam(teamId: number, teamTier: number): Promise<any[]> {
  const progress = loadProgress();

  if (progress.squads_fetched.includes(teamId)) {
    console.log(`Squad for team ${teamId} already fetched, skipping...`);
    return [];
  }

  const squads = await apiRequest<ApiSquad[]>('players/squads', {
    team: teamId,
  });

  if (!squads || squads.length === 0) {
    console.log(`No squad found for team ${teamId}`);
    progress.squads_fetched.push(teamId); // Mark as fetched to avoid retrying
    saveProgress(progress);
    return [];
  }

  const squad = squads[0];
  console.log(`✓ Found ${squad.players.length} players for ${squad.team.name}`);

  progress.squads_fetched.push(teamId);
  saveProgress(progress);

  return squad.players.map((p) => transformPlayer(p, `t_${teamId}`, teamTier));
}

async function fetchCoachForTeam(teamId: number): Promise<any | null> {
  const progress = loadProgress();

  if (progress.coaches_fetched.includes(teamId)) {
    return null;
  }

  const coaches = await apiRequest<ApiCoach[]>('coachs', {
    team: teamId,
  });

  if (!coaches || coaches.length === 0) {
    progress.coaches_fetched.push(teamId);
    saveProgress(progress);
    return null;
  }

  const coach = coaches[0];
  console.log(`✓ Found coach ${coach.name} for team ${teamId}`);

  progress.coaches_fetched.push(teamId);
  saveProgress(progress);

  return transformCoach(coach, `t_${teamId}`);
}

// Main execution
async function main() {
  console.log('═'.repeat(60));
  console.log('  API-Football Data Fetcher for Cyberfoot 2026');
  console.log('═'.repeat(60));

  if (!API_KEY) {
    console.log('\n❌ ERROR: No API key found!\n');
    console.log('Steps to get started:');
    console.log('  1. Go to: https://rapidapi.com/api-sports/api/api-football');
    console.log('  2. Sign up for free (100 requests/day)');
    console.log('  3. Copy your API key');
    console.log('  4. Run: export RAPIDAPI_KEY="your-key-here"');
    console.log('  5. Run this script again: npx tsx scripts/fetchApiFootball.ts');
    return;
  }

  const progress = loadProgress();
  console.log(`\n📊 Progress: ${progress.squads_fetched.length} squads fetched`);
  console.log(`📊 Requests today: ${progress.requests_today}/100\n`);

  // Database structure
  let database: any = {
    meta: {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      season: '2024-2025',
      source: 'API-Football',
    },
    players: [],
    clubs: [],
    managers: [],
    competitions: [],
    nationalities: [],
  };

  // Try to load existing database
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      database = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`📂 Loaded existing database: ${database.clubs.length} clubs, ${database.players.length} players\n`);
    }
  } catch (e) {
    console.log('Starting with fresh database...\n');
  }

  // Fetch leagues in priority order (top leagues first)
  const leagueOrder = [
    'england_premier',
    'spain_laliga',
    'germany_bundesliga',
    'italy_serie_a',
    'france_ligue1',
    'argentina_primera',
    'brazil_serie_a',
    'england_championship',
    'spain_segunda',
    'germany_2bundesliga',
    'italy_serie_b',
    'france_ligue2',
    'argentina_nacional',
    'brazil_serie_b',
  ];

  // Fetch teams for each league
  for (const leagueKey of leagueOrder) {
    const leagueMeta = LEAGUES[leagueKey];
    if (!leagueMeta) continue;

    if (!progress.leagues_fetched.includes(leagueMeta.id)) {
      console.log(`\n🏆 Fetching ${leagueKey}...`);
      const teams = await fetchTeamsForLeague(leagueKey, leagueMeta);

      const teamIds: string[] = [];
      for (const team of teams) {
        if (!database.clubs.find((c: any) => c.id === team.id)) {
          database.clubs.push(team);
          teamIds.push(team.id);
        }
      }

      // Create competition entry
      if (teamIds.length > 0) {
        const existingComp = database.competitions.find((c: any) => c.id === `l_${leagueMeta.id}`);
        if (!existingComp) {
          database.competitions.push(createCompetition(leagueKey, leagueMeta, teamIds));
        }
      }

      // Save after each league
      database.meta.lastUpdated = new Date().toISOString();
      const outputDir = path.dirname(OUTPUT_FILE);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));
      console.log(`💾 Saved: ${database.clubs.length} clubs total\n`);
    }
  }

  // Fetch squads for teams we have
  const teamsToFetchSquads = database.clubs
    .filter((c: any) => !c.isNationalTeam)
    .map((c: any) => ({
      id: parseInt(c.id.replace('t_', '')),
      tier: c.tier,
    }))
    .filter((t: { id: number }) => !progress.squads_fetched.includes(t.id));

  if (teamsToFetchSquads.length > 0) {
    console.log(`\n⚽ Need to fetch ${teamsToFetchSquads.length} squads...`);

    for (const team of teamsToFetchSquads) {
      const players = await fetchSquadForTeam(team.id, team.tier);

      for (const player of players) {
        if (!database.players.find((p: any) => p.id === player.id)) {
          database.players.push(player);
        }
      }

      // Save after each squad
      database.meta.lastUpdated = new Date().toISOString();
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));
    }
  }

  // Update competition team IDs based on fetched clubs
  for (const comp of database.competitions) {
    const leagueId = parseInt(comp.id.replace('l_', ''));
    const teamsInLeague = database.clubs.filter((c: any) => c.leagueId === comp.id);
    comp.teamIds = teamsInLeague.map((c: any) => c.id);

    // Update standings if needed
    if (comp.standings.length !== comp.teamIds.length) {
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
  }

  // Final save
  database.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('  FETCH COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  📊 Clubs: ${database.clubs.length}`);
  console.log(`  👤 Players: ${database.players.length}`);
  console.log(`  🏆 Competitions: ${database.competitions.length}`);
  console.log(`  📡 Requests used today: ${progress.requests_today}/100`);
  console.log('═'.repeat(60));

  const remainingSquads = database.clubs.filter((c: any) =>
    !c.isNationalTeam && !progress.squads_fetched.includes(parseInt(c.id.replace('t_', '')))
  ).length;

  if (remainingSquads > 0) {
    console.log(`\n⏳ ${remainingSquads} squads remaining. Run again tomorrow to continue.`);
    console.log(`   Estimated days to complete: ${Math.ceil(remainingSquads / 90)}`);
  } else {
    console.log('\n✅ All data fetched successfully!');
  }
}

main().catch(console.error);
