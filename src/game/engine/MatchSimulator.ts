/**
 * MatchSimulator - Realistic tick-based match simulation
 *
 * Core philosophy: Single skill system with modifiers
 * - Position fit: 100% / 95% / 75% / 5%
 * - Form arrows: ±10%
 * - Home advantage: +10%
 *
 * Goal timing follows realistic football patterns:
 * - Lower probability in first 10 minutes (teams settling)
 * - Peak scoring around 45', 75-90' (end of halves)
 * - Goals more likely when trailing (pressing)
 * - Fatigue increases chances late in match
 */

export interface MatchTeam {
  clubId: string;
  clubName: string;
  players: MatchPlayer[];
  formation: string;
  tactic: 'DEFENSIVE' | 'BALANCED' | 'ATTACKING';
}

export interface MatchPlayer {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  skill: number;
  form: string; // UP, STABLE, DOWN
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'YELLOW' | 'RED' | 'SUBSTITUTION' | 'CHANCE' | 'SAVE' | 'INJURY';
  teamIndex: 0 | 1; // 0 = home, 1 = away
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  description?: string;
  injuryWeeks?: number; // For INJURY events, how many weeks the player is out
}

export interface MatchState {
  minute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  isFinished: boolean;
  homePossession: number;
  homeShots: number;
  awayShots: number;
  // New: momentum and match flow
  momentum: number; // -100 (away) to +100 (home)
  homeXG: number;   // Expected goals
  awayXG: number;
  isHalfTime: boolean;
  // Player tracking for stats
  homeLineup: string[];  // IDs of players who started
  awayLineup: string[];
  homeSubsIn: string[];  // IDs of players who came on as subs
  awaySubsIn: string[];
  // Injuries during match (player IDs of injured players)
  injuries: Array<{ playerId: string; weeks: number }>;
  // Cards tracking - playerIds who have yellows in this match
  yellowCards: string[];
  // Players sent off (cannot participate further in match)
  sentOff: string[];
}

export interface MatchConfig {
  tickMinutes: number;      // Minutes per tick (default: 1 for realistic flow)
  homeAdvantage: number;    // Bonus for home team (default: 0.10)
  goalChanceBase: number;   // Base chance per minute (default: 0.025)
}

const DEFAULT_CONFIG: MatchConfig = {
  tickMinutes: 1,           // 1 minute per tick for dynamic flow
  homeAdvantage: 0.10,
  goalChanceBase: 0.025,    // ~2.5% base chance per minute = ~2.25 goals per match avg
};

// Realistic goal probability by minute (based on real football data)
// Higher at end of halves, lower at start
const MINUTE_GOAL_MODIFIER: Record<number, number> = {};
// Build the modifier map
(() => {
  for (let m = 1; m <= 90; m++) {
    if (m <= 5) {
      // Very low - match just started
      MINUTE_GOAL_MODIFIER[m] = 0.4;
    } else if (m <= 15) {
      // Low - teams settling
      MINUTE_GOAL_MODIFIER[m] = 0.7;
    } else if (m <= 30) {
      // Normal
      MINUTE_GOAL_MODIFIER[m] = 1.0;
    } else if (m <= 40) {
      // Slightly higher - teams pressing before half
      MINUTE_GOAL_MODIFIER[m] = 1.1;
    } else if (m <= 45) {
      // Peak - end of first half
      MINUTE_GOAL_MODIFIER[m] = 1.3;
    } else if (m <= 50) {
      // Lower - second half starting
      MINUTE_GOAL_MODIFIER[m] = 0.8;
    } else if (m <= 60) {
      // Normal
      MINUTE_GOAL_MODIFIER[m] = 1.0;
    } else if (m <= 75) {
      // Higher - subs made, game opening up
      MINUTE_GOAL_MODIFIER[m] = 1.15;
    } else if (m <= 85) {
      // High - fatigue, desperate pressing
      MINUTE_GOAL_MODIFIER[m] = 1.25;
    } else {
      // Highest - injury time mentality
      MINUTE_GOAL_MODIFIER[m] = 1.4;
    }
  }
})();

