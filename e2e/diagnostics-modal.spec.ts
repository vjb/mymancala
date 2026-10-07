import { test, expect } from '@playwright/test';

test.describe('DiagnosticsModal Keyboard & Focus Accessibility', () => {
  test('handles Escape dismissal and strictly traps Tab / Shift+Tab focus cycle', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }

    const openBtn = page.locator('[data-testid="open-diagnostics-btn"]');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const modal = page.locator('[data-testid="diagnostics-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'diagnostics-modal-title');

    // 1. Initial Escape dismissal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // 2. Re-open
    await openBtn.click();
    await expect(modal).toBeVisible();

    const closeBtn = modal.locator('button[aria-label="Close"]');
    const rerunBtn = modal.getByRole('button', { name: /Re-run/i });
    await expect(closeBtn).toBeVisible();
    await expect(rerunBtn).toBeVisible();

    // 3. Focus first element (Close button)
    await closeBtn.focus();
    await expect(closeBtn).toBeFocused();

    // 4. Tab moves forward through scrollable scroller to Re-run button
    await page.keyboard.press('Tab');
    const focusedTag1 = await page.evaluate(() => document.activeElement?.tagName);
    expect(['DIV', 'BUTTON']).toContain(focusedTag1);

    if (focusedTag1 === 'DIV') {
      // Chromium keyboard-focusable scroller: next Tab reaches Re-run
      await page.keyboard.press('Tab');
    }
    await expect(rerunBtn).toBeFocused();

    // 5. Tab on last element (Re-run) wraps around to first element (Close)
    await page.keyboard.press('Tab');
    await expect(closeBtn).toBeFocused();

    // 6. Shift+Tab on first element (Close) wraps around to last element (Re-run)
    await page.keyboard.press('Shift+Tab');
    await expect(rerunBtn).toBeFocused();

    // 7. Shift+Tab backwards returns to Close button
    await page.keyboard.press('Shift+Tab');
    const focusedTag2 = await page.evaluate(() => document.activeElement?.tagName);
    if (focusedTag2 === 'DIV') {
      await page.keyboard.press('Shift+Tab');
    }
    await expect(closeBtn).toBeFocused();

    // 8. Escape key dismisses modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('handles backdrop click dismissal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }

    const openBtn = page.locator('[data-testid="open-diagnostics-btn"]');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const modal = page.locator('[data-testid="diagnostics-modal"]');
    await expect(modal).toBeVisible();

    // Click backdrop (outside inner card)
    await modal.click({ position: { x: 5, y: 5 } });
    await expect(modal).not.toBeVisible();
  });
});
