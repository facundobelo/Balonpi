import { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { PositionBadge, SkillBar, FormArrow } from '../components/ui';
import { PlayerDetailModal } from '../components/ui/PlayerDetailModal';
import { TransferOfferModal } from '../components/ui/TransferOfferModal';
import type { IPlayer } from '../game/types';

function formatValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

interface TeamBrowserProps {
  onClose: () => void;
  onMakeOffer?: (playerId: string) => void;
}

export function TeamBrowserPage({ onClose, onMakeOffer }: TeamBrowserProps) {
  const { currentSave, getUserClub, makeTransferOffer } = useGame();
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailPlayer, setDetailPlayer] = useState<IPlayer | null>(null);
  const [offerPlayer, setOfferPlayer] = useState<IPlayer | null>(null);

  const userClub = getUserClub();

  // Get all leagues
  const leagues = useMemo(() => {
    if (!currentSave) return [];
    return currentSave.competitions
      .filter(c => c.type === 'LEAGUE')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentSave]);

  // Get teams for selected league
  const teamsInLeague = useMemo(() => {
    if (!currentSave || !selectedLeague) return [];
    const league = leagues.find(l => l.id === selectedLeague);
    if (!league) return [];

    return currentSave.clubs
      .filter(c => league.teamIds.includes(c.id))
      .sort((a, b) => b.reputation - a.reputation);
  }, [currentSave, selectedLeague, leagues]);

  // Get squad for selected team
  const selectedSquad = useMemo(() => {
    if (!currentSave || !selectedTeam) return [];
    return currentSave.players
      .filter(p => p.clubId === selectedTeam)
      .sort((a, b) => {
        // Sort by position then skill
        const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
        const posA = posOrder[a.positionMain as keyof typeof posOrder] ?? 4;
        const posB = posOrder[b.positionMain as keyof typeof posOrder] ?? 4;
        if (posA !== posB) return posA - posB;
        return b.skillBase - a.skillBase;
      });
  }, [currentSave, selectedTeam]);

  // Search across all teams
  const searchResults = useMemo(() => {
    if (!currentSave || !searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();

    // Search teams
    const matchingTeams = currentSave.clubs
      .filter(c => !c.isNationalTeam && c.name.toLowerCase().includes(term))
      .slice(0, 10);

    return matchingTeams;
  }, [currentSave, searchTerm]);

  const selectedTeamData = currentSave?.clubs.find(c => c.id === selectedTeam);

  if (!currentSave || !userClub) {
    return (
      <div className="fixed inset-0 bg-[var(--color-bg-primary)] z-50 flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">No active game</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--color-bg-primary)] z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Team Browser</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {selectedTeamData ? selectedTeamData.name : 'Select a team to view squad'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="btn btn-ghost text-sm"
        >
          Close
        </button>
      </header>

      {/* Search */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.length >= 2) {
              setSelectedLeague(null);
              setSelectedTeam(null);
            }
          }}
          className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent-green)] focus:outline-none"
        />

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {searchResults.map(team => (
              <button
                key={team.id}
                onClick={() => {
                  setSelectedTeam(team.id);
                  setSearchTerm('');
                  // Find and set the league
                  const league = leagues.find(l => l.teamIds.includes(team.id));
                  if (league) setSelectedLeague(league.id);
                }}
                className="w-full text-left p-2 bg-[var(--color-bg-tertiary)] rounded hover:bg-[var(--color-border)] flex items-center justify-between"
              >
                <span className="text-sm">{team.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{team.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Leagues & Teams */}
        <div className="w-1/3 border-r border-[var(--color-border)] flex flex-col overflow-hidden">
          {/* Leagues */}
          <div className="p-2 border-b border-[var(--color-border)] max-h-[40%] overflow-y-auto">
            <div className="text-xs text-[var(--color-text-secondary)] px-2 py-1 font-semibold">LEAGUES</div>
            <div className="space-y-1">
              {leagues.map(league => (
                <button
                  key={league.id}
                  onClick={() => {
                    setSelectedLeague(league.id);
                    setSelectedTeam(null);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm truncate ${
                    selectedLeague === league.id
                      ? 'bg-[var(--color-accent-green)] text-black font-bold'
                      : 'hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {league.shortName} - {league.country}
                </button>
              ))}
            </div>
          </div>

          {/* Teams in League */}
          <div className="flex-1 p-2 overflow-y-auto">
            <div className="text-xs text-[var(--color-text-secondary)] px-2 py-1 font-semibold">
              TEAMS {teamsInLeague.length > 0 && `(${teamsInLeague.length})`}
            </div>
            {teamsInLeague.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
                Select a league
              </div>
            ) : (
              <div className="space-y-1">
                {teamsInLeague.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between ${
                      selectedTeam === team.id
                        ? 'bg-[var(--color-accent-cyan)] text-black font-bold'
                        : team.id === userClub.id
                        ? 'bg-[var(--color-accent-green)]/20 hover:bg-[var(--color-accent-green)]/30'
                        : 'hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    <span className="truncate">{team.shortCode}</span>
                    <span className={`text-xs ${
                      selectedTeam === team.id ? 'text-black/70' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {team.reputation}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Squad */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedTeam ? (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
              <div className="text-center">
                <div className="text-4xl mb-2">⚽</div>
                <p>Select a team to view their squad</p>
              </div>
            </div>
          ) : (
            <>
              {/* Team Info Header */}
              <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">{selectedTeamData?.name}</h2>
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                      <span>{selectedTeamData?.country}</span>
                      <span>Rep: {selectedTeamData?.reputation}</span>
                      <span className="text-[var(--color-accent-green)]">
                        Budget: {formatValue(selectedTeamData?.budget || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{selectedSquad.length}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">Players</div>
                  </div>
                </div>
              </div>

              {/* Squad List */}
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {selectedSquad.map(player => {
                    const canAfford = (userClub.budget || userClub.balance || 0) >= player.marketValue;
                    const isOwnPlayer = player.clubId === userClub.id;

                    return (
                      <div
                        key={player.id}
                        onClick={() => setDetailPlayer(player)}
                        className="p-2 bg-[var(--color-bg-tertiary)] rounded flex items-center gap-3 cursor-pointer hover:bg-[var(--color-border)] active:scale-[0.99] transition-all"
                      >
                        <PositionBadge position={player.positionMain} size="sm" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {player.name}
                            </span>
                            <FormArrow condition={player.conditionArrow} size="sm" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                            <span>Age {player.age}</span>
                            <span className="font-mono">{player.skillBase} OVR</span>
                            {isOwnPlayer && <span>POT {player.potential}</span>}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-sm font-mono font-bold ${
                            canAfford ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-accent-red)]'
                          }`}>
                            {formatValue(player.marketValue)}
                          </div>
                          {isOwnPlayer ? (
                            <div className="text-xs text-[var(--color-text-secondary)]">
                              {formatValue(player.wage)}/s
                            </div>
                          ) : player.releaseClause ? (
                            <div className="text-[10px] text-[var(--color-accent-cyan)]">
                              Cláusula: {formatValue(player.releaseClause)}
                            </div>
                          ) : null}
                        </div>

                        {!isOwnPlayer && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOfferPlayer(player);
                            }}
                            disabled={!canAfford}
                            className={`btn text-xs py-1 px-2 min-h-0 ${
                              canAfford
                                ? 'bg-[var(--color-accent-green)] text-black'
                                : 'btn-ghost opacity-50'
                            }`}
                          >
                            Ofertar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Squad Stats Summary */}
                {selectedSquad.length > 0 && (
                  <div className="mt-4 p-3 bg-[var(--color-border)] rounded">
                    <div className="text-xs text-[var(--color-text-secondary)] mb-2">SQUAD OVERVIEW</div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="font-bold text-[var(--color-accent-green)]">
                          {selectedSquad.filter(p => p.positionMain === 'GK').length}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">GK</div>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--color-accent-blue)]">
                          {selectedSquad.filter(p => p.positionMain === 'DEF').length}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">DEF</div>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--color-accent-yellow)]">
                          {selectedSquad.filter(p => p.positionMain === 'MID').length}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">MID</div>
                      </div>
                      <div>
                        <div className="font-bold text-[var(--color-accent-red)]">
                          {selectedSquad.filter(p => p.positionMain === 'FWD').length}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">FWD</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[var(--color-bg-tertiary)] flex justify-between text-xs">
                      <span className="text-[var(--color-text-secondary)]">Avg Age</span>
                      <span className="font-mono">
                        {(selectedSquad.reduce((s, p) => s + p.age, 0) / selectedSquad.length).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[var(--color-text-secondary)]">Avg Skill</span>
                      <span className="font-mono">
                        {(selectedSquad.reduce((s, p) => s + p.skillBase, 0) / selectedSquad.length).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-[var(--color-text-secondary)]">Squad Value</span>
                      <span className="font-mono text-[var(--color-accent-yellow)]">
                        {formatValue(selectedSquad.reduce((s, p) => s + p.marketValue, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Player Detail Modal */}
      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          isOwnTeam={detailPlayer.clubId === userClub?.id}
          clubs={currentSave?.clubs || []}
          onClose={() => setDetailPlayer(null)}
        />
      )}

      {/* Transfer Offer Modal */}
      {offerPlayer && userClub && (
        <TransferOfferModal
          player={offerPlayer}
          userBudget={userClub.budget || userClub.balance || 0}
          onMakeOffer={makeTransferOffer}
          onClose={() => setOfferPlayer(null)}
        />
      )}
    </div>
  );
}
