import type { Position } from '../../game/types';

interface PositionBadgeProps {
  position: Position;
  fit?: 'NATURAL' | 'ALT' | 'ADJACENT' | 'INVALID';
  size?: 'xs' | 'sm' | 'md';
}

const positionColors: Record<Position, string> = {
  GK: 'bg-amber-600',
  DEF: 'bg-blue-600',
  MID: 'bg-green-600',
  FWD: 'bg-red-600',
};

const fitColors: Record<string, string> = {
  NATURAL: 'ring-[--color-pos-natural]',
  ALT: 'ring-[--color-pos-alt]',
  ADJACENT: 'ring-[--color-pos-adjacent]',
  INVALID: 'ring-[--color-pos-invalid]',
};

export function PositionBadge({ position, fit, size = 'md' }: PositionBadgeProps) {
  const sizeClasses = size === 'xs'
    ? 'text-[8px] px-1 py-0.5'
    : size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1';

  const ringClass = fit ? `ring-2 ${fitColors[fit]}` : '';

  return (
    <span
      className={`
        ${positionColors[position]}
        ${sizeClasses}
        ${ringClass}
        rounded font-bold text-white font-data
      `}
    >
      {position}
    </span>
  );
}
