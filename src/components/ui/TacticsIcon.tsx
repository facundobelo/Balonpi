/**
 * TacticsIcon - Small pitch illustration with player circles
 * Used for the tactics button during matches
 */

interface TacticsIconProps {
  size?: number;
  className?: string;
}

export function TacticsIcon({ size = 24, className = '' }: TacticsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Pitch background */}
      <rect x="1" y="1" width="22" height="22" rx="2" fill="#2d5a27" />

      {/* Pitch lines */}
      <rect x="2" y="2" width="20" height="20" rx="1" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth="0.3" opacity="0.5" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />

      {/* Goal areas */}
      <rect x="8" y="2" width="8" height="3" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />
      <rect x="8" y="19" width="8" height="3" fill="none" stroke="white" strokeWidth="0.3" opacity="0.5" />

      {/* Player circles - Formation representation */}
      {/* GK */}
      <circle cx="12" cy="4" r="1.2" fill="#eab308" />

      {/* DEF */}
      <circle cx="5" cy="7" r="1.2" fill="#3b82f6" />
      <circle cx="9" cy="7" r="1.2" fill="#3b82f6" />
      <circle cx="15" cy="7" r="1.2" fill="#3b82f6" />
      <circle cx="19" cy="7" r="1.2" fill="#3b82f6" />

      {/* MID */}
      <circle cx="7" cy="12" r="1.2" fill="#22c55e" />
      <circle cx="12" cy="12" r="1.2" fill="#22c55e" />
      <circle cx="17" cy="12" r="1.2" fill="#22c55e" />

      {/* FWD */}
      <circle cx="6" cy="17" r="1.2" fill="#ef4444" />
      <circle cx="12" cy="18" r="1.2" fill="#ef4444" />
      <circle cx="18" cy="17" r="1.2" fill="#ef4444" />

      {/* Arrow indicating change */}
      <path d="M 20 15 L 22 12 L 20 9" stroke="white" strokeWidth="1" fill="none" opacity="0.8" />
    </svg>
  );
}
