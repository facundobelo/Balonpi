/**
 * TransferOfferModal - Modal for making transfer offers
 */

import { useState } from 'react';
import type { IPlayer } from '../../game/types';
import { PositionBadge } from './PositionBadge';
import { FormArrow } from './FormArrow';

interface TransferOfferModalProps {
  player: IPlayer;
  userBudget: number;
  onMakeOffer: (playerId: string, amount: number) => { success: boolean; message: string };
  onClose: () => void;
}

function formatValue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

export function TransferOfferModal({
  player,
  userBudget,
  onMakeOffer,
  onClose,
}: TransferOfferModalProps) {
  const [offerAmount, setOfferAmount] = useState(player.marketValue);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAfford = offerAmount <= userBudget;
  const offerRatio = offerAmount / player.marketValue;

  // Check if player has release clause and if we can afford it
  const hasReleaseClause = player.releaseClause !== null && player.releaseClause !== undefined;
  const canAffordClause = hasReleaseClause && (player.releaseClause as number) <= userBudget;
  const isUntouchable = player.transferStatus === 'UNTOUCHABLE';

  // Offer quality indicator
  const getOfferQuality = () => {
    if (isUntouchable && !hasReleaseClause) return { label: 'Imposible', color: 'text-red-400' };
    if (offerRatio >= 1.3) return { label: 'Muy generosa', color: 'text-green-400' };
    if (offerRatio >= 1.1) return { label: 'Buena', color: 'text-green-400' };
    if (offerRatio >= 0.9) return { label: 'Justa', color: 'text-yellow-400' };
    if (offerRatio >= 0.7) return { label: 'Baja', color: 'text-orange-400' };
    return { label: 'Muy baja', color: 'text-red-400' };
  };

  const quality = getOfferQuality();

  const handleSubmit = () => {
    if (!canAfford || isSubmitting) return;
    // Block if untouchable without release clause
    if (isUntouchable && !hasReleaseClause) return;

    setIsSubmitting(true);
    const response = onMakeOffer(player.id, offerAmount);
    setResult(response);
    setIsSubmitting(false);
  };

  const handlePayReleaseClause = () => {
    if (!canAffordClause || isSubmitting || !player.releaseClause) return;

    setIsSubmitting(true);
    const response = onMakeOffer(player.id, player.releaseClause);
    setResult(response);
    setIsSubmitting(false);
  };

  // Preset amounts
  const presets = [
    { label: '-20%', value: Math.round(player.marketValue * 0.8 / 100000) * 100000 },
    { label: 'Valor', value: player.marketValue },
    { label: '+20%', value: Math.round(player.marketValue * 1.2 / 100000) * 100000 },
    { label: '+50%', value: Math.round(player.marketValue * 1.5 / 100000) * 100000 },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <PositionBadge position={player.positionMain} size="md" />
            <div className="flex-1">
              <h2 className="font-bold text-lg">{player.name}</h2>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>{player.age} años</span>
                <span className="font-mono">{player.skillBase} OVR</span>
                <FormArrow condition={player.conditionArrow} size="sm" />
              </div>
            </div>
            {isUntouchable && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">
                INTRANSFERIBLE
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {result ? (
            // Result view
            <div className="text-center py-6">
              <div className={`text-4xl mb-3 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? '✓' : '✗'}
              </div>
              <p className={`text-lg font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-3 bg-[var(--color-accent-green)] text-black font-bold rounded-lg"
              >
                Cerrar
              </button>
            </div>
          ) : (
            // Offer form
            <>
              {/* Market Value */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-[var(--color-text-secondary)]">Valor de mercado:</span>
                <span className="font-mono font-bold text-[var(--color-accent-yellow)]">
                  {formatValue(player.marketValue)}
                </span>
              </div>

              {/* Release Clause */}
              {hasReleaseClause && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[var(--color-text-secondary)]">Cláusula de rescisión:</span>
                  <span className={`font-mono font-bold ${canAffordClause ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-accent-red)]'}`}>
                    {formatValue(player.releaseClause as number)}
                  </span>
                </div>
              )}

              {/* Budget */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-[var(--color-text-secondary)]">Tu presupuesto:</span>
                <span className="font-mono font-bold text-[var(--color-accent-green)]">
                  {formatValue(userBudget)}
                </span>
              </div>

              {/* Release Clause Button */}
              {hasReleaseClause && (
                <button
                  onClick={handlePayReleaseClause}
                  disabled={!canAffordClause || isSubmitting}
                  className={`w-full mb-4 py-3 rounded-lg font-bold transition-colors ${
                    canAffordClause
                      ? 'bg-[var(--color-accent-cyan)] text-black hover:bg-cyan-400'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] opacity-50'
                  }`}
                >
                  Pagar Cláusula ({formatValue(player.releaseClause as number)})
                </button>
              )}

              {/* Warning for untouchable without clause */}
              {isUntouchable && !hasReleaseClause && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <p className="text-sm text-red-400">
                    Este jugador es intransferible y no tiene cláusula de rescisión.
                    No es posible hacer ofertas.
                  </p>
                </div>
              )}

              {/* Divider */}
              {hasReleaseClause && !isUntouchable && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-xs text-[var(--color-text-secondary)]">o negociar</span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
              )}

              {/* Regular offer form - hidden for untouchable without clause */}
              {!(isUntouchable && !hasReleaseClause) && (
                <>
                  {/* Offer Amount */}
                  <div className="mb-4">
                    <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
                      Tu oferta:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={Math.round(player.marketValue * 0.5 / 100000) * 100000}
                        max={Math.min(userBudget, player.marketValue * 2)}
                        step={100000}
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className={`font-mono font-bold text-lg ${canAfford ? 'text-white' : 'text-red-400'}`}>
                        {formatValue(offerAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Preset buttons */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {presets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setOfferAmount(Math.min(preset.value, userBudget))}
                        disabled={preset.value > userBudget}
                        className={`py-2 rounded text-sm font-medium transition-colors ${
                          offerAmount === preset.value
                            ? 'bg-[var(--color-accent-green)] text-black'
                            : preset.value > userBudget
                              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] opacity-50'
                              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Offer quality */}
                  <div className="flex justify-between items-center mb-6 p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
                    <span className="text-sm">Calidad de oferta:</span>
                    <span className={`font-bold ${quality.color}`}>{quality.label}</span>
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] font-bold rounded-lg"
                >
                  Cancelar
                </button>
                {!(isUntouchable && !hasReleaseClause) && (
                  <button
                    onClick={handleSubmit}
                    disabled={!canAfford || isSubmitting || (isUntouchable && !hasReleaseClause)}
                    className={`flex-1 py-3 font-bold rounded-lg transition-colors ${
                      canAfford && !(isUntouchable && !hasReleaseClause)
                        ? 'bg-[var(--color-accent-green)] text-black hover:bg-green-400'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] opacity-50'
                    }`}
                  >
                    {isSubmitting ? 'Enviando...' : 'Hacer Oferta'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
