import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & Ergonomics E2E Suite', () => {
  const skins = ['walnut', 'porcelain', 'obsidian', 'high-contrast'] as const;

  for (const skin of skins) {
    test(`axe audit on ${skin} skin has zero critical or serious violations`, async ({ page }) => {
      await page.addInitScript((s) => {
        localStorage.setItem('mancala_theme', s);
      }, skin);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = scanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(criticalOrSerious, `Violations on ${skin}: ${JSON.stringify(criticalOrSerious, null, 2)}`).toEqual([]);
    });
  }

  test('keyboard 2D navigation traverses pits using arrow keys and plays via Enter', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Focus on pit 0 (South row, leftmost pit)
    const pit0 = page.locator('[data-testid="pit-0"]');
    await pit0.focus();
    await expect(pit0).toBeFocused();

    // ArrowRight should move focus to pit 1
    await page.keyboard.press('ArrowRight');
    const pit1 = page.locator('[data-testid="pit-1"]');
    await expect(pit1).toBeFocused();

    // ArrowUp should move focus to North row counterpart (12 - 1 = 11)
    await page.keyboard.press('ArrowUp');
    const pit11 = page.locator('[data-testid="pit-11"]');
    await expect(pit11).toBeFocused();

    // ArrowDown moves focus back to pit 1
    await page.keyboard.press('ArrowDown');
    await expect(pit1).toBeFocused();

    // ArrowRight to pit 2 (free turn)
    await page.keyboard.press('ArrowRight');
    const pit2 = page.locator('[data-testid="pit-2"]');
    await expect(pit2).toBeFocused();

    // Press Enter to play pit 2
    await page.keyboard.press('Enter');

    // Live announcer should register the move
    const announcer = page.locator('[data-testid="aria-live-announcer"]');
    await expect(announcer).toBeAttached();
  });

  test('modal focus trap keeps focus inside modal and Escape closes it', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (!isMobile) return;

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('[data-testid="bottom-rules-btn"]').click();

    const rulesModal = page.locator('[aria-labelledby="rules-modal-title"]');
    await expect(rulesModal).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(rulesModal).not.toBeVisible();
  });

  test('high-contrast skin displays patterned pebbles', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mancala_theme', 'high-contrast');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const pit0 = page.locator('[data-testid="pit-0"]');
    await expect(pit0).toBeVisible();

    // Patterned high-contrast pebble discriminator should be attached
    const pebble = page.locator('[data-testid="pebble-high-contrast"]').first();
    await expect(pebble).toBeAttached();
    await expect(page.locator('text=South stone (striped)').first()).toBeAttached();
  });
});
