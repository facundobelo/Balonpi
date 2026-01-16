import { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

export function OfficePage() {
  const { currentSave, getUserClub, exitToMenu } = useGame();
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showVacantJobs, setShowVacantJobs] = useState(false);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const userClub = getUserClub();

  if (!currentSave || !userClub) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-text-secondary)]">No active game</div>
      </div>
    );
  }

  // Get current league standing
  const userLeague = currentSave.competitions.find(c =>
    c.type === 'LEAGUE' && c.teamIds?.includes(userClub.id)
  );
  const currentStanding = userLeague?.standings?.find((s: any) => s.clubId === userClub.id);
  const currentPosition = currentStanding
    ? (userLeague?.standings?.sort((a: any, b: any) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      }).findIndex((s: any) => s.clubId === userClub.id) ?? -1) + 1
    : 0;

  // Calculate stats from match history
  const userMatches = currentSave.matchHistory.filter(
    m => m.homeClubId === userClub.id || m.awayClubId === userClub.id
  );
  const wins = userMatches.filter(m => {
    const isHome = m.homeClubId === userClub.id;
    return isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
  }).length;
  const draws = userMatches.filter(m => m.homeScore === m.awayScore).length;
  const losses = userMatches.length - wins - draws;
  const winRate = userMatches.length > 0 ? Math.round((wins / userMatches.length) * 100) : 0;

  // Get top scorers from user's squad
  const userSquad = currentSave.players.filter(p => p.clubId === userClub.id);
  const topScorers = [...userSquad]
    .sort((a, b) => b.currentSeasonStats.goals - a.currentSeasonStats.goals)
    .slice(0, 3);

  // Parse current date
  const currentDate = new Date(currentSave.gameDate);
  const dayOfWeek = currentDate.toLocaleDateString('es-ES', { weekday: 'long' });

  // Board objectives
  const boardObjectives = currentSave.boardObjectives;
  const boardConfidence = boardObjectives?.boardConfidence || 70;

  // Manager reputation
  const managerReputation = currentSave.managerReputation || 30;

  // Find vacant positions (clubs without managers - simulate with random vacancies)
  // In a real implementation, clubs would have a managerId field
  const vacantJobs = useMemo(() => {
    // Get all clubs that are NOT the user's club and in a league
    const eligibleClubs = currentSave.clubs
      .filter(c => c.id !== userClub.id && !c.isNationalTeam && c.leagueId);

    // Simulate vacancies - about 5-10% of clubs have vacancies
    // Use a deterministic "random" based on game date for consistency
    const dateHash = currentSave.gameDate.split('-').reduce((acc, val) => acc + parseInt(val), 0);

    return eligibleClubs
      .filter((_, index) => (index + dateHash) % 12 === 0) // ~8% of clubs
      .map(club => {
        // Calculate if user can apply based on reputation
        const repDiff = club.reputation - managerReputation;
        const canApply = repDiff <= 15; // Can apply if club rep is at most 15 higher
        const successChance = canApply
          ? Math.min(90, Math.max(10, 50 - repDiff * 3 + (wins * 2)))
          : 0;

        return {
          club,
          canApply,
          successChance,
        };
      })
      .sort((a, b) => b.club.reputation - a.club.reputation);
  }, [currentSave.clubs, currentSave.gameDate, userClub.id, managerReputation, wins]);

  // Get confidence color
  const getConfidenceColor = (conf: number) => {
    if (conf >= 70) return 'text-[var(--color-accent-green)]';
    if (conf >= 40) return 'text-[var(--color-accent-yellow)]';
    return 'text-[var(--color-accent-red)]';
  };

  // Get objective progress
  const getObjectiveProgress = (obj: any) => {
    if (obj.type === 'LEAGUE_POSITION' || obj.type === 'AVOID_RELEGATION') {
      return currentPosition > 0 ? `${currentPosition}°` : '-';
    }
    if (obj.type === 'WIN_TITLE') {
      return currentPosition === 1 ? 'Líder' : `${currentPosition}°`;
    }
    if (obj.type === 'FINANCIAL_BALANCE') {
      return formatCurrency(userClub.budget || userClub.balance || 0);
    }
    return '-';
  };

  // Get objective status
  const getObjectiveStatus = (obj: any) => {
    if (obj.type === 'LEAGUE_POSITION') {
      if (currentPosition > 0 && currentPosition <= obj.target) return 'ON_TRACK';
      if (currentPosition > obj.target + 3) return 'DANGER';
      return 'WARNING';
    }
    if (obj.type === 'AVOID_RELEGATION') {
      if (currentPosition > 0 && currentPosition <= obj.target) return 'ON_TRACK';
      if (currentPosition > obj.target) return 'DANGER';
      return 'ON_TRACK';
    }
    if (obj.type === 'WIN_TITLE') {
      if (currentPosition === 1) return 'ON_TRACK';
      if (currentPosition <= 3) return 'WARNING';
      return 'DANGER';
    }
    if (obj.type === 'FINANCIAL_BALANCE') {
      return (userClub.budget || userClub.balance || 0) >= 0 ? 'ON_TRACK' : 'DANGER';
    }
    return 'ON_TRACK';
  };

  const getStatusColor = (status: string) => {
    if (status === 'ON_TRACK') return 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]';
    if (status === 'WARNING') return 'bg-[var(--color-accent-yellow)]/20 text-[var(--color-accent-yellow)]';
    return 'bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]';
  };

  const getStatusText = (status: string) => {
    if (status === 'ON_TRACK') return 'En camino';
    if (status === 'WARNING') return 'Atención';
    return 'En peligro';
  };

  return (
    <div className="p-4">
      {/* Header with Date */}
      <header className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Oficina del Mánager</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">{userClub.name}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)] capitalize">{dayOfWeek}</div>
            <div className="text-sm font-mono text-[var(--color-accent-green)]">{currentSave.gameDate}</div>
          </div>
        </div>
      </header>

      {/* Manager Profile with Reputation */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-xl font-bold text-[var(--color-accent-green)]">
            {currentSave.userManagerName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{currentSave.userManagerName}</div>
            <div className="text-sm text-[var(--color-text-secondary)]">{userClub.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] px-2 py-0.5 rounded">
                {currentSave.season}
              </span>
              <span className="text-xs bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                Rep: {currentSave.managerReputation || 30}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Board Objectives */}
      {boardObjectives && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Objetivos de la Directiva</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">Confianza:</span>
              <span className={`font-bold ${getConfidenceColor(boardConfidence)}`}>
                {boardConfidence}%
              </span>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                boardConfidence >= 70 ? 'bg-[var(--color-accent-green)]' :
                boardConfidence >= 40 ? 'bg-[var(--color-accent-yellow)]' :
                'bg-[var(--color-accent-red)]'
              }`}
              style={{ width: `${boardConfidence}%` }}
            />
          </div>

          {/* Objectives List */}
          <div className="space-y-3">
            {boardObjectives.objectives.map((obj: any) => {
              const status = getObjectiveStatus(obj);
              return (
                <div
                  key={obj.id}
                  className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          obj.priority === 'PRIMARY'
                            ? 'bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]'
                            : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]'
                        }`}>
                          {obj.priority === 'PRIMARY' ? 'PRINCIPAL' : 'SECUNDARIO'}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{obj.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)]">
                      Situación actual: <span className="font-mono font-bold text-white">{getObjectiveProgress(obj)}</span>
                    </span>
                    {obj.reward && (
                      <span className="text-[var(--color-accent-green)]">
                        Bonus: {formatCurrency(obj.reward)}
                      </span>
                    )}
                  </div>

                  {obj.penalty && (
                    <div className="mt-2 text-[10px] text-[var(--color-accent-red)]">
                      Si falla: {obj.penalty === 'SACKED' ? 'Despido' : 'Advertencia'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-3">
          <div className="text-[var(--color-text-secondary)] text-xs mb-1">Récord</div>
          <div className="font-mono text-lg font-bold">
            <span className="text-[var(--color-accent-green)]">{wins}V</span>
            <span className="text-[var(--color-text-secondary)] mx-1">{draws}E</span>
            <span className="text-[var(--color-accent-red)]">{losses}D</span>
          </div>
        </div>
        <div className="card p-3">
          <div className="text-[var(--color-text-secondary)] text-xs mb-1">% Victoria</div>
          <div className="font-mono text-lg font-bold">
            {winRate}%
          </div>
        </div>
        <div className="card p-3">
          <div className="text-[var(--color-text-secondary)] text-xs mb-1">Posición</div>
          <div className="font-mono text-lg font-bold">
            {currentPosition > 0 ? `${currentPosition}°` : '-'}
          </div>
        </div>
        <div className="card p-3">
          <div className="text-[var(--color-text-secondary)] text-xs mb-1">Presupuesto</div>
          <div className="font-mono text-lg font-bold text-[var(--color-accent-green)]">
            {formatCurrency(userClub.budget || userClub.balance || 0)}
          </div>
        </div>
      </div>

      {/* Top Scorers */}
      {topScorers.some(p => p.currentSeasonStats.goals > 0) && (
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">Goleadores</h2>
          <div className="space-y-2">
            {topScorers.filter(p => p.currentSeasonStats.goals > 0).map((player, idx) => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-[var(--color-bg-tertiary)] rounded">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-[var(--color-accent-yellow)] text-black' :
                    idx === 1 ? 'bg-[var(--color-text-secondary)] text-black' :
                    'bg-[var(--color-accent-yellow)] text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-sm">{player.name}</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="text-[var(--color-accent-green)] font-mono">{player.currentSeasonStats.goals} G</span>
                  <span className="text-[var(--color-accent-cyan)] font-mono">{player.currentSeasonStats.assists} A</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      {userMatches.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">Últimos Resultados</h2>
          <div className="space-y-2">
            {userMatches.slice(-5).reverse().map((match) => {
              const isHome = match.homeClubId === userClub.id;
              const opponent = currentSave.clubs.find(c =>
                c.id === (isHome ? match.awayClubId : match.homeClubId)
              );
              const userScore = isHome ? match.homeScore : match.awayScore;
              const oppScore = isHome ? match.awayScore : match.homeScore;
              const resultClass = userScore > oppScore ? 'text-[var(--color-accent-green)]' :
                                  userScore < oppScore ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-secondary)]';

              return (
                <div key={match.id} className="flex items-center justify-between p-2 bg-[var(--color-bg-tertiary)] rounded text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-secondary)]">{isHome ? 'L' : 'V'}</span>
                    <span>{opponent?.shortCode || 'OPP'}</span>
                  </div>
                  <span className={`font-mono font-bold ${resultClass}`}>
                    {userScore} - {oppScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vacant Positions Button */}
      <div className="card mb-4">
        <button
          onClick={() => setShowVacantJobs(!showVacantJobs)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💼</span>
            <div className="text-left">
              <div className="font-semibold">Posiciones Vacantes</div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {vacantJobs.length} ofertas disponibles
              </div>
            </div>
          </div>
          <span className={`transition-transform ${showVacantJobs ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showVacantJobs && (
          <div className="mt-4 space-y-2">
            {vacantJobs.length === 0 ? (
              <div className="text-center text-sm text-[var(--color-text-secondary)] py-4">
                No hay posiciones vacantes en este momento
              </div>
            ) : (
              vacantJobs.map(({ club, canApply, successChance }) => {
                const league = currentSave.competitions.find(c => c.id === club.leagueId);
                return (
                  <div
                    key={club.id}
                    className={`p-3 rounded-lg border ${
                      canApply
                        ? 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)]'
                        : 'bg-[var(--color-bg-tertiary)]/50 border-[var(--color-border)]/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{club.name}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          {league?.name || 'Liga'} · Rep: {club.reputation}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Presupuesto: {formatCurrency(club.budget || club.balance || 0)}
                        </div>
                      </div>
                      <div className="text-right">
                        {canApply ? (
                          <>
                            <div className="text-xs text-[var(--color-text-secondary)]">
                              Prob. éxito: <span className={`font-bold ${
                                successChance >= 50 ? 'text-[var(--color-accent-green)]' :
                                successChance >= 30 ? 'text-[var(--color-accent-yellow)]' :
                                'text-[var(--color-accent-red)]'
                              }`}>{successChance}%</span>
                            </div>
                            <button
                              onClick={() => setApplyingTo(club.id)}
                              className="mt-2 btn btn-sm bg-[var(--color-accent-green)] text-black font-bold"
                            >
                              Postularse
                            </button>
                          </>
                        ) : (
                          <div className="text-xs text-[var(--color-accent-red)]">
                            Reputación insuficiente
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div className="text-center text-xs text-[var(--color-text-secondary)] mt-2 pt-2 border-t border-[var(--color-border)]">
              Tu reputación: <span className="font-bold">{managerReputation}</span>
            </div>
          </div>
        )}
      </div>

      {/* Apply Confirmation Modal */}
      {applyingTo && (() => {
        const job = vacantJobs.find(j => j.club.id === applyingTo);
        if (!job) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold mb-4 text-center">Postularse a {job.club.name}</h2>
              <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
                ¿Estás seguro de que quieres postularte? Si te eligen, dejarás tu club actual.
              </p>
              <div className="text-center mb-4">
                <span className="text-xs text-[var(--color-text-secondary)]">Probabilidad de éxito: </span>
                <span className={`font-bold ${
                  job.successChance >= 50 ? 'text-[var(--color-accent-green)]' :
                  job.successChance >= 30 ? 'text-[var(--color-accent-yellow)]' :
                  'text-[var(--color-accent-red)]'
                }`}>{job.successChance}%</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setApplyingTo(null)}
                  className="btn btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Simulate the application result
                    const roll = Math.random() * 100;
                    if (roll < job.successChance) {
                      // Success! This would need a proper implementation to change clubs
                      alert(`¡Felicidades! ${job.club.name} te ha contratado como nuevo entrenador.`);
                      // TODO: Implement club change logic
                    } else {
                      alert(`${job.club.name} ha rechazado tu postulación. Sigue intentando.`);
                    }
                    setApplyingTo(null);
                  }}
                  className="btn bg-[var(--color-accent-green)] text-black font-bold flex-1"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Exit Button */}
      <div className="mt-6">
        {showConfirmExit ? (
          <div className="card bg-[var(--color-accent-red)]/20 border border-[var(--color-accent-red)]/30">
            <p className="text-sm mb-3 text-center">¿Salir al menú principal? El progreso se guarda automáticamente.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmExit(false)}
                className="btn btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={exitToMenu}
                className="btn bg-[var(--color-accent-red)] text-white flex-1"
              >
                Salir
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmExit(true)}
            className="btn btn-ghost w-full text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30"
          >
            Salir al Menú Principal
          </button>
        )}
      </div>
    </div>
  );
}