// Form arrow modifiers
const FORM_MODIFIERS: Record<string, number> = {
  'UP': 1.10,
  'SLIGHT_UP': 1.05,
  'STABLE': 1.00,
  'MID': 1.00,
  'SLIGHT_DOWN': 0.95,
  'DOWN': 0.90,
};

/**
 * Calculate team power based on players and formation
 */
function calculateTeamPower(team: MatchTeam, isHome: boolean, config: MatchConfig): { attack: number; defense: number } {
  const players = team.players;

  // Group players by position
  const gk = players.filter(p => p.position === 'GK');
  const def = players.filter(p => p.position === 'DEF');
  const mid = players.filter(p => p.position === 'MID');
  const fwd = players.filter(p => p.position === 'FWD');

  // Calculate average skills with form modifiers
  const avgWithForm = (arr: MatchPlayer[]) => {
    if (arr.length === 0) return 50;
    const sum = arr.reduce((s, p) => s + p.skill * (FORM_MODIFIERS[p.form] || 1), 0);
    return sum / arr.length;
  };

  const gkPower = avgWithForm(gk);
  const defPower = avgWithForm(def);
  const midPower = avgWithForm(mid);
  const fwdPower = avgWithForm(fwd);

  // Tactic modifiers
  const tacticMod = {
    'DEFENSIVE': { attack: 0.85, defense: 1.15 },
    'BALANCED': { attack: 1.00, defense: 1.00 },
    'ATTACKING': { attack: 1.15, defense: 0.85 },
  }[team.tactic];

  // Calculate attack and defense power
  let attack = (fwdPower * 0.5 + midPower * 0.35 + defPower * 0.15) * tacticMod.attack;
  let defense = (gkPower * 0.3 + defPower * 0.45 + midPower * 0.25) * tacticMod.defense;

  // Home advantage
  if (isHome) {
    attack *= (1 + config.homeAdvantage);
    defense *= (1 + config.homeAdvantage / 2);
  }

  return { attack, defense };
}

/**
 * Simulate a single tick (1 minute of play) - Realistic simulation
 */
