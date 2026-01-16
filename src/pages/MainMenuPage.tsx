/**
 * MainMenuPage - Punto de entrada del juego
 *
 * Muestra:
 * - Continuar (si existe una partida guardada)
 * - Nueva Partida
 * - Cargar Partida
 * - Ajustes
 */

import { useState } from 'react';
import { useGame } from '../contexts/GameContext';

type MenuScreen = 'main' | 'new-game' | 'load-game' | 'select-club';

export function MainMenuPage() {
  const { saves, isLoading, continueSave, masterDb } = useGame();
  const [screen, setScreen] = useState<MenuScreen>('main');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[var(--color-accent-green)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[var(--color-text-secondary)]">Cargando...</div>
      </div>
    );
  }

  if (screen === 'new-game') {
    return <NewGameScreen onBack={() => setScreen('main')} />;
  }

  if (screen === 'load-game') {
    return <LoadGameScreen onBack={() => setScreen('main')} />;
  }

  const hasSaves = saves.length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-[var(--color-accent-green)] tracking-tight">
          BALONPI
        </h1>
        <div className="text-[var(--color-text-secondary)] text-sm font-mono mt-1">2026</div>
      </div>

      {/* Menu Options */}
      <div className="w-full max-w-xs space-y-3">
        {hasSaves && (
          <button
            onClick={() => continueSave()}
            className="w-full btn bg-[var(--color-accent-green)] text-white font-bold py-4 text-lg"
          >
            Continuar
          </button>
        )}

        <button
          onClick={() => setScreen('new-game')}
          className={`w-full btn font-bold py-4 text-lg ${
            hasSaves
              ? 'btn-ghost border-[var(--color-accent-green)] text-[var(--color-accent-green)]'
              : 'bg-[var(--color-accent-green)] text-white'
          }`}
        >
          Nueva Partida
        </button>

        {hasSaves && (
          <button
            onClick={() => setScreen('load-game')}
            className="w-full btn btn-ghost py-4"
          >
            Cargar Partida
          </button>
        )}

        <button className="w-full btn btn-ghost py-4 text-[var(--color-text-secondary)]">
          Ajustes
        </button>
      </div>

      {/* Stats */}
      {masterDb && (
        <div className="mt-12 text-center text-[var(--color-text-secondary)] text-xs font-mono">
          <div>{masterDb.clubs.length} clubes · {masterDb.players.length} jugadores</div>
          <div className="mt-1">Temporada {masterDb.meta.season}</div>
        </div>
      )}

      {/* Version */}
      <div className="absolute bottom-4 text-[var(--color-text-muted)] text-xs font-mono">
        v0.1.0
      </div>
    </div>
  );
}

// ============================================================================
// Pantalla de Nueva Partida
// ============================================================================

// Reputación máxima de club que puede seleccionar un nuevo mánager
const MAX_STARTER_REPUTATION = 60;

