import { SettingsPanelProps } from '../components/panels/SettingsPanel';
import { LensState, LensId, PresetId, applyPreset } from '../lenses';
import { eraseAllUserData } from '../lib/dataReset';

interface BuildSettingsPropsParams {
  settings: any;
  lenses: LensState;
  activePreset: PresetId | 'custom';
  setLens: (id: LensId, val?: boolean) => void;
  setLenses: React.Dispatch<React.SetStateAction<LensState>>;
  game: any;
  mobileHidden?: boolean;
  onOpenDiagnostics: () => void;
  onOpenTutorial: () => void;
  onOpenAudience: () => void;
  onOpenLegend: () => void;
}

export function buildSettingsProps(params: BuildSettingsPropsParams): SettingsPanelProps {
  const {
    settings,
    lenses,
    activePreset,
    setLens,
    setLenses,
    game,
    mobileHidden = false,
    onOpenDiagnostics,
    onOpenTutorial,
    onOpenAudience,
    onOpenLegend,
  } = params;

  return {
    activePreset,
    onSelectPreset: (id: PresetId) => setLenses(applyPreset(id)),
    lenses,
    onToggleLens: setLens,
    tutorMode: lenses.coach,
    coachSensitivity: game.state.coachSensitivity,
    onChangeCoachSensitivity: game.handleSetCoachSensitivity,
    soundEnabled: settings.soundEnabled,
    onToggleSound: () => settings.setSoundEnabled(!settings.soundEnabled),
    colorblindSafe: settings.colorblindSafe,
    onToggleColorblind: () => settings.setColorblindSafe(!settings.colorblindSafe),
    hapticsEnabled: settings.hapticsEnabled,
    onToggleHaptics: settings.handleToggleHaptics,
    gameMode: game.state.gameMode,
    onSelectMode: game.handleSetGameMode,
    humanPlayer: game.state.humanPlayer,
    onSelectHumanPlayer: game.handleSetHumanPlayer,
    isAiRunning: game.state.isAiRunning,
    onToggleAiRunning: () => game.handleSetAiRunning(!game.state.isAiRunning),
    searchDepth: game.state.searchDepth,
    onChangeDepth: game.handleSetSearchDepth,
    sowSpeed: game.state.sowSpeed,
    onChangeSowSpeed: game.handleSetSowSpeed,
    rules: game.state.rules,
    onChangeRules: game.handleSetRules,
    onOpenDiagnostics,
    currentSkin: settings.currentSkin,
    onSelectSkin: settings.setCurrentSkin,
    theme: settings.theme,
    mobileHidden,
    fontScale: settings.fontScale,
    onChangeFontScale: settings.setFontScale,
    reducedMotion: settings.reducedMotion,
    onChangeReducedMotion: settings.setReducedMotion,
    bigMode: settings.bigMode,
    onToggleBigMode: settings.setBigMode,
    tapTwice: settings.tapTwice,
    onToggleTapTwice: settings.setTapTwice,
    speechEnabled: settings.speechEnabled,
    onToggleSpeech: settings.setSpeechEnabled,
    onEraseData: () => eraseAllUserData(true),
    onOpenTutorial,
    onOpenAudience,
    onOpenLegend,
  };
}
