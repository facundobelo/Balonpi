/**
 * TacticsPanel - Mid-match tactics adjustment panel
 *
 * Allows changing formation, tactics, and making substitutions
 * directly from the pitch view with drag-and-drop or tap.
 *
 * No separate tabs - everything integrated in one view.
 */

import { useState, useCallback, useRef } from 'react';
import type { IPlayer, Position, ConditionArrow } from '../../game/types';
import { PositionBadge } from '../ui/PositionBadge';
import { FormArrow } from '../ui/FormArrow';

interface TacticsPanelProps {
  lineup: IPlayer[];
  bench: IPlayer[];
  formation: string;
  tactic: 'DEFENSIVE' | 'BALANCED' | 'ATTACKING';
  subsRemaining: number;
  currentMinute: number;
  onFormationChange: (formation: string) => void;
  onTacticChange: (tactic: 'DEFENSIVE' | 'BALANCED' | 'ATTACKING') => void;
  onSubstitution: (outId: string, inId: string) => void;
  onClose: () => void;
}

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'];

// Formation position mappings (x, y as percentages)
const FORMATION_POSITIONS: Record<string, { pos: Position; x: number; y: number }[]> = {
  '4-3-3': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 25, y: 48 }, { pos: 'MID', x: 50, y: 45 }, { pos: 'MID', x: 75, y: 48 },
    { pos: 'FWD', x: 20, y: 72 }, { pos: 'FWD', x: 50, y: 76 }, { pos: 'FWD', x: 80, y: 72 },
  ],
  '4-4-2': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 15, y: 50 }, { pos: 'MID', x: 38, y: 47 }, { pos: 'MID', x: 62, y: 47 }, { pos: 'MID', x: 85, y: 50 },
    { pos: 'FWD', x: 35, y: 76 }, { pos: 'FWD', x: 65, y: 76 },
  ],
  '4-2-3-1': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 35, y: 42 }, { pos: 'MID', x: 65, y: 42 },
    { pos: 'MID', x: 20, y: 62 }, { pos: 'MID', x: 50, y: 58 }, { pos: 'MID', x: 80, y: 62 },
    { pos: 'FWD', x: 50, y: 80 },
  ],
  '3-5-2': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 25, y: 24 }, { pos: 'DEF', x: 50, y: 20 }, { pos: 'DEF', x: 75, y: 24 },
    { pos: 'MID', x: 10, y: 48 }, { pos: 'MID', x: 30, y: 44 }, { pos: 'MID', x: 50, y: 48 }, { pos: 'MID', x: 70, y: 44 }, { pos: 'MID', x: 90, y: 48 },
    { pos: 'FWD', x: 35, y: 76 }, { pos: 'FWD', x: 65, y: 76 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 10, y: 32 }, { pos: 'DEF', x: 30, y: 24 }, { pos: 'DEF', x: 50, y: 20 }, { pos: 'DEF', x: 70, y: 24 }, { pos: 'DEF', x: 90, y: 32 },
    { pos: 'MID', x: 25, y: 52 }, { pos: 'MID', x: 50, y: 48 }, { pos: 'MID', x: 75, y: 52 },
    { pos: 'FWD', x: 35, y: 76 }, { pos: 'FWD', x: 65, y: 76 },
  ],
  '4-1-4-1': [
    { pos: 'GK', x: 50, y: 8 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 22 }, { pos: 'DEF', x: 62, y: 22 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 50, y: 38 },
    { pos: 'MID', x: 15, y: 58 }, { pos: 'MID', x: 38, y: 54 }, { pos: 'MID', x: 62, y: 54 }, { pos: 'MID', x: 85, y: 58 },
    { pos: 'FWD', x: 50, y: 80 },
  ],
};

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

