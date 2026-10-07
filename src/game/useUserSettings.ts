import { useState, useEffect, useCallback } from 'react';
import { THEMES, SkinTheme } from '../theme';
import { sounds } from '../sound';
import { haptics } from '../haptics';
import { speech } from '../lib/speech';
import { FontScale } from '../lib/a11y';

export function useUserSettings() {
  const [currentSkin, setCurrentSkin] = useState<SkinTheme>(() => {
    try {
      const s = localStorage.getItem('mancala_theme') as SkinTheme;
      return s && s in THEMES ? s : 'walnut';
    } catch {
      return 'walnut';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mancala_theme', currentSkin);
    } catch {}
  }, [currentSkin]);

  const theme = THEMES[currentSkin];

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const s = localStorage.getItem('mancala_sound_enabled');
      return s !== null ? s === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    sounds.muted = !soundEnabled;
    try {
      localStorage.setItem('mancala_sound_enabled', String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  const [colorblindSafe, setColorblindSafe] = useState(() => {
    try {
      const s = localStorage.getItem('mancala_colorblind_safe');
      return s !== null ? s === 'true' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mancala_colorblind_safe', String(colorblindSafe));
    } catch {}
  }, [colorblindSafe]);

  const [hapticsEnabled, setHapticsEnabled] = useState(() => haptics.enabled);
  const handleToggleHaptics = useCallback((enabled: boolean) => {
    haptics.setEnabled(enabled);
    setHapticsEnabled(enabled);
    if (enabled) haptics.tap();
  }, []);

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    try {
      const s = localStorage.getItem('mancala_font_scale') as FontScale;
      return s && ['S', 'M', 'L', 'XL'].includes(s) ? s : 'M';
    } catch {
      return 'M';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    ['font-scale-s', 'font-scale-m', 'font-scale-l', 'font-scale-xl'].forEach(c =>
      root.classList.remove(c)
    );
    root.classList.add(`font-scale-${fontScale.toLowerCase()}`);
    try {
      localStorage.setItem('mancala_font_scale', fontScale);
    } catch {}
  }, [fontScale]);

  const [reducedMotion, setReducedMotion] = useState<'auto' | 'reduce' | 'no-preference'>(() => {
    try {
      const s = localStorage.getItem('mancala_reduced_motion') as any;
      return s && ['auto', 'reduce', 'no-preference'].includes(s) ? s : 'auto';
    } catch {
      return 'auto';
    }
  });

  const isReducedMotion =
    reducedMotion === 'reduce' ||
    (reducedMotion === 'auto' &&
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  useEffect(() => {
    const root = document.documentElement;
    if (isReducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    try {
      localStorage.setItem('mancala_reduced_motion', reducedMotion);
    } catch {}
  }, [isReducedMotion, reducedMotion]);

  const [bigMode, setBigMode] = useState(() => {
    try {
      return localStorage.getItem('mancala_big_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mancala_big_mode', String(bigMode));
    } catch {}
  }, [bigMode]);

  const [tapTwice, setTapTwice] = useState(() => {
    try {
      return localStorage.getItem('mancala_tap_twice') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mancala_tap_twice', String(tapTwice));
    } catch {}
  }, [tapTwice]);

  const [speechEnabled, setSpeechEnabled] = useState(() => {
    try {
      return localStorage.getItem('mancala_speech_enabled') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    speech.enabled = speechEnabled;
    try {
      localStorage.setItem('mancala_speech_enabled', String(speechEnabled));
    } catch {}
  }, [speechEnabled]);

  return {
    currentSkin,
    setCurrentSkin,
    theme,
    soundEnabled,
    setSoundEnabled,
    colorblindSafe,
    setColorblindSafe,
    hapticsEnabled,
    handleToggleHaptics,
    fontScale,
    setFontScale,
    reducedMotion,
    setReducedMotion,
    isReducedMotion,
    bigMode,
    setBigMode,
    tapTwice,
    setTapTwice,
    speechEnabled,
    setSpeechEnabled,
  };
}
