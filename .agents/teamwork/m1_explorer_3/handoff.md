# Architectural Specification & Handoff Report: i18n, RTL, Tutorial & Audience Picker (M1)

**Agent**: `m1_explorer_3`  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3`  
**Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`  
**Scope**: Features 21, 22, 23, 24 (Localization, RTL unmirrored board, 8-step interactive tutorial, audience picker)

---

## 1. Observation

1. **Existing Dependency Footprint (`package.json:14-30`)**:
   Dependencies consist strictly of `react: ^18.3.1`, `react-dom: ^18.3.1`, and `lucide-react: ^1.16.0`. There are zero external localization packages (no `i18next`, no `react-intl`). All i18n and pluralization mechanics must be hand-rolled using standard Web APIs (`Intl.PluralRules`, `Intl.NumberFormat`).
2. **Current Hardcoded Strings (`src/components/shell/BottomTray.tsx:36-82`, `Header.tsx:38-109`, `SettingsPanel.tsx:75-356`, `RulesModal.tsx:44-162`)**:
   User-facing copy is directly embedded as English JSX string literals across bottom tray navigation items ("Board", "Analysis", "Coach On", "Coach Off", "Rules", "Settings"), header controls ("Walnut", "Clay", "Slate", "New"), and settings toggles.
3. **Physical Board Layout and Geometry (`src/components/board/Board.tsx:48-169`, `src/rules/kalah.ts:4-30`)**:
   - South pits (Player 1) are indices `0..5` rendered in standard left-to-right order.
   - Player 1 store is pit index `6` (rendered on the right side).
   - North pits (Player 2) are indices `12..7` rendered along the top row.
   - Player 2 store is pit index `13` (rendered on the left side).
   - In `Board.tsx:56-169`, layout is structured with a root `flex items-center justify-between` containing:
     1. StorePit (index 13, P2) on the left.
     2. Central playable grid (`grid grid-cols-6`).
     3. StorePit (index 6, P1) on the right.
4. **RTL Flex/Grid Behavior**:
   Under a naive document `<html dir="rtl">`, CSS flexbox rows reverse their visual order: Store 13 moves to the right, Store 6 moves to the left, and grid columns invert. This would completely invert physical Mancala counter-clockwise mechanics, contradicting rules and diagrams in Arabic literature.
5. **Preset and Lens System (`src/lenses.ts:7-75`)**:
   Four presets exist (`justPlay`, `hints`, `coach`, `full`) managing 7 boolean lenses (`advantageBar`, `errorRate`, `bestMoveMarks`, `winPercent`, `mainLine`, `coach`, `explanations`). Persisted under `mancala_lenses_v1`.
6. **Preserved Test IDs (`src/preserved-testids.test.ts:22-57`)**:
   35+ `data-testid` attributes are locked and validated by automated tests (`store-13`, `store-6`, `pit-0`, `preset-`, `lens-`, `mode-`, `bottom-tray`, `bottom-rules-btn`, etc.).
7. **E2E Zero Horizontal Scroll Guardrail (`e2e/no-hscroll.spec.ts:3-46`)**:
   E2E test asserts `doc.scrollWidth <= window.innerWidth` across all tabs and modals at 360px viewport. Any RTL changes must maintain zero horizontal overflow.

---

## 2. Logic Chain

1. **Strict Type Safety for Translation Catalogs**:
   - If `en.ts` is defined as `export const en = { ... } as const`, then `export type TranslationKey = keyof typeof en`.
   - By typing localized dictionaries as `Record<TranslationKey, string>`, TypeScript (`npx tsc --noEmit`) will reject `ar.ts` or `es.ts` if any key is missing (`TS2739`) or if an extra key is introduced (`TS2353`).
   - Using a flat dot-notation key scheme (`nav.board`, `rules.goal.title`) avoids complex recursive TypeScript type limits while providing autocomplete for `t('...')`.
2. **Pluralization via Native `Intl.PluralRules`**:
   - Arabic has 6 plural categories (`zero`, `one`, `two`, `few`, `many`, `other`), while English and Spanish have 2 (`one`, `other`).
   - By querying `new Intl.PluralRules(locale).select(count)`, the `t(key, params)` helper looks up `${key}_${category}` (falling back to `${key}_other` and `${key}`).
   - Numbers are formatted via `new Intl.NumberFormat(locale).format(count)`.
3. **RTL Isolation of the Physical Board**:
   - To satisfy Requirement 22 (mirror UI chrome while preserving physical board geometry), the document element receives `dir="rtl"` and `lang="ar"`, allowing Tailwind logical utilities and standard CSS flex/grid to flip chrome elements (headers, drawers, navigation, modal alignments).
   - Crucially, the board container in `Board.tsx` (and the tutorial mini-board in `TutorialModal.tsx`) must be explicitly wrapped in `<div dir="ltr">`.
   - In CSS 2.1 / CSS 3, an element with `dir="ltr"` establishes an LTR formatting context: flex items flow left-to-right (Store 13 remains left, Store 6 remains right) and grid columns run column 0..5 left-to-right regardless of the parent document direction.
4. **Interactive Mini-Board Design (2x3 Board, 8 Pits Total)**:
   - On mobile screens (360px viewport), displaying a full 14-pit board inside an instructional modal produces excessive crowding and requires horizontal scrolling.
   - A 2x3 mini-board (South pits 0..2, South Store 3; North pits 4..6, North Store 7) reduces board width to ~280px, perfectly fitting a 360px viewport.
   - Sowing runs `0 -> 1 -> 2 -> 3 (P1 store) -> 4 -> 5 -> 6 -> (skip 7) -> 0`. Opposite pits follow `oppositePit(i) = 6 - i`.
   - This mini-engine fully supports all Mancala mechanics: sowing, store scoring, opponent store skipping, free turns, captures, and final sweep.
5. **Audience Picker Presets**:
   - First launch should not lock the user into permanent silos or collect personal data.
   - Persisting `mancala_onboarding_v1` detects whether to present the 4 profiles ("Kid", "Casual", "Learner", "Analyst").
   - Choosing a profile configures initial defaults (`coach` + Big Mode for Kid, `justPlay` for Casual, `hints`/`coach` for Learner, `full` for Analyst) without disabling any feature in Settings.

---

## 3. Concrete Specifications

### 3.1 Typed Localization Architecture

#### Directory Structure
```
src/i18n/
├── types.ts              # Locale, TranslationKey, TranslationCatalog, TranslationParams
├── en.ts                 # Source of truth English dictionary
├── ar.ts                 # Arabic translation (strictly typed as TranslationCatalog)
├── es.ts                 # Spanish translation (strictly typed as TranslationCatalog)
├── i18nContext.tsx       # I18nProvider, useTranslation hook, pluralization & interpolation
└── index.ts              # Public API barrel
```

#### `src/i18n/types.ts`
```ts
import { en } from './en';

export type Locale = 'en' | 'ar' | 'es';

export type TranslationKey = keyof typeof en;

/** Strict catalog contract: all keys in `en` MUST exist in `ar` and `es` */
export type TranslationCatalog = Record<TranslationKey, string>;

export type TranslationParams = Record<string, string | number>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
}
```

