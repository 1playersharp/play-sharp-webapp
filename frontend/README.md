# PlaySharp Frontend

PlaySharp is a professional academy-grade football cognition training platform with two tiers: **FOUNDATION** (React Canvas-based, session-only) and **ELITE** (Unity WebGL-based, persistent).

## Overview

The platform assesses and trains players' cognitive and tactical abilities through a series of interactive games. Scores are submitted to a backend API and aggregated into a **Football IQ** rating (combination of Foundation and Elite results).

- **Foundation IQ**: Combines scores from 6 foundation games (Reaction, Decision, Scanning, Pressing, Tactical Quiz, Pass & Move) at 70% weight.
- **Elite IQ**: Combines scores from 3 elite games (Decision ELITE 3D, Pass & Move ELITE 3D, Pressing ELITE 3D) at 30% weight overall.
- **Football IQ**: Combined rating = (Foundation IQ × 0.7) + (Elite IQ × 0.3).

## Architecture

### Two-Tier Gameplay

#### Foundation Tier
- React + Canvas-based games
- Lightweight, suitable for ages 8–14
- Simple tactical overlays and animations
- Session-only results (not persisted locally)
- 6 games: Reaction, Decision, Scanning, Pressing, Tactical Quiz, Pass & Move

#### Elite Tier
- Unity WebGL builds embedded via iframe
- Suitable for academy players, professional players, and talent development
- Cinematic 3D visuals and tactical depth
- **Persistent results** stored locally via Zustand + localStorage
- 3 games currently available: Decision ELITE 3D, Pass & Move ELITE 3D, Pressing ELITE 3D
- Expandable to 6 games to match Foundation

### Key Directories

```
src/
├── pages/
│   └── Demo.jsx                   # Main training hub with player profile & game selection
│
├── games/                         # Foundation games (React/Canvas)
│   ├── ReactionGame.jsx
│   ├── DecisionGame.jsx
│   ├── ScanningGame.jsx
│   ├── PressingGame.jsx
│   ├── TacticalQuizGame.jsx
│   └── playermodel_schema.jsx
│
└── elite/
    ├── engine/
    │   └── useEliteStore.ts       # Zustand store: persistent Elite scores
    │
    ├── games/                     # Elite game route pages
    │   ├── DecisionGame3D.jsx
    │   ├── PassMoveGame3D.jsx
    │   ├── PressingGame3D.jsx
    │   ├── TacticalQuizGame3D.jsx
    │   ├── ScanningGame3D.jsx
    │   └── ReactionGame3D.jsx
    │
    ├── ui/
    │   ├── EliteGameShell.jsx      # Wrapper for Elite pages (header + back button)
    │   ├── UnityEmbed.jsx          # iframe wrapper + postMessage handshake + retry logic
    │   ├── EliteScoreCard.jsx      # Result display after game completion
    │   └── EliteScoreBoard.jsx     # (optional) leaderboard/history
    │
    └── rendering/                 # Placeholder Components (R3F removed for Unity pivot)
        ├── PlayerModel.jsx
        ├── Ball.jsx
        ├── Cameras.jsx
        └── ...others...
```

## How It Works: Elite Games Flow

### 1. Player Entry
1. User fills profile (name, club, age, position, gender) on the Demo intro screen.
2. User navigates to Training Hub and clicks an Elite game card.
3. Player profile is passed via router state → Elite route page → `UnityEmbed` component.

### 2. iframe + Handshake
1. The Elite route renders `<EliteGameShell>` containing `<UnityEmbed>`.
2. `UnityEmbed` loads a Unity WebGL build via iframe from `/elite/games/{game}/build/index.html`.
3. **UNITY_READY Handshake**:
   - Unity build (or mock) detects initialization and posts: `{ type: 'UNITY_READY' }` to parent.
   - Parent (React) receives the message, validates origin, and marks `unityReady = true`.
   - Once ready, React sends player profile to the iframe:
     ```javascript
     iframe.contentWindow.postMessage({
       type: 'PLAYER_PROFILE',
       payload: { firstname, lastname, club, age, position, gender }
     }, window.location.origin);
     ```

### 3. Game Execution
1. Unity build receives `PLAYER_PROFILE` and may adapt scenarios based on player age/position.
2. Player plays the game inside the iframe.

### 4. Completion & Submission
1. When complete, Unity posts back:
   ```javascript
   window.parent.postMessage({
     type: 'ELITE_GAME_COMPLETE',
     payload: { score: <number>, reactionTime: <number> }
   }, window.location.origin);
   ```
