/**
 * LiveMatchdayPanel - Shows all matchday fixtures during live match
 *
 * Displays all matches from the current matchday with live scores,
 * updating as the simulation progresses.
 */

import { useGame } from '../../contexts/GameContext';
import type { Fixture } from '../../game/data/GenesisLoader';

interface LiveMatchdayPanelProps {
  currentMinute: number;
  userMatchHomeId: string;
  userMatchAwayId: string;
  userHomeScore: number;
  userAwayScore: number;
}

// Realistic goal timing based on football statistics
// Goals are more likely at certain times (end of halves, fatigue periods)
const GOAL_PROBABILITY_BY_PERIOD = [
  { minStart: 1, minEnd: 10, prob: 0.06 },    // Low - settling in
  { minStart: 11, minEnd: 20, prob: 0.10 },   // Building
  { minStart: 21, minEnd: 30, prob: 0.12 },   // Normal
  { minStart: 31, minEnd: 40, prob: 0.13 },   // Pressing before half
  { minStart: 41, minEnd: 45, prob: 0.18 },   // End of first half peak
  { minStart: 46, minEnd: 55, prob: 0.08 },   // Second half start
  { minStart: 56, minEnd: 65, prob: 0.11 },   // Subs coming in
  { minStart: 66, minEnd: 75, prob: 0.13 },   // Opening up
  { minStart: 76, minEnd: 85, prob: 0.15 },   // Fatigue
  { minStart: 86, minEnd: 90, prob: 0.20 },   // Desperate push
];

// Simulated scores for other matches (deterministic based on minute, realistic distribution)
function getSimulatedScore(fixture: Fixture, minute: number, homeRep: number, awayRep: number): { home: number; away: number } {
  // Use fixture id as seed for consistency
  const seed = fixture.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Calculate base probability modifier based on reputation difference
  const totalRep = homeRep + awayRep;
  const homeAdvantage = 0.08;
  const homeBaseChance = (homeRep / totalRep) + homeAdvantage;
  const awayBaseChance = 1 - homeBaseChance;

  let homeGoals = 0;
  let awayGoals = 0;

  // Check each minute up to current minute for potential goals
  // Using deterministic random based on seed + minute
  for (let m = 1; m <= Math.min(minute, 90); m++) {
    // Find the goal probability for this minute
    const period = GOAL_PROBABILITY_BY_PERIOD.find(p => m >= p.minStart && m <= p.minEnd);
    const baseProbability = period ? period.prob : 0.10;

    // Generate deterministic "random" value for this minute
    const minuteSeed = (seed * 31 + m * 17) % 1000;
    const roll = minuteSeed / 1000;

    // Adjust probability based on team quality (better teams score more)
    const qualityMod = Math.max(homeRep, awayRep) / 70;
    const adjustedProb = baseProbability * qualityMod * 0.6; // Scale down to get realistic totals

    if (roll < adjustedProb) {
      // Goal scored! Who scored?
      const scorerRoll = ((seed * 13 + m * 23) % 1000) / 1000;

      // Trailing team more likely to score (pressing)
      let homeChance = homeBaseChance;
      if (homeGoals < awayGoals) homeChance += 0.1;
      if (homeGoals > awayGoals) homeChance -= 0.08;

      if (scorerRoll < homeChance) {
        homeGoals++;
      } else {
        awayGoals++;
      }
    }
  }

  return { home: homeGoals, away: awayGoals };
}

export function LiveMatchdayPanel({
  currentMinute,
  userMatchHomeId,
  userMatchAwayId,
  userHomeScore,
  userAwayScore,
}: LiveMatchdayPanelProps) {
  const { currentSave, fixtures, getClub, getUserClub } = useGame();

  const userClub = getUserClub();

  if (!currentSave || !fixtures || !userClub) {
    return null;
  }

  // Get user's league
  const userLeague = currentSave.competitions.find(
    c => c.type === 'LEAGUE' && c.teamIds.includes(userClub.id)
  );

  if (!userLeague) return null;

  // Get all leagues from user's country
  const userCountry = userClub.country;
  const countryLeagues = currentSave.competitions
    .filter(c => c.type === 'LEAGUE' && c.country === userCountry)
    .sort((a, b) => (a.tier || 1) - (b.tier || 1));

  // Get current matchday fixtures for each league
  const leagueFixtures = countryLeagues.map(league => {
    const leagueFixs = fixtures[league.id] || [];
    const nextMatchday = leagueFixs.find(f => f.status === 'SCHEDULED')?.matchday || 1;
    const matchdayFixtures = leagueFixs.filter(f => f.matchday === nextMatchday);

    return {
      league,
      fixtures: matchdayFixtures,
    };
  }).filter(l => l.fixtures.length > 0);

  return (
    <div className="live-matchday-panel h-full overflow-y-auto bg-[var(--color-bg-card)] border-r border-[var(--color-border)]">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--color-bg-tertiary)] px-2 py-1.5 border-b border-[var(--color-border)]">
        <div className="text-xs font-semibold text-[var(--color-accent-yellow)]">
          Jornada en Vivo
        </div>
        <div className="text-[10px] text-[var(--color-text-secondary)]">
          Min {currentMinute}'
        </div>
      </div>

      {/* Leagues */}
      {leagueFixtures.map(({ league, fixtures: matchdayFixtures }) => (
        <div key={league.id} className="border-b border-[var(--color-border)]">
          {/* League header */}
          <div className="px-2 py-1 bg-[var(--color-bg-tertiary)]/50 text-[10px] font-semibold text-[var(--color-text-secondary)]">
            {league.shortName}
          </div>

          {/* Fixtures */}
          <div className="divide-y divide-[var(--color-border)]/50">
            {matchdayFixtures.map(fixture => {
              const homeClub = getClub(fixture.homeClubId);
              const awayClub = getClub(fixture.awayClubId);
              const isUserMatch =
                (fixture.homeClubId === userMatchHomeId && fixture.awayClubId === userMatchAwayId) ||
                (fixture.homeClubId === userMatchAwayId && fixture.awayClubId === userMatchHomeId);

              // Get score - real for user match, simulated for others
              let homeScore: number;
              let awayScore: number;

              if (isUserMatch) {
                // Use actual user match score
                if (fixture.homeClubId === userMatchHomeId) {
                  homeScore = userHomeScore;
                  awayScore = userAwayScore;
                } else {
                  homeScore = userAwayScore;
                  awayScore = userHomeScore;
                }
              } else {
                // Simulate score for other matches
                const simulated = getSimulatedScore(
                  fixture,
                  currentMinute,
                  homeClub?.reputation || 50,
                  awayClub?.reputation || 50
                );
                homeScore = simulated.home;
                awayScore = simulated.away;
              }

              return (
                <div
                  key={fixture.id}
                  className={`px-2 py-1 flex items-center text-[11px] ${
                    isUserMatch ? 'bg-[var(--color-accent-green)]/20' : ''
                  }`}
                >
                  {/* Home team */}
                  <div className={`flex-1 text-right truncate ${
                    isUserMatch && fixture.homeClubId === userClub.id ? 'font-bold text-[var(--color-accent-green)]' : ''
                  }`}>
                    {homeClub?.shortCode || '???'}
                  </div>

                  {/* Score */}
                  <div className="w-10 text-center font-mono font-bold">
                    {homeScore} - {awayScore}
                  </div>

                  {/* Away team */}
                  <div className={`flex-1 text-left truncate ${
                    isUserMatch && fixture.awayClubId === userClub.id ? 'font-bold text-[var(--color-accent-green)]' : ''
                  }`}>
                    {awayClub?.shortCode || '???'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