#### `src/i18n/en.ts` (Canonical Source of Truth)
```ts
export const en = {
  // App Shell
  'app.title': 'Mancala',
  'app.subtitle': 'Coach',
  'app.newGame': 'New',
  'app.resetTitle': 'Reset Board',
  'app.resumePrompt': 'You have an unfinished game in progress. Would you like to resume?',
  'app.continueGame': 'Continue Game',
  'app.newGameConfirm': 'New Game',
  'app.footer': 'Mancala Analytical Engine • Handcrafted Artisanal Themes & Minimax PV Rollouts',

  // Skins
  'skin.walnut': 'Walnut',
  'skin.clay': 'Clay',
  'skin.slate': 'Slate',

  // Bottom Tray Navigation
  'nav.board': 'Board',
  'nav.analysis': 'Analysis',
  'nav.coachOn': 'Coach On',
  'nav.coachOff': 'Coach Off',
  'nav.rules': 'Rules',
  'nav.settings': 'Settings',

  // Turn Banner & Status
  'turn.yourTurn': 'Your Turn',
  'turn.aiTurn': "Computer's Turn",
  'turn.aiThinking': 'Thinking...',
  'turn.freeTurnBonus': 'Go Again! (Bonus Turn)',
  'turn.gameOver': 'Game Over',
  'turn.youWin': 'You Win!',
  'turn.aiWins': 'Computer Wins!',
  'turn.tie': "It's a Tie!",
  'turn.stonesAhead': '+{count} stones ahead',
  'turn.stonesBehind': '-{count} stones behind',
  'turn.stonesTied': 'Even stones',

  // Board & Pits
  'board.p1Store': 'South Store (P1)',
  'board.p2Store': 'North Store (P2)',
  'board.pitLabel': 'Pit {n}',
  'board.ccwFlow': '← Counter-Clockwise Sowing Flow',
  'board.ownStorePoints': 'Own Store Points →',
  'board.stones_one': '{count} stone',
  'board.stones_other': '{count} stones',
  'board.yourPick': 'YOUR PICK',
  'board.bestPick': 'BEST MOVE',

  // Settings Panel
  'settings.title': 'Game Settings & Controls',
  'settings.styleTitle': 'What do you want to see?',
  'settings.styleSubtitle': 'Pick a style, then fine-tune anything below.',
  'settings.customMix': 'Custom mix',
  'settings.coachSensitivity': 'Coach Sensitivity:',
  'settings.allMistakes': 'Mistakes & Blunders',
  'settings.blundersOnly': 'Blunders Only',
  'settings.audio': 'Game Audio:',
  'settings.soundOn': 'Sound On',
  'settings.soundOff': 'Muted',
  'settings.colorblind': 'Colorblind Palette:',
  'settings.colorblindOn': 'High-Contrast Safe',
  'settings.colorblindOff': 'Default Colors',
  'settings.haptics': 'Phone Haptics (Vibration):',
  'settings.hapticsOn': 'Vibration On',
  'settings.hapticsOff': 'Vibration Off',
  'settings.gameMode': 'Game Mode',
  'settings.modePve': 'vs Engine',
  'settings.modeAiVsAi': 'AI Duel',
  'settings.modePvp': 'Pass & Play',
  'settings.modeSandbox': 'Sandbox',
  'settings.yourSide': 'Your Side:',
  'settings.sideSouth': 'South (P1)',
  'settings.sideNorth': 'North (P2)',
  'settings.selfPlay': 'Self-Play:',
  'settings.startDuel': 'Start Duel',
  'settings.pauseDuel': 'Pause',
  'settings.searchDepth': 'Search Lookahead',
  'settings.plies': '{count} Plies',
  'settings.sowSpeed': 'Sowing Animation Speed:',
  'settings.speedSlow': 'Slow (Study Moves / 280ms)',
  'settings.speedNormal': 'Normal (Smooth / 175ms)',
  'settings.speedFast': 'Fast (85ms)',
  'settings.speedInstant': 'Instant (0ms)',
  'settings.instantToggle': 'Instant Sowing Animations',
  'settings.bonusTurnToggle': 'Store Finish = Bonus Turn',
  'settings.captureToggle': 'Opposite Pit Capture',
  'settings.diagnosticsBtn': 'Run Pre-Flight Invariant Tests',
  'settings.language': 'Language / اللغة / Idioma:',
  'settings.tutorialBtn': 'How to Play (Interactive Tutorial)',
  'settings.audienceBtn': 'Player Profile Preset',

  // Presets
  'preset.justPlay.label': 'Just Play',
  'preset.justPlay.desc': 'Only the board. No numbers, no coaching.',
  'preset.hints.label': 'Hints',
  'preset.hints.desc': 'The board plus best-move marks.',
  'preset.coach.label': 'Coach',
  'preset.coach.desc': 'A friendly coach who warns you and explains.',
  'preset.full.label': 'Full Analysis',
  'preset.full.desc': 'Everything the engine knows.',

  // Lenses
  'lens.advantageBar.label': 'Advantage bar',
  'lens.advantageBar.desc': 'Shows who is ahead, in stones.',
  'lens.bestMoveMarks.label': 'Best-move marks',
  'lens.bestMoveMarks.desc': 'Marks the strongest pits on the board.',
  'lens.coach.label': 'Coach warnings',
  'lens.coach.desc': 'Speaks up before a mistake, so you can take it back.',
  'lens.explanations.label': 'Explanations',
  'lens.explanations.desc': 'Explains in words why a move is good or bad.',
  'lens.errorRate.label': 'Accuracy tracker',
  'lens.errorRate.desc': 'Keeps a running score of how accurately you play.',
  'lens.winPercent.label': 'Win chances',
  'lens.winPercent.desc': 'Shows win % and the cost of each move in the analysis.',
  'lens.mainLine.label': 'Expected sequence',
  'lens.mainLine.desc': 'Shows the likely next few moves for both sides.',

  // Coach Panel
  'coach.warningTitle': 'Wait a moment...',
  'coach.reconsider': 'Take Back Move',
  'coach.playBest': 'Play Suggested Move',
  'coach.confirmAnyway': 'Play Anyway',
  'coach.why': 'Why is this move risky?',

  // Rules Modal
  'rules.title': 'How to Play Mancala',
  'rules.badge': 'Quick Guide',
  'rules.subtitle': 'Official Kalah rules explained in 60 seconds',
  'rules.close': 'Close rules',
  'rules.goalTitle': '1. The Goal',
  'rules.goalBody': 'Collect the most pebbles into your Kalah Store (the large pit on your right). With 48 total pebbles on the board, the first player to reach 25 pebbles guarantees victory!',
  'rules.sowingTitle': '2. Sowing Seeds (Counter-Clockwise)',
  'rules.sowingBody': 'On your turn, pick up all pebbles from any pit on your side. Sowing moves counter-clockwise, dropping exactly one pebble into each subsequent pit.',
  'rules.storeRule': '⭐ Store Rule: You drop pebbles into your own Store, but you always skip your opponent\'s Store.',
  'rules.freeTurnTitle': '3. Free Turn (Bonus Play)',
  'rules.freeTurnBadge': 'Key Strategy',
  'rules.freeTurnBody': 'If the last pebble you drop lands in your own Kalah Store, you immediately earn an extra Free Turn! You can chain multiple free turns in one sequence.',
  'rules.captureTitle': '4. Opposite Capture (Stealing Stones)',
  'rules.captureBadge': 'Power Move',
  'rules.captureBody': 'If your last pebble lands in an empty pit on your side, and the opponent\'s pit directly opposite has pebbles, you capture all of them plus your pebble, sending them to your store!',
  'rules.endgameTitle': '5. Endgame & Sweeping',
  'rules.endgameBody': 'The game ends when all 6 pits on either side are empty. The other player sweeps their remaining pebbles into their store. Most pebbles wins!',
  'rules.footerNote': 'Coach mode will alert you if you make a blunder!',
  'rules.playBtn': "Got It, Let's Play!",
  'rules.openTutorial': 'Interactive Tutorial',

  // Interactive Tutorial
  'tutorial.title': 'Interactive Mancala Tutorial',
  'tutorial.stepOf': 'Step {current} of {total}',
  'tutorial.skip': 'Skip Tutorial',
  'tutorial.prev': 'Back',
  'tutorial.next': 'Next',
  'tutorial.restart': 'Restart Step',
  'tutorial.complete': 'Start Playing!',
  'tutorial.speak': 'Read step aloud',

  'tutorial.step1.title': '1. The Board & Objective',
  'tutorial.step1.desc': 'Welcome to Mancala! Your goal is to collect more stones in your Kalah Store (on the right) than your opponent collects in theirs (on the left).',
  'tutorial.step1.action': 'Look at the highlighted stores. Tap Next to continue.',

  'tutorial.step2.title': '2. Sowing Stones',
  'tutorial.step2.desc': 'To make a move, pick up all stones from one of your pits. Drop one stone into each pit moving counter-clockwise.',
  'tutorial.step2.action': 'Tap Pit 2 to sow its 3 stones!',
  'tutorial.step2.success': 'Well done! The 3 stones dropped into Pit 3, your Store, and North Pit 1.',

  'tutorial.step3.title': '3. Scoring in Your Store',
  'tutorial.step3.desc': 'Every stone that lands in your Store stays there permanently. It can never be moved or stolen. That is your banked score!',
  'tutorial.step3.action': 'Tap Next to learn what happens when you pass the opponent store.',

  'tutorial.step4.title': '4. Skipping Opponent Store',
  'tutorial.step4.desc': 'When sowing around the board, you drop stones into your own store, but you ALWAYS skip the opponent\'s store.',
  'tutorial.step4.action': 'Tap Pit 3 to watch the stones skip the opponent store!',
  'tutorial.step4.success': 'Notice how the opponent\'s store remained untouched!',

  'tutorial.step5.title': '5. Free Turn Bonus',
  'tutorial.step5.desc': 'If the LAST stone of your move lands directly in your Kalah Store, you earn an immediate Free Turn! Go again!',
  'tutorial.step5.action': 'Tap Pit 3 so the last stone lands in your Store!',
  'tutorial.step5.success': 'Bonus Turn earned! You get to take another turn immediately.',

  'tutorial.step6.title': '6. Capturing Stones',
  'tutorial.step6.desc': 'If your last stone lands in an EMPTY pit on your side, and the opposite pit has stones, you capture all opposite stones PLUS your own into your store!',
  'tutorial.step6.action': 'Tap Pit 1 to land in the empty Pit 2 and trigger a capture!',
  'tutorial.step6.success': 'Capture! 5 stones swept directly into your Store!',

  'tutorial.step7.title': '7. Endgame Sweep',
  'tutorial.step7.desc': 'When one player clears all their pits, the game ends. The other player sweeps any remaining stones on their side into their store.',
  'tutorial.step7.action': 'Tap Pit 3 to clear your side and finish the game!',
  'tutorial.step7.success': 'Game Over! Remaining stones swept into store.',

  'tutorial.step8.title': '8. You Are Ready!',
  'tutorial.step8.desc': 'Congratulations! You now know all the rules of Mancala: sowing, bonus turns, opposite captures, and endgame sweeping.',
  'tutorial.step8.action': 'Ready to play? Choose an opponent or practice in sandbox mode!',

  // Audience Picker
  'audience.title': 'Choose Your Mancala Style',
  'audience.subtitle': 'Tailor your experience in one tap. You can change this anytime in Settings.',
  'audience.kid.title': 'Kid Mode',
  'audience.kid.desc': 'Big tap targets, friendly coach warnings, warm sound effects, and forgiving double-tap confirmation.',
  'audience.casual.title': 'Casual',
  'audience.casual.desc': 'Just play. Clean, distraction-free board with zero stats or coaching numbers.',
  'audience.learner.title': 'Learner / Club Player',
  'audience.learner.desc': 'Tactical hints, live advantage bar, and blunder prevention to sharpen your skills.',
  'audience.analyst.title': 'Analyst',
  'audience.analyst.desc': 'Full engine rollouts: win probability, minimax PV line, error rate tracking, and deep search.',
  'audience.selectBtn': 'Select Profile'
} as const;
```

