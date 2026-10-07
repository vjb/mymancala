# Milestone Verification Gate Status — Orchestrator Gen 2

## Milestone M3 (Phase 3: Habit Loop & PWA)
- **Status**: PASSED & SIGNED OFF
- **Verification Evidence**:
  1. **Daily Puzzles**: 366 offline puzzles bundled in `src/puzzle/data.json`, deterministic UTC date indexing in `src/puzzle/daily.ts`. Verified by exact solver in `src/puzzle/puzzle.verify.test.ts`. Interactive card with hint and forgiving streak in `src/components/panels/DailyPuzzleCard.tsx`.
  2. **Forgiving Streaks & Badges**: Data-driven badges in `src/progress/badges.ts`, forgiving weekly auto-freeze in `mancala_progress_v1` (`src/progress/progress.ts`), zero shaming language ("Welcome back!"). Injected-clock edge case test suite in `src/progress/progress.test.ts` passing 100%.
  3. **Replay Codec & 1,000-State Fuzzer**: 4 bits/move packed codec in `src/share/codec.ts`. Verified lossless round-trip on 1,000 randomized game states per `ORIGINAL_REQUEST.md:77` in `src/share/codec.fuzz.test.ts`. Zero-throw error handling. Read-only Replay viewer in `src/components/modals/ReplayModal.tsx`.
  4. **Privacy-Safe Result Card**: On-device `<canvas>` card generation in `src/share/card.ts` with zero external network requests, zero PII, zero trackers. Verified in `src/share/card.test.ts`.
  5. **Offline PWA**: Web app manifest `public/manifest.json`, icon `public/icon.svg`, offline-first Service Worker `public/sw.js`, relative `base: './'`, dismissible install prompt in `src/components/pwa/InstallPrompt.tsx`. Removed external Google font CDNs to guarantee 100% offline isolation.
  6. **Cosmetic Unlocks**: `emerald` and `amethyst` unlockable skins in `src/theme/unlocks.ts`. Free core skins (`walnut`, `porcelain`, `obsidian`, `high-contrast`) preserved. Verified in `src/theme/unlocks.test.ts`.
  7. **Invariants**: `src/App.tsx` strictly 279 lines (< 300 line budget). Mobile bottom tray has strictly 5 items. Zero horizontal scroll at 360px.

---

## Milestone M4 (Phase 4: Variants, Reach & Final Pass)
- **Status**: PASSED & SIGNED OFF
- **Verification Evidence**:
  1. **Universal Variant Framework**:
     - `src/rules/types.ts`: Clean `RuleSet` and `BoardLayout` contracts.
     - `src/rules/oware.ts`: Full Oware (Abapa) implementation featuring 2-3 backwards chain captures, origin pit skipping on 12+ stone laps, feeding obligation, and grand slam forfeiture. Verified by 8 unit and invariant tests in `src/rules/oware.test.ts`.
     - `src/rules/sow-and-score.ts`: Gentle intro teaching variant for ages 6+ with store banking and free turns. Verified by 4 unit tests in `src/rules/sow-and-score.test.ts`.
     - `src/rules/congkak.ts`: 7-pit continuous sowing variant (Beta).
     - `src/rules/bao.ts`: Bao la Kiswahili front-row tactical capture variant (Beta).
     - `src/rules/index.ts`: Variant registry dispatching all 5 rulesets with explicit metadata and analysis grades.
  2. **Friend Play by Link & Ephemeral Relay Protocol**:
     - `src/net/protocol.ts`: Structured JSON message protocol with strict validation. Fixed kid-safe emoji list (`['👋', '👏', '🤔', '😮', '🤝', '🔥']`). Asynchronous pass-by-link URL generator.
     - `relay/relay.ts`: Ephemeral zero-storage WebSocket relay hub with 30-minute room expiry, 2-player capacity, and zero content logging.
     - `src/net/protocol.test.ts`: Verified message serialization, emoji restrictions, room ID generation, relay forwarding, and idle room purging.
  3. **Academic Cultural Stories**:
     - `src/stories/index.ts`: Culturally respectful historical narratives for Akan Oware, Nile Valley Mancala archaeology, Malay Maritime Congkak, and Swahili Coast Bao with complete English, Spanish, and Arabic coverage.
     - Fully grounded in verifiable academic works: Rattray (1923), Murray (1952), de Voogt (1997), Skeat (1900), and Townshend (1979).
     - `src/stories/stories.test.ts`: Verified citations and multi-lingual parity.
     - `src/RulesModal.tsx`: Added "About the Game" tab displaying cultural stories and academic citations.
  4. **Architectural & Design Invariants**:
     - `src/App.tsx`: Kept at 279 lines (< 300 line budget limit).
     - Mobile Bottom Tray: Preserves strictly 5 navigation buttons (`Board`, `Analysis`, `Coach`, `Rules`, `Settings`), zero 6th button.
     - Zero External Calls: Removed all external CDN requests (Google fonts) to guarantee 100% offline isolation.
     - Test Suite: 33 Vitest test files (261 tests) passing 100% cleanly. Production build passes with 0 errors.
