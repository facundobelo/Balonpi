/**
 * PitchView - Football pitch visualization with player positions
 *
 * Shows players positioned on a football pitch based on formation.
 * Allows selecting/swapping players for lineup management.
 */

import type { IPlayer } from '../../game/types';

interface PitchPlayer {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  skill: number;
  shirtNumber?: number;
  // Grid position on pitch (0-100 for x/y)
  x: number;
  y: number;
}

interface PitchViewProps {
  players: PitchPlayer[];
  formation: string;
  onPlayerClick?: (playerId: string) => void;
  selectedPlayerId?: string | null;
  isUserTeam?: boolean;
  showNames?: boolean;
  compact?: boolean;
}

// Formation position mappings (x, y as percentages)
// Y: 0 = goal line, 100 = attack
const FORMATIONS: Record<string, { pos: string; x: number; y: number }[]> = {
  '4-3-3': [
    { pos: 'GK', x: 50, y: 5 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 20 }, { pos: 'DEF', x: 62, y: 20 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 25, y: 45 }, { pos: 'MID', x: 50, y: 40 }, { pos: 'MID', x: 75, y: 45 },
    { pos: 'FWD', x: 20, y: 70 }, { pos: 'FWD', x: 50, y: 75 }, { pos: 'FWD', x: 80, y: 70 },
  ],
  '4-4-2': [
    { pos: 'GK', x: 50, y: 5 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 20 }, { pos: 'DEF', x: 62, y: 20 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 15, y: 50 }, { pos: 'MID', x: 38, y: 45 }, { pos: 'MID', x: 62, y: 45 }, { pos: 'MID', x: 85, y: 50 },
    { pos: 'FWD', x: 35, y: 75 }, { pos: 'FWD', x: 65, y: 75 },
  ],
  '4-2-3-1': [
    { pos: 'GK', x: 50, y: 5 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 20 }, { pos: 'DEF', x: 62, y: 20 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 35, y: 40 }, { pos: 'MID', x: 65, y: 40 },
    { pos: 'MID', x: 20, y: 60 }, { pos: 'MID', x: 50, y: 55 }, { pos: 'MID', x: 80, y: 60 },
    { pos: 'FWD', x: 50, y: 80 },
  ],
  '3-5-2': [
    { pos: 'GK', x: 50, y: 5 },
    { pos: 'DEF', x: 25, y: 22 }, { pos: 'DEF', x: 50, y: 18 }, { pos: 'DEF', x: 75, y: 22 },
    { pos: 'MID', x: 10, y: 45 }, { pos: 'MID', x: 30, y: 40 }, { pos: 'MID', x: 50, y: 45 }, { pos: 'MID', x: 70, y: 40 }, { pos: 'MID', x: 90, y: 45 },
    { pos: 'FWD', x: 35, y: 75 }, { pos: 'FWD', x: 65, y: 75 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 50, y: 5 },
    { pos: 'DEF', x: 10, y: 30 }, { pos: 'DEF', x: 30, y: 22 }, { pos: 'DEF', x: 50, y: 18 }, { pos: 'DEF', x: 70, y: 22 }, { pos: 'DEF', x: 90, y: 30 },
    { pos: 'MID', x: 25, y: 50 }, { pos: 'MID', x: 50, y: 45 }, { pos: 'MID', x: 75, y: 50 },
    { pos: 'FWD', x: 35, y: 75 }, { pos: 'FWD', x: 65, y: 75 },
  ],
  '4-1-4-1': [
    { pos: 'GK', x: 50, y: 5 },
    { pos: 'DEF', x: 15, y: 25 }, { pos: 'DEF', x: 38, y: 20 }, { pos: 'DEF', x: 62, y: 20 }, { pos: 'DEF', x: 85, y: 25 },
    { pos: 'MID', x: 50, y: 35 },
    { pos: 'MID', x: 15, y: 55 }, { pos: 'MID', x: 38, y: 50 }, { pos: 'MID', x: 62, y: 50 }, { pos: 'MID', x: 85, y: 55 },
    { pos: 'FWD', x: 50, y: 80 },
  ],
};