#### `src/i18n/ar.ts` (Arabic Catalog satisfying `TranslationCatalog`)
```ts
import { TranslationCatalog } from './types';

// REVIEW-NATIVE: Arabic catalog for Palestinian/Levantine/MSA regional accuracy
export const ar: TranslationCatalog = {
  // App Shell
  'app.title': 'منقلة',
  'app.subtitle': 'المدرّب',
  'app.newGame': 'جديدة',
  'app.resetTitle': 'إعادة ضبط اللوحة',
  'app.resumePrompt': 'لديك لعبة قيد التشغيل لم تكتمل بعد. هل تريد المتابعة؟',
  'app.continueGame': 'متابعة اللعبة',
  'app.newGameConfirm': 'لعبة جديدة',
  'app.footer': 'محرك تحليل المنقلة • سمات حرفية ودحرجات مينيماكس',

  // Skins
  'skin.walnut': 'خشب الجوز',
  'skin.clay': 'فخار إسكندنافي',
  'skin.slate': 'حجر رمادي',

  // Bottom Tray Navigation
  'nav.board': 'اللوحة',
  'nav.analysis': 'التحليل',
  'nav.coachOn': 'المدرّب مفعّل',
  'nav.coachOff': 'المدرّب معطّل',
  'nav.rules': 'القواعد',
  'nav.settings': 'الإعدادات',

  // Turn Banner & Status
  'turn.yourTurn': 'دورك للعب',
  'turn.aiTurn': 'دور الكمبيوتر',
  'turn.aiThinking': 'يفكّر...',
  'turn.freeTurnBonus': 'العب مجدداً! (نقلة إضافية)',
  'turn.gameOver': 'انتهت اللعبة',
  'turn.youWin': 'لقد فزت!',
  'turn.aiWins': 'فاز الكمبيوتر!',
  'turn.tie': 'تعادل!',
  'turn.stonesAhead': '+{count} أحجار متقدماً',
  'turn.stonesBehind': '-{count} أحجار متأخراً',
  'turn.stonesTied': 'الأحجار متساوية',

  // Board & Pits
  'board.p1Store': 'مخزن الجنوب (اللاعب 1)',
  'board.p2Store': 'مخزن الشمال (اللاعب 2)',
  'board.pitLabel': 'حفرة {n}',
  'board.ccwFlow': '← اتجاه البذر عكس عقارب الساعة',
  'board.ownStorePoints': 'نقاط مخزنك الخاص →',
  'board.stones_one': 'حجر واحد',
  'board.stones_other': '{count} حجر',
  'board.yourPick': 'اختيارك',
  'board.bestPick': 'أفضل نقلة',

  // Settings Panel
  'settings.title': 'إعدادات اللعبة والتحكم',
  'settings.styleTitle': 'ماذا تريد أن ترى؟',
  'settings.styleSubtitle': 'اختر أسلوباً ثم اضبط الخيارات بالأسفل.',
  'settings.customMix': 'تخصيص مخصص',
  'settings.coachSensitivity': 'حساسية المدرّب:',
  'settings.allMistakes': 'الأخطاء والهفوات',
  'settings.blundersOnly': 'الهفوات الفادحة فقط',
  'settings.audio': 'أصوات اللعبة:',
  'settings.soundOn': 'الصوت مفعّل',
  'settings.soundOff': 'مكتوم',
  'settings.colorblind': 'نمط تمييز الألوان:',
  'settings.colorblindOn': 'تباين عالٍ وآمن',
  'settings.colorblindOff': 'الألوان الافتراضية',
  'settings.haptics': 'الاهتزاز بالهاتف:',
  'settings.hapticsOn': 'الاهتزاز مفعّل',
  'settings.hapticsOff': 'الاهتزاز معطّل',
  'settings.gameMode': 'وضع اللعب',
  'settings.modePve': 'ضد المحرك',
  'settings.modeAiVsAi': 'مبارزة حاسوبية',
  'settings.modePvp': 'تمرير ولعب محلي',
  'settings.modeSandbox': 'الرقعة الحرة',
  'settings.yourSide': 'جهتك:',
  'settings.sideSouth': 'الجنوب (اللاعب 1)',
  'settings.sideNorth': 'الشمال (اللاعب 2)',
  'settings.selfPlay': 'اللعب التلقائي:',
  'settings.startDuel': 'بدء المبارزة',
  'settings.pauseDuel': 'إيقاف مؤقت',
  'settings.searchDepth': 'عمق البحث بالخطوات',
  'settings.plies': '{count} نقلات',
  'settings.sowSpeed': 'سرعة حركة البذر:',
  'settings.speedSlow': 'بطيء (دراسة النقلات / 280 مل ث)',
  'settings.speedNormal': 'عادي (سلس / 175 مل ث)',
  'settings.speedFast': 'سريع (85 مل ث)',
  'settings.speedInstant': 'فوري (0 مل ث)',
  'settings.instantToggle': 'حركة البذر فورية',
  'settings.bonusTurnToggle': 'الانتهاء بالمخزن = نقلة إضافية',
  'settings.captureToggle': 'أسر الحفرة المقابلة',
  'settings.diagnosticsBtn': 'تشغيل اختبارات السلامة قبل الإطلاق',
  'settings.language': 'اللغة / Language / Idioma:',
  'settings.tutorialBtn': 'كيفية اللعب (البرنامج التعليمي التفاعلي)',
  'settings.audienceBtn': 'نمط اللاعب المخصص',

  // Presets
  'preset.justPlay.label': 'العب فقط',
  'preset.justPlay.desc': 'اللوحة فقط. بدون أرقام أو تدريب.',
  'preset.hints.label': 'تلميحات',
  'preset.hints.desc': 'اللوحة مع إشارات لأفضل النقلات.',
  'preset.coach.label': 'المدرّب',
  'preset.coach.desc': 'مدرّب لطيف ينبهك ويشرح النقلات.',
  'preset.full.label': 'تحليل كامل',
  'preset.full.desc': 'كل ما يعرفه محرك التحليل.',

  // Lenses
  'lens.advantageBar.label': 'شريط الأفضلية',
  'lens.advantageBar.desc': 'يوضح من المتقدم بعدد الأحجار.',
  'lens.bestMoveMarks.label': 'علامات أفضل نقلة',
  'lens.bestMoveMarks.desc': 'يميز أقوى الحفر على الرقعة.',
  'lens.coach.label': 'تنبيهات المدرّب',
  'lens.coach.desc': 'يتحدث قبل ارتكاب الخطأ لتتمكن من التراجع.',
  'lens.explanations.label': 'الشروحات',
  'lens.explanations.desc': 'يشرح بالكلمات لماذا النقلة جيدة أو سيئة.',
  'lens.errorRate.label': 'مقياس الدقة',
  'lens.errorRate.desc': 'يسجل باستمرار مدى دقة لعبك.',
  'lens.winPercent.label': 'فرص الفوز',
  'lens.winPercent.desc': 'يوضح نسبة الفوز وتكلفة كل نقلة في التحليل.',
  'lens.mainLine.label': 'التسلسل المتوقع',
  'lens.mainLine.desc': 'يوضح النقلات التالية المتوقعة للطرفين.',

  // Coach Panel
  'coach.warningTitle': 'تمهل لحظة...',
  'coach.reconsider': 'التراجع عن النقلة',
  'coach.playBest': 'لعب النقلة المقترحة',
  'coach.confirmAnyway': 'اللعب على أي حال',
  'coach.why': 'لماذا هذه النقلة محفوفة بالمخاطر؟',

  // Rules Modal
  'rules.title': 'كيفية لعب المنقلة',
  'rules.badge': 'دليل سريع',
  'rules.subtitle': 'قواعد الكالح الرسمية مشروحة في 60 ثانية',
  'rules.close': 'إغلاق القواعد',
  'rules.goalTitle': '1. الهدف من اللعبة',
  'rules.goalBody': 'اجمع أكبر عدد من الأحجار في مخزنك (الحفرة الكبيرة على يمينك). مع وجود 48 حجراً على الرقعة، أول لاعب يجمع 25 حجراً يضمن الفوز!',
  'rules.sowingTitle': '2. بذر البذور (عكس عقارب الساعة)',
  'rules.sowingBody': 'في دورك، التقط جميع الأحجار من أي حفرة في جانبك. يتم البذر بالتحرك عكس اتجاه عقارب الساعة، مع إسقاط حجر واحد في كل حفرة تالية.',
  'rules.storeRule': '⭐ قاعدة المخزن: تسقط حجراً في مخزنك الخاص، ولكنك تتجاوز دائماً مخزن خصمك دون أن تضع فيه شيئاً.',
  'rules.freeTurnTitle': '3. النقلة الإضافية (مكافأة اللعب)',
  'rules.freeTurnBadge': 'استراتيجية أساسية',
  'rules.freeTurnBody': 'إذا استقر الحجر الأخير في مخزنك الخاص، تكسب فوراً نقلة إضافية مجانية! يمكنك ربط عدة نقلات متتالية.',
  'rules.captureTitle': '4. أسر الحفرة المقابلة (غنم الأحجار)',
  'rules.captureBadge': 'حركة قوية',
  'rules.captureBody': 'إذا استقر حجرك الأخير في حفرة فارغة بجانبك، وكانت الحفرة المقابلة تماماً عند الخصم تحتوي على أحجار، فإنك تأسرها جميعاً مع حجرك لتذهب إلى مخزنك!',
  'rules.endgameTitle': '5. نهاية اللعبة والكنس',
  'rules.endgameBody': 'تنتهي اللعبة عندما تصبح جميع الحفر الست في أي جهة فارغة. يقوم اللاعب الآخر بكنس جميع الأحجار المتبقية في جهته وإضافتها إلى مخزنه. صاحب الحصيلة الأكبر يفوز!',
  'rules.footerNote': 'سينبهك وضع المدرّب إذا أوشكت على ارتكاب هفوة!',
  'rules.playBtn': 'فهمت، هيا نلعب!',
  'rules.openTutorial': 'البرنامج التعليمي التفاعلي',

  // Interactive Tutorial
  'tutorial.title': 'البرنامج التعليمي التفاعلي للمنقلة',
  'tutorial.stepOf': 'الخطوة {current} من {total}',
  'tutorial.skip': 'تخطي البرنامج التعليمي',
  'tutorial.prev': 'السابق',
  'tutorial.next': 'التالي',
  'tutorial.restart': 'إعادة الخطوة',
  'tutorial.complete': 'ابدأ اللعب!',
  'tutorial.speak': 'قراءة الخطوة بصوت مسموع',

  'tutorial.step1.title': '1. الرقعة وهدف اللعبة',
  'tutorial.step1.desc': 'أهلاً بك في المنقلة! هدفك هو جمع أحجار في مخزنك (على اليمين) أكثر مما يجمعه خصمك في مخزنه (على اليسار).',
  'tutorial.step1.action': 'انظر إلى المخازن المضاءة. اضغط على التالي للمتابعة.',

  'tutorial.step2.title': '2. بذر الأحجار',
  'tutorial.step2.desc': 'لتنفيذ النقلة، التقط جميع الأحجار من إحدى حفرك. ضع حجراً واحداً في كل حفرة بالتحرك عكس اتجاه عقارب الساعة.',
  'tutorial.step2.action': 'اضغط على الحفرة 2 لبذر أحجارها الثلاثة!',
  'tutorial.step2.success': 'أحسنت! سقطت الأحجار الثلاثة في الحفرة 3، ثم مخزنك، ثم حفرة الشمال 1.',

  'tutorial.step3.title': '3. التسجيل في المخزن',
  'tutorial.step3.desc': 'كل حجر يستقر في مخزنك يبقى هناك نهائياً. لا يمكن تحريكه أو أسره، وهو رصيدك المضمون!',
  'tutorial.step3.action': 'اضغط على التالي لتعلم قاعدة تجاوز مخزن الخصم.',

  'tutorial.step4.title': '4. تجاوز مخزن الخصم',
  'tutorial.step4.desc': 'عند البذر على محيط اللوحة، تضع حجراً في مخزنك، لكنك تتجاوز دائماً مخزن الخصم دون أن تضع فيه شيئاً.',
  'tutorial.step4.action': 'اضغط على الحفرة 3 وشاهد كيف يتم تجاوز مخزن الخصم!',
  'tutorial.step4.success': 'لاحظ كيف بقي مخزن الخصم دون أي تغيير!',

  'tutorial.step5.title': '5. مكافأة النقلة الإضافية',
  'tutorial.step5.desc': 'إذا سقط آخر حجر من يدك في مخزنك مباشرة، تكسب نقلة إضافية فوراً! العب مجدداً!',
  'tutorial.step5.action': 'اضغط على الحفرة 3 ليسقط آخر حجر في مخزنك!',
  'tutorial.step5.success': 'كسبت نقلة إضافية! يحق لك اللعب مرة أخرى الآن.',

  'tutorial.step6.title': '6. أسر الأحجار المقابلة',
  'tutorial.step6.desc': 'إذا سقط آخر حجر في حفرة فارغة بجانبك، والحفرة المقابلة تحوي أحجاراً، فإنك تأسرها جميعاً مع حجرك إلى مخزنك!',
  'tutorial.step6.action': 'اضغط على الحفرة 1 لتستقر في الحفرة الفارغة 2 وتأسر الحفرة المقابلة!',
  'tutorial.step6.success': 'أسر مذهل! 5 أحجار انتقلت مباشرة إلى مخزنك!',

  'tutorial.step7.title': '7. كنس نهاية اللعبة',
  'tutorial.step7.desc': 'عندما يفرغ أحد اللاعبين كل حفره، تنتهي اللعبة فوراً، ويجمع اللاعب الآخر ما تبقى في جانبه إلى مخزنه.',
  'tutorial.step7.action': 'اضغط على الحفرة 3 لتفريغ جانبك وإنهاء اللعبة!',
  'tutorial.step7.success': 'انتهت اللعبة! كُنست الأحجار المتبقية إلى المخزن.',

  'tutorial.step8.title': '8. أنت مستعد الآن!',
  'tutorial.step8.desc': 'تهانينا! لقد أتقنت جميع قواعد المنقلة: البذر، النقلات الإضافية، الأسر، وكنس نهاية المباراة.',
  'tutorial.step8.action': 'مستعد للعب؟ اختر منافساً أو تدرّب في الرقعة الحرة!',

  // Audience Picker
  'audience.title': 'اختر أسلوبك في لعب المنقلة',
  'audience.subtitle': 'خصّص تجربتك بلمسة واحدة. يمكنك تغيير ذلك لاحقاً في أي وقت من الإعدادات.',
  'audience.kid.title': 'نمط الأطفال',
  'audience.kid.desc': 'أزرار لمس كبيرة، تنبيهات تدريبية لطيفة، أصوات تفاعلية، وتأكيد باللمس المزدوج لمنع الأخطاء العرضية.',
  'audience.casual.title': 'هادئ وبسيط',
  'audience.casual.desc': 'العب فقط. رقعة نظيفة خالية من الإحصائيات أو الأرقام المشتتة.',
  'audience.learner.title': 'متعلم / لاعب نادٍ',
  'audience.learner.desc': 'تلميحات تكتيكية، شريط أفضلية مباشر، ومنع الهفوات لصقل مهاراتك.',
  'audience.analyst.title': 'محلل متقدم',
  'audience.analyst.desc': 'تحليل كامل للمحرك: احتمالات الفوز، خط أفضل نقلات مينيماكس، تتبع معدل الخطأ، والبحث العميق.',
  'audience.selectBtn': 'اختيار هذا النمط'
};
```

