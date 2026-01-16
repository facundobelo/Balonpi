/**
 * AllStandingsView - Multi-division standings display
 *
 * Shows all leagues/divisions standings simultaneously in a grid,
 * similar to the classic Cyberfoot interface.
 */

import { useGame } from '../../contexts/GameContext';

interface AllStandingsViewProps {
  onSelectClub?: (clubId: string) => void;
  selectedClubId?: string;
}

export function AllStandingsView({ onSelectClub, selectedClubId }: AllStandingsViewProps) {
  const { currentSave, getUserClub, getClub } = useGame();

  const userClub = getUserClub();

  if (!currentSave) {
    return (
      <div className="p-4 text-center text-[var(--color-text-secondary)]">
        No data available
      </div>
    );
  }

  // Get user's country to filter leagues
  const userCountry = userClub?.country;

  // Get all league competitions from user's country sorted by tier
  const leagues = currentSave.competitions
    .filter(c => c.type === 'LEAGUE' && c.country === userCountry)
    .sort((a, b) => (a.tier || 1) - (b.tier || 1));

  return (
    <div className="all-standings-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-bold text-[var(--color-accent-yellow)]">
          Clasificaciones
        </h2>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {currentSave.season}
        </span>
      </div>

      {/* Standings Grid - 2 columns */}
      <div className="grid md:grid-cols-2 gap-3">
        {leagues.map((league) => (
          <StandingsCard
            key={league.id}
            league={league}
            userClubId={userClub?.id}
            getClub={getClub}
            onSelectClub={onSelectClub}
            selectedClubId={selectedClubId}
          />
        ))}
      </div>
    </div>
  );
}

interface StandingsCardProps {
  league: any;
  userClubId?: string;
  getClub: (clubId: string) => any | null;
  onSelectClub?: (clubId: string) => void;
  selectedClubId?: string;
}

function StandingsCard({
  league,
  userClubId,
  getClub,
  onSelectClub,
  selectedClubId,
}: StandingsCardProps) {
  const isUserLeague = league.teamIds.includes(userClubId);

  // Sort standings by points, then goal difference
  const sortedStandings = [...(league.standings || [])].sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    return gdB - gdA;
  });

  return (
    <div
      className={`rounded-lg overflow-hidden ${
        isUserLeague
          ? 'border-2 border-[var(--color-accent-green)]'
          : 'border border-[var(--color-border)]'
      }`}
    >
      {/* League Header */}
      <div
        className={`px-3 py-2 ${
          isUserLeague
            ? 'bg-[var(--color-accent-green)]/20'
            : 'bg-[var(--color-bg-tertiary)]'
        }`}
      >
        <span className={`font-semibold text-sm ${
          isUserLeague ? 'text-[var(--color-accent-green)]' : ''
        }`}>
          {league.shortName || league.name}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[auto_1fr_repeat(7,_minmax(0,_1fr))] gap-0 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] font-semibold">
        <div className="w-6 text-center py-1">#</div>
        <div className="py-1 px-1">Equipo</div>
        <div className="text-center py-1">Pt</div>
        <div className="text-center py-1">PJ</div>
        <div className="text-center py-1">PG</div>
        <div className="text-center py-1">PE</div>
        <div className="text-center py-1">PP</div>
        <div className="text-center py-1">GF</div>
        <div className="text-center py-1">GC</div>
      </div>

      {/* Table Body */}
      <div className="bg-[var(--color-bg-card)] max-h-[300px] overflow-y-auto">
        {sortedStandings.map((standing: any, index: number) => {
          const club = getClub(standing.clubId);
          const isUserTeam = standing.clubId === userClubId;
          const isSelected = standing.clubId === selectedClubId;

          // Position zone coloring (top 4 = promotion, bottom 3 = relegation)
          const getPositionColor = () => {
            if (index < 4) return 'text-[var(--color-accent-green)]';
            if (index >= sortedStandings.length - 3) return 'text-[var(--color-accent-red)]';
            return '';
          };

          // Row background based on position zones
          const getRowBg = () => {
            if (isUserTeam) return 'bg-[var(--color-accent-green)]/20';
            if (isSelected) return 'bg-[var(--color-accent-yellow)]/20';
            if (index < 4) return 'bg-[var(--color-accent-green)]/5';
            if (index >= sortedStandings.length - 3) return 'bg-[var(--color-accent-red)]/5';
            return index % 2 === 0 ? '' : 'bg-[var(--color-bg-tertiary)]/30';
          };

          return (
            <div
              key={standing.clubId}
              onClick={() => onSelectClub?.(standing.clubId)}
              className={`
                grid grid-cols-[auto_1fr_repeat(7,_minmax(0,_1fr))] gap-0 text-[11px]
                border-b border-[var(--color-border)]/50 last:border-0
                ${getRowBg()}
                ${onSelectClub ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]' : ''}
              `}
            >
              <div className={`w-6 text-center py-1 font-mono font-bold ${getPositionColor()}`}>
                {index + 1}
              </div>
              <div className={`py-1 px-1 truncate ${isUserTeam ? 'font-bold text-[var(--color-accent-green)]' : ''}`}>
                {club?.shortCode || standing.clubId.slice(0, 3).toUpperCase()}
              </div>
              <div className="text-center py-1 font-mono font-bold">{standing.points}</div>
              <div className="text-center py-1 font-mono">{standing.played}</div>
              <div className="text-center py-1 font-mono">{standing.won}</div>
              <div className="text-center py-1 font-mono">{standing.drawn}</div>
              <div className="text-center py-1 font-mono">{standing.lost}</div>
              <div className="text-center py-1 font-mono">{standing.goalsFor}</div>
              <div className="text-center py-1 font-mono">{standing.goalsAgainst}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
