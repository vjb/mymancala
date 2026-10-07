# E2E Test Infra: 2030s GNU Backgammon for Mancala

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.
- Cross-device mobile and accessibility guardrails verified across 4 viewports (360x740, 393x852, 768x1024, 1280x800).
- Automated Axe accessibility auditing reporting zero critical/serious violations.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (>=5) | Tier 2 (>=5) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|---------------------|:------------:|:------------:|:-----------------:|:-----------------:|
| 1 | RuleSet & Board Gameplay | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Monolith Decomposition & UI Layout | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Worker Search & Cancellation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Autosave Replay & Resume | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Lenses & Presets (7 lenses, 4 presets) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Highlight Visual Language & Precedence | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Bot Pacing & Thinking Floor | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 8 | Accessibility (WCAG AA/AAA, Contrast, Keyboard, ARIA, Speech) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 9 | Localization (en, ar, es) & RTL Non-Mirroring | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 10 | Interactive Mini-Tutorial | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 11 | Exact Endgame Solver & Truthful Labels | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 12 | Move Loss Grades & Leitner Drills | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 13 | Date-Seeded Daily Puzzle & Streaks | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 14 | Replay URL Codec & Share Card Canvas | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 15 | Offline PWA Service Worker | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 16 | Game Variants (Oware, Sow & Score, Congkak/Bao) | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| 17 | Ephemeral Friend Play & Replay Fallback | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| 18 | Cultural Stories & Data Privacy Erase | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Playwright (`@playwright/test`) running against Vite local preview server `http://localhost:5173`.
- **Invocation**: `npm run test:e2e` or `npx playwright test`.
- **Pass/Fail Semantics**: Zero test failures, zero console exceptions, zero horizontal scrolling (`scrollWidth <= innerWidth` at 360px), zero critical/serious Axe a11y violations.
- **Directory Layout**:
  - `e2e/no-hscroll.spec.ts`: Viewport horizontal overflow checks across 4 viewports in en, ar, es.
  - `e2e/tray.spec.ts`: Fixed 5-item tray lock and modal reachability.
  - `e2e/a11y.spec.ts`: Axe-core automated accessibility audit.
  - `e2e/presets.spec.ts`: Just Play, Hints, Coach, and Full preset UI tests.
  - `e2e/tutorial.spec.ts`: Guided tutorial step-by-step completion.
  - `e2e/solver.spec.ts`: Exact solver UI validation and 500-position cross-check.
  - `e2e/codec.spec.ts`: URL hash replay sharing and 1,000-state fuzzer validation.
  - `e2e/offline.spec.ts`: PWA offline caching via `context.setOffline(true)`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Complete Novice Onboarding | Tutorial -> Just Play game -> Win -> First Win Badge | High |
| 2 | Serious Student Training | Coach Preset -> Mistake Warning -> Reconsider -> Review Modal -> Mistake Drill | High |
| 3 | Daily Habit & Streak Maintenance | Daily Puzzle solve -> Share Card canvas export -> Streak increment | High |
| 4 | Arabic Speaker Experience | Arabic locale -> RTL chrome -> Unmirrored board -> Voice read-aloud | High |
| 5 | Cross-Variant Exploration | Kalah -> Switch to Oware (Abapa) -> Starvation Feeding -> Grand Slam rule | High |

## Coverage Thresholds
- Tier 1: >= 5 tests per feature (>= 90 tests)
- Tier 2: >= 5 boundary/corner cases per feature (>= 90 tests)
- Tier 3: Pairwise combinations across major features (>= 18 tests)
- Tier 4: >= 5 realistic application scenarios (>= 5 tests)
- Total minimum target: ~203 test cases across unit, integration, and E2E suites.
