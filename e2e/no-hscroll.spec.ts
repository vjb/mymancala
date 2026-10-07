import { test, expect, Page } from '@playwright/test';

async function assertNoHorizontalScroll(page: Page, screenName: string) {
  const isOverflowing = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > window.innerWidth;
  });
  expect(isOverflowing, `Horizontal scroll detected on: ${screenName}`).toBe(false);
}

test.describe('Zero Horizontal Scroll Guardrail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Main Board screen has zero horizontal scroll', async ({ page }) => {
    await assertNoHorizontalScroll(page, 'Main Board');
  });

  test('Analysis tab has zero horizontal scroll', async ({ page }) => {
    const btn = page.locator('[data-testid="bottom-analysis-btn"]');
    if (await btn.isVisible()) {
      await btn.click();
      await assertNoHorizontalScroll(page, 'Analysis Tab');
    }
  });

  test('Settings tab has zero horizontal scroll', async ({ page }) => {
    const btn = page.locator('[data-testid="bottom-settings-btn"]');
    if (await btn.isVisible()) {
      await btn.click();
      await assertNoHorizontalScroll(page, 'Settings Tab');
    }
  });

  test('Rules modal has zero horizontal scroll', async ({ page }) => {
    const btn = page.locator('[data-testid="bottom-rules-btn"]');
    if (await btn.isVisible()) {
      await btn.click();
      await assertNoHorizontalScroll(page, 'Rules Modal');
      // Dismiss modal
      await page.keyboard.press('Escape');
    }
  });
});
