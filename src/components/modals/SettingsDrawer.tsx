import React, { useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { SettingsPanel } from '../panels/SettingsPanel';
import { SkinTheme } from '../../theme';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settingsProps: React.ComponentProps<typeof SettingsPanel>;
  theme: any;
  currentSkin: SkinTheme;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settingsProps,
  theme,
  currentSkin
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game Settings & Controls"
        className={`relative w-full max-w-md h-full shadow-2xl flex flex-col z-10 border-l ${theme.headerBorder} ${theme.cardBg} ${theme.appText} transition-transform duration-300 ease-out`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${theme.headerBorder} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              currentSkin === 'porcelain' ? 'bg-stone-200 border-stone-300 text-stone-800' : 'bg-white/10 border-white/15 text-amber-300'
            }`}>
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base">Settings & Options</h2>
              <p className={`text-xs ${theme.cardTextMuted}`}>Game options, themes, audio & lenses</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings drawer"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body: Scrollable Settings Panel */}
        <div className="flex-1 overflow-y-auto p-4">
          <SettingsPanel {...settingsProps} mobileHidden={false} />
        </div>
      </div>
    </div>
  );
};
