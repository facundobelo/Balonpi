/**
 * SquadPage - Plantilla del equipo con vista de formación
 *
 * Features:
 * - Vista de cancha interactiva con formación predeterminada
 * - Lista de jugadores con filtros
 * - Drag & drop para cambiar posiciones
 * - Estadísticas del equipo
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { FormArrow, PositionBadge } from '../components/ui';
import { useGame } from '../contexts/GameContext';
import { PlayerDetailModal } from '../components/ui/PlayerDetailModal';
import type { IPlayer, TransferStatus, Position } from '../game/types';

// Transfer status cycle: UNTOUCHABLE -> LOAN_LISTED -> LISTED -> UNTOUCHABLE
const TRANSFER_STATUS_CYCLE: TransferStatus[] = ['UNTOUCHABLE', 'LOAN_LISTED', 'LISTED'];

function getNextTransferStatus(current: TransferStatus): TransferStatus {
  // Treat AVAILABLE same as UNTOUCHABLE
  const currentStatus = current === 'AVAILABLE' ? 'UNTOUCHABLE' : current;
  const currentIndex = TRANSFER_STATUS_CYCLE.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % TRANSFER_STATUS_CYCLE.length;
  return TRANSFER_STATUS_CYCLE[nextIndex];
}

function getPrevTransferStatus(current: TransferStatus): TransferStatus {
  // Treat AVAILABLE same as UNTOUCHABLE
  const currentStatus = current === 'AVAILABLE' ? 'UNTOUCHABLE' : current;
  const currentIndex = TRANSFER_STATUS_CYCLE.indexOf(currentStatus);
  const prevIndex = (currentIndex - 1 + TRANSFER_STATUS_CYCLE.length) % TRANSFER_STATUS_CYCLE.length;
  return TRANSFER_STATUS_CYCLE[prevIndex];
}

// Get transfer status info for display
function getTransferStatusInfo(status: TransferStatus): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'LISTED':
      return { label: 'En Venta', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    case 'LOAN_LISTED':
      return { label: 'Cedible', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    case 'UNTOUCHABLE':
    case 'AVAILABLE':
    default:
      return { label: 'Intransferible', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  }
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'];

// Formation position mappings (x, y as percentages)
const FORMATION_POSITIONS: Record<string, { pos: Position; x: number; y: number }[]> = {
  '4-3-3': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'DEF', x: 15, y: 72 }, { pos: 'DEF', x: 38, y: 75 }, { pos: 'DEF', x: 62, y: 75 }, { pos: 'DEF', x: 85, y: 72 },
    { pos: 'MID', x: 25, y: 50 }, { pos: 'MID', x: 50, y: 55 }, { pos: 'MID', x: 75, y: 50 },
    { pos: 'FWD', x: 20, y: 25 }, { pos: 'FWD', x: 50, y: 20 }, { pos: 'FWD', x: 80, y: 25 },
  ],
  '4-4-2': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'DEF', x: 15, y: 72 }, { pos: 'DEF', x: 38, y: 75 }, { pos: 'DEF', x: 62, y: 75 }, { pos: 'DEF', x: 85, y: 72 },
    { pos: 'MID', x: 15, y: 48 }, { pos: 'MID', x: 38, y: 52 }, { pos: 'MID', x: 62, y: 52 }, { pos: 'MID', x: 85, y: 48 },
    { pos: 'FWD', x: 35, y: 22 }, { pos: 'FWD', x: 65, y: 22 },
  ],
  '4-2-3-1': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'DEF', x: 15, y: 72 }, { pos: 'DEF', x: 38, y: 75 }, { pos: 'DEF', x: 62, y: 75 }, { pos: 'DEF', x: 85, y: 72 },
    { pos: 'MID', x: 35, y: 58 }, { pos: 'MID', x: 65, y: 58 },
    { pos: 'MID', x: 20, y: 38 }, { pos: 'MID', x: 50, y: 42 }, { pos: 'MID', x: 80, y: 38 },
    { pos: 'FWD', x: 50, y: 18 },
  ],
  '3-5-2': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'DEF', x: 25, y: 73 }, { pos: 'DEF', x: 50, y: 78 }, { pos: 'DEF', x: 75, y: 73 },
    { pos: 'MID', x: 10, y: 50 }, { pos: 'MID', x: 30, y: 55 }, { pos: 'MID', x: 50, y: 52 }, { pos: 'MID', x: 70, y: 55 }, { pos: 'MID', x: 90, y: 50 },
    { pos: 'FWD', x: 35, y: 22 }, { pos: 'FWD', x: 65, y: 22 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'DEF', x: 10, y: 68 }, { pos: 'DEF', x: 30, y: 73 }, { pos: 'DEF', x: 50, y: 78 }, { pos: 'DEF', x: 70, y: 73 }, { pos: 'DEF', x: 90, y: 68 },
    { pos: 'MID', x: 25, y: 48 }, { pos: 'MID', x: 50, y: 52 }, { pos: 'MID', x: 75, y: 48 },
    { pos: 'FWD', x: 35, y: 22 }, { pos: 'FWD', x: 65, y: 22 },
  ],
  '4-1-4-1': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'DEF', x: 15, y: 72 }, { pos: 'DEF', x: 38, y: 75 }, { pos: 'DEF', x: 62, y: 75 }, { pos: 'DEF', x: 85, y: 72 },
    { pos: 'MID', x: 50, y: 60 },
    { pos: 'MID', x: 15, y: 42 }, { pos: 'MID', x: 38, y: 45 }, { pos: 'MID', x: 62, y: 45 }, { pos: 'MID', x: 85, y: 42 },
    { pos: 'FWD', x: 50, y: 18 },
  ],
};

// Position colors
const POSITION_COLORS: Record<Position, string> = {
  GK: 'bg-yellow-500',
  DEF: 'bg-blue-500',
  MID: 'bg-green-500',
  FWD: 'bg-red-500',
};

// Get transfer status indicator
function getTransferStatusIndicator(status: TransferStatus): { icon: string; color: string } | null {
  switch (status) {
    case 'LISTED':
      return { icon: '💰', color: 'text-green-400' };
    case 'LOAN_LISTED':
      return { icon: '📤', color: 'text-blue-400' };
    case 'UNTOUCHABLE':
      return { icon: '🔒', color: 'text-red-400' };
    default:
      return null;
  }
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

// Swipeable Player Card Component
interface SwipeablePlayerCardProps {
  player: IPlayer;
  isInXI: boolean;
  onTap: () => void;
  onStatusChange: (status: TransferStatus) => void;
}

function SwipeablePlayerCard({ player, isInXI, onTap, onStatusChange }: SwipeablePlayerCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const transferIndicator = getTransferStatusIndicator(player.transferStatus);
  const statusInfo = getTransferStatusInfo(player.transferStatus);
  const nextStatus = getNextTransferStatus(player.transferStatus);
  const prevStatus = getPrevTransferStatus(player.transferStatus);
  const nextStatusInfo = getTransferStatusInfo(nextStatus);
  const prevStatusInfo = getTransferStatusInfo(prevStatus);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwiping.current = true;
      // Limit swipe to -80 to 80 pixels
      setSwipeX(Math.max(-80, Math.min(80, diffX)));
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping.current) {
      if (swipeX > 40) {
        // Swiped right - go to next status
        onStatusChange(nextStatus);
        setShowStatusChange(true);
        setTimeout(() => setShowStatusChange(false), 1000);
      } else if (swipeX < -40) {
        // Swiped left - go to previous status
        onStatusChange(prevStatus);
        setShowStatusChange(true);
        setTimeout(() => setShowStatusChange(false), 1000);
      }
    }
    setSwipeX(0);
    isSwiping.current = false;
  };

  const handleClick = () => {
    if (!isSwiping.current) {
      // Tap cycles transfer status instead of opening modal
      onStatusChange(nextStatus);
      setShowStatusChange(true);
      setTimeout(() => setShowStatusChange(false), 1000);
    }
  };

  const handleLongPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStartLongPress = (e: React.TouchEvent) => {
    handleTouchStart(e);
    handleLongPress.current = setTimeout(() => {
      onTap(); // Long press opens detail modal
    }, 500);
  };

  const clearLongPress = () => {
    if (handleLongPress.current) {
      clearTimeout(handleLongPress.current);
      handleLongPress.current = null;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background indicators for swipe direction */}
      <div className="absolute inset-0 flex">
        <div className={`flex-1 flex items-center justify-start pl-3 ${prevStatusInfo.bgColor}`}>
          <span className={`text-xs font-bold ${prevStatusInfo.color}`}>{prevStatusInfo.label}</span>
        </div>
        <div className={`flex-1 flex items-center justify-end pr-3 ${nextStatusInfo.bgColor}`}>
          <span className={`text-xs font-bold ${nextStatusInfo.color}`}>{nextStatusInfo.label}</span>
        </div>
      </div>

      {/* Main card content */}
      <div
        className={`
          relative flex items-center gap-3 p-3 transition-transform cursor-pointer
          ${isInXI
            ? 'bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30'
            : 'bg-[var(--color-bg-card)] border border-[var(--color-border)]'
          }
        `}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStartLongPress}
        onTouchMove={(e) => { handleTouchMove(e); clearLongPress(); }}
        onTouchEnd={() => { handleTouchEnd(); clearLongPress(); }}
        onClick={handleClick}
      >
        {/* Position */}
        <PositionBadge position={player.positionMain} />

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{player.name}</span>
            {player.isIdol && <span className="text-[var(--color-accent-yellow)]">★</span>}
            {isInXI && <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] rounded font-bold">XI</span>}
            <FormArrow condition={player.conditionArrow} size="sm" />
            {transferIndicator && (
              <span className={transferIndicator.color}>{transferIndicator.icon}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
            <span>{player.age} años</span>
            <span>{player.nationality}</span>
            {player.currentSeasonStats.goals > 0 && (
              <span className="text-[var(--color-accent-green)]">
                {player.currentSeasonStats.goals}G
              </span>
            )}
            {player.currentSeasonStats.assists > 0 && (
              <span className="text-[var(--color-accent-cyan)]">
                {player.currentSeasonStats.assists}A
              </span>
            )}
          </div>
        </div>

        {/* Skill & Potential */}
        <div className="text-right">
          <div className="font-mono text-lg font-bold">{player.skillBase}</div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            POT <span className="text-purple-400">{player.potential}</span>
          </div>
        </div>
      </div>

      {/* Status change feedback */}
      {showStatusChange && (
        <div className={`absolute inset-0 flex items-center justify-center ${statusInfo.bgColor} animate-pulse`}>
          <span className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
      )}
    </div>
  );
}

