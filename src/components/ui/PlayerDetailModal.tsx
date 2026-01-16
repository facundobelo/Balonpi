/**
 * PlayerDetailModal - Shows detailed player information
 *
 * Displays:
 * - Player name, age, nationality
 * - Position and skill (always visible)
 * - Market value
 * - Potential (only for own team or scouted)
 * - Mood/happiness indicator
 * - Transfer/loan status
 * - Season stats
 */

import { useState, useMemo } from 'react';
import type { IPlayer, IClub, TransferStatus, PlayerMood } from '../../game/types';
import { PositionBadge } from './PositionBadge';
import { getConsistentPlayerQuote } from '../../game/data/rivalries';

interface PlayerDetailModalProps {
  player: IPlayer;
  isOwnTeam: boolean;
  isScouted?: boolean;
  clubs?: IClub[];
  onClose: () => void;
  onTransferStatusChange?: (status: TransferStatus) => void;
}

// Get mood emoji
function getMoodEmoji(mood: PlayerMood | undefined): { emoji: string; label: string; color: string } {
  switch (mood) {
    case 'HAPPY':
      return { emoji: '😊', label: 'Feliz', color: 'text-green-400' };
    case 'UNHAPPY':
      return { emoji: '😠', label: 'Descontento', color: 'text-red-400' };
    case 'CONTENT':
    default:
      return { emoji: '😐', label: 'Normal', color: 'text-yellow-400' };
  }
}

