/**
 * PlayerDevelopment - Handles player aging, skill growth/decline, and form changes
 *
 * Key mechanics:
 * - Young players (< 24) can grow towards their potential
 * - Peak age is 24-30 (stable skills)
 * - Players > 30 start declining
 * - Form arrows affect short-term performance
 * - Playing time affects development rate
 */

import type { IPlayer, ConditionArrow } from '../../types';

// Age brackets for development
const YOUTH_MAX_AGE = 23;
const PEAK_START_AGE = 24;
const PEAK_END_AGE = 30;
const VETERAN_START_AGE = 31;
const RETIREMENT_MIN_AGE = 33;

/**
 * Process end-of-season development for all players
 * Called when season advances
 */
export function processSeasonDevelopment(players: IPlayer[]): void {
  for (const player of players) {
    // Age the player by 1 year
    player.age++;

    // Calculate skill change based on age and potential
    const skillChange = calculateSkillChange(player);
    player.skillBase = Math.max(1, Math.min(99, player.skillBase + skillChange));

    // Update market value based on new skill and age
    player.marketValue = calculateMarketValue(player);

    // Reset season stats
    player.currentSeasonStats = {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      matches: 0,
      yellowCards: 0,
      redCards: 0,
      avgRating: 0,
    };

    // Randomize form arrow for new season
    player.conditionArrow = getRandomFormArrow();
  }
}

/**
 * Calculate skill change for end-of-season
 */
function calculateSkillChange(player: IPlayer): number {
  const { age, skillBase, potential } = player;
  const gapToPotential = potential - skillBase;

  // Young players: Can grow significantly
  if (age <= YOUTH_MAX_AGE) {
    // Higher potential gap = more growth
    // Base growth: 1-3 points, bonus based on potential gap
    const baseGrowth = Math.random() * 2 + 1; // 1-3
    const potentialBonus = gapToPotential > 10 ? Math.random() * 2 : Math.random();
    return Math.round(baseGrowth + potentialBonus);
  }

  // Peak years: Stable, slight improvements possible
  if (age >= PEAK_START_AGE && age <= PEAK_END_AGE) {
    // Small chance to improve if below potential
    if (gapToPotential > 5 && Math.random() < 0.3) {
      return Math.round(Math.random() * 2); // 0-2
    }
    // Stable
    return 0;
  }

  // Veterans: Decline starts
  if (age >= VETERAN_START_AGE) {
    // Decline rate increases with age
    const yearsOverPeak = age - PEAK_END_AGE;
    const baseDecline = 1 + Math.floor(yearsOverPeak / 2);
    const variance = Math.random() * 2;
    return -Math.round(baseDecline + variance);
  }

  return 0;
}

/**
 * Process weekly form changes
 * Called when advancing days/weeks
 */
export function processWeeklyFormChanges(players: IPlayer[]): void {
  for (const player of players) {
    // 20% chance to change form each week
    if (Math.random() < 0.2) {
      player.conditionArrow = getNextFormArrow(player.conditionArrow);
    }
  }
}

/**
 * Get next form arrow (tends towards MID/STABLE)
 */
function getNextFormArrow(current: ConditionArrow): ConditionArrow {
  const rand = Math.random();

  switch (current) {
    case 'UP':
      // High form tends to drop
      if (rand < 0.4) return 'SLIGHT_UP';
      if (rand < 0.7) return 'UP';
      return 'MID';

    case 'SLIGHT_UP':
      if (rand < 0.25) return 'UP';
      if (rand < 0.5) return 'MID';
      return 'SLIGHT_UP';

    case 'MID':
      // Stable form can go either way
      if (rand < 0.2) return 'SLIGHT_UP';
      if (rand < 0.4) return 'SLIGHT_DOWN';
      return 'MID';

    case 'SLIGHT_DOWN':
      if (rand < 0.25) return 'DOWN';
      if (rand < 0.5) return 'MID';
      return 'SLIGHT_DOWN';

    case 'DOWN':
      // Low form tends to recover
      if (rand < 0.4) return 'SLIGHT_DOWN';
      if (rand < 0.7) return 'DOWN';
      return 'MID';

    default:
      return 'MID';
  }
}

/**
 * Get random form arrow for new season
 */
function getRandomFormArrow(): ConditionArrow {
  const rand = Math.random();
  if (rand < 0.1) return 'UP';
  if (rand < 0.25) return 'SLIGHT_UP';
  if (rand < 0.75) return 'MID';
  if (rand < 0.9) return 'SLIGHT_DOWN';
  return 'DOWN';
}

/**
 * Calculate market value based on skill, age, and potential
 */
export function calculateMarketValue(player: IPlayer): number {
  const { skillBase, potential, age } = player;

  // Base value from skill (exponential curve)
  let baseValue = Math.pow(skillBase, 2.5) * 100;

  // Age modifier
  let ageModifier = 1.0;
  if (age <= 21) {
    // Young talent premium
    ageModifier = 1.3 + (potential - skillBase) * 0.02;
  } else if (age <= 25) {
    // Prime age premium
    ageModifier = 1.2;
  } else if (age <= 28) {
    // Still valuable
    ageModifier = 1.0;
  } else if (age <= 30) {
    // Starting to lose value
    ageModifier = 0.8;
  } else if (age <= 33) {
    // Significant discount
    ageModifier = 0.5;
  } else {
    // Near retirement
    ageModifier = 0.2;
  }

  // Potential bonus for young players
  let potentialBonus = 1.0;
  if (age <= 23 && potential >= 85) {
    potentialBonus = 1.0 + (potential - 80) * 0.03;
  }

  const value = baseValue * ageModifier * potentialBonus;

  // Round to nearest 50k
  return Math.round(value / 50000) * 50000;
}

/**
 * Calculate appropriate wage based on skill and market value
 */
export function calculateWage(player: IPlayer): number {
  // Wage is roughly 0.5-1% of market value per week
  const baseWage = player.marketValue * 0.007;

  // Add skill premium for elite players
  let skillPremium = 1.0;
  if (player.skillBase >= 85) {
    skillPremium = 1.5;
  } else if (player.skillBase >= 75) {
    skillPremium = 1.2;
  }

  const wage = baseWage * skillPremium;

  // Round to nearest 1000
  return Math.round(wage / 1000) * 1000;
}

/**
 * Check if player should retire
 */
export function shouldRetire(player: IPlayer): boolean {
  if (player.age < RETIREMENT_MIN_AGE) return false;

  // Retirement chance increases with age and skill decline
  const baseChance = (player.age - RETIREMENT_MIN_AGE + 1) * 0.15;
  const skillFactor = player.skillBase < 50 ? 0.2 : 0;

  return Math.random() < (baseChance + skillFactor);
}

/**
 * Boost player skill after good performance (playing time bonus)
 * Called after matches for players who played well
 */
export function applyPerformanceBonus(player: IPlayer, rating: number): void {
  // Only young players can get performance bonuses
  if (player.age > YOUTH_MAX_AGE) return;

  // Need excellent rating (8+) and room to grow
  if (rating >= 8 && player.skillBase < player.potential) {
    // Small chance to gain 1 point
    if (Math.random() < 0.1) {
      player.skillBase = Math.min(player.potential, player.skillBase + 1);
    }
  }
}
