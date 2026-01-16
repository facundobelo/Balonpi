/**
 * SaveManager - IndexedDB-based game save system
 *
 * Handles:
 * - Creating new games (snapshot of master DB)
 * - Loading/saving game state
 * - Auto-save functionality
 * - Multiple save slots
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { MasterDatabaseSchema } from '../types';
import {
  processSeasonDevelopment,
  processWeeklyFormChanges,
} from '../core/managers/PlayerDevelopment';

// Game save structure
export interface GameSave {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gameDate: string;        // In-game date (e.g., "2024-07-01")
  season: string;          // e.g., "2024-2025"
  userClubId: string;
  userManagerName: string;

  // Full database snapshot
  players: any[];
  clubs: any[];
  managers: any[];
  competitions: any[];

  // Game state
  matchHistory: MatchResult[];
  transferHistory: Transfer[];
  newsItems: NewsItem[];

  // Season fixtures (persisted so they don't reset)
  fixtures: { [competitionId: string]: any[] };

  // Board objectives
  boardObjectives: {
    season: string;
    objectives: any[];
    boardConfidence: number;
  };

  // Manager career stats
  managerReputation: number;  // 0-100

  // Transfer offers received from CPU clubs for user's players
  receivedOffers: ReceivedOffer[];
}

export interface ReceivedOffer {
  id: string;
  playerId: string;
  fromClubId: string;
  amount: number;
  createdDate: string;
  expiresDate: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
}

export interface MatchResult {
  id: string;
  date: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'ASSIST' | 'YELLOW' | 'RED' | 'SUB';
  playerId: string;
  clubId: string;
  assistPlayerId?: string;
}

export interface Transfer {
  id: string;
  date: string;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  fee: number;
  type: 'TRANSFER' | 'LOAN' | 'FREE' | 'RELEASE';
}

export interface NewsItem {
  id: string;
  date: string;
  type: 'TRANSFER' | 'INJURY' | 'RESULT' | 'MILESTONE' | 'RUMOR';
  headline: string;
  body: string;
  relatedIds: string[];
}

export interface SaveSlot {
  id: string;
  name: string;
  userClubId: string;
  clubName: string;
  gameDate: string;
  updatedAt: string;
}

const DB_NAME = 'balonpi2026';
const DB_VERSION = 1;

class SaveManager {
  private db: IDBPDatabase | null = null;
  private currentSave: GameSave | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for game saves
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'id' });
        }
        // Store for settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  private ensureDb(): IDBPDatabase {
    if (!this.db) {
      throw new Error('SaveManager not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Generate board objectives based on club reputation
   */
  private generateBoardObjectives(club: any, season: string): GameSave['boardObjectives'] {
    const objectives: any[] = [];
    const rep = club?.reputation || 50;

    // Primary objective based on club tier
    if (rep >= 85) {
      // Elite clubs - must win the title
      objectives.push({
        id: 'obj_title',
        type: 'WIN_TITLE',
        description: 'Ganar el campeonato',
        target: 1,
        current: 0,
        status: 'IN_PROGRESS',
        priority: 'PRIMARY',
        reward: 10000000,
        penalty: 'SACKED',
      });
    } else if (rep >= 70) {
      // Top clubs - must finish top 4
      objectives.push({
        id: 'obj_position',
        type: 'LEAGUE_POSITION',
        description: 'Clasificar a competición europea (Top 4)',
        target: 4,
        current: 0,
        status: 'IN_PROGRESS',
        priority: 'PRIMARY',
        reward: 5000000,
        penalty: 'WARNING',
      });
    } else if (rep >= 50) {
      // Mid-table clubs - finish top half
      objectives.push({
        id: 'obj_position',
        type: 'LEAGUE_POSITION',
        description: 'Terminar en la primera mitad de la tabla (Top 10)',
        target: 10,
        current: 0,
        status: 'IN_PROGRESS',
        priority: 'PRIMARY',
        reward: 2000000,
        penalty: 'WARNING',
      });
    } else {
      // Lower clubs - avoid relegation
      objectives.push({
        id: 'obj_survival',
        type: 'AVOID_RELEGATION',
        description: 'Evitar el descenso (No terminar últimos 3)',
        target: 17,  // Must be 17th or better
        current: 0,
        status: 'IN_PROGRESS',
        priority: 'PRIMARY',
        reward: 1000000,
        penalty: 'SACKED',
      });
    }

    // Secondary objective - financial balance
    objectives.push({
      id: 'obj_financial',
      type: 'FINANCIAL_BALANCE',
      description: 'Mantener balance financiero positivo',
      target: 0,
      current: club?.budget || 0,
      status: 'IN_PROGRESS',
      priority: 'SECONDARY',
      reward: 500000,
    });

    return {
      season,
      objectives,
      boardConfidence: 70, // Start with decent confidence
    };
  }

  /**
   * Create a new game from the master database
   */
  async createNewGame(
    masterDb: MasterDatabaseSchema,
    userClubId: string,
    managerName: string,
    saveName?: string,
    seasonFixtures?: { [competitionId: string]: any[] }
  ): Promise<GameSave> {
    const db = this.ensureDb();

    const id = `save_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Find the user's club to get the name
    const userClub = masterDb.clubs.find(c => c.id === userClubId);

    const save: GameSave = {
      id,
      name: saveName || `${userClub?.name || 'Unknown'} Career`,
      createdAt: now,
      updatedAt: now,
      gameDate: '2024-07-01',  // Start of season
      season: '2024-2025',
      userClubId,
      userManagerName: managerName,

      // Deep copy the database
      players: JSON.parse(JSON.stringify(masterDb.players)),
      clubs: JSON.parse(JSON.stringify(masterDb.clubs)),
      managers: JSON.parse(JSON.stringify(masterDb.managers)),
      competitions: JSON.parse(JSON.stringify(masterDb.competitions)),

      // Empty game state
      matchHistory: [],
      transferHistory: [],
      newsItems: [],
      receivedOffers: [],

      // Season fixtures
      fixtures: seasonFixtures ? JSON.parse(JSON.stringify(seasonFixtures)) : {},

      // Board objectives - generated based on club reputation
      boardObjectives: this.generateBoardObjectives(userClub, '2024-2025'),

      // Manager starts with reputation based on club tier
      managerReputation: Math.min(50, Math.max(20, (userClub?.reputation || 50) - 20)),
    };

    // Update the user's club manager
    const clubIndex = save.clubs.findIndex(c => c.id === userClubId);
    if (clubIndex !== -1) {
      // Find and update manager
      const managerIndex = save.managers.findIndex(m => m.clubId === userClubId);
      if (managerIndex !== -1) {
        save.managers[managerIndex].name = managerName;
        save.managers[managerIndex].isPlayer = true;
      }
    }

    await db.put('saves', save);
    this.currentSave = save;

    // Store as last played
    await db.put('settings', { key: 'lastSaveId', value: id });

    return save;
  }

  /**
   * Load an existing save
   */
  async loadSave(saveId: string): Promise<GameSave | null> {
    const db = this.ensureDb();
    const save = await db.get('saves', saveId);

    if (save) {
      // Validate and clean up data integrity
      this.validateSaveData(save);
      this.currentSave = save;
      await db.put('settings', { key: 'lastSaveId', value: saveId });
    }

    return save || null;
  }

  /**
   * Validate and repair save data integrity
   */
  private validateSaveData(save: GameSave): void {
    const playerIds = new Set(save.players.map(p => p.id));

    // Validate club squadIds reference existing players
    for (const club of save.clubs) {
      if (club.squadIds) {
        club.squadIds = club.squadIds.filter((id: string) => playerIds.has(id));
      }
    }

    // Ensure all players have valid clubId references
    const clubIds = new Set(save.clubs.map(c => c.id));
    for (const player of save.players) {
      if (player.clubId && !clubIds.has(player.clubId)) {
        player.clubId = null; // Make them free agent if club doesn't exist
      }
    }

    // Validate competition teamIds
    for (const comp of save.competitions) {
      if (comp.teamIds) {
        comp.teamIds = comp.teamIds.filter((id: string) => clubIds.has(id));
      }
    }

    // Ensure standings have valid clubIds
    for (const comp of save.competitions) {
      if (comp.standings) {
        comp.standings = comp.standings.filter((s: any) => clubIds.has(s.clubId));
      }
    }
  }

  /**
   * Get current loaded save
   */
  getCurrentSave(): GameSave | null {
    return this.currentSave;
  }

  /**
   * Check if all league fixtures are finished (season complete but not yet processed)
   * Returns true if season is complete and ready for summary screen
   */
  isSeasonComplete(): boolean {
    if (!this.currentSave || !this.currentSave.fixtures) return false;

    // Find user's league
    const userClub = this.currentSave.clubs.find(c => c.id === this.currentSave!.userClubId);
    if (!userClub) return false;

    const userLeague = this.currentSave.competitions.find(c =>
      c.type === 'LEAGUE' && c.teamIds?.includes(userClub.id)
    );
    if (!userLeague) return false;

    const leagueFixtures = this.currentSave.fixtures[userLeague.id];
    if (!leagueFixtures || leagueFixtures.length === 0) return false;

    // Check if all fixtures in user's league are finished
    return leagueFixtures.every(f => f.status === 'FINISHED');
  }

  /**
   * Check if all league fixtures are finished and process season end if needed
   * Returns true if season was ended
   * @deprecated Use isSeasonComplete + startNewSeason instead
   */
  checkAndProcessSeasonEnd(): boolean {
    if (!this.isSeasonComplete()) return false;

    console.log('All league fixtures finished! Processing season end...');
    this.startNewSeason();
    return true;
  }

  /**
   * Start a new season (called when user confirms from season summary screen)
   */
  startNewSeason(): void {
    if (!this.currentSave) return;

    // Get current date and advance to July 1st for new season
    const currentDate = new Date(this.currentSave.gameDate);
    const currentYear = currentDate.getFullYear();

    // Determine which July 1st to use
    // If we're before July, use current year's July 1st
    // If we're in/after July, use next year's July 1st
    let newSeasonDate: Date;
    if (currentDate.getMonth() < 6) { // Before July
      newSeasonDate = new Date(currentYear, 6, 1); // July 1st of current year
    } else {
      newSeasonDate = new Date(currentYear + 1, 6, 1); // July 1st of next year
    }

    // Update game date to new season start
    this.currentSave.gameDate = newSeasonDate.toISOString().split('T')[0];

    // Process the new season
    this.processNewSeason(newSeasonDate);

    this.scheduleAutoSave();
  }

  /**
   * Save current game state
   */
  async save(): Promise<void> {
    if (!this.currentSave) {
      throw new Error('No active game to save');
    }

    const db = this.ensureDb();
    this.currentSave.updatedAt = new Date().toISOString();
    await db.put('saves', this.currentSave);
  }

  /**
   * Auto-save (debounced with state snapshot)
   */
  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingSave: boolean = false;

  scheduleAutoSave(delayMs: number = 5000): void {
    // If already saving, mark that another save is needed
    if (this.pendingSave) {
      return;
    }

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(async () => {
      this.pendingSave = true;
      try {
        await this.save();
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        this.pendingSave = false;
      }
    }, delayMs);
  }

  /**
   * List all save slots
   */
  async listSaves(): Promise<SaveSlot[]> {
    const db = this.ensureDb();
    const saves = await db.getAll('saves') as GameSave[];

    return saves.map(save => {
      const club = save.clubs.find(c => c.id === save.userClubId);
      return {
        id: save.id,
        name: save.name,
        userClubId: save.userClubId,
        clubName: club?.name || 'Unknown',
        gameDate: save.gameDate,
        updatedAt: save.updatedAt,
      };
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Delete a save
   */
  async deleteSave(saveId: string): Promise<void> {
    const db = this.ensureDb();
    await db.delete('saves', saveId);

    if (this.currentSave?.id === saveId) {
      this.currentSave = null;
    }
  }

  /**
   * Get the last played save ID
   */
  async getLastSaveId(): Promise<string | null> {
    const db = this.ensureDb();
    const setting = await db.get('settings', 'lastSaveId');
    return setting?.value || null;
  }

  /**
   * Update game date (advance time)
   */
  advanceDate(days: number = 1): void {
    if (!this.currentSave) return;

    const previousDate = new Date(this.currentSave.gameDate);
    const current = new Date(this.currentSave.gameDate);
    current.setDate(current.getDate() + days);
    this.currentSave.gameDate = current.toISOString().split('T')[0];

    // Check if we crossed a week boundary (process form changes)
    const previousWeek = Math.floor(previousDate.getTime() / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = Math.floor(current.getTime() / (7 * 24 * 60 * 60 * 1000));
    if (currentWeek > previousWeek) {
      processWeeklyFormChanges(this.currentSave.players);
    }

    // Clear expired injuries and suspensions
    this.clearExpiredPlayerStatus();

    // Check for season change (July 1st = new season)
    const previousSeason = previousDate.getFullYear();
    const currentSeason = current.getFullYear();
    const crossedJuly1 = (previousDate.getMonth() < 6 || (previousDate.getMonth() === 6 && previousDate.getDate() === 0))
                         && (current.getMonth() >= 6);

    if (crossedJuly1 || (current.getMonth() === 6 && current.getDate() === 1 && previousDate.getMonth() !== 6)) {
      this.processNewSeason(current);
    }

    this.scheduleAutoSave();
  }

  /**
   * Clear expired injuries and suspensions
   */
  private clearExpiredPlayerStatus(): void {
    if (!this.currentSave) return;

    const currentDate = this.currentSave.gameDate;
    for (const player of this.currentSave.players) {
      // Clear expired injuries
      if (player.injuredUntil && player.injuredUntil <= currentDate) {
        player.injuredUntil = null;
      }
      // Clear expired suspensions
      if (player.suspendedUntil && player.suspendedUntil <= currentDate) {
        player.suspendedUntil = null;
        player.suspensionReason = undefined;
      }
    }
  }

  /**
   * Process transition to a new season
   */
  private processNewSeason(currentDate: Date): void {
    if (!this.currentSave) return;

    // Save the previous season BEFORE updating
    const previousSeason = this.currentSave.season;

    const year = currentDate.getFullYear();
    const newSeason = `${year}-${year + 1}`;

    console.log(`Processing new season: ${previousSeason} -> ${newSeason}`);

    // Save previous season stats to career history before resetting
    for (const player of this.currentSave.players) {
      // Only save to history if player had appearances
      if (player.currentSeasonStats.appearances > 0) {
        if (!player.careerHistory) {
          player.careerHistory = [];
        }
        player.careerHistory.push({
          seasonId: previousSeason,
          clubId: player.clubId || '',
          stats: {
            appearances: player.currentSeasonStats.appearances,
            goals: player.currentSeasonStats.goals,
            assists: player.currentSeasonStats.assists,
            cleanSheets: player.currentSeasonStats.cleanSheets,
            yellowCards: player.currentSeasonStats.yellowCards,
            redCards: player.currentSeasonStats.redCards,
            avgRating: player.currentSeasonStats.avgRating,
          },
        });
        // Limit career history to last 10 seasons to prevent memory bloat
        if (player.careerHistory.length > 10) {
          player.careerHistory = player.careerHistory.slice(-10);
        }
      }

      // Reset player season stats completely
      player.currentSeasonStats = {
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        appearances: 0,
        yellowCards: 0,
        redCards: 0,
        avgRating: 6.5,
      };
      // Clear any lingering injuries/suspensions from old season
      player.injuredUntil = null;
      player.suspendedUntil = null;
      player.suspensionReason = undefined;
    }

    // NOW update the season after saving stats
    this.currentSave.season = newSeason;

    // Process end-of-season development (aging, skill changes)
    processSeasonDevelopment(this.currentSave.players);

    // Reset standings for new season
    for (const competition of this.currentSave.competitions) {
      if (competition.standings) {
        for (const standing of competition.standings) {
          standing.played = 0;
          standing.won = 0;
          standing.drawn = 0;
          standing.lost = 0;
          standing.goalsFor = 0;
          standing.goalsAgainst = 0;
          standing.points = 0;
          standing.form = [];
        }
      }
    }

    // Generate new season fixtures
    this.generateNewSeasonFixtures(currentDate);

    // Clear old match history (keep last 50 for reference)
    this.currentSave.matchHistory = this.currentSave.matchHistory.slice(-50);

    // Keep only last 50 news items (consistent with in-game limit)
    this.currentSave.newsItems = this.currentSave.newsItems.slice(0, 50);

    // Generate new board objectives
    const userClub = this.currentSave.clubs.find(c => c.id === this.currentSave!.userClubId);
    this.currentSave.boardObjectives = this.generateBoardObjectives(userClub, newSeason);
  }

  /**
   * Generate fixtures for a new season
   */
  private generateNewSeasonFixtures(startDate: Date): void {
    if (!this.currentSave) return;

    const newFixtures: { [competitionId: string]: any[] } = {};

    // Start fixtures from mid-August of the new season year
    const fixtureStartDate = new Date(startDate);
    // If we're past August, use next year for the new season
    if (startDate.getMonth() >= 5) { // June or later = new season starts next August
      fixtureStartDate.setFullYear(startDate.getFullYear());
    }
    fixtureStartDate.setMonth(7); // August
    fixtureStartDate.setDate(17); // 17th
    // Find first Saturday
    while (fixtureStartDate.getDay() !== 6) {
      fixtureStartDate.setDate(fixtureStartDate.getDate() + 1);
    }

    for (const competition of this.currentSave.competitions) {
      if (competition.type === 'LEAGUE') {
        const fixtures = this.generateLeagueFixtures(
          competition.id,
          competition.teamIds,
          fixtureStartDate.toISOString().split('T')[0]
        );
        newFixtures[competition.id] = fixtures;
      }
    }

    this.currentSave.fixtures = newFixtures;
  }

  /**
   * Generate round-robin fixtures for a league (same algorithm as GenesisLoader)
   */
  private generateLeagueFixtures(
    competitionId: string,
    teamIds: string[],
    startDate: string
  ): any[] {
    // Shuffle teams for varied matchups
    const seed = competitionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + new Date().getFullYear();
    const teams = this.shuffleWithSeed([...teamIds], seed);
    const fixtures: any[] = [];

    // Ensure even number of teams
    if (teams.length % 2 === 1) {
      teams.push('BYE');
    }

    const numTeams = teams.length;
    const matchesPerRound = numTeams / 2;

    let currentDate = new Date(startDate);
    let fixtureId = 0;

    // Generate first half (home games)
    for (let round = 0; round < numTeams - 1; round++) {
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

        fixtures.push({
          id: `fix_${competitionId}_${Date.now()}_${fixtureId++}`,
          competitionId,
          round: round + 1,
          matchday: round + 1,
          date: currentDate.toISOString().split('T')[0],
          homeClubId: homeTeam,
          awayClubId: awayTeam,
          status: 'SCHEDULED',
        });
      }

      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Generate second half (reverse fixtures)
    const firstHalfLength = fixtures.length;
    for (let i = 0; i < firstHalfLength; i++) {
      const original = fixtures[i];
      const reverseMatchday = original.matchday + (numTeams - 1);

      fixtures.push({
        id: `fix_${competitionId}_${Date.now()}_${fixtureId++}`,
        competitionId,
        round: reverseMatchday,
        matchday: reverseMatchday,
        date: currentDate.toISOString().split('T')[0],
        homeClubId: original.awayClubId, // Swapped
        awayClubId: original.homeClubId,
        status: 'SCHEDULED',
      });

      // Advance date every matchesPerRound fixtures
      if ((i + 1) % (matchesPerRound - (teams.includes('BYE') ? 1 : 0)) === 0) {
        currentDate.setDate(currentDate.getDate() + 7);
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
   * Add a match result
   */
  addMatchResult(result: Omit<MatchResult, 'id'>): MatchResult {
    if (!this.currentSave) throw new Error('No active game');

    const matchResult: MatchResult = {
      ...result,
      id: `match_${Date.now()}`,
    };

    this.currentSave.matchHistory.push(matchResult);

    // Update player stats based on events
    for (const event of result.events) {
      const player = this.currentSave.players.find(p => p.id === event.playerId);
      if (!player) continue;

      switch (event.type) {
        case 'GOAL':
          player.currentSeasonStats.goals++;
          break;
        case 'ASSIST':
          player.currentSeasonStats.assists++;
          break;
        case 'YELLOW':
          player.currentSeasonStats.yellowCards++;
          break;
        case 'RED':
          player.currentSeasonStats.redCards++;
          break;
      }
    }

    // Update appearances for players in both teams
    const homePlayers = this.currentSave.players.filter(p => p.clubId === result.homeClubId);
    const awayPlayers = this.currentSave.players.filter(p => p.clubId === result.awayClubId);

    // For now, increment all players' appearances (later: use actual lineup)
    [...homePlayers.slice(0, 11), ...awayPlayers.slice(0, 11)].forEach(p => {
      p.currentSeasonStats.appearances++;
    });

    this.scheduleAutoSave();
    return matchResult;
  }

  /**
   * Process a transfer
   */
  processTransfer(
    playerId: string,
    toClubId: string,
    fee: number,
    type: Transfer['type'] = 'TRANSFER'
  ): Transfer | null {
    if (!this.currentSave) return null;

    const player = this.currentSave.players.find(p => p.id === playerId);
    if (!player) return null;

    const fromClubId = player.clubId;

    // Update player's club
    player.clubId = toClubId;
    player.transferStatus = 'UNAVAILABLE';

    // Update club balances
    const fromClub = this.currentSave.clubs.find(c => c.id === fromClubId);
    const toClub = this.currentSave.clubs.find(c => c.id === toClubId);

    if (fromClub) fromClub.balance += fee;
    if (toClub) toClub.balance -= fee;

    const transfer: Transfer = {
      id: `transfer_${Date.now()}`,
      date: this.currentSave.gameDate,
      playerId,
      fromClubId,
      toClubId,
      fee,
      type,
    };

    this.currentSave.transferHistory.push(transfer);
    this.scheduleAutoSave();

    return transfer;
  }

  /**
   * Get player by ID from current save
   */
  getPlayer(playerId: string): any | null {
    return this.currentSave?.players.find(p => p.id === playerId) || null;
  }

  /**
   * Get club by ID from current save
   */
  getClub(clubId: string): any | null {
    return this.currentSave?.clubs.find(c => c.id === clubId) || null;
  }

  /**
   * Get user's club
   */
  getUserClub(): any | null {
    if (!this.currentSave) return null;
    return this.getClub(this.currentSave.userClubId);
  }

  /**
   * Get user's squad
   */
  getUserSquad(): any[] {
    if (!this.currentSave) return [];
    return this.currentSave.players.filter(p => p.clubId === this.currentSave!.userClubId);
  }
}

// Singleton instance
export const saveManager = new SaveManager();