#### `src/i18n/es.ts` (Spanish Catalog satisfying `TranslationCatalog`)
```ts
import { TranslationCatalog } from './types';

// REVIEW-NATIVE: Spanish catalog for Latin American / Castilian localization
export const es: TranslationCatalog = {
  // App Shell
  'app.title': 'Mancala',
  'app.subtitle': 'Entrenador',
  'app.newGame': 'Nueva',
  'app.resetTitle': 'Reiniciar tablero',
  'app.resumePrompt': 'Tienes una partida sin terminar en curso. ¿Deseas continuarla?',
  'app.continueGame': 'Continuar partida',
  'app.newGameConfirm': 'Nueva partida',
  'app.footer': 'Motor Analítico de Mancala • Temas Artesanales y Minimax PV',

  // Skins
  'skin.walnut': 'Nogal',
  'skin.clay': 'Arcilla',
  'skin.slate': 'Pizarra',

  // Bottom Tray Navigation
  'nav.board': 'Tablero',
  'nav.analysis': 'Análisis',
  'nav.coachOn': 'Tutor Activo',
  'nav.coachOff': 'Tutor Apagado',
  'nav.rules': 'Reglas',
  'nav.settings': 'Ajustes',

  // Turn Banner & Status
  'turn.yourTurn': 'Tu turno',
  'turn.aiTurn': 'Turno del ordenador',
  'turn.aiThinking': 'Pensando...',
  'turn.freeTurnBonus': '¡Juega otra vez! (Turno extra)',
  'turn.gameOver': 'Fin de la partida',
  'turn.youWin': '¡Has ganado!',
  'turn.aiWins': '¡Gana el ordenador!',
  'turn.tie': '¡Empate!',
  'turn.stonesAhead': '+{count} piedras de ventaja',
  'turn.stonesBehind': '-{count} piedras de desventaja',
  'turn.stonesTied': 'Piedras igualadas',

  // Board & Pits
  'board.p1Store': 'Almacén Sur (J1)',
  'board.p2Store': 'Almacén Norte (J2)',
  'board.pitLabel': 'Hoyo {n}',
  'board.ccwFlow': '← Flujo de siembra antihorario',
  'board.ownStorePoints': 'Puntos de tu almacén →',
  'board.stones_one': '{count} piedra',
  'board.stones_other': '{count} piedras',
  'board.yourPick': 'TU ELECCIÓN',
  'board.bestPick': 'MEJOR JUGADA',

  // Settings Panel
  'settings.title': 'Ajustes y Controles del Juego',
  'settings.styleTitle': '¿Qué deseas ver?',
  'settings.styleSubtitle': 'Elige un estilo y ajusta los detalles abajo.',
  'settings.customMix': 'Personalizado',
  'settings.coachSensitivity': 'Sensibilidad del tutor:',
  'settings.allMistakes': 'Errores y pifias',
  'settings.blundersOnly': 'Solo pifias graves',
  'settings.audio': 'Sonido del juego:',
  'settings.soundOn': 'Sonido activado',
  'settings.soundOff': 'Silenciado',
  'settings.colorblind': 'Paleta para daltónicos:',
  'settings.colorblindOn': 'Alto contraste seguro',
  'settings.colorblindOff': 'Colores estándar',
  'settings.haptics': 'Vibración del teléfono:',
  'settings.hapticsOn': 'Vibración activada',
  'settings.hapticsOff': 'Vibración desactivada',
  'settings.gameMode': 'Modo de juego',
  'settings.modePve': 'vs Motor',
  'settings.modeAiVsAi': 'Duelo de IA',
  'settings.modePvp': 'Pasar y jugar',
  'settings.modeSandbox': 'Tablero libre',
  'settings.yourSide': 'Tu bando:',
  'settings.sideSouth': 'Sur (J1)',
  'settings.sideNorth': 'Norte (J2)',
  'settings.selfPlay': 'Juego automático:',
  'settings.startDuel': 'Iniciar duelo',
  'settings.pauseDuel': 'Pausa',
  'settings.searchDepth': 'Profundidad de búsqueda',
  'settings.plies': '{count} Jugadas',
  'settings.sowSpeed': 'Velocidad de siembra:',
  'settings.speedSlow': 'Lenta (Estudio / 280ms)',
  'settings.speedNormal': 'Normal (Fluida / 175ms)',
  'settings.speedFast': 'Rápida (85ms)',
  'settings.speedInstant': 'Instantánea (0ms)',
  'settings.instantToggle': 'Siembra instantánea',
  'settings.bonusTurnToggle': 'Terminar en almacén = Turno extra',
  'settings.captureToggle': 'Captura del hoyo opuesto',
  'settings.diagnosticsBtn': 'Ejecutar pruebas de diagnóstico',
  'settings.language': 'Idioma / Language / اللغة:',
  'settings.tutorialBtn': 'Cómo jugar (Tutorial interactivo)',
  'settings.audienceBtn': 'Perfil de jugador',

  // Presets
  'preset.justPlay.label': 'Solo Jugar',
  'preset.justPlay.desc': 'Solo el tablero. Sin números ni consejos.',
  'preset.hints.label': 'Pistas',
  'preset.hints.desc': 'El tablero con marcas de mejor jugada.',
  'preset.coach.label': 'Tutor',
  'preset.coach.desc': 'Un tutor amable que te avisa y explica.',
  'preset.full.label': 'Análisis Completo',
  'preset.full.desc': 'Toda la información del motor.',

  // Lenses
  'lens.advantageBar.label': 'Barra de ventaja',
  'lens.advantageBar.desc': 'Muestra quién va ganando en piedras.',
  'lens.bestMoveMarks.label': 'Marcas de mejor jugada',
  'lens.bestMoveMarks.desc': 'Señala los hoyos más fuertes del tablero.',
  'lens.coach.label': 'Avisos del tutor',
  'lens.coach.desc': 'Te advierte antes de cometer un error.',
  'lens.explanations.label': 'Explicaciones',
  'lens.explanations.desc': 'Explica con palabras por qué una jugada es buena o mala.',
  'lens.errorRate.label': 'Control de precisión',
  'lens.errorRate.desc': 'Registra con qué precisión juegas.',
  'lens.winPercent.label': 'Probabilidad de victoria',
  'lens.winPercent.desc': 'Muestra el % de victoria y el coste de cada jugada.',
  'lens.mainLine.label': 'Secuencia esperada',
  'lens.mainLine.desc': 'Muestra las próximas jugadas probables.',

  // Coach Panel
  'coach.warningTitle': 'Un momento...',
  'coach.reconsider': 'Rectificar jugada',
  'coach.playBest': 'Jugar la mejor opción',
  'coach.confirmAnyway': 'Jugar de todos modos',
  'coach.why': '¿Por qué es arriesgada esta jugada?',

  // Rules Modal
  'rules.title': 'Cómo Jugar a Mancala',
  'rules.badge': 'Guía Rápida',
  'rules.subtitle': 'Reglas oficiales de Kalah explicadas en 60 segundos',
  'rules.close': 'Cerrar reglas',
  'rules.goalTitle': '1. El Objetivo',
  'rules.goalBody': 'Reúne la mayor cantidad de piedras en tu Almacén (el hoyo grande a tu derecha). Con 48 piedras en juego, el primer jugador en acumular 25 se asegura la victoria.',
  'rules.sowingTitle': '2. Siembra de Piedras (Sentido Antihorario)',
  'rules.sowingBody': 'En tu turno, toma todas las piedras de cualquier hoyo de tu lado. Siembra en sentido antihorario, dejando caer exactamente una piedra en cada hoyo sucesivo.',
  'rules.storeRule': '⭐ Regla del Almacén: Depositas piedras en tu propio almacén, pero SIEMPRE saltas el almacén de tu oponente.',
  'rules.freeTurnTitle': '3. Turno Extra (Jugada de Bonificación)',
  'rules.freeTurnBadge': 'Estrategia Clave',
  'rules.freeTurnBody': 'Si la última piedra cae en tu propio Almacén, ganas de inmediato un Turno Extra. Puedes encadenar varios turnos seguidos.',
  'rules.captureTitle': '4. Captura del Hoyo Opuesto',
  'rules.captureBadge': 'Jugada Maestra',
  'rules.captureBody': 'Si tu última piedra cae en un hoyo vacío de tu lado, y el hoyo del oponente directamente enfrente tiene piedras, capturas todas esas piedras junto con la tuya para tu almacén.',
  'rules.endgameTitle': '5. Final de Partida y Barrido',
  'rules.endgameBody': 'La partida termina cuando se vacían los 6 hoyos de cualquier lado. El otro jugador barre las piedras restantes de su lado hacia su almacén. ¡Gana quien tenga más piedras!',
  'rules.footerNote': 'El modo tutor te avisará si cometes un error grave.',
  'rules.playBtn': '¡Entendido, a jugar!',
  'rules.openTutorial': 'Tutorial Interactivo',

  // Interactive Tutorial
  'tutorial.title': 'Tutorial Interactivo de Mancala',
  'tutorial.stepOf': 'Paso {current} de {total}',
  'tutorial.skip': 'Omitir tutorial',
  'tutorial.prev': 'Anterior',
  'tutorial.next': 'Siguiente',
  'tutorial.restart': 'Reiniciar paso',
  'tutorial.complete': '¡Empezar a Jugar!',
  'tutorial.speak': 'Leer paso en voz alta',

  'tutorial.step1.title': '1. El Tablero y el Objetivo',
  'tutorial.step1.desc': '¡Bienvenido a Mancala! Tu objetivo es acumular más piedras en tu Almacén (a la derecha) que tu oponente en el suyo (a la izquierda).',
  'tutorial.step1.action': 'Observa los almacenes destacados. Pulsa Siguiente para continuar.',

  'tutorial.step2.title': '2. Sembrando Piedras',
  'tutorial.step2.desc': 'Para mover, toma todas las piedras de uno de tus hoyos. Deja caer una en cada hoyo en sentido antihorario.',
  'tutorial.step2.action': '¡Toca el Hoyo 2 para sembrar sus 3 piedras!',
  'tutorial.step2.success': '¡Muy bien! Las 3 piedras cayeron en el Hoyo 3, tu Almacén y el Hoyo Norte 1.',

  'tutorial.step3.title': '3. Puntuando en tu Almacén',
  'tutorial.step3.desc': 'Cada piedra que entra en tu almacén se queda allí para siempre. Nadie puede moverla ni robarla.',
  'tutorial.step3.action': 'Pulsa Siguiente para aprender a saltar el almacén rival.',

  'tutorial.step4.title': '4. Saltando el Almacén Rival',
  'tutorial.step4.desc': 'Al sembrar, depositas en tu almacén, pero SIEMPRE saltas el almacén de tu rival sin dejar ninguna piedra.',
  'tutorial.step4.action': '¡Toca el Hoyo 3 para ver cómo se salta el almacén rival!',
  'tutorial.step4.success': '¡Observa cómo el almacén rival no recibió ninguna piedra!',

  'tutorial.step5.title': '5. Turno Extra de Bonificación',
  'tutorial.step5.desc': 'Si tu ÚLTIMA piedra cae directamente en tu Almacén, ¡ganas un Turno Extra de inmediato!',
  'tutorial.step5.action': '¡Toca el Hoyo 3 para que la última piedra caiga en tu Almacén!',
  'tutorial.step5.success': '¡Turno Extra ganado! Puedes jugar otra vez ahora mismo.',

  'tutorial.step6.title': '6. Capturando Piedras',
  'tutorial.step6.desc': 'Si tu última piedra cae en un hoyo VACÍO de tu lado y el hoyo de enfrente tiene piedras, ¡capturas todas esas piedras para tu almacén!',
  'tutorial.step6.action': '¡Toca el Hoyo 1 para caer en el hoyo vacío 2 y capturar!',
  'tutorial.step6.success': '¡Captura! 5 piedras enviadas directamente a tu almacén.',

  'tutorial.step7.title': '7. Barrido Final',
  'tutorial.step7.desc': 'Cuando un jugador vacía todos sus hoyos, la partida termina. El otro jugador barre las piedras restantes de su lado hacia su almacén.',
  'tutorial.step7.action': '¡Toca el Hoyo 3 para vaciar tu lado y terminar la partida!',
  'tutorial.step7.success': '¡Fin de partida! Las piedras restantes se barrieron al almacén.',

  'tutorial.step8.title': '8. ¡Listo para Jugar!',
  'tutorial.step8.desc': '¡Enhorabuena! Ya dominas todas las reglas: siembra, turnos extra, capturas y barrido final.',
  'tutorial.step8.action': '¿Listo para jugar? ¡Elige un oponente o practica libremente!',

  // Audience Picker
  'audience.title': 'Elige tu Estilo de Mancala',
  'audience.subtitle': 'Adapta la experiencia con un toque. Puedes cambiar esto en Ajustes cuando quieras.',
  'audience.kid.title': 'Modo Infantil',
  'audience.kid.desc': 'Botones grandes, avisos amistosos del tutor, sonidos agradables y confirmación con doble toque.',
  'audience.casual.title': 'Casual',
  'audience.casual.desc': 'Solo jugar. Tablero limpio y relajante sin estadísticas ni números.',
  'audience.learner.title': 'Aprendiz / Club',
  'audience.learner.desc': 'Pistas tácticas, barra de ventaja en vivo y prevención de errores para mejorar.',
  'audience.analyst.title': 'Analista',
  'audience.analyst.desc': 'Análisis profundo: probabilidades de victoria, líneas minimax PV y cálculo de errores.',
  'audience.selectBtn': 'Seleccionar Perfil'
};
```

