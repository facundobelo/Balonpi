/**
 * ClubBadge Component
 * Displays a club's badge with their real colors
 */

import { getClubColors } from '../../game/data/clubColors';
import type { IClub, ClubColors } from '../../game/types';

interface ClubBadgeProps {
  club: IClub;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  variant?: 'circle' | 'shield' | 'square';
  className?: string;
}

const SIZE_MAP = {
  xs: { container: 'w-6 h-6', text: 'text-[8px]', name: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-[10px]', name: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-xs', name: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-sm', name: 'text-base' },
  xl: { container: 'w-20 h-20', text: 'text-lg', name: 'text-lg' },
};

export function ClubBadge({
  club,
  size = 'md',
  showName = false,
  variant = 'circle',
  className = '',
}: ClubBadgeProps) {
  const colors = club.colors || getClubColors(club.id, club.shortCode);
  const sizeStyles = SIZE_MAP[size];

  const getBorderRadius = () => {
    switch (variant) {
      case 'circle': return 'rounded-full';
      case 'shield': return 'rounded-t-full rounded-b-lg';
      case 'square': return 'rounded-lg';
      default: return 'rounded-full';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeStyles.container} ${getBorderRadius()} flex items-center justify-center font-bold border-2 shadow-md transition-transform hover:scale-105`}
        style={{
          backgroundColor: colors.primary,
          borderColor: colors.secondary,
          color: colors.text,
        }}
      >
        <span className={sizeStyles.text}>
          {club.shortCode.slice(0, 3)}
        </span>
      </div>
      {showName && (
        <span className={`font-semibold ${sizeStyles.name}`}>
          {club.name}
        </span>
      )}
    </div>
  );
}

/**
 * Inline club color indicator (small colored line/dot)
 */
interface ClubColorIndicatorProps {
  club: IClub;
  variant?: 'dot' | 'line' | 'bar';
}

export function ClubColorIndicator({ club, variant = 'line' }: ClubColorIndicatorProps) {
  const colors = club.colors || getClubColors(club.id, club.shortCode);

  if (variant === 'dot') {
    return (
      <div
        className="w-3 h-3 rounded-full border"
        style={{
          backgroundColor: colors.primary,
          borderColor: colors.secondary,
        }}
      />
    );
  }

  if (variant === 'bar') {
    return (
      <div className="w-1 h-full rounded-full" style={{ backgroundColor: colors.primary }} />
    );
  }

  // Default: line
  return (
    <div
      className="w-8 h-1 rounded-full"
      style={{
        background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})`,
      }}
    />
  );
}

/**
 * Club name with colored accent
 */
interface ClubNameProps {
  club: IClub;
  showCode?: boolean;
  className?: string;
}

export function ClubName({ club, showCode = false, className = '' }: ClubNameProps) {
  const colors = club.colors || getClubColors(club.id, club.shortCode);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="w-1 h-4 rounded-full"
        style={{ backgroundColor: colors.primary }}
      />
      <span className="font-semibold">
        {showCode ? club.shortCode : club.name}
      </span>
    </div>
  );
}

/**
 * Club header with gradient background
 */
interface ClubHeaderProps {
  club: IClub;
  children?: React.ReactNode;
  className?: string;
}

export function ClubHeader({ club, children, className = '' }: ClubHeaderProps) {
  const colors = club.colors || getClubColors(club.id, club.shortCode);

  return (
    <div
      className={`p-4 rounded-lg ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}20)`,
        borderLeft: `4px solid ${colors.primary}`,
      }}
    >
      {children}
    </div>
  );
}
