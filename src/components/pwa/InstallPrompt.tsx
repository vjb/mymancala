import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWA_DISMISSED_KEY = 'mancala_pwa_dismissed';

interface InstallPromptProps {
  hasCompletedFirstGame: boolean;
  theme: any;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  hasCompletedFirstGame,
  theme,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(PWA_DISMISSED_KEY) === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch {}
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      handleDismiss();
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      handleDismiss();
    }
    setDeferredPrompt(null);
  };

  if (dismissed || !hasCompletedFirstGame || !deferredPrompt) {
    return null;
  }

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 p-3 rounded-2xl bg-slate-900/95 border border-sky-500/40 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-sky-200 animate-fade-in shadow-2xl"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400">
          <Download className="w-4 h-4" />
        </div>
        <span>Install Mancala Coach to your home screen for full offline play.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition active:scale-95 text-xs"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          title="Dismiss install hint"
          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