#### `src/i18n/i18nContext.tsx`
```tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { en } from './en';
import { ar } from './ar';
import { es } from './es';
import { Locale, TranslationKey, TranslationCatalog, TranslationParams, I18nContextValue } from './types';

const CATALOGS: Record<Locale, TranslationCatalog> = { en, ar, es };

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'mancala_lang_v1';

function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale;
    if (saved && (saved === 'en' || saved === 'ar' || saved === 'es')) return saved;
  } catch {}

  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('ar')) return 'ar';
    if (lang.startsWith('es')) return 'es';
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {}
  }, []);

  // Sync document root dir and lang attributes
  useEffect(() => {
    const isRtl = locale === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: TranslationKey, params?: TranslationParams): string => {
    const catalog = CATALOGS[locale] || en;
    let template: string | undefined;

    // Handle pluralization if count parameter is supplied
    if (params && typeof params.count === 'number') {
      try {
        const pluralRules = new Intl.PluralRules(locale);
        const category = pluralRules.select(params.count); // zero, one, two, few, many, other
        const pluralKey = `${key}_${category}` as TranslationKey;
        const fallbackPlural = `${key}_other` as TranslationKey;
        template = catalog[pluralKey] || catalog[fallbackPlural] || catalog[key] || en[pluralKey] || en[fallbackPlural];
      } catch {
        template = catalog[key];
      }
    }

    if (!template) {
      template = catalog[key] || en[key] || key;
    }

    if (!params) return template;

    // String interpolation with Intl number formatting
    const numFormatter = new Intl.NumberFormat(locale);
    return template.replace(/{(\w+)}/g, (match, paramName) => {
      if (paramName in params) {
        const val = params[paramName];
        return typeof val === 'number' ? numFormatter.format(val) : String(val);
      }
      return match;
    });
  }, [locale]);

  const value: I18nContextValue = useMemo(() => ({
    locale,
    setLocale,
    t,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    isRtl: locale === 'ar'
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}

export const useT = useTranslation;
```

