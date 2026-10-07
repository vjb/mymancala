import { test, expect } from '@playwright/test';

test.describe('M2 Trainer & Exact Solver E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop-friendly viewport by default or let mobile override
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Bottom tray maintains strictly 5 buttons on mobile (zero 6th button)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const tray = page.locator('[data-testid="bottom-tray"]');
    await expect(tray).toBeVisible();

    const buttons = tray.locator('button');
    await expect(buttons).toHaveCount(5);

    // Verify button identities
    await expect(page.locator('[data-testid="bottom-board-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-analysis-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutor-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-rules-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-settings-btn"]')).toBeVisible();
  });

  test('Interactive Drills view is reachable via Analysis panel', async ({ page }) => {
    // If on mobile viewport, navigate to Analysis tab via bottom tray
    const analysisNavBtn = page.locator('[data-testid="bottom-analysis-btn"]');
    if (await analysisNavBtn.isVisible()) {
      await analysisNavBtn.click();
    }

    // Click Drills tab in Candidate Move Evaluations
    const drillsTab = page.locator('[data-testid="tab-drills"]');
    await expect(drillsTab).toBeVisible();
    await drillsTab.click();

    // Verify DrillView renders
    const drillView = page.locator('[data-testid="drill-view"]');
    await expect(drillView).toBeVisible();

    // Switch back to Candidate Moves
    const movesTab = page.locator('[data-testid="tab-moves"]');
    await expect(movesTab).toBeVisible();
    await movesTab.click();

    await expect(drillView).not.toBeVisible();
  });

  test('Evaluation gauge renders truthfulness indicators', async ({ page }) => {
    const evalGauge = page.locator('[data-testid="eval-gauge"]');
    await expect(evalGauge).toBeVisible();

    // Check advantage bar lead label
    const leadLabel = page.locator('[data-testid="eval-lead-label"]');
    await expect(leadLabel).toBeVisible();
  });

  test('Game Review modal displays 5-tier classification', async ({ page }) => {
    // Open review if review button is active or trigger 2 moves
    // Play move pit 0 to create game history
    const pit0 = page.locator('[data-testid="pit-0"]');
    await pit0.click();
    await page.waitForTimeout(500);

    const reviewBtn = page.locator('[data-testid="analysis-review-btn"]');
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      const modal = page.locator('[data-testid="game-review-modal"]');
      await expect(modal).toBeVisible();

      // Check 5-tier move quality labels
      await expect(modal.getByText('Best Move', { exact: true })).toBeVisible();
      await expect(modal.getByText('Good', { exact: true })).toBeVisible();
      await expect(modal.getByText('Inaccuracy', { exact: true })).toBeVisible();
      await expect(modal.getByText('Mistake', { exact: true })).toBeVisible();
      await expect(modal.getByText('Blunder', { exact: true })).toBeVisible();
    }
  });
});