2. React `UnityEmbed` receives the message (origin-checked) and:
   - Immediately writes the score to the Zustand store: `setEliteResult('elite_<game>', { score, reactionTime })`
   - Updates UI to show `EliteScoreCard` overlay
   - Dispatches a legacy `eliteGameSaved` CustomEvent for backwards compatibility
   - Triggers **submitScore with retry logic** (see below)

### 5. Persistent Storage
- Elite score is saved to Zustand store using `zustand/middleware/persist`
- Store is persisted to localStorage under key `playsharp-elite-results`
- On page reload, scores rehydrate automatically and Player Card updates without replaying games

### 6. Return to Hub
- Player can click "Back to Hub" button on the result card or on `EliteGameShell`
- Returns to Demo Training Hub
- Player Card now shows green tick (✓) next to completed Elite games and updated IQ scores

## Score Submission & Retry Logic

### Automatic Retry (3 attempts)
```
submitWithRetries(score, reactionTime, maxAttempts = 3)
  → Attempt 1: try submitScore()
       ↓ (on fail, wait 2s)
  → Attempt 2: retry
       ↓ (on fail, wait 2s)
  → Attempt 3: final attempt
       ↓ (on fail)
  → Show non-blocking error banner
```

### Error Handling
- If all 3 auto-retries fail, a non-blocking error banner appears inside `EliteGameShell`
- Banner shows: "Unable to save elite score. You can retry."
- User can click **Manual Retry** button → 1 additional attempt:
  - On success: `toast.success` + banner dismissed
  - On final failure: `toast.error` + banner dismissed (player not blocked, can return to hub)

### Toast Messages
- **Success**: `toast.success('elite_<game> saved')`
- **Final Failure**: `toast.error("Couldn't save elite score after retry")`

## Zustand Store: Elite Results Persistence

### Store Definition (`src/elite/engine/useEliteStore.ts`)
```typescript
import create from 'zustand';
import { persist } from 'zustand/middleware';

const useEliteStore = create(
  persist(
    (set) => ({
      eliteDecisionResult: null,
      elitePassMoveResult: null,
      elitePressingResult: null,
      setEliteResult: (gameType, payload) => {
        // Updates the correct result by gameType
      },
    }),
    {
      name: 'playsharp-elite-results',  // localStorage key
      partialize: (state) => ({
        // Only persist elite results, not actions
        eliteDecisionResult: state.eliteDecisionResult,
        elitePassMoveResult: state.elitePassMoveResult,
        elitePressingResult: state.elitePressingResult,
      }),
    }
  )
);
```

### Usage in Components
```javascript
// Demo.jsx reads Elite results reactively
const eliteDecisionResult = useEliteStore(state => state.eliteDecisionResult);
const elitePassMoveResult = useEliteStore(state => state.elitePassMoveResult);
const elitePressingResult = useEliteStore(state => state.elitePressingResult);
```

### localStorage Details
- **Key**: `playsharp-elite-results`
- **Value**: JSON-stringified elite results object
- **Persistence**: Automatic on update via Zustand middleware
- **Rehydration**: Automatic on app startup; Player Card displays results immediately

## Green Tick Indicators

On the Demo Training Hub, each Elite game card now displays a green checkmark (✓) when:
- The game has been completed at least once
- The result is non-null in the Zustand store

Styling:
- Uses existing design system class `text-ps-turf` (green color)
- Uses `font-bold` for visibility
- Updates reactively without page reload

## IQ Calculation

### Foundation IQ
Computed from 6 foundation game results using fixed internal weightings:
- Reaction: 20% (normalized to 0–100)
- Decision: 20%
- Scanning: 20%
- Pressing: 20%
- Tactical Quiz: 10%
- Pass & Move: 10%

### Elite IQ
Computed as the average of completed Elite game scores (each normalized to 0–100):
- Decision ELITE 3D
- Pass & Move ELITE 3D
- Pressing ELITE 3D

### Overall Football IQ
```
Football IQ = (Foundation IQ × 0.7) + (Elite IQ × 0.3)
```

### Player Card Display
```
Football IQ: [Overall IQ value]
Foundation IQ: [value] · Elite IQ: [value]
Foundation contributes 70% and Elite contributes 30% (10% per Elite game)
```

## Setup & Running Locally

### Prerequisites
- Node.js 16+ / npm 8+
- Modern browser with localStorage support

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
Opens the app at `http://localhost:3000`.

### Production Build
```bash
npm run build
```
Outputs optimized bundle to `dist/`.

## Testing the Elite Flow Locally

### With Mock Unity Builds
1. Mock Unity HTML files are available under `public/elite/games/{game}/build/index.html`
2. These mocks simulate the `UNITY_READY` handshake and `ELITE_GAME_COMPLETE` flow
3. Test locally without real Unity builds