function simulateTick(
  state: MatchState,
  homeTeam: MatchTeam,
  awayTeam: MatchTeam,
  homePower: { attack: number; defense: number },
  awayPower: { attack: number; defense: number },
  config: MatchConfig
): MatchState {
  const newState = {
    ...state,
    events: [...state.events],
    isHalfTime: false,
  };
  newState.minute += config.tickMinutes;

  // Handle half-time
  if (newState.minute === 45) {
    newState.isHalfTime = true;
  }

  // Skip action during half-time break (45-46)
  if (newState.minute === 46) {
    return newState;
  }

  // Calculate possession with some variance
  const homeMid = homeTeam.players.filter(p => p.position === 'MID').reduce((s, p) => s + p.skill, 0);
  const awayMid = awayTeam.players.filter(p => p.position === 'MID').reduce((s, p) => s + p.skill, 0);
  const basePossession = (homeMid / (homeMid + awayMid + 1)) * 100;
  // Add variance based on momentum
  const momentumEffect = (newState.momentum || 0) * 0.1;
  newState.homePossession = Math.round(Math.max(30, Math.min(70, basePossession + momentumEffect + (Math.random() - 0.5) * 10)));

  // Get minute modifier for realistic timing
  const minuteMod = MINUTE_GOAL_MODIFIER[newState.minute] || 1.0;

  // Trailing team modifier - teams losing push harder
  const scoreDiff = newState.homeScore - newState.awayScore;
  const homeTrailingMod = scoreDiff < 0 ? 1 + Math.abs(scoreDiff) * 0.1 : 1;
  const awayTrailingMod = scoreDiff > 0 ? 1 + Math.abs(scoreDiff) * 0.1 : 1;

  // Calculate goal chances (use Math.max to prevent division by zero)
  const homeGoalChance = config.goalChanceBase
    * (homePower.attack / Math.max(1, awayPower.defense))
    * minuteMod
    * homeTrailingMod;

  const awayGoalChance = config.goalChanceBase
    * (awayPower.attack / Math.max(1, homePower.defense))
    * minuteMod
    * awayTrailingMod
    * 0.9; // Away disadvantage

  // Home team attack
  if (Math.random() < homeGoalChance * 2) { // Chance of having a shot
    newState.homeShots++;

    // Calculate xG for this chance
    const chanceQuality = (homePower.attack / Math.max(1, awayPower.defense)) * 0.15;
    newState.homeXG = (newState.homeXG || 0) + chanceQuality;

    // Did it go in?
    const conversionRate = 0.35 + (homePower.attack - 50) * 0.003; // Better attack = better conversion
    if (Math.random() < conversionRate) {
      // GOAL!
      newState.homeScore++;
      const scorer = pickScorer(homeTeam);
      const assister = Math.random() < 0.65 ? pickAssister(homeTeam, scorer.id) : null;

      newState.events.push({
        minute: newState.minute,
        type: 'GOAL',
        teamIndex: 0,
        playerId: scorer.id,
        playerName: scorer.name,
        assistPlayerId: assister?.id,
        assistPlayerName: assister?.name,
      });

      // Momentum shift after goal
      newState.momentum = Math.min(100, (newState.momentum || 0) + 30);
    } else if (Math.random() < 0.3) {
      // Good chance but saved/missed - add event for excitement
      const shooter = pickScorer(homeTeam);
      newState.events.push({
        minute: newState.minute,
        type: 'CHANCE',
        teamIndex: 0,
        playerId: shooter.id,
        playerName: shooter.name,
        description: Math.random() < 0.5 ? 'Ocasion clara!' : 'Tiro peligroso',
      });
    }
  }

  // Away team attack
  if (Math.random() < awayGoalChance * 2) {
    newState.awayShots++;

    const chanceQuality = (awayPower.attack / Math.max(1, homePower.defense)) * 0.15;
    newState.awayXG = (newState.awayXG || 0) + chanceQuality;

    const conversionRate = 0.32 + (awayPower.attack - 50) * 0.003;
    if (Math.random() < conversionRate) {
      newState.awayScore++;
      const scorer = pickScorer(awayTeam);
      const assister = Math.random() < 0.65 ? pickAssister(awayTeam, scorer.id) : null;

      newState.events.push({
        minute: newState.minute,
        type: 'GOAL',
        teamIndex: 1,
        playerId: scorer.id,
        playerName: scorer.name,
        assistPlayerId: assister?.id,
        assistPlayerName: assister?.name,
      });

      newState.momentum = Math.max(-100, (newState.momentum || 0) - 30);
    } else if (Math.random() < 0.3) {
      const shooter = pickScorer(awayTeam);
      newState.events.push({
        minute: newState.minute,
        type: 'CHANCE',
        teamIndex: 1,
        playerId: shooter.id,
        playerName: shooter.name,
        description: Math.random() < 0.5 ? 'Ocasion clara!' : 'Tiro peligroso',
      });
    }
  }

  // Momentum naturally decays toward 0
  if (newState.momentum) {
    newState.momentum = newState.momentum * 0.98;
  }

  // Yellow/Red card chance (more realistic - rarer, more likely in physical moments)
  const cardChance = newState.minute > 60 ? 0.008 : 0.005; // More cards late in game
  if (Math.random() < cardChance) {
    const teamIndex = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
    const team = teamIndex === 0 ? homeTeam : awayTeam;

    // Filter out already sent-off players
    const eligiblePlayers = team.players.filter(p => !newState.sentOff.includes(p.id));
    if (eligiblePlayers.length > 0) {
      // Defenders and midfielders more likely to get carded
      const cardWeights: Record<string, number> = { GK: 1, DEF: 40, MID: 35, FWD: 20 };
      const weighted = eligiblePlayers.map(p => ({ player: p, weight: cardWeights[p.position] || 10 }));
      const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
      let random = Math.random() * totalWeight;
      let cardedPlayer = eligiblePlayers[0];
      for (const { player, weight } of weighted) {
        random -= weight;
        if (random <= 0) {
          cardedPlayer = player;
          break;
        }
      }

      // Check if second yellow (becomes red)
      const hasYellow = newState.yellowCards.includes(cardedPlayer.id);

      // Small chance of straight red (5%)
      const isStraightRed = !hasYellow && Math.random() < 0.05;

      if (hasYellow) {
        // Second yellow = red card
        newState.events.push({
          minute: newState.minute,
          type: 'YELLOW',
          teamIndex,
          playerId: cardedPlayer.id,
          playerName: cardedPlayer.name,
          description: 'Segunda amarilla',
        });
        newState.events.push({
          minute: newState.minute,
          type: 'RED',
          teamIndex,
          playerId: cardedPlayer.id,
          playerName: cardedPlayer.name,
          description: 'Expulsado por doble amarilla',
        });
        newState.sentOff.push(cardedPlayer.id);
      } else if (isStraightRed) {
        // Straight red card
        newState.events.push({
          minute: newState.minute,
          type: 'RED',
          teamIndex,
          playerId: cardedPlayer.id,
          playerName: cardedPlayer.name,
          description: 'Roja directa',
        });
        newState.sentOff.push(cardedPlayer.id);
      } else {
        // Normal yellow card
        newState.events.push({
          minute: newState.minute,
          type: 'YELLOW',
          teamIndex,
          playerId: cardedPlayer.id,
          playerName: cardedPlayer.name,
        });
        newState.yellowCards.push(cardedPlayer.id);
      }
    }
  }

  // Injury chance (~0.3% per minute = ~1-2 injuries per 5 matches)
  const injuryChance = 0.003;
  if (Math.random() < injuryChance) {
    const teamIndex = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
    const team = teamIndex === 0 ? homeTeam : awayTeam;

    // Pick random player (any position can get injured)
    const injuredPlayer = team.players[Math.floor(Math.random() * team.players.length)];

    // Check if already injured in this match
    const alreadyInjured = newState.injuries.some(inj => inj.playerId === injuredPlayer.id);
    if (!alreadyInjured) {
      // Determine injury severity (1-6 weeks, weighted towards minor injuries)
      const severityRoll = Math.random();
      let weeks: number;
      if (severityRoll < 0.5) weeks = 1;       // 50% - 1 week (minor)
      else if (severityRoll < 0.75) weeks = 2; // 25% - 2 weeks
      else if (severityRoll < 0.9) weeks = 3;  // 15% - 3 weeks
      else if (severityRoll < 0.97) weeks = 4; // 7% - 4 weeks
      else weeks = Math.floor(Math.random() * 3) + 5; // 3% - 5-7 weeks (serious)

      newState.injuries.push({ playerId: injuredPlayer.id, weeks });

      newState.events.push({
        minute: newState.minute,
        type: 'INJURY',
        teamIndex,
        playerId: injuredPlayer.id,
        playerName: injuredPlayer.name,
        injuryWeeks: weeks,
        description: weeks <= 2 ? 'Lesion leve' : weeks <= 4 ? 'Lesion muscular' : 'Lesion grave',
      });
    }
  }

  // Check if match is finished
  if (newState.minute >= 90) {
    newState.isFinished = true;
  }

  return newState;
}

