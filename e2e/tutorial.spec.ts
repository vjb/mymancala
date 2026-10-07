import { test, expect } from '@playwright/test';

test.describe('Interactive 8-Step Tutorial E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('completes 8-step tutorial walkthrough with zero horizontal scroll at 360px', async ({ page }) => {
    // 1. Open Tutorial (via bottom tray rules modal on mobile, or settings panel on desktop)
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-rules-btn"]').click();
      await page.locator('[data-testid="rules-tutorial-btn"]').click();
    } else {
      await page.locator('[data-testid="settings-tutorial-btn"]').click();
    }

    // 2. Tutorial modal is visible
    const tutorialDialog = page.locator('[aria-labelledby="tutorial-step-title"]');
    await expect(tutorialDialog).toBeVisible();

    // Check zero horizontal scroll on mobile viewport
    const checkNoHScroll = async () => {
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);
    };
    await checkNoHScroll();

    // Step 1: Objective (observation step, Next is immediately active)
    await expect(page.locator('#tutorial-step-title')).toContainText('1. The Board & Objective');
    const nextBtn = page.locator('[data-testid="tutorial-next-btn"]');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 2: Sowing (interactive: requires clicking Pit 2)
    await expect(page.locator('#tutorial-step-title')).toContainText('2. Sowing Stones');
    const pit1 = page.locator('[data-testid="tutorial-pit-1"]'); // Pit 2 has index 1
    await expect(pit1).toBeVisible();
    await pit1.click();
    await expect(nextBtn).toBeEnabled();
    await checkNoHScroll();
    await nextBtn.click();

    // Step 3: Scoring permanence (explanation step)
    await expect(page.locator('#tutorial-step-title')).toContainText('3. Scoring in Your Store');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 4: Skipping opponent store (interactive: click Pit 3, index 2)
    await expect(page.locator('#tutorial-step-title')).toContainText('4. Skipping Opponent Store');
    const pit2 = page.locator('[data-testid="tutorial-pit-2"]');
    await expect(pit2).toBeVisible();
    await pit2.click();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 5: Free turn bonus (interactive: click Pit 3, index 2)
    await expect(page.locator('#tutorial-step-title')).toContainText('5. Free Turn Bonus');
    await page.locator('[data-testid="tutorial-pit-2"]').click();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 6: Capturing stones (interactive: click Pit 1, index 0)
    await expect(page.locator('#tutorial-step-title')).toContainText('6. Capturing Stones');
    await page.locator('[data-testid="tutorial-pit-0"]').click();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 7: Endgame sweep (interactive: click Pit 3, index 2)
    await expect(page.locator('#tutorial-step-title')).toContainText('7. Endgame Sweep');
    await page.locator('[data-testid="tutorial-pit-2"]').click();
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Step 8: Complete and ready!
    await expect(page.locator('#tutorial-step-title')).toContainText('8. You Are Ready!');
    const finishBtn = page.locator('button:has-text("Start Playing!")');
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Dialog closes cleanly
    await expect(tutorialDialog).not.toBeVisible();
  });

  test('speech narration button is accessible in tutorial modal', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-rules-btn"]').click();
      await page.locator('[data-testid="rules-tutorial-btn"]').click();
    } else {
      await page.locator('[data-testid="settings-tutorial-btn"]').click();
    }

    const speakBtn = page.locator('button[aria-label="Read step aloud"]');
    await expect(speakBtn).toBeVisible();
    await speakBtn.click(); // Should safely call Web Speech API without error
  });
});
