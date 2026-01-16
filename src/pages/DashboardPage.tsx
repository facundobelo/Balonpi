/**
 * DashboardPage - Main game view (World-class Cyberfoot-style)
 *
 * Shows all divisions simultaneously with matchday fixtures,
 * user's match highlighted, and quick access to play.
 *
 * Features:
 * - Hero card with next match and team stats
 * - Recent form visualization
 * - Quick stats and club info
 */

import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useMatch } from '../App';
import type { PageId } from '../App';
import { MatchdayView } from '../components/match/MatchdayView';
import { AllStandingsView } from '../components/match/AllStandingsView';
import type { Fixture } from '../game/data/GenesisLoader';
import { PositionBadge } from '../components/ui/PositionBadge';
import { NewsFeed } from '../components/ui/NewsFeed';
import { areRivals, getRivalryIntensity } from '../game/data/rivalries';
import { getClubColors } from '../game/data/clubColors';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

type ViewMode = 'matchday' | 'standings';

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const {
    currentSave,
    getUserClub,
    getUserSquad,
    getUpcomingFixtures,
    getClub,
    advanceDay,
    fixtures,
  } = useGame();
  const match = useMatch();

  const [viewMode, setViewMode] = useState<ViewMode>('matchday');
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  const userClub = getUserClub();
  const squad = getUserSquad();

  if (!currentSave || !userClub) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-text-secondary)]">No active game</div>
      </div>
    );
  }

  // Get user's league
  const userLeague = currentSave.competitions.find(
    c => c.type === 'LEAGUE' && c.teamIds.includes(userClub.id)
  );

  // Get upcoming fixtures for user's team
  const upcomingFixtures = getUpcomingFixtures(userClub.id, 3);
  const nextFixture = upcomingFixtures[0] || null;

  // Find next opponent from the user's fixture
  const nextOpponentId = nextFixture
    ? nextFixture.homeClubId === userClub.id
      ? nextFixture.awayClubId
      : nextFixture.homeClubId
    : null;
  const nextOpponent = nextOpponentId ? getClub(nextOpponentId) : null;
  const isHome = nextFixture?.homeClubId === userClub.id;

  // User standing
  const userStanding = userLeague?.standings?.find(
    (s: any) => s.clubId === userClub.id
  );
  const sortedStandings = [...(userLeague?.standings || [])].sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
  });
  const leaguePosition = sortedStandings.findIndex((s: any) => s.clubId === userClub.id);

  // Get current matchday
  const userLeagueFixtures = fixtures?.[userLeague?.id || ''] || [];
  const currentMatchday = userLeagueFixtures.find(f => f.status === 'SCHEDULED')?.matchday || 1;

  // Handle fixture selection
  const handleSelectFixture = (fixture: Fixture) => {
    setSelectedFixture(fixture);
  };

  // Get details for selected fixture
  const selectedHomeClub = selectedFixture ? getClub(selectedFixture.homeClubId) : null;
  const selectedAwayClub = selectedFixture ? getClub(selectedFixture.awayClubId) : null;

  // Format money
  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  // Get form from standings
  const form = userStanding?.form || [];
  const lastFive = form.slice(-5);

  // Check if next match is a derby/rivalry
  const isDerby = nextOpponent ? areRivals(userClub.name, nextOpponent.name) : false;
  const rivalryIntensity = nextOpponent ? getRivalryIntensity(userClub.name, nextOpponent.name) : 0;

  // Get top scorer from squad
  const topScorer = squad.length > 0
    ? [...squad].sort((a, b) => (b.seasonStats?.goals || 0) - (a.seasonStats?.goals || 0))[0]
    : null;

  // Calculate team average skill
  const avgSkill = squad.length > 0
    ? Math.round(squad.reduce((sum, p) => sum + p.skillBase, 0) / squad.length)
    : 0;

  // Get user club colors
  const userClubColors = getClubColors(userClub.id, userClub.shortCode);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Hero Header - Club card */}
      <header className="bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
        {/* Top bar with date */}
        <div className="flex justify-between items-center px-4 py-1.5 border-b border-[var(--color-border)]/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-text-secondary)]">{currentSave.season}</span>
          </div>
          <div className="text-sm font-mono text-[var(--color-accent-green)]">
            {currentSave.gameDate}
          </div>
        </div>

        {/* Club info */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between">
            {/* Club identity */}
            <div className="flex items-center gap-3">
              {/* Club badge with colors */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg"
                style={{
                  backgroundColor: userClubColors.primary,
                  borderColor: userClubColors.secondary,
                  color: userClubColors.text,
                }}
              >
                <span className="text-sm font-bold">
                  {userClub.shortCode}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{userClub.name}</h1>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  DT: {currentSave.userManagerName}
                </p>
                <p className="text-[10px] text-[var(--color-accent-green)]">
                  {userLeague?.name}
                </p>
              </div>
            </div>

            {/* Key stats */}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-3xl font-bold text-[var(--color-accent-green)]">
                  {leaguePosition !== -1 ? leaguePosition + 1 : '-'}°
                </span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {userStanding?.points ?? 0} pts
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3 grid grid-cols-5 gap-2">
            <div className="bg-[var(--color-bg-primary)]/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{userStanding?.played || 0}</div>
              <div className="text-[9px] text-[var(--color-text-secondary)]">PJ</div>
            </div>
            <div className="bg-[var(--color-bg-primary)]/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-400">{userStanding?.won || 0}</div>
              <div className="text-[9px] text-[var(--color-text-secondary)]">PG</div>
            </div>
            <div className="bg-[var(--color-bg-primary)]/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-yellow-400">{userStanding?.drawn || 0}</div>
              <div className="text-[9px] text-[var(--color-text-secondary)]">PE</div>
            </div>
            <div className="bg-[var(--color-bg-primary)]/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-400">{userStanding?.lost || 0}</div>
              <div className="text-[9px] text-[var(--color-text-secondary)]">PP</div>
            </div>
            <div className="bg-[var(--color-bg-primary)]/50 rounded-lg p-2 text-center">
              <div className={`text-lg font-bold ${
                ((userStanding?.goalsFor || 0) - (userStanding?.goalsAgainst || 0)) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {(userStanding?.goalsFor || 0) - (userStanding?.goalsAgainst || 0) >= 0 ? '+' : ''}
                {(userStanding?.goalsFor || 0) - (userStanding?.goalsAgainst || 0)}
              </div>
              <div className="text-[9px] text-[var(--color-text-secondary)]">DIF</div>
            </div>
          </div>

          {/* Form indicator */}
          {lastFive.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--color-text-secondary)]">Racha:</span>
              {lastFive.map((result: string, i: number) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    result === 'W' ? 'bg-green-500 text-black' :
                    result === 'D' ? 'bg-yellow-500 text-black' :
                    'bg-red-500 text-white'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Compact League Standings - Top 5 + User position */}
      {userLeague && sortedStandings.length > 0 && (
        <div className="mx-4 mt-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {userLeague.shortName || userLeague.name}
            </span>
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              J{userStanding?.played || 0}
            </span>
          </div>
          <div className="text-[10px]">
            {/* Header row */}
            <div className="flex items-center px-3 py-1.5 text-[var(--color-text-secondary)] border-b border-[var(--color-border)]/50">
              <span className="w-5 text-center">#</span>
              <span className="flex-1 ml-2">Equipo</span>
              <span className="w-6 text-center">PJ</span>
              <span className="w-8 text-center">DIF</span>
              <span className="w-8 text-center font-semibold">PTS</span>
            </div>
            {/* Show top 5 teams, or include user if not in top 5 */}
            {(() => {
              const displayStandings = sortedStandings.slice(0, 5);
              const userInTop5 = leaguePosition >= 0 && leaguePosition < 5;
              const showUserSeparately = !userInTop5 && leaguePosition >= 0;

              return (
                <>
                  {displayStandings.map((standing: any, idx: number) => {
                    const club = getClub(standing.clubId);
                    const isUser = standing.clubId === userClub.id;
                    const clubColors = club ? getClubColors(club.id, club.shortCode) : null;
                    const gd = standing.goalsFor - standing.goalsAgainst;

                    return (
                      <div
                        key={standing.clubId}
                        className={`flex items-center px-3 py-1.5 ${
                          isUser
                            ? 'bg-[var(--color-accent-green)]/10'
                            : idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--color-bg-primary)]/30'
                        }`}
                      >
                        <span className={`w-5 text-center font-bold ${
                          idx < 3 ? 'text-[var(--color-accent-green)]' :
                          idx >= sortedStandings.length - 3 ? 'text-red-400' : ''
                        }`}>{idx + 1}</span>
                        <div className="flex-1 ml-2 flex items-center gap-1.5">
                          {clubColors && (
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold"
                              style={{
                                backgroundColor: clubColors.primary,
                                color: clubColors.text,
                              }}
                            >
                              {club?.shortCode?.slice(0, 2)}
                            </div>
                          )}
                          <span className={`truncate ${isUser ? 'font-bold' : ''}`}>
                            {club?.shortCode || 'UNK'}
                          </span>
                        </div>
                        <span className="w-6 text-center text-[var(--color-text-secondary)]">{standing.played}</span>
                        <span className={`w-8 text-center ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : ''}`}>
                          {gd > 0 ? '+' : ''}{gd}
                        </span>
                        <span className="w-8 text-center font-bold">{standing.points}</span>
                      </div>
                    );
                  })}
                  {showUserSeparately && (
                    <>
                      <div className="flex items-center justify-center py-0.5 text-[var(--color-text-secondary)]">···</div>
                      {(() => {
                        const userStandingData = sortedStandings[leaguePosition];
                        const club = userClub;
                        const clubColors = getClubColors(club.id, club.shortCode);
                        const gd = userStandingData.goalsFor - userStandingData.goalsAgainst;

                        return (
                          <div className="flex items-center px-3 py-1.5 bg-[var(--color-accent-green)]/10">
                            <span className="w-5 text-center font-bold">{leaguePosition + 1}</span>
                            <div className="flex-1 ml-2 flex items-center gap-1.5">
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold"
                                style={{
                                  backgroundColor: clubColors.primary,
                                  color: clubColors.text,
                                }}
                              >
                                {club.shortCode.slice(0, 2)}
                              </div>
                              <span className="truncate font-bold">{club.shortCode}</span>
                            </div>
                            <span className="w-6 text-center text-[var(--color-text-secondary)]">{userStandingData.played}</span>
                            <span className={`w-8 text-center ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : ''}`}>
                              {gd > 0 ? '+' : ''}{gd}
                            </span>
                            <span className="w-8 text-center font-bold">{userStandingData.points}</span>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              );
            })()}
          </div>
          {/* View full standings button */}
          <button
            onClick={() => setViewMode('standings')}
            className="w-full py-2 text-[10px] text-[var(--color-accent-green)] hover:bg-[var(--color-bg-tertiary)] transition-colors border-t border-[var(--color-border)]/50"
          >
            Ver tabla completa →
          </button>
        </div>
      )}

      {/* Next Match Card - Hero style */}
      {nextFixture && nextOpponent && (() => {
        const homeTeam = isHome ? userClub : nextOpponent;
        const awayTeam = isHome ? nextOpponent : userClub;
        const homeColors = getClubColors(homeTeam.id, homeTeam.shortCode);
        const awayColors = getClubColors(awayTeam.id, awayTeam.shortCode);

        return (
          <div className={`mx-4 mt-4 rounded-xl overflow-hidden border ${
            isDerby
              ? 'bg-gradient-to-r from-red-500/20 via-[var(--color-bg-card)] to-red-500/20 border-red-500/50'
              : 'bg-gradient-to-r from-[var(--color-accent-green)]/10 via-[var(--color-bg-card)] to-[var(--color-accent-green)]/10 border-[var(--color-accent-green)]/30'
          }`}>
            <div className={`text-center text-[10px] py-1 font-semibold ${
              isDerby
                ? 'bg-red-500/30 text-red-300'
                : 'bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]'
            }`}>
              {isDerby && <span className="mr-2">🔥 CLASICO 🔥</span>}
              PROXIMO PARTIDO - {userLeague?.shortName} - Jornada {currentMatchday}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                {/* Home team */}
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
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {homeTeam.name}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-secondary)]">LOCAL</div>
                </div>

                {/* VS */}
                <div className="px-4">
                  <div className="text-4xl font-light text-[var(--color-text-secondary)]">vs</div>
                </div>

                {/* Away team */}
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
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {awayTeam.name}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-secondary)]">VISITANTE</div>
                </div>
              </div>

              {/* Play button */}
              <button
                onClick={() => match?.startMatch(nextOpponent.id, isHome, userLeague?.name || 'Liga')}
                className="w-full mt-4 py-3 bg-[var(--color-accent-green)] text-black font-bold rounded-lg text-lg hover:bg-[var(--color-accent-green)]/90 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">⚽</span>
                <span>Jugar Partido</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* View Mode Tabs */}
      <div className="bg-[var(--color-bg-tertiary)] px-4 py-2 flex gap-1 border-b border-[var(--color-border)]">
        <button
          onClick={() => setViewMode('matchday')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            viewMode === 'matchday'
              ? 'bg-[var(--color-accent-green)] text-black'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
          }`}
        >
          Jornada {currentMatchday}
        </button>
        <button
          onClick={() => setViewMode('standings')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            viewMode === 'standings'
              ? 'bg-[var(--color-accent-green)] text-black'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]'
          }`}
        >
          Clasificaciones
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 pb-24">
        {/* Matchday View */}
        {viewMode === 'matchday' && (
          <MatchdayView
            onSelectFixture={handleSelectFixture}
            selectedFixtureId={selectedFixture?.id}
          />
        )}

        {/* Standings View */}
        {viewMode === 'standings' && <AllStandingsView />}

        {/* Selected Fixture Details Panel */}
        {selectedFixture && viewMode === 'matchday' && (
          <div className="fixed bottom-20 left-4 right-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-10">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-secondary)]">
                Jornada {selectedFixture.matchday} · {selectedFixture.date}
              </div>
              <button
                onClick={() => setSelectedFixture(null)}
                className="w-6 h-6 rounded-full bg-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">{selectedHomeClub?.shortCode}</div>
                  <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{selectedHomeClub?.name}</div>
                  <div className="text-[10px] text-[var(--color-text-secondary)]">Rep: {selectedHomeClub?.reputation}</div>
                </div>
                <div className="px-4">
                  {selectedFixture.status === 'FINISHED' ? (
                    <div className="text-3xl font-mono font-bold">
                      {selectedFixture.homeScore} - {selectedFixture.awayScore}
                    </div>
                  ) : (
                    <div className="text-2xl text-[var(--color-text-secondary)]">vs</div>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">{selectedAwayClub?.shortCode}</div>
                  <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{selectedAwayClub?.name}</div>
                  <div className="text-[10px] text-[var(--color-text-secondary)]">Rep: {selectedAwayClub?.reputation}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Improved grid */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">ACCIONES RAPIDAS</h3>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => advanceDay(1)}
              className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl text-center hover:border-[var(--color-accent-green)] transition-colors"
            >
              <div className="text-xl mb-1">📅</div>
              <div className="text-xs font-semibold">+1 Dia</div>
            </button>
            <button
              onClick={() => advanceDay(7)}
              className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl text-center hover:border-[var(--color-accent-green)] transition-colors"
            >
              <div className="text-xl mb-1">⏩</div>
              <div className="text-xs font-semibold">+1 Sem</div>
            </button>
            <button
              onClick={() => onNavigate('squad')}
              className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl text-center hover:border-[var(--color-accent-green)] transition-colors"
            >
              <div className="text-xl mb-1">👥</div>
              <div className="text-xs font-semibold">Plantilla</div>
              <div className="text-[10px] text-[var(--color-text-secondary)]">{squad.length}</div>
            </button>
            <button
              onClick={() => onNavigate('world')}
              className="p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl text-center hover:border-[var(--color-accent-green)] transition-colors"
            >
              <div className="text-xl mb-1">💰</div>
              <div className="text-xs font-semibold">Mercado</div>
            </button>
          </div>
        </div>

        {/* Club quick info */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Budget card */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--color-text-secondary)] mb-1">PRESUPUESTO</div>
            <div className="text-lg font-bold text-[var(--color-accent-green)]">
              {formatMoney(userClub.budget || userClub.balance || 0)}
            </div>
          </div>

          {/* Team strength */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--color-text-secondary)] mb-1">FUERZA EQUIPO</div>
            <div className="text-lg font-bold">
              {avgSkill} <span className="text-xs text-[var(--color-text-secondary)]">promedio</span>
            </div>
          </div>
        </div>

        {/* Top scorer if available */}
        {topScorer && (topScorer.seasonStats?.goals || 0) > 0 && (
          <div className="mt-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
            <div className="text-[10px] text-[var(--color-text-secondary)] mb-2">MAXIMO GOLEADOR</div>
            <div className="flex items-center gap-3">
              <PositionBadge position={topScorer.positionMain} size="sm" />
              <div className="flex-1">
                <div className="font-semibold text-sm">{topScorer.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {topScorer.seasonStats?.goals || 0} goles, {topScorer.seasonStats?.assists || 0} asist.
                </div>
              </div>
              <div className="text-2xl font-bold text-[var(--color-accent-green)]">
                {topScorer.seasonStats?.goals || 0}
              </div>
            </div>
          </div>
        )}

        {/* News Feed */}
        {currentSave.newsItems && currentSave.newsItems.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">NOTICIAS</h3>
            <NewsFeed news={currentSave.newsItems} maxItems={5} compact />
          </div>
        )}
      </div>
    </div>
  );
}