### Expected Behavior
1. Fill profile and navigate to an Elite game
2. Loading overlay shows: "Loading Unity — initialising..."
3. After ~300ms, mock sends `UNITY_READY`
4. React sends `PLAYER_PROFILE` to iframe
5. Mock displays the received profile for debug
6. After ~1.5s total, mock sends `ELITE_GAME_COMPLETE` with random score
7. React updates score card and updates Zustand store
8. Background: submitScore auto-retries (will fail locally if no backend)
9. On error banner appears with manual Retry button
10. Return to Training Hub → green tick appears on the Elite card, IQ updates reactively

### Persistence Score Test
1. Complete an Elite game (see above)
2. Reload page (F5)
3. Player Card should show previously completed Elite ticks + scores immediately (rehydrated from localStorage)

## Integration with Real Unity Builds

When replacing mock builds with actual Unity WebGL outputs:

### Unity Build Checklist
1. Place Unity build output in `public/elite/games/{game}/build/`
2. Ensure `index.html` is the entry point
3. In your C# game code, send messages to parent window:
   ```csharp
   // On initialization:
   Application.ExternalCall("window.parent.postMessage", 
     new object[] { 
       new { type = "UNITY_READY" } 
     }, 
     window.location.origin
   );

   // On game completion:
   Application.ExternalCall("window.parent.postMessage",
     new object[] {
       new { 
         type = "ELITE_GAME_COMPLETE",
         payload = new { score = 85, reactionTime = 250 }
       }
     },
     window.location.origin
   );
   ```
   Or use a simpler approach with `window.parent.postMessage()` if supported in your build.

4. Listen for `PLAYER_PROFILE` messages:
   ```javascript
   window.addEventListener('message', (e) => {
     if (e.origin !== window.location.origin) return;
     if (e.data.type === 'PLAYER_PROFILE') {
       const profile = e.data.payload;
       // Use to adapt game difficulty, scenarios, etc. based on age/position
     }
   });
   ```

## Security Notes

- **Origin Validation**: All incoming `message` events are validated against `window.location.origin`
- **postMessage Target**: Always set target origin to `window.location.origin` (not `*`)
- **HTTPS**: Deploy with HTTPS in production; cross-origin messaging is restricted over HTTP in many browsers

## Dependencies

- **React 19**: Core UI framework
- **React Router v7**: Routing and navigation with state-based params
- **Zustand v4+**: Global state management with persistence middleware
- **Sonner**: Toast notifications
- **Lucide React**: Icon library
- **Tailwind CSS**: Utility-first styling
- **Vite**: Build tool

## Foundation Games (Untouched)

The 6 Foundation games remain unchanged from the original implementation:
- Use Canvas for rendering
- Submit scores via the existing `submitScore` API hook
- Results are session-only (not persisted locally)
- Contribute to Foundation IQ

## File Size & Optimization

- Vite with code splitting: Elite game routes are lazy-loaded
- Mock Unity builds serve minimal HTML/JS for local testing
- Real Unity builds should use WebGL optimizations (compression, asset bundling)

## Troubleshooting

### Elite Games Not Loading
1. Check browser console for CORS errors
2. Verify mock Unity HTML exists at `public/elite/games/{game}/build/index.html`
3. Check dev server is running (`npm run dev`)
4. Check dev server is serving public folder

### Scores Not Persisting After Reload
1. Check localStorage is enabled in browser
2. Open DevTools → Application → Local Storage and verify `playsharp-elite-results` key exists
3. Check Zustand store has `persist` middleware configured
4. Verify `partialize` function exports the correct elite result fields

### Submit Retry Not Showing Banner
1. Open DevTools → Network tab and verify submitScore API calls
2. Check if API is returning errors (intentionally for testing)
3. Manual retry banner only shows after **all 3 auto-retries fail**
4. Simulating backend failure: stop backend API server, then trigger Elite game completion

## Future Enhancements

- Add encrypted localStorage for sensitive profile data
- Implement server-side sync to persist Elite scores on backed API (instead of localStorage-only)
- Add a leaderboard view for Elite scores
- Expand Elite tier to 6 games (matching Foundation count)
- Add Elite analytics dashboard
- Implement real-time multiplayer Elite challenges

## Contributing

- Foundation games are stable; changes require testing on all 6 games
- Elite games expansion: add new game in `src/elite/games/{game}Game3D.jsx` and corresponding route in App.jsx + Demo.jsx
- Update IQ calculation if new games are added

## License

(Add your license here)