function NewGameScreen({ onBack }: { onBack: () => void }) {
  const { masterDb, createNewGame } = useGame();
  const [step, setStep] = useState<'name' | 'country' | 'league' | 'club'>('name');
  const [managerName, setManagerName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!masterDb) return null;

  // Get leagues (non-international competitions) - tiers 1 and 2
  const leagues = masterDb.competitions
    .filter(c => c.type === 'LEAGUE' && (c.tier === 1 || c.tier === 2))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  // Group leagues by country
  const countriesWithLeagues = [...new Set(leagues.map(l => l.country))].sort();

  // Get leagues for selected country
  const countryLeagues = selectedCountry
    ? leagues.filter(l => l.country === selectedCountry)
        .sort((a, b) => a.tier - b.tier)
    : [];

  // Get clubs for selected league - FILTERED by reputation for new managers
  const leagueClubs = selectedLeague
    ? masterDb.clubs
        .filter(c => c.leagueId === selectedLeague)
        .filter(c => (c.reputation || 0) <= MAX_STARTER_REPUTATION)
    : [];

  // Get ALL clubs in the league (for showing unavailable ones)
  const allLeagueClubs = selectedLeague
    ? masterDb.clubs.filter(c => c.leagueId === selectedLeague)
    : [];

  const handleStartGame = async () => {
    if (!selectedClub || !managerName.trim()) return;

    setIsCreating(true);
    try {
      await createNewGame(selectedClub, managerName.trim());
    } catch (error) {
      console.error('Failed to create game:', error);
    }
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-[var(--color-text-secondary)] text-2xl">←</button>
        <h1 className="text-xl font-bold">Nueva Carrera</h1>
      </div>

      {/* Step 1: Manager Name */}
      {step === 'name' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              Nombre del Mánager
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Ingresa tu nombre"
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-accent-green)] focus:outline-none"
              autoFocus
            />
          </div>

          <div className="card p-3 bg-[var(--color-bg-secondary)]">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Como nuevo mánager, comenzarás en un club pequeño para construir tu reputación.
              Solo están disponibles clubes con reputación ≤ {MAX_STARTER_REPUTATION}.
            </p>
          </div>

          <button
            onClick={() => managerName.trim() && setStep('country')}
            disabled={!managerName.trim()}
            className="w-full btn bg-[var(--color-accent-green)] text-white font-bold py-4 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Step 2: Select Country */}
      {step === 'country' && (
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)] text-sm mb-4">Selecciona un país</p>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto">
            {countriesWithLeagues.map((country) => {
              const countryLgs = leagues.filter(l => l.country === country);
              const totalTeams = countryLgs.reduce((sum, l) => sum + (l.teamIds?.length || 0), 0);
              const availableClubs = masterDb.clubs.filter(c =>
                countryLgs.some(l => l.teamIds?.includes(c.id)) &&
                (c.reputation || 0) <= MAX_STARTER_REPUTATION
              ).length;

              return (
                <button
                  key={country}
                  onClick={() => {
                    setSelectedCountry(country);
                    setStep('league');
                  }}
                  className="w-full card p-4 text-left hover:border-[var(--color-accent-green)] transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{country}</div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {countryLgs.length} {countryLgs.length === 1 ? 'liga' : 'ligas'} · {totalTeams} equipos
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-[var(--color-accent-green)]">
                        {availableClubs}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">disponibles</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep('name')}
            className="w-full btn btn-ghost py-3 mt-4"
          >
            Volver
          </button>
        </div>
      )}

      {/* Step 3: Select League */}
      {step === 'league' && (
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)] text-sm mb-4">
            Selecciona una liga en {selectedCountry}
          </p>

          <div className="space-y-2">
            {countryLeagues.map((league) => {
              const availableClubs = masterDb.clubs.filter(
                c => c.leagueId === league.id && (c.reputation || 0) <= MAX_STARTER_REPUTATION
              ).length;
              const isSecondDivision = league.tier === 2;

              return (
                <button
                  key={league.id}
                  onClick={() => {
                    setSelectedLeague(league.id);
                    setStep('club');
                  }}
                  className="w-full card p-4 text-left hover:border-[var(--color-accent-green)] transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{league.name}</span>
                        {isSecondDivision && (
                          <span className="text-xs bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)] px-2 py-0.5 rounded">
                            2da Div
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {league.teamIds?.length || 0} equipos
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${availableClubs > 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {availableClubs}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">disponibles</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setSelectedLeague(null);
              setStep('country');
            }}
            className="w-full btn btn-ghost py-3 mt-4"
          >
            Volver
          </button>
        </div>
      )}

      {/* Step 4: Select Club */}
      {step === 'club' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[var(--color-text-secondary)] text-sm">Selecciona tu club</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {leagueClubs.length} de {allLeagueClubs.length} disponibles
            </p>
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {allLeagueClubs
              .sort((a, b) => (a.reputation || 0) - (b.reputation || 0))
              .map((club) => {
                const squad = masterDb.players.filter(p => p.clubId === club.id);
                const avgSkill = squad.length
                  ? Math.round(squad.reduce((s, p) => s + p.skillBase, 0) / squad.length)
                  : 0;
                const isAvailable = (club.reputation || 0) <= MAX_STARTER_REPUTATION;

                return (
                  <button
                    key={club.id}
                    onClick={() => isAvailable && setSelectedClub(club.id)}
                    disabled={!isAvailable}
                    className={`w-full card p-4 text-left transition-colors ${
                      !isAvailable
                        ? 'opacity-40 cursor-not-allowed'
                        : selectedClub === club.id
                        ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10'
                        : 'hover:border-[var(--color-border-hover)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{club.name}</span>
                          {!isAvailable && (
                            <span className="text-xs bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)] px-2 py-0.5 rounded">
                              Muy Grande
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          {squad.length} jugadores · Media {avgSkill}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono ${isAvailable ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-secondary)]'}`}>
                          ${((club.balance || 0) / 1000000).toFixed(1)}M
                        </div>
                        <div className={`text-xs ${isAvailable ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-accent-red)]'}`}>
                          Rep {club.reputation || 0}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          {leagueClubs.length === 0 && (
            <div className="card p-4 text-center bg-[var(--color-accent-yellow)]/10 border-[var(--color-accent-yellow)]">
              <p className="text-sm text-[var(--color-text-primary)]">
                No hay clubes disponibles en esta liga para un nuevo mánager.
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Intenta con una liga de segunda división.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                setSelectedClub(null);
                setStep('league');
              }}
              className="flex-1 btn btn-ghost py-3"
            >
              Volver
            </button>
            <button
              onClick={handleStartGame}
              disabled={!selectedClub || isCreating}
              className="flex-1 btn bg-[var(--color-accent-green)] text-white font-bold py-3 disabled:opacity-50"
            >
              {isCreating ? 'Creando...' : 'Iniciar Carrera'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pantalla de Cargar Partida
// ============================================================================

function LoadGameScreen({ onBack }: { onBack: () => void }) {
  const { saves, loadSave, deleteSave } = useGame();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-[var(--color-text-secondary)] text-2xl">←</button>
        <h1 className="text-xl font-bold">Cargar Partida</h1>
      </div>

      {saves.length === 0 ? (
        <div className="text-center text-[var(--color-text-secondary)] py-12">
          No hay partidas guardadas
        </div>
      ) : (
        <div className="space-y-3">
          {saves.map((save) => (
            <div
              key={save.id}
              className="card p-4"
            >
              <div className="flex justify-between items-start">
                <button
                  onClick={() => loadSave(save.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-semibold">{save.name}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    {save.clubName}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-mono">
                    {save.gameDate} · Guardado {formatDate(save.updatedAt)}
                  </div>
                </button>

                {confirmDelete === save.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        deleteSave(save.id);
                        setConfirmDelete(null);
                      }}
                      className="text-xs px-3 py-1 bg-[var(--color-accent-red)] text-white rounded"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-3 py-1 bg-[var(--color-bg-tertiary)] rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(save.id)}
                    className="text-[var(--color-accent-red)] text-sm px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
