# Phase 3: Habit loop and sharing (daily puzzle, streaks, cards, PWA)

Prereq: phases 0–2. See [README.md](README.md) and [appendix-ux-and-safety.md](appendix-ux-and-safety.md). No accounts, no tracking, no server.

## 3.1 Daily puzzle
**Files:** `src/puzzle/daily.ts`, `src/puzzle/generate.ts`, `scripts/gen-puzzles.ts`.
- Puzzle = `{id, rulesId, moves: number[] /* setup from start */, solution: number[], theme, difficulty}`.
- Deterministic by local date: `dayIndex = floor(localMidnightMs / 86400000)`; `puzzleFor(dayIndex)` picks from a precomputed bundled list (`src/puzzle/data.json`, 365+ entries) via seeded PRNG so everyone gets the same puzzle. Everyone sees the same puzzle only per UTC day; document the choice (use UTC day to match across timezones).
- Generator script finds positions where the exact solver (2.1) proves a unique best move that beats the second-best by >= 2 stones; themes: capture, go-again chain, starve. Commit generated data. Test: every bundled puzzle re-verified by solver in CI (`puzzle.verify.test.ts`).
- UI: Coach tab card "Today's puzzle", 1 attempt per try, unlimited retries, hint button (reveals theme, then pit). Result: gentle "Solved in N tries".

## 3.2 Streaks and gentle badges
- `src/progress/progress.ts`, key `mancala_progress_v1`: `{streak, bestStreak, lastDay, badges: string[], stats}`.
- Streak is forgiving: one "freeze" per week auto-applied; a miss never shows red or shaming text; copy "Welcome back!".
- Badges (data-driven list `src/progress/badges.ts`, each `{id, icon, check(progress, event)}`): first win, first capture, 3-day streak, 7-day streak, 10 puzzles, win with no mistakes, learned the rules tutorial, tried each variant. No loot boxes, no timers, no purchases.
- Tests: streak across midnight/DST/timezone edge cases using injected clock.

## 3.3 Replay links and result cards (privacy-safe)
- Encode a game into the URL hash: `#/r/<v1>.<rulesId>.<base64url(moves packed 4 bits/move)>.<flags>`; `src/share/codec.ts` with `encode/decode` and a version byte. Round-trip tests incl. malformed input (must never throw; show friendly error).
- Replay viewer: opens read-only, step through moves, "Play from here".
- Result card: render to `<canvas>` on-device (no network), PNG via `navigator.share({files})` with fallback to download. Shows result, board art, optional replay link. **No names, no avatar photos, no location.** Text and art localised.
- Test: codec round trip fuzz (1000 random games); e2e that opens a link and steps through.

## 3.4 PWA install and offline
- `vite-plugin-pwa` (Workbox `generateSW`), precache all assets, `registerType: 'prompt'` with a small "Update ready" toast.
- Manifest: name "Mancala Coach", short_name, `display: standalone`, theme/background colours from tokens, icons 192/512/maskable (generate from SVG), `start_url: './'`, `scope: './'`.
- Use relative `base: './'` so it works from any host.
- Install hint: show only after the first completed game, dismissible, never again after dismiss.
- Test: Lighthouse PWA/installable pass; e2e with offline emulation loads and plays.

## 3.5 Cosmetic unlocks
- Unlock boards/stone sets/sounds by badges and streaks (`src/theme/unlocks.ts`). Existing skins `walnut`, `porcelain`, `obsidian` remain free. Unlocks are purely cosmetic and never gate rules, variants or analysis.

## Definition of done (phase 3)
Daily puzzle deterministic and verified, streak tests green, share link round-trips, installable and works offline, commit `feat: phase 3 habit loop`.
