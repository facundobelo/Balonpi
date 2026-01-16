/**
 * LivePitchView - Interactive pitch with drag-and-drop substitutions
 *
 * Enhanced pitch view that allows:
 * - Tap on player to select for substitution
 * - Drag bench player onto pitch player to substitute
 * - Visual indicators for substitution state
 * - Long press / hold to view player details
 */

import { useState, useCallback, useRef } from 'react';
import type { IPlayer, Position } from '../../game/types';
import { PositionBadge } from '../ui/PositionBadge';
import { FormArrow } from '../ui/FormArrow';
import { PlayerDetailModal } from '../ui/PlayerDetailModal';

// Calculate effective skill based on position fit
// Uses fixed penalties + skill caps for incompatible positions
function getEffectiveSkill(player: IPlayer, assignedPosition: Position): number {
  const naturalPos = player.positionMain;
  const altPositions = player.positionAlt || [];

  // Natural position = no penalty
  if (naturalPos === assignedPosition) {
    return player.skillBase;
  }

  // Alternative position = -3
  if (altPositions.includes(assignedPosition)) {
    return Math.max(1, player.skillBase - 3);
  }

  // Adjacent positions = -10 (DEF↔MID, MID↔FWD)
  const adjacentMap: Record<Position, Position[]> = {
    'GK': [],
    'DEF': ['MID'],
    'MID': ['DEF', 'FWD'],
    'FWD': ['MID'],
  };

  if (adjacentMap[naturalPos]?.includes(assignedPosition)) {
    return Math.max(1, player.skillBase - 10);
  }

  // Incompatible positions - apply skill cap based on how wrong it is
  // GK is unique - anyone else in goal is terrible, GK anywhere else is terrible
  if (assignedPosition === 'GK') {
    // Non-GK playing as GK: cap at 35 (even Messi would be awful in goal)
    return Math.min(35, Math.max(1, player.skillBase - 15));
  }

  if (naturalPos === 'GK') {
    // GK playing outfield: cap at 40
    return Math.min(40, Math.max(1, player.skillBase - 15));
  }

  // DEF as FWD or FWD as DEF: cap at 50 (very different skillsets)
  if ((naturalPos === 'DEF' && assignedPosition === 'FWD') ||
      (naturalPos === 'FWD' && assignedPosition === 'DEF')) {
    return Math.min(50, Math.max(1, player.skillBase - 12));
  }

  // Fallback for any other weird case
  return Math.max(1, player.skillBase - 15);
}

interface LivePitchViewProps {
  lineup: IPlayer[];
  bench: IPlayer[];
  formation: string;
  subsRemaining: number;
  onSubstitution: (outId: string, inId: string) => void;
  compact?: boolean;
  isOwnTeam?: boolean;
}

// Formation position mappings (x, y as percentages)
const FORMATIONS: Record<string, { pos: string; x: number; y: number }[]> = {
  '4-3-3': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 25, y: 45 }, { pos: 'MID', x: 50, y: 42 }, { pos: 'MID', x: 75, y: 45 },
    { pos: 'FWD', x: 20, y: 68 }, { pos: 'FWD', x: 50, y: 72 }, { pos: 'FWD', x: 80, y: 68 },
  ],
  '4-4-2': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 15, y: 48 }, { pos: 'MID', x: 38, y: 45 }, { pos: 'MID', x: 62, y: 45 }, { pos: 'MID', x: 85, y: 48 },
    { pos: 'FWD', x: 35, y: 72 }, { pos: 'FWD', x: 65, y: 72 },
  ],
  '4-2-3-1': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 35, y: 40 }, { pos: 'MID', x: 65, y: 40 },
    { pos: 'MID', x: 20, y: 58 }, { pos: 'MID', x: 50, y: 55 }, { pos: 'MID', x: 80, y: 58 },
    { pos: 'FWD', x: 50, y: 75 },
  ],
  '3-5-2': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 25, y: 24 }, { pos: 'DEF', x: 50, y: 20 }, { pos: 'DEF', x: 75, y: 24 },
    { pos: 'MID', x: 10, y: 45 }, { pos: 'MID', x: 30, y: 42 }, { pos: 'MID', x: 50, y: 45 }, { pos: 'MID', x: 70, y: 42 }, { pos: 'MID', x: 90, y: 45 },
    { pos: 'FWD', x: 35, y: 72 }, { pos: 'FWD', x: 65, y: 72 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 10, y: 30 }, { pos: 'DEF', x: 30, y: 24 }, { pos: 'DEF', x: 50, y: 20 }, { pos: 'DEF', x: 70, y: 24 }, { pos: 'DEF', x: 90, y: 30 },
    { pos: 'MID', x: 25, y: 48 }, { pos: 'MID', x: 50, y: 45 }, { pos: 'MID', x: 75, y: 48 },
    { pos: 'FWD', x: 35, y: 72 }, { pos: 'FWD', x: 65, y: 72 },
  ],
  '4-1-4-1': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 50, y: 38 },
    { pos: 'MID', x: 15, y: 55 }, { pos: 'MID', x: 38, y: 52 }, { pos: 'MID', x: 62, y: 52 }, { pos: 'MID', x: 85, y: 55 },
    { pos: 'FWD', x: 50, y: 75 },
  ],
};