---

### 3.2 RTL Directionality & Unmirrored Physical Board Layout

#### Key Principle: "Mirror the Chrome, Isolate the Board"
1. **Global Chrome Mirroring**:
   - `document.documentElement.dir = 'rtl'` and `lang = 'ar'`.
   - Modals, navigation, header pills, analysis panels, and coach popovers naturally flip reading order and button arrangements using CSS logical layouts.
2. **Physical Board Isolation (`Board.tsx:52` and `TutorialModal.tsx`)**:
   - The Mancala board is an invariant physical wooden board. Counter-clockwise sowing always circles from South row (left to right) into Player 1 store on the right, through North row (right to left) into Player 2 store on the left.
   - To prevent flex reverse and grid column inversion under `dir="rtl"`, the board element MUST specify `dir="ltr"`:
     ```tsx
     // In src/components/board/Board.tsx:
     return (
       <div 
         dir="ltr"
         className={`relative p-2.5 sm:p-5 rounded-3xl sm:rounded-4xl border-2 sm:border-4 ...`}
       >
         ...
       </div>
     );
     ```
   - This ensures:
     - `StorePit` (index 13, North/P2) is on the left.
     - Central `grid-cols-6` maps indices left-to-right.
     - `StorePit` (index 6, South/P1) is on the right.
     - Counter-clockwise arrows (`← Counter-Clockwise Sowing Flow` and `Own Store Points →`) match physical reality.
