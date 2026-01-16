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

const DB_NAME = 'cyberfoot2026';
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
      this.currentSave = save;
      await db.put('settings', { key: 'lastSaveId', value: saveId });
    }

    return save || null;
  }

  /**
   * Get current loaded save
   */
  getCurrentSave(): GameSave | null {
    return this.currentSave;
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
   * Auto-save (debounced)
   */
  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  scheduleAutoSave(delayMs: number = 5000): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => {
      this.save().catch(console.error);
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

    // Check for season change (July 1st = new season)
    if (current.getMonth() === 6 && current.getDate() <= days) {
      const year = current.getFullYear();
      this.currentSave.season = `${year}-${year + 1}`;

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
    }

    this.scheduleAutoSave();
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
