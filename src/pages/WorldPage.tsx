/**
 * WorldPage - Explorar el mundo del fútbol
 *
 * Features:
 * - Navegación por países y competencias
 * - Vista de clasificaciones con nombres completos
 * - Mercado de fichajes (cuando está abierto)
 * - Exploración de jugadores de otras ligas
 */

import { useState, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { PositionBadge } from '../components/ui/PositionBadge';
import { FormArrow } from '../components/ui/FormArrow';
import { PlayerDetailModal } from '../components/ui/PlayerDetailModal';
import { TransferOfferModal } from '../components/ui/TransferOfferModal';
import { getClubColors } from '../game/data/clubColors';
import type { IPlayer, IClub, ICompetition } from '../game/types';

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

type ViewMode = 'competitions' | 'standings' | 'players' | 'market';

// Country flags (simplified)
const COUNTRY_FLAGS: Record<string, string> = {
  'Argentina': '🇦🇷',
  'Spain': '🇪🇸',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Italy': '🇮🇹',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Brazil': '🇧🇷',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Mexico': '🇲🇽',
  'USA': '🇺🇸',
};

export function WorldPage() {
  const { currentSave, getUserClub, makeTransferOffer } = useGame();
  const [viewMode, setViewMode] = useState<ViewMode>('competitions');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<ICompetition | null>(null);
  const [selectedClub, setSelectedClub] = useState<IClub | null>(null);
  const [detailPlayer, setDetailPlayer] = useState<IPlayer | null>(null);
  const [offerPlayer, setOfferPlayer] = useState<IPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const userClub = getUserClub();

  // Get unique countries from competitions
  const countries = useMemo(() => {
    if (!currentSave) return [];
    const countrySet = new Set<string>();
    currentSave.competitions.forEach(c => {
      if (c.country) countrySet.add(c.country);
    });
    return Array.from(countrySet).sort();
  }, [currentSave]);

  // Get competitions for selected country
  const competitionsInCountry = useMemo(() => {
    if (!currentSave || !selectedCountry) return [];
    return currentSave.competitions.filter(c => c.country === selectedCountry);
  }, [currentSave, selectedCountry]);

  // Get standings for selected competition
  const standings = useMemo(() => {
    if (!selectedCompetition) return [];
    return [...(selectedCompetition.standings || [])].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    });
  }, [selectedCompetition]);

  // Get players for selected club or market
  const displayPlayers = useMemo(() => {
    if (!currentSave) return [];

    if (selectedClub) {
      return currentSave.players
        .filter(p => p.clubId === selectedClub.id)
        .sort((a, b) => b.skillBase - a.skillBase);
    }

    if (viewMode === 'market' && userClub) {
      // Show players available for transfer
      return currentSave.players
        .filter(p => {
          if (p.clubId === userClub.id) return false;
          if (p.transferStatus === 'LISTED' || p.transferStatus === 'LOAN_LISTED') return true;
          if (p.releaseClause && p.releaseClause <= userClub.budget * 1.5) return true;
          return false;
        })
        .sort((a, b) => b.skillBase - a.skillBase)
        .slice(0, 50);
    }

    return [];
  }, [currentSave, selectedClub, viewMode, userClub]);

  // Search players
  const searchResults = useMemo(() => {
    if (!currentSave || !searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return currentSave.players
      .filter(p => p.name.toLowerCase().includes(term))
      .sort((a, b) => b.skillBase - a.skillBase)
      .slice(0, 20);
  }, [currentSave, searchTerm]);

  if (!currentSave || !userClub) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-text-secondary)]">Sin partida activa</div>
      </div>
    );
  }

  // Check if transfer window is open
  // Summer window: July 1 - August 31
  // Winter window: January 1 - January 31
  const isTransferWindowOpen = useMemo(() => {
    if (!currentSave?.gameDate) return false;
    const date = new Date(currentSave.gameDate);
    const month = date.getMonth(); // 0-indexed
    // July (6), August (7), January (0)
    return month === 6 || month === 7 || month === 0;
  }, [currentSave?.gameDate]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] pb-20">
      {/* Header */}
      <header className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-xl font-bold">Explorar</h1>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {isTransferWindowOpen ? (
                <span className="text-[var(--color-accent-green)]">Mercado abierto</span>
              ) : (
                <span className="text-[var(--color-accent-red)]">Mercado cerrado</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-text-secondary)]">Tu presupuesto</div>
            <div className="text-sm font-mono font-bold text-[var(--color-accent-green)]">
              {formatCurrency(userClub.budget || 0)}
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1 bg-[var(--color-bg-tertiary)] p-1 rounded-lg">
          <button
            onClick={() => {
              setViewMode('competitions');
              setSelectedCountry(null);
              setSelectedCompetition(null);
              setSelectedClub(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'competitions'
                ? 'bg-[var(--color-accent-green)] text-black'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Ligas
          </button>
          <button
            onClick={() => {
              setViewMode('market');
              setSelectedCountry(null);
              setSelectedCompetition(null);
              setSelectedClub(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'market'
                ? 'bg-[var(--color-accent-green)] text-black'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Fichajes
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] rounded-lg text-sm border border-[var(--color-border)] focus:border-[var(--color-accent-green)] focus:outline-none"
        />
      </div>

      {/* Search Results */}
      {searchTerm.length >= 2 && searchResults.length > 0 && (
        <div className="px-4 py-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-secondary)] mb-2">
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((player) => {
              const club = currentSave.clubs.find(c => c.id === player.clubId);
              return (
                <div
                  key={player.id}
                  onClick={() => {
                    setDetailPlayer(player);
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-3 p-2 bg-[var(--color-bg-card)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-hover)]"
                >
                  <PositionBadge position={player.positionMain} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{player.name}</div>
                    <div className="text-[10px] text-[var(--color-text-secondary)]">
                      {club?.name || 'Agente libre'} · {player.age} años
                    </div>
                  </div>
                  <div className="text-sm font-mono font-bold">{player.skillBase}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Competitions View - Country Selection */}
        {viewMode === 'competitions' && !selectedCountry && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Selecciona un país</h2>
            <div className="grid grid-cols-2 gap-3">
              {countries.map((country) => {
                const flag = COUNTRY_FLAGS[country] || '🏳️';
                const comps = currentSave.competitions.filter(c => c.country === country);
                return (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className="flex items-center gap-3 p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent-green)]/50 transition-colors text-left"
                  >
                    <span className="text-2xl">{flag}</span>
                    <div>
                      <div className="font-medium">{country}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {comps.length} competencia{comps.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Competitions View - Competition Selection */}
        {viewMode === 'competitions' && selectedCountry && !selectedCompetition && (
          <div>
            <button
              onClick={() => setSelectedCountry(null)}
              className="flex items-center gap-2 text-sm text-[var(--color-accent-green)] mb-4"
            >
              ← Volver a países
            </button>
            <h2 className="text-lg font-bold mb-3">
              {COUNTRY_FLAGS[selectedCountry] || '🏳️'} {selectedCountry}
            </h2>
            <div className="space-y-2">
              {competitionsInCountry.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompetition(comp)}
                  className="w-full flex items-center justify-between p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent-green)]/50 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium">{comp.name}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {comp.teamIds?.length || 0} equipos · División {comp.tier}
                    </div>
                  </div>
                  <span className="text-[var(--color-text-secondary)]">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standings View */}
        {viewMode === 'competitions' && selectedCompetition && !selectedClub && (
          <div>
            <button
              onClick={() => setSelectedCompetition(null)}
              className="flex items-center gap-2 text-sm text-[var(--color-accent-green)] mb-4"
            >
              ← Volver a competencias
            </button>
            <h2 className="text-lg font-bold mb-1">{selectedCompetition.name}</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              {COUNTRY_FLAGS[selectedCompetition.country || ''] || ''} {selectedCompetition.country}
            </p>

            {/* Standings Table */}
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_repeat(4,2rem)_2.5rem] gap-1 px-3 py-2 bg-[var(--color-bg-tertiary)] text-[10px] text-[var(--color-text-secondary)] font-semibold">
                <div className="w-5">#</div>
                <div>Equipo</div>
                <div className="text-center">PJ</div>
                <div className="text-center">G</div>
                <div className="text-center">E</div>
                <div className="text-center">P</div>
                <div className="text-center">Pts</div>
              </div>

              {/* Rows */}
              {standings.map((entry, index) => {
                const club = currentSave.clubs.find(c => c.id === entry.clubId);
                const isUserClub = entry.clubId === userClub.id;
                const clubColors = club ? getClubColors(club.id, club.shortCode) : null;

                return (
                  <div
                    key={entry.clubId}
                    onClick={() => club && setSelectedClub(club)}
                    className={`
                      grid grid-cols-[auto_1fr_repeat(4,2rem)_2.5rem] gap-1 px-3 py-2.5 items-center cursor-pointer
                      border-t border-[var(--color-border)]
                      ${isUserClub ? 'bg-[var(--color-accent-green)]/10' : 'hover:bg-[var(--color-bg-hover)]'}
                    `}
                  >
                    <div className={`w-5 text-xs font-bold ${
                      index < 4 ? 'text-[var(--color-accent-green)]' :
                      index >= standings.length - 3 ? 'text-[var(--color-accent-red)]' :
                      'text-[var(--color-text-secondary)]'
                    }`}>
                      {index + 1}
                    </div>
                    <div className={`flex items-center gap-2 text-sm truncate ${isUserClub ? 'font-bold text-[var(--color-accent-green)]' : ''}`}>
                      {clubColors && (
                        <div
                          className="w-3 h-3 rounded-full border flex-shrink-0"
                          style={{
                            backgroundColor: clubColors.primary,
                            borderColor: clubColors.secondary,
                          }}
                        />
                      )}
                      <span className="truncate">{club?.name || 'Desconocido'}</span>
                    </div>
                    <div className="text-xs text-center text-[var(--color-text-secondary)]">{entry.played}</div>
                    <div className="text-xs text-center text-green-400">{entry.won}</div>
                    <div className="text-xs text-center text-yellow-400">{entry.drawn}</div>
                    <div className="text-xs text-center text-red-400">{entry.lost}</div>
                    <div className="text-sm text-center font-bold">{entry.points}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Club View - Players */}
        {selectedClub && (
          <div>
            <button
              onClick={() => setSelectedClub(null)}
              className="flex items-center gap-2 text-sm text-[var(--color-accent-green)] mb-4"
            >
              ← Volver a clasificación
            </button>

            {/* Club Header */}
            {(() => {
              const colors = getClubColors(selectedClub.id, selectedClub.shortCode);
              return (
                <div
                  className="rounded-xl border p-4 mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}15)`,
                    borderColor: colors.primary + '50',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2"
                      style={{
                        backgroundColor: colors.primary,
                        borderColor: colors.secondary,
                        color: colors.text,
                      }}
                    >
                      {selectedClub.shortCode}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedClub.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                        <span>{COUNTRY_FLAGS[selectedClub.country] || '🏳️'} {selectedClub.country}</span>
                        <span>Rep: {selectedClub.reputation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Players List */}
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              Plantilla ({displayPlayers.length})
            </h3>
            <div className="space-y-2">
              {displayPlayers.map((player) => {
                const canAfford = player.marketValue <= userClub.budget;
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]"
                  >
                    <PositionBadge position={player.positionMain} />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setDetailPlayer(player)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{player.name}</span>
                        <FormArrow condition={player.conditionArrow} size="sm" />
                        {player.transferStatus === 'LISTED' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-bold">VENTA</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                        <span>{player.age} años</span>
                        <span className={canAfford ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-accent-red)]'}>
                          {formatCurrency(player.marketValue)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold">{player.skillBase}</div>
                    </div>
                    {isTransferWindowOpen && selectedClub.id !== userClub.id && (
                      <button
                        onClick={() => setOfferPlayer(player)}
                        className="px-3 py-1.5 text-xs font-bold bg-[var(--color-accent-green)] text-black rounded-lg"
                      >
                        Ofertar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Market View */}
        {viewMode === 'market' && !selectedClub && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
              Jugadores disponibles
            </h2>
            {!isTransferWindowOpen ? (
              <div className="text-center py-12 text-[var(--color-text-secondary)]">
                El mercado de fichajes está cerrado.
                <br />
                <span className="text-xs">Próxima apertura: Enero</span>
              </div>
            ) : (
              <div className="space-y-2">
                {displayPlayers.map((player) => {
                  const club = currentSave.clubs.find(c => c.id === player.clubId);
                  const canAfford = player.marketValue <= userClub.budget;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]"
                    >
                      <PositionBadge position={player.positionMain} />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setDetailPlayer(player)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{player.name}</span>
                          <FormArrow condition={player.conditionArrow} size="sm" />
                          {player.transferStatus === 'LISTED' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-bold">VENTA</span>
                          )}
                          {player.releaseClause && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-bold">CLÁUSULA</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span>{club?.shortCode || 'SIN'}</span>
                          <span>{player.age} años</span>
                          <span className={canAfford ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-accent-red)]'}>
                            {formatCurrency(player.marketValue)}
                          </span>
                          {player.releaseClause && (
                            <span className="text-cyan-400">
                              Cl: {formatCurrency(player.releaseClause)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right mr-2">
                        <div className="font-mono text-lg font-bold">{player.skillBase}</div>
                      </div>
                      <button
                        onClick={() => setOfferPlayer(player)}
                        className="px-3 py-1.5 text-xs font-bold bg-[var(--color-accent-green)] text-black rounded-lg"
                      >
                        Ofertar
                      </button>
                    </div>
                  );
                })}
                {displayPlayers.length === 0 && (
                  <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    No hay jugadores disponibles en este momento.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer}
          isOwnTeam={detailPlayer.clubId === userClub.id}
          isScouted={false}
          clubs={currentSave.clubs}
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
