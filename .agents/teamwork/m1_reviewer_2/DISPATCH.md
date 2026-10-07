# DISPATCH: m1_reviewer_2 (A11y, i18n & E2E Reviewer)

## Task Assignment
- **Agent**: `m1_reviewer_2`
- **Role**: `teamwork_preview_reviewer`
- **Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2`
- **Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`
- **Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## Mandatory Inputs to Read:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md`
2. `c:\Users\vjbel\hacks\mymancala\PROJECT.md`
3. Worker Handoff Report: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1\handoff.md`

## Review Scope:
1. Inspect accessibility & ergonomics:
   - Dynamic font scale CSS tokens with hard floor >= 12px.
   - High contrast skin in `src/theme.ts` (7:1 contrast ratio, WCAG AAA).
   - Patterned pebbles in `src/Pebble.tsx` (stripes, dots, rings) for non-color discrimination.
   - Keyboard 2D navigation and modal focus trap in `src/lib/a11y.ts`.
   - Web Speech API in `src/lib/speech.ts` and zero-PII data reset in `src/lib/dataReset.ts`.
   - Big mode (>= 56px tap targets) and `LiveAnnouncer.tsx`.
2. Inspect i18n, RTL & Tutorial:
   - Strongly typed catalogs (`en.ts`, `ar.ts`, `es.ts`) with 100% key parity.
   - Native `Intl.PluralRules` handling all 6 Arabic plural forms.
   - RTL `<html dir="rtl" lang="ar">` with physical board strictly unmirrored via `<div dir="ltr">`.
   - 8-step mini-board tutorial (`TutorialModal.tsx`, `miniKalah.ts`) and `AudiencePickerModal.tsx`.
3. Run verification:
   - `npm run build`
   - `npx playwright test` across all 4 viewports.

Provide an explicit verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\handoff.md`
Notify parent when done.


## 2026-10-07T04:08:20Z
You are m1_reviewer_2.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\DISPATCH.md
And the worker handoff report at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1\handoff.md

Review the M1 implementation:
1. Accessibility & Ergonomics: Dynamic font scale CSS tokens (>=12px floor), high-contrast skin in theme.ts (7:1 contrast, WCAG AAA), patterned pebbles in Pebble.tsx, keyboard 2D navigation and modal focus trap in a11y.ts, Web Speech API in speech.ts, zero-PII data reset in dataReset.ts, Big Mode (>= 56px), LiveAnnouncer.tsx.
2. i18n, RTL & Tutorial: Strongly typed catalogs (en.ts, ar.ts, es.ts) with 100% key parity, Intl.PluralRules with all 6 Arabic forms, RTL <html dir="rtl"> with physical board strictly unmirrored via <div dir="ltr">, 8-step mini-board tutorial, AudiencePickerModal.tsx.
3. Run npm run build and npx playwright test across all 4 viewports.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\handoff.md with an explicit verdict (APPROVE or REQUEST_CHANGES).
Notify parent via send_message.
