// =============================================================================
// CYBERFOOT 2026 - PLAYER ENTITY
// =============================================================================

import type {
  IPlayer,
  Position,
  ConditionArrow,
  TransferStatus,
  PlayerHistoryStats,
  PlayerCareerRecord,
  YouthPromise,
  MatchEngineConfig,
} from '../../types';

// -----------------------------------------------------------------------------
// POSITION ADJACENCY MATRIX
// -----------------------------------------------------------------------------

const POSITION_ADJACENCY: Record<Position, Position[]> = {
  GK: [],           // GK has no adjacent positions
  DEF: ['MID'],
  MID: ['DEF', 'FWD'],
  FWD: ['MID'],
};

// -----------------------------------------------------------------------------
// DEFAULT CONFIG VALUES
// -----------------------------------------------------------------------------

const DEFAULT_ARROW_MODIFIERS: Record<ConditionArrow, number> = {
  UP: 0.10,
  SLIGHT_UP: 0.05,
  MID: 0,
  SLIGHT_DOWN: -0.05,
  DOWN: -0.10,
};

const DEFAULT_POSITION_PENALTIES = {
  natural: 1.0,
  alternative: 0.95,
  adjacent: 0.75,
  invalid: 0.05,
};

// -----------------------------------------------------------------------------
// PLAYER CLASS
// -----------------------------------------------------------------------------

export class Player implements IPlayer {
  // Identity
  readonly id: string;
  name: string;
  age: number;
  nationality: string;
  positionMain: Position;
  positionAlt: Position[] | null;

  // Core attributes
  skillBase: number;
  potential: number;
  conditionArrow: ConditionArrow;

  // Contract & Status
  clubId: string | null;
  wage: number;
  contractExpiry: string;
  transferStatus: TransferStatus;
  marketValue: number;
  releaseClause: number | null;

  // Relationships
  chemistryPartners: string[];
  isIdol: boolean;
  isRegen: boolean;
  originalPlayerId?: string;

  // Stats
  currentSeasonStats: PlayerHistoryStats;
  careerHistory: PlayerCareerRecord[];

  // Injury & Suspension
  injuredUntil: string | null;
  suspendedUntil: string | null;
  suspensionReason?: 'RED_CARD' | 'ACCUMULATED_YELLOWS';

  // Youth Promise
  activePromise?: YouthPromise;

  constructor(data: IPlayer) {
    this.id = data.id;
    this.name = data.name;
    this.age = data.age;
    this.nationality = data.nationality;
    this.positionMain = data.positionMain;
    this.positionAlt = data.positionAlt;
    this.skillBase = data.skillBase;
    this.potential = data.potential;
    this.conditionArrow = data.conditionArrow;
    this.clubId = data.clubId;
    this.wage = data.wage;
    this.contractExpiry = data.contractExpiry;
    this.transferStatus = data.transferStatus;
    this.marketValue = data.marketValue;
    this.releaseClause = data.releaseClause;
    this.chemistryPartners = data.chemistryPartners;
    this.isIdol = data.isIdol;
    this.isRegen = data.isRegen;
    this.originalPlayerId = data.originalPlayerId;
    this.currentSeasonStats = data.currentSeasonStats;
    this.careerHistory = data.careerHistory;
    this.injuredUntil = data.injuredUntil;
    this.suspendedUntil = data.suspendedUntil;
    this.suspensionReason = data.suspensionReason;
    this.activePromise = data.activePromise;
  }

  // ---------------------------------------------------------------------------
  // EFFECTIVE SKILL CALCULATION (THE MATRIX)
  // ---------------------------------------------------------------------------

