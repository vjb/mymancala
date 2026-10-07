import { test, expect } from '@playwright/test';

test.describe('First-Run Onboarding Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('clean launch opens AudiencePickerModal and selecting profile configures preset', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const modal = page.locator('[aria-labelledby="audience-picker-title"]');
    await expect(modal).toBeVisible();

    // Verify all 4 audience profiles are displayed
    await expect(page.locator('[data-testid="audience-profile-kid"]')).toBeVisible();
    await expect(page.locator('[data-testid="audience-profile-casual"]')).toBeVisible();
    await expect(page.locator('[data-testid="audience-profile-learner"]')).toBeVisible();
    await expect(page.locator('[data-testid="audience-profile-analyst"]')).toBeVisible();

    // Select "kid" profile -> sets justPlay preset and closes modal
    await page.locator('[data-testid="audience-profile-kid"]').click();
    await expect(modal).not.toBeVisible();

    // Verify localStorage has onboarding completed with kid profile
    const stored = await page.evaluate(() => localStorage.getItem('mancala_onboarding_v1'));
    expect(stored).toContain('kid');

    // Reload with saved onboarding state -> modal does not appear
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(modal).not.toBeVisible();
  });

  test('query param ?onboarding reopens modal even if completed', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mancala_onboarding_v1', JSON.stringify({ completed: true, audience: 'casual', timestamp: Date.now() }));
    });
    await page.goto('/?onboarding');
    await page.waitForLoadState('domcontentloaded');

    const modal = page.locator('[aria-labelledby="audience-picker-title"]');
    await expect(modal).toBeVisible();

    // Selecting "learner" profile sets coach preset
    await page.locator('[data-testid="audience-profile-learner"]').click();
    await expect(modal).not.toBeVisible();
  });
});