// Get transfer status label - Only 3 states: Intransferible, Cedible, En Venta
function getTransferStatusLabel(status: TransferStatus): { label: string; color: string } {
  switch (status) {
    case 'LISTED':
      return { label: 'En Venta', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    case 'LOAN_LISTED':
      return { label: 'Cedible', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'UNTOUCHABLE':
    case 'AVAILABLE':
    default:
      return { label: 'Intransferible', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return `€${value}`;
}

// Get skill rating description
function getSkillRating(skill: number): { label: string; color: string } {
  if (skill >= 85) return { label: 'Elite', color: 'text-purple-400' };
  if (skill >= 75) return { label: 'Excelente', color: 'text-green-400' };
  if (skill >= 65) return { label: 'Bueno', color: 'text-blue-400' };
  if (skill >= 55) return { label: 'Regular', color: 'text-yellow-400' };
  if (skill >= 45) return { label: 'Limitado', color: 'text-orange-400' };
  return { label: 'Pobre', color: 'text-red-400' };
}

// Get potential gap indicator
function getPotentialGap(skill: number, potential: number): { label: string; color: string } | null {
  const gap = potential - skill;
  if (gap < 5) return null;
  if (gap >= 20) return { label: 'Enorme potencial', color: 'text-purple-400' };
  if (gap >= 15) return { label: 'Gran potencial', color: 'text-green-400' };
  if (gap >= 10) return { label: 'Buen potencial', color: 'text-blue-400' };
  return { label: 'Algo de potencial', color: 'text-yellow-400' };
}

// Calculate player mood based on various factors
function calculateMood(player: IPlayer): PlayerMood {
  // Simple mood calculation based on playing time and contract
  const stats = player.currentSeasonStats;
  const matchesPlayed = stats?.matches || 0;

  // Players who play regularly are happier
  if (matchesPlayed >= 15) return 'HAPPY';
  if (matchesPlayed >= 5) return 'CONTENT';

  // Young players with low skill are content to develop
  if (player.age < 22 && player.skillBase < 60) return 'CONTENT';

  // Experienced players not playing are unhappy
  if (player.age > 26 && matchesPlayed < 5) return 'UNHAPPY';

  return 'CONTENT';
}

export function PlayerDetailModal({
  player,
  isOwnTeam,
  isScouted = false,
  clubs = [],
  onClose,
  onTransferStatusChange,
}: PlayerDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<TransferStatus>(player.transferStatus);

  const canSeePotential = isOwnTeam || isScouted;
  const skillRating = getSkillRating(player.skillBase);
  const mood = calculateMood(player);
  const moodInfo = getMoodEmoji(mood);
  const transferInfo = getTransferStatusLabel(player.transferStatus);
  const potentialGap = canSeePotential ? getPotentialGap(player.skillBase, player.potential) : null;

  const stats = player.currentSeasonStats;

  // Get a consistent quote for this player
  const playerQuote = useMemo(() => {
    if (clubs.length === 0) return null;
    return getConsistentPlayerQuote(
      player.id,
      { age: player.age, skillBase: player.skillBase, clubId: player.clubId },
      clubs
    );
  }, [player.id, player.age, player.skillBase, player.clubId, clubs]);

  const handleStatusChange = (status: TransferStatus) => {
    setSelectedStatus(status);
    onTransferStatusChange?.(status);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient based on position */}
        <div className={`p-4 ${
          player.positionMain === 'GK' ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-600/10' :
          player.positionMain === 'DEF' ? 'bg-gradient-to-r from-blue-600/30 to-blue-600/10' :
          player.positionMain === 'MID' ? 'bg-gradient-to-r from-green-600/30 to-green-600/10' :
          'bg-gradient-to-r from-red-600/30 to-red-600/10'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-xl font-bold">{player.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <PositionBadge position={player.positionMain} />
                {player.positionAlt && player.positionAlt.length > 0 && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    +{player.positionAlt.join(', ')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-2xl text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {/* Basic info row */}
          <div className="flex items-center gap-3 mt-3 text-sm text-[var(--color-text-secondary)]">
            <span>{player.age} años</span>
            <span>·</span>
            <span>{player.nationality}</span>
          </div>

          {/* Player Quote */}
          {playerQuote && (
            <div className="mt-3 p-2 bg-black/20 rounded-lg border-l-2 border-[var(--color-accent-green)]/50">
              <p className="text-sm italic text-[var(--color-text-secondary)]">
                "{playerQuote}"
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Skill & Value */}
          <div className="grid grid-cols-2 gap-3">
            {/* Skill */}
            <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-3 text-center">
              <div className="text-4xl font-black font-mono">{player.skillBase}</div>
              <div className={`text-xs font-semibold ${skillRating.color}`}>{skillRating.label}</div>
              <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">HABILIDAD</div>
            </div>

            {/* Potential or Value */}
            {canSeePotential ? (
              <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-3 text-center">
                <div className="text-4xl font-black font-mono text-purple-400">{player.potential}</div>
                {potentialGap && (
                  <div className={`text-xs font-semibold ${potentialGap.color}`}>{potentialGap.label}</div>
                )}
                <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">POTENCIAL</div>
              </div>
            ) : (
              <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-3 text-center">
                <div className="text-lg font-bold">{formatCurrency(player.marketValue)}</div>
                <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">VALOR</div>
                <div className="text-[9px] text-[var(--color-text-secondary)] mt-2 italic">
                  Potencial: ???
                </div>
              </div>
            )}
          </div>

          {/* Market Value (if we showed potential) */}
          {canSeePotential && (
            <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Valor de Mercado</span>
              <span className="text-lg font-bold text-green-400">{formatCurrency(player.marketValue)}</span>
            </div>
          )}

          {/* Mood & Status */}
          <div className="grid grid-cols-2 gap-3">
            {/* Mood */}
            <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-3 flex items-center gap-3">
              <span className="text-3xl">{moodInfo.emoji}</span>
              <div>
                <div className={`font-semibold ${moodInfo.color}`}>{moodInfo.label}</div>
                <div className="text-[10px] text-[var(--color-text-secondary)]">ANIMO</div>
              </div>
            </div>

            {/* Transfer Status */}
            <div className={`rounded-xl p-3 border ${transferInfo.color}`}>
              <div className="font-semibold">{transferInfo.label}</div>
              <div className="text-[10px] opacity-70">ESTADO</div>
            </div>
          </div>

          {/* Season Stats */}
          {stats && (stats.matches > 0 || isOwnTeam) && (
            <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
                TEMPORADA ACTUAL
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{stats.matches}</div>
                  <div className="text-[9px] text-[var(--color-text-secondary)]">PJ</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-400">{stats.goals}</div>
                  <div className="text-[9px] text-[var(--color-text-secondary)]">GOL</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-400">{stats.assists}</div>
                  <div className="text-[9px] text-[var(--color-text-secondary)]">AST</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-400">
                    {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
                  </div>
                  <div className="text-[9px] text-[var(--color-text-secondary)]">NOTA</div>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Status Controls (only for own team) - 3 options: Intransferible, Cedible, En Venta */}
          {isOwnTeam && onTransferStatusChange && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">
                ESTADO DE FICHAJE
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['UNTOUCHABLE', 'LOAN_LISTED', 'LISTED'] as TransferStatus[]).map(status => {
                  const info = getTransferStatusLabel(status);
                  // Treat AVAILABLE same as UNTOUCHABLE for selection
                  const isSelected = selectedStatus === status ||
                    (status === 'UNTOUCHABLE' && selectedStatus === 'AVAILABLE');
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                        isSelected
                          ? info.color + ' ring-2 ring-white/30'
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-border)]'
                      }`}
                    >
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contract Info */}
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-2 border-t border-[var(--color-border)]">
            <span>Contrato hasta {new Date(player.contractExpiry).getFullYear()}</span>
            {isOwnTeam ? (
              <span>Salario: {formatCurrency(player.wage)}/sem</span>
            ) : player.releaseClause ? (
              <span className="text-[var(--color-accent-cyan)]">Cláusula: {formatCurrency(player.releaseClause)}</span>
            ) : (
              <span>Salario: ???</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