  /**
   * Calculates the effective skill when playing in a specific position.
   * This is THE CORE calculation that drives match simulation.
   *
   * @param playedPosition - The position the player is deployed in
   * @param teammateIds - IDs of teammates on the pitch (for chemistry)
   * @param config - Optional engine config overrides
   * @returns Effective skill value (can exceed 99 with bonuses)
   */
  getEffectiveSkill(
    playedPosition: Position,
    teammateIds: string[] = [],
    config?: Partial<MatchEngineConfig>
  ): number {
    const positionPenalties = config?.positionPenalties ?? DEFAULT_POSITION_PENALTIES;
    const arrowModifiers = config?.arrowModifiers ?? DEFAULT_ARROW_MODIFIERS;
    const chemistryBonus = config?.chemistryBonus ?? 0.05;

    // Step 1: Position Multiplier
    const positionMultiplier = this.calculatePositionMultiplier(
      playedPosition,
      positionPenalties
    );

    // Step 2: Arrow Modifier
    const arrowModifier = arrowModifiers[this.conditionArrow];

    // Step 3: Chemistry Bonus
    const hasChemistryLink = this.chemistryPartners.some((partnerId) =>
      teammateIds.includes(partnerId)
    );
    const chemistryModifier = hasChemistryLink ? chemistryBonus : 0;

    // Final Calculation
    const baseWithPosition = this.skillBase * positionMultiplier;
    const withArrow = baseWithPosition * (1 + arrowModifier);
    const finalSkill = withArrow * (1 + chemistryModifier);

    return Math.round(finalSkill * 100) / 100;
  }

  /**
   * Determines the position multiplier based on where the player is deployed.
   */
  private calculatePositionMultiplier(
    playedPosition: Position,
    penalties: typeof DEFAULT_POSITION_PENALTIES
  ): number {
    // Natural position
    if (playedPosition === this.positionMain) {
      return penalties.natural;
    }

    // Alternative positions
    if (this.positionAlt?.includes(playedPosition)) {
      return penalties.alternative;
    }

    // Adjacent line (e.g., FWD playing MID)
    if (POSITION_ADJACENCY[this.positionMain].includes(playedPosition)) {
      return penalties.adjacent;
    }

    // Invalid position (e.g., FWD playing GK)
    return penalties.invalid;
  }

  // ---------------------------------------------------------------------------
  // POSITION CLASSIFICATION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Returns the position fit type for UI display.
   */
  getPositionFit(playedPosition: Position): 'NATURAL' | 'ALT' | 'ADJACENT' | 'INVALID' {
    if (playedPosition === this.positionMain) return 'NATURAL';
    if (this.positionAlt?.includes(playedPosition)) return 'ALT';
    if (POSITION_ADJACENCY[this.positionMain].includes(playedPosition)) return 'ADJACENT';
    return 'INVALID';
  }

  /**
   * Checks if the player can competently play a position (>=75% effectiveness).
   */
  canPlay(position: Position): boolean {
    return this.getPositionFit(position) !== 'INVALID';
  }

  /**
   * Returns all positions the player can play competently.
   */
  getPlayablePositions(): Position[] {
    const positions: Position[] = [this.positionMain];

    if (this.positionAlt) {
      positions.push(...this.positionAlt);
    }

    // Add adjacent positions
    for (const adjacent of POSITION_ADJACENCY[this.positionMain]) {
      if (!positions.includes(adjacent)) {
        positions.push(adjacent);
      }
    }

    return positions;
  }

  // ---------------------------------------------------------------------------
  // CONDITION & FORM MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Updates the condition arrow based on match rating and RNG.
   * Called weekly during world tick.
   */
  updateCondition(lastMatchRating: number | null, rngValue: number): void {
    const arrows: ConditionArrow[] = ['DOWN', 'SLIGHT_DOWN', 'MID', 'SLIGHT_UP', 'UP'];
    const currentIndex = arrows.indexOf(this.conditionArrow);

    let delta = 0;

    // Match performance influence
    if (lastMatchRating !== null) {
      if (lastMatchRating >= 8.0) delta += 2;
      else if (lastMatchRating >= 7.0) delta += 1;
      else if (lastMatchRating <= 5.0) delta -= 2;
      else if (lastMatchRating <= 6.0) delta -= 1;
    }

    // RNG training simulation (0-100)
    if (rngValue > 80) delta += 1;
    else if (rngValue < 20) delta -= 1;

    // Clamp to valid range
    const newIndex = Math.max(0, Math.min(4, currentIndex + delta));
    this.conditionArrow = arrows[newIndex];
  }

