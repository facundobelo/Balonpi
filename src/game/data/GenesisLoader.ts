/**
 * GenesisLoader - Initial data loading and world generation
 *
 * Responsible for:
 * - Loading master database from JSON
 * - Validating and transforming data to match game types
 * - Generating missing data (managers, fixtures)
 * - Creating initial game state for new careers
 */

import type {
  MasterDatabaseSchema,
  IPlayer,
  IClub,
  IManager,
  ICompetition,
  StandingsEntry,
  ConditionArrow,
  TransferStatus,
  Position,
} from '../types';
import { CLUB_RIVALRIES, areRivals } from './rivalries';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GenesisConfig {
  masterDbUrl: string;
  generateFixtures: boolean;
  startDate: string;
  season: string;
}

export interface GenesisResult {
  success: boolean;
  data: MasterDatabaseSchema | null;
  fixtures: SeasonFixtures | null;
  errors: string[];
  warnings: string[];
}

export interface Fixture {
  id: string;
  competitionId: string;
  round: number;
  matchday: number;
  date: string;
  homeClubId: string;
  awayClubId: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  homeScore?: number;
  awayScore?: number;
}

export interface SeasonFixtures {
  [competitionId: string]: Fixture[];
}

// -----------------------------------------------------------------------------
// DEFAULT CONFIG
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: GenesisConfig = {
  masterDbUrl: '/data/master_db_2026.json',
  generateFixtures: true,
  startDate: '2024-07-01',
  season: '2024-2025',
};

// Arrow conversion map
const ARROW_MAP: Record<string, ConditionArrow> = {
  UP: 'UP',
  SLIGHT_UP: 'SLIGHT_UP',
  MID: 'MID',
  STABLE: 'MID',
  SLIGHT_DOWN: 'SLIGHT_DOWN',
  DOWN: 'DOWN',
};

// Transfer status map
const TRANSFER_STATUS_MAP: Record<string, TransferStatus> = {
  AVAILABLE: 'AVAILABLE',
  LISTED: 'LISTED',
  UNTOUCHABLE: 'UNTOUCHABLE',
  UNAVAILABLE: 'UNTOUCHABLE',
  LOAN_LISTED: 'LOAN_LISTED',
};

// -----------------------------------------------------------------------------
// GENESIS LOADER CLASS
// -----------------------------------------------------------------------------

export class GenesisLoader {
  private config: GenesisConfig;

