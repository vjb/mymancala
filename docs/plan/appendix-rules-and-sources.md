# Appendix: rules and sources

> Everything below marked **VERIFY** must be checked against at least two independent sources before being coded or shown to players. Record the sources used in the PR/commit and in `src/stories` or rules text. Exact margins and "solved" claims depend on the exact rule variant.

## Kalah (shipping now)
Current code: 14 pits, 6 pits per side, stores at index 6 and 13, 4 stones per pit, opposite pit = `12 - i`, options `freeTurn` (last stone in own store = go again) and `captureOpposite` (last stone in empty own pit captures opposite if non-empty). Game ends when one side is empty; the other side sweeps remaining stones into its store. Source of truth is `src/engine.ts` and its tests. Stone-count variants (e.g. 3 or 4 per pit) are options, not defaults.

## Oware (Abapa) — VERIFY
- 12 pits, 4 stones each, counter-clockwise; sowing skips the origin pit when a move has >= 12 stones.
- Capture: if the last stone makes an opponent pit hold 2 or 3, capture it and continue backwards through consecutive opponent pits with 2–3.
- Must give opponent a move if possible; **grand slam** (capturing all opponent pits): rule differs by source (capture nothing / illegal / allowed). Choose one, document, expose others only if tested.
- Game end: a player reaches 25 stones; or no legal move -> remaining stones go to the player who can't be fed or side owner per source. **VERIFY** endless-cycle handling (split remaining stones).
- Solving: full game solved by Romein & Bal (2002), database of ~10^11 positions (**VERIFY** numbers); not shippable in a PWA. Only small endgames can be exact.

## Sow & Score (original teaching variant)
Our own invention: simple sowing, no captures, pits owned per side, stones that end in your store score. State clearly in-app that it is a teaching version, not a traditional game. Do not call it Ayo/Awale.

## Congkak / Dakon — VERIFY, beta
Rules vary widely by region (board sizes 5–16 holes, number of stones, sowing direction, loop rules, "burning"). Pick one documented version, label `beta`, show "Rules vary by region".

## Bao la Kiswahili — VERIFY, beta/optional
Four rows, 32 holes, nyumba, two phases (namua and mtaji), kutakatia and kichwa rules. Complex; implement only from a cited detailed source plus test positions from that source. If unsure, leave flagged off.

## Candidate sources (check currency and accuracy)
- Mancala World wiki (mancala.fandom.com) for variant rule summaries.
- Oware: Romein & Bal, "Solving Awari with Parallel Retrograde Analysis", IEEE Computer 2003.
- Kalah: Irving, Donkers, Uiterwijk, "Solving Kalah", ICGA Journal 2000.
- Federation rules for Oware (e.g. Abapa rule sheet), World Oware Society.
- Murray, H.J.R., "A History of Board-Games Other Than Chess" (1952) for history claims.
- Bao: Donkers, de Voogt, Uiterwijk, "Human versus machine problem-solving: winning openings in Dakon" (2000) for Dakon; academic papers on Bao strategies by de Voogt.

## Naming and respect rules
- Use traditional names with local spellings plus a plain-language description.
- Never claim a game "originated" in a place without a cited source.
- Cultural text is short, factual and cited; if unsure, cut it.