// Get position color
function getPositionColor(pos: string): string {
  switch (pos) {
    case 'GK': return 'bg-[var(--color-accent-yellow)]';
    case 'DEF': return 'bg-[var(--color-accent-blue)]';
    case 'MID': return 'bg-[var(--color-accent-green)]';
    case 'FWD': return 'bg-[var(--color-accent-red)]';
    default: return 'bg-gray-500';
  }
}

export function PitchView({
  players,
  formation,
  onPlayerClick,
  selectedPlayerId,
  isUserTeam = true,
  showNames = true,
  compact = false,
}: PitchViewProps) {
  const formationPositions = FORMATIONS[formation] || FORMATIONS['4-3-3'];

  // Map players to positions
  const positionedPlayers = players.slice(0, 11).map((player, index) => {
    const formPos = formationPositions[index] || { x: 50, y: 50 };
    return {
      ...player,
      x: formPos.x,
      y: isUserTeam ? formPos.y : 100 - formPos.y, // Flip for opponent
    };
  });

  const pitchHeight = compact ? 'h-64' : 'h-96';

  return (
    <div className={`relative ${pitchHeight} w-full rounded-lg overflow-hidden`}>
      {/* Pitch background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-700 to-green-600">
        {/* Pitch markings */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Outer border */}
          <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />

          {/* Center line */}
          <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="0.3" opacity="0.6" />

          {/* Center circle */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <circle cx="50" cy="50" r="0.8" fill="white" opacity="0.6" />

          {/* Goal area (top) */}
          <rect x="30" y="2" width="40" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <rect x="38" y="2" width="24" height="4" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />

          {/* Goal area (bottom) */}
          <rect x="30" y="90" width="40" height="8" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <rect x="38" y="94" width="24" height="4" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />

          {/* Penalty arcs */}
          <path d="M 38 10 Q 50 18 62 10" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <path d="M 38 90 Q 50 82 62 90" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
        </svg>
      </div>

      {/* Players */}
      {positionedPlayers.map((player) => (
        <div
          key={player.id}
          onClick={() => onPlayerClick?.(player.id)}
          className={`
            absolute transform -translate-x-1/2 -translate-y-1/2
            ${onPlayerClick ? 'cursor-pointer hover:scale-110' : ''}
            ${selectedPlayerId === player.id ? 'scale-110 z-10' : ''}
            transition-transform duration-150
          `}
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
          }}
        >
          {/* Player dot */}
          <div
            className={`
              ${compact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}
              rounded-full flex items-center justify-center font-bold text-black
              ${getPositionColor(player.position)}
              ${selectedPlayerId === player.id ? 'ring-2 ring-white ring-offset-1 ring-offset-green-700' : ''}
              shadow-lg
            `}
          >
            {player.shirtNumber || player.skill}
          </div>

          {/* Player name */}
          {showNames && !compact && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-0.5">
              <span className="text-[9px] text-white font-medium whitespace-nowrap bg-black/40 px-1 rounded">
                {player.name.split(' ').pop()?.slice(0, 8)}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Formation label */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded font-mono">
        {formation}
      </div>
    </div>
  );
}

// Convert IPlayer to PitchPlayer
export function playerToPitchPlayer(player: IPlayer, index: number): PitchPlayer {
  return {
    id: player.id,
    name: player.name,
    position: player.positionMain,
    skill: player.skillBase,
    shirtNumber: index + 1,
    x: 50,
    y: 50,
  };
}

// Get suitable position index for a player in a formation
export function getFormationSlotForPlayer(
  player: IPlayer,
  formation: string,
  occupiedSlots: number[]
): number {
  const formationPositions = FORMATIONS[formation] || FORMATIONS['4-3-3'];

  // Find first matching position that isn't occupied
  for (let i = 0; i < formationPositions.length; i++) {
    if (occupiedSlots.includes(i)) continue;

    const slotPos = formationPositions[i].pos;
    if (slotPos === player.positionMain) {
      return i;
    }
  }

  // If no exact match, find any free slot
  for (let i = 0; i < formationPositions.length; i++) {
    if (!occupiedSlots.includes(i)) {
      return i;
    }
  }

  return -1;
}
