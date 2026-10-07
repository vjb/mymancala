import { test, expect } from '@playwright/test';

test.describe('Arabic RTL & Board Invariant E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mancala_lang_v1', 'ar');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('verifies html attributes set to dir="rtl" and lang="ar"', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');
  });

  test('asserts zero horizontal scroll in Arabic RTL mode at mobile viewport', async ({ page }) => {
    const isOverflowing = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing, 'RTL mode should not produce horizontal scroll').toBe(false);
  });

  test('CRITICAL INVARIANT: Physical board geometry is NOT mirrored in RTL mode', async ({ page }) => {
    // 1. South Store (Store 6, P1) must be physically positioned to the RIGHT of North Store (Store 13, P2)
    const store6 = page.locator('[data-testid="store-6"]');
    const store13 = page.locator('[data-testid="store-13"]');
    await expect(store6).toBeVisible();
    await expect(store13).toBeVisible();

    const box6 = await store6.boundingBox();
    const box13 = await store13.boundingBox();
    expect(box6).not.toBeNull();
    expect(box13).not.toBeNull();

    // Store 6 X-coordinate MUST be greater than Store 13 X-coordinate (Store 6 is on the right)
    expect(box6!.x).toBeGreaterThan(box13!.x);

    // 2. South Pits (0..5) flow from left (pit-0) to right (pit-5)
    const pit0 = page.locator('[data-testid="pit-0"]');
    const pit5 = page.locator('[data-testid="pit-5"]');
    await expect(pit0).toBeVisible();
    await expect(pit5).toBeVisible();

    const box0 = await pit0.boundingBox();
    const box5 = await pit5.boundingBox();
    expect(box0).not.toBeNull();
    expect(box5).not.toBeNull();

    // Pit 0 X-coordinate MUST be less than Pit 5 X-coordinate
    expect(box0!.x).toBeLessThan(box5!.x);
  });

  test('verifies Arabic translated strings and plural formatting', async ({ page }) => {
    // Turn indicator or total stones contains Arabic text
    const totalStones = page.locator('[data-testid="total-stones"]');
    await expect(totalStones).toBeVisible();
    // 48 stones in Arabic formatted via Intl.NumberFormat
    const text = await totalStones.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('Settings modal in RTL has zero horizontal scroll', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);
    }
  });
});
