/**
 * src/lib/speech.ts
 * Web Speech API narration helper for rules, tutorials, and coach tips.
 * Includes language matching, speed control, mute toggle, and graceful fallback.
 */

export class SpeechHelper {
  private synth: SpeechSynthesis | null = null;
  public isSupported: boolean = false;
  public enabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
    }
  }

  public speak(text: string, lang = 'en', rate = 1.0): void {
    if (!this.synth || !this.isSupported || !this.enabled) return;
    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.7, Math.min(1.4, rate));

      const voices = this.synth.getVoices();
      const matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      utterance.lang = lang;

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch {
      // Graceful degradation when audio is restricted or speech synthesis fails
    }
  }

  public stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
      this.currentUtterance = null;
    }
  }
}

export const speech = new SpeechHelper();
