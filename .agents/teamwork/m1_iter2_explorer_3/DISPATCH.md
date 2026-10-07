# Task Assignment: M1 Iteration 2 Explorer 3 (i18n Strings, Arabic Plurals & Test Verification Matrix)

## Objective
Analyze and provide concrete fix specifications for:
1. **TurnBanner Stone Count Localization**:
   - In `src/components/shell/TurnBanner.tsx:86`, replace hardcoded `'Stones: ' + totalStones` with `{t('board.stones', { count: totalStones })}`.
   - Also check `StorePit.tsx` and `a11y.ts` to ensure all stone count narrations use localized strings.
2. **Arabic Plural Categories Unit Test Suite**:
   - In `src/i18n/i18n.test.ts`, add exhaustive unit test cases verifying all 6 Arabic plural forms (`zero`, `one`, `two`, `few`, `many`, `other`) for representative counts (0, 1, 2, 3, 11, 100).
3. **E2E Test Suites Alignment**:
   - Verify `e2e/m1_adversarial_stress.spec.ts` and `e2e/challenger-m1.spec.ts`.
   - Align test fixtures so that all tests pass cleanly across all 4 viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_1\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\src\components\shell\TurnBanner.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\i18n\i18n.test.ts`
- `c:\Users\vjbel\hacks\mymancala\e2e\m1_adversarial_stress.spec.ts`
- `c:\Users\vjbel\hacks\mymancala\e2e\challenger-m1.spec.ts`

## Deliverables
Write detailed fix plan and code diffs to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_3\handoff.md`.


## 2026-10-07T04:32:43Z
You are m1_iter2_explorer_3.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_3.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

Inspect:
- src/components/shell/TurnBanner.tsx
- src/i18n/i18n.test.ts
- e2e/m1_adversarial_stress.spec.ts
- e2e/challenger-m1.spec.ts

Analyze and provide concrete specifications for:
1. TurnBanner Stone Count Localization:
   - In TurnBanner.tsx:86, replace hardcoded `'Stones: ' + totalStones` with `{t('board.stones', { count: totalStones })}`.
   - Verify StorePit.tsx and a11y.ts localized strings.
2. Arabic Plural Categories Unit Test Suite:
   - In src/i18n/i18n.test.ts, add unit tests verifying all 6 Arabic plural forms (zero, one, two, few, many, other) with counts 0, 1, 2, 3..10, 11..99, 100+.
3. E2E Test Suite Alignment & Verification Matrix:
   - Review e2e/m1_adversarial_stress.spec.ts and e2e/challenger-m1.spec.ts.
   - Specify how to run and verify all tests across all 4 viewports (360x740, 393x852, 768x1024, 1280x800).

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_3\handoff.md.
Send a message to your parent (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5) when done.
