/**
 * GameContext - Global game state management
 *
 * Provides access to the current game save and actions
 * throughout the app via React Context.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { saveManager, type GameSave, type SaveSlot, type MatchResult, type NewsItem } from '../game/storage/SaveManager';
import { GenesisLoader, type SeasonFixtures, type Fixture } from '../game/data/GenesisLoader';
import type { MasterDatabaseSchema, TransferStatus } from '../game/types';
import type { MatchState } from '../pages/MatchDayPage';
import { simulateMatch, createMatchTeam } from '../game/engine/MatchSimulator';

// Helper to format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

// Helper to create news items
function createNewsItem(
  type: NewsItem['type'],
  headline: string,
  body: string,
  date: string,
  relatedIds: string[] = []
): NewsItem {
  return {
    id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date,
    type,
    headline,
    body,
    relatedIds,
  };
}

interface GameContextValue {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  initError: string | null;
  currentSave: GameSave | null;
  saves: SaveSlot[];
  masterDb: MasterDatabaseSchema | null;
  fixtures: SeasonFixtures | null;

  // Actions
  createNewGame: (clubId: string, managerName: string, saveName?: string) => Promise<void>;
  loadSave: (saveId: string) => Promise<void>;
  deleteSave: (saveId: string) => Promise<void>;
  continueSave: () => Promise<void>;
  exitToMenu: () => void;
  refreshSaves: () => Promise<void>;

  // Game actions
  advanceDay: (days?: number) => void;
  getClub: (clubId: string) => any | null;
  getPlayer: (playerId: string) => any | null;
  getUserClub: () => any | null;
  getUserSquad: () => any[];

  // Match actions
  processMatchResult: (
    homeClubId: string,
    awayClubId: string,
    result: MatchState,
    competitionId?: string
  ) => void;

  // Fixture helpers
  getNextMatch: (clubId: string) => Fixture | null;
  getUpcomingFixtures: (clubId: string, limit?: number) => Fixture[];
  getLeagueFixtures: (leagueId: string) => Fixture[];

  // Player actions
  updatePlayerTransferStatus: (playerId: string, status: TransferStatus) => void;

  // Transfer actions
  makeTransferOffer: (playerId: string, offerAmount: number) => {
    success: boolean;
    message: string;
  };
  sellPlayer: (playerId: string, buyerClubId: string, amount: number) => boolean;

  // Simulate to matchday (auto-simulate user matches)
  simulateToMatchday: (targetMatchday: number, leagueId: string) => void;

  // Season management
  isSeasonComplete: boolean;
  showSeasonSummary: boolean;
  setShowSeasonSummary: (show: boolean) => void;
  startNewSeason: () => void;

  // Transfer offers from CPU
  pendingOffers: any[];
  respondToOffer: (offerId: string, accept: boolean) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [currentSave, setCurrentSave] = useState<GameSave | null>(null);
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [masterDb, setMasterDb] = useState<MasterDatabaseSchema | null>(null);
  const [fixtures, setFixtures] = useState<SeasonFixtures | null>(null);
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);

  // Check if season is complete
  const isSeasonComplete = saveManager.isSeasonComplete();

  // Initialize on mount
  useEffect(() => {
    async function init() {
      try {
        // Initialize SaveManager
        await saveManager.init();

        // Load master database using GenesisLoader
        const loader = new GenesisLoader({
          masterDbUrl: '/data/master_db_2026.json',
          generateFixtures: true,
          startDate: '2024-08-17', // Typical league start
          season: '2024-2025',
        });

        const result = await loader.load();

        if (!result.success) {
          throw new Error(result.errors.join(', '));
        }

        if (result.warnings.length > 0) {
          console.warn('Genesis warnings:', result.warnings);
        }

        setMasterDb(result.data);
        setFixtures(result.fixtures);

        // Load save list
        const saveList = await saveManager.listSaves();
        setSaves(saveList);

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const refreshSaves = useCallback(async () => {
    const saveList = await saveManager.listSaves();
    setSaves(saveList);
  }, []);

  const createNewGame = useCallback(async (
    clubId: string,
    managerName: string,
    saveName?: string
  ) => {
    if (!masterDb || !fixtures) throw new Error('Master database not loaded');

    setIsLoading(true);
    try {
      // Pass fixtures to save them with the game
      const save = await saveManager.createNewGame(masterDb, clubId, managerName, saveName, fixtures);
      setCurrentSave(save);
      await refreshSaves();
    } finally {
      setIsLoading(false);
    }
  }, [masterDb, fixtures, refreshSaves]);

  const loadSave = useCallback(async (saveId: string) => {
    setIsLoading(true);
    try {
      const save = await saveManager.loadSave(saveId);
      setCurrentSave(save);
      // Use fixtures from the save if available
      if (save?.fixtures && Object.keys(save.fixtures).length > 0) {
        setFixtures(save.fixtures as SeasonFixtures);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSave = useCallback(async (saveId: string) => {
    await saveManager.deleteSave(saveId);
    await refreshSaves();
    if (currentSave?.id === saveId) {
      setCurrentSave(null);
    }
  }, [currentSave, refreshSaves]);

  const continueSave = useCallback(async () => {
    const lastSaveId = await saveManager.getLastSaveId();
    if (lastSaveId) {
      const save = await saveManager.loadSave(lastSaveId);
      if (save) {
        setCurrentSave(save);
        // Use fixtures from the save if available
        if (save.fixtures && Object.keys(save.fixtures).length > 0) {
          setFixtures(save.fixtures as SeasonFixtures);
        }
      }
    }
  }, []);

  const exitToMenu = useCallback(() => {
    setCurrentSave(null);
  }, []);

  const advanceDay = useCallback((days: number = 1) => {
    saveManager.advanceDate(days);
    // Force re-render with updated save
    setCurrentSave({ ...saveManager.getCurrentSave()! });
  }, []);

  const getClub = useCallback((clubId: string) => {
    // First try from current save
    const fromSave = saveManager.getClub(clubId);
    if (fromSave) return fromSave;
    // Fallback to masterDb (for fixtures that reference clubs not in save)
    return masterDb?.clubs.find(c => c.id === clubId) || null;
  }, [masterDb]);

  const getPlayer = useCallback((playerId: string) => {
    return saveManager.getPlayer(playerId);
  }, []);

  const getUserClub = useCallback(() => {
    return saveManager.getUserClub();
  }, []);

  const getUserSquad = useCallback(() => {
    return saveManager.getUserSquad();
  }, []);

  const processMatchResult = useCallback((
    homeClubId: string,
    awayClubId: string,
    result: MatchState,
    competitionId?: string
  ) => {
    if (!currentSave) return;

    // Convert match events to our format and update player stats
    const matchEvents: Array<{
      minute: number;
      type: 'GOAL' | 'ASSIST' | 'YELLOW' | 'RED' | 'SUB';
      playerId: string;
      clubId: string;
      assistPlayerId?: string;
    }> = [];

    for (const event of result.events) {
      const clubId = event.teamIndex === 0 ? homeClubId : awayClubId;

      if (event.type === 'GOAL') {
        matchEvents.push({
          minute: event.minute,
          type: 'GOAL',
          playerId: event.playerId,
          clubId,
          assistPlayerId: event.assistPlayerId,
        });

        // Update scorer stats
        const scorer = currentSave.players.find(p => p.id === event.playerId);
        if (scorer) {
          scorer.currentSeasonStats.goals++;
        }

        // Update assister stats
        if (event.assistPlayerId) {
          const assister = currentSave.players.find(p => p.id === event.assistPlayerId);
          if (assister) {
            assister.currentSeasonStats.assists++;
          }
        }
      } else if (event.type === 'YELLOW') {
        const player = currentSave.players.find(p => p.id === event.playerId);
        if (player) {
          player.currentSeasonStats.yellowCards++;
          // Check for accumulated yellows (5 = 1 match suspension)
          if (player.currentSeasonStats.yellowCards % 5 === 0) {
            const suspendedDate = new Date(currentSave.gameDate);
            suspendedDate.setDate(suspendedDate.getDate() + 7);
            player.suspendedUntil = suspendedDate.toISOString().split('T')[0];
            player.suspensionReason = 'ACCUMULATED_YELLOWS';
          }
        }
      } else if (event.type === 'RED') {
        const player = currentSave.players.find(p => p.id === event.playerId);
        if (player) {
          player.currentSeasonStats.redCards++;
          // Suspend player for 1 match (next week)
          const suspendedDate = new Date(currentSave.gameDate);
          suspendedDate.setDate(suspendedDate.getDate() + 7);
          player.suspendedUntil = suspendedDate.toISOString().split('T')[0];
          player.suspensionReason = 'RED_CARD';
        }
      } else if (event.type === 'INJURY' && event.injuryWeeks) {
        const player = currentSave.players.find(p => p.id === event.playerId);
        if (player) {
          // Set injury recovery date
          const recoveryDate = new Date(currentSave.gameDate);
          recoveryDate.setDate(recoveryDate.getDate() + (event.injuryWeeks * 7));
          player.injuredUntil = recoveryDate.toISOString().split('T')[0];
        }
      }
    }

    // Update appearances for players who actually played
    // Starters + subs who came on get an appearance
    const playersWhoPlayed = new Set([
      ...(result.homeLineup || []),
      ...(result.awayLineup || []),
      ...(result.homeSubsIn || []),
      ...(result.awaySubsIn || []),
    ]);

    playersWhoPlayed.forEach(playerId => {
      const player = currentSave.players.find(p => p.id === playerId);
      if (player) {
        player.currentSeasonStats.appearances++;
      }
    });

    // Update clean sheets for goalkeepers who actually played
    if (result.awayScore === 0 && result.homeLineup?.length) {
      // Find GK in the home lineup
      const homeGK = currentSave.players.find(p =>
        result.homeLineup.includes(p.id) && p.positionMain === 'GK'
      );
      if (homeGK) homeGK.currentSeasonStats.cleanSheets++;
    }
    if (result.homeScore === 0 && result.awayLineup?.length) {
      // Find GK in the away lineup
      const awayGK = currentSave.players.find(p =>
        result.awayLineup.includes(p.id) && p.positionMain === 'GK'
      );
      if (awayGK) awayGK.currentSeasonStats.cleanSheets++;
    }

    // Update standings if competition is provided
    if (competitionId) {
      const competition = currentSave.competitions.find(c => c.id === competitionId);
      if (competition?.standings) {
        const homeStanding = competition.standings.find((s: any) => s.clubId === homeClubId);
        const awayStanding = competition.standings.find((s: any) => s.clubId === awayClubId);

        if (homeStanding) {
          homeStanding.played++;
          homeStanding.goalsFor += result.homeScore;
          homeStanding.goalsAgainst += result.awayScore;
          if (result.homeScore > result.awayScore) {
            homeStanding.won++;
            homeStanding.points += 3;
            homeStanding.form = ['W', ...homeStanding.form.slice(0, 4)];
          } else if (result.homeScore < result.awayScore) {
            homeStanding.lost++;
            homeStanding.form = ['L', ...homeStanding.form.slice(0, 4)];
          } else {
            homeStanding.drawn++;
            homeStanding.points += 1;
            homeStanding.form = ['D', ...homeStanding.form.slice(0, 4)];
          }
        }

        if (awayStanding) {
          awayStanding.played++;
          awayStanding.goalsFor += result.awayScore;
          awayStanding.goalsAgainst += result.homeScore;
          if (result.awayScore > result.homeScore) {
            awayStanding.won++;
            awayStanding.points += 3;
            awayStanding.form = ['W', ...awayStanding.form.slice(0, 4)];
          } else if (result.awayScore < result.homeScore) {
            awayStanding.lost++;
            awayStanding.form = ['L', ...awayStanding.form.slice(0, 4)];
          } else {
            awayStanding.drawn++;
            awayStanding.points += 1;
            awayStanding.form = ['D', ...awayStanding.form.slice(0, 4)];
          }
        }
      }
    }

    // Add to match history (limit to 500 to prevent memory issues)
    currentSave.matchHistory.push({
      id: `match_${Date.now()}`,
      date: currentSave.gameDate,
      competitionId: competitionId || 'friendly',
      homeClubId,
      awayClubId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: matchEvents,
    });
    if (currentSave.matchHistory.length > 500) {
      currentSave.matchHistory = currentSave.matchHistory.slice(-500);
    }

    // Generate news for important events
    const homeClub = currentSave.clubs.find(c => c.id === homeClubId);
    const awayClub = currentSave.clubs.find(c => c.id === awayClubId);
    const isUserMatch = homeClubId === currentSave.userClubId || awayClubId === currentSave.userClubId;

    // Result news (only for user matches or big scores)
    if (isUserMatch) {
      const isUserHome = homeClubId === currentSave.userClubId;
      const userClub = isUserHome ? homeClub : awayClub;
      const oppClub = isUserHome ? awayClub : homeClub;
      const userScore = isUserHome ? result.homeScore : result.awayScore;
      const oppScore = isUserHome ? result.awayScore : result.homeScore;

      let headline = '';
      let body = '';
      if (userScore > oppScore) {
        headline = `${userClub?.shortCode} vence a ${oppClub?.shortCode}`;
        body = `Victoria por ${result.homeScore}-${result.awayScore} en casa de ${homeClub?.name}.`;
      } else if (userScore < oppScore) {
        headline = `${userClub?.shortCode} cae ante ${oppClub?.shortCode}`;
        body = `Derrota por ${result.homeScore}-${result.awayScore}.`;
      } else {
        headline = `${userClub?.shortCode} empata con ${oppClub?.shortCode}`;
        body = `Reparto de puntos: ${result.homeScore}-${result.awayScore}.`;
      }

      currentSave.newsItems.unshift(createNewsItem(
        'RESULT',
        headline,
        body,
        currentSave.gameDate,
        [homeClubId, awayClubId]
      ));
    }

    // Injury news
    for (const event of result.events) {
      if (event.type === 'INJURY' && event.injuryWeeks) {
        const player = currentSave.players.find(p => p.id === event.playerId);
        const club = currentSave.clubs.find(c => c.id === player?.clubId);
        if (player && event.injuryWeeks >= 3) {
          currentSave.newsItems.unshift(createNewsItem(
            'INJURY',
            `${player.name} lesionado`,
            `El jugador de ${club?.shortCode || 'su equipo'} estara ${event.injuryWeeks} semanas de baja.`,
            currentSave.gameDate,
            [player.id]
          ));
        }
      }
    }

    // Keep only last 50 news items
    currentSave.newsItems = currentSave.newsItems.slice(0, 50);

    // Update the fixture status to FINISHED
    if (competitionId && fixtures) {
      const competitionFixtures = fixtures[competitionId];
      if (competitionFixtures) {
        const fixtureIndex = competitionFixtures.findIndex(
          f => f.homeClubId === homeClubId &&
               f.awayClubId === awayClubId &&
               f.status === 'SCHEDULED'
        );
        if (fixtureIndex !== -1) {
          competitionFixtures[fixtureIndex] = {
            ...competitionFixtures[fixtureIndex],
            status: 'FINISHED',
            homeScore: result.homeScore,
            awayScore: result.awayScore,
          };
          // Update fixtures in save
          currentSave.fixtures = { ...fixtures };
          // Update local fixtures state
          setFixtures({ ...fixtures });
        }
      }
    }

    // Simulate ALL league matches worldwide for the same matchday
    if (competitionId && fixtures) {
      // Find the user's matchday from their fixture
      const userCompetitionFixtures = fixtures[competitionId];
      const userFixture = userCompetitionFixtures?.find(
        f => f.homeClubId === homeClubId && f.awayClubId === awayClubId
      );
      const currentMatchday = userFixture?.matchday;

      // Iterate through ALL competitions/leagues
      for (const [leagueId, leagueFixtures] of Object.entries(fixtures)) {
        if (!leagueFixtures || leagueFixtures.length === 0) continue;

        // Find matches in this league that are SCHEDULED and same matchday
        const matchesToSimulate = leagueFixtures.filter(
          f => f.status === 'SCHEDULED' &&
               f.matchday === currentMatchday &&
               // Exclude user's match (already processed)
               !(f.homeClubId === homeClubId && f.awayClubId === awayClubId) &&
               // Exclude any match involving user's club (they play separately)
               !(f.homeClubId === currentSave.userClubId || f.awayClubId === currentSave.userClubId)
        );

        // Find the competition for updating standings
        const competition = currentSave.competitions.find(c => c.id === leagueId);

        // Simulate each match in this league
        for (const fixture of matchesToSimulate) {
          const homeClubMatch = currentSave.clubs.find(c => c.id === fixture.homeClubId);
          const awayClubMatch = currentSave.clubs.find(c => c.id === fixture.awayClubId);
          const homePlayers = currentSave.players.filter(p => p.clubId === fixture.homeClubId);
          const awayPlayers = currentSave.players.filter(p => p.clubId === fixture.awayClubId);

          // Filter out injured/suspended players for CPU teams
          const isPlayerAvailable = (p: any) => {
            if (p.injuredUntil && p.injuredUntil > currentSave.gameDate) return false;
            if (p.suspendedUntil && p.suspendedUntil > currentSave.gameDate) return false;
            return true;
          };
          const availableHomePlayers = homePlayers.filter(isPlayerAvailable);
          const availableAwayPlayers = awayPlayers.filter(isPlayerAvailable);

          // Only simulate if both teams have enough available players
          if (homeClubMatch && awayClubMatch && availableHomePlayers.length >= 11 && availableAwayPlayers.length >= 11) {
            // Create match teams with available players only
            const homeTeam = createMatchTeam(homeClubMatch.id, homeClubMatch.name, availableHomePlayers, '4-3-3', 'BALANCED', currentSave.gameDate);
            const awayTeam = createMatchTeam(awayClubMatch.id, awayClubMatch.name, availableAwayPlayers, '4-3-3', 'BALANCED', currentSave.gameDate);

            // Simulate the match
            const matchResult = simulateMatch(homeTeam, awayTeam);

            // Update fixture status
            const fixtureIndex = leagueFixtures.findIndex(
              f => f.homeClubId === fixture.homeClubId && f.awayClubId === fixture.awayClubId && f.matchday === fixture.matchday
            );
            if (fixtureIndex !== -1) {
              leagueFixtures[fixtureIndex] = {
                ...leagueFixtures[fixtureIndex],
                status: 'FINISHED',
                homeScore: matchResult.homeScore,
                awayScore: matchResult.awayScore,
              };
            }

            // Update standings for this league
            if (competition?.standings) {
              const homeStanding = competition.standings.find((s: any) => s.clubId === fixture.homeClubId);
              const awayStanding = competition.standings.find((s: any) => s.clubId === fixture.awayClubId);

              if (homeStanding) {
                homeStanding.played++;
                homeStanding.goalsFor += matchResult.homeScore;
                homeStanding.goalsAgainst += matchResult.awayScore;
                if (matchResult.homeScore > matchResult.awayScore) {
                  homeStanding.won++;
                  homeStanding.points += 3;
                  homeStanding.form = ['W', ...homeStanding.form.slice(0, 4)];
                } else if (matchResult.homeScore < matchResult.awayScore) {
                  homeStanding.lost++;
                  homeStanding.form = ['L', ...homeStanding.form.slice(0, 4)];
                } else {
                  homeStanding.drawn++;
                  homeStanding.points += 1;
                  homeStanding.form = ['D', ...homeStanding.form.slice(0, 4)];
                }
              }

              if (awayStanding) {
                awayStanding.played++;
                awayStanding.goalsFor += matchResult.awayScore;
                awayStanding.goalsAgainst += matchResult.homeScore;
                if (matchResult.awayScore > matchResult.homeScore) {
                  awayStanding.won++;
                  awayStanding.points += 3;
                  awayStanding.form = ['W', ...awayStanding.form.slice(0, 4)];
                } else if (matchResult.awayScore < matchResult.homeScore) {
                  awayStanding.lost++;
                  awayStanding.form = ['L', ...awayStanding.form.slice(0, 4)];
                } else {
                  awayStanding.drawn++;
                  awayStanding.points += 1;
                  awayStanding.form = ['D', ...awayStanding.form.slice(0, 4)];
                }
              }
            }

            // Update player stats for CPU matches
            for (const event of matchResult.events) {
              if (event.type === 'GOAL') {
                const scorer = currentSave.players.find(p => p.id === event.playerId);
                if (scorer) scorer.currentSeasonStats.goals++;
                if (event.assistPlayerId) {
                  const assister = currentSave.players.find(p => p.id === event.assistPlayerId);
                  if (assister) assister.currentSeasonStats.assists++;
                }
              } else if (event.type === 'YELLOW') {
                const player = currentSave.players.find(p => p.id === event.playerId);
                if (player) {
                  player.currentSeasonStats.yellowCards++;
                  if (player.currentSeasonStats.yellowCards % 5 === 0) {
                    const suspendedDate = new Date(currentSave.gameDate);
                    suspendedDate.setDate(suspendedDate.getDate() + 7);
                    player.suspendedUntil = suspendedDate.toISOString().split('T')[0];
                    player.suspensionReason = 'ACCUMULATED_YELLOWS';
                  }
                }
              } else if (event.type === 'RED') {
                const player = currentSave.players.find(p => p.id === event.playerId);
                if (player) {
                  player.currentSeasonStats.redCards++;
                  const suspendedDate = new Date(currentSave.gameDate);
                  suspendedDate.setDate(suspendedDate.getDate() + 7);
                  player.suspendedUntil = suspendedDate.toISOString().split('T')[0];
                  player.suspensionReason = 'RED_CARD';
                }
              } else if (event.type === 'INJURY' && event.injuryWeeks) {
                const player = currentSave.players.find(p => p.id === event.playerId);
                if (player) {
                  const recoveryDate = new Date(currentSave.gameDate);
                  recoveryDate.setDate(recoveryDate.getDate() + (event.injuryWeeks * 7));
                  player.injuredUntil = recoveryDate.toISOString().split('T')[0];
                }
              }
            }

            // Update appearances
            const allPlayersInMatch = [
              ...(matchResult.homeLineup || []),
              ...(matchResult.awayLineup || []),
              ...(matchResult.homeSubsIn || []),
              ...(matchResult.awaySubsIn || []),
            ];
            for (const playerId of allPlayersInMatch) {
              const player = currentSave.players.find(p => p.id === playerId);
              if (player) player.currentSeasonStats.appearances++;
            }

            // Update clean sheets
            if (matchResult.awayScore === 0 && matchResult.homeLineup?.length) {
              const homeGK = currentSave.players.find(p =>
                matchResult.homeLineup.includes(p.id) && p.positionMain === 'GK'
              );
              if (homeGK) homeGK.currentSeasonStats.cleanSheets++;
            }
            if (matchResult.homeScore === 0 && matchResult.awayLineup?.length) {
              const awayGK = currentSave.players.find(p =>
                matchResult.awayLineup.includes(p.id) && p.positionMain === 'GK'
              );
              if (awayGK) awayGK.currentSeasonStats.cleanSheets++;
            }

            // Add to match history (limit to prevent memory issues)
            if (currentSave.matchHistory.length < 500) {
              currentSave.matchHistory.push({
                id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                date: currentSave.gameDate,
                competitionId: leagueId,
                homeClubId: fixture.homeClubId,
                awayClubId: fixture.awayClubId,
                homeScore: matchResult.homeScore,
                awayScore: matchResult.awayScore,
                events: [],
              });
            }
          }
        }
      }

      // Update fixtures in save after all simulations
      currentSave.fixtures = { ...fixtures };
      setFixtures({ ...fixtures });
    }

    // Advance game date by 7 days (next matchday)
    const currentDate = new Date(currentSave.gameDate);
    currentDate.setDate(currentDate.getDate() + 7);
    currentSave.gameDate = currentDate.toISOString().split('T')[0];

    // Generate CPU transfer offers for listed players (during transfer window)
    const month = currentDate.getMonth();
    const isWindowOpen = month === 6 || month === 7 || month === 0; // July, August, January
    if (isWindowOpen) {
      // Initialize if doesn't exist
      if (!currentSave.receivedOffers) currentSave.receivedOffers = [];

      // Find user's listed players
      const userSquad = currentSave.players.filter(p => p.clubId === currentSave.userClubId);
      const listedPlayers = userSquad.filter(p => p.transferStatus === 'LISTED' || p.transferStatus === 'LOAN_LISTED');

      // 15% chance per listed player to receive an offer per matchday
      for (const player of listedPlayers) {
        // Check if already has pending offer
        const hasPendingOffer = currentSave.receivedOffers.some(
          o => o.playerId === player.id && o.status === 'PENDING' && o.expiresDate >= currentSave.gameDate
        );
        if (hasPendingOffer) continue;

        if (Math.random() < 0.15) {
          // Find a CPU club that can afford the player
          const potentialBuyers = currentSave.clubs.filter(c => {
            if (c.id === currentSave.userClubId) return false;
            if (c.isNationalTeam) return false;
            const budget = c.budget ?? c.balance ?? 0;
            return budget >= player.marketValue * 0.7;
          });

          if (potentialBuyers.length > 0) {
            const buyer = potentialBuyers[Math.floor(Math.random() * potentialBuyers.length)];
            // Offer between 70% and 110% of market value
            const offerMultiplier = 0.7 + Math.random() * 0.4;
            const offerAmount = Math.round(player.marketValue * offerMultiplier / 10000) * 10000;

            const expiryDate = new Date(currentSave.gameDate);
            expiryDate.setDate(expiryDate.getDate() + 14); // Offer valid for 2 weeks

            currentSave.receivedOffers.push({
              id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              playerId: player.id,
              fromClubId: buyer.id,
              amount: offerAmount,
              createdDate: currentSave.gameDate,
              expiresDate: expiryDate.toISOString().split('T')[0],
              status: 'PENDING',
            });

            // Add news about the offer
            currentSave.newsItems.unshift(createNewsItem(
              'TRANSFER',
              `${buyer.name} interesado en ${player.name}`,
              `${buyer.name} ha enviado una oferta de ${formatCurrency(offerAmount)} por ${player.name}.`,
              currentSave.gameDate,
              [player.id, buyer.id]
            ));
          }
        }
      }
    }

    // Check if season should end (all league fixtures finished)
    if (saveManager.isSeasonComplete()) {
      // Season complete - show summary screen instead of auto-processing
      setShowSeasonSummary(true);
    }

    // Save and update state
    saveManager.scheduleAutoSave();
    setCurrentSave({ ...currentSave });
  }, [currentSave, fixtures]);

  // Fixture helpers
  const getNextMatch = useCallback((clubId: string): Fixture | null => {
    if (!fixtures) return null;

    // Find the club's league
    const club = masterDb?.clubs.find(c => c.id === clubId);
    if (!club?.leagueId) return null;

    const leagueFixtures = fixtures[club.leagueId];
    if (!leagueFixtures) return null;

    return GenesisLoader.getNextMatch(leagueFixtures, clubId);
  }, [fixtures, masterDb]);

  const getUpcomingFixtures = useCallback((clubId: string, limit: number = 5): Fixture[] => {
    if (!fixtures) return [];

    // Find the club's league
    const club = masterDb?.clubs.find(c => c.id === clubId);
    if (!club?.leagueId) return [];

    const leagueFixtures = fixtures[club.leagueId];
    if (!leagueFixtures) return [];

    return GenesisLoader.getUpcomingFixtures(leagueFixtures, clubId, limit);
  }, [fixtures, masterDb]);

  const getLeagueFixtures = useCallback((leagueId: string): Fixture[] => {
    if (!fixtures) return [];
    return fixtures[leagueId] || [];
  }, [fixtures]);

  const updatePlayerTransferStatus = useCallback((playerId: string, status: TransferStatus) => {
    if (!currentSave) return;

    const player = currentSave.players.find(p => p.id === playerId);
    if (player) {
      player.transferStatus = status;
      saveManager.scheduleAutoSave();
      setCurrentSave({ ...currentSave });
    }
  }, [currentSave]);

  // Make an offer for a player from another club
  const makeTransferOffer = useCallback((playerId: string, offerAmount: number): { success: boolean; message: string } => {
    if (!currentSave) return { success: false, message: 'No hay partida activa' };

    // Check if transfer window is open
    const gameDate = new Date(currentSave.gameDate);
    const month = gameDate.getMonth();
    const isWindowOpen = month === 6 || month === 7 || month === 0; // July, August, January
    if (!isWindowOpen) {
      return { success: false, message: 'El mercado de fichajes está cerrado' };
    }

    const player = currentSave.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Jugador no encontrado' };

    const userClub = currentSave.clubs.find(c => c.id === currentSave.userClubId);
    if (!userClub) return { success: false, message: 'Club no encontrado' };

    const sellerClub = currentSave.clubs.find(c => c.id === player.clubId);
    if (!sellerClub) return { success: false, message: 'Club vendedor no encontrado' };

    // Check if player is already ours
    if (player.clubId === userClub.id) {
      return { success: false, message: 'Este jugador ya es tuyo' };
    }

    // Check budget (ensure it won't go negative)
    const userBudget = userClub.budget ?? userClub.balance ?? 0;
    if (offerAmount > userBudget) {
      return { success: false, message: 'Presupuesto insuficiente' };
    }

    // Check if this is a release clause payment (automatic acceptance by club)
    const isClausePayment = player.releaseClause !== null &&
                            player.releaseClause !== undefined &&
                            offerAmount >= player.releaseClause;

    // Block untouchable players without release clause
    if (player.transferStatus === 'UNTOUCHABLE' && !player.releaseClause) {
      return { success: false, message: 'Jugador intransferible sin cláusula de rescisión' };
    }

    // ==========================================
    // PLAYER INTEREST CHECK
    // Even if the club accepts, the player must want to join
    // ==========================================
    const calculatePlayerInterest = (): { interested: boolean; reason: string } => {
      const repDiff = userClub.reputation - sellerClub.reputation;
      const playerQuality = player.skillBase;
      const playerAge = player.age;
      const isYoungTalent = playerAge <= 23 && player.potential >= 80;
      const isEstablishedStar = playerQuality >= 80;
      const isAtBigClub = sellerClub.reputation >= 75;

      // Base interest starts at 50%
      let interestScore = 50;

      // Reputation difference is crucial
      if (repDiff >= 20) {
        // Moving to a much bigger club - very attractive
        interestScore += 40;
      } else if (repDiff >= 10) {
        // Moving to a bigger club - attractive
        interestScore += 25;
      } else if (repDiff >= 0) {
        // Lateral move - neutral
        interestScore += 10;
      } else if (repDiff >= -10) {
        // Slightly smaller club - hesitant
        interestScore -= 10;
      } else if (repDiff >= -20) {
        // Smaller club - reluctant
        interestScore -= 25;
      } else {
        // Much smaller club - very reluctant
        interestScore -= 40;
      }

      // Young talents at big clubs are harder to convince
      if (isYoungTalent && isAtBigClub) {
        interestScore -= 20;
      }

      // Established stars are pickier
      if (isEstablishedStar) {
        interestScore -= 15;
        // But they might be tempted by slightly more money
        const wageRatio = offerAmount / player.marketValue;
        if (wageRatio >= 1.3) interestScore += 10;
      }

      // Older players (30+) are more flexible, looking for playing time
      if (playerAge >= 30) {
        interestScore += 15;
      }

      // Players on the transfer list are eager to move
      if (player.transferStatus === 'LISTED') {
        interestScore += 25;
      }

      // Loan-listed players want a fresh start
      if (player.transferStatus === 'LOAN_LISTED') {
        interestScore += 15;
      }

      // Clamp between 5 and 95
      interestScore = Math.max(5, Math.min(95, interestScore));

      // Roll the dice
      const roll = Math.random() * 100;
      const interested = roll < interestScore;

      // Generate appropriate rejection reason
      let reason = '';
      if (!interested) {
        if (repDiff < -15 && isEstablishedStar) {
          reason = `${player.name} no quiere dar un paso atrás en su carrera.`;
        } else if (isYoungTalent && isAtBigClub) {
          reason = `${player.name} prefiere seguir desarrollándose en ${sellerClub.shortCode}.`;
        } else if (repDiff < -10) {
          reason = `${player.name} no está convencido del proyecto deportivo.`;
        } else {
          reason = `${player.name} no está interesado en el traspaso.`;
        }
      }

      return { interested, reason };
    };

    let accepted = false;

    if (isClausePayment) {
      // Release clause payment = automatic acceptance by club
      // But player still needs to agree!
      const playerDecision = calculatePlayerInterest();
      if (!playerDecision.interested) {
        return { success: false, message: playerDecision.reason };
      }
      accepted = true;
    } else {
      // Calculate acceptance probability based on offer vs market value
      const ratio = offerAmount / player.marketValue;
      let acceptChance = 0;

      if (player.transferStatus === 'LISTED') {
        // Listed players accept more easily
        if (ratio >= 0.8) acceptChance = 0.9;
        else if (ratio >= 0.6) acceptChance = 0.6;
        else acceptChance = 0.2;
      } else if (player.transferStatus === 'UNTOUCHABLE') {
        // Untouchable players with release clause can still reject negotiated offers
        acceptChance = ratio >= 2.0 ? 0.1 : 0;
      } else {
        // Normal players
        if (ratio >= 1.2) acceptChance = 0.9;
        else if (ratio >= 1.0) acceptChance = 0.7;
        else if (ratio >= 0.8) acceptChance = 0.4;
        else acceptChance = 0.1;
      }

      // Better players are harder to buy
      if (player.skillBase >= 85) acceptChance *= 0.7;
      else if (player.skillBase >= 80) acceptChance *= 0.85;

      // Young talents are harder to buy
      if (player.age <= 23 && player.potential >= 85) acceptChance *= 0.6;

      // Reputation difference affects acceptance
      const repDiff = userClub.reputation - sellerClub.reputation;
      if (repDiff > 20) acceptChance *= 1.2; // They want to sell to bigger club
      else if (repDiff < -20) acceptChance *= 0.7; // They don't want to sell to smaller club

      // Roll the dice for club acceptance
      const clubAccepts = Math.random() < acceptChance;

      if (clubAccepts) {
        // Club accepted, now check if player is interested
        const playerDecision = calculatePlayerInterest();
        if (!playerDecision.interested) {
          return { success: false, message: playerDecision.reason };
        }
        accepted = true;
      }
    }

    if (accepted) {
      // Calculate the new wage before accepting
      const newWage = Math.round((player.skillBase * 2000 + player.marketValue * 0.001) / 1000) * 1000;

      // Check wage budget if club has a limit
      if (userClub.wageLimit) {
        const currentWages = currentSave.players
          .filter(p => p.clubId === userClub.id)
          .reduce((sum, p) => sum + (p.wage || 0), 0);
        if (currentWages + newWage > userClub.wageLimit) {
          return { success: false, message: 'El salario excede el límite salarial del club' };
        }
      }

      // Transfer the player
      const previousClubId = player.clubId;
      player.clubId = userClub.id;
      player.transferStatus = 'AVAILABLE';

      // Update finances - ensure budget exists
      if (userClub.budget === undefined) userClub.budget = userClub.balance || 0;
      if (sellerClub.budget === undefined) sellerClub.budget = sellerClub.balance || 0;
      userClub.budget -= offerAmount;
      sellerClub.budget += offerAmount;

      // Set the wage
      player.wage = newWage;

      // Add to transfer history
      currentSave.transferHistory.push({
        id: `transfer_${Date.now()}`,
        playerId: player.id,
        fromClubId: previousClubId || '',
        toClubId: userClub.id,
        fee: offerAmount,
        type: 'TRANSFER',
        date: currentSave.gameDate,
      });

      // Add transfer news
      const newsDescription = isClausePayment
        ? `${userClub.shortCode} paga la cláusula de rescisión de ${formatCurrency(offerAmount)}.`
        : `${sellerClub.shortCode} vende al jugador por ${formatCurrency(offerAmount)}.`;

      currentSave.newsItems.unshift(createNewsItem(
        'TRANSFER',
        `${player.name} ficha por ${userClub.shortCode}`,
        newsDescription,
        currentSave.gameDate,
        [player.id, userClub.id, sellerClub.id]
      ));
      currentSave.newsItems = currentSave.newsItems.slice(0, 50);

      saveManager.scheduleAutoSave();
      setCurrentSave({ ...currentSave });

      const successMessage = isClausePayment
        ? `¡Cláusula pagada! ${player.name} es tuyo.`
        : `${player.name} fichado por ${formatCurrency(offerAmount)}!`;
      return { success: true, message: successMessage };
    } else {
      // Rejected
      const offerRatio = offerAmount / player.marketValue;
      if (offerRatio < 0.7) {
        return { success: false, message: `${sellerClub.shortCode} rechazó la oferta. Muy baja.` };
      } else {
        return { success: false, message: `${sellerClub.shortCode} rechazó la oferta.` };
      }
    }
  }, [currentSave]);

  // Sell a player to another club (CPU-initiated or forced)
  const sellPlayer = useCallback((playerId: string, buyerClubId: string, amount: number): boolean => {
    if (!currentSave) return false;

    const player = currentSave.players.find(p => p.id === playerId);
    if (!player) return false;

    const userClub = currentSave.clubs.find(c => c.id === currentSave.userClubId);
    const buyerClub = currentSave.clubs.find(c => c.id === buyerClubId);

    if (!userClub || !buyerClub) return false;
    if (player.clubId !== userClub.id) return false;

    // Transfer
    player.clubId = buyerClubId;
    player.transferStatus = 'AVAILABLE';
    // Ensure budget exists
    if (userClub.budget === undefined) userClub.budget = userClub.balance || 0;
    if (buyerClub.budget === undefined) buyerClub.budget = buyerClub.balance || 0;
    userClub.budget += amount;
    buyerClub.budget = Math.max(0, buyerClub.budget - amount);

    currentSave.transferHistory.push({
      id: `transfer_${Date.now()}`,
      playerId: player.id,
      fromClubId: userClub.id,
      toClubId: buyerClubId,
      fee: amount,
      type: 'TRANSFER',
      date: currentSave.gameDate,
    });

    saveManager.scheduleAutoSave();
    setCurrentSave({ ...currentSave });

    return true;
  }, [currentSave]);

  // Simulate to a specific matchday - auto-simulate user matches
  const simulateToMatchday = useCallback((targetMatchday: number, leagueId: string) => {
    if (!currentSave || !fixtures) return;

    const leagueFixtures = fixtures[leagueId];
    if (!leagueFixtures) return;

    const userClubId = currentSave.userClubId;
    const competition = currentSave.competitions.find(c => c.id === leagueId);

    // Find user fixtures that need to be simulated (up to target matchday)
    const userFixturesToSimulate = leagueFixtures.filter(
      f => f.status === 'SCHEDULED' &&
           f.matchday <= targetMatchday &&
           (f.homeClubId === userClubId || f.awayClubId === userClubId)
    ).sort((a, b) => a.matchday - b.matchday);

    if (userFixturesToSimulate.length === 0) return;

    // Simulate each user match
    for (const fixture of userFixturesToSimulate) {
      const homeClub = currentSave.clubs.find(c => c.id === fixture.homeClubId);
      const awayClub = currentSave.clubs.find(c => c.id === fixture.awayClubId);
      const homePlayers = currentSave.players.filter(p => p.clubId === fixture.homeClubId);
      const awayPlayers = currentSave.players.filter(p => p.clubId === fixture.awayClubId);

      // Filter available players
      const isPlayerAvailable = (p: any) => {
        if (p.injuredUntil && p.injuredUntil > currentSave.gameDate) return false;
        if (p.suspendedUntil && p.suspendedUntil > currentSave.gameDate) return false;
        return true;
      };
      const availableHomePlayers = homePlayers.filter(isPlayerAvailable);
      const availableAwayPlayers = awayPlayers.filter(isPlayerAvailable);

      if (homeClub && awayClub && availableHomePlayers.length >= 11 && availableAwayPlayers.length >= 11) {
        const homeTeam = createMatchTeam(homeClub.id, homeClub.name, availableHomePlayers, '4-3-3', 'BALANCED', currentSave.gameDate);
        const awayTeam = createMatchTeam(awayClub.id, awayClub.name, availableAwayPlayers, '4-3-3', 'BALANCED', currentSave.gameDate);

        const matchResult = simulateMatch(homeTeam, awayTeam);

        // Update fixture
        const fixtureIndex = leagueFixtures.findIndex(
          f => f.homeClubId === fixture.homeClubId && f.awayClubId === fixture.awayClubId && f.matchday === fixture.matchday
        );
        if (fixtureIndex !== -1) {
          leagueFixtures[fixtureIndex] = {
            ...leagueFixtures[fixtureIndex],
            status: 'FINISHED',
            homeScore: matchResult.homeScore,
            awayScore: matchResult.awayScore,
          };
        }

        // Update standings
        if (competition?.standings) {
          const homeStanding = competition.standings.find((s: any) => s.clubId === fixture.homeClubId);
          const awayStanding = competition.standings.find((s: any) => s.clubId === fixture.awayClubId);

          if (homeStanding) {
            homeStanding.played++;
            homeStanding.goalsFor += matchResult.homeScore;
            homeStanding.goalsAgainst += matchResult.awayScore;
            if (matchResult.homeScore > matchResult.awayScore) {
              homeStanding.won++;
              homeStanding.points += 3;
              homeStanding.form = ['W', ...homeStanding.form.slice(0, 4)];
            } else if (matchResult.homeScore < matchResult.awayScore) {
              homeStanding.lost++;
              homeStanding.form = ['L', ...homeStanding.form.slice(0, 4)];
            } else {
              homeStanding.drawn++;
              homeStanding.points += 1;
              homeStanding.form = ['D', ...homeStanding.form.slice(0, 4)];
            }
          }

          if (awayStanding) {
            awayStanding.played++;
            awayStanding.goalsFor += matchResult.awayScore;
            awayStanding.goalsAgainst += matchResult.homeScore;
            if (matchResult.awayScore > matchResult.homeScore) {
              awayStanding.won++;
              awayStanding.points += 3;
              awayStanding.form = ['W', ...awayStanding.form.slice(0, 4)];
            } else if (matchResult.awayScore < matchResult.homeScore) {
              awayStanding.lost++;
              awayStanding.form = ['L', ...awayStanding.form.slice(0, 4)];
            } else {
              awayStanding.drawn++;
              awayStanding.points += 1;
              awayStanding.form = ['D', ...awayStanding.form.slice(0, 4)];
            }
          }
        }

        // Update player stats
        for (const event of matchResult.events) {
          if (event.type === 'GOAL') {
            const scorer = currentSave.players.find(p => p.id === event.playerId);
            if (scorer) scorer.currentSeasonStats.goals++;
            if (event.assistPlayerId) {
              const assister = currentSave.players.find(p => p.id === event.assistPlayerId);
              if (assister) assister.currentSeasonStats.assists++;
            }
          } else if (event.type === 'YELLOW') {
            const player = currentSave.players.find(p => p.id === event.playerId);
            if (player) player.currentSeasonStats.yellowCards++;
          } else if (event.type === 'RED') {
            const player = currentSave.players.find(p => p.id === event.playerId);
            if (player) player.currentSeasonStats.redCards++;
          }
        }

        // Update appearances
        const allPlayersInMatch = [
          ...(matchResult.homeLineup || []),
          ...(matchResult.awayLineup || []),
          ...(matchResult.homeSubsIn || []),
          ...(matchResult.awaySubsIn || []),
        ];
        for (const playerId of allPlayersInMatch) {
          const player = currentSave.players.find(p => p.id === playerId);
          if (player) player.currentSeasonStats.appearances++;
        }

        // Add to match history
        if (currentSave.matchHistory.length < 500) {
          currentSave.matchHistory.push({
            id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            date: fixture.date || currentSave.gameDate,
            competitionId: leagueId,
            homeClubId: fixture.homeClubId,
            awayClubId: fixture.awayClubId,
            homeScore: matchResult.homeScore,
            awayScore: matchResult.awayScore,
            events: matchResult.events.map(e => ({
              minute: e.minute,
              type: e.type as 'GOAL' | 'ASSIST' | 'YELLOW' | 'RED' | 'SUB',
              playerId: e.playerId,
              clubId: e.teamIndex === 0 ? fixture.homeClubId : fixture.awayClubId,
              assistPlayerId: e.assistPlayerId,
            })),
          });
        }

        // Simulate all other matches for this matchday (CPU vs CPU)
        for (const [otherLeagueId, otherLeagueFixtures] of Object.entries(fixtures)) {
          if (!otherLeagueFixtures) continue;
          const otherComp = currentSave.competitions.find(c => c.id === otherLeagueId);
          const cpuMatches = otherLeagueFixtures.filter(
            f => f.status === 'SCHEDULED' &&
                 f.matchday === fixture.matchday &&
                 f.homeClubId !== userClubId &&
                 f.awayClubId !== userClubId
          );

          for (const cpuFixture of cpuMatches) {
            const cpuHomeClub = currentSave.clubs.find(c => c.id === cpuFixture.homeClubId);
            const cpuAwayClub = currentSave.clubs.find(c => c.id === cpuFixture.awayClubId);
            const cpuHomePlayers = currentSave.players.filter(p => p.clubId === cpuFixture.homeClubId);
            const cpuAwayPlayers = currentSave.players.filter(p => p.clubId === cpuFixture.awayClubId);

            const availableCpuHome = cpuHomePlayers.filter(isPlayerAvailable);
            const availableCpuAway = cpuAwayPlayers.filter(isPlayerAvailable);

            if (cpuHomeClub && cpuAwayClub && availableCpuHome.length >= 11 && availableCpuAway.length >= 11) {
              const cpuHomeTeam = createMatchTeam(cpuHomeClub.id, cpuHomeClub.name, availableCpuHome, '4-3-3', 'BALANCED', currentSave.gameDate);
              const cpuAwayTeam = createMatchTeam(cpuAwayClub.id, cpuAwayClub.name, availableCpuAway, '4-3-3', 'BALANCED', currentSave.gameDate);
              const cpuResult = simulateMatch(cpuHomeTeam, cpuAwayTeam);

              // Update CPU fixture
              const cpuFixtureIndex = otherLeagueFixtures.findIndex(
                f => f.homeClubId === cpuFixture.homeClubId && f.awayClubId === cpuFixture.awayClubId && f.matchday === cpuFixture.matchday
              );
              if (cpuFixtureIndex !== -1) {
                otherLeagueFixtures[cpuFixtureIndex] = {
                  ...otherLeagueFixtures[cpuFixtureIndex],
                  status: 'FINISHED',
                  homeScore: cpuResult.homeScore,
                  awayScore: cpuResult.awayScore,
                };
              }

              // Update CPU standings
              if (otherComp?.standings) {
                const cpuHomeStanding = otherComp.standings.find((s: any) => s.clubId === cpuFixture.homeClubId);
                const cpuAwayStanding = otherComp.standings.find((s: any) => s.clubId === cpuFixture.awayClubId);

                if (cpuHomeStanding) {
                  cpuHomeStanding.played++;
                  cpuHomeStanding.goalsFor += cpuResult.homeScore;
                  cpuHomeStanding.goalsAgainst += cpuResult.awayScore;
                  if (cpuResult.homeScore > cpuResult.awayScore) {
                    cpuHomeStanding.won++;
                    cpuHomeStanding.points += 3;
                    cpuHomeStanding.form = ['W', ...cpuHomeStanding.form.slice(0, 4)];
                  } else if (cpuResult.homeScore < cpuResult.awayScore) {
                    cpuHomeStanding.lost++;
                    cpuHomeStanding.form = ['L', ...cpuHomeStanding.form.slice(0, 4)];
                  } else {
                    cpuHomeStanding.drawn++;
                    cpuHomeStanding.points += 1;
                    cpuHomeStanding.form = ['D', ...cpuHomeStanding.form.slice(0, 4)];
                  }
                }

                if (cpuAwayStanding) {
                  cpuAwayStanding.played++;
                  cpuAwayStanding.goalsFor += cpuResult.awayScore;
                  cpuAwayStanding.goalsAgainst += cpuResult.homeScore;
                  if (cpuResult.awayScore > cpuResult.homeScore) {
                    cpuAwayStanding.won++;
                    cpuAwayStanding.points += 3;
                    cpuAwayStanding.form = ['W', ...cpuAwayStanding.form.slice(0, 4)];
                  } else if (cpuResult.awayScore < cpuResult.homeScore) {
                    cpuAwayStanding.lost++;
                    cpuAwayStanding.form = ['L', ...cpuAwayStanding.form.slice(0, 4)];
                  } else {
                    cpuAwayStanding.drawn++;
                    cpuAwayStanding.points += 1;
                    cpuAwayStanding.form = ['D', ...cpuAwayStanding.form.slice(0, 4)];
                  }
                }
              }

              // Update CPU player stats
              for (const event of cpuResult.events) {
                if (event.type === 'GOAL') {
                  const scorer = currentSave.players.find(p => p.id === event.playerId);
                  if (scorer) scorer.currentSeasonStats.goals++;
                  if (event.assistPlayerId) {
                    const assister = currentSave.players.find(p => p.id === event.assistPlayerId);
                    if (assister) assister.currentSeasonStats.assists++;
                  }
                }
              }

              // Update CPU appearances
              const cpuPlayersInMatch = [
                ...(cpuResult.homeLineup || []),
                ...(cpuResult.awayLineup || []),
              ];
              for (const playerId of cpuPlayersInMatch) {
                const player = currentSave.players.find(p => p.id === playerId);
                if (player) player.currentSeasonStats.appearances++;
              }
            }
          }
        }
      }
    }

    // Update date to match the target matchday date
    const lastSimulatedFixture = userFixturesToSimulate[userFixturesToSimulate.length - 1];
    if (lastSimulatedFixture?.date) {
      currentSave.gameDate = lastSimulatedFixture.date;
    }

    // Update fixtures in save before checking season end
    currentSave.fixtures = { ...fixtures };

    // Check if season should end (all league fixtures finished)
    if (saveManager.isSeasonComplete()) {
      // Season complete - show summary screen instead of auto-processing
      setShowSeasonSummary(true);
    }

    // Update fixtures and save
    setFixtures({ ...fixtures });
    saveManager.scheduleAutoSave();
    setCurrentSave({ ...currentSave });
  }, [currentSave, fixtures]);

  // Start a new season (called from season summary screen)
  const startNewSeason = useCallback(() => {
    saveManager.startNewSeason();
    const updatedSave = saveManager.getCurrentSave();
    if (updatedSave) {
      setFixtures(updatedSave.fixtures || null);
      setCurrentSave({ ...updatedSave });
    }
    setShowSeasonSummary(false);
  }, []);

  // Get pending offers (filter expired ones)
  const pendingOffers = useMemo(() => {
    if (!currentSave) return [];
    // Initialize receivedOffers if it doesn't exist (for legacy saves)
    const offers = currentSave.receivedOffers || [];
    return offers.filter(o =>
      o.status === 'PENDING' && o.expiresDate >= currentSave.gameDate
    );
  }, [currentSave]);

  // Respond to a transfer offer
  const respondToOffer = useCallback((offerId: string, accept: boolean) => {
    if (!currentSave) return;

    // Initialize if doesn't exist
    if (!currentSave.receivedOffers) currentSave.receivedOffers = [];

    const offer = currentSave.receivedOffers.find(o => o.id === offerId);
    if (!offer || offer.status !== 'PENDING') return;

    if (accept) {
      const player = currentSave.players.find(p => p.id === offer.playerId);
      const userClub = currentSave.clubs.find(c => c.id === currentSave.userClubId);
      const buyerClub = currentSave.clubs.find(c => c.id === offer.fromClubId);

      if (player && userClub && buyerClub) {
        // Transfer the player
        player.clubId = buyerClub.id;
        player.transferStatus = 'AVAILABLE';

        // Update finances
        if (userClub.budget === undefined) userClub.budget = userClub.balance || 0;
        if (buyerClub.budget === undefined) buyerClub.budget = buyerClub.balance || 0;
        userClub.budget += offer.amount;
        buyerClub.budget -= offer.amount;

        // Add to transfer history
        currentSave.transferHistory.push({
          id: `transfer_${Date.now()}`,
          date: currentSave.gameDate,
          playerId: player.id,
          fromClubId: userClub.id,
          toClubId: buyerClub.id,
          fee: offer.amount,
          type: 'TRANSFER',
        });

        // Add news
        currentSave.newsItems.unshift(createNewsItem(
          'TRANSFER',
          `${player.name} vendido a ${buyerClub.name}`,
          `${userClub.name} acepta la oferta de ${formatCurrency(offer.amount)} por ${player.name}.`,
          currentSave.gameDate,
          [player.id, buyerClub.id]
        ));

        offer.status = 'ACCEPTED';
      }
    } else {
      offer.status = 'REJECTED';
    }

    saveManager.scheduleAutoSave();
    setCurrentSave({ ...currentSave });
  }, [currentSave]);

  const value: GameContextValue = {
    isInitialized,
    isLoading,
    initError,
    currentSave,
    saves,
    masterDb,
    fixtures,
    createNewGame,
    loadSave,
    deleteSave,
    continueSave,
    exitToMenu,
    refreshSaves,
    advanceDay,
    getClub,
    getPlayer,
    getUserClub,
    getUserSquad,
    processMatchResult,
    getNextMatch,
    getUpcomingFixtures,
    getLeagueFixtures,
    updatePlayerTransferStatus,
    makeTransferOffer,
    sellPlayer,
    simulateToMatchday,
    isSeasonComplete,
    showSeasonSummary,
    setShowSeasonSummary,
    startNewSeason,
    pendingOffers,
    respondToOffer,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}
