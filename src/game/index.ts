// =============================================================================
// BALONPI 2026 - MAIN ENTRY POINT
// "Hyper-Speed & Addictive Simplicity"
// =============================================================================

// Types
export * from './types';

// Core Systems
export * from './core';

// Data Layer
export * from './data';

/**
 * ARCHITECTURE OVERVIEW
 * =====================
 *
 * src/
 * ├── types/
 * │   └── index.ts              # All TypeScript interfaces and types
 * │
 * ├── core/
 * │   ├── entities/
 * │   │   └── Player.ts         # Player class with skill calculations
 * │   │
 * │   ├── engine/
 * │   │   └── MatchEngine.ts    # Tick-based match simulation
 * │   │
 * │   └── managers/
 * │       └── CareerManager.ts  # Career progression, CPU carousel, nemesis
 * │
 * ├── data/
 * │   └── GenesisLoader.ts      # IndexedDB persistence, regen system
 * │
 * ├── store/                    # Zustand state management (TBD)
 * ├── hooks/                    # React hooks (TBD)
 * └── utils/                    # Utility functions (TBD)
 *
 *
 * KEY DESIGN DECISIONS
 * ====================
 *
 * 1. SINGLE SKILL SYSTEM
 *    - Every player has ONE skill number (1-99)
 *    - Position fit, form arrows, and chemistry modify effective skill
 *    - Keeps data light, simulation fast, decisions meaningful
 *
 * 2. TICK-BASED SIMULATION
 *    - No physics engine, pure probability math
 *    - 5-minute ticks = 18 ticks per match
 *    - Each tick: Attack phase for both teams, card phase
 *    - Goal probability = f(attackPower - defensePower)
 *
 * 3. SIMULCAST ARCHITECTURE
 *    - All matches run simultaneously in memory
 *    - Single UI list showing all scores + minutes
 *    - User can pause/speed up/instant-result
 *    - Goal events trigger visual flash on affected row
 *
 * 4. DIVERGENT UNIVERSE
 *    - Initial load fetches real player data
 *    - After first load, universe diverges completely
 *    - All changes persist to IndexedDB
 *    - Regen system ensures world never runs out of players
 *
 * 5. ADDICTION HOOKS
 *    - Form arrows force rotation decisions
 *    - Chemistry duos create emotional bonds
 *    - Nemesis system makes certain matches more meaningful
 *    - Youth promises create micro-quests
 *    - Deadline day FOMO with flash sales
 *
 *
 * NEXT STEPS
 * ==========
 *
 * 1. Set up Vite + React 19 project structure
 * 2. Implement Zustand store with world state
 * 3. Build UI components (Squad, Fixtures, Market, Office)
 * 4. Create master_db_2026.json with real player data
 * 5. Implement service worker for PWA offline support
 * 6. Add Firebase for cloud backup and Hall of Fame sync
 */
