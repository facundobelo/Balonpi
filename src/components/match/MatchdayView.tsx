/**
 * MatchdayView - Multi-division matchday display
 *
 * Shows all leagues/divisions simultaneously with live scores,
 * similar to the classic Cyberfoot interface.
 */

import { useGame } from '../../contexts/GameContext';
import type { Fixture } from '../../game/data/GenesisLoader';

interface MatchdayViewProps {
  onSelectFixture?: (fixture: Fixture) => void;
  selectedFixtureId?: string;
  compact?: boolean;
}

interface DivisionFixtures {
  competition: {
    id: string;
    name: string;
    shortName: string;
    tier: number;
  };
  fixtures: Fixture[];
  matchday: number;
}

export function MatchdayView({ onSelectFixture, selectedFixtureId, compact = false }: MatchdayViewProps) {
  const { currentSave, fixtures, getClub, getUserClub } = useGame();

  const userClub = getUserClub();

  if (!currentSave || !fixtures) {
    return (
      <div className="p-4 text-center text-[var(--color-text-secondary)]">
        No fixtures available
      </div>
    );
  }

  // Get user's country to filter divisions
  const userCountry = userClub?.country;

  // Get all competitions with their fixtures for the current matchday
  // ONLY show leagues from the user's country
  const divisionFixtures: DivisionFixtures[] = currentSave.competitions
    .filter(c => c.type === 'LEAGUE' && c.country === userCountry)
    .map(competition => {
      const compFixtures = fixtures[competition.id] || [];

      // Find the next matchday with scheduled fixtures
      const nextMatchday = compFixtures.find(f => f.status === 'SCHEDULED')?.matchday || 1;
      const matchdayFixtures = compFixtures.filter(f => f.matchday === nextMatchday);

      return {
        competition: {
          id: competition.id,
          name: competition.name,
          shortName: competition.shortName,
          tier: competition.tier || 1,
        },
        fixtures: matchdayFixtures,
        matchday: nextMatchday,
      };
    })
    .filter(d => d.fixtures.length > 0)
    .sort((a, b) => a.competition.tier - b.competition.tier);

  // Get the global matchday (from user's league)
  const userLeague = currentSave.competitions.find(
    c => c.type === 'LEAGUE' && c.teamIds.includes(userClub?.id || '')
  );
  const globalMatchday = divisionFixtures.find(
    d => d.competition.id === userLeague?.id
  )?.matchday || 1;

  return (
    <div className="matchday-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-accent-yellow)]">
            Jornada {globalMatchday}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {currentSave.gameDate}
          </p>
        </div>
      </div>

      {/* Divisions Grid - 2 columns on larger screens */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {divisionFixtures.map((division) => (
          <DivisionCard
            key={division.competition.id}
            division={division}
            userClubId={userClub?.id}
            getClub={getClub}
            onSelectFixture={onSelectFixture}
            selectedFixtureId={selectedFixtureId}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface DivisionCardProps {
  division: DivisionFixtures;
  userClubId?: string;
  getClub: (clubId: string) => any | null;
  onSelectFixture?: (fixture: Fixture) => void;
  selectedFixtureId?: string;
  compact?: boolean;
}

function DivisionCard({
  division,
  userClubId,
  getClub,
  onSelectFixture,
  selectedFixtureId,
  compact,
}: DivisionCardProps) {
  const isUserDivision = division.fixtures.some(
    f => f.homeClubId === userClubId || f.awayClubId === userClubId
  );

  return (
    <div
      className={`rounded-lg overflow-hidden ${
        isUserDivision
          ? 'border-2 border-[var(--color-accent-green)]'
          : 'border border-[var(--color-border)]'
      }`}
    >
      {/* Division Header */}
      <div
        className={`px-3 py-2 ${
          isUserDivision
            ? 'bg-[var(--color-accent-green)]/20'
            : 'bg-[var(--color-bg-tertiary)]'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-sm ${
            isUserDivision ? 'text-[var(--color-accent-green)]' : ''
          }`}>
            {division.competition.shortName}
          </span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            MD {division.matchday}
          </span>
        </div>
      </div>

      {/* Fixtures List */}
      <div className="bg-[var(--color-bg-card)]">
        {division.fixtures.map((fixture) => (
          <FixtureRow
            key={fixture.id}
            fixture={fixture}
            userClubId={userClubId}
            getClub={getClub}
            onSelect={onSelectFixture}
            isSelected={selectedFixtureId === fixture.id}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface FixtureRowProps {
  fixture: Fixture;
  userClubId?: string;
  getClub: (clubId: string) => any | null;
  onSelect?: (fixture: Fixture) => void;
  isSelected?: boolean;
  compact?: boolean;
}

function FixtureRow({
  fixture,
  userClubId,
  getClub,
  onSelect,
  isSelected,
  compact,
}: FixtureRowProps) {
  const homeClub = getClub(fixture.homeClubId);
  const awayClub = getClub(fixture.awayClubId);

  const isUserMatch = fixture.homeClubId === userClubId || fixture.awayClubId === userClubId;
  const isHomeUser = fixture.homeClubId === userClubId;
  const isAwayUser = fixture.awayClubId === userClubId;

  // Team colors for Cyberfoot-style display
  const getTeamBgColor = (isUser: boolean, isHome: boolean) => {
    if (isUser) return 'bg-[var(--color-accent-green)]';
    if (isHome) return 'bg-[var(--color-accent-blue)]';
    return 'bg-[var(--color-accent-red)]';
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(fixture);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center text-xs border-b border-[var(--color-border)] last:border-0
        ${isUserMatch ? 'bg-[var(--color-accent-green)]/10' : ''}
        ${isSelected ? 'ring-2 ring-[var(--color-accent-yellow)] ring-inset' : ''}
        ${onSelect ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]' : ''}
      `}
    >
      {/* Home Team */}
      <div className={`
        flex-1 py-1.5 px-2 text-right
        ${isHomeUser ? 'font-bold' : ''}
      `}>
        <span className={`
          inline-block px-2 py-0.5 rounded text-white text-[11px]
          ${getTeamBgColor(isHomeUser, true)}
        `}>
          {homeClub?.shortCode || fixture.homeClubId.slice(0, 3).toUpperCase()}
        </span>
      </div>

      {/* Score */}
      <div className="w-14 text-center py-1.5 font-mono">
        {fixture.status === 'FINISHED' ? (
          <span className="font-bold">
            {fixture.homeScore} - {fixture.awayScore}
          </span>
        ) : fixture.status === 'LIVE' ? (
          <span className="text-[var(--color-accent-yellow)] font-bold animate-pulse">
            {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
          </span>
        ) : (
          <span className="text-[var(--color-text-secondary)]">vs</span>
        )}
      </div>

      {/* Away Team */}
      <div className={`
        flex-1 py-1.5 px-2 text-left
        ${isAwayUser ? 'font-bold' : ''}
      `}>
        <span className={`
          inline-block px-2 py-0.5 rounded text-white text-[11px]
          ${getTeamBgColor(isAwayUser, false)}
        `}>
          {awayClub?.shortCode || fixture.awayClubId.slice(0, 3).toUpperCase()}
        </span>
      </div>

      {/* Last Event (if live or finished) - Only show on non-compact */}
      {!compact && fixture.status !== 'SCHEDULED' && (
        <div className="w-20 text-[10px] text-[var(--color-text-secondary)] pr-2 truncate">
          {/* Could show last goal scorer here */}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for sidebars
 */
export function MatchdaySidebar({
  onSelectFixture,
  selectedFixtureId
}: {
  onSelectFixture?: (fixture: Fixture) => void;
  selectedFixtureId?: string;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <MatchdayView
        onSelectFixture={onSelectFixture}
        selectedFixtureId={selectedFixtureId}
        compact={true}
      />
    </div>
  );
}
