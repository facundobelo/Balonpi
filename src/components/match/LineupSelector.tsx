/**
 * LineupSelector - Complete lineup management system
 *
 * Allows selecting 11 starters from squad, arranging bench,
 * and visualizing the team on a pitch.
 */

import { useState, useMemo } from 'react';
import type { IPlayer } from '../../game/types';
import { PitchView, playerToPitchPlayer } from './PitchView';
import { PositionBadge } from '../ui/PositionBadge';

interface LineupSelectorProps {
  squad: IPlayer[];
  formation: string;
  onFormationChange: (formation: string) => void;
  selectedLineup: string[]; // Array of 11 player IDs
  onLineupChange: (lineup: string[]) => void;
  benchPlayers: string[]; // Array of bench player IDs
  onBenchChange: (bench: string[]) => void;
  currentDate?: string; // ISO date for availability checks
}

// Check if player is available (not injured or suspended)
function isPlayerAvailable(player: IPlayer, currentDate: string): boolean {
  if (player.injuredUntil && player.injuredUntil > currentDate) return false;
  if (player.suspendedUntil && player.suspendedUntil > currentDate) return false;
  return true;
}

// Get player availability status
function getPlayerStatus(player: IPlayer, currentDate: string): 'available' | 'injured' | 'suspended' {
  if (player.injuredUntil && player.injuredUntil > currentDate) return 'injured';
  if (player.suspendedUntil && player.suspendedUntil > currentDate) return 'suspended';
  return 'available';
}

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'];

// Formation requirements (how many of each position)
const FORMATION_REQUIREMENTS: Record<string, Record<string, number>> = {
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '4-1-4-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
};

type ViewMode = 'pitch' | 'list';

