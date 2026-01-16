import { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { useMatch } from '../App';
import { getClubColors } from '../game/data/clubColors';
import type { Fixture } from '../game/data/GenesisLoader';

export function FixturesPage() {
  const { currentSave, getUserClub, getUpcomingFixtures, getLeagueFixtures, getClub, simulateToMatchday } = useGame();
  const match = useMatch();
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [showPastMatches, setShowPastMatches] = useState(false);
  const [showSimulateConfirm, setShowSimulateConfirm] = useState<number | null>(null);

  const userClub = getUserClub();

  if (!currentSave || !userClub) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-text-secondary)]">No hay partida activa</div>
      </div>
    );
  }

  // Get competitions (leagues only for now)
  const competitions = currentSave.competitions.filter(c => c.type === 'LEAGUE');

  // Find user's league
  const userLeague = competitions.find(c =>
    c.teamIds.includes(userClub.id)
  );

  // Use selected competition or default to user's league
  const activeCompId = selectedCompetition || userLeague?.id;
  const activeComp = competitions.find(c => c.id === activeCompId);

  // Get upcoming fixtures for user's team
  const upcomingFixtures = getUpcomingFixtures(userClub.id, 10);
  const nextFixture = upcomingFixtures[0] || null;

  // Get past fixtures for user's team
  const pastFixtures = useMemo(() => {
    if (!activeComp) return [];
    const allFixtures = getLeagueFixtures(activeComp.id);
    return allFixtures
      .filter(f =>
        f.status === 'FINISHED' &&
        (f.homeClubId === userClub.id || f.awayClubId === userClub.id)
      )
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 10);
  }, [activeComp, userClub.id, getLeagueFixtures]);

  // Get league schedule (all fixtures)
  const leagueSchedule = activeComp ? getLeagueFixtures(activeComp.id) : [];

  // Group fixtures by matchday
  const fixturesByMatchday = leagueSchedule.reduce((acc, fixture) => {
    if (!acc[fixture.matchday]) {
      acc[fixture.matchday] = [];
    }
    acc[fixture.matchday].push(fixture);
    return acc;
  }, {} as Record<number, Fixture[]>);

  // Find current matchday (first with unplayed fixtures)
  const currentMatchday = useMemo(() => {
    for (const [md, fixtures] of Object.entries(fixturesByMatchday)) {
      if (fixtures.some(f => f.status !== 'FINISHED')) {
        return parseInt(md);
      }
    }
    return 1;
  }, [fixturesByMatchday]);

  // Find next opponent from fixture
  const nextOpponentId = nextFixture
    ? nextFixture.homeClubId === userClub.id
      ? nextFixture.awayClubId
      : nextFixture.homeClubId
    : null;
  const nextOpponent = nextOpponentId ? getClub(nextOpponentId) : null;
  const isHome = nextFixture?.homeClubId === userClub.id;

  // Get league rivals for quick match
  const leagueRivals = currentSave.clubs.filter(
    c => c.leagueId === userClub.leagueId && c.id !== userClub.id && !c.isNationalTeam
  );

  // Calculate user team position
  const userPosition = useMemo(() => {
    if (!activeComp?.standings) return null;
    const sorted = [...activeComp.standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      return gdB - gdA;
    });
    const idx = sorted.findIndex(s => s.clubId === userClub.id);
    return idx >= 0 ? idx + 1 : null;
  }, [activeComp?.standings, userClub.id]);

  const userStanding = activeComp?.standings?.find((s: { clubId: string }) => s.clubId === userClub.id);

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <header className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Calendario</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              {activeComp?.name ?? 'Seleccionar Competición'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">{currentSave.season}</div>
            <div className="text-sm font-mono text-[var(--color-accent-green)]">{currentSave.gameDate}</div>
          </div>
        </div>
      </header>

      {/* User Position Summary */}
      {userPosition && userStanding && (
        <div className="card p-3 mb-4 bg-gradient-to-r from-[var(--color-bg-card)] to-[var(--color-bg-tertiary)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-black font-mono ${
                userPosition <= 4 ? 'text-[var(--color-accent-green)]' :
                userPosition >= (activeComp?.standings?.length || 20) - 2 ? 'text-[var(--color-accent-red)]' :
                'text-[var(--color-accent-yellow)]'
              }`}>
                {userPosition}°
              </div>
              <div>
                <div className="font-semibold">{userClub.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {userStanding.played} PJ · {userStanding.won}G · {userStanding.drawn}E · {userStanding.lost}P
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{userStanding.points}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">puntos</div>
            </div>
          </div>
        </div>
      )}

      {/* Competition Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
        {competitions.slice(0, 8).map((comp) => (
          <button
            key={comp.id}
            onClick={() => setSelectedCompetition(comp.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCompId === comp.id
                ? 'bg-[var(--color-accent-green)] text-black shadow-lg'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            }`}
          >
            {comp.shortName}
          </button>
        ))}
      </div>

      {/* Next Match Card */}
      {nextFixture && nextOpponent && (() => {
        const homeTeam = isHome ? userClub : nextOpponent;
        const awayTeam = isHome ? nextOpponent : userClub;
        const homeColors = getClubColors(homeTeam.id, homeTeam.shortCode);
        const awayColors = getClubColors(awayTeam.id, awayTeam.shortCode);

        return (
          <div className="card mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--color-accent-green)]/20 to-transparent p-1">
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-[var(--color-accent-green)] font-semibold">PRÓXIMO PARTIDO</span>
                <span className="text-[var(--color-text-secondary)]">
                  Jornada {nextFixture.matchday} · {nextFixture.date}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-center gap-4">
                {/* Home Team */}
                <div className="flex-1 text-center">
                  <div
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center font-bold text-sm border-2 mb-2"
                    style={{
                      backgroundColor: homeColors.primary,
                      borderColor: homeColors.secondary,
                      color: homeColors.text,
                    }}
                  >
                    {homeTeam.shortCode}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {homeTeam.name}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">LOCAL</div>
                </div>

                {/* VS */}
                <div className="px-4">
                  <div className="text-3xl font-black text-[var(--color-text-secondary)]/50">VS</div>
                </div>

                {/* Away Team */}
                <div className="flex-1 text-center">
                  <div
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center font-bold text-sm border-2 mb-2"
                    style={{
                      backgroundColor: awayColors.primary,
                      borderColor: awayColors.secondary,
                      color: awayColors.text,
                    }}
                  >
                    {awayTeam.shortCode}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    {awayTeam.name}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">VISITANTE</div>
                </div>
              </div>

              <button
                onClick={() => match?.startMatch(nextOpponent.id, isHome, activeComp?.name || 'Liga')}
                className="btn bg-[var(--color-accent-green)] text-black font-bold w-full mt-4 py-3 text-lg"
              >
                Jugar Partido
              </button>
            </div>
          </div>
        );
      })()}

      {/* Past/Upcoming Toggle */}
      <div className="flex gap-1 mb-4 bg-[var(--color-bg-tertiary)] p-1 rounded-xl">
        <button
          onClick={() => setShowPastMatches(false)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            !showPastMatches
              ? 'bg-[var(--color-bg-card)] shadow text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Próximos ({upcomingFixtures.length})
        </button>
        <button
          onClick={() => setShowPastMatches(true)}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            showPastMatches
              ? 'bg-[var(--color-bg-card)] shadow text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Jugados ({pastFixtures.length})
        </button>
      </div>

      {/* Upcoming Fixtures List */}
      {!showPastMatches && upcomingFixtures.length > 0 && (
        <div className="space-y-2 mb-6">
          {upcomingFixtures.map((fixture, index) => {
            const isUserHome = fixture.homeClubId === userClub.id;
            const oppId = isUserHome ? fixture.awayClubId : fixture.homeClubId;
            const opponent = getClub(oppId);
            const isNext = index === 0;

            return (
              <div
                key={fixture.id}
                className={`card p-3 ${isNext ? 'border-[var(--color-accent-green)] border-2' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      isUserHome
                        ? 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]'
                        : 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]'
                    }`}>
                      {isUserHome ? 'L' : 'V'}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {isUserHome ? 'vs' : '@'} {opponent?.name || oppId}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        Jornada {fixture.matchday} · {fixture.date}
                      </div>
                    </div>
                  </div>
                  {isNext && (
                    <button
                      onClick={() => opponent && match?.startMatch(opponent.id, isUserHome, activeComp?.name || 'Liga')}
                      className="btn btn-sm bg-[var(--color-accent-green)] text-black font-bold"
                    >
                      Jugar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past Fixtures List */}
      {showPastMatches && pastFixtures.length > 0 && (
        <div className="space-y-2 mb-6">
          {pastFixtures.map((fixture) => {
            const isUserHome = fixture.homeClubId === userClub.id;
            const oppId = isUserHome ? fixture.awayClubId : fixture.homeClubId;
            const opponent = getClub(oppId);
            const userGoals = isUserHome ? (fixture.homeScore ?? 0) : (fixture.awayScore ?? 0);
            const oppGoals = isUserHome ? (fixture.awayScore ?? 0) : (fixture.homeScore ?? 0);
            const result = userGoals > oppGoals ? 'W' : userGoals < oppGoals ? 'L' : 'D';

            return (
              <div key={fixture.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      result === 'W' ? 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]' :
                      result === 'L' ? 'bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]' :
                      'bg-[var(--color-text-secondary)]/20 text-[var(--color-text-secondary)]'
                    }`}>
                      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'E'}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {isUserHome ? 'vs' : '@'} {opponent?.name || oppId}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        Jornada {fixture.matchday}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-mono font-bold ${
                      result === 'W' ? 'text-[var(--color-accent-green)]' :
                      result === 'L' ? 'text-[var(--color-accent-red)]' :
                      'text-[var(--color-text-secondary)]'
                    }`}>
                      {userGoals} - {oppGoals}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No fixtures message */}
      {!showPastMatches && upcomingFixtures.length === 0 && (
        <div className="card p-8 text-center mb-6">
          <div className="text-4xl mb-2">📅</div>
          <h3 className="font-semibold mb-1">Sin Partidos Próximos</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Todos los partidos programados han sido jugados.
          </p>
        </div>
      )}

      {showPastMatches && pastFixtures.length === 0 && (
        <div className="card p-8 text-center mb-6">
          <div className="text-4xl mb-2">⚽</div>
          <h3 className="font-semibold mb-1">Sin Partidos Jugados</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Aún no has jugado ningún partido en esta competición.
          </p>
        </div>
      )}

      {/* Simulate Confirmation Modal */}
      {showSimulateConfirm !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-4 max-w-sm w-full border border-[var(--color-border)]">
            <h3 className="text-lg font-bold mb-2">Simular hasta Jornada {showSimulateConfirm}</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Se simularán automáticamente todos tus partidos hasta la jornada {showSimulateConfirm}.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSimulateConfirm(null)}
                className="flex-1 py-2 px-4 bg-[var(--color-bg-tertiary)] rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (activeComp) {
                    simulateToMatchday(showSimulateConfirm, activeComp.id);
                  }
                  setShowSimulateConfirm(null);
                }}
                className="flex-1 py-2 px-4 bg-[var(--color-accent-green)] text-black rounded-lg text-sm font-bold"
              >
                Simular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Schedule Section */}
      {activeComp && Object.keys(fixturesByMatchday).length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-3 px-1">
            CALENDARIO COMPLETO
          </h3>
          <p className="text-[10px] text-[var(--color-text-secondary)] mb-2 px-1">
            Toca una jornada futura para simular hasta ese punto
          </p>
          <div className="space-y-3">
            {Object.entries(fixturesByMatchday)
              .filter(([md]) => parseInt(md) >= currentMatchday - 1)
              .slice(0, 6)
              .map(([matchday, fixtures]) => {
                const md = parseInt(matchday);
                const isCurrentMD = md === currentMatchday;
                const allPlayed = fixtures.every(f => f.status === 'FINISHED');
                const isFutureMD = md > currentMatchday && !allPlayed;

                return (
                  <div
                    key={matchday}
                    onClick={() => isFutureMD && setShowSimulateConfirm(md)}
                    className={`card p-0 overflow-hidden ${isCurrentMD ? 'border-[var(--color-accent-green)]' : ''} ${isFutureMD ? 'cursor-pointer hover:border-[var(--color-accent-cyan)]' : ''}`}
                  >
                    <div className={`p-2 border-b border-[var(--color-border)] flex justify-between items-center ${
                      isCurrentMD ? 'bg-[var(--color-accent-green)]/10' : 'bg-[var(--color-bg-tertiary)]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Jornada {matchday}</span>
                        {isCurrentMD && (
                          <span className="text-[10px] bg-[var(--color-accent-green)] text-black px-2 py-0.5 rounded-full font-bold">
                            ACTUAL
                          </span>
                        )}
                        {isFutureMD && (
                          <span className="text-[10px] bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] px-2 py-0.5 rounded-full font-bold">
                            Simular →
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {allPlayed ? 'Finalizada' : fixtures[0]?.date}
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--color-border)]">
                      {fixtures.map((fixture) => {
                        const homeClub = getClub(fixture.homeClubId);
                        const awayClub = getClub(fixture.awayClubId);
                        const isUserMatch =
                          fixture.homeClubId === userClub.id || fixture.awayClubId === userClub.id;

                        return (
                          <div
                            key={fixture.id}
                            className={`p-2 ${isUserMatch ? 'bg-[var(--color-accent-cyan)]/5' : ''}`}
                          >
                            <div className="flex items-center text-sm">
                              <div className={`flex-1 text-right truncate ${
                                fixture.homeClubId === userClub.id ? 'font-bold text-[var(--color-accent-green)]' : ''
                              }`}>
                                {homeClub?.name || fixture.homeClubId}
                              </div>
                              <div className="px-3 text-center min-w-[60px]">
                                {fixture.status === 'FINISHED' ? (
                                  <span className="font-mono font-bold">
                                    {fixture.homeScore} - {fixture.awayScore}
                                  </span>
                                ) : (
                                  <span className="text-xs text-[var(--color-text-secondary)]">vs</span>
                                )}
                              </div>
                              <div className={`flex-1 text-left truncate ${
                                fixture.awayClubId === userClub.id ? 'font-bold text-[var(--color-accent-green)]' : ''
                              }`}>
                                {awayClub?.name || fixture.awayClubId}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quick Match Section */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-3 px-1">
          PARTIDO RÁPIDO
        </h3>
        <div className="card p-3">
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">
            Juega un amistoso contra cualquier equipo de tu liga
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
            {leagueRivals.slice(0, 12).map(club => (
              <button
                key={club.id}
                onClick={() => match?.startMatch(club.id, Math.random() > 0.5, 'Amistoso')}
                className="flex items-center justify-between p-2 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-border)] transition-colors text-left"
              >
                <span className="text-sm truncate flex-1">{club.shortCode}</span>
                <span className="text-[10px] text-[var(--color-text-secondary)] ml-1">{club.reputation}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
