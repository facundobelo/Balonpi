// =============================================================================
// CYBERFOOT 2026 - CORE TYPE DEFINITIONS
// =============================================================================

// -----------------------------------------------------------------------------
// ENUMS & CONSTANTS
// -----------------------------------------------------------------------------

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type ConditionArrow = 'UP' | 'SLIGHT_UP' | 'MID' | 'SLIGHT_DOWN' | 'DOWN';

export type MatchSpeed = 'PAUSED' | 'X1' | 'X5' | 'INSTANT';

export type Tactic = 'ULTRA_DEFENSIVE' | 'DEFENSIVE' | 'BALANCED' | 'ATTACKING' | 'ULTRA_ATTACKING';

export type CompetitionType = 'LEAGUE' | 'CUP' | 'CONTINENTAL' | 'INTERNATIONAL';

export type TransferStatus = 'AVAILABLE' | 'LISTED' | 'UNTOUCHABLE' | 'LOAN_LISTED';

export type PlayerMood = 'HAPPY' | 'CONTENT' | 'UNHAPPY';

export type ContractStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NEGOTIATING';

export type ManagerStatus = 'EMPLOYED' | 'FREE_AGENT' | 'RETIRED';

export type CareerEventType =
  | 'HIRED'
  | 'SACKED'
  | 'RESIGNED'
  | 'TITLE_WON'
  | 'PROMOTED'
  | 'RELEGATED'
  | 'RECORD_BROKEN';

export type DeadlineBlock = 'MORNING' | 'AFTERNOON' | 'NIGHT';

// Tier system (1 = Elite, 5 = Amateur)
export type ClubTier = 1 | 2 | 3 | 4 | 5;

// -----------------------------------------------------------------------------
// PLAYER INTERFACES
// -----------------------------------------------------------------------------

export interface PlayerHistoryStats {
  goals: number;
  assists: number;
  cleanSheets: number;
  matches: number;
  yellowCards: number;
  redCards: number;
  avgRating: number;
}

export interface PlayerCareerRecord {
  seasonId: string;
  clubId: string;
  stats: PlayerHistoryStats;
}

export interface IPlayer {
  id: string;
  name: string;
  age: number;
  nationality: string; // ISO 3166-1 alpha-3
  positionMain: Position;
  positionAlt: Position[] | null;

  // Core attributes
  skillBase: number;        // 1-99 - THE ONLY ATTRIBUTE
  potential: number;        // 1-99 - Hidden ceiling
  conditionArrow: ConditionArrow;

  // Contract & Status
  clubId: string | null;
  wage: number;
  contractExpiry: string;   // ISO Date
  transferStatus: TransferStatus;
  marketValue: number;
  releaseClause: number | null;  // If set, player can be bought for this amount (bypasses negotiations)

  // Relationships
  chemistryPartners: string[]; // Player IDs
  isIdol: boolean;
  isRegen: boolean;
  originalPlayerId?: string;  // If regen, who they replaced

  // Stats
  currentSeasonStats: PlayerHistoryStats;
  careerHistory: PlayerCareerRecord[];

  // Injury & Suspension
  injuredUntil: string | null;      // ISO date when player recovers (null = healthy)
  suspendedUntil: string | null;    // ISO date when suspension ends (null = not suspended)
  suspensionReason?: 'RED_CARD' | 'ACCUMULATED_YELLOWS';

  // Youth Promise System
  activePromise?: YouthPromise;
}

export interface YouthPromise {
  type: 'CONSECUTIVE_STARTS' | 'GOAL_TARGET' | 'CLEAN_SHEET_TARGET';
  requirement: number;
  progress: number;
  expiryWeek: number;
  rewardSkillBoost: number;
}

// -----------------------------------------------------------------------------
// CLUB & TEAM INTERFACES
// -----------------------------------------------------------------------------

export interface ClubColors {
  primary: string;    // Main color (hex)
  secondary: string;  // Accent color (hex)
  text: string;       // Text color for contrast (hex)
}

export interface IClub {
  id: string;
  name: string;
  shortCode: string;         // 3-letter code (e.g., "BOC", "RIV")
  country: string;
  nationality?: string;      // Alias for country (legacy)
  tier: ClubTier;
  reputation: number;        // 1-100
  leagueId?: string | null;  // null for national teams
  isNationalTeam?: boolean;