export function LineupSelector({
  squad,
  formation,
  onFormationChange,
  selectedLineup,
  onLineupChange,
  benchPlayers,
  onBenchChange,
  currentDate = '',
}: LineupSelectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('pitch');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [swapSource, setSwapSource] = useState<{ type: 'lineup' | 'bench' | 'reserve'; id: string } | null>(null);

  // Get players by category
  const startingPlayers = useMemo(() =>
    selectedLineup.map(id => squad.find(p => p.id === id)).filter(Boolean) as IPlayer[],
    [selectedLineup, squad]
  );

  const benchPlayerObjects = useMemo(() =>
    benchPlayers.map(id => squad.find(p => p.id === id)).filter(Boolean) as IPlayer[],
    [benchPlayers, squad]
  );

  const reservePlayers = useMemo(() =>
    squad.filter(p => !selectedLineup.includes(p.id) && !benchPlayers.includes(p.id)),
    [squad, selectedLineup, benchPlayers]
  );

  // Convert to pitch players for visualization
  const pitchPlayers = startingPlayers.map((p, i) => playerToPitchPlayer(p, i));

  // Handle player click (for swapping)
  const handlePlayerClick = (playerId: string, source: 'lineup' | 'bench' | 'reserve') => {
    if (swapSource === null) {
      // First click - select source
      setSwapSource({ type: source, id: playerId });
      setSelectedPlayerId(playerId);
    } else {
      // Second click - perform swap
      performSwap(swapSource.type, swapSource.id, source, playerId);
      setSwapSource(null);
      setSelectedPlayerId(null);
    }
  };

  // Cancel swap selection
  const cancelSwap = () => {
    setSwapSource(null);
    setSelectedPlayerId(null);
  };

  // Perform swap between two players
  const performSwap = (
    sourceType: 'lineup' | 'bench' | 'reserve',
    sourceId: string,
    targetType: 'lineup' | 'bench' | 'reserve',
    targetId: string
  ) => {
    // If same player, deselect
    if (sourceId === targetId) return;

    // Create new arrays
    let newLineup = [...selectedLineup];
    let newBench = [...benchPlayers];

    // Remove from source
    if (sourceType === 'lineup') {
      newLineup = newLineup.filter(id => id !== sourceId);
    } else if (sourceType === 'bench') {
      newBench = newBench.filter(id => id !== sourceId);
    }

    // Remove target from its location
    if (targetType === 'lineup') {
      newLineup = newLineup.filter(id => id !== targetId);
    } else if (targetType === 'bench') {
      newBench = newBench.filter(id => id !== targetId);
    }

    // Add source to target location
    if (targetType === 'lineup' && newLineup.length < 11) {
      const targetIndex = selectedLineup.indexOf(targetId);
      if (targetIndex >= 0) {
        newLineup.splice(targetIndex, 0, sourceId);
      } else {
        newLineup.push(sourceId);
      }
    } else if (targetType === 'bench') {
      const targetIndex = benchPlayers.indexOf(targetId);
      if (targetIndex >= 0) {
        newBench.splice(targetIndex, 0, sourceId);
      } else {
        newBench.push(sourceId);
      }
    }

    // Add target to source location
    if (sourceType === 'lineup' && newLineup.length < 11) {
      const sourceIndex = selectedLineup.indexOf(sourceId);
      if (sourceIndex >= 0) {
        newLineup.splice(sourceIndex, 0, targetId);
      } else {
        newLineup.push(targetId);
      }
    } else if (sourceType === 'bench') {
      const sourceIndex = benchPlayers.indexOf(sourceId);
      if (sourceIndex >= 0) {
        newBench.splice(sourceIndex, 0, targetId);
      } else {
        newBench.push(targetId);
      }
    }

    // Update state
    onLineupChange(newLineup.slice(0, 11));
    onBenchChange(newBench.slice(0, 7)); // Max 7 subs
  };

  // Quick add to lineup
  const addToLineup = (playerId: string) => {
    if (selectedLineup.length >= 11) return;
    if (selectedLineup.includes(playerId)) return;

    onLineupChange([...selectedLineup, playerId]);
    onBenchChange(benchPlayers.filter(id => id !== playerId));
  };

  // Quick add to bench
  const addToBench = (playerId: string) => {
    if (benchPlayers.length >= 7) return;
    if (benchPlayers.includes(playerId)) return;

    onBenchChange([...benchPlayers, playerId]);
    onLineupChange(selectedLineup.filter(id => id !== playerId));
  };

  // Remove from lineup/bench
  const removePlayer = (playerId: string) => {
    onLineupChange(selectedLineup.filter(id => id !== playerId));
    onBenchChange(benchPlayers.filter(id => id !== playerId));
  };

  // Auto-select best XI based on formation
  const autoSelectLineup = () => {
    const requirements = FORMATION_REQUIREMENTS[formation] || FORMATION_REQUIREMENTS['4-3-3'];
    const newLineup: string[] = [];
    const usedIds = new Set<string>();

    // Filter out injured/suspended players, then sort by skill
    const availableSquad = currentDate
      ? squad.filter(p => isPlayerAvailable(p, currentDate))
      : squad;
    const sortedSquad = [...availableSquad].sort((a, b) => b.skillBase - a.skillBase);

    // Fill each position requirement
    for (const [pos, count] of Object.entries(requirements)) {
      const available = sortedSquad.filter(p =>
        p.positionMain === pos && !usedIds.has(p.id)
      );

      for (let i = 0; i < count && i < available.length; i++) {
        newLineup.push(available[i].id);
        usedIds.add(available[i].id);
      }
    }

    // If we don't have 11, fill with best remaining
    const remaining = sortedSquad.filter(p => !usedIds.has(p.id));
    while (newLineup.length < 11 && remaining.length > 0) {
      const player = remaining.shift()!;
      newLineup.push(player.id);
      usedIds.add(player.id);
    }

    onLineupChange(newLineup);

    // Set best remaining as bench (up to 7)
    const benchCandidates = sortedSquad
      .filter(p => !usedIds.has(p.id))
      .slice(0, 7)
      .map(p => p.id);

    onBenchChange(benchCandidates);
  };

  // Calculate average skill
  const avgSkill = startingPlayers.length > 0
    ? Math.round(startingPlayers.reduce((sum, p) => sum + p.skillBase, 0) / startingPlayers.length)
    : 0;

  return (
    <div className="lineup-selector">
      {/* Header with formation selector */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Formacion:</span>
          <div className="flex gap-1">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => onFormationChange(f)}
                className={`px-2 py-1 text-xs font-mono rounded ${
                  formation === f
                    ? 'bg-[var(--color-accent-green)] text-black font-bold'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={autoSelectLineup}
            className="px-3 py-1 text-xs bg-[var(--color-accent-blue)] text-white rounded hover:bg-[var(--color-accent-blue)]/80"
          >
            Auto
          </button>
          <div className="flex gap-1 bg-[var(--color-bg-tertiary)] rounded p-0.5">
            <button
              onClick={() => setViewMode('pitch')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'pitch' ? 'bg-[var(--color-bg-card)]' : ''}`}
            >
              Cancha
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'list' ? 'bg-[var(--color-bg-card)]' : ''}`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* Swap instruction */}
      {swapSource && (
        <div className="mb-2 p-2 bg-[var(--color-accent-yellow)]/20 border border-[var(--color-accent-yellow)] rounded text-xs text-center">
          Selecciona otro jugador para intercambiar o{' '}
          <button onClick={cancelSwap} className="underline">cancelar</button>
        </div>
      )}

      {/* Pitch View */}
      {viewMode === 'pitch' && (
        <div className="mb-4">
          <PitchView
            players={pitchPlayers}
            formation={formation}
            onPlayerClick={(id) => handlePlayerClick(id, 'lineup')}
            selectedPlayerId={selectedPlayerId}
            showNames={true}
          />
          <div className="mt-2 flex justify-between text-xs text-[var(--color-text-secondary)]">
            <span>Titulares: {selectedLineup.length}/11</span>
            <span>Promedio: {avgSkill}</span>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="mb-4 space-y-1 max-h-48 overflow-y-auto">
          {startingPlayers.map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              index={index + 1}
              isSelected={selectedPlayerId === player.id}
              onClick={() => handlePlayerClick(player.id, 'lineup')}
              onRemove={() => removePlayer(player.id)}
            />
          ))}
          {selectedLineup.length < 11 && (
            <div className="text-center py-2 text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded">
              Faltan {11 - selectedLineup.length} jugadores
            </div>
          )}
        </div>
      )}

      {/* Bench Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Suplentes ({benchPlayers.length}/7)</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {benchPlayerObjects.map((player) => (
            <button
              key={player.id}
              onClick={() => handlePlayerClick(player.id, 'bench')}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-xs
                ${selectedPlayerId === player.id
                  ? 'bg-[var(--color-accent-yellow)]/30 ring-1 ring-[var(--color-accent-yellow)]'
                  : 'bg-[var(--color-bg-tertiary)]'
                }
              `}
            >
              <PositionBadge position={player.positionMain} size="xs" />
              <span className="truncate max-w-[80px]">{player.name.split(' ').pop()}</span>
              <span className="font-mono text-[var(--color-text-secondary)]">{player.skillBase}</span>
            </button>
          ))}
          {benchPlayers.length === 0 && (
            <span className="text-xs text-[var(--color-text-secondary)]">Sin suplentes</span>
          )}
        </div>
      </div>

      {/* Reserve Players */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Reservas ({reservePlayers.length})</span>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {reservePlayers.map((player) => {
            const status = currentDate ? getPlayerStatus(player, currentDate) : 'available';
            const isUnavailable = status !== 'available';

            return (
              <div
                key={player.id}
                onClick={() => !isUnavailable && handlePlayerClick(player.id, 'reserve')}
                className={`
                  flex items-center gap-2 p-2 rounded text-xs
                  ${isUnavailable
                    ? 'bg-[var(--color-bg-tertiary)]/50 opacity-60 cursor-not-allowed'
                    : selectedPlayerId === player.id
                    ? 'bg-[var(--color-accent-yellow)]/30 ring-1 ring-[var(--color-accent-yellow)] cursor-pointer'
                    : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] cursor-pointer'
                  }
                `}
              >
                <PositionBadge position={player.positionMain} size="xs" />
                <span className="flex-1 truncate">{player.name}</span>
                {status === 'injured' && (
                  <span className="px-1.5 py-0.5 bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)] rounded text-[10px] font-bold">
                    LES
                  </span>
                )}
                {status === 'suspended' && (
                  <span className="px-1.5 py-0.5 bg-[var(--color-accent-yellow)]/20 text-[var(--color-accent-yellow)] rounded text-[10px] font-bold">
                    SUS
                  </span>
                )}
                <span className="font-mono text-[var(--color-text-secondary)]">{player.skillBase}</span>
                {!isUnavailable && (
                  <div className="flex gap-1">
                    {selectedLineup.length < 11 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); addToLineup(player.id); }}
                        className="px-1.5 py-0.5 bg-[var(--color-accent-green)] text-black rounded text-[10px] font-bold"
                      >
                        XI
                      </button>
                    )}
                    {benchPlayers.length < 7 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); addToBench(player.id); }}
                        className="px-1.5 py-0.5 bg-[var(--color-accent-blue)] text-white rounded text-[10px]"
                      >
                        SUP
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Player row component
function PlayerRow({
  player,
  index,
  isSelected,
  onClick,
  onRemove,
}: {
  player: IPlayer;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 p-2 rounded cursor-pointer
        ${isSelected
          ? 'bg-[var(--color-accent-yellow)]/30 ring-1 ring-[var(--color-accent-yellow)]'
          : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)]'
        }
      `}
    >
      <span className="w-5 text-center font-mono text-xs text-[var(--color-text-secondary)]">
        {index}
      </span>
      <PositionBadge position={player.positionMain} size="sm" />
      <span className="flex-1 text-sm truncate">{player.name}</span>
      <span className="font-mono text-sm">{player.skillBase}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="px-2 py-0.5 text-xs text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/20 rounded"
      >
        X
      </button>
    </div>
  );
}
