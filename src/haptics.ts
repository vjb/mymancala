/**
 * Haptic Feedback Engine for Mobile Browsers (Vibration API)
 * Provides tactile sensations for pebble sowing, captures, free turns, and coach alerts.
 */

class HapticsEngine {
  public enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem('mancala_haptics_enabled');
      this.enabled = saved !== null ? saved === 'true' : true;
    } catch {
      this.enabled = true;
    }
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem('mancala_haptics_enabled', String(val));
    } catch {}
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled || typeof window === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Graceful fallback for non-supporting browsers or permission blocks
    }
  }

  /** Subtle 10ms micro-tap when a pebble drops into a pit */
  public sowStep(): void {
    this.vibrate(12);
  }

  /** Satisfying double-thump when capturing enemy stones */
  public capture(): void {
    this.vibrate([25, 40, 35]);
  }

  /** Triumphant triple-pulse when landing in own store for a free turn */
  public freeTurn(): void {
    this.vibrate([20, 30, 20, 30, 50]);
  }

  /** Warning double-buzz for blunders or coach advisory */
  public blunder(): void {
    this.vibrate([55, 40, 55]);
  }

  /** Celebratory fanfare vibration when winning the match */
  public victory(): void {
    this.vibrate([40, 50, 40, 50, 80, 60, 120]);
  }

  /** Quick UI tap feedback */
  public tap(): void {
    this.vibrate(8);
  }
}

export const haptics = new HapticsEngine();
