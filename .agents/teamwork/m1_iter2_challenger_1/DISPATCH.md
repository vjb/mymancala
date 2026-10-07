## 2026-10-07T05:02:36Z

# Task Assignment: M1 Iteration 2 Challenger 1 (Stress Testing Empty State, Lenses & Plurals)

## Objective
Adversarially challenge M1 Iteration 2:
1. Run `npx playwright test e2e/m1_adversarial_stress.spec.ts` across all 4 viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
2. Verify `[data-testid="analysis-empty-state"]` and `[data-testid="enable-coach-btn"]` render in `justPlay` preset.
3. Verify clicking `enable-coach-btn` switches back to `coach` preset and restores candidate evaluations.
4. Stress test `landingPreview` lens: toggle `landingPreview` off and assert that hovering/touching pit 0 displays zero landing rings, capture pulses, or trajectory badges.
5. Run unit stress tests in `src/i18n/i18n.test.ts` and `src/m1_adversarial_stress.test.ts`.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\e2e\m1_adversarial_stress.spec.ts`
- `c:\Users\vjbel\hacks\mymancala\src\i18n\i18n.test.ts`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md`

## Deliverables
Write your report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_challenger_1\handoff.md` with an explicit verdict (**APPROVE** or **REJECT**).
Notify your parent via `send_message`.
