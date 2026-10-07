import { test, expect } from '@playwright/test';

test.describe('M1 Adversarial E2E Stress Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Touch preview cancellation: preview cleans up instantly on touch-end, touch-cancel, and touch-move', async ({ page }) => {
    // Target South pit 0
    const pit0 = page.locator('[data-testid="pit-0"]');
    await expect(pit0).toBeVisible();

    // Helper to dispatch TouchEvent safely in browser context
    const dispatchTouch = async (eventType: string, clientX = 100, clientY = 200) => {
      await page.evaluate(({ type, x, y }) => {
        const target = document.querySelector<HTMLButtonElement>('[data-testid="pit-0"]');
        if (!target) throw new Error('pit-0 not found');
        const touch = new Touch({
          identifier: 1,
          target,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y
        });
        const evt = new TouchEvent(type, {
          touches: type === 'touchend' || type === 'touchcancel' ? [] : [touch],
          targetTouches: type === 'touchend' || type === 'touchcancel' ? [] : [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true
        });
        target.dispatchEvent(evt);
      }, { type: eventType, x: clientX, y: clientY });
    };

    // 1. Test touch-end cancellation
    await dispatchTouch('touchstart', 100, 200);

    // Wait for the 350ms long-press preview timer to fire
    await page.waitForTimeout(400);

    // Verify preview is active: landing pit 4 should have landing ring or badge
    const pit4 = page.locator('[data-testid="pit-4"]');
    await expect(pit4).toHaveClass(/ring-emerald-400|ring-lime-400/);

    // Dispatch touchend
    await dispatchTouch('touchend', 100, 200);

    // Verify preview cleans up immediately
    await expect(pit4).not.toHaveClass(/ring-emerald-400|ring-lime-400/);

    // 2. Test touch-cancel cancellation
    await dispatchTouch('touchstart', 100, 200);
    await page.waitForTimeout(400);
    await expect(pit4).toHaveClass(/ring-emerald-400|ring-lime-400/);

    await dispatchTouch('touchcancel', 100, 200);
    await expect(pit4).not.toHaveClass(/ring-emerald-400|ring-lime-400/);

    // 3. Test touch-move (>10px scroll) cancellation
    await dispatchTouch('touchstart', 100, 200);
    await page.waitForTimeout(400);
    await expect(pit4).toHaveClass(/ring-emerald-400|ring-lime-400/);

    // Move touch by 25px (simulating scroll gesture)
    await dispatchTouch('touchmove', 100, 225);
    await expect(pit4).not.toHaveClass(/ring-emerald-400|ring-lime-400/);
  });

  test('Lens Presets: justPlay strictly disables all analysis UI and renders empty state on Analysis tab', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;

    // Navigate to Settings
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }

    // Rapidly toggle through all 4 presets
    await page.locator('[data-testid="preset-hints"]').click();
    await page.locator('[data-testid="preset-coach"]').click();
    await page.locator('[data-testid="preset-full"]').click();
    await page.locator('[data-testid="preset-justPlay"]').click();

    // Verify justPlay is active
    await expect(page.locator('[data-testid="preset-justPlay"]')).toHaveAttribute('aria-pressed', 'true');

    // On board: Eval bar should be hidden
    await expect(page.locator('[data-testid="eval-gauge-container"]')).not.toBeVisible();
    // Ribbon hints button should not be present
    await expect(page.locator('[data-testid="ribbon-hints-btn"]')).not.toBeVisible();

    // Navigate to Analysis tab
    if (isMobile) {
      await page.locator('[data-testid="bottom-analysis-btn"]').click();
    }

    // MANDATORY SPEC: justPlay renders empty state on Analysis tab with data-testid="analysis-empty-state"
    const emptyState = page.locator('[data-testid="analysis-empty-state"]');
    await expect(emptyState).toBeVisible();

    // Verify 1-tap "Turn on Gentle Coach" button is rendered
    const coachBtn = page.locator('[data-testid="enable-coach-btn"]');
    await expect(coachBtn).toBeVisible();

    // Candidate move rows must NOT be rendered
    await expect(page.locator('[data-testid="eval-row-0"]')).not.toBeVisible();

    // Clicking "Turn on Gentle Coach" should restore coach preset
    await coachBtn.click();
    await expect(emptyState).not.toBeVisible();

    // 3. Verify candidate evaluations are restored
    await expect(page.locator('[data-testid="eval-row-0"]:visible')).toBeVisible();

    // Verify preset switched back to coach
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }
    await expect(page.locator('[data-testid="preset-coach"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Landing Preview Lens: toggling landingPreview off suppresses all landing rings, capture pulses, and trajectory badges', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;

    // Navigate to Settings and select coach preset to ensure clean starting state
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }
    await page.locator('[data-testid="preset-coach"]').click();
    await expect(page.locator('[data-testid="preset-coach"]')).toHaveAttribute('aria-pressed', 'true');

    // Verify landingPreview checkbox is checked
    const landingCheckbox = page.locator('[data-testid="lens-landingPreview"]');
    await expect(landingCheckbox).toBeChecked();

    // Toggle landingPreview OFF
    await landingCheckbox.uncheck();
    await expect(landingCheckbox).not.toBeChecked();

    // Return to board
    if (isMobile) {
      await page.locator('[data-testid="bottom-board-btn"]').click();
    }

    const pit0 = page.locator('[data-testid="pit-0"]');
    const pit4 = page.locator('[data-testid="pit-4"]');
    await expect(pit0).toBeVisible();

    // Test Desktop Hover or Touch long-press
    if (!isMobile) {
      await pit0.hover();
      await page.waitForTimeout(200);
    }

    // Also dispatch 350ms touch to stress touch preview path
    await page.evaluate(() => {
      const target = document.querySelector<HTMLButtonElement>('[data-testid="pit-0"]');
      if (!target) throw new Error('pit-0 not found');
      const touch = new Touch({
        identifier: 2,
        target,
        clientX: 100,
        clientY: 200,
        pageX: 100,
        pageY: 200
      });
      const evt = new TouchEvent('touchstart', {
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(evt);
    });

    await page.waitForTimeout(400);

    // Assert that hovering/touching pit 0 displays ZERO landing rings, capture pulses, or trajectory badges:
    // 1. Pit 4 (landing pit) must NOT have landing ring classes
    await expect(pit4).not.toHaveClass(/ring-emerald-400|ring-lime-400/);

    // 2. No pit displays "LAND" or "CAPT" badges
    await expect(page.locator('[data-testid^="pit-"]').getByText('LAND', { exact: true })).not.toBeVisible();
    await expect(page.locator('[data-testid^="pit-"]').getByText('CAPT', { exact: true })).not.toBeVisible();

    // 3. No capture pulses on any opponent pits
    for (let p = 7; p <= 12; p++) {
      await expect(page.locator(`[data-testid="pit-${p}"]`)).not.toHaveClass(/ring-rose-500|ring-red-500/);
    }

    // 4. Turn banner displays ZERO landing trajectory badges
    await expect(page.getByText(/^Landing:/)).not.toBeVisible();

    // Clean up touch
    await page.evaluate(() => {
      const target = document.querySelector<HTMLButtonElement>('[data-testid="pit-0"]');
      if (!target) return;
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
    });
  });
});