  // Finance
  balance: number;
  wageBudget?: number;
  wageLimit?: number;
  sponsorIncome?: number;

  // Stadium
  stadium?: string;
  stadiumCapacity?: number;

  // Squad
  squadIds?: string[];

  // Facilities
  youthAcademyRating?: number;

  // Rivals
  rivalClubIds?: string[];
  derbyRivals?: string[];

  // Colors (optional - will use defaults if not set)
  colors?: ClubColors;
}

export interface ITeamSheet {
  formation: string;         // e.g., "4-3-3"
  startingXI: string[];      // 11 Player IDs
  substitutes: string[];     // Up to 9 Player IDs
  captain: string;
  tactic: Tactic;

  // Positional assignments
  positionAssignments: Map<string, Position>; // playerId -> played position
}

// -----------------------------------------------------------------------------
// MANAGER INTERFACES
// -----------------------------------------------------------------------------

export interface IManager {
  id: string;
  name: string;
  nationality: string;
  age: number;
  reputation: number;        // 1-100
  status: ManagerStatus;

  // Current employment
  clubId: string | null;
  contractExpiry: string | null;

  // Career
  titlesWon: number;
  internationalTitles: number;
  promotions: number;
  relegations: number;
  sackings: number;

  // Relationships
  nemesisManagerIds: string[];  // Rival managers

  // Expectations
  expectedPosition: number;     // League position expectation
}

export interface IUserCareer extends IManager {
  isUser: true;
  careerEvents: CareerEvent[];
  hallOfFame: HallOfFameEntry[];
  records: PersonalRecord[];
  nationalTeamId?: string;
}

export interface CareerEvent {
  id: string;
  type: CareerEventType;
  date: string;
  clubId: string;
  description: string;
}

export interface HallOfFameEntry {
  playerId: string;
  playerSnapshot: Partial<IPlayer>; // Snapshot at retirement/sale
  pinnedDate: string;
  notes?: string;
}

export interface PersonalRecord {
  type: string;
  value: number;
  playerId?: string;
  seasonId?: string;
  clubId?: string;
}

// -----------------------------------------------------------------------------
// MATCH INTERFACES
// -----------------------------------------------------------------------------

export interface IMatch {
  id: string;
  homeClubId: string;
  awayClubId: string;
  competitionId: string;
  round: number;

  // State
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  currentMinute: number;
  homeScore: number;
  awayScore: number;

  // Team sheets (locked at kickoff)
  homeTeamSheet: ITeamSheet;
  awayTeamSheet: ITeamSheet;

  // Events
  events: MatchEvent[];

  // Calculated powers
  homeAttackPower: number;
  homeDefensePower: number;
  awayAttackPower: number;
  awayDefensePower: number;
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'ASSIST' | 'YELLOW' | 'RED' | 'SUBSTITUTION' | 'INJURY';
  playerId: string;
  assistPlayerId?: string;
  details?: string;
}

export interface MatchResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  playerRatings: Map<string, number>;
}

// -----------------------------------------------------------------------------
// COMPETITION INTERFACES
// -----------------------------------------------------------------------------

export interface ICompetition {
  id: string;
  name: string;
  shortName: string;
  type: string;  // 'LEAGUE' | 'KNOCKOUT' etc.
  country: string | null;  // null for continental/international
  tier: number;

  // Structure
  teamIds: string[];
  standings: StandingsEntry[];

  // Records
  seasonRecords: CompetitionRecords | null;
}

export interface StandingsEntry {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface CompetitionRecords {
  topScorer: { playerId: string; goals: number } | null;
  topAssister: { playerId: string; assists: number } | null;
  cleanSheetLeader: { playerId: string; count: number } | null;
  allTimeGoals: { playerId: string; goals: number };
}

// -----------------------------------------------------------------------------
// TRANSFER MARKET INTERFACES
// -----------------------------------------------------------------------------

export interface TransferOffer {
  id: string;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  amount: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiryDate: string;
  isFlashSale?: boolean;
}

export interface FlashSale {
  playerId: string;
  originalValue: number;
  salePrice: number;
  block: DeadlineBlock;
  expiryTime: number; // Unix timestamp
}

export interface TransferWindow {
  isOpen: boolean;
  isDeadlineDay: boolean;
  currentBlock?: DeadlineBlock;
  flashSales: FlashSale[];
  closingDate: string;
}

// -----------------------------------------------------------------------------
// WORLD STATE INTERFACES
// -----------------------------------------------------------------------------

export interface GameDate {
  year: number;
  month: number;
  week: number;
  day: number;
}

export interface IWorldState {
  currentDate: GameDate;
  seasonId: string;