/**
 * Pick a goal scorer weighted by position and skill
 */
function pickScorer(team: MatchTeam): MatchPlayer {
  const weights: Record<string, number> = {
    'FWD': 50,
    'MID': 30,
    'DEF': 15,
    'GK': 1,
  };

  const weighted = team.players.map(p => ({
    player: p,
    weight: (weights[p.position] || 10) * (p.skill / 70),
  }));

  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { player, weight } of weighted) {
    random -= weight;
    if (random <= 0) return player;
  }

  return team.players[0];
}

/**
 * Pick an assister (midfielders more likely)
 */
function pickAssister(team: MatchTeam, excludeId: string): MatchPlayer | null {
  const eligible = team.players.filter(p => p.id !== excludeId);
  if (eligible.length === 0) return null;

  const weights: Record<string, number> = {
    'MID': 50,
    'FWD': 30,
    'DEF': 15,
    'GK': 2,
  };

  const weighted = eligible.map(p => ({
    player: p,
    weight: (weights[p.position] || 10) * (p.skill / 70),
  }));

  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { player, weight } of weighted) {
    random -= weight;
    if (random <= 0) return player;
  }

  return eligible[0];
}

/**
 * Create initial match state
 */
export function createMatchState(
  homeLineup: string[] = [],
  awayLineup: string[] = []
): MatchState {
  return {
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    events: [],
    isFinished: false,
    homePossession: 50,
    homeShots: 0,
    awayShots: 0,
    momentum: 0,
    homeXG: 0,
    awayXG: 0,
    isHalfTime: false,
    homeLineup,
    awayLineup,
    homeSubsIn: [],
    awaySubsIn: [],
    injuries: [],
    yellowCards: [],
    sentOff: [],
  };
}