// Get position color
function getPositionColor(pos: Position): string {
  switch (pos) {
    case 'GK': return 'bg-amber-500';
    case 'DEF': return 'bg-blue-500';
    case 'MID': return 'bg-green-500';
    case 'FWD': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export function TacticsPanel({
  lineup,
  bench,
  formation,
  tactic,
  subsRemaining,
  currentMinute,
  onFormationChange,
  onTacticChange,
  onSubstitution,
  onClose,
}: TacticsPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<string | null>(null);

  const formationPositions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-3-3'];

  // Long press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // Handle pitch player click for substitution
  const handlePitchPlayerClick = useCallback((playerId: string) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (subsRemaining <= 0) return;

    if (selectedPlayer === playerId) {
      setSelectedPlayer(null);
    } else if (selectedPlayer && bench.find(p => p.id === selectedPlayer)) {
      // Bench player selected, now clicking pitch player = substitute
      onSubstitution(playerId, selectedPlayer);
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(playerId);
    }
  }, [selectedPlayer, bench, subsRemaining, onSubstitution]);

  // Handle bench player click
  const handleBenchPlayerClick = useCallback((playerId: string) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (subsRemaining <= 0) return;

    if (selectedPlayer === playerId) {
      setSelectedPlayer(null);
    } else if (selectedPlayer && lineup.find(p => p.id === selectedPlayer)) {
      // Pitch player selected, now clicking bench player = substitute
      onSubstitution(selectedPlayer, playerId);
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(playerId);
    }
  }, [selectedPlayer, lineup, subsRemaining, onSubstitution]);

  // Drag handlers
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

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Tacticas</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Min {currentMinute}' · Cambios: {subsRemaining}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-accent-green)] text-black font-bold rounded-lg"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Interactive Pitch */}
        <div className="relative h-72 w-full rounded-xl overflow-hidden mb-4">
          {/* Pitch background */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-700 to-green-600">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
              <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="0.3" opacity="0.5" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
              <rect x="32" y="2" width="36" height="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
              <rect x="32" y="86" width="36" height="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
            </svg>
          </div>

          {/* Players on pitch */}
          {lineup.slice(0, 11).map((player, index) => {
            const pos = formationPositions[index] || { pos: 'MID' as Position, x: 50, y: 50 };
            const isSelected = selectedPlayer === player.id;
            const isDragOver = dragOverPlayer === player.id;
            const canReceiveSub = selectedPlayer && bench.find(p => p.id === selectedPlayer);
            const effectiveSkill = getEffectiveSkill(player, pos.pos);

            return (
              <div
                key={player.id}
                onClick={() => handlePitchPlayerClick(player.id)}
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
                {/* Player circle with skill */}
                <div
                  className={`
                    w-10 h-10 text-xs
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

                {/* Player name + form arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 pointer-events-none flex items-center gap-0.5">
                  <span className="text-[9px] text-white font-medium whitespace-nowrap bg-black/60 px-1 rounded">
                    {player.name.split(' ').pop()?.slice(0, 7)}
                  </span>
                  <div className="bg-black/60 rounded px-0.5">
                    <FormArrow condition={player.conditionArrow} size="xs" />
                  </div>
                </div>

                {/* Substitution indicator */}
                {isSelected && subsRemaining > 0 && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
                    ↓
                  </div>
                )}
              </div>
            );
          })}

          {/* Formation label */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono">
            {formation}
          </div>
        </div>

        {/* Formation Selector - Horizontal scroll */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">FORMACION</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => onFormationChange(f)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                  formation === f
                    ? 'bg-[var(--color-accent-green)] text-black font-bold scale-105'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tactic Selector */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">TACTICA</div>
          <div className="grid grid-cols-3 gap-2">
            {(['DEFENSIVE', 'BALANCED', 'ATTACKING'] as const).map(t => (
              <button
                key={t}
                onClick={() => onTacticChange(t)}
                className={`py-3 px-2 rounded-lg text-sm transition-all ${
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

        {/* Bench - Draggable for substitutions */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
            SUPLENTES {subsRemaining > 0 ? '- Toca o arrastra para cambiar' : '- Sin cambios'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {bench.map((player) => {
              const isSelected = selectedPlayer === player.id;
              const canSubIn = selectedPlayer && lineup.find(p => p.id === selectedPlayer);

              return (
                <div
                  key={player.id}
                  draggable={subsRemaining > 0}
                  onClick={() => handleBenchPlayerClick(player.id)}
                  onDragStart={(e) => handleDragStart(e, player.id)}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg
                    cursor-pointer transition-all select-none
                    ${isSelected
                      ? 'bg-yellow-500/30 ring-2 ring-yellow-400'
                      : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)]'
                    }
                    ${canSubIn ? 'ring-2 ring-green-400' : ''}
                    ${subsRemaining <= 0 ? 'opacity-50' : ''}
                  `}
                >
                  <PositionBadge position={player.positionMain} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">
                        {player.name.split(' ').pop()?.slice(0, 10)}
                      </span>
                      <FormArrow condition={player.conditionArrow} size="xs" />
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold">{player.skillBase}</span>
                  {isSelected && subsRemaining > 0 && (
                    <span className="text-green-400 text-sm">↑</span>
                  )}
                </div>
              );
            })}
          </div>
          {bench.length === 0 && (
            <div className="text-center text-[var(--color-text-secondary)] text-sm py-4">
              Sin suplentes
            </div>
          )}
        </div>

        {/* Instructions */}
        {selectedPlayer && subsRemaining > 0 && (
          <div className="text-center text-[11px] bg-yellow-500/20 text-yellow-300 py-2 px-3 rounded-lg animate-pulse">
            {bench.find(p => p.id === selectedPlayer)
              ? 'Toca un jugador en cancha para sustituirlo'
              : 'Toca un suplente para que entre'
            }
          </div>
        )}
      </div>
    </div>
  );
}