// Get position color
function getPositionColor(pos: string): string {
  switch (pos) {
    case 'GK': return 'bg-amber-500';
    case 'DEF': return 'bg-blue-500';
    case 'MID': return 'bg-green-500';
    case 'FWD': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export function LivePitchView({
  lineup,
  bench,
  formation,
  subsRemaining,
  onSubstitution,
  compact = false,
  isOwnTeam = true,
}: LivePitchViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);
  const [detailPlayer, setDetailPlayer] = useState<IPlayer | null>(null);

  // Long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const formationPositions = FORMATIONS[formation] || FORMATIONS['4-3-3'];

  // Long press handlers
  const handlePointerDown = useCallback((player: IPlayer) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setDetailPlayer(player);
    }, 400); // 400ms for long press
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle pitch player click
  const handlePitchPlayerClick = useCallback((playerId: string) => {
    // Don't trigger click if it was a long press
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (subsRemaining <= 0) return;

    if (selectedPlayer === playerId) {
      // Deselect
      setSelectedPlayer(null);
    } else if (selectedPlayer && bench.find(p => p.id === selectedPlayer)) {
      // Bench player was selected, now clicking pitch player = substitute
      onSubstitution(playerId, selectedPlayer);
      setSelectedPlayer(null);
    } else {
      // Select pitch player
      setSelectedPlayer(playerId);
    }
  }, [selectedPlayer, bench, subsRemaining, onSubstitution]);

  // Handle bench player click
  const handleBenchPlayerClick = useCallback((playerId: string) => {
    // Don't trigger click if it was a long press
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (subsRemaining <= 0) return;

    if (selectedPlayer === playerId) {
      // Deselect
      setSelectedPlayer(null);
    } else if (selectedPlayer && lineup.find(p => p.id === selectedPlayer)) {
      // Pitch player was selected, now clicking bench player = substitute
      onSubstitution(selectedPlayer, playerId);
      setSelectedPlayer(null);
    } else {
      // Select bench player
      setSelectedPlayer(playerId);
    }
  }, [selectedPlayer, lineup, subsRemaining, onSubstitution]);

  // Drag handlers for bench players
  const handleDragStart = useCallback((e: React.DragEvent, playerId: string) => {
    if (subsRemaining <= 0) return;
    e.dataTransfer.setData('text/plain', playerId);
    setSelectedPlayer(playerId);
  }, [subsRemaining]);

  const handleDragOver = useCallback((e: React.DragEvent, playerId: string) => {
    e.preventDefault();
    setDragOverPlayer(playerId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverPlayer(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, outPlayerId: string) => {
    e.preventDefault();
    const inPlayerId = e.dataTransfer.getData('text/plain');
    if (inPlayerId && inPlayerId !== outPlayerId) {
      onSubstitution(outPlayerId, inPlayerId);
    }
    setSelectedPlayer(null);
    setDragOverPlayer(null);
  }, [onSubstitution]);

  const pitchHeight = compact ? 'h-48' : 'h-64';

  return (
    <div className="live-pitch-container">
      {/* Pitch */}
      <div className={`relative ${pitchHeight} w-full rounded-lg overflow-hidden`}>
        {/* Pitch background */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-700 to-green-600">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <rect x="32" y="2" width="36" height="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            <rect x="32" y="88" width="36" height="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
          </svg>
        </div>

        {/* Players on pitch */}
        {lineup.slice(0, 11).map((player, index) => {
          const pos = formationPositions[index] || { x: 50, y: 50 };
          const assignedPosition = pos.pos as Position;
          const effectiveSkill = getEffectiveSkill(player, assignedPosition);
          const isSelected = selectedPlayer === player.id;
          const isDragOver = dragOverPlayer === player.id;
          const canReceiveSub = selectedPlayer && bench.find(p => p.id === selectedPlayer);

          return (
            <div
              key={player.id}
              onClick={() => handlePitchPlayerClick(player.id)}
              onPointerDown={() => handlePointerDown(player)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onDragOver={(e) => handleDragOver(e, player.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, player.id)}
              className={`
                absolute transform -translate-x-1/2 -translate-y-1/2
                cursor-pointer transition-all duration-150 select-none
                ${isSelected ? 'scale-125 z-20' : 'hover:scale-110'}
                ${isDragOver ? 'scale-125 z-20' : ''}
              `}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {/* Player circle with effective skill */}
              <div
                className={`
                  ${compact ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'}
                  rounded-full flex items-center justify-center font-bold text-white
                  ${getPositionColor(player.positionMain)}
                  ${isSelected ? 'ring-3 ring-yellow-400 ring-offset-2 ring-offset-green-700' : ''}
                  ${isDragOver ? 'ring-3 ring-white animate-pulse' : ''}
                  ${canReceiveSub ? 'ring-2 ring-white/50' : ''}
                  shadow-lg
                `}
              >
                {effectiveSkill}
              </div>

              {/* Player name with form arrow */}
              {!compact && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 pointer-events-none">
                  <span className="text-[8px] text-white font-medium whitespace-nowrap bg-black/50 px-1 rounded flex items-center gap-0.5">
                    {player.name.split(' ').pop()?.slice(0, 7)}
                    <FormArrow condition={player.conditionArrow} size="xs" />
                  </span>
                </div>
              )}

              {/* Substitution indicator when selected */}
              {isSelected && subsRemaining > 0 && (
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-bounce">
                  ↓
                </div>
              )}
            </div>
          );
        })}

        {/* Formation label */}
        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
          {formation}
        </div>

        {/* Subs remaining indicator */}
        <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          Cambios: {subsRemaining}
        </div>
      </div>

      {/* Bench strip - draggable players */}
      <div className="mt-2 bg-[var(--color-bg-tertiary)] rounded-lg p-2">
        <div className="text-[10px] text-[var(--color-text-secondary)] mb-1.5 font-semibold">
          SUPLENTES - {subsRemaining > 0 ? 'Toca o arrastra para cambiar' : 'Sin cambios'}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {bench.map((player) => {
            const isSelected = selectedPlayer === player.id;
            const canSubIn = selectedPlayer && lineup.find(p => p.id === selectedPlayer);

            return (
              <div
                key={player.id}
                draggable={subsRemaining > 0}
                onClick={() => handleBenchPlayerClick(player.id)}
                onPointerDown={() => handlePointerDown(player)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onDragStart={(e) => handleDragStart(e, player.id)}
                className={`
                  flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg
                  cursor-pointer transition-all select-none
                  ${isSelected
                    ? 'bg-yellow-500/30 ring-2 ring-yellow-400 scale-105'
                    : 'bg-[var(--color-bg-card)] hover:bg-[var(--color-border)]'
                  }
                  ${canSubIn ? 'ring-1 ring-green-400' : ''}
                  ${subsRemaining <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <PositionBadge position={player.positionMain} size="xs" />
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {player.name.split(' ').pop()?.slice(0, 8)}
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)] flex items-center gap-0.5">
                  {player.skillBase}
                  <FormArrow condition={player.conditionArrow} size="xs" />
                </span>
                {isSelected && subsRemaining > 0 && (
                  <span className="text-green-400 text-[10px]">↑</span>
                )}
              </div>
            );
          })}
          {bench.length === 0 && (
            <span className="text-[10px] text-[var(--color-text-secondary)]">Sin suplentes</span>
          )}
        </div>
      </div>

      {/* Instructions when player selected */}
      {selectedPlayer && subsRemaining > 0 && (
        <div className="mt-2 text-center text-[11px] bg-yellow-500/20 text-yellow-300 py-1.5 px-2 rounded animate-pulse">
          {bench.find(p => p.id === selectedPlayer)
            ? 'Toca un jugador en cancha para sustituirlo'
            : 'Toca un suplente para que entre'
          }
        </div>
      )}

      {/* Hint for player details */}
      <div className="mt-1 text-center text-[9px] text-[var(--color-text-secondary)]">
        Mantene presionado para ver detalles del jugador
      </div>

      {/* Player Detail Modal */}
      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          isOwnTeam={isOwnTeam}
          onClose={() => setDetailPlayer(null)}
        />
      )}
    </div>
  );
}
