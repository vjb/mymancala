# DISPATCH: m1_challenger_2 (A11y, RTL & Storage Wipe Challenger)

## Task Assignment
- **Agent**: `m1_challenger_2`
- **Role**: `teamwork_preview_challenger`
- **Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2`
- **Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`
- **Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## Mandatory Inputs to Read:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `c:\Users\vjbel\hacks\mymancala\PROJECT.md`
3. Worker Handoff Report: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1\handoff.md`

## Adversarial Challenge Scope:
1. Adversarially stress test Axe accessibility:
   - Run axe checks across all 4 skins (`walnut`, `porcelain`, `obsidian`, `high-contrast`) and all 4 viewports (`360x740`, `393x852`, `768x1024`, `1280x800`). Assert zero critical and zero serious violations.
   - Verify minimum text contrast ratio >= 7:1 in `high-contrast` skin and font size floor >= 12px at scale M.
2. Adversarially challenge RTL layout:
   - Switch language to Arabic (`lang="ar"`, `dir="rtl"`).
   - Assert `document.documentElement.scrollWidth <= window.innerWidth` across all tabs and modals at 360px viewport.
   - Verify the physical board invariant: Player 1 pits (0..5) remain along the bottom, Player 1 store (pit 6) is on the right, and Player 2 store (pit 13) is on the left (unmirrored).
3. Adversarially challenge keyboard navigation & debounce:
   - Rapidly send 50 key events (ArrowRight, ArrowLeft, Enter) and verify no out-of-bounds pit indexes or state desyncs.
   - Rapidly fire click events within <250ms on playable pits to test the debounce guard.
4. Adversarially challenge Zero-PII "Erase My Data":
   - Populate localStorage with game saves, ratings, settings, and custom presets.
   - Trigger data reset and assert complete purge of all `mancala_*` keys.

Provide an explicit verdict (**APPROVE** or **REJECT**) in:
`c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2\handoff.md`
Notify parent when done.

## 2026-10-07T04:08:20Z
[Message] timestamp=2026-10-07T04:08:20Z sender=85856d3d-5ca8-4fac-8578-3161a39fe3a5 priority=MESSAGE_PRIORITY_HIGH content=You are m1_challenger_2.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2\DISPATCH.md
And the worker handoff report at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1\handoff.md

Adversarially challenge M1:
1. Run Axe checks across all 4 skins (walnut, porcelain, obsidian, high-contrast) and all 4 viewports (360x740, 393x852, 768x1024, 1280x800). Assert zero critical and zero serious violations. Verify 7:1 contrast in high-contrast skin and font floor >= 12px.
2. In Arabic RTL mode (lang="ar", dir="rtl"), assert document.documentElement.scrollWidth <= window.innerWidth across all tabs and modals at 360px viewport. Verify physical board invariant: P1 pits (0..5) on bottom, Store 6 on right, Store 13 on left.
3. Rapidly fire 50 key events (ArrowRight, ArrowLeft, Enter) and rapid click events within <250ms to test debounce guard.
4. Populate localStorage with dummy game keys and trigger Zero-PII "Erase My Data"; assert complete purge of all mancala_* keys.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2\handoff.md with an explicit verdict (APPROVE or REJECT).
Notify parent via send_message.
