import { useGame } from '../../contexts/GameContext';

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function SeasonSummaryModal() {
  const {
    currentSave,
    showSeasonSummary,
    setShowSeasonSummary,
    startNewSeason,
    getUserClub,
  } = useGame();

  if (!showSeasonSummary || !currentSave) return null;

  const userClub = getUserClub();
  if (!userClub) return null;

  // Get league and standings
  const userLeague = currentSave.competitions.find(c =>
    c.type === 'LEAGUE' && c.teamIds?.includes(userClub.id)
  );

  const sortedStandings = userLeague?.standings
    ? [...userLeague.standings].sort((a: any, b: any) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      })
    : [];

  const userStanding = sortedStandings.find((s: any) => s.clubId === userClub.id);
  const userPosition = sortedStandings.findIndex((s: any) => s.clubId === userClub.id) + 1;

  // Get user squad stats
  const userSquad = currentSave.players.filter(p => p.clubId === userClub.id);
  const topScorer = [...userSquad].sort((a, b) => b.currentSeasonStats.goals - a.currentSeasonStats.goals)[0];
  const topAssister = [...userSquad].sort((a, b) => b.currentSeasonStats.assists - a.currentSeasonStats.assists)[0];

  // Get match history for user
  const userMatches = currentSave.matchHistory.filter(
    m => m.homeClubId === userClub.id || m.awayClubId === userClub.id
  );
  const wins = userMatches.filter(m => {
    const isHome = m.homeClubId === userClub.id;
    return isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
  }).length;
  const draws = userMatches.filter(m => m.homeScore === m.awayScore).length;
  const losses = userMatches.length - wins - draws;

  // Check board objectives
  const boardObjectives = currentSave.boardObjectives;
  const primaryObjective = boardObjectives?.objectives.find((o: any) => o.priority === 'PRIMARY');
  let primaryObjectiveMet = false;
  if (primaryObjective) {
    if (primaryObjective.type === 'LEAGUE_POSITION' || primaryObjective.type === 'AVOID_RELEGATION') {
      primaryObjectiveMet = userPosition <= primaryObjective.target;
    } else if (primaryObjective.type === 'WIN_TITLE') {
      primaryObjectiveMet = userPosition === 1;
    }
  }

  const isChampion = userPosition === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[var(--color-bg-card)] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 text-center ${isChampion ? 'bg-gradient-to-br from-yellow-600 to-yellow-800' : 'bg-gradient-to-br from-[var(--color-accent-green)] to-green-800'}`}>
          {isChampion ? (
            <>
              <div className="text-4xl mb-2">🏆</div>
              <h1 className="text-2xl font-bold text-white">CAMPEONES!</h1>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">📊</div>
              <h1 className="text-2xl font-bold text-white">Fin de Temporada</h1>
            </>
          )}
          <p className="text-white/80 text-sm mt-1">{currentSave.season}</p>
          <p className="text-white font-semibold mt-2">{userClub.name}</p>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-4">
          {/* Final Position */}
          <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-4 text-center">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">Posición Final</div>
            <div className="text-4xl font-bold text-[var(--color-accent-green)]">{userPosition}°</div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {userLeague?.name || 'Liga'}
            </div>
          </div>

          {/* Record */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[var(--color-accent-green)]">{wins}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Victorias</div>
            </div>
            <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[var(--color-text-secondary)]">{draws}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Empates</div>
            </div>
            <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[var(--color-accent-red)]">{losses}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Derrotas</div>
            </div>
          </div>

          {/* Goals */}
          {userStanding && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[var(--color-accent-green)]">{userStanding.goalsFor}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Goles a favor</div>
              </div>
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[var(--color-accent-red)]">{userStanding.goalsAgainst}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Goles en contra</div>
              </div>
            </div>
          )}

          {/* Top Players */}
          {(topScorer?.currentSeasonStats.goals > 0 || topAssister?.currentSeasonStats.assists > 0) && (
            <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Destacados del Equipo</h3>
              <div className="space-y-2">
                {topScorer && topScorer.currentSeasonStats.goals > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">⚽</span>
                      <span className="text-sm">{topScorer.name}</span>
                    </div>
                    <span className="font-mono font-bold text-[var(--color-accent-green)]">
                      {topScorer.currentSeasonStats.goals} goles
                    </span>
                  </div>
                )}
                {topAssister && topAssister.currentSeasonStats.assists > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400">👟</span>
                      <span className="text-sm">{topAssister.name}</span>
                    </div>
                    <span className="font-mono font-bold text-[var(--color-accent-cyan)]">
                      {topAssister.currentSeasonStats.assists} asistencias
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Board Objective Result */}
          {primaryObjective && (
            <div className={`rounded-xl p-4 ${primaryObjectiveMet ? 'bg-[var(--color-accent-green)]/20' : 'bg-[var(--color-accent-red)]/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{primaryObjectiveMet ? '✅' : '❌'}</span>
                <span className="text-sm font-semibold">
                  {primaryObjectiveMet ? 'Objetivo Cumplido' : 'Objetivo No Cumplido'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">{primaryObjective.description}</p>
              {primaryObjectiveMet && primaryObjective.reward && (
                <p className="text-xs text-[var(--color-accent-green)] mt-1">
                  Bonus recibido: {formatCurrency(primaryObjective.reward)}
                </p>
              )}
            </div>
          )}

          {/* Finances */}
          <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">Balance Financiero</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Presupuesto actual</span>
              <span className="font-mono font-bold text-[var(--color-accent-green)]">
                {formatCurrency(userClub.budget || userClub.balance || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <button
            onClick={startNewSeason}
            className="w-full btn bg-[var(--color-accent-green)] text-black font-bold py-4 text-lg"
          >
            Comenzar Nueva Temporada
          </button>
          <button
            onClick={() => setShowSeasonSummary(false)}
            className="w-full btn btn-ghost mt-2 text-[var(--color-text-secondary)]"
          >
            Ver más detalles
          </button>
        </div>
      </div>
    </div>
  );
}
