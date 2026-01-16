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

    // Add to match history
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

    // Simulate other league matches for the same matchday
    if (competitionId && fixtures) {
      const competitionFixtures = fixtures[competitionId];
      if (competitionFixtures) {
        // Find the user's fixture to get the matchday
        const userFixture = competitionFixtures.find(
          f => f.homeClubId === homeClubId && f.awayClubId === awayClubId
        );
        const currentMatchday = userFixture?.matchday;

        // Find other fixtures that are SCHEDULED, same matchday, and not the user's match
        const otherMatches = competitionFixtures.filter(
          f => f.status === 'SCHEDULED' &&
               f.matchday === currentMatchday &&
               !(f.homeClubId === homeClubId && f.awayClubId === awayClubId) &&
               !(f.homeClubId === currentSave.userClubId || f.awayClubId === currentSave.userClubId)
        );

        // Simulate each match
        for (const fixture of otherMatches) {
          const homeClub = currentSave.clubs.find(c => c.id === fixture.homeClubId);
          const awayClub = currentSave.clubs.find(c => c.id === fixture.awayClubId);
          const homePlayers = currentSave.players.filter(p => p.clubId === fixture.homeClubId);
          const awayPlayers = currentSave.players.filter(p => p.clubId === fixture.awayClubId);

          if (homeClub && awayClub && homePlayers.length >= 11 && awayPlayers.length >= 11) {
            // Create match teams (pass current date to filter injured/suspended players)
            const homeTeam = createMatchTeam(homeClub.id, homeClub.name, homePlayers, '4-3-3', 'BALANCED', currentSave.gameDate);
            const awayTeam = createMatchTeam(awayClub.id, awayClub.name, awayPlayers, '4-3-3', 'BALANCED', currentSave.gameDate);

            // Simulate the match
            const matchResult = simulateMatch(homeTeam, awayTeam);

            // Update fixture status
            const fixtureIndex = competitionFixtures.findIndex(
              f => f.homeClubId === fixture.homeClubId && f.awayClubId === fixture.awayClubId
            );
            if (fixtureIndex !== -1) {
              competitionFixtures[fixtureIndex] = {
                ...competitionFixtures[fixtureIndex],
                status: 'FINISHED',
                homeScore: matchResult.homeScore,
                awayScore: matchResult.awayScore,
              };
            }

            // Update standings
            const competition = currentSave.competitions.find(c => c.id === competitionId);
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

            // Update player stats for all events (goals, assists, cards, injuries)
            for (const event of matchResult.events) {
              if (event.type === 'GOAL') {
                const scorer = currentSave.players.find(p => p.id === event.playerId);
                if (scorer) {
                  scorer.currentSeasonStats.goals++;
                }
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
                  // Suspend for 1 match
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

            // Update appearances for players who played (using lineup from matchResult)
            const allPlayersInMatch = [
              ...(matchResult.homeLineup || []),
              ...(matchResult.awayLineup || []),
              ...(matchResult.homeSubsIn || []),
              ...(matchResult.awaySubsIn || []),
            ];
            for (const playerId of allPlayersInMatch) {
              const player = currentSave.players.find(p => p.id === playerId);
              if (player) {
                player.currentSeasonStats.appearances++;
              }
            }

            // Update clean sheets for goalkeepers
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

            // Add to match history
            currentSave.matchHistory.push({
              id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              date: currentSave.gameDate,
              competitionId: competitionId,
              homeClubId: fixture.homeClubId,
              awayClubId: fixture.awayClubId,
              homeScore: matchResult.homeScore,
              awayScore: matchResult.awayScore,
              events: [],
            });
          }
        }

        // Update fixtures in save after all simulations
        currentSave.fixtures = { ...fixtures };
        setFixtures({ ...fixtures });
      }
    }

    // Advance game date by 7 days (next matchday)
    const currentDate = new Date(currentSave.gameDate);
    currentDate.setDate(currentDate.getDate() + 7);
    currentSave.gameDate = currentDate.toISOString().split('T')[0];

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

    // Check budget
    if (offerAmount > userClub.budget) {
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
      // Transfer the player
      const previousClubId = player.clubId;
      player.clubId = userClub.id;
      player.transferStatus = 'AVAILABLE';

      // Update finances
      userClub.budget -= offerAmount;
      sellerClub.budget = (sellerClub.budget || 0) + offerAmount;

      // Update wages (rough estimate)
      const newWage = Math.round((player.skillBase * 2000 + player.marketValue * 0.001) / 1000) * 1000;
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
    userClub.budget += amount;
    buyerClub.budget = Math.max(0, (buyerClub.budget || 0) - amount);

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
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}