  constructor(config: Partial<GenesisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load and initialize the game world
   */
  async load(): Promise<GenesisResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Fetch master database
      const response = await fetch(this.config.masterDbUrl);
      if (!response.ok) {
        throw new Error(`Failed to load database: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();

      // Step 2: Validate and transform data
      const validatedData = this.validateAndTransform(rawData, warnings);
      if (!validatedData) {
        errors.push('Database validation failed');
        return { success: false, data: null, fixtures: null, errors, warnings };
      }

      // Step 3: Ensure all clubs have players
      this.ensureSquads(validatedData, warnings);

      // Step 4: Generate managers if missing
      if (!validatedData.managers || validatedData.managers.length === 0) {
        validatedData.managers = this.generateManagers(validatedData.clubs);
        warnings.push('Generated missing managers for all clubs');
      }

      // Step 4.5: Assign club rivalries from data
      this.assignClubRivalries(validatedData.clubs);

      // Step 5: Initialize standings
      this.initializeStandings(validatedData);

      // Step 6: Generate fixtures if enabled
      let fixtures: SeasonFixtures | null = null;
      if (this.config.generateFixtures) {
        fixtures = this.generateSeasonFixtures(validatedData);
      }

      return {
        success: true,
        data: validatedData,
        fixtures,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
      return { success: false, data: null, fixtures: null, errors, warnings };
    }
  }

  /**
   * Validate and transform raw JSON data to match game types
   */
  private validateAndTransform(
    raw: any,
    warnings: string[]
  ): MasterDatabaseSchema | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    // Validate required arrays
    if (!Array.isArray(raw.players)) {
      warnings.push('No players array found');
      raw.players = [];
    }
    if (!Array.isArray(raw.clubs)) {
      warnings.push('No clubs array found');
      raw.clubs = [];
    }
    if (!Array.isArray(raw.competitions)) {
      warnings.push('No competitions array found');
      raw.competitions = [];
    }

    // Transform players
    const players: IPlayer[] = raw.players.map((p: any) => this.transformPlayer(p));

    // Transform clubs
    const clubs: IClub[] = raw.clubs.map((c: any) => this.transformClub(c, raw.players));

    // Transform competitions
    const competitions: ICompetition[] = raw.competitions.map((c: any) =>
      this.transformCompetition(c)
    );

    // Transform managers (or empty array)
    const managers: IManager[] = Array.isArray(raw.managers)
      ? raw.managers.map((m: any) => this.transformManager(m))
      : [];

    return {
      meta: raw.meta || {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        season: this.config.season,
      },
      players,
      clubs,
      managers,
      competitions,
      nationalities: raw.nationalities || [],
    };
  }

  /**
   * Transform a raw player object to IPlayer
   */
  private transformPlayer(raw: any): IPlayer {
    const conditionArrow = ARROW_MAP[raw.conditionArrow] || 'MID';
    const transferStatus = TRANSFER_STATUS_MAP[raw.transferStatus] || 'AVAILABLE';

    return {
      id: raw.id,
      name: raw.name || 'Unknown Player',
      age: raw.age || 25,
      nationality: raw.nationality || 'Unknown',
      positionMain: this.validatePosition(raw.positionMain),
      positionAlt: raw.positionAlt || null,

      skillBase: Math.max(1, Math.min(99, raw.skillBase || 50)),
      potential: Math.max(1, Math.min(99, raw.potential || raw.skillBase || 50)),
      conditionArrow,

      clubId: raw.clubId || null,
      wage: raw.wage || 10000,
      contractExpiry: raw.contractEnd || raw.contractExpiry || '2026-06-30',
      transferStatus,
      marketValue: raw.marketValue || this.calculateMarketValue(raw),
      releaseClause: raw.releaseClause || this.calculateReleaseClause(raw),

      chemistryPartners: raw.chemistryPartners || [],
      isIdol: raw.isIdol || false,
      isRegen: raw.isRegen || false,
      originalPlayerId: raw.originalPlayerId,

      currentSeasonStats: raw.currentSeasonStats || {
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        matches: 0,
        yellowCards: 0,
        redCards: 0,
        avgRating: 6.5,
      },
      careerHistory: raw.careerHistory || [],
      injuredUntil: raw.injuredUntil || null,
      suspendedUntil: raw.suspendedUntil || null,
      suspensionReason: raw.suspensionReason,
      activePromise: raw.activePromise,
    };
  }

  /**
   * Transform a raw club object to IClub
   */
  private transformClub(raw: any, players: any[]): IClub {
    // Build squad from players
    const squadIds = players
      .filter((p: any) => p.clubId === raw.id)
      .map((p: any) => p.id);

    return {
      id: raw.id,
      name: raw.name || 'Unknown Club',
      shortCode: raw.shortCode || raw.name?.substring(0, 3).toUpperCase() || 'UNK',
      country: raw.country || 'Unknown',
      tier: raw.tier || 3,
      reputation: raw.reputation || 50,
      leagueId: raw.leagueId || null,
      isNationalTeam: raw.isNationalTeam || false,

      balance: raw.budget || raw.balance || 1000000,
      wageBudget: raw.wageBudget || Math.floor((raw.budget || 1000000) * 0.015),
      wageLimit: raw.wageLimit,
      sponsorIncome: raw.sponsorIncome,

      stadium: raw.stadium || `${raw.name || 'Unknown'} Stadium`,
      stadiumCapacity: raw.stadiumCapacity || 20000,

      squadIds,

      youthAcademyRating: raw.youthAcademyRating || 50,
      rivalClubIds: raw.rivalClubIds || [],
      derbyRivals: raw.derbyRivals || [],
    };
  }

  /**
   * Transform a raw competition object to ICompetition
   */
  private transformCompetition(raw: any): ICompetition {
    return {
      id: raw.id,
      name: raw.name || 'Unknown Competition',
      shortName: raw.shortName || raw.name?.substring(0, 3).toUpperCase() || 'UNK',
      type: raw.type || 'LEAGUE',
      country: raw.country || null,
      tier: raw.tier || 1,
      teamIds: raw.teamIds || [],
      standings: raw.standings || [],
      seasonRecords: raw.seasonRecords || null,
    };
  }

  /**
   * Transform a raw manager object to IManager
   */
  private transformManager(raw: any): IManager {
    return {
      id: raw.id,
      name: raw.name || 'Unknown Manager',
      nationality: raw.nationality || 'Unknown',
      age: raw.age || 45,
      reputation: raw.reputation || 50,
      status: raw.status || 'EMPLOYED',
      clubId: raw.clubId || null,
      contractExpiry: raw.contractExpiry || '2026-06-30',
      titlesWon: raw.titlesWon || 0,
      internationalTitles: raw.internationalTitles || 0,
      promotions: raw.promotions || 0,
      relegations: raw.relegations || 0,
      sackings: raw.sackings || 0,
      nemesisManagerIds: raw.nemesisManagerIds || [],
      expectedPosition: raw.expectedPosition || 10,
    };
  }

  /**
   * Validate position string
   */
  private validatePosition(pos: any): Position {
    const valid: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
    if (valid.includes(pos)) return pos;
    return 'MID';
  }

  /**
   * Calculate market value from player data
   */
  private calculateMarketValue(player: any): number {
    const skill = player.skillBase || 50;
    const age = player.age || 25;

    let baseValue = skill * 100000;

    // Age modifier
    if (age <= 23) {
      baseValue *= 1.5 + (23 - age) * 0.1;
    } else if (age >= 30) {
      baseValue *= Math.max(0.3, 1 - (age - 29) * 0.15);
    }

    return Math.round(baseValue);
  }

  /**
   * Calculate release clause from player data
   * Release clause is typically 2-5x market value, higher for better/younger players
   */
  private calculateReleaseClause(player: any): number | null {
    const skill = player.skillBase || 50;
    const age = player.age || 25;
    const marketValue = player.marketValue || this.calculateMarketValue(player);

    // Not all players have release clauses (60% chance)
    if (Math.random() > 0.6) return null;

    // Base multiplier
    let multiplier = 2.0;

    // Better players have higher clauses
    if (skill >= 85) multiplier = 4.0;
    else if (skill >= 75) multiplier = 3.0;
    else if (skill >= 65) multiplier = 2.5;

    // Young players have higher clauses
    if (age <= 23) multiplier *= 1.3;
    else if (age <= 26) multiplier *= 1.1;
    else if (age >= 32) multiplier *= 0.8;

    // Add some randomness
    multiplier *= (0.9 + Math.random() * 0.3);

    return Math.round(marketValue * multiplier);
  }

  /**
   * Assign club rivalries based on real-world data
   */
  private assignClubRivalries(clubs: IClub[]): void {
    for (const club of clubs) {
      const rivalIds: string[] = [];
      const clubNameLower = club.name.toLowerCase();

      // Check against the rivalries data
      for (const otherClub of clubs) {
        if (otherClub.id === club.id) continue;

        if (areRivals(club.name, otherClub.name)) {
          rivalIds.push(otherClub.id);
        }
      }

      club.rivalClubIds = rivalIds;
      club.derbyRivals = rivalIds; // Same as rivalClubIds for now
    }
  }

  /**
   * Ensure all clubs have minimum squad size
   */
  private ensureSquads(data: MasterDatabaseSchema, warnings: string[]): void {
    const MIN_SQUAD_SIZE = 18;
    const positions: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
    const positionDistribution = { GK: 2, DEF: 5, MID: 6, FWD: 5 };

    for (const club of data.clubs) {
      const squadPlayers = data.players.filter((p) => p.clubId === club.id);

      if (squadPlayers.length < MIN_SQUAD_SIZE) {
        const needed = MIN_SQUAD_SIZE - squadPlayers.length;
        warnings.push(`Club ${club.name} has only ${squadPlayers.length} players, generating ${needed} more`);

        for (let i = 0; i < needed; i++) {
          const position = this.getNeededPosition(squadPlayers, positionDistribution);
          const newPlayer = this.generatePlayer(club, position, data.players.length + i);
          data.players.push(newPlayer);
          squadPlayers.push(newPlayer);
          club.squadIds?.push(newPlayer.id);
        }
      }
    }
  }

  /**
   * Get the most needed position for a squad
   */
  private getNeededPosition(
    squad: IPlayer[],
    distribution: Record<Position, number>
  ): Position {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    squad.forEach((p) => counts[p.positionMain]++);

    let mostNeeded: Position = 'MID';
    let maxDeficit = -Infinity;

    for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
      const deficit = distribution[pos] - counts[pos];
      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        mostNeeded = pos;
      }
    }

    return mostNeeded;
  }

  /**
   * Generate a placeholder player for a club
   */
  private generatePlayer(club: IClub, position: Position, index: number): IPlayer {
    const skillRange = this.getSkillRangeForReputation(club.reputation);
    const skill = Math.floor(
      Math.random() * (skillRange.max - skillRange.min) + skillRange.min
    );
    const age = Math.floor(Math.random() * 15) + 18;

    return {
      id: `gen_${club.id}_${index}`,
      name: this.generateName(club.country),
      age,
      nationality: club.country,
      positionMain: position,
      positionAlt: null,
      skillBase: skill,
      potential: Math.min(99, skill + Math.floor(Math.random() * 15)),
      conditionArrow: 'MID',
      clubId: club.id,
      wage: skill * 1000,
      contractExpiry: '2027-06-30',
      transferStatus: 'AVAILABLE',
      marketValue: skill * 100000,
      releaseClause: Math.random() > 0.4 ? Math.round(skill * 100000 * 2.5) : null,
      chemistryPartners: [],
      isIdol: false,
      isRegen: false,
      currentSeasonStats: {
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        matches: 0,
        yellowCards: 0,
        redCards: 0,
        avgRating: 6.5,
      },
      careerHistory: [],
      injuredUntil: null,
      suspendedUntil: null,
    };
  }

  /**
   * Get skill range based on club reputation
   */
  private getSkillRangeForReputation(reputation: number): { min: number; max: number } {
    if (reputation >= 85) return { min: 70, max: 95 };
    if (reputation >= 70) return { min: 60, max: 85 };
    if (reputation >= 55) return { min: 50, max: 75 };
    if (reputation >= 40) return { min: 40, max: 65 };
    return { min: 30, max: 55 };
  }

  /**
   * Generate a random name (simplified)
   */
  private generateName(country: string): string {
    const firstNames = [
      'James', 'John', 'Michael', 'David', 'Luis', 'Carlos', 'Juan',
      'Marco', 'Paolo', 'Pierre', 'Thomas', 'Max', 'Lucas', 'Hugo',
    ];
    const lastNames = [
      'Smith', 'Garcia', 'Martinez', 'Rodriguez', 'Lopez', 'Muller',
      'Schmidt', 'Rossi', 'Ferrari', 'Dubois', 'Martin', 'Bernard',
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName}`;
  }

  /**
   * Generate managers for all clubs
   */
  private generateManagers(clubs: IClub[]): IManager[] {
    return clubs
      .filter((c) => !c.isNationalTeam)
      .map((club, index) => ({
        id: `manager_${club.id}`,
        name: this.generateName(club.country),
        nationality: club.country,
        age: Math.floor(Math.random() * 25) + 35,
        reputation: Math.max(20, club.reputation - 10 + Math.floor(Math.random() * 20)),
        status: 'EMPLOYED' as const,
        clubId: club.id,
        contractExpiry: '2026-06-30',
        titlesWon: Math.floor(Math.random() * 3),
        internationalTitles: 0,
        promotions: Math.floor(Math.random() * 2),
        relegations: Math.floor(Math.random() * 2),
        sackings: Math.floor(Math.random() * 2),
        nemesisManagerIds: [],
        expectedPosition: this.calculateExpectedPosition(club),
      }));
  }

  /**
   * Calculate expected position based on club reputation
   */
  private calculateExpectedPosition(club: IClub): number {
    const rep = club.reputation;
    if (rep >= 85) return 3;
    if (rep >= 70) return 6;
    if (rep >= 55) return 10;
    if (rep >= 40) return 14;
    return 18;
  }

  /**
   * Initialize standings for all competitions
   */
  private initializeStandings(data: MasterDatabaseSchema): void {
    for (const competition of data.competitions) {
      if (competition.type === 'LEAGUE' && (!competition.standings || competition.standings.length === 0)) {
        competition.standings = competition.teamIds.map((clubId) => ({
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
  }

  /**
   * Generate season fixtures for all league competitions
   */
  private generateSeasonFixtures(data: MasterDatabaseSchema): SeasonFixtures {
    const fixtures: SeasonFixtures = {};

    for (const competition of data.competitions) {
      if (competition.type === 'LEAGUE') {
        fixtures[competition.id] = this.generateLeagueFixtures(
          competition.id,
          competition.teamIds,
          this.config.startDate
        );
      }
    }

    return fixtures;
  }

  /**
   * Shuffle array with a seed for reproducibility
   */
  private shuffleWithSeed(array: string[], seed: number): string[] {
    const result = [...array];
    let currentSeed = seed;

    const random = () => {
      const x = Math.sin(currentSeed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  /**
   * Generate round-robin fixtures for a league
   * Uses the "circle method" for balanced scheduling
   */
  private generateLeagueFixtures(
    competitionId: string,
    teamIds: string[],
    startDate: string
  ): Fixture[] {
    // Shuffle teams for varied matchups (use competitionId as seed for reproducibility)
    const seed = competitionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const teams = this.shuffleWithSeed([...teamIds], seed);
    const fixtures: Fixture[] = [];

    // Ensure even number of teams
    if (teams.length % 2 === 1) {
      teams.push('BYE');
    }

    const numTeams = teams.length;
    const numRounds = (numTeams - 1) * 2; // Home and away
    const matchesPerRound = numTeams / 2;

    let currentDate = new Date(startDate);
    // Skip to first weekend (Saturday)
    while (currentDate.getDay() !== 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let fixtureId = 0;

    // Generate first half (home games)
    for (let round = 0; round < numTeams - 1; round++) {
      const roundFixtures: Fixture[] = [];

      for (let match = 0; match < matchesPerRound; match++) {
        const home = (round + match) % (numTeams - 1);
        let away = (numTeams - 1 - match + round) % (numTeams - 1);

        if (match === 0) {
          away = numTeams - 1;
        }

        // Skip BYE matches
        if (teams[home] === 'BYE' || teams[away] === 'BYE') continue;

        // Alternate home/away for fairness
        const isHomeFirst = round % 2 === 0;
        const homeTeam = isHomeFirst ? teams[home] : teams[away];
        const awayTeam = isHomeFirst ? teams[away] : teams[home];

        roundFixtures.push({
          id: `fix_${competitionId}_${fixtureId++}`,
          competitionId,
          round: round + 1,
          matchday: round + 1,
          date: currentDate.toISOString().split('T')[0],
          homeClubId: homeTeam,
          awayClubId: awayTeam,
          status: 'SCHEDULED',
        });
      }

      fixtures.push(...roundFixtures);
      currentDate.setDate(currentDate.getDate() + 7); // Next week
    }

    // Generate second half (reverse fixtures)
    for (let round = 0; round < numTeams - 1; round++) {
      const firstHalfRound = round * matchesPerRound;

      for (let match = 0; match < matchesPerRound; match++) {
        const originalFixture = fixtures[firstHalfRound + match];
        if (!originalFixture) continue;

        fixtures.push({
          id: `fix_${competitionId}_${fixtureId++}`,
          competitionId,
          round: round + numTeams,
          matchday: round + numTeams,
          date: currentDate.toISOString().split('T')[0],
          homeClubId: originalFixture.awayClubId, // Swapped
          awayClubId: originalFixture.homeClubId,
          status: 'SCHEDULED',
        });
      }

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return fixtures;
  }

  /**
   * Get the next match for a club
   */
  static getNextMatch(fixtures: Fixture[], clubId: string): Fixture | null {
    return (
      fixtures.find(
        (f) =>
          f.status === 'SCHEDULED' &&
          (f.homeClubId === clubId || f.awayClubId === clubId)
      ) || null
    );
  }

  /**
   * Get all matches for a specific matchday
   */
  static getMatchdayFixtures(fixtures: Fixture[], matchday: number): Fixture[] {
    return fixtures.filter((f) => f.matchday === matchday);
  }

  /**
   * Get upcoming fixtures for a club
   */
  static getUpcomingFixtures(
    fixtures: Fixture[],
    clubId: string,
    limit: number = 5
  ): Fixture[] {
    return fixtures
      .filter(
        (f) =>
          f.status === 'SCHEDULED' &&
          (f.homeClubId === clubId || f.awayClubId === clubId)
      )
      .slice(0, limit);
  }

  /**
   * Get recent results for a club
   */
  static getRecentResults(
    fixtures: Fixture[],
    clubId: string,
    limit: number = 5
  ): Fixture[] {
    return fixtures
      .filter(
        (f) =>
          f.status === 'FINISHED' &&
          (f.homeClubId === clubId || f.awayClubId === clubId)
      )
      .slice(-limit);
  }
}
