import { test, expect } from '@playwright/test';

test.describe('Adversarial Storage Corruption & Resume E2E Harness', () => {
  test('recovers cleanly from malformed JSON syntax in localStorage', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.addInitScript(() => {
      localStorage.setItem('mancala_game_v1', '{"version": 1, "history": [0,');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // No uncaught errors should have fired
    expect(pageErrors).toHaveLength(0);

    // Prompt should NOT be visible
    const prompt = page.locator('text=You have an unfinished game in progress');
    await expect(prompt).not.toBeVisible();

    // Board should be initial state and interactive
    const pit0 = page.locator('[data-testid="pit-0"]');
    await expect(pit0).toBeVisible();
    await expect(pit0).toBeEnabled();
  });

  test('recovers cleanly from illegal moves (e.g. stores, out of bounds) in history', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.addInitScript(() => {
      localStorage.setItem('mancala_game_v1', JSON.stringify({
        version: 1,
        rulesId: 'kalah',
        options: { stonesPerPit: 4, freeTurn: true, captureOpposite: true },
        history: [6, 999, -1],
        mode: 'pve',
        savedAt: Date.now()
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    expect(pageErrors).toHaveLength(0);
    const prompt = page.locator('text=You have an unfinished game in progress');
    await expect(prompt).not.toBeVisible();

    // Verify localStorage was cleared on corrupted history
    const stored = await page.evaluate(() => localStorage.getItem('mancala_game_v1'));
    expect(stored).toBeNull();
  });

  test('recovers cleanly from finished game history in localStorage', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    // A state that is already over shouldn't prompt to resume
    await page.addInitScript(() => {
      localStorage.setItem('mancala_game_v1', JSON.stringify({
        version: 1,
        rulesId: 'kalah',
        options: { stonesPerPit: 4, freeTurn: true, captureOpposite: true },
        history: [], // empty history
        mode: 'pve',
        savedAt: Date.now()
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    expect(pageErrors).toHaveLength(0);
    const prompt = page.locator('text=You have an unfinished game in progress');
    await expect(prompt).not.toBeVisible();
  });

  test('recovers cleanly without uncaught exceptions when options is missing in savedGameV1', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.addInitScript(() => {
      localStorage.setItem('mancala_game_v1', JSON.stringify({
        version: 1,
        rulesId: 'kalah',
        history: [2], // legal move
        mode: 'pve',
        savedAt: Date.now()
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Clean fallback: no uncaught errors should have fired
    expect(pageErrors).toHaveLength(0);

    // Corrupted save (missing required options schema) must not prompt to resume
    const prompt = page.locator('text=You have an unfinished game in progress');
    await expect(prompt).not.toBeVisible();

    // Storage must be cleared
    const stored = await page.evaluate(() => localStorage.getItem('mancala_game_v1'));
    expect(stored).toBeNull();

    // Board remains interactive in initial state
    const pit0 = page.locator('[data-testid="pit-0"]');
    await expect(pit0).toBeVisible();
    await expect(pit0).toBeEnabled();
  });

  test('full autosave and resume lifecycle with valid game history', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click pit 2 (Player 1's 3rd pit - free turn, optimal move)
    const pit2 = page.locator('[data-testid="pit-2"]');
    await pit2.click();

    // Wait until autosave writes mancala_game_v1 to localStorage after animation settles
    await page.waitForFunction(() => {
      const item = localStorage.getItem('mancala_game_v1');
      if (!item) return false;
      try {
        const parsed = JSON.parse(item);
        return parsed && parsed.history && parsed.history.length > 0;
      } catch {
        return false;
      }
    }, { timeout: 10000 });

    const savedRaw = await page.evaluate(() => localStorage.getItem('mancala_game_v1'));
    expect(savedRaw).not.toBeNull();
    const saved = JSON.parse(savedRaw!);
    expect(saved.version).toBe(1);
    expect(saved.history).toEqual([2]);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify prompt appears
    const prompt = page.locator('text=You have an unfinished game in progress');
    await expect(prompt).toBeVisible();

    // Click Continue Game
    const continueBtn = page.locator('button:has-text("Continue Game")');
    await continueBtn.click();

    // Prompt disappears
    await expect(prompt).not.toBeVisible();

    // Pit 2 was restored and should remain at 0 stones
    const pit2Count = page.locator('[data-testid="pit-count-2"]');
    await expect(pit2Count).toHaveText('0');

    expect(pageErrors).toHaveLength(0);
  });
});
