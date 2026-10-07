# Progress Log — m1_worker_1

Last visited: 2026-10-07T03:01:20Z

## Milestone M1: Phase 1 (Calm UI, Accessibility, Languages, Onboarding)

### Current Status: IN PROGRESS

### Execution Checklist:
- [ ] Install `@axe-core/playwright`
- [ ] Track 1: Highlights & 7 Lenses Architecture
  - [ ] `src/components/board/highlights.ts`
  - [ ] Refactor `src/components/board/PitButton.tsx` (350ms touch preview, single role)
  - [ ] Update `src/lenses.ts` (7 canonical lenses, presets, backward-compatible aliases)
  - [ ] Move speed row from `TurnBanner.tsx` to `SettingsPanel.tsx`; gate hints button
  - [ ] Empty state in `AnalysisPanel.tsx` with `data-testid="enable-coach-btn"`
  - [ ] `src/i18n/glossary.ts` & glossary popup
  - [ ] `src/components/modals/HighlightLegendModal.tsx`
- [ ] Track 2: Accessibility & Ergonomics
  - [ ] `src/index.css` font scale `--font-scale` and floor >= 12px
  - [ ] `src/theme.ts` high-contrast skin (WCAG AAA 7:1)
  - [ ] `src/Pebble.tsx` pattern discrimination (stripes, dots, rings)
  - [ ] `src/lib/a11y.ts` (arrow key nav, modal focus trap, 250ms tap debounce)
  - [ ] `src/lib/speech.ts` (Web Speech API)
  - [ ] `src/lib/dataReset.ts` (Erase My Data)
  - [ ] `src/components/shell/LiveAnnouncer.tsx`
  - [ ] Big mode, ARIA labels in `Board.tsx`, `PitButton.tsx`, `StorePit.tsx`
  - [ ] Settings panel updates (font scale, high contrast, reduced motion, big mode, speech, erase data)
- [ ] Track 3: i18n, RTL & Tutorial
  - [ ] `src/i18n/types.ts`
  - [ ] `src/i18n/en.ts`
  - [ ] `src/i18n/ar.ts`
  - [ ] `src/i18n/es.ts`
  - [ ] `src/i18n/index.ts` / `useTranslation.ts`
  - [ ] RTL mode with unmirrored board `<div dir="ltr">`
  - [ ] `src/components/modals/TutorialModal.tsx` (8-step 2x3 mini-board)
  - [ ] `src/components/modals/AudiencePickerModal.tsx`
  - [ ] App.tsx integration (< 300 lines)
- [ ] Track 4: Verification & Tests
  - [ ] Unit tests: `highlights.test.ts`, `i18n.test.ts`, `a11y.test.ts`
  - [ ] Playwright E2E: `e2e/a11y.spec.ts`, `e2e/rtl.spec.ts`, `e2e/tutorial.spec.ts`
  - [ ] Verification gates (`tsc --noEmit`, `npm test`, `npm run build`, `npm run test:e2e`)
  - [ ] Update `docs/plan/PROGRESS.md`
  - [ ] Handoff report `handoff.md`