  // Transfer window state
  transferWindow: TransferWindow;

  // All entities indexed by ID
  players: Map<string, IPlayer>;
  clubs: Map<string, IClub>;
  managers: Map<string, IManager>;
  competitions: Map<string, ICompetition>;

  // Free agents
  freeAgentPlayerIds: string[];
  freeAgentManagerIds: string[];

  // User data
  userCareer: IUserCareer;
}

// -----------------------------------------------------------------------------
// SIMULATION CONFIG
// -----------------------------------------------------------------------------

export interface MatchEngineConfig {
  tickMinutes: number;        // Default: 5
  localBonus: number;         // Default: 10 (%)
  goalBaseThreshold: number;  // Base RNG threshold for goals

  // Position skill penalties
  positionPenalties: {
    natural: number;          // 1.0 (100%)
    alternative: number;      // 0.95
    adjacent: number;         // 0.75
    invalid: number;          // 0.05
  };

  // Arrow modifiers
  arrowModifiers: Record<ConditionArrow, number>;

  // Chemistry bonus
  chemistryBonus: number;     // Default: 0.05
}

export interface CareerManagerConfig {
  sackCheckWeekInterval: number;    // Default: 5
  sackThresholdMultiplier: number;  // Default: 0.7
  sackProbability: number;          // Default: 0.3

  // Reputation tiers for offers
  tier5MaxRep: number;
  tier4MaxRep: number;
  tier3MaxRep: number;
  tier2MaxRep: number;
  eliteMinRep: number;
  eliteMinTitles: number;

  // Biases
  nationalBias: number;       // Default: 0.6
  regionalBias: number;       // Default: 0.25
}

export interface RegenConfig {
  sameNationalityChance: number;    // 0.85
  sameContinentChance: number;      // 0.10
  exoticChance: number;             // 0.05
  blackSwanChance: number;          // 0.005
  blackSwanPotential: number;       // 99
}

// -----------------------------------------------------------------------------
// GENESIS LOADER TYPES
// -----------------------------------------------------------------------------

export interface MasterDatabaseMeta {
  version: string;
  lastUpdated: string;
  season: string;
  generated?: boolean;
}

export interface MasterDatabaseSchema {
  meta: MasterDatabaseMeta;
  players: IPlayer[];
  clubs: IClub[];
  managers: IManager[];
  competitions: ICompetition[];
  nationalities: NationalityData[];
}

export interface NationalityData {
  code: string;
  name: string;
  continent: string;
  neighbors: string[];        // For regional bias
  namePatterns: NamePattern[];  // For regen names
}

export interface NamePattern {
  firstNames: string[];
  lastNames: string[];
  weights: number[];
}

// -----------------------------------------------------------------------------
// BOARD OBJECTIVES
// -----------------------------------------------------------------------------

export type BoardObjectiveType =
  | 'LEAGUE_POSITION'      // Finish in top N
  | 'AVOID_RELEGATION'     // Don't finish in bottom N
  | 'CUP_PROGRESS'         // Reach certain round in cup
  | 'YOUTH_DEVELOPMENT'    // Play X minutes with youth players
  | 'FINANCIAL_BALANCE'    // End season with positive balance
  | 'WIN_TITLE';           // Win the league

export type ObjectiveStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface BoardObjective {
  id: string;
  type: BoardObjectiveType;
  description: string;
  target: number;           // e.g., position 4 for "top 4"
  current: number;          // Current progress
  status: ObjectiveStatus;
  priority: 'PRIMARY' | 'SECONDARY';  // Primary = must achieve
  reward?: number;          // Bonus budget if achieved
  penalty?: string;         // What happens if failed (e.g., "SACKED", "WARNING")
}

export interface SeasonObjectives {
  season: string;
  objectives: BoardObjective[];
  boardConfidence: number;  // 0-100, affects job security
}
