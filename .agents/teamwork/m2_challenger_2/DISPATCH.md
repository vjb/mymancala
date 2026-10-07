# M2 Challenger 2 Dispatch

**Agent**: `m2_challenger_2`
**Role**: Challenger (Trainer & UI Invariants Stress)
**Parent**: Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)

Adversarially challenge M2:
1. Storage & Spaced Repetition Stress:
   - Rapidly insert 250 items into `mancala_mistakes_v1`; assert storage array is strictly capped at 200 items (FIFO eviction of oldest).
   - Verify Leitner box interval math: Box 1: 1 day, Box 2: 3 days, Box 3: 7 days.
2. UI & Responsive Invariants:
   - Run `npx playwright test e2e/trainer.spec.ts` across all 4 responsive viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
   - Invariant: mobile bottom navigation tray MUST strictly contain exactly 5 buttons (`[data-testid="bottom-tray"] button` count === 5; never a 6th button).
   - Invariant: `(Get-Content src/App.tsx).Length` is strictly < 300 lines (actual currently 278).
   - Invariant: zero horizontal scroll at 360px viewport.
3. Run axe contrast check on porcelain skin: `npx playwright test e2e/a11y.spec.ts -g "porcelain"`.

Write your report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_challenger_2\handoff.md` with an explicit verdict (`APPROVE` or `REJECT`).
Notify parent via `send_message`.


## 2026-10-07T06:42:05Z
You are m2_challenger_2.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_challenger_2.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_challenger_2\DISPATCH.md
And the worker handoff report at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_worker_1\handoff.md

Adversarially challenge M2:
1. Storage & Spaced Repetition Stress:
   - Rapidly insert 250 items into `mancala_mistakes_v1`; assert storage array is strictly capped at 200 items (FIFO eviction of oldest).
   - Verify Leitner box interval math: Box 1: 1 day, Box 2: 3 days, Box 3: 7 days.
2. UI & Responsive Invariants:
   - Run `npx playwright test e2e/trainer.spec.ts` across all 4 responsive viewports (mobile-small, mobile-iphone, tablet-portrait, desktop-landscape).
   - Invariant: mobile bottom navigation tray MUST strictly contain exactly 5 buttons (`[data-testid="bottom-tray"] button` count === 5; never a 6th button).
   - Invariant: `(Get-Content src/App.tsx).Length` is strictly < 300 lines (actual currently 278).
   - Invariant: zero horizontal scroll at 360px viewport.
3. Run axe contrast check on porcelain skin: `npx playwright test e2e/a11y.spec.ts -g "porcelain"`.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_challenger_2\handoff.md with an explicit verdict (APPROVE or REJECT).
Notify parent via send_message.
