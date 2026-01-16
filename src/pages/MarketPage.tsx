import { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { PositionBadge, SkillBar, FormArrow } from '../components/ui';
import { PlayerDetailModal } from '../components/ui/PlayerDetailModal';
import { TransferOfferModal } from '../components/ui/TransferOfferModal';
import { TeamBrowserPage } from './TeamBrowserPage';
import type { Position, IPlayer } from '../game/types';

function formatValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

type SortOption = 'skill' | 'value' | 'age';
type AgeFilter = 'all' | 'young' | 'prime' | 'veteran';

export function MarketPage() {
  const { currentSave, getUserClub, makeTransferOffer } = useGame();
  const [filterPosition, setFilterPosition] = useState<Position | undefined>(undefined);
  const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeamBrowser, setShowTeamBrowser] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('skill');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [onlyListed, setOnlyListed] = useState(false);

  // Modal states
  const [detailPlayer, setDetailPlayer] = useState<IPlayer | null>(null);
  const [offerPlayer, setOfferPlayer] = useState<IPlayer | null>(null);

  const userClub = getUserClub();

  // Filter transfer targets from the save data
  const players = useMemo(() => {
    if (!currentSave || !userClub) return [];

    return currentSave.players.filter(player => {
      // Exclude own players
      if (player.clubId === userClub.id) return false;
      // Exclude national team players (no clubId or national team)
      const club = currentSave.clubs.find(c => c.id === player.clubId);
      if (!club || club.isNationalTeam) return false;
      // Position filter
      if (filterPosition && player.positionMain !== filterPosition) return false;
      // Budget filter
      if (maxBudget && player.marketValue > maxBudget) return false;
      // Min skill filter
      if (player.skillBase < 60) return false;
      // Search filter
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      // Age filter
      if (ageFilter === 'young' && player.age > 23) return false;
      if (ageFilter === 'prime' && (player.age < 24 || player.age > 29)) return false;
      if (ageFilter === 'veteran' && player.age < 30) return false;
      // Only listed filter
      if (onlyListed && player.transferStatus !== 'LISTED') return false;
      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'value': return b.marketValue - a.marketValue;
        case 'age': return a.age - b.age;
        default: return b.skillBase - a.skillBase;
      }
    });
  }, [currentSave, userClub, filterPosition, maxBudget, searchTerm, sortBy, ageFilter, onlyListed]);

  // Get talented young players (based on skill, not potential - since we can't see potential)
  const youngTalents = useMemo(() => {
    if (!currentSave || !userClub) return [];
    return currentSave.players
      .filter(p => p.age <= 21 && p.skillBase >= 70 && p.clubId !== userClub.id)
      .sort((a, b) => b.skillBase - a.skillBase)
      .slice(0, 5);
  }, [currentSave, userClub]);

  // Get players on sale
  const listedPlayers = useMemo(() => {
    if (!currentSave || !userClub) return [];
    return currentSave.players
      .filter(p => p.transferStatus === 'LISTED' && p.clubId !== userClub.id && p.skillBase >= 65)
      .sort((a, b) => b.skillBase - a.skillBase)
      .slice(0, 5);
  }, [currentSave, userClub]);

  if (!currentSave || !userClub) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-text-secondary)]">No active game</div>
      </div>
    );
  }

  const displayPlayers = players.slice(0, 30);

  // Show team browser overlay
  if (showTeamBrowser) {
    return (
      <TeamBrowserPage
        onClose={() => setShowTeamBrowser(false)}
      />
    );
  }

  return (
    <div className="p-4 pb-24">
      <header className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Mercado</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-[var(--color-text-secondary)] text-sm">
                Ventana: <span className="text-[var(--color-accent-green)]">Abierta</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">Presupuesto</div>
            <div className="text-lg font-mono font-bold text-[var(--color-accent-green)]">
              {formatValue(userClub.budget)}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setShowTeamBrowser(true)}
          className="p-3 bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-border)] rounded-lg border border-[var(--color-border)] flex items-center gap-2 hover:border-[var(--color-accent-green)] transition-colors"
        >
          <span className="text-xl">🏟️</span>
          <div className="text-left">
            <div className="font-semibold text-sm">Equipos</div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">Ver plantillas</div>
          </div>
        </button>
        <button
          onClick={() => setOnlyListed(!onlyListed)}
          className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
            onlyListed
              ? 'bg-[var(--color-accent-green)]/20 border-[var(--color-accent-green)]'
              : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] hover:border-[var(--color-accent-green)]'
          }`}
        >
          <span className="text-xl">🏷️</span>
          <div className="text-left">
            <div className="font-semibold text-sm">En Venta</div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">{listedPlayers.length} disponibles</div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar jugadores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--color-accent-green)] focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-4">
        {/* Position Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterPosition(undefined)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              !filterPosition
                ? 'bg-[var(--color-accent-green)] text-black'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
            }`}
          >
            Todas
          </button>
          {(['GK', 'DEF', 'MID', 'FWD'] as Position[]).map((pos) => (
            <button
              key={pos}
              onClick={() => setFilterPosition(pos)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filterPosition === pos
                  ? 'bg-[var(--color-accent-green)] text-black'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Age & Sort Row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* Age Filter */}
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
            className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="all">Todas las edades</option>
            <option value="young">Jovenes (-23)</option>
            <option value="prime">En forma (24-29)</option>
            <option value="veteran">Veteranos (30+)</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="skill">Por habilidad</option>
            <option value="value">Por valor</option>
            <option value="age">Por edad</option>
          </select>

          {/* Budget Filter */}
          <select
            value={maxBudget || ''}
            onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="">Sin limite</option>
            <option value="5000000">&lt; $5M</option>
            <option value="15000000">&lt; $15M</option>
            <option value="30000000">&lt; $30M</option>
            <option value="60000000">&lt; $60M</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-[var(--color-text-secondary)] mb-3">
        {players.length} jugadores encontrados
      </div>

      {/* Transfer List */}
      <div className="space-y-2">
        {displayPlayers.map((player) => {
          const playerClub = currentSave.clubs.find(c => c.id === player.clubId);
          const canAfford = userClub.budget >= player.marketValue;

          return (
            <div
              key={player.id}
              className="card p-3 cursor-pointer hover:border-[var(--color-accent-green)] transition-colors"
              onClick={() => setDetailPlayer(player)}
            >
              <div className="flex items-center gap-3">
                <PositionBadge position={player.positionMain} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{player.name}</span>
                    <FormArrow condition={player.conditionArrow} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span>{playerClub?.shortCode || 'Libre'}</span>
                    <span>{player.age} años</span>
                    <span className="font-mono font-bold">{player.skillBase}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm font-bold ${canAfford ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-accent-red)]'}`}>
                    {formatValue(player.marketValue)}
                  </div>
                  {player.releaseClause && (
                    <div className="text-[10px] text-[var(--color-accent-cyan)]">
                      Cláusula: {formatValue(player.releaseClause)}
                    </div>
                  )}
                </div>
              </div>

              {/* Skill Bar */}
              <div className="mt-2">
                <SkillBar value={player.skillBase} size="sm" />
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 mt-2 text-xs">
                {player.currentSeasonStats.goals > 0 && (
                  <span className="text-[var(--color-accent-green)]">
                    {player.currentSeasonStats.goals} goles
                  </span>
                )}
                {player.currentSeasonStats.assists > 0 && (
                  <span className="text-[var(--color-accent-cyan)]">
                    {player.currentSeasonStats.assists} asist
                  </span>
                )}
                {player.transferStatus === 'LISTED' && (
                  <span className="px-2 py-0.5 bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] rounded text-[10px] font-bold ml-auto">
                    EN VENTA
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOfferPlayer(player);
                  }}
                  className={`btn flex-1 text-sm py-2 min-h-0 ${
                    canAfford ? 'bg-[var(--color-accent-green)] text-black font-bold' : 'btn-ghost opacity-50'
                  }`}
                  disabled={!canAfford}
                >
                  {canAfford ? 'Ofertar' : 'Sin fondos'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailPlayer(player);
                  }}
                  className="btn btn-ghost text-sm py-2 min-h-0 px-4"
                >
                  Ver
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayPlayers.length === 0 && (
        <div className="card p-8 text-center text-[var(--color-text-secondary)]">
          No hay jugadores que coincidan con los criterios
        </div>
      )}

      {/* Young Talents Section */}
      {youngTalents.length > 0 && !searchTerm && !filterPosition && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 px-1">
            JOVENES TALENTOS (SUB-21)
          </h3>
          <div className="space-y-1">
            {youngTalents.map((player) => {
              const playerClub = currentSave.clubs.find(c => c.id === player.clubId);
              const canAfford = userClub.budget >= player.marketValue;
              return (
                <div
                  key={player.id}
                  onClick={() => setDetailPlayer(player)}
                  className="flex items-center gap-3 p-2 bg-[var(--color-bg-tertiary)] rounded-lg cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                >
                  <PositionBadge position={player.positionMain} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{player.name}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {playerClub?.shortCode} · {player.age} años · {player.skillBase} OVR
                    </div>
                  </div>
                  <div className={`font-mono text-sm ${canAfford ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-accent-red)]'}`}>
                    {formatValue(player.marketValue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          isOwnTeam={false}
          isScouted={false}
          clubs={currentSave?.clubs || []}
          onClose={() => setDetailPlayer(null)}
        />
      )}

      {/* Transfer Offer Modal */}
      {offerPlayer && (
        <TransferOfferModal
          player={offerPlayer}
          userBudget={userClub.budget}
          onMakeOffer={makeTransferOffer}
          onClose={() => setOfferPlayer(null)}
        />
      )}
    </div>
  );
}
