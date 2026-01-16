import { useState, createContext, useContext, Component, type ReactNode } from 'react';
import { GameProvider, useGame } from './contexts/GameContext';
import { BottomNav } from './components/layout/BottomNav';
import { MainMenuPage } from './pages/MainMenuPage';
import { DashboardPage } from './pages/DashboardPage';
import { SquadPage } from './pages/SquadPage';
import { FixturesPage } from './pages/FixturesPage';
import { WorldPage } from './pages/WorldPage';
import { OfficePage } from './pages/OfficePage';
import { MatchDayPage, type MatchState } from './pages/MatchDayPage';
import { SeasonSummaryModal } from './components/ui';

export type PageId = 'home' | 'squad' | 'fixtures' | 'world' | 'office';

// Match context for triggering matches from anywhere
interface MatchContextValue {
  startMatch: (opponentId: string, isHome: boolean, competition: string) => void;
}
const MatchContext = createContext<MatchContextValue | null>(null);
export const useMatch = () => useContext(MatchContext);

// Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-900 text-white min-h-screen">
          <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
          <pre className="text-sm overflow-auto bg-black p-4 rounded">
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white text-black rounded"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Match state
interface ActiveMatch {
  opponentId: string;
  isHome: boolean;
  competition: string;
}

// Main game UI (shown when a save is loaded)
function GameUI() {
  const { processMatchResult, getUserClub, currentSave } = useGame();
  const [activePage, setActivePage] = useState<PageId>('home');
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);

  const startMatch = (opponentId: string, isHome: boolean, competition: string) => {
    setActiveMatch({ opponentId, isHome, competition });
  };

  const handleMatchFinish = (result: MatchState) => {
    if (!activeMatch) return;

    const userClub = getUserClub();
    if (!userClub) return;

    // Determine home/away club IDs
    const homeClubId = activeMatch.isHome ? userClub.id : activeMatch.opponentId;
    const awayClubId = activeMatch.isHome ? activeMatch.opponentId : userClub.id;

    // Find competition ID if it's a league match
    const competition = currentSave?.competitions.find(
      c => c.name === activeMatch.competition || c.shortName === activeMatch.competition
    );

    // Process the match result (updates stats, standings, history)
    processMatchResult(homeClubId, awayClubId, result, competition?.id);

    setActiveMatch(null);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <DashboardPage onNavigate={setActivePage} />;
      case 'squad':
        return <SquadPage />;
      case 'fixtures':
        return <FixturesPage />;
      case 'world':
        return <WorldPage />;
      case 'office':
        return <OfficePage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  // Show match overlay if active
  if (activeMatch) {
    return (
      <MatchDayPage
        opponentClubId={activeMatch.opponentId}
        isHome={activeMatch.isHome}
        competitionName={activeMatch.competition}
        onFinish={handleMatchFinish}
        onCancel={() => setActiveMatch(null)}
      />
    );
  }

  return (
    <MatchContext.Provider value={{ startMatch }}>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        <main className="safe-bottom">
          {renderPage()}
        </main>
        <BottomNav activePage={activePage} onNavigate={setActivePage} />
      </div>
      {/* Season Summary Modal - shows when season ends */}
      <SeasonSummaryModal />
    </MatchContext.Provider>
  );
}

// App shell - decides between menu and game
function AppShell() {
  const { currentSave, isLoading } = useGame();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[var(--color-accent-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show main menu if no active save
  if (!currentSave) {
    return <MainMenuPage />;
  }

  // Show game UI
  return <GameUI />;
}

function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <AppShell />
      </GameProvider>
    </ErrorBoundary>
  );
}

export default App;