  // ---------------------------------------------------------------------------
  // AGE & DEVELOPMENT
  // ---------------------------------------------------------------------------

  /**
   * Processes yearly aging and skill development.
   * Called at season end.
   */
  processYearlyDevelopment(): { skillChange: number; retired: boolean } {
    this.age += 1;

    let skillChange = 0;
    let retired = false;

    if (this.age <= 23) {
      // Youth development - can grow toward potential
      const growthRoom = this.potential - this.skillBase;
      const growthRate = this.getYouthGrowthRate();
      skillChange = Math.floor(growthRoom * growthRate);
    } else if (this.age >= 32) {
      // Decline phase
      const declineRate = this.getDeclineRate();
      skillChange = -Math.floor(this.skillBase * declineRate);
    }

    this.skillBase = Math.max(1, Math.min(99, this.skillBase + skillChange));

    // Retirement check
    if (this.age >= 35 && (this.skillBase < 50 || Math.random() < 0.15)) {
      retired = true;
    } else if (this.age >= 40) {
      retired = true;
    }

    return { skillChange, retired };
  }

  private getYouthGrowthRate(): number {
    // Younger players develop faster
    if (this.age <= 18) return 0.15;
    if (this.age <= 20) return 0.12;
    if (this.age <= 23) return 0.08;
    return 0;
  }

