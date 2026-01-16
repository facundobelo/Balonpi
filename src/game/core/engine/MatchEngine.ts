// =============================================================================
// BALONPI 2026 - MATCH ENGINE
// Tick-based probability simulation. No physics, pure math.
// =============================================================================

import type {
  IMatch,
  ITeamSheet,
  IClub,
  Tactic,
  MatchEvent,
  MatchResult,
  MatchSpeed,
  MatchEngineConfig,
} from '../../types';
import { Player } from '../entities/Player';

// -----------------------------------------------------------------------------
// DEFAULT ENGINE CONFIGURATION
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: MatchEngineConfig = {
  tickMinutes: 5,
  localBonus: 10,
  goalBaseThreshold: 85,

  positionPenalties: {
    natural: 1.0,
    alternative: 0.95,
    adjacent: 0.75,
    invalid: 0.05,
  },

  arrowModifiers: {
    UP: 0.10,
    SLIGHT_UP: 0.05,
    MID: 0,
    SLIGHT_DOWN: -0.05,
    DOWN: -0.10,
  },

  chemistryBonus: 0.05,
};

// -----------------------------------------------------------------------------
// TACTIC MODIFIERS
// -----------------------------------------------------------------------------

interface TacticModifier {
  attackMultiplier: number;
  defenseMultiplier: number;
  goalChanceModifier: number;
}

const TACTIC_MODIFIERS: Record<Tactic, TacticModifier> = {
  ULTRA_DEFENSIVE: { attackMultiplier: 0.6, defenseMultiplier: 1.3, goalChanceModifier: -15 },
  DEFENSIVE: { attackMultiplier: 0.8, defenseMultiplier: 1.15, goalChanceModifier: -8 },
  BALANCED: { attackMultiplier: 1.0, defenseMultiplier: 1.0, goalChanceModifier: 0 },
  ATTACKING: { attackMultiplier: 1.15, defenseMultiplier: 0.85, goalChanceModifier: 8 },
  ULTRA_ATTACKING: { attackMultiplier: 1.3, defenseMultiplier: 0.7, goalChanceModifier: 15 },
};

// -----------------------------------------------------------------------------
// MATCH STATE
// -----------------------------------------------------------------------------

interface MatchState {
  match: IMatch;
  homePlayers: Map<string, Player>;
  awayPlayers: Map<string, Player>;
  homeClub: IClub;
  awayClub: IClub;
  homeSubsRemaining: number;
  awaySubsRemaining: number;
  playerMinutesPlayed: Map<string, number>;
  playerRatings: Map<string, number[]>; // Running ratings per player
}

// -----------------------------------------------------------------------------
// MATCH ENGINE CLASS
// -----------------------------------------------------------------------------

export class MatchEngine {
  private config: MatchEngineConfig;
  private rng: () => number;

  constructor(config?: Partial<MatchEngineConfig>, rngSeed?: number) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = rngSeed ? this.createSeededRng(rngSeed) : Math.random;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Simulates an entire match and returns the result.
   * Use this for CPU vs CPU or instant simulation.
   */
  simulateFullMatch(
    match: IMatch,
    homePlayers: Map<string, Player>,
    awayPlayers: Map<string, Player>,
    homeClub: IClub,
    awayClub: IClub
  ): MatchResult {
    const state = this.initializeMatchState(
      match,
      homePlayers,
      awayPlayers,
      homeClub,
      awayClub
    );

    // Simulate all ticks
    while (state.match.currentMinute < 90) {
      this.simulateTick(state);
    }

    // Add injury time
    const injuryTime = Math.floor(this.rng() * 5) + 1;
    for (let i = 0; i < injuryTime; i++) {
      state.match.currentMinute = 90 + i;
      this.simulateTick(state);
    }

    state.match.status = 'FINISHED';

    return this.generateMatchResult(state);
  }