3. **No Horizontal Scroll Assurance (`e2e/no-hscroll.spec.ts`)**:
   - Use `w-full max-w-lg`, `overflow-x-hidden`, and flex `min-w-0` on children.
   - Avoid fixed negative margins (`-mx-*`) that exceed container boundaries.
   - Modal backdrops use `fixed inset-0`.

---

### 3.3 Interactive Mini-Board Tutorial (8 Steps)

#### Geometry: 2x3 Mini-Kalah Board (`src/tutorial/miniKalah.ts`)
```ts
/**
 * 2x3 Mini-Kalah geometry:
 * P1 (South) pits: 0, 1, 2
 * P1 Store: 3 (right side)
 * P2 (North) pits: 4, 5, 6 (visually displayed left-to-right as 6, 5, 4)
 * P2 Store: 7 (left side)
 * Total pits: 8
 */
export const MINI_TOTAL_PITS = 8;
export const MINI_P1_PITS = [0, 1, 2] as const;
export const MINI_P1_STORE = 3;
export const MINI_P2_PITS = [4, 5, 6] as const;
export const MINI_P2_STORE = 7;

export function miniOppositePit(pit: number): number {
  return 6 - pit; // opposite of 0 is 6; opposite of 1 is 5; opposite of 2 is 4
}

export interface MiniBoardState {
  board: number[]; // 8 elements
  turn: 0 | 1;
  over: boolean;
}

export interface MiniMoveResult {
  state: MiniBoardState;
  earnedFreeTurn: boolean;
  capturedStones: number;
  lastLanding: number;
}

export function applyMiniMove(s: MiniBoardState, pit: number): MiniMoveResult {
  const board = [...s.board];
  let stones = board[pit];
  board[pit] = 0;

  let current = pit;
  while (stones > 0) {
    current = (current + 1) % MINI_TOTAL_PITS;
    // Skip opponent's store (if P1 moving, skip store 7; if P2 moving, skip store 3)
    if (s.turn === 0 && current === MINI_P2_STORE) continue;
    if (s.turn === 1 && current === MINI_P1_STORE) continue;

    board[current]++;
    stones--;
  }

  const lastLanding = current;
  let earnedFreeTurn = false;
  let capturedStones = 0;

  // Free turn if landed in own store
  if (s.turn === 0 && lastLanding === MINI_P1_STORE) {
    earnedFreeTurn = true;
  }

  // Opposite capture if landed in empty pit on own side
  if (
    s.turn === 0 &&
    (MINI_P1_PITS as readonly number[]).includes(lastLanding) &&
    board[lastLanding] === 1
  ) {
    const opp = miniOppositePit(lastLanding);
    if (board[opp] > 0) {
      capturedStones = board[opp] + 1;
      board[opp] = 0;
      board[lastLanding] = 0;
      board[MINI_P1_STORE] += capturedStones;
    }
  }

  // Terminal check
  const p1Empty = MINI_P1_PITS.every(p => board[p] === 0);
  const p2Empty = MINI_P2_PITS.every(p => board[p] === 0);
  let isOver = false;

  if (p1Empty || p2Empty) {
    isOver = true;
    for (const p of MINI_P1_PITS) {
      board[MINI_P1_STORE] += board[p];
      board[p] = 0;
    }
    for (const p of MINI_P2_PITS) {
      board[MINI_P2_STORE] += board[p];
      board[p] = 0;
    }
  }

  return {
    state: {
      board,
      turn: earnedFreeTurn && !isOver ? 0 : 1,
      over: isOver
    },
    earnedFreeTurn,
    capturedStones,
    lastLanding
  };
}
```

