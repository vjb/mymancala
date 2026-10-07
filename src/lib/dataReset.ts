/**
 * src/lib/dataReset.ts
 * Zero-PII "Erase My Data" reset utility.
 * Clears all local preferences, ratings, games, caches, and resets state cleanly.
 */

export async function eraseAllUserData(reload = true): Promise<void> {
  // 1. Wipe all localStorage items with prefix mancala
  if (typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mancala_') || key.startsWith('mancala'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  // 2. Clear sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.clear();
    } catch {}
  }

  // 3. Clear CacheStorage
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
  }

  // 4. Unregister Service Workers
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    } catch {}
  }

  // 5. Reload cleanly if requested
  if (reload && typeof window !== 'undefined' && window.location) {
    window.location.reload();
  }
}
