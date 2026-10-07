import React from 'react';
import { Settings, Volume2, VolumeX, Smartphone, Play, Pause, ShieldCheck, Sparkles, HelpCircle, BookOpen, Trash2, Mic, MicOff } from 'lucide-react';
import { PRESET_ORDER, PRESETS, LENSES, LensState, PresetId, LensId } from '../../lenses';
import { GameMode, SowSpeed, CoachSensitivity } from '../../game/gameTypes';
import { RulesConfig } from '../../engine';
import { SkinTheme, THEMES } from '../../theme';
import { FontScale } from '../../lib/a11y';
import { useTranslation, Locale } from '../../i18n';
import { VARIANT_METADATA } from '../../rules';

interface SettingsPanelProps {
  activePreset: PresetId | 'custom';
  onSelectPreset: (id: PresetId) => void;
  lenses: LensState;
  onToggleLens: (id: LensId, val?: boolean) => void;
  tutorMode: boolean;
  coachSensitivity: CoachSensitivity;
  onChangeCoachSensitivity: (sens: CoachSensitivity) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  colorblindSafe: boolean;
  onToggleColorblind: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (enabled: boolean) => void;
  gameMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  humanPlayer: number;
  onSelectHumanPlayer: (player: number) => void;
  isAiRunning: boolean;
  onToggleAiRunning: () => void;
  searchDepth: number;
  onChangeDepth: (depth: number) => void;
  sowSpeed: SowSpeed;
  onChangeSowSpeed: (speed: SowSpeed) => void;
  rules: RulesConfig;
  onChangeRules: (rules: Partial<RulesConfig>) => void;
  onOpenDiagnostics: () => void;
  currentSkin: SkinTheme;
  onSelectSkin?: (skin: SkinTheme) => void;
  theme: any;
  mobileHidden: boolean;
  fontScale?: FontScale;
  onChangeFontScale?: (scale: FontScale) => void;
  reducedMotion?: 'auto' | 'reduce' | 'no-preference';
  onChangeReducedMotion?: (pref: 'auto' | 'reduce' | 'no-preference') => void;
  bigMode?: boolean;
  onToggleBigMode?: (enabled: boolean) => void;
  tapTwice?: boolean;
  onToggleTapTwice?: (enabled: boolean) => void;
  speechEnabled?: boolean;
  onToggleSpeech?: (enabled: boolean) => void;
  onEraseData?: () => void;
  onOpenTutorial?: () => void;
  onOpenAudience?: () => void;
  onOpenLegend?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  activePreset,
  onSelectPreset,
  lenses,
  onToggleLens,
  tutorMode,
  coachSensitivity,
  onChangeCoachSensitivity,
  soundEnabled,
  onToggleSound,
  colorblindSafe,
  onToggleColorblind,
  hapticsEnabled,
  onToggleHaptics,
  gameMode,
  onSelectMode,
  humanPlayer,
  onSelectHumanPlayer,
  isAiRunning,
  onToggleAiRunning,
  searchDepth,
  onChangeDepth,
  sowSpeed,
  onChangeSowSpeed,
  rules,
  onChangeRules,
  onOpenDiagnostics,
  currentSkin,
  onSelectSkin,
  theme,
  mobileHidden,
  fontScale = 'M',
  onChangeFontScale,
  reducedMotion = 'auto',
  onChangeReducedMotion,
  bigMode = false,
  onToggleBigMode,
  tapTwice = false,
  onToggleTapTwice,
  speechEnabled = false,
  onToggleSpeech,
  onEraseData,
  onOpenTutorial,
  onOpenAudience,
  onOpenLegend
}) => {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col gap-4 shadow-lg ${mobileHidden ? 'hidden lg:flex' : ''}`}>
      <div className={`flex items-center space-x-2 pb-3 border-b ${theme.cardBorder}`}>
        <Settings className="w-4 h-4 opacity-70" />
        <h3 className="font-bold text-xs sm:text-sm">{t('settings.title')}</h3>
      </div>

      {/* Quick Launchers: Tutorial, Audience Profile, Highlights Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {onOpenTutorial && (
          <button
            data-testid="settings-tutorial-btn"
            onClick={onOpenTutorial}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              currentSkin === 'porcelain'
                ? 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200'
                : 'bg-amber-600/15 border-amber-500/30 text-amber-300 hover:bg-amber-600/25'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${currentSkin === 'porcelain' ? 'text-amber-800' : 'text-amber-400'}`} />
            <span>{t('rules.openTutorial')}</span>
          </button>
        )}
        {onOpenAudience && (
          <button
            onClick={onOpenAudience}
            className={`p-2 rounded-xl border transition text-xs font-bold flex items-center justify-center gap-1.5 ${
              currentSkin === 'porcelain'
                ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723] hover:bg-[#e2d9cb]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${currentSkin === 'porcelain' ? 'text-amber-700' : 'text-amber-400'}`} />
            <span>{t('settings.audienceBtn')}</span>
          </button>
        )}
        {onOpenLegend && (
          <button
            onClick={onOpenLegend}
            className={`p-2 rounded-xl border transition text-xs font-bold flex items-center justify-center gap-1.5 ${
              currentSkin === 'porcelain'
                ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723] hover:bg-[#e2d9cb]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 ${currentSkin === 'porcelain' ? 'text-[#5e5346]' : 'text-slate-400'}`} />
            <span>{t('settings.highlightLegend')}</span>
          </button>
        )}
      </div>

      {/* Language Selector */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{t('settings.language')}</span>
        <div className="flex gap-1">
          {[
            { id: 'en', label: 'English' },
            { id: 'ar', label: 'العربية' },
            { id: 'es', label: 'Español' }
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLocale(lang.id as Locale)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                locale === lang.id
                  ? 'bg-amber-400 text-black font-extrabold border-amber-300'
                  : currentSkin === 'porcelain'
                  ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723] hover:bg-[#e2d9cb]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Skin / Theme Selector */}
      {onSelectSkin && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Board Skin:</span>
          <div className="flex gap-1 flex-wrap">
            {(['walnut', 'porcelain', 'obsidian', 'high-contrast'] as SkinTheme[]).map((skin) => (
              <button
                key={skin}
                onClick={() => onSelectSkin(skin)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition capitalize ${
                  currentSkin === skin
                    ? 'bg-amber-400 text-black font-extrabold border-amber-300'
                    : currentSkin === 'porcelain'
                    ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723] hover:bg-[#e2d9cb]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {THEMES[skin]?.name || skin}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* What do you want to see? Presets + per-stat lenses */}
      <div className={`flex flex-col gap-2.5 p-3 rounded-xl border ${
        currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
      }`}>
        <span className="text-xs font-bold">{t('settings.styleTitle')}</span>
        <span className={`text-xs ${theme.cardTextMuted}`}>
          {t('settings.styleSubtitle')}
        </span>

        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Display presets">
          {PRESET_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`preset-${id}`}
              aria-pressed={activePreset === id}
              onClick={() => onSelectPreset(id)}
              className={`text-left p-2 rounded-xl border transition active:scale-95 ${
                activePreset === id
                  ? currentSkin === 'porcelain'
                    ? 'bg-amber-100 border-amber-500 text-amber-900'
                    : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : `${theme.cardTextMuted} ${currentSkin === 'porcelain' ? 'border-[#dbd0c0] hover:border-stone-400' : 'border-white/10 hover:border-white/25'}`
              }`}
            >
              <div className="text-xs font-bold">{PRESETS[id].label}</div>
              <div className="text-xs leading-snug">{PRESETS[id].description}</div>
            </button>
          ))}
        </div>
        {activePreset === 'custom' && (
          <span className={`text-xs font-semibold ${currentSkin === 'porcelain' ? 'text-amber-900' : 'text-amber-400'}`}>{t('settings.customMix')}</span>
        )}

        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          {LENSES.map((lens) => (
            <label
              key={lens.id}
              data-testid={lens.legacyId && ((lens.legacyId as string) !== lens.id) ? `lens-${lens.legacyId}` : undefined}
              className="flex items-center justify-between gap-3 text-xs cursor-pointer"
            >
              <span className="flex flex-col">
                <span className="font-semibold">{lens.label}</span>
                <span className={`text-xs ${theme.cardTextMuted}`}>{lens.description}</span>
              </span>
              <input
                type="checkbox"
                data-testid={`lens-${lens.id}`}
                checked={Boolean(lenses[lens.id])}
                onChange={(e) => onToggleLens(lens.id, e.target.checked)}
                className="rounded accent-amber-500 w-5 h-5 cursor-pointer shrink-0"
              />
            </label>
          ))}

          {/* Preserved testid for lens-winPercent */}
          <label data-testid="lens-winPercent" className="flex items-center justify-between gap-3 text-xs cursor-pointer">
            <span className="flex flex-col">
              <span className="font-semibold">{t('lens.winPercent.label')}</span>
              <span className={`text-xs ${theme.cardTextMuted}`}>{t('lens.winPercent.desc')}</span>
            </span>
            <input
              type="checkbox"
              data-testid="lens-winPercent-input"
              checked={Boolean(lenses.winPercent ?? lenses.evalBar)}
              onChange={(e) => onToggleLens('winPercent', e.target.checked)}
              className="rounded accent-amber-500 w-5 h-5 cursor-pointer shrink-0"
            />
          </label>
        </div>

        {tutorMode && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
            <span className={theme.cardTextMuted}>{t('settings.coachSensitivity')}</span>
            <select
              aria-label={t('settings.coachSensitivity')}
              value={coachSensitivity}
              onChange={(e) => onChangeCoachSensitivity(e.target.value as CoachSensitivity)}
              className={`rounded-lg px-2 py-0.5 text-xs font-semibold border ${
                currentSkin === 'porcelain'
                  ? 'bg-white text-[#2c2723] border-[#cdc3b2]'
                  : 'bg-slate-900 text-slate-200 border-white/10'
              }`}
            >
              <option value="all">{t('settings.allMistakes')}</option>
              <option value="blunders_only">{t('settings.blundersOnly')}</option>
            </select>
          </div>
        )}
      </div>

      {/* Font Size Scaling */}
      {onChangeFontScale && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">{t('settings.fontScale')}</span>
          <div className="flex gap-1">
            {(['S', 'M', 'L', 'XL'] as FontScale[]).map((scale) => (
              <button
                key={scale}
                onClick={() => onChangeFontScale(scale)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                  fontScale === scale
                    ? 'bg-amber-400 text-black font-extrabold border-amber-300'
                    : currentSkin === 'porcelain'
                    ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723] hover:bg-[#e2d9cb]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reduced Motion Toggle */}
      {onChangeReducedMotion && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">{t('settings.reducedMotion')}</span>
          <div className="flex gap-1">
            {[
              { id: 'auto', label: 'Auto' },
              { id: 'reduce', label: 'Reduce' },
              { id: 'no-preference', label: 'Full' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => onChangeReducedMotion(m.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                  reducedMotion === m.id
                    ? 'bg-amber-400 text-black font-extrabold border-amber-300'
                    : currentSkin === 'porcelain'
                    ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723] hover:bg-[#e2d9cb]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Big Mode Toggle */}
      {onToggleBigMode && (
        <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
          <span>{t('settings.bigMode')}</span>
          <input
            type="checkbox"
            checked={bigMode}
            onChange={(e) => onToggleBigMode(e.target.checked)}
            className="rounded accent-amber-500 w-5 h-5 cursor-pointer"
          />
        </label>
      )}

      {/* Tap Twice To Move */}
      {onToggleTapTwice && (
        <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
          <span>{t('settings.tapTwice')}</span>
          <input
            type="checkbox"
            checked={tapTwice}
            onChange={(e) => onToggleTapTwice(e.target.checked)}
            className="rounded accent-amber-500 w-5 h-5 cursor-pointer"
          />
        </label>
      )}

      {/* Sound & Audio */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{t('settings.audio')}</span>
        <button
          onClick={onToggleSound}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition ${
            soundEnabled
              ? currentSkin === 'porcelain'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
              : `${theme.cardTextMuted} ${currentSkin === 'porcelain' ? 'border-[#dbd0c0]' : 'border-white/10'}`
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? t('settings.soundOn') : t('settings.soundOff')}</span>
        </button>
      </div>

      {/* Web Speech API Read-Aloud Toggle */}
      {onToggleSpeech && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">{t('settings.speechNarration')}</span>
          <button
            onClick={() => onToggleSpeech(!speechEnabled)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition ${
              speechEnabled
                ? currentSkin === 'porcelain'
                  ? 'bg-amber-100 text-amber-900 border-amber-500'
                  : 'bg-amber-600/20 text-amber-400 border-amber-500/40'
                : `${theme.cardTextMuted} ${currentSkin === 'porcelain' ? 'border-[#dbd0c0]' : 'border-white/10'}`
            }`}
          >
            {speechEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{speechEnabled ? t('settings.speechOn') : t('settings.speechOff')}</span>
          </button>
        </div>
      )}

      {/* Colorblind Palette */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{t('settings.colorblind')}</span>
        <button
          onClick={onToggleColorblind}
          className={`px-3 py-1 rounded-xl border text-xs font-semibold transition ${
            colorblindSafe
              ? currentSkin === 'porcelain'
                ? 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-500'
                : 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/40'
              : `${theme.cardTextMuted} ${currentSkin === 'porcelain' ? 'border-[#dbd0c0]' : 'border-white/10'}`
          }`}
        >
          {colorblindSafe ? t('settings.colorblindOn') : t('settings.colorblindOff')}
        </button>
      </div>

      {/* Phone Haptics */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          <Smartphone className="w-3.5 h-3.5 opacity-70" />
          <span className="font-semibold">{t('settings.haptics')}</span>
        </div>
        <button
          onClick={() => onToggleHaptics(!hapticsEnabled)}
          className={`px-3 py-1 rounded-xl border text-xs font-semibold transition ${
            hapticsEnabled
              ? currentSkin === 'porcelain'
                ? 'bg-amber-100 text-amber-900 border-amber-500'
                : 'bg-amber-600/20 text-amber-400 border-amber-500/30'
              : `${theme.cardTextMuted} ${currentSkin === 'porcelain' ? 'border-[#dbd0c0]' : 'border-white/10'}`
          }`}
        >
          {hapticsEnabled ? t('settings.hapticsOn') : t('settings.hapticsOff')}
        </button>
      </div>

      {/* Game Mode */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
        <label className={`text-xs font-semibold ${theme.cardTextMuted}`}>{t('settings.gameMode')}</label>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {[
            { id: 'pve', label: t('settings.modePve') },
            { id: 'ai_vs_ai', label: t('settings.modeAiVsAi') },
            { id: 'pvp', label: t('settings.modePvp') },
            { id: 'sandbox', label: t('settings.modeSandbox') }
          ].map((m) => (
            <button
              key={m.id}
              data-testid={`mode-${m.id}`}
              onClick={() => onSelectMode(m.id as GameMode)}
              className={`p-2 rounded-xl border font-semibold text-left transition text-xs ${
                gameMode === m.id
                  ? currentSkin === 'porcelain'
                    ? 'bg-[#2c2723] text-white border-transparent'
                    : 'bg-white/20 border-white/30 text-white'
                  : `${theme.cardTextMuted} hover:bg-white/5 border-transparent`
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* PvE Player Side */}
      {gameMode === 'pve' && (
        <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
          currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
        }`}>
          <span className="font-semibold">{t('settings.yourSide')}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onSelectHumanPlayer(0)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                humanPlayer === 0
                  ? 'bg-amber-400 text-black font-extrabold border-transparent'
                  : `${theme.cardTextMuted} hover:opacity-100 border-transparent`
              }`}
            >
              {t('settings.sideSouth')}
            </button>
            <button
              onClick={() => onSelectHumanPlayer(1)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                humanPlayer === 1
                  ? 'bg-emerald-600 text-white border-transparent'
                  : `${theme.cardTextMuted} hover:opacity-100 border-transparent`
              }`}
            >
              {t('settings.sideNorth')}
            </button>
          </div>
        </div>
      )}

      {/* AI vs AI Automation */}
      {gameMode === 'ai_vs_ai' && (
        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
        }`}>
          <span className="text-xs font-semibold">{t('settings.selfPlay')}</span>
          <button
            data-testid="ai-duel-toggle"
            onClick={onToggleAiRunning}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition shadow-sm ${
              isAiRunning ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isAiRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAiRunning ? t('settings.pauseDuel') : t('settings.startDuel')}</span>
          </button>
        </div>
      )}

      {/* Engine Search Depth Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className={`font-semibold ${theme.cardTextMuted}`}>{t('settings.searchDepth')}</span>
          <span className="font-mono font-bold">{t('settings.plies', { count: searchDepth })}</span>
        </div>
        <input
          type="range"
          aria-label={t('settings.searchDepth')}
          min="1"
          max="8"
          value={searchDepth}
          onChange={(e) => onChangeDepth(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/20 rounded-lg"
        />
        <div className={`flex justify-between text-xs font-mono ${theme.cardTextMuted}`}>
          <span>Rapid (1)</span>
          <span>Deep (8)</span>
        </div>
      </div>

      {/* Rules Modifiers & Sowing Speed (relocated from TurnBanner) */}
      <div className={`flex flex-col gap-2 pt-2 border-t ${theme.cardBorder}`}>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>{t('settings.sowSpeed')}</span>
          <select
            aria-label={t('settings.sowSpeed')}
            value={sowSpeed}
            onChange={(e) => onChangeSowSpeed(e.target.value as SowSpeed)}
            className={`rounded-lg px-2 py-0.5 text-xs font-semibold border ${
              currentSkin === 'porcelain'
                ? 'bg-white text-[#2c2723] border-[#cdc3b2]'
                : 'bg-slate-900 text-slate-200 border-white/10'
            }`}
          >
            <option value="slow">{t('settings.speedSlow')}</option>
            <option value="normal">{t('settings.speedNormal')}</option>
            <option value="fast">{t('settings.speedFast')}</option>
            <option value="instant">{t('settings.speedInstant')}</option>
          </select>
        </div>

        <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
          <span>{t('settings.instantToggle')}</span>
          <input
            type="checkbox"
            checked={sowSpeed === 'instant'}
            onChange={(e) => onChangeSowSpeed(e.target.checked ? 'instant' : 'normal')}
            className="rounded accent-amber-500"
          />
        </label>

        <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
          <span>{t('settings.bonusTurnToggle')}</span>
          <input
            type="checkbox"
            checked={rules.freeTurn}
            onChange={(e) => onChangeRules({ freeTurn: e.target.checked })}
            className="rounded accent-amber-500"
          />
        </label>

        <label className="flex items-center justify-between text-xs font-semibold cursor-pointer">
          <span>{t('settings.captureToggle')}</span>
          <input
            type="checkbox"
            checked={rules.captureOpposite}
            onChange={(e) => onChangeRules({ captureOpposite: e.target.checked })}
            className="rounded accent-amber-500"
          />
        </label>
      </div>

      {/* Game Variants Catalog & Analysis Grades */}
      <div className={`flex flex-col gap-2 pt-2 border-t ${theme.cardBorder}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${currentSkin === 'porcelain' ? 'text-[#2c2723]' : 'text-slate-100'}`}>
            Global Mancala Variants
          </span>
          <span className={`text-xs font-mono ${currentSkin === 'porcelain' ? 'text-[#4e463f]' : 'text-slate-400'}`}>
            5 RuleSets
          </span>
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          {Object.values(VARIANT_METADATA).map(v => (
            <div
              key={v.id}
              className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723]' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>{v.name}</span>
                  {v.isBeta && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold border ${
                      currentSkin === 'porcelain'
                        ? 'bg-amber-900/15 text-amber-950 border-amber-800/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      Beta
                    </span>
                  )}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-mono border ${
                  v.analysisGrade === 'exact-endgame+search'
                    ? (currentSkin === 'porcelain'
                        ? 'bg-emerald-900/15 text-emerald-950 border-emerald-800/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
                    : (currentSkin === 'porcelain'
                        ? 'bg-amber-900/15 text-amber-950 border-amber-800/40'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/20')
                }`}>
                  {v.analysisGrade === 'exact-endgame+search' ? 'Exact + Search' : 'Search Only'}
                </span>
              </div>
              <p className={`text-xs leading-snug ${
                currentSkin === 'porcelain' ? 'text-[#3e2714]' : 'text-slate-300'
              }`}>
                {v.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Erase My Data Button */}
      {onEraseData && (
        <div className={`pt-2 border-t ${theme.cardBorder}`}>
          <button
            onClick={() => {
              if (window.confirm(t('settings.eraseConfirm'))) {
                onEraseData();
              }
            }}
            className={`w-full flex items-center justify-center space-x-2 py-2 rounded-xl border text-xs font-semibold transition ${
              currentSkin === 'porcelain'
                ? 'border-rose-400 text-rose-800 bg-rose-100/60 hover:bg-rose-100'
                : 'border-rose-500/30 text-rose-300 bg-rose-950/20 hover:bg-rose-950/40'
            }`}
          >
            <Trash2 className={`w-3.5 h-3.5 ${currentSkin === 'porcelain' ? 'text-rose-700' : 'text-rose-400'}`} />
            <span>{t('settings.eraseData')}</span>
          </button>
        </div>
      )}

      {/* Pre-Flight Test Launcher Button */}
      <div className={`pt-2 border-t ${theme.cardBorder}`}>
        <button
          onClick={onOpenDiagnostics}
          data-testid="open-diagnostics-btn"
          className={`w-full flex items-center justify-center space-x-2 py-2 rounded-xl border text-xs font-semibold transition ${
            currentSkin === 'porcelain'
              ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#4a3e35] hover:bg-[#e2d9cb]'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{t('settings.diagnosticsBtn')}</span>
        </button>
      </div>
    </div>
  );
};
