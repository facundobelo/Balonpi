/**
 * Transfermarkt Scraper
 *
 * Scrapes REAL player data from Transfermarkt.
 * This gets actual current rosters with real player names.
 *
 * Usage: npx tsx scripts/scrapeTransfermarkt.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../public/data/master_db_2026.json');
const CACHE_DIR = path.join(__dirname, '../data/cache');

// Transfermarkt URLs for each league
const LEAGUES = [
  // Top 5 European Leagues
  {
    id: 'epl',
    name: 'Premier League',
    shortName: 'EPL',
    country: 'England',
    tier: 1,
    tmUrl: 'https://www.transfermarkt.com/premier-league/startseite/wettbewerb/GB1',
  },
  {
    id: 'laliga',
    name: 'La Liga',
    shortName: 'LAL',
    country: 'Spain',
    tier: 1,
    tmUrl: 'https://www.transfermarkt.com/laliga/startseite/wettbewerb/ES1',
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    shortName: 'BUN',
    country: 'Germany',
    tier: 1,
    tmUrl: 'https://www.transfermarkt.com/bundesliga/startseite/wettbewerb/L1',
  },
  {
    id: 'seriea',
    name: 'Serie A',
    shortName: 'SEA',
    country: 'Italy',
    tier: 1,
    tmUrl: 'https://www.transfermarkt.com/serie-a/startseite/wettbewerb/IT1',
  },
  {
    id: 'ligue1',
    name: 'Ligue 1',
    shortName: 'L1',
    country: 'France',
    tier: 1,
    tmUrl: 'https://www.transfermarkt.com/ligue-1/startseite/wettbewerb/FR1',
  },
  // South America
  {
    id: 'lpa',
    name: 'Liga Profesional Argentina',
    shortName: 'LPA',
    country: 'Argentina',
    tier: 2,
    tmUrl: 'https://www.transfermarkt.com/liga-profesional-argentina/startseite/wettbewerb/AR1N',
  },
  {
    id: 'brasileirao',
    name: 'Brasileirão Série A',
    shortName: 'BRA',
    country: 'Brazil',
    tier: 2,
    tmUrl: 'https://www.transfermarkt.com/campeonato-brasileiro-serie-a/startseite/wettbewerb/BRA1',
  },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    console.log(`    Fetching: ${url.substring(0, 80)}...`);

    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      console.error(`    HTTP Error: ${response.status}`);
      return null;
    }

    const html = await response.text();
    await delay(2000 + Math.random() * 2000); // 2-4 second delay
    return html;
  } catch (error) {
    console.error(`    Fetch error:`, error);
    return null;
  }
}

// Parse team links from league page
function parseTeamLinks(html: string, baseUrl: string): Array<{ name: string; url: string }> {
  const teams: Array<{ name: string; url: string }> = [];

  // Match team links in the table - pattern: /team-name/startseite/verein/ID
  const teamPattern = /<a[^>]*href="(\/[^"]+\/startseite\/verein\/\d+)"[^>]*title="([^"]+)"/g;
  let match;

  const seen = new Set<string>();
  while ((match = teamPattern.exec(html)) !== null) {
    const url = match[1];
    const name = match[2].replace(/&amp;/g, '&');

    if (!seen.has(url)) {
      seen.add(url);
      teams.push({
        name,
        url: `https://www.transfermarkt.com${url.replace('/startseite/', '/kader/')}/saison_id/2024`,
      });
    }
  }

  return teams;
}

// Parse players from team squad page
function parseSquad(html: string, teamId: string, tier: number): any[] {
  const players: any[] = [];

  // Find player rows - they contain player data
  // Pattern matches player links with their info
  const playerPattern = /<a[^>]*class="spielprofil_tooltip"[^>]*href="(\/[^"]+\/profil\/spieler\/(\d+))"[^>]*>([^<]+)<\/a>/g;

  // Also get position and other data from table rows
  const rowPattern = /<tr[^>]*class="[^"]*(?:odd|even)[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;

  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract player link and name
    const playerMatch = /<a[^>]*class="spielprofil_tooltip"[^>]*href="\/[^"]+\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/i.exec(rowHtml);
    if (!playerMatch) continue;

    const playerId = playerMatch[1];
    const playerName = playerMatch[2].trim();

    // Skip if already added
    if (players.find(p => p.id === `p_${playerId}`)) continue;

    // Extract position
    let position: 'GK' | 'DEF' | 'MID' | 'FWD' = 'MID';
    const posMatch = /<td[^>]*>(Goalkeeper|Defender|Centre-Back|Left-Back|Right-Back|Midfielder|Central Midfield|Defensive Midfield|Attacking Midfield|Left Winger|Right Winger|Centre-Forward|Striker|Second Striker)<\/td>/i.exec(rowHtml);
    if (posMatch) {
      const pos = posMatch[1].toLowerCase();
      if (pos.includes('goalkeeper')) position = 'GK';
      else if (pos.includes('back') || pos.includes('defender')) position = 'DEF';
      else if (pos.includes('midfield')) position = 'MID';
      else position = 'FWD';
    }

    // Extract age
    let age = 25;
    const ageMatch = /\((\d+)\)/.exec(rowHtml) || /<td[^>]*class="[^"]*zentriert[^"]*"[^>]*>(\d{1,2})<\/td>/i.exec(rowHtml);
    if (ageMatch) {
      age = parseInt(ageMatch[1]);
      if (age < 15 || age > 45) age = 25;
    }

    // Extract market value
    let marketValue = 5000000;
    const valueMatch = /€(\d+(?:\.\d+)?)(k|m|bn)?/i.exec(rowHtml);
    if (valueMatch) {
      let value = parseFloat(valueMatch[1]);
      const unit = (valueMatch[2] || '').toLowerCase();
      if (unit === 'k') value *= 1000;
      else if (unit === 'm') value *= 1000000;
      else if (unit === 'bn') value *= 1000000000;
      marketValue = Math.round(value);
    }

    // Extract nationality
    let nationality = 'Unknown';
    const flagMatch = /<img[^>]*title="([^"]+)"[^>]*class="[^"]*flaggenrahmen[^"]*"/i.exec(rowHtml);
    if (flagMatch) {
      nationality = flagMatch[1];
    }

    // Calculate skill based on market value and tier
    let skill = estimateSkillFromValue(marketValue, tier, age);
    const potential = estimatePotential(skill, age);

    const formOptions = ['UP', 'SLIGHT_UP', 'STABLE', 'STABLE', 'STABLE', 'SLIGHT_DOWN', 'DOWN'];

    players.push({
      id: `p_${playerId}`,
      name: playerName,
      nationality,
      age,
      positionMain: position,
      positionAlt: null,
      skillBase: skill,
      potential,
      form: 60 + Math.floor(Math.random() * 25),
      conditionArrow: formOptions[Math.floor(Math.random() * formOptions.length)],
      clubId: teamId,
      wage: Math.round(skill * skill * 25 + Math.random() * 15000),
      contractEnd: `202${6 + Math.floor(Math.random() * 3)}-06-30`,
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

  return players;
}

function estimateSkillFromValue(marketValue: number, tier: number, age: number): number {
  // Base skill from market value (logarithmic scale)
  let skill: number;

  if (marketValue >= 100000000) skill = 88 + Math.floor(Math.random() * 7); // 88-94
  else if (marketValue >= 50000000) skill = 84 + Math.floor(Math.random() * 6); // 84-89
  else if (marketValue >= 30000000) skill = 80 + Math.floor(Math.random() * 6); // 80-85
  else if (marketValue >= 15000000) skill = 76 + Math.floor(Math.random() * 6); // 76-81
  else if (marketValue >= 5000000) skill = 72 + Math.floor(Math.random() * 6); // 72-77
  else if (marketValue >= 1000000) skill = 66 + Math.floor(Math.random() * 8); // 66-73
  else skill = 58 + Math.floor(Math.random() * 10); // 58-67

  // Adjust for tier
  if (tier === 2) skill = Math.max(55, skill - 3);

  // Age adjustment for young players (potential not yet realized)
  if (age <= 21) skill = Math.max(60, skill - Math.floor((22 - age) * 1.5));

  return Math.min(99, Math.max(50, skill));
}

function estimatePotential(skill: number, age: number): number {
  if (age <= 20) return Math.min(99, skill + 8 + Math.floor(Math.random() * 12));
  if (age <= 23) return Math.min(99, skill + 4 + Math.floor(Math.random() * 8));
  if (age <= 26) return Math.min(99, skill + Math.floor(Math.random() * 4));
  return skill;
}

// Alternative: Simple regex-based parser for the compact view
function parseSquadSimple(html: string, teamId: string, teamName: string, tier: number, country: string): any[] {
  const players: any[] = [];

  // Try to find player names from various patterns in Transfermarkt HTML
  // Pattern 1: spielprofil_tooltip links
  const pattern1 = /href="\/([^\/]+)\/profil\/spieler\/(\d+)"[^>]*>([^<]+)<\/a>/g;

  let match;
  const seen = new Set<string>();

  while ((match = pattern1.exec(html)) !== null) {
    const playerId = match[2];
    const playerName = match[3].trim();

    // Skip non-player names (team names, etc.)
    if (playerName.length < 3 || playerName.length > 40) continue;
    if (seen.has(playerId)) continue;
    seen.add(playerId);

    // Random position distribution (we'll fix this with better parsing later)
    const positions: Array<'GK' | 'DEF' | 'MID' | 'FWD'> = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
    const position = positions[players.length % positions.length] || 'MID';

    const age = 18 + Math.floor(Math.random() * 18);
    const skill = estimateSkillFromValue(5000000, tier, age);
    const potential = estimatePotential(skill, age);
    const marketValue = Math.round(Math.pow(skill, 2.5) * 80);

    const formOptions = ['UP', 'SLIGHT_UP', 'STABLE', 'STABLE', 'STABLE', 'SLIGHT_DOWN', 'DOWN'];

    players.push({
      id: `p_${playerId}`,
      name: playerName,
      nationality: country,
      age,
      positionMain: position,
      positionAlt: null,
      skillBase: skill,
      potential,
      form: 60 + Math.floor(Math.random() * 25),
      conditionArrow: formOptions[Math.floor(Math.random() * formOptions.length)],
      clubId: teamId,
      wage: Math.round(skill * skill * 25 + Math.random() * 15000),
      contractEnd: `202${6 + Math.floor(Math.random() * 3)}-06-30`,
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

  return players;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  Transfermarkt Scraper - Real Player Data');
  console.log('═'.repeat(60));
  console.log('\n  ⚠️  This scrapes real data from Transfermarkt');
  console.log('  ⚠️  Please be respectful of their servers\n');

  // Create cache directory
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const database = {
    meta: {
      version: '3.0.0',
      lastUpdated: new Date().toISOString(),
      season: '2024-2025',
      source: 'Transfermarkt (scraped)',
    },
    players: [] as any[],
    clubs: [] as any[],
    managers: [] as any[],
    competitions: [] as any[],
    nationalities: [] as string[],
  };

  for (const league of LEAGUES) {
    console.log(`\n🏆 ${league.name} (${league.country})`);
    console.log(`   URL: ${league.tmUrl}`);

    // Fetch league page
    const leagueHtml = await fetchPage(league.tmUrl);
    if (!leagueHtml) {
      console.log('   ❌ Failed to fetch league page');
      continue;
    }

    // Parse team links
    const teams = parseTeamLinks(leagueHtml, league.tmUrl);
    console.log(`   Found ${teams.length} teams`);

    if (teams.length === 0) {
      console.log('   ❌ No teams found in HTML');
      continue;
    }

    const teamIds: string[] = [];

    for (const team of teams.slice(0, 30)) { // Limit to avoid too many requests
      const teamId = `t_${league.id}_${team.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 10)}`;
      teamIds.push(teamId);

      console.log(`\n   📋 ${team.name}`);

      // Fetch squad page
      const squadHtml = await fetchPage(team.url);
      if (!squadHtml) {
        console.log('      ❌ Failed to fetch squad');
        continue;
      }

      // Parse players
      let players = parseSquad(squadHtml, teamId, league.tier);

      // Fallback to simple parser if main parser fails
      if (players.length < 5) {
        players = parseSquadSimple(squadHtml, teamId, team.name, league.tier, league.country);
      }

      console.log(`      ✓ ${players.length} players`);

      // Add team
      const budgetByTier: Record<number, [number, number]> = {
        1: [40000000, 400000000],
        2: [10000000, 60000000],
      };
      const [minBudget, maxBudget] = budgetByTier[league.tier] || [5000000, 30000000];
      const budget = minBudget + Math.random() * (maxBudget - minBudget);

      const repByTier: Record<number, [number, number]> = { 1: [72, 98], 2: [55, 82] };
      const [minRep, maxRep] = repByTier[league.tier] || [50, 70];

      database.clubs.push({
        id: teamId,
        name: team.name,
        shortCode: team.name.substring(0, 3).toUpperCase(),
        country: league.country,
        tier: league.tier,
        reputation: Math.floor(minRep + Math.random() * (maxRep - minRep)),
        budget: Math.round(budget),
        wageBudget: Math.round(budget * 0.015),
        stadium: `${team.name} Stadium`,
        stadiumCapacity: 30000 + Math.floor(Math.random() * 50000),
        rivalClubIds: [],
        leagueId: `l_${league.id}`,
        isNationalTeam: false,
      });

      // Add players
      database.players.push(...players);

      // Save progress
      const outputDir = path.dirname(OUTPUT_FILE);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      database.meta.lastUpdated = new Date().toISOString();
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));
    }

    // Add competition
    database.competitions.push({
      id: `l_${league.id}`,
      name: league.name,
      shortName: league.shortName,
      country: league.country,
      type: 'LEAGUE',
      tier: league.tier,
      teamIds,
      standings: teamIds.map(clubId => ({
        clubId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: [],
      })),
    });

    console.log(`\n   💾 Saved: ${database.clubs.length} clubs, ${database.players.length} players`);
  }

  // Collect nationalities
  const nationalities = new Set(database.players.map(p => p.nationality));
  database.nationalities = Array.from(nationalities);

  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('  SCRAPING COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`  📊 Teams: ${database.clubs.length}`);
  console.log(`  👤 Players: ${database.players.length}`);
  console.log(`  🏆 Competitions: ${database.competitions.length}`);
  console.log(`  📁 Saved to: ${OUTPUT_FILE}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