  private getDeclineRate(): number {
    // Older players decline faster
    if (this.age >= 38) return 0.12;
    if (this.age >= 36) return 0.08;
    if (this.age >= 34) return 0.05;
    if (this.age >= 32) return 0.03;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // YOUTH PROMISE SYSTEM
  // ---------------------------------------------------------------------------

  /**
   * Attempts to generate a youth promise for eligible players.
   * Should be called randomly during season.
   */
  generateYouthPromise(currentWeek: number): YouthPromise | null {
    if (this.age > 21) return null;
    if (this.activePromise) return null;

    const types: YouthPromise['type'][] = [
      'CONSECUTIVE_STARTS',
      'GOAL_TARGET',
      'CLEAN_SHEET_TARGET',
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    let requirement = 3;

    if (type === 'GOAL_TARGET') {
      requirement = this.positionMain === 'FWD' ? 3 : 2;
    } else if (type === 'CLEAN_SHEET_TARGET') {
      requirement = this.positionMain === 'GK' || this.positionMain === 'DEF' ? 3 : 2;
    }

    this.activePromise = {
      type,
      requirement,
      progress: 0,
      expiryWeek: currentWeek + 8, // 8 weeks to fulfill
      rewardSkillBoost: 3,
    };

    return this.activePromise;
  }

  /**
   * Updates promise progress after a match.
   */
  updatePromiseProgress(
    started: boolean,
    scored: boolean,
    cleanSheet: boolean,
    currentWeek: number
  ): { fulfilled: boolean; failed: boolean } {
    if (!this.activePromise) {
      return { fulfilled: false, failed: false };
    }

    const promise = this.activePromise;

    // Check expiry
    if (currentWeek > promise.expiryWeek) {
      this.activePromise = undefined;
      return { fulfilled: false, failed: true };
    }

    // Update progress based on type
    switch (promise.type) {
      case 'CONSECUTIVE_STARTS':
        if (started) {
          promise.progress += 1;
        } else {
          // Reset on non-start
          promise.progress = 0;
        }
        break;
      case 'GOAL_TARGET':
        if (scored) promise.progress += 1;
        break;
      case 'CLEAN_SHEET_TARGET':
        if (cleanSheet) promise.progress += 1;
        break;
    }

    // Check fulfillment
    if (promise.progress >= promise.requirement) {
      this.skillBase = Math.min(99, this.skillBase + promise.rewardSkillBoost);
      this.activePromise = undefined;
      return { fulfilled: true, failed: false };
    }

    return { fulfilled: false, failed: false };
  }

  // ---------------------------------------------------------------------------
  // MARKET VALUE CALCULATION
  // ---------------------------------------------------------------------------

  /**
   * Recalculates market value based on current attributes.
   */
  recalculateMarketValue(): number {
    const baseValue = this.skillBase * 100000; // 100k per skill point

    // Age modifier
    let ageMultiplier = 1.0;
    if (this.age <= 23) {
      ageMultiplier = 1.5 + (23 - this.age) * 0.1; // Young premium
    } else if (this.age >= 30) {
      ageMultiplier = Math.max(0.3, 1 - (this.age - 29) * 0.15);
    }

    // Potential modifier (for young players)
    const potentialBonus = this.age <= 23 ? (this.potential - this.skillBase) * 50000 : 0;

    // Form modifier
    const formMultiplier =
      this.conditionArrow === 'UP' ? 1.1 :
      this.conditionArrow === 'DOWN' ? 0.9 : 1.0;

    this.marketValue = Math.round(
      (baseValue * ageMultiplier + potentialBonus) * formMultiplier
    );

    return this.marketValue;
  }

  // ---------------------------------------------------------------------------
  // STATS MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Records match statistics.
   */
  recordMatchStats(stats: {
    goals?: number;
    assists?: number;
    cleanSheet?: boolean;
    rating: number;
    yellowCard?: boolean;
    redCard?: boolean;
  }): void {
    this.currentSeasonStats.matches += 1;
    this.currentSeasonStats.goals += stats.goals ?? 0;
    this.currentSeasonStats.assists += stats.assists ?? 0;
    if (stats.cleanSheet) this.currentSeasonStats.cleanSheets += 1;
    if (stats.yellowCard) this.currentSeasonStats.yellowCards += 1;
    if (stats.redCard) this.currentSeasonStats.redCards += 1;

    // Running average for rating
    const totalMatches = this.currentSeasonStats.matches;
    this.currentSeasonStats.avgRating =
      (this.currentSeasonStats.avgRating * (totalMatches - 1) + stats.rating) / totalMatches;
  }

  /**
   * Archives current season stats and resets for new season.
   */
  archiveSeason(seasonId: string): void {
    if (this.clubId) {
      this.careerHistory.push({
        seasonId,
        clubId: this.clubId,
        stats: { ...this.currentSeasonStats },
      });
    }

    // Reset current season
    this.currentSeasonStats = {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      matches: 0,
      yellowCards: 0,
      redCards: 0,
      avgRating: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // SERIALIZATION
  // ---------------------------------------------------------------------------

  toJSON(): IPlayer {
    return {
      id: this.id,
      name: this.name,
      age: this.age,
      nationality: this.nationality,
      positionMain: this.positionMain,
      positionAlt: this.positionAlt,
      skillBase: this.skillBase,
      potential: this.potential,
      conditionArrow: this.conditionArrow,
      clubId: this.clubId,
      wage: this.wage,
      contractExpiry: this.contractExpiry,
      transferStatus: this.transferStatus,
      marketValue: this.marketValue,
      releaseClause: this.releaseClause,
      chemistryPartners: this.chemistryPartners,
      isIdol: this.isIdol,
      isRegen: this.isRegen,
      originalPlayerId: this.originalPlayerId,
      currentSeasonStats: this.currentSeasonStats,
      careerHistory: this.careerHistory,
      injuredUntil: this.injuredUntil,
      suspendedUntil: this.suspendedUntil,
      suspensionReason: this.suspensionReason,
      activePromise: this.activePromise,
    };
  }

  static fromJSON(data: IPlayer): Player {
    return new Player(data);
  }
}
