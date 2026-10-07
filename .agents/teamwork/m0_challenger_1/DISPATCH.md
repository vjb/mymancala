# DISPATCH — m0_challenger_1

## Task Assignment
- Milestone: M0 (Phase 0 Foundation)
- Role: teamwork_preview_challenger
- Working Directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_challenger_1
- Parent Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Mandatory Inputs:
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
  - c:\Users\vjbel\hacks\mymancala\PROJECT.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_worker_1\handoff.md

## Objective
Adversarially challenge the M0 RuleSet and engine implementation:
1. Verify `src/rules/kalah.test.ts` fuzz tests.
2. Generate adversarial test cases:
   - High stone counts (> 14, > 28, > 48 stones in a single pit) testing multi-lap sowing and opponent store skips.
   - Exact empty-opposite landing captures.
   - Simultaneous endgame sweep and free-turn edge cases.
   - Invariant check: stone conservation strictly equals initial sum across all transitions.
3. Test `src/workers/searchClient.ts` under rapid cancellation stress (e.g. 10 rapid concurrent queries, assert no unhandled rejections or state corruption).

Record your findings and verdict (`APPROVE` or `REJECT`) in `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_challenger_1\handoff.md`.
Notify parent via send_message.

## 2026-10-07T02:02:46Z
You are m0_challenger_1.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_challenger_1.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_challenger_1\DISPATCH.md
And the worker handoff report at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_worker_1\handoff.md

Adversarially challenge M0:
1. Stress test RuleSet with high stone counts (>14, >28, >48 stones), multi-lap sowing, opponent store skips, empty captures, endgame sweeps.
2. Invariant: stone conservation across all moves.
3. Rapid concurrent query cancellation stress on searchClient.ts.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_challenger_1\handoff.md with an explicit verdict (APPROVE or REJECT).
Notify parent via send_message.
