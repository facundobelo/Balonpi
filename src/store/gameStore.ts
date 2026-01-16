// @ts-nocheck
// TODO: Update to use new GameContext instead
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IPlayer, IClub, IManager, ICompetition, IUserCareer, GameDate, TransferWindow } from '../game/types';

// -----------------------------------------------------------------------------
// GAME STATE INTERFACE
// -----------------------------------------------------------------------------

interface GameState {
  // Core data
  players: Map<string, IPlayer>;
  clubs: Map<string, IClub>;
  managers: Map<string, IManager>;
  competitions: Map<string, ICompetition>;

  // User state
  userCareer: IUserCareer | null;
  userClubId: string | null;

  // World state
  currentDate: GameDate;
  seasonId: string;
  transferWindow: TransferWindow;

  // UI state
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setUserCareer: (career: IUserCareer) => void;
  setUserClub: (clubId: string) => void;
  advanceWeek: () => void;
  updatePlayer: (player: IPlayer) => void;
  reset: () => void;
}

// -----------------------------------------------------------------------------
// INITIAL STATE
// -----------------------------------------------------------------------------

const initialState = {
  players: new Map<string, IPlayer>(),
  clubs: new Map<string, IClub>(),
  managers: new Map<string, IManager>(),
  competitions: new Map<string, ICompetition>(),
  userCareer: null,
  userClubId: null,
  currentDate: { year: 2026, month: 7, week: 1, day: 1 },
  seasonId: '2026-27',
  transferWindow: {
    isOpen: true,
    isDeadlineDay: false,
    flashSales: [],
    closingDate: '2026-09-01',
  },
  isLoading: false,
  isInitialized: false,
};

// -----------------------------------------------------------------------------
// ZUSTAND STORE
// -----------------------------------------------------------------------------

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initialize: async () => {
        set({ isLoading: true });

        // TODO: Load from GenesisLoader
        // For now, just mark as initialized
        await new Promise((resolve) => setTimeout(resolve, 500));

        set({
          isLoading: false,
          isInitialized: true,
        });
      },

      setUserCareer: (career) => {
        set({ userCareer: career });
      },

      setUserClub: (clubId) => {
        set({ userClubId: clubId });
      },

      advanceWeek: () => {
        const { currentDate } = get();

        let newWeek = currentDate.week + 1;
        let newMonth = currentDate.month;
        let newYear = currentDate.year;

        if (newWeek > 4) {
          newWeek = 1;
          newMonth++;
        }

        if (newMonth > 12) {
          newMonth = 1;
          newYear++;
        }

        set({
          currentDate: {
            ...currentDate,
            year: newYear,
            month: newMonth,
            week: newWeek,
          },
        });
      },

      updatePlayer: (player) => {
        const { players } = get();
        const newPlayers = new Map(players);
        newPlayers.set(player.id, player);
        set({ players: newPlayers });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'balonpi-game-state',
      partialize: (state) => ({
        userCareer: state.userCareer,
        userClubId: state.userClubId,
        currentDate: state.currentDate,
        seasonId: state.seasonId,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// SELECTORS
// -----------------------------------------------------------------------------

export const selectUserClub = (state: GameState) => {
  if (!state.userClubId) return null;
  return state.clubs.get(state.userClubId) ?? null;
};

export const selectUserSquad = (state: GameState) => {
  const club = selectUserClub(state);
  if (!club) return [];

  return club.squadIds
    .map((id) => state.players.get(id))
    .filter((p): p is IPlayer => p !== undefined);
};

export const selectUserCompetitions = (state: GameState) => {
  const club = selectUserClub(state);
  if (!club) return [];

  return Array.from(state.competitions.values()).filter((comp) =>
    comp.teamIds.includes(club.id)
  );
};
