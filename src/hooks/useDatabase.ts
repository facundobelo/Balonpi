import { useState, useEffect } from 'react';
import type { MasterDatabaseSchema, IPlayer, IClub } from '../game/types';

interface DatabaseState {
  data: MasterDatabaseSchema | null;
  isLoading: boolean;
  error: string | null;
}

export function useDatabase() {
  const [state, setState] = useState<DatabaseState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function loadDatabase() {
      try {
        const response = await fetch('/data/master_db_2026.json');
        if (!response.ok) {
          throw new Error('Failed to load database');
        }
        const data = await response.json();
        setState({ data, isLoading: false, error: null });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    loadDatabase();
  }, []);

  return state;
}

export function useClub(clubId: string) {
  const { data, isLoading, error } = useDatabase();

  const club = data?.clubs.find((c) => c.id === clubId) ?? null;
  const players = club
    ? data?.players.filter((p) => p.clubId === clubId) ?? []
    : [];

  return { club, players, isLoading, error };
}

export function usePlayer(playerId: string) {
  const { data, isLoading, error } = useDatabase();
  const player = data?.players.find((p) => p.id === playerId) ?? null;

  return { player, isLoading, error };
}

export function useCompetition(competitionId: string) {
  const { data, isLoading, error } = useDatabase();

  const competition = data?.competitions.find((c) => c.id === competitionId) ?? null;
  const clubs = competition
    ? data?.clubs.filter((c) => competition.teamIds.includes(c.id)) ?? []
    : [];

  return { competition, clubs, isLoading, error };
}

export function useTopPlayers(limit: number = 20) {
  const { data, isLoading, error } = useDatabase();

  const players = data?.players
    .sort((a, b) => b.skillBase - a.skillBase)
    .slice(0, limit) ?? [];

  return { players, isLoading, error };
}

export function useTransferTargets(
  options: {
    position?: string;
    maxValue?: number;
    minSkill?: number;
    excludeClubId?: string;
  } = {}
) {
  const { data, isLoading, error } = useDatabase();

  let players = data?.players.filter((p) =>
    p.transferStatus === 'AVAILABLE' || p.transferStatus === 'LISTED'
  ) ?? [];

  if (options.position) {
    players = players.filter((p) => p.positionMain === options.position);
  }

  if (options.maxValue !== undefined) {
    const maxValue = options.maxValue;
    players = players.filter((p) => p.marketValue <= maxValue);
  }

  if (options.minSkill !== undefined) {
    const minSkill = options.minSkill;
    players = players.filter((p) => p.skillBase >= minSkill);
  }

  if (options.excludeClubId) {
    players = players.filter((p) => p.clubId !== options.excludeClubId);
  }

  // Sort by value descending
  players.sort((a, b) => b.marketValue - a.marketValue);

  return { players, isLoading, error };
}