/**
 * Simulate entire match instantly
 */
export function simulateMatch(
  homeTeam: MatchTeam,
  awayTeam: MatchTeam,
  config: Partial<MatchConfig> = {}
): MatchState {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const homePower = calculateTeamPower(homeTeam, true, fullConfig);
  const awayPower = calculateTeamPower(awayTeam, false, fullConfig);

  // Extract player IDs for lineup tracking
  const homeLineup = homeTeam.players.map(p => p.id);
  const awayLineup = awayTeam.players.map(p => p.id);

  let state = createMatchState(homeLineup, awayLineup);

  while (!state.isFinished) {
    state = simulateTick(state, homeTeam, awayTeam, homePower, awayPower, fullConfig);
  }

  return state;
}

/**
 * Create a match simulator generator for tick-by-tick simulation
 */
export function* createMatchSimulator(
  homeTeam: MatchTeam,
  awayTeam: MatchTeam,
  config: Partial<MatchConfig> = {}
): Generator<MatchState, MatchState, void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const homePower = calculateTeamPower(homeTeam, true, fullConfig);
  const awayPower = calculateTeamPower(awayTeam, false, fullConfig);

  // Extract player IDs for lineup tracking
  const homeLineup = homeTeam.players.map(p => p.id);
  const awayLineup = awayTeam.players.map(p => p.id);

  let state = createMatchState(homeLineup, awayLineup);
  yield state;

  while (!state.isFinished) {
    state = simulateTick(state, homeTeam, awayTeam, homePower, awayPower, fullConfig);
    yield state;
  }

  return state;
}

/**
 * Convert save data players to match players
 */
export function createMatchTeam(
  clubId: string,
  clubName: string,
  players: any[],
  formation: string = '4-3-3',
  tactic: 'DEFENSIVE' | 'BALANCED' | 'ATTACKING' = 'BALANCED',
  currentDate?: string
): MatchTeam {
  // Select best 11 players based on position needs
  const positionNeeds: Record<string, number> = {
    '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
    '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  }[formation] || { GK: 1, DEF: 4, MID: 3, FWD: 3 };

  const selectedPlayers: MatchPlayer[] = [];

  // Filter available players (not injured, not suspended)
  const isAvailable = (p: any) => {
    if (!currentDate) return true;
    if (p.injuredUntil && p.injuredUntil > currentDate) return false;
    if (p.suspendedUntil && p.suspendedUntil > currentDate) return false;
    return true;
  };

  // Sort available players by skill within each position
  const byPosition: Record<string, any[]> = {
    GK: players.filter(p => p.positionMain === 'GK' && isAvailable(p)).sort((a, b) => b.skillBase - a.skillBase),
    DEF: players.filter(p => p.positionMain === 'DEF' && isAvailable(p)).sort((a, b) => b.skillBase - a.skillBase),
    MID: players.filter(p => p.positionMain === 'MID' && isAvailable(p)).sort((a, b) => b.skillBase - a.skillBase),
    FWD: players.filter(p => p.positionMain === 'FWD' && isAvailable(p)).sort((a, b) => b.skillBase - a.skillBase),
  };

  // Select players for each position
  for (const [pos, count] of Object.entries(positionNeeds)) {
    const available = byPosition[pos] || [];
    for (let i = 0; i < count && i < available.length; i++) {
      const p = available[i];
      selectedPlayers.push({
        id: p.id,
        name: p.name,
        position: p.positionMain,
        skill: p.skillBase,
        form: p.conditionArrow || 'STABLE',
      });
    }
  }

  return {
    clubId,
    clubName,
    players: selectedPlayers,
    formation,
    tactic,
  };
}