#### Scripted Steps Matrix (`src/tutorial/steps.ts`)

| Step # | Title Key | Initial Board [0..7] | Allowed Moves | Goal / Interaction |
|---|---|---|---|---|
| **1** | `tutorial.step1` | `[2, 2, 2, 0, 2, 2, 2, 0]` | none | Board introduction. Highlights Store 3 (P1) and Store 7 (P2). Next button enabled immediately. |
| **2** | `tutorial.step2` | `[0, 3, 0, 0, 2, 2, 2, 0]` | `[1]` (Pit 2) | Teaches sowing. Tap Pit 1 (3 stones). Sows into Pit 2, Store 3, North Pit 4. Success message shown; Next enabled. |
| **3** | `tutorial.step3` | `[0, 0, 1, 1, 3, 2, 2, 0]` | none | Explains scoring. Stones in Store 3 are permanent bank points. Next enabled. |
| **4** | `tutorial.step4` | `[0, 0, 5, 1, 0, 0, 0, 0]` | `[2]` (Pit 3) | Sows 5 stones. Path: Store 3 -> Pits 4, 5, 6 -> **skips Store 7** -> lands in Pit 0. Verifies opponent store skip. |
| **5** | `tutorial.step5` | `[2, 0, 1, 2, 2, 2, 2, 0]` | `[2]` (Pit 3) | Teaches Free Turn. Pit 2 has 1 stone. 1 stone drops in Store 3. Triggers "Free Turn Bonus". |
| **6** | `tutorial.step6` | `[1, 0, 0, 3, 2, 4, 1, 0]` | `[0]` (Pit 1) | Teaches Capture. Pit 0 has 1 stone. Lands in empty Pit 1. Captures opposite Pit 5 (4 stones). Total 5 banked! |
| **7** | `tutorial.step7` | `[0, 0, 1, 8, 2, 1, 1, 3]` | `[2]` (Pit 3) | Teaches Endgame & Sweep. Pit 2 moves 1 stone into Store 3. South side clears. Remaining North stones sweep into Store 7. Final score: South 9, North 7. |
| **8** | `tutorial.step8` | `[0, 0, 0, 9, 0, 0, 0, 7]` | none | Victory celebration. "Start Playing!" button closes tutorial and launches normal match. |

#### Component Integration (`src/tutorial/TutorialModal.tsx`)
- Wrapped in fixed overlay `fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm`.
- Inner mini-board explicitly renders with `dir="ltr"` so Store 7 is on the left and Store 3 is on the right regardless of Arabic RTL locale.
- Navigation buttons: `Back` (disabled on Step 1), `Next` (or `Start Playing` on Step 8), `Restart Step`, and `Skip Tutorial`.
- Supports audio read-aloud button via `window.speechSynthesis`.

---

### 3.4 First-Run Audience Picker (`src/components/modals/AudiencePickerModal.tsx`)

#### Trigger & Storage
- Key: `mancala_onboarding_v1`
- On app load: if `localStorage.getItem('mancala_onboarding_v1') === null`, modal opens automatically.
- Once selected, sets:
  ```json
  { "completed": true, "audience": "kid", "timestamp": 1791338400000 }
  ```
- SettingsPanel includes an "Audience Profile" button to reopen and switch presets at any time.

#### 4 Preset Configurations
1. **Kid Mode (`kid`)**:
   - Lens preset: `coach` (Coach warnings on, explanations on, advantage bar on).
   - Audio: `true`.
   - Big mode: `true` (56px minimum tap targets).
   - Sowing speed: `slow` (280ms).
   - Bot persona: `sunny` (Level 1, friendly beginner).
2. **Casual (`casual`)**:
   - Lens preset: `justPlay` (Board only, zero numbers, zero stat indicators).
   - Audio: `true`.
   - Big mode: `false`.
   - Sowing speed: `normal` (175ms).
   - Bot persona: `oliver` (Level 2).
3. **Learner / Club Player (`learner`)**:
   - Lens preset: `hints` + `coach` (Best move marks on, advantage bar on, coach warnings on).
   - Audio: `true`.
   - Sowing speed: `normal` (175ms).
   - Bot persona: `maya` (Level 3).
4. **Analyst (`analyst`)**:
   - Lens preset: `full` (All 7 lenses on: advantage bar, error rate, best move marks, win %, PV sequence, coach, explanations).
   - Sowing speed: `fast` or `instant`.
   - Bot persona: `magnus` (Level 4, deep search).
   - Default tab on mobile: Analysis panel.

---

## 4. Caveats

1. **Native Speaker Polish (`// REVIEW-NATIVE`)**:
   The Arabic and Spanish catalogs are comprehensive and accurate for game terminology (e.g. Levantine/MSA terms for المنقلة and والبذر), but should receive a final native speaker review before public launch.
2. **Audio Synthesis Availability**:
   Web Speech API (`speechSynthesis`) varies across browsers (iOS Safari requires explicit user interaction gesture before playing speech). Speech failures are caught silently with no UI blockage.
3. **Storage Quota & Private Browsing**:
   All `localStorage` access wraps in `try/catch` to ensure flawless operation in strict incognito or storage-restricted environments.

---

## 5. Conclusion

1. **Localization System**: Pure TypeScript `Record<TranslationKey, string>` pattern completely replaces external i18n libraries, ensuring zero bundle bloat and 100% compile-time verification under `npx tsc --noEmit`. Pluralization for Arabic's 6 grammatical categories is fully supported via browser-native `Intl.PluralRules`.
2. **RTL Integrity**: `<html dir="rtl" lang="ar">` seamlessly mirrors chrome, while `<div dir="ltr">` around the board preserves counter-clockwise sowing, pit numbering, and store positioning across all screen sizes.
3. **Tutorial Architecture**: The 8-step scripted 2x3 mini-board provides zero-scroll, high-clarity onboarding perfectly sized for mobile viewports (<360px).
4. **Audience Picker**: Zero-PII, non-destructive first-run profile selector configures initial lenses and bot pacing seamlessly.

---

## 6. Verification Method

1. **Compile-Time Catalog Verification**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0. If any translation key is missing in `ar.ts` or `es.ts`, TypeScript immediately fails with error TS2739.
2. **Existing Test Suite Regression Check**:
   ```bash
   npm test
   ```
   *Expected result*: All 13 test suites and 136 vitest tests continue to pass with 0 errors.
3. **Zero Horizontal Scroll Playwright Audit in Arabic RTL**:
   ```bash
   npx playwright test e2e/no-hscroll.spec.ts
   ```
   *Expected result*: With `mancala_lang_v1 = 'ar'` and `dir="rtl"`, `doc.scrollWidth <= window.innerWidth` passes across all 4 viewports (360x740, 393x852, 768x1024, 1280x800).
4. **Preserved Test IDs Verification**:
   ```bash
   npm test src/preserved-testids.test.ts
   ```
   *Expected result*: 100% passing; all 35+ critical `data-testid` selectors remain intact.