type ViewMode = 'formation' | 'list';

export function SquadPage() {
  const { currentSave, getUserClub, getUserSquad, updatePlayerTransferStatus } = useGame();
  const [viewMode, setViewMode] = useState<ViewMode>('formation');
  const [formation, setFormation] = useState('4-3-3');
  const [filterPosition, setFilterPosition] = useState<Position | 'ALL'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<IPlayer | null>(null);
  const [selectedLineup, setSelectedLineup] = useState<string[]>([]);

  const club = getUserClub();
  const players = getUserSquad();

  // Auto-select best XI on first render
  useMemo(() => {
    if (players.length > 0 && selectedLineup.length === 0) {
      const positions = FORMATION_POSITIONS[formation];
      const newLineup: string[] = [];
      const usedIds = new Set<string>();

      for (const { pos } of positions) {
        const available = players
          .filter(p => p.positionMain === pos && !usedIds.has(p.id))
          .sort((a, b) => b.skillBase - a.skillBase);

        if (available.length > 0) {
          newLineup.push(available[0].id);
          usedIds.add(available[0].id);
        } else {
          // Try alternative positions
          const altAvailable = players
            .filter(p => p.positionAlt?.includes(pos) && !usedIds.has(p.id))
            .sort((a, b) => b.skillBase - a.skillBase);

          if (altAvailable.length > 0) {
            newLineup.push(altAvailable[0].id);
            usedIds.add(altAvailable[0].id);
          } else {
            // Just pick anyone
            const anyone = players.find(p => !usedIds.has(p.id));
            if (anyone) {
              newLineup.push(anyone.id);
              usedIds.add(anyone.id);
            }
          }
        }
      }

      setSelectedLineup(newLineup);
    }
  }, [players, formation]);

  // Change formation and re-select lineup
  const handleFormationChange = useCallback((newFormation: string) => {
    setFormation(newFormation);
    // Re-select lineup for new formation
    const positions = FORMATION_POSITIONS[newFormation];
    const newLineup: string[] = [];
    const usedIds = new Set<string>();

    for (const { pos } of positions) {
      const available = players
        .filter(p => p.positionMain === pos && !usedIds.has(p.id))
        .sort((a, b) => b.skillBase - a.skillBase);

      if (available.length > 0) {
        newLineup.push(available[0].id);
        usedIds.add(available[0].id);
      }
    }

    // Fill remaining spots if needed
    while (newLineup.length < 11) {
      const remaining = players.find(p => !usedIds.has(p.id));
      if (remaining) {
        newLineup.push(remaining.id);
        usedIds.add(remaining.id);
      } else break;
    }

    setSelectedLineup(newLineup);
  }, [players]);

  // Get starting XI players
  const startingXI = useMemo(() => {
    return selectedLineup.map(id => players.find(p => p.id === id)).filter(Boolean) as IPlayer[];
  }, [selectedLineup, players]);

  // Get bench/reserve players
  const reservePlayers = useMemo(() => {
    return players.filter(p => !selectedLineup.includes(p.id));
  }, [players, selectedLineup]);

  // Filtered players for list view
  const filteredPlayers = filterPosition === 'ALL'
    ? players
    : players.filter((p) => p.positionMain === filterPosition);

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const posOrder = POSITIONS.indexOf(a.positionMain) - POSITIONS.indexOf(b.positionMain);
    if (posOrder !== 0) return posOrder;
    return b.skillBase - a.skillBase;
  });

  if (!club || !currentSave) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-text-secondary)]">Sin partida activa</div>
      </div>
    );
  }

  const avgSkill = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + p.skillBase, 0) / players.length)
    : 0;

  const totalValue = players.reduce((sum, p) => sum + p.marketValue, 0);
  const totalWages = players.reduce((sum, p) => sum + p.wage, 0);

  // Calculate starting XI average
  const xiAvgSkill = startingXI.length > 0
    ? Math.round(startingXI.reduce((sum, p) => sum + p.skillBase, 0) / startingXI.length)
    : 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{club.name}</h1>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-1">
              <span>{players.length} jugadores</span>
              <span className="font-mono">Media: {avgSkill}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">{currentSave.season}</div>
            <div className="text-sm font-mono text-[var(--color-accent-green)]">{currentSave.gameDate}</div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1 mt-3 bg-[var(--color-bg-tertiary)] p-1 rounded-lg">
          <button
            onClick={() => setViewMode('formation')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'formation'
                ? 'bg-[var(--color-accent-green)] text-black'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Formación
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--color-accent-green)] text-black'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Lista
          </button>
        </div>
      </header>

      {/* Formation View */}
      {viewMode === 'formation' && (
        <div className="p-4">
          {/* Formation Selector */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">Formación:</span>
            {FORMATIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleFormationChange(f)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg whitespace-nowrap transition-colors ${
                  formation === f
                    ? 'bg-[var(--color-accent-green)] text-black font-bold'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* XI Average */}
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-xs text-[var(--color-text-secondary)]">XI Titular</span>
            <span className="text-xs font-mono">
              Media: <span className="text-[var(--color-accent-green)] font-bold">{xiAvgSkill}</span>
            </span>
          </div>

          {/* Pitch View */}
          <div className="relative bg-gradient-to-b from-green-800 to-green-900 rounded-xl overflow-hidden border-2 border-green-700" style={{ aspectRatio: '3/4' }}>
            {/* Pitch markings */}
            <div className="absolute inset-0">
              {/* Center circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/20 rounded-full" />
              {/* Center line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20" />
              {/* Penalty areas */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-t-0 border-white/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-b-0 border-white/20" />
              {/* Goal areas */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-6 border-2 border-t-0 border-white/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-6 border-2 border-b-0 border-white/20" />
            </div>

            {/* Players */}
            {FORMATION_POSITIONS[formation]?.map((slot, index) => {
              const player = startingXI[index];
              if (!player) return null;

              const isNaturalPosition = player.positionMain === slot.pos;
              const isAlternative = player.positionAlt?.includes(slot.pos);

              return (
                <div
                  key={index}
                  onClick={() => setSelectedPlayer(player)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  {/* Player circle */}
                  <div className={`
                    w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold
                    transition-transform group-hover:scale-110 group-active:scale-95
                    ${POSITION_COLORS[slot.pos]} text-white shadow-lg
                    ${!isNaturalPosition && !isAlternative ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-green-800' : ''}
                    ${isAlternative && !isNaturalPosition ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-green-800' : ''}
                  `}>
                    {player.skillBase}
                  </div>
                  {/* Player name */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] text-white font-medium text-center whitespace-nowrap bg-black/50 px-1.5 py-0.5 rounded">
                    {player.name.split(' ').pop()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" /> POR
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" /> DEF
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" /> MED
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" /> DEL
            </div>
          </div>

          {/* Reserve Players */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">
              Suplentes y Reservas ({reservePlayers.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {reservePlayers.slice(0, 8).map((player) => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className="flex items-center gap-2 p-2 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent-green)]/50"
                >
                  <PositionBadge position={player.positionMain} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{player.name}</div>
                    <div className="text-[10px] text-[var(--color-text-secondary)]">{player.age} años</div>
                  </div>
                  <div className="text-xs font-mono font-bold">{player.skillBase}</div>
                </div>
              ))}
            </div>
            {reservePlayers.length > 8 && (
              <button
                onClick={() => setViewMode('list')}
                className="w-full mt-2 py-2 text-xs text-[var(--color-accent-green)] hover:underline"
              >
                Ver todos ({reservePlayers.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="p-4">
          {/* Position Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterPosition('ALL')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filterPosition === 'ALL'
                  ? 'bg-[var(--color-accent-green)] text-black font-bold'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              Todos
            </button>
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setFilterPosition(pos)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  filterPosition === pos
                    ? 'bg-[var(--color-accent-green)] text-black font-bold'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                }`}
              >
                {pos === 'GK' ? 'POR' : pos === 'DEF' ? 'DEF' : pos === 'MID' ? 'MED' : 'DEL'}
              </button>
            ))}
          </div>

          {/* Player List - Tap or swipe to change transfer status */}
          <div className="text-[10px] text-[var(--color-text-secondary)] text-center mb-2">
            Toca para cambiar estado · Mantén pulsado para ver detalles
          </div>
          <div className="space-y-2">
            {sortedPlayers.map((player) => {
              const isInXI = selectedLineup.includes(player.id);

              return (
                <SwipeablePlayerCard
                  key={player.id}
                  player={player}
                  isInXI={isInXI}
                  onTap={() => setSelectedPlayer(player)}
                  onStatusChange={(status) => {
                    if (updatePlayerTransferStatus) {
                      updatePlayerTransferStatus(player.id, status);
                    }
                  }}
                />
              );
            })}
          </div>

          {sortedPlayers.length === 0 && (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              No hay jugadores en esta posición
            </div>
          )}
        </div>
      )}

      {/* Team Stats Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] safe-bottom">
        <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]">
          <div className="py-3 text-center">
            <div className="text-[10px] text-[var(--color-text-secondary)]">Valor Plantilla</div>
            <div className="font-mono text-sm font-bold text-[var(--color-accent-yellow)]">
              {formatCurrency(totalValue)}
            </div>
          </div>
          <div className="py-3 text-center">
            <div className="text-[10px] text-[var(--color-text-secondary)]">Masa Salarial</div>
            <div className="font-mono text-sm font-bold">
              {formatCurrency(totalWages)}/sem
            </div>
          </div>
          <div className="py-3 text-center">
            <div className="text-[10px] text-[var(--color-text-secondary)]">Presupuesto</div>
            <div className="font-mono text-sm font-bold text-[var(--color-accent-green)]">
              {formatCurrency(club.budget)}
            </div>
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          isOwnTeam={true}
          clubs={currentSave?.clubs || []}
          onClose={() => setSelectedPlayer(null)}
          onTransferStatusChange={(status) => {
            if (updatePlayerTransferStatus) {
              updatePlayerTransferStatus(selectedPlayer.id, status);
            }
          }}
        />
      )}
    </div>
  );
}