  /**
   * Creates a new match simulation that can be advanced tick by tick.
   * Use this for live simulation with user control.
   */
  createLiveMatch(
    match: IMatch,
    homePlayers: Map<string, Player>,
    awayPlayers: Map<string, Player>,
    homeClub: IClub,
    awayClub: IClub
  ): LiveMatchController {
    const state = this.initializeMatchState(
      match,
      homePlayers,
      awayPlayers,
      homeClub,
      awayClub
    );

    return new LiveMatchController(state, this.config, this.rng);
  }

  /**
   * Calculates team power for preview/display purposes.
   */
  calculateTeamPower(
    teamSheet: ITeamSheet,
    players: Map<string, Player>,
    isHome: boolean,
    morale: number = 50
  ): { attack: number; defense: number; overall: number } {
    const xi = teamSheet.startingXI;
    const positionAssignments = teamSheet.positionAssignments;
    const tactic = teamSheet.tactic;

    let totalAttack = 0;
    let totalDefense = 0;
    let attackerCount = 0;
    let defenderCount = 0;

    for (const playerId of xi) {
      const player = players.get(playerId);
      if (!player) continue;

      const position = positionAssignments.get(playerId) ?? player.positionMain;
      const effectiveSkill = player.getEffectiveSkill(position, xi, this.config);

      // Weight by position
      if (position === 'FWD' || position === 'MID') {
        totalAttack += effectiveSkill;
        attackerCount++;
      }
      if (position === 'DEF' || position === 'GK' || position === 'MID') {
        totalDefense += effectiveSkill;
        defenderCount++;
      }
    }

    // Average powers
    let attack = attackerCount > 0 ? totalAttack / attackerCount : 0;
    let defense = defenderCount > 0 ? totalDefense / defenderCount : 0;

    // Apply tactic modifiers
    const tacticMod = TACTIC_MODIFIERS[tactic];
    attack *= tacticMod.attackMultiplier;
    defense *= tacticMod.defenseMultiplier;

    // Home bonus
    if (isHome) {
      attack *= 1 + this.config.localBonus / 100;
      defense *= 1 + this.config.localBonus / 100;
    }

    // Morale bonus (0-100 scale, 50 is neutral)
    const moraleModifier = 1 + (morale - 50) / 500;
    attack *= moraleModifier;
    defense *= moraleModifier;

    return {
      attack: Math.round(attack * 10) / 10,
      defense: Math.round(defense * 10) / 10,
      overall: Math.round(((attack + defense) / 2) * 10) / 10,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  private initializeMatchState(
    match: IMatch,
    homePlayers: Map<string, Player>,
    awayPlayers: Map<string, Player>,
    homeClub: IClub,
    awayClub: IClub
  ): MatchState {
    // Calculate initial powers
    const homePower = this.calculateTeamPower(match.homeTeamSheet, homePlayers, true);
    const awayPower = this.calculateTeamPower(match.awayTeamSheet, awayPlayers, false);

    match.homeAttackPower = homePower.attack;
    match.homeDefensePower = homePower.defense;
    match.awayAttackPower = awayPower.attack;
    match.awayDefensePower = awayPower.defense;

    match.status = 'LIVE';
    match.currentMinute = 0;
    match.homeScore = 0;
    match.awayScore = 0;
    match.events = [];

    const playerMinutesPlayed = new Map<string, number>();
    const playerRatings = new Map<string, number[]>();

    // Initialize all players in both XIs
    [...match.homeTeamSheet.startingXI, ...match.awayTeamSheet.startingXI].forEach(
      (playerId) => {
        playerMinutesPlayed.set(playerId, 0);
        playerRatings.set(playerId, [6.5]); // Base rating
      }
    );

    return {
      match,
      homePlayers,
      awayPlayers,
      homeClub,
      awayClub,
      homeSubsRemaining: 5,
      awaySubsRemaining: 5,
      playerMinutesPlayed,
      playerRatings,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: TICK SIMULATION
  // ---------------------------------------------------------------------------

  private simulateTick(state: MatchState): TickResult {
    const { match } = state;
    const events: MatchEvent[] = [];

    // Update minutes played
    for (const playerId of match.homeTeamSheet.startingXI) {
      const current = state.playerMinutesPlayed.get(playerId) ?? 0;
      state.playerMinutesPlayed.set(playerId, current + this.config.tickMinutes);
    }
    for (const playerId of match.awayTeamSheet.startingXI) {
      const current = state.playerMinutesPlayed.get(playerId) ?? 0;
      state.playerMinutesPlayed.set(playerId, current + this.config.tickMinutes);
    }

    // Home attack phase
    const homeAttackResult = this.simulateAttackPhase(
      state,
      'HOME',
      match.homeAttackPower,
      match.awayDefensePower,
      match.homeTeamSheet,
      state.homePlayers
    );

    if (homeAttackResult.goal) {
      match.homeScore++;
      events.push(homeAttackResult.event!);
      this.updatePlayerRating(state, homeAttackResult.event!.playerId, 1.0);
      if (homeAttackResult.event!.assistPlayerId) {
        this.updatePlayerRating(state, homeAttackResult.event!.assistPlayerId, 0.5);
      }
    }

    // Away attack phase
    const awayAttackResult = this.simulateAttackPhase(
      state,
      'AWAY',
      match.awayAttackPower,
      match.homeDefensePower,
      match.awayTeamSheet,
      state.awayPlayers
    );

    if (awayAttackResult.goal) {
      match.awayScore++;
      events.push(awayAttackResult.event!);
      this.updatePlayerRating(state, awayAttackResult.event!.playerId, 1.0);
      if (awayAttackResult.event!.assistPlayerId) {
        this.updatePlayerRating(state, awayAttackResult.event!.assistPlayerId, 0.5);
      }
    }

    // Card simulation (lower probability)
    const cardEvent = this.simulateCardPhase(state, match.currentMinute);
    if (cardEvent) {
      events.push(cardEvent);
      this.updatePlayerRating(
        state,
        cardEvent.playerId,
        cardEvent.type === 'RED' ? -2.0 : -0.5
      );
    }

    // Add events to match
    match.events.push(...events);

    // Advance time
    match.currentMinute += this.config.tickMinutes;

    return {
      minute: match.currentMinute,
      events,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: ATTACK PHASE SIMULATION
  // ---------------------------------------------------------------------------

  private simulateAttackPhase(
    state: MatchState,
    _side: 'HOME' | 'AWAY',
    attackPower: number,
    defensePower: number,
    teamSheet: ITeamSheet,
    players: Map<string, Player>
  ): { goal: boolean; event?: MatchEvent } {
    // Calculate power delta
    const delta = attackPower - defensePower;

    // Base goal chance (per tick)
    // At even power (delta=0), roughly 2-3% chance per tick = ~3 goals per match
    let goalChance = 2.5 + delta * 0.3;

    // Apply tactic modifier
    goalChance += TACTIC_MODIFIERS[teamSheet.tactic].goalChanceModifier * 0.1;

    // Clamp to reasonable range
    goalChance = Math.max(0.5, Math.min(10, goalChance));

    // RNG roll
    const roll = this.rng() * 100;

    if (roll < goalChance) {
      // GOAL!
      const scorer = this.selectScorer(teamSheet, players);
      const assister = this.selectAssister(teamSheet, players, scorer?.id);

      if (scorer) {
        const event: MatchEvent = {
          minute: state.match.currentMinute,
          type: 'GOAL',
          playerId: scorer.id,
          assistPlayerId: assister?.id,
        };

        return { goal: true, event };
      }
    }

    return { goal: false };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: PLAYER SELECTION FOR EVENTS
  // ---------------------------------------------------------------------------

  private selectScorer(
    teamSheet: ITeamSheet,
    players: Map<string, Player>
  ): Player | null {
    // Weight by position and skill
    const candidates: { player: Player; weight: number }[] = [];

    for (const playerId of teamSheet.startingXI) {
      const player = players.get(playerId);
      if (!player) continue;

      const position = teamSheet.positionAssignments.get(playerId) ?? player.positionMain;
      let weight = player.skillBase;

      // Position weights for scoring
      switch (position) {
        case 'FWD':
          weight *= 3.0;
          break;
        case 'MID':
          weight *= 1.5;
          break;
        case 'DEF':
          weight *= 0.5;
          break;
        case 'GK':
          weight *= 0.01; // Very rare
          break;
      }

      candidates.push({ player, weight });
    }

    return this.weightedRandomSelect(candidates);
  }

  private selectAssister(
    teamSheet: ITeamSheet,
    players: Map<string, Player>,
    scorerId?: string
  ): Player | null {
    // 70% chance of having an assist
    if (this.rng() > 0.7) return null;

    const candidates: { player: Player; weight: number }[] = [];

    for (const playerId of teamSheet.startingXI) {
      if (playerId === scorerId) continue;

      const player = players.get(playerId);
      if (!player) continue;

      const position = teamSheet.positionAssignments.get(playerId) ?? player.positionMain;
      let weight = player.skillBase;

      // Position weights for assisting
      switch (position) {
        case 'MID':
          weight *= 2.5;
          break;
        case 'FWD':
          weight *= 2.0;
          break;
        case 'DEF':
          weight *= 1.0;
          break;
        case 'GK':
          weight *= 0.1;
          break;
      }

      candidates.push({ player, weight });
    }

    return this.weightedRandomSelect(candidates);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: CARD SIMULATION
  // ---------------------------------------------------------------------------

  private simulateCardPhase(state: MatchState, minute: number): MatchEvent | null {
    // ~2% chance of any card per tick
    if (this.rng() > 0.02) return null;

    // Select which team
    const isHome = this.rng() < 0.5;
    const teamSheet = isHome
      ? state.match.homeTeamSheet
      : state.match.awayTeamSheet;
    const players = isHome ? state.homePlayers : state.awayPlayers;

    // Select player (defenders more likely)
    const candidates: { player: Player; weight: number }[] = [];

    for (const playerId of teamSheet.startingXI) {
      const player = players.get(playerId);
      if (!player) continue;

      const position = teamSheet.positionAssignments.get(playerId) ?? player.positionMain;
      let weight = 1;

      if (position === 'DEF') weight = 2;
      if (position === 'MID') weight = 1.5;

      candidates.push({ player, weight });
    }

    const cardedPlayer = this.weightedRandomSelect(candidates);
    if (!cardedPlayer) return null;

    // 90% yellow, 10% red
    const isRed = this.rng() < 0.1;

    return {
      minute,
      type: isRed ? 'RED' : 'YELLOW',
      playerId: cardedPlayer.id,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: UTILITIES
  // ---------------------------------------------------------------------------

  private weightedRandomSelect<T>(
    candidates: { player: T; weight: number }[]
  ): T | null {
    if (candidates.length === 0) return null;

    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let roll = this.rng() * totalWeight;

    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate.player;
    }

    return candidates[candidates.length - 1].player;
  }

  private updatePlayerRating(
    state: MatchState,
    playerId: string,
    delta: number
  ): void {
    const ratings = state.playerRatings.get(playerId) ?? [6.5];
    const currentAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    ratings.push(Math.max(1, Math.min(10, currentAvg + delta)));
    state.playerRatings.set(playerId, ratings);
  }

  private generateMatchResult(state: MatchState): MatchResult {
    const playerRatings = new Map<string, number>();

    for (const [playerId, ratings] of state.playerRatings) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      playerRatings.set(playerId, Math.round(avg * 10) / 10);
    }

    return {
      matchId: state.match.id,
      homeScore: state.match.homeScore,
      awayScore: state.match.awayScore,
      events: state.match.events,
      playerRatings,
    };
  }

  private createSeededRng(seed: number): () => number {
    // Simple seeded RNG (Mulberry32)
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

// -----------------------------------------------------------------------------
// LIVE MATCH CONTROLLER
// For user-controlled matches with real-time updates
// -----------------------------------------------------------------------------

interface TickResult {
  minute: number;
  events: MatchEvent[];
  homeScore: number;
  awayScore: number;
}

export class LiveMatchController {
  private state: MatchState;
  private config: MatchEngineConfig;
  private rng: () => number;
  private currentSpeed: MatchSpeed = 'PAUSED';
  private tickInterval: number | null = null;
  private onTickCallback: ((result: TickResult) => void) | null = null;
  private onMatchEndCallback: ((result: MatchResult) => void) | null = null;

  constructor(
    state: MatchState,
    config: MatchEngineConfig,
    rng: () => number
  ) {
    this.state = state;
    this.config = config;
    this.rng = rng;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC: MATCH CONTROL
  // ---------------------------------------------------------------------------

  getMatchState(): IMatch {
    return { ...this.state.match };
  }

  setSpeed(speed: MatchSpeed): void {
    this.currentSpeed = speed;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    if (speed === 'PAUSED') return;

    if (speed === 'INSTANT') {
      this.runToEnd();
      return;
    }

    const intervalMs = speed === 'X1' ? 1000 : 200;

    this.tickInterval = setInterval(() => {
      this.advanceTick();
    }, intervalMs) as unknown as number;
  }

  onTick(callback: (result: TickResult) => void): void {
    this.onTickCallback = callback;
  }

  onMatchEnd(callback: (result: MatchResult) => void): void {
    this.onMatchEndCallback = callback;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC: USER ACTIONS (Quick Subs, Tactic Change)
  // ---------------------------------------------------------------------------

  makeSubstitution(
    side: 'HOME' | 'AWAY',
    playerOutId: string,
    playerInId: string
  ): boolean {
    const teamSheet =
      side === 'HOME'
        ? this.state.match.homeTeamSheet
        : this.state.match.awayTeamSheet;

    const subsRemaining =
      side === 'HOME' ? this.state.homeSubsRemaining : this.state.awaySubsRemaining;

    if (subsRemaining <= 0) return false;
    if (!teamSheet.startingXI.includes(playerOutId)) return false;
    if (!teamSheet.substitutes.includes(playerInId)) return false;

    // Perform substitution
    const outIndex = teamSheet.startingXI.indexOf(playerOutId);
    teamSheet.startingXI[outIndex] = playerInId;

    const inIndex = teamSheet.substitutes.indexOf(playerInId);
    teamSheet.substitutes.splice(inIndex, 1);

    // Transfer position assignment
    const position = teamSheet.positionAssignments.get(playerOutId);
    if (position) {
      teamSheet.positionAssignments.delete(playerOutId);
      teamSheet.positionAssignments.set(playerInId, position);
    }

    // Decrement subs
    if (side === 'HOME') {
      this.state.homeSubsRemaining--;
    } else {
      this.state.awaySubsRemaining--;
    }

    // Add event
    this.state.match.events.push({
      minute: this.state.match.currentMinute,
      type: 'SUBSTITUTION',
      playerId: playerInId,
      details: `${playerOutId} OFF, ${playerInId} ON`,
    });

    // Recalculate powers
    this.recalculatePowers();

    return true;
  }

  changeTactic(side: 'HOME' | 'AWAY', tactic: Tactic): void {
    const teamSheet =
      side === 'HOME'
        ? this.state.match.homeTeamSheet
        : this.state.match.awayTeamSheet;

    teamSheet.tactic = tactic;
    this.recalculatePowers();
  }

  // ---------------------------------------------------------------------------
  // PRIVATE: TICK MANAGEMENT
  // ---------------------------------------------------------------------------

  private advanceTick(): void {
    if (this.state.match.currentMinute >= 90) {
      // Injury time
      const injuryTime = Math.floor(this.rng() * 5) + 1;
      if (this.state.match.currentMinute >= 90 + injuryTime) {
        this.endMatch();
        return;
      }
    }

    const result = this.simulateTick();

    if (this.onTickCallback) {
      this.onTickCallback(result);
    }
  }

  private runToEnd(): void {
    while (this.state.match.currentMinute < 95) {
      this.advanceTick();
    }
    this.endMatch();
  }

  private endMatch(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.state.match.status = 'FINISHED';

    if (this.onMatchEndCallback) {
      this.onMatchEndCallback(this.generateMatchResult());
    }
  }

  private simulateTick(): TickResult {
    // Copy of MatchEngine.simulateTick logic but using this.state
    const { match } = this.state;
    const events: MatchEvent[] = [];

    // Update minutes played
    for (const playerId of match.homeTeamSheet.startingXI) {
      const current = this.state.playerMinutesPlayed.get(playerId) ?? 0;
      this.state.playerMinutesPlayed.set(playerId, current + this.config.tickMinutes);
    }
    for (const playerId of match.awayTeamSheet.startingXI) {
      const current = this.state.playerMinutesPlayed.get(playerId) ?? 0;
      this.state.playerMinutesPlayed.set(playerId, current + this.config.tickMinutes);
    }

    // Home attack
    const homeGoal = this.simulateAttackPhase('HOME');
    if (homeGoal) {
      match.homeScore++;
      events.push(homeGoal);
    }

    // Away attack
    const awayGoal = this.simulateAttackPhase('AWAY');
    if (awayGoal) {
      match.awayScore++;
      events.push(awayGoal);
    }

    match.events.push(...events);
    match.currentMinute += this.config.tickMinutes;

    return {
      minute: match.currentMinute,
      events,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    };
  }

  private simulateAttackPhase(side: 'HOME' | 'AWAY'): MatchEvent | null {
    const { match } = this.state;
    const attackPower =
      side === 'HOME' ? match.homeAttackPower : match.awayAttackPower;
    const defensePower =
      side === 'HOME' ? match.awayDefensePower : match.homeDefensePower;
    const teamSheet =
      side === 'HOME' ? match.homeTeamSheet : match.awayTeamSheet;
    const players =
      side === 'HOME' ? this.state.homePlayers : this.state.awayPlayers;

    const delta = attackPower - defensePower;
    let goalChance = 2.5 + delta * 0.3;
    goalChance += TACTIC_MODIFIERS[teamSheet.tactic].goalChanceModifier * 0.1;
    goalChance = Math.max(0.5, Math.min(10, goalChance));

    if (this.rng() * 100 < goalChance) {
      const scorer = this.selectScorer(teamSheet, players);
      if (scorer) {
        return {
          minute: match.currentMinute,
          type: 'GOAL',
          playerId: scorer.id,
        };
      }
    }

    return null;
  }

  private selectScorer(
    teamSheet: ITeamSheet,
    players: Map<string, Player>
  ): Player | null {
    const candidates: { player: Player; weight: number }[] = [];

    for (const playerId of teamSheet.startingXI) {
      const player = players.get(playerId);
      if (!player) continue;

      const position = teamSheet.positionAssignments.get(playerId) ?? player.positionMain;
      let weight = player.skillBase;

      switch (position) {
        case 'FWD':
          weight *= 3.0;
          break;
        case 'MID':
          weight *= 1.5;
          break;
        case 'DEF':
          weight *= 0.5;
          break;
        case 'GK':
          weight *= 0.01;
          break;
      }

      candidates.push({ player, weight });
    }

    if (candidates.length === 0) return null;

    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let roll = this.rng() * totalWeight;

    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate.player;
    }

    return candidates[candidates.length - 1].player;
  }

  private recalculatePowers(): void {
    const { match } = this.state;

    // Simplified recalculation
    const homePlayers = this.state.homePlayers;
    const awayPlayers = this.state.awayPlayers;

    let homeAttack = 0;
    let homeDefense = 0;
    let awayAttack = 0;
    let awayDefense = 0;

    for (const playerId of match.homeTeamSheet.startingXI) {
      const player = homePlayers.get(playerId);
      if (!player) continue;
      const skill = player.skillBase;
      homeAttack += skill;
      homeDefense += skill;
    }

    for (const playerId of match.awayTeamSheet.startingXI) {
      const player = awayPlayers.get(playerId);
      if (!player) continue;
      const skill = player.skillBase;
      awayAttack += skill;
      awayDefense += skill;
    }

    match.homeAttackPower = (homeAttack / 11) * (1 + this.config.localBonus / 100);
    match.homeDefensePower = (homeDefense / 11) * (1 + this.config.localBonus / 100);
    match.awayAttackPower = awayAttack / 11;
    match.awayDefensePower = awayDefense / 11;
  }

  private generateMatchResult(): MatchResult {
    const playerRatings = new Map<string, number>();

    for (const [playerId, ratings] of this.state.playerRatings) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      playerRatings.set(playerId, Math.round(avg * 10) / 10);
    }

    return {
      matchId: this.state.match.id,
      homeScore: this.state.match.homeScore,
      awayScore: this.state.match.awayScore,
      events: this.state.match.events,
      playerRatings,
    };
  }
}

// -----------------------------------------------------------------------------
// SIMULCAST CONTROLLER
// Manages multiple matches running simultaneously
// -----------------------------------------------------------------------------

export interface SimulcastMatch {
  matchId: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: 'LIVE' | 'FINISHED';
  isUserMatch: boolean;
  recentGoal: boolean; // For flash animation
}

export class SimulcastController {
  private liveMatches: Map<string, LiveMatchController> = new Map();
  private matchStates: Map<string, SimulcastMatch> = new Map();
  private currentSpeed: MatchSpeed = 'PAUSED';
  private masterTickInterval: number | null = null;
  private onUpdateCallback: ((matches: SimulcastMatch[]) => void) | null = null;
  private onAllFinishedCallback: ((results: MatchResult[]) => void) | null = null;
  private finishedResults: MatchResult[] = [];

  addMatch(
    controller: LiveMatchController,
    homeCode: string,
    awayCode: string,
    isUserMatch: boolean
  ): void {
    const state = controller.getMatchState();
    this.liveMatches.set(state.id, controller);

    this.matchStates.set(state.id, {
      matchId: state.id,
      homeCode,
      awayCode,
      homeScore: 0,
      awayScore: 0,
      minute: 0,
      status: 'LIVE',
      isUserMatch,
      recentGoal: false,
    });

    controller.onTick((result) => {
      const matchState = this.matchStates.get(state.id);
      if (matchState) {
        matchState.homeScore = result.homeScore;
        matchState.awayScore = result.awayScore;
        matchState.minute = result.minute;
        matchState.recentGoal = result.events.some((e) => e.type === 'GOAL');

        // Clear recentGoal after animation time
        if (matchState.recentGoal) {
          setTimeout(() => {
            matchState.recentGoal = false;
          }, 500);
        }
      }
      this.notifyUpdate();
    });

    controller.onMatchEnd((result) => {
      const matchState = this.matchStates.get(state.id);
      if (matchState) {
        matchState.status = 'FINISHED';
      }
      this.finishedResults.push(result);
      this.checkAllFinished();
    });
  }

  setSpeed(speed: MatchSpeed): void {
    this.currentSpeed = speed;

    for (const controller of this.liveMatches.values()) {
      controller.setSpeed(speed);
    }
  }

  onUpdate(callback: (matches: SimulcastMatch[]) => void): void {
    this.onUpdateCallback = callback;
  }

  onAllFinished(callback: (results: MatchResult[]) => void): void {
    this.onAllFinishedCallback = callback;
  }

  getUserMatchController(): LiveMatchController | null {
    for (const [matchId, state] of this.matchStates) {
      if (state.isUserMatch) {
        return this.liveMatches.get(matchId) ?? null;
      }
    }
    return null;
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(Array.from(this.matchStates.values()));
    }
  }

  private checkAllFinished(): void {
    const allFinished = Array.from(this.matchStates.values()).every(
      (m) => m.status === 'FINISHED'
    );

    if (allFinished && this.onAllFinishedCallback) {
      this.onAllFinishedCallback(this.finishedResults);
    }
  }
}
