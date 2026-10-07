import { test, expect } from '@playwright/test';

test.describe('Bottom Navigation Tray Guardrail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Tray maintains strictly 5 fixed items and Rules is housed exclusively in tray', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (!isMobile) {
      // Desktop does not render mobile tray
      return;
    }

    // 1. Verify existence of the 5 tray buttons
    const boardBtn = page.locator('[data-testid="bottom-board-btn"]');
    const analysisBtn = page.locator('[data-testid="bottom-analysis-btn"]');
    const coachBtn = page.locator('[data-testid="tutor-toggle"]');
    const rulesBtn = page.locator('[data-testid="bottom-rules-btn"]');
    const settingsBtn = page.locator('[data-testid="bottom-settings-btn"]');

    await expect(boardBtn).toBeVisible();
    await expect(analysisBtn).toBeVisible();
    await expect(coachBtn).toBeVisible();
    await expect(rulesBtn).toBeVisible();
    await expect(settingsBtn).toBeVisible();

    // 2. Count total buttons in the bottom tray container
    const trayButtons = page.locator('[data-testid="bottom-tray"] button');
    await expect(trayButtons).toHaveCount(5);

    // 3. Verify Rules is NOT present in the top header
    const topRulesBtn = page.locator('header [data-testid="bottom-rules-btn"], header button:has-text("Rules")');
    await expect(topRulesBtn).not.toBeVisible();
  });
});
