/**
 * MatchDayPage - Live match simulation UI (BALONPI-style)
 *
 * Shows:
 * - Pre-match: Team lineups with pitch view, tactics selection
 * - Live: All matchday fixtures + your match + tactics button
 * - Post-match: Final result, stats, player ratings
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import {
  createMatchTeam,
  createMatchSimulator,
  simulateMatch,
  type MatchState as EngineMatchState,
  type MatchTeam,
  type MatchEvent,
} from '../game/engine/MatchSimulator';
import { PitchView, playerToPitchPlayer } from '../components/match/PitchView';
import { LineupSelector } from '../components/match/LineupSelector';
import { LiveMatchdayPanel } from '../components/match/LiveMatchdayPanel';
import { TacticsPanel } from '../components/match/TacticsPanel';
import { LivePitchView } from '../components/match/LivePitchView';
import { PositionBadge } from '../components/ui/PositionBadge';
import { TacticsIcon } from '../components/ui/TacticsIcon';
import { areRivals } from '../game/data/rivalries';

// Re-export for use in App.tsx
export type MatchState = EngineMatchState;

type MatchPhase = 'pre-match' | 'live' | 'post-match';
type SimSpeed = 'PAUSED' | 'X1' | 'X5' | 'INSTANT';

interface MatchDayProps {
  opponentClubId: string;
  isHome: boolean;
  competitionName: string;
  onFinish: (result: MatchState) => void;
  onCancel: () => void;
}

export function MatchDayPage({ opponentClubId, isHome, competitionName, onFinish, onCancel }: MatchDayProps) {
  const { currentSave, getUserClub, getUserSquad, getUpcomingFixtures, fixtures, getClub } = useGame();

  const [phase, setPhase] = useState<MatchPhase>('pre-match');
  const [speed, setSpeed] = useState<SimSpeed>('X1');
  const [tactic, setTactic] = useState<'DEFENSIVE' | 'BALANCED' | 'ATTACKING'>('BALANCED');
  const [formation, setFormation] = useState('4-3-3');
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [simulator, setSimulator] = useState<Generator<MatchState, MatchState, void> | null>(null);

  // Lineup state
  const [selectedLineup, setSelectedLineup] = useState<string[]>([]);
  const [benchPlayers, setBenchPlayers] = useState<string[]>([]);
  const [subsRemaining, setSubsRemaining] = useState(5);

  // Tactics panel state
  const [showTactics, setShowTactics] = useState(false);
  const [previousSpeed, setPreviousSpeed] = useState<SimSpeed>('X1');

  // Mobile view toggle (pitch vs results)
  const [mobileView, setMobileView] = useState<'pitch' | 'results'>('pitch');

  const userClub = getUserClub();
  const userSquad = getUserSquad();
  const opponent = currentSave?.clubs.find(c => c.id === opponentClubId);

  // Filter opponent squad for available players (not injured/suspended)
  const opponentSquad = useMemo(() => {
    const today = currentSave?.gameDate || '';
    const allOpponentPlayers = currentSave?.players.filter(p => p.clubId === opponentClubId) || [];
    return allOpponentPlayers.filter(p => {
      if (p.injuredUntil && p.injuredUntil > today) return false;
      if (p.suspendedUntil && p.suspendedUntil > today) return false;
      return true;
    });
  }, [currentSave?.players, currentSave?.gameDate, opponentClubId]);

  // Initialize lineup on mount
  useEffect(() => {
    if (userSquad.length > 0 && selectedLineup.length === 0) {
      autoSelectLineup();
    }
  }, [userSquad]);

  // Check if player is available (not injured or suspended)
  const isPlayerAvailable = useCallback((player: any): boolean => {
    const today = currentSave?.gameDate || '';
    if (player.injuredUntil && player.injuredUntil > today) return false;
    if (player.suspendedUntil && player.suspendedUntil > today) return false;
    return true;
  }, [currentSave?.gameDate]);

  // Auto-select best lineup
  const autoSelectLineup = () => {
    const posReqs: Record<string, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

    // Filter out injured/suspended players
    const availablePlayers = userSquad.filter(isPlayerAvailable);
    const sorted = [...availablePlayers].sort((a, b) => b.skillBase - a.skillBase);
    const lineup: string[] = [];
    const used = new Set<string>();

    // Fill each position
    for (const [pos, count] of Object.entries(posReqs)) {
      const available = sorted.filter(p => p.positionMain === pos && !used.has(p.id));
      for (let i = 0; i < count && i < available.length; i++) {
        lineup.push(available[i].id);
        used.add(available[i].id);
      }
    }

    // Fill remaining slots
    const remaining = sorted.filter(p => !used.has(p.id));
    while (lineup.length < 11 && remaining.length > 0) {
      const p = remaining.shift()!;
      lineup.push(p.id);
      used.add(p.id);
    }

    setSelectedLineup(lineup);

    // Set bench
    const bench = sorted.filter(p => !used.has(p.id)).slice(0, 7).map(p => p.id);
    setBenchPlayers(bench);
  };

  // Get lineup players
  const lineupPlayers = useMemo(() =>
    selectedLineup.map(id => userSquad.find(p => p.id === id)).filter(Boolean),
    [selectedLineup, userSquad]
  );

  const benchPlayerObjects = useMemo(() =>
    benchPlayers.map(id => userSquad.find(p => p.id === id)).filter(Boolean),
    [benchPlayers, userSquad]
  );

  // Create teams from selected lineup
  const userTeam = userClub && lineupPlayers.length === 11 ? createMatchTeam(
    userClub.id,
    userClub.name,
    lineupPlayers as any[],
    formation,
    tactic
  ) : null;

  // Only create opponent team if they have at least 11 available players
  const opponentTeam = opponent && opponentSquad.length >= 11 ? createMatchTeam(
    opponent.id,
    opponent.name,
    opponentSquad,
    '4-3-3',
    'BALANCED'
  ) : null;

  // Determine home/away
  const homeTeam = isHome ? userTeam : opponentTeam;
  const awayTeam = isHome ? opponentTeam : userTeam;
  const homeClubId = isHome ? userClub?.id : opponentClubId;
  const awayClubId = isHome ? opponentClubId : userClub?.id;

  // Start match
  const startMatch = useCallback(() => {
    if (!homeTeam || !awayTeam) return;

    const sim = createMatchSimulator(homeTeam, awayTeam);
    setSimulator(sim);
    setMatchState(sim.next().value);
    setPhase('live');
  }, [homeTeam, awayTeam]);

  // Simulate instantly
  const simulateInstant = useCallback(() => {
    if (!homeTeam || !awayTeam) return;

    const result = simulateMatch(homeTeam, awayTeam);
    setMatchState(result);
    setPhase('post-match');
  }, [homeTeam, awayTeam]);

  // Tick simulation
  useEffect(() => {
    if (phase !== 'live' || !simulator || speed === 'PAUSED' || showTactics) return;

    const interval = speed === 'X1' ? 1000 : speed === 'X5' ? 200 : 50;

    const timer = setInterval(() => {
      const next = simulator.next();
      if (next.done) {
        setMatchState(next.value);
        setPhase('post-match');
        clearInterval(timer);
      } else {
        setMatchState(next.value);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [phase, simulator, speed, showTactics]);

  // Handle instant during live
  useEffect(() => {
    if (phase === 'live' && speed === 'INSTANT' && simulator && !showTactics) {
      let state = matchState;
      while (state && !state.isFinished) {
        const next = simulator.next();
        state = next.value;
      }
      if (state) {
        setMatchState(state);
        setPhase('post-match');
      }
    }
  }, [speed, phase, simulator, matchState, showTactics]);

  // Open tactics panel (pauses match)
  const openTactics = () => {
    setPreviousSpeed(speed);
    setSpeed('PAUSED');
    setShowTactics(true);
  };

  // Close tactics panel (resumes match)
  const closeTactics = () => {
    setShowTactics(false);
    setSpeed(previousSpeed === 'PAUSED' ? 'X1' : previousSpeed);
  };

  // Perform substitution
  const performSubstitution = (outPlayerId: string, inPlayerId: string) => {
    if (subsRemaining <= 0) return;

    // Update lineup
    const newLineup = selectedLineup.map(id => id === outPlayerId ? inPlayerId : id);
    setSelectedLineup(newLineup);

    // Update bench
    const newBench = benchPlayers.filter(id => id !== inPlayerId);
    newBench.push(outPlayerId);
    setBenchPlayers(newBench);

    // Track sub in match state for stats
    if (matchState) {
      const isUserHome = isHome;
      const updatedState = { ...matchState };
      if (isUserHome) {
        updatedState.homeSubsIn = [...(updatedState.homeSubsIn || []), inPlayerId];
      } else {
        updatedState.awaySubsIn = [...(updatedState.awaySubsIn || []), inPlayerId];
      }
      setMatchState(updatedState);
    }

    setSubsRemaining(subsRemaining - 1);
  };

  if (!userClub || !opponent || !opponentTeam) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] p-4 flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Cargando datos del partido...</div>
      </div>
    );
  }

  // ============================================================
  // PRE-MATCH SCREEN
  // ============================================================
  if (phase === 'pre-match') {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        {/* Header */}
        <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-3">
          <div className="flex items-center justify-between">
            <button onClick={onCancel} className="text-[var(--color-text-secondary)] text-xl px-2">
              ←
            </button>
            <div className="text-center">
              <div className="text-xs text-[var(--color-text-secondary)]">{competitionName}</div>
              <div className="text-sm font-bold">Pre-Partido</div>
            </div>
            <div className="w-8"></div>
          </div>
        </div>

        {/* Teams Header */}
        <div className="bg-[var(--color-bg-tertiary)] p-4">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${isHome ? 'text-[var(--color-accent-green)]' : ''}`}>
                {homeTeam?.clubName.slice(0, 3).toUpperCase() || userClub.shortCode}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {isHome ? 'TU EQUIPO' : 'LOCAL'}
              </div>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text-secondary)]">vs</div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${!isHome ? 'text-[var(--color-accent-green)]' : ''}`}>
                {awayTeam?.clubName.slice(0, 3).toUpperCase() || opponent.shortCode}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {!isHome ? 'TU EQUIPO' : 'VISITANTE'}
              </div>
            </div>
          </div>
        </div>

        {/* Tactic Selection */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="text-sm font-semibold mb-2">Tactica</div>
          <div className="flex gap-2">
            {(['DEFENSIVE', 'BALANCED', 'ATTACKING'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTactic(t)}
                className={`flex-1 py-2 px-3 rounded text-sm ${
                  tactic === t
                    ? 'bg-[var(--color-accent-green)] text-black font-bold'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }`}
              >
                {t === 'DEFENSIVE' ? 'Defensiva' : t === 'BALANCED' ? 'Equilibrada' : 'Ofensiva'}
              </button>
            ))}
          </div>
        </div>

        {/* Lineup Selector */}
        <div className="p-4 pb-24">
          <LineupSelector
            squad={userSquad}
            formation={formation}
            onFormationChange={setFormation}
            selectedLineup={selectedLineup}
            onLineupChange={setSelectedLineup}
            benchPlayers={benchPlayers}
            onBenchChange={setBenchPlayers}
            currentDate={currentSave?.gameDate}
          />
        </div>

        {/* Start Buttons - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-bg-card)] border-t border-[var(--color-border)]">
          <div className="flex gap-3">
            <button
              onClick={startMatch}
              disabled={selectedLineup.length !== 11}
              className={`flex-1 btn py-4 font-bold ${
                selectedLineup.length === 11
                  ? 'bg-[var(--color-accent-green)] text-black'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
              }`}
            >
              Jugar Partido
            </button>
            <button
              onClick={simulateInstant}
              disabled={selectedLineup.length !== 11}
              className="btn btn-ghost py-4 px-6"
            >
              Simular
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // LIVE MATCH SCREEN (BALONPI-style with all fixtures)
  // ============================================================
  if (phase === 'live' && matchState) {
    // Get momentum indicator
    const momentumText = (matchState.momentum || 0) > 20 ? 'Dominando!' :
                         (matchState.momentum || 0) < -20 ? 'Bajo presion' : '';
    const isHalfTime = matchState.isHalfTime;

    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex">
        {/* Left Panel - All Matchday Fixtures (Desktop) */}
        <div className="w-28 flex-shrink-0 hidden sm:block">
          <LiveMatchdayPanel
            currentMinute={matchState.minute}
            userMatchHomeId={homeClubId || ''}
            userMatchAwayId={awayClubId || ''}
            userHomeScore={matchState.homeScore}
            userAwayScore={matchState.awayScore}
          />
        </div>

        {/* Mobile Results Panel (when toggled) */}
        {mobileView === 'results' && (
          <div className="fixed inset-0 z-40 sm:hidden bg-[var(--color-bg-primary)]">
            <div className="h-full flex flex-col">
              {/* Mobile results header */}
              <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-3 flex items-center justify-between">
                <div className="font-bold text-sm">Todos los Resultados</div>
                <button
                  onClick={() => setMobileView('pitch')}
                  className="px-3 py-1.5 bg-[var(--color-accent-green)] text-black rounded-lg text-sm font-medium"
                >
                  Ver Partido
                </button>
              </div>
              {/* Results content */}
              <div className="flex-1 overflow-y-auto">
                <LiveMatchdayPanel
                  currentMinute={matchState.minute}
                  userMatchHomeId={homeClubId || ''}
                  userMatchAwayId={awayClubId || ''}
                  userHomeScore={matchState.homeScore}
                  userAwayScore={matchState.awayScore}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Score Header - Compact and beautiful */}
          <div className="bg-gradient-to-r from-[var(--color-bg-card)] via-[var(--color-bg-tertiary)] to-[var(--color-bg-card)] border-b border-[var(--color-border)] py-2 px-3">
            <div className="flex items-center justify-between gap-2">
              {/* Home team */}
              <div className={`flex-1 text-right ${isHome ? '' : ''}`}>
                <div className={`text-sm font-bold truncate ${isHome ? 'text-[var(--color-accent-green)]' : 'text-white'}`}>
                  {homeTeam?.clubName}
                </div>
                {isHome && <div className="text-[9px] text-[var(--color-accent-green)]">TU EQUIPO</div>}
              </div>

              {/* Score & Time */}
              <div className="flex flex-col items-center px-2">
                <div className="text-[10px] text-[var(--color-text-secondary)] mb-0.5">{competitionName}</div>
                <div className={`text-3xl font-mono font-bold tracking-wider ${isHalfTime ? 'text-yellow-400' : ''}`}>
                  {matchState.homeScore} - {matchState.awayScore}
                </div>
                <div className={`text-lg font-mono ${isHalfTime ? 'text-yellow-400 animate-pulse' : 'text-[var(--color-accent-green)]'}`}>
                  {isHalfTime ? 'DESCANSO' : `${matchState.minute}'`}
                </div>
                {momentumText && (
                  <div className={`text-[9px] font-semibold ${(matchState.momentum || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {momentumText}
                  </div>
                )}
              </div>

              {/* Away team */}
              <div className={`flex-1 text-left`}>
                <div className={`text-sm font-bold truncate ${!isHome ? 'text-[var(--color-accent-green)]' : 'text-white'}`}>
                  {awayTeam?.clubName}
                </div>
                {!isHome && <div className="text-[9px] text-[var(--color-accent-green)]">TU EQUIPO</div>}
              </div>
            </div>
          </div>

          {/* Interactive Pitch with drag-drop subs */}
          <div className="px-2 pt-2">
            <LivePitchView
              lineup={lineupPlayers as any[]}
              bench={benchPlayerObjects as any[]}
              formation={formation}
              subsRemaining={subsRemaining}
              onSubstitution={performSubstitution}
              compact={true}
            />
          </div>

          {/* Stats Bar - Enhanced */}
          <div className="mx-2 mt-2 bg-[var(--color-bg-tertiary)] rounded-lg p-2">
            <div className="flex justify-between items-center text-[11px]">
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold">{matchState.homePossession}%</span>
                  <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent-green)] transition-all duration-300"
                      style={{ width: `${matchState.homePossession}%` }}
                    />
                  </div>
                  <span>{100 - matchState.homePossession}%</span>
                </div>
                <div className="text-[9px] text-center text-[var(--color-text-secondary)]">Posesion</div>
              </div>
              <div className="px-3 text-center border-x border-[var(--color-border)]">
                <div className="font-mono font-bold">{matchState.homeShots} - {matchState.awayShots}</div>
                <div className="text-[9px] text-[var(--color-text-secondary)]">Tiros</div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-mono font-bold text-[var(--color-text-secondary)]">
                  {(matchState.homeXG || 0).toFixed(1)} - {(matchState.awayXG || 0).toFixed(1)}
                </div>
                <div className="text-[9px] text-[var(--color-text-secondary)]">xG</div>
              </div>
            </div>
          </div>

          {/* Events Feed - Improved */}
          <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
            {matchState.events.length === 0 ? (
              <div className="text-[var(--color-text-secondary)] text-sm text-center py-4">
                <div className="animate-pulse">Esperando acciones...</div>
              </div>
            ) : (
              <div className="space-y-1">
                {[...matchState.events].reverse().slice(0, 15).map((event, i) => (
                  <EventRow
                    key={i}
                    event={event}
                    isUserTeam={(event.teamIndex === 0 && isHome) || (event.teamIndex === 1 && !isHome)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom Controls - Cleaner */}
          <div className="p-2 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] safe-bottom">
            <div className="flex items-center gap-2">
              {/* Mobile results toggle */}
              <button
                onClick={() => setMobileView('results')}
                className="sm:hidden flex items-center gap-1 px-2 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg text-sm"
                title="Ver otros resultados"
              >
                <span>📊</span>
              </button>

              {/* Formation quick change */}
              <button
                onClick={openTactics}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-accent-yellow)] text-black font-bold rounded-lg text-sm"
              >
                <TacticsIcon size={22} />
                <span className="hidden xs:inline">Tacticas</span>
              </button>

              {/* Current formation display */}
              <div className="text-[11px] text-[var(--color-text-secondary)] hidden xs:block">
                <span className="font-mono">{formation}</span>
                <span className="mx-1">·</span>
                <span>{tactic === 'DEFENSIVE' ? 'DEF' : tactic === 'ATTACKING' ? 'ATK' : 'BAL'}</span>
              </div>

              {/* Speed controls */}
              <div className="flex-1 flex justify-end gap-1">
                {(['PAUSED', 'X1', 'X5', 'INSTANT'] as SimSpeed[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      speed === s
                        ? 'bg-[var(--color-accent-green)] text-black'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                    }`}
                  >
                    {s === 'PAUSED' ? '⏸' : s === 'INSTANT' ? '⏩' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tactics Panel (modal overlay) */}
        {showTactics && (
          <TacticsPanel
            lineup={lineupPlayers as any[]}
            bench={benchPlayerObjects as any[]}
            formation={formation}
            tactic={tactic}
            subsRemaining={subsRemaining}
            currentMinute={matchState.minute}
            onFormationChange={setFormation}
            onTacticChange={setTactic}
            onSubstitution={performSubstitution}
            onClose={closeTactics}
          />
        )}
      </div>
    );
  }

  // ============================================================
  // POST-MATCH SCREEN - Enhanced with better visuals
  // ============================================================
  if (phase === 'post-match' && matchState) {
    const userWon = isHome
      ? matchState.homeScore > matchState.awayScore
      : matchState.awayScore > matchState.homeScore;
    const draw = matchState.homeScore === matchState.awayScore;
    const userScore = isHome ? matchState.homeScore : matchState.awayScore;
    const opponentScore = isHome ? matchState.awayScore : matchState.homeScore;

    // Points gained
    const pointsGained = userWon ? 3 : draw ? 1 : 0;

    // Goals by user's team
    const userGoals = matchState.events.filter(e =>
      e.type === 'GOAL' && ((e.teamIndex === 0 && isHome) || (e.teamIndex === 1 && !isHome))
    );
    const opponentGoals = matchState.events.filter(e =>
      e.type === 'GOAL' && ((e.teamIndex === 0 && !isHome) || (e.teamIndex === 1 && isHome))
    );

    const resultBgClass = userWon
      ? 'from-green-500/30 to-green-500/5'
      : draw
        ? 'from-yellow-500/30 to-yellow-500/5'
        : 'from-red-500/30 to-red-500/5';

    const resultTextClass = userWon
      ? 'text-green-400'
      : draw
        ? 'text-yellow-400'
        : 'text-red-400';

    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        {/* Result Hero */}
        <div className={`bg-gradient-to-b ${resultBgClass} px-4 py-6`}>
          {/* Competition name */}
          <div className="text-center text-xs text-[var(--color-text-secondary)] mb-4">
            {competitionName} · Fin del Partido
          </div>

          {/* Result text */}
          <div className={`text-center text-4xl font-black mb-4 ${resultTextClass}`}>
            {userWon ? 'VICTORIA!' : draw ? 'EMPATE' : 'DERROTA'}
          </div>

          {/* Score display */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center flex-1">
              <div className={`text-2xl font-bold ${isHome ? resultTextClass : 'text-white'}`}>
                {homeTeam?.clubName}
              </div>
              {isHome && <div className="text-[10px] text-[var(--color-text-secondary)]">TU EQUIPO</div>}
            </div>
            <div className="text-center">
              <div className="text-6xl font-mono font-black tracking-wider">
                {matchState.homeScore} - {matchState.awayScore}
              </div>
              <div className={`text-sm font-bold mt-1 ${resultTextClass}`}>
                +{pointsGained} pts
              </div>
            </div>
            <div className="text-center flex-1">
              <div className={`text-2xl font-bold ${!isHome ? resultTextClass : 'text-white'}`}>
                {awayTeam?.clubName}
              </div>
              {!isHome && <div className="text-[10px] text-[var(--color-text-secondary)]">TU EQUIPO</div>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Match Stats */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
            <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-3">ESTADISTICAS</div>

            {/* Possession bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold">{matchState.homePossession}%</span>
                <span className="text-[var(--color-text-secondary)]">Posesion</span>
                <span className="font-bold">{100 - matchState.homePossession}%</span>
              </div>
              <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden flex">
                <div
                  className="bg-[var(--color-accent-green)] transition-all"
                  style={{ width: `${matchState.homePossession}%` }}
                />
                <div className="flex-1 bg-[var(--color-accent-red)]" />
              </div>
            </div>

            {/* Other stats */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="font-mono font-bold">{matchState.homeShots}</div>
              <div className="text-[var(--color-text-secondary)]">Tiros</div>
              <div className="font-mono font-bold">{matchState.awayShots}</div>

              <div className="font-mono font-bold">{(matchState.homeXG || 0).toFixed(1)}</div>
              <div className="text-[var(--color-text-secondary)]">xG</div>
              <div className="font-mono font-bold">{(matchState.awayXG || 0).toFixed(1)}</div>
            </div>
          </div>

          {/* Goals - Split by team */}
          {(userGoals.length > 0 || opponentGoals.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {/* User goals */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[var(--color-accent-green)] mb-2">
                  TU EQUIPO ({userScore})
                </div>
                {userGoals.length > 0 ? (
                  <div className="space-y-1.5">
                    {userGoals.map((event, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-green-400">⚽</span>
                        <span className="font-medium flex-1 truncate">{event.playerName.split(' ').pop()}</span>
                        <span className="text-[var(--color-text-secondary)]">{event.minute}'</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-secondary)]">Sin goles</div>
                )}
              </div>

              {/* Opponent goals */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[var(--color-accent-red)] mb-2">
                  RIVAL ({opponentScore})
                </div>
                {opponentGoals.length > 0 ? (
                  <div className="space-y-1.5">
                    {opponentGoals.map((event, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-red-400">⚽</span>
                        <span className="font-medium flex-1 truncate">{event.playerName.split(' ').pop()}</span>
                        <span className="text-[var(--color-text-secondary)]">{event.minute}'</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-secondary)]">Sin goles</div>
                )}
              </div>
            </div>
          )}

          {/* Cards if any */}
          {matchState.events.filter(e => e.type === 'YELLOW' || e.type === 'RED').length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-[var(--color-text-secondary)] mb-2">TARJETAS</div>
              <div className="flex flex-wrap gap-2">
                {matchState.events
                  .filter(e => e.type === 'YELLOW' || e.type === 'RED')
                  .map((event, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-xs"
                    >
                      <span>{event.type === 'YELLOW' ? '🟨' : '🟥'}</span>
                      <span>{event.playerName.split(' ').pop()}</span>
                      <span className="text-[var(--color-text-secondary)]">{event.minute}'</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* One More Day Hook - Teaser for next action */}
        <OneMoreDayTeaser
          userClub={userClub}
          currentSave={currentSave}
          userWon={userWon}
          getUpcomingFixtures={getUpcomingFixtures}
          getClub={getClub}
        />

        {/* Continue Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] safe-bottom">
          <button
            onClick={() => onFinish(matchState)}
            className={`w-full py-4 font-bold rounded-xl text-lg text-black ${
              userWon
                ? 'bg-green-500 hover:bg-green-400'
                : draw
                  ? 'bg-yellow-500 hover:bg-yellow-400'
                  : 'bg-red-500 hover:bg-red-400'
            } transition-colors`}
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// One More Day Teaser - Addiction hook component
interface OneMoreDayTeaserProps {
  userClub: any;
  currentSave: any;
  userWon: boolean;
  getUpcomingFixtures: (clubId: string, count?: number) => any[];
  getClub: (clubId: string) => any;
}

function OneMoreDayTeaser({ userClub, currentSave, userWon, getUpcomingFixtures, getClub }: OneMoreDayTeaserProps) {
  if (!userClub || !currentSave) return null;

  // Get next fixture
  const upcomingFixtures = getUpcomingFixtures(userClub.id, 1);
  const nextFixture = upcomingFixtures[0];

  if (!nextFixture) return null;

  const nextOpponentId = nextFixture.homeClubId === userClub.id
    ? nextFixture.awayClubId
    : nextFixture.homeClubId;
  const nextOpponent = getClub(nextOpponentId);
  const nextIsHome = nextFixture.homeClubId === userClub.id;

  if (!nextOpponent) return null;

  // Check if next match is a derby
  const isDerby = areRivals(userClub.name, nextOpponent.name);

  // Get league standings
  const userLeague = currentSave.competitions.find(
    (c: any) => c.type === 'LEAGUE' && c.teamIds?.includes(userClub.id)
  );

  const sortedStandings = [...(userLeague?.standings || [])].sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
  });

  const currentPosition = sortedStandings.findIndex((s: any) => s.clubId === userClub.id) + 1;
  const userStanding = sortedStandings.find((s: any) => s.clubId === userClub.id);

  // Find who's above us
  const teamAbove = currentPosition > 1 ? sortedStandings[currentPosition - 2] : null;
  const teamAboveClub = teamAbove ? getClub(teamAbove.clubId) : null;
  const pointsToClimb = teamAbove ? teamAbove.points - (userStanding?.points || 0) : 0;

  // Generate teaser messages
  const teaserMessages: string[] = [];

  if (isDerby) {
    teaserMessages.push(`El proximo partido es el CLASICO contra ${nextOpponent.name}...`);
  } else if (nextOpponent.reputation >= 80) {
    teaserMessages.push(`Te espera un duelo dificil contra ${nextOpponent.name}...`);
  } else if (nextOpponent.reputation <= 40) {
    teaserMessages.push(`Partido accesible contra ${nextOpponent.name} en camino...`);
  }

  if (currentPosition === 1) {
    teaserMessages.push(`Sigues lider! No aflojes ahora...`);
  } else if (currentPosition <= 3) {
    teaserMessages.push(`Estas en zona de ${currentPosition === 2 ? 'subcampeonato' : 'podio'}!`);
  } else if (pointsToClimb <= 3 && teamAboveClub) {
    teaserMessages.push(`A ${pointsToClimb} punto${pointsToClimb !== 1 ? 's' : ''} de ${teamAboveClub.name}...`);
  }

  if (userWon) {
    teaserMessages.push(`Victoria! El momento es ahora, no pares!`);
  } else {
    teaserMessages.push(`Hay que revertir esto, el proximo es clave...`);
  }

  // Pick a random teaser or combine them
  const mainTeaser = teaserMessages[0];
  const secondTeaser = teaserMessages.length > 1 ? teaserMessages[1] : null;

  return (
    <div className="mx-4 mb-20 bg-gradient-to-r from-[var(--color-accent-cyan)]/10 via-[var(--color-bg-card)] to-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{'>'}</span>
        <span className="text-[var(--color-accent-cyan)] font-semibold text-sm">PROXIMO DESAFIO</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isDerby && <span className="text-red-400 text-lg">🔥</span>}
          <span className="font-bold">{nextOpponent.shortCode}</span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            ({nextIsHome ? 'LOCAL' : 'VISITANTE'})
          </span>
        </div>
        <div className="text-xs text-[var(--color-text-secondary)]">
          Rep: {nextOpponent.reputation}
        </div>
      </div>

      {mainTeaser && (
        <p className="text-sm text-[var(--color-text-secondary)] italic">
          "{mainTeaser}"
        </p>
      )}
      {secondTeaser && (
        <p className="text-xs text-[var(--color-accent-cyan)] mt-1">
          {secondTeaser}
        </p>
      )}

      {/* Mini standing preview */}
      {currentPosition > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)]">Tu posicion:</span>
          <span className="font-bold text-[var(--color-accent-green)]">{currentPosition}°</span>
        </div>
      )}
    </div>
  );
}

// Event row component - Enhanced with more event types
function EventRow({ event, isUserTeam }: { event: MatchEvent; isUserTeam: boolean }) {
  const icons: Record<string, string> = {
    GOAL: '⚽',
    YELLOW: '🟨',
    RED: '🟥',
    SUBSTITUTION: '🔄',
    CHANCE: '💨',
    SAVE: '🧤',
  };

  const getBgClass = () => {
    if (event.type === 'GOAL' && isUserTeam) return 'bg-green-500/20 border-l-2 border-green-500';
    if (event.type === 'GOAL') return 'bg-red-500/20 border-l-2 border-red-500';
    if (event.type === 'CHANCE' && isUserTeam) return 'bg-blue-500/10';
    if (event.type === 'CHANCE') return 'bg-orange-500/10';
    if (event.type === 'YELLOW') return 'bg-yellow-500/10';
    return 'bg-[var(--color-bg-tertiary)]';
  };

  const getDescription = () => {
    if (event.type === 'GOAL') {
      return event.assistPlayerName
        ? `${event.playerName} (asist. ${event.assistPlayerName.split(' ').pop()})`
        : event.playerName;
    }
    if (event.type === 'CHANCE') {
      return `${event.playerName} - ${event.description || 'Ocasion'}`;
    }
    return event.playerName;
  };

  return (
    <div className={`flex items-center gap-2 text-[11px] p-1.5 rounded ${getBgClass()}`}>
      <span className="text-[var(--color-text-secondary)] font-mono w-6 text-[10px]">{event.minute}'</span>
      <span className="text-sm">{icons[event.type] || '•'}</span>
      <span className={`flex-1 truncate ${isUserTeam ? 'text-[var(--color-accent-green)]' : ''}`}>
        {getDescription()}
      </span>
    </div>
  );
}

// Standalone quick match component for testing
export function QuickMatchPage() {
  const { currentSave, getUserClub } = useGame();
  const [showMatch, setShowMatch] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);

  const userClub = getUserClub();

  if (!currentSave || !userClub) {
    return <div className="p-4 text-[var(--color-text-secondary)]">No active game</div>;
  }

  // Get clubs in same league
  const leagueClubs = currentSave.clubs.filter(
    c => c.leagueId === userClub.leagueId && c.id !== userClub.id && !c.isNationalTeam
  );

  if (showMatch && selectedOpponent) {
    return (
      <MatchDayPage
        opponentClubId={selectedOpponent}
        isHome={Math.random() > 0.5}
        competitionName="Partido Amistoso"
        onFinish={(result) => {
          console.log('Match finished:', result);
          setShowMatch(false);
          setSelectedOpponent(null);
        }}
        onCancel={() => {
          setShowMatch(false);
          setSelectedOpponent(null);
        }}
      />
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Partido Rapido</h1>
      <p className="text-[var(--color-text-secondary)] text-sm mb-4">Selecciona un oponente:</p>

      <div className="space-y-2">
        {leagueClubs.slice(0, 10).map(club => (
          <button
            key={club.id}
            onClick={() => {
              setSelectedOpponent(club.id);
              setShowMatch(true);
            }}
            className="w-full card p-3 text-left hover:border-[var(--color-accent-green)]"
          >
            <div className="font-semibold">{club.name}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Rep: {club.reputation}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
