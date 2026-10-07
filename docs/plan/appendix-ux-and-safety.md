# Appendix: UX principles, tone, kid-safety, accessibility checklist

## Principles
1. **Game first.** Default screen = board + whose turn + 5-item tray. Anything else is opt-in.
2. **Stats are never in your face.** Every stat belongs to a lens, toggleable at any time, with presets; the app never auto-enables stats.
3. **Truth over drama.** No fabricated percentages. Label `exact` vs `estimate`. Prefer "about +2 stones" over a scary number. Coach tone is encouraging, never shaming.
4. **One highlight, one meaning.** See highlight table in phase 1.2.
5. **No horizontal scroll, ever.** Test at 360 px in every language.
6. **The computer is patient.** Normal ≈ 1.2 s per bot move, slow ≈ 1.6 s; never flashes through moves.
7. **Forgiving.** Undo always available in casual play; misclick protection in big mode.
8. **Calm motion.** Respect reduced motion; no flashing > 3/sec.

## Tray
Exactly 5 fixed items: Board, Analysis, Coach, Rules, Settings. The Rules button lives only in the tray. Do not add a sixth; new features nest inside Coach or Settings.

## Tone guide
- Short sentences, grade-4 reading level for default copy; expert terms only behind the glossary.
- Positive framing: "Nice find!" / "A stronger move was pit 4" instead of "Blunder".
- No "AI" branding; coach is "Coach". No dark patterns: no guilt streaks, countdowns, or purchases.

## Kid safety and privacy
- No accounts, ads, analytics, third-party scripts, or external fonts/CDNs at runtime.
- No free-text input visible to other players; friend play uses room link + fixed emoji only.
- Data is local (`localStorage`); provide "Erase my data" in Settings (clears all `mancala_*` keys and the service-worker caches on confirm).
- Result cards contain no personal info. In-app privacy note must match reality (update it whenever the relay changes).
- Do not collect age; audience picker only changes defaults.
- COPPA/GDPR-K stance: no personal data collected, so no consent flows needed; re-check legal if telemetry is ever added (requires a new decision).

## Design tokens (`src/theme/tokens.ts`)
- Colours via CSS variables per skin (`--bg`, `--surface`, `--ink`, `--accent`, `--good`, `--warn`, `--bad`, pebble set). Every skin must pass WCAG AA (4.5:1 text, 3:1 UI) and the high-contrast skin AAA.
- Type scale (rem, multiplied by `--font-scale`): 0.875 / 1 / 1.125 / 1.5 / 2. No text below 12 px at default scale.
- Spacing 4-px grid; tap targets >= 44 px (>= 56 px in big mode); radius tokens; motion tokens with a reduced-motion variant.
- Materials: warm wood, clay, slate; soft shadows; pebbles with distinct shapes for colour-blind support.

## Accessibility checklist (run before each release)
- [ ] axe-core: no serious/critical issues on board, analysis, coach, rules, settings, review.
- [ ] Keyboard-only: can play a full game, open/close every modal, focus never lost.
- [ ] Screen reader: moves announced; pits have meaningful labels; headings in order.
- [ ] 200% browser zoom and XL text: no clipped or overlapping UI, no horizontal scroll.
- [ ] Contrast checked for all skins; colour is never the only signal.
- [ ] Reduced motion honoured. No flashing content.
- [ ] RTL (ar) visually checked; board not mirrored; text aligned correctly.
- [ ] Lighthouse mobile: Performance >= 90, Accessibility >= 95, PWA installable.

## Performance budget
- JS gzip < 250 KB initial (lazy-load review, stories, puzzles, other variants).
- First interaction < 100 ms on a mid-range phone; search always off main thread after phase 0.
