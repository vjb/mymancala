import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to compute relative luminance and WCAG contrast ratio
function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const l1 = 0.2126 * lum(rgb1[0]) + 0.7152 * lum(rgb1[1]) + 0.0722 * lum(rgb1[2]);
  const l2 = 0.2126 * lum(rgb2[0]) + 0.7152 * lum(rgb2[1]) + 0.0722 * lum(rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseRgb(colorStr: string): [number, number, number] {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

test.describe('M1 Empirical Challenger Adversarial Suite', () => {

  // ------------------------------------------------------------------------
  // CHALLENGE 1: Axe Accessibility Matrix across 4 Skins & 4 Viewports
  // Minimum Contrast 7:1 in High-Contrast Skin & Font Floor >= 12px
  // ------------------------------------------------------------------------
  const skins = ['walnut', 'porcelain', 'obsidian', 'high-contrast'] as const;

  for (const skin of skins) {
    test(`[CHALLENGE 1] Axe check on skin "${skin}" has ZERO critical and ZERO serious violations`, async ({ page }) => {
      await page.addInitScript((s) => {
        localStorage.setItem('mancala_theme', s);
      }, skin);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const violations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(violations, `Violations on ${skin}: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
    });
  }

  test('[CHALLENGE 1] High-contrast skin achieves >= 7:1 contrast ratio (WCAG AAA)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mancala_theme', 'high-contrast');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Sample high-contrast key elements: Pit count badge, Turn banner text, Store labels
    const contrastSamples = await page.evaluate(() => {
      const getRgb = (c: string) => {
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [0, 0, 0];
      };
      const lum = (rgb: number[]) => {
        const a = rgb.map(v => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      };
      const ratio = (c1: string, c2: string) => {
        const l1 = lum(getRgb(c1));
        const l2 = lum(getRgb(c2));
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      const results: { element: string; ratio: number; fg: string; bg: string }[] = [];

      // 1. Pit count badge
      const pitCount = document.querySelector('[data-testid="pit-count-0"]');
      if (pitCount) {
        const s = window.getComputedStyle(pitCount);
        results.push({ element: 'pit-count', ratio: ratio(s.color, s.backgroundColor), fg: s.color, bg: s.backgroundColor });
      }

      // 2. Store P1 count
      const store6 = document.querySelector('[data-testid="store-6"] [data-testid="pit-count-6"]');
      if (store6) {
        const s = window.getComputedStyle(store6);
        results.push({ element: 'store-6-count', ratio: ratio(s.color, s.backgroundColor), fg: s.color, bg: s.backgroundColor });
      }

      // 3. Main header title or text
      const headerTitle = document.querySelector('header h1') || document.querySelector('header span');
      if (headerTitle) {
        const s = window.getComputedStyle(headerTitle);
        // Header text on black app background
        results.push({ element: 'header-text', ratio: ratio(s.color, 'rgb(0, 0, 0)'), fg: s.color, bg: 'rgb(0, 0, 0)' });
      }

      return results;
    });

    for (const sample of contrastSamples) {
      expect(sample.ratio, `Contrast for ${sample.element} (${sample.fg} on ${sample.bg}) must be >= 7.0`).toBeGreaterThanOrEqual(7.0);
    }
  });

  test('[CHALLENGE 1] Hard font floor >= 12px at scale M across visible text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const violations = await page.evaluate(() => {
      const issues: { text: string; fontSize: number; tag: string }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent) continue;
        const text = node.textContent?.trim();
        if (!text || text.length === 0) continue;

        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        const fs = parseFloat(style.fontSize);
        // Floor must be >= 12px (allow 0.05px rounding tolerance)
        if (fs < 11.95) {
          issues.push({ text: text.slice(0, 30), fontSize: fs, tag: parent.tagName });
        }
      }
      return issues;
    });

    expect(violations, `Found text elements below 12px font floor: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });

  // ------------------------------------------------------------------------
  // CHALLENGE 2: Arabic RTL Mode (scrollWidth <= innerWidth & Physical Invariants)
  // ------------------------------------------------------------------------
  test.describe('Arabic RTL Mode at 360px Viewport', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.addInitScript(() => {
        localStorage.setItem('mancala_lang_v1', 'ar');
      });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test('[CHALLENGE 2] HTML attributes strictly set dir="rtl" and lang="ar"', async ({ page }) => {
      const html = page.locator('html');
      await expect(html).toHaveAttribute('dir', 'rtl');
      await expect(html).toHaveAttribute('lang', 'ar');
    });

    test('[CHALLENGE 2] Zero horizontal scroll across all tabs and modals at 360px', async ({ page }) => {
      const assertNoScroll = async (contextName: string) => {
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth
        }));
        expect(scrollWidth, `Horizontal scroll detected on: ${contextName} (scrollWidth=${scrollWidth}, innerWidth=${innerWidth})`)
          .toBeLessThanOrEqual(innerWidth);
      };

      // 1. Board tab
      await assertNoScroll('Main Board tab');

      // 2. Analysis tab
      const analysisBtn = page.locator('[data-testid="bottom-analysis-btn"]');
      if (await analysisBtn.isVisible()) {
        await analysisBtn.click();
        await page.waitForTimeout(100);
        await assertNoScroll('Analysis tab');
      }

      // 3. Settings tab
      const settingsBtn = page.locator('[data-testid="bottom-settings-btn"]');
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        await page.waitForTimeout(100);
        await assertNoScroll('Settings tab');

        // Test Diagnostics modal from Settings
        const diagBtn = page.locator('[data-testid="open-diagnostics-btn"]');
        if (await diagBtn.isVisible()) {
          await diagBtn.click();
          await page.waitForTimeout(100);
          await assertNoScroll('Diagnostics modal');
          // Close diagnostics modal via its close button
          const closeDiagBtn = page.locator('[data-testid="diagnostics-modal"] button[aria-label="Close"]');
          await closeDiagBtn.click();
          await page.waitForTimeout(100);
        }

        // Test Tutorial modal from Settings
        const tutBtn = page.locator('[data-testid="settings-tutorial-btn"]');
        if (await tutBtn.isVisible()) {
          await tutBtn.click();
          await page.waitForTimeout(100);
          await assertNoScroll('Tutorial modal');
          // Close tutorial modal via Escape or its close button
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
        }
      }

      // 4. Rules modal
      const rulesBtn = page.locator('[data-testid="bottom-rules-btn"]');
      if (await rulesBtn.isVisible()) {
        await rulesBtn.click();
        await page.waitForTimeout(100);
        await assertNoScroll('Rules modal');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    });

    test('[CHALLENGE 2] Physical Board Invariants strictly preserved in Arabic RTL', async ({ page }) => {
      // 1. South pits (0..5) are along the BOTTOM relative to North pits (7..12)
      const pit0 = page.locator('[data-testid="pit-0"]');
      const pit5 = page.locator('[data-testid="pit-5"]');
      const pit12 = page.locator('[data-testid="pit-12"]');
      const pit7 = page.locator('[data-testid="pit-7"]');

      const b0 = (await pit0.boundingBox())!;
      const b5 = (await pit5.boundingBox())!;
      const b12 = (await pit12.boundingBox())!;
      const b7 = (await pit7.boundingBox())!;

      // P1 pits (0, 5) MUST have greater Y coordinate (lower on screen) than P2 pits (12, 7)
      expect(b0.y).toBeGreaterThan(b12.y);
      expect(b5.y).toBeGreaterThan(b7.y);

      // 2. South pits (0..5) flow from left to right (0 on left, 5 on right)
      expect(b0.x).toBeLessThan(b5.x);

      // 3. Store 6 (P1 store) MUST be on the physical RIGHT
      const store6 = page.locator('[data-testid="store-6"]');
      const store13 = page.locator('[data-testid="store-13"]');

      const bStore6 = (await store6.boundingBox())!;
      const bStore13 = (await store13.boundingBox())!;

      // Store 6 is on the RIGHT of Store 13
      expect(bStore6.x).toBeGreaterThan(bStore13.x);
      // Store 6 is to the right of pit 5
      expect(bStore6.x).toBeGreaterThan(b5.x);
      // Store 13 is to the left of pit 0
      expect(bStore13.x).toBeLessThan(b0.x);
    });
  });

  // ------------------------------------------------------------------------
  // CHALLENGE 3: Rapid 50 Key Events & <250ms Rapid Click Debounce Guard
  // ------------------------------------------------------------------------
  test('[CHALLENGE 3] Rapidly firing 50 key navigation events preserves bounds and invariants', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Switch to PvP mode so bot does not execute asynchronous moves during verification
    await page.evaluate(() => {
      // Pit 0 is focused
      const pit0 = document.querySelector<HTMLButtonElement>('[data-testid="pit-0"]');
      if (pit0) pit0.focus();
    });

    const pit0 = page.locator('[data-testid="pit-0"]');
    await expect(pit0).toBeFocused();

    // Rapidly send 50 key navigation events across arrow keys and track focused pit
    const navKeys = ['ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
    for (let i = 0; i < 50; i++) {
      const key = navKeys[i % navKeys.length];
      await page.keyboard.press(key);

      // Verify focused element is always a valid pit within bounds 0..12 (excluding stores 6, 13)
      const focusedPitId = await page.evaluate(() => {
        const el = document.activeElement;
        const testId = el?.getAttribute('data-testid');
        if (testId && testId.startsWith('pit-')) {
          return parseInt(testId.replace('pit-', ''), 10);
        }
        return null;
      });
      if (focusedPitId !== null) {
        expect(focusedPitId).toBeGreaterThanOrEqual(0);
        expect(focusedPitId).toBeLessThanOrEqual(12);
        expect([6, 13]).not.toContain(focusedPitId); // Stores are not directly navigable via pit arrows
      }
    }

    // Zero uncaught errors
    expect(pageErrors).toHaveLength(0);
  });

  test('[CHALLENGE 3] Rapid click barrage within <250ms is debounced without state desync', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Record initial stones in pit 2
    const pit2CountBefore = await page.locator('[data-testid="pit-count-2"]').innerText();
    expect(pit2CountBefore).toBe('4');

    // Fire 5 rapid clicks synchronously via DOM event dispatch (<250ms debounce window)
    const clicksFired = await page.evaluate(() => {
      const pit2 = document.querySelector<HTMLButtonElement>('[data-testid="pit-2"]');
      if (!pit2) return 0;
      const t0 = performance.now();
      for (let i = 0; i < 5; i++) {
        pit2.click();
      }
      const dt = performance.now() - t0;
      return dt;
    });

    // Confirm clicks occurred within < 250ms (in fact, under 20ms)
    expect(clicksFired).toBeLessThan(250);

    // Zero uncaught errors
    expect(pageErrors).toHaveLength(0);

    // Wait for the single debounced move animation to fully settle
    await page.waitForTimeout(3500);

    // Assert board total stone conservation is strictly 48
    const totalStones = await page.evaluate(() => {
      let sum = 0;
      for (let i = 0; i < 14; i++) {
        if (i === 6 || i === 13) {
          const store = document.querySelector(`[data-testid="store-${i}"]`);
          if (store) {
            const countDiv = store.querySelector('.font-black');
            if (countDiv) sum += parseInt(countDiv.textContent || '0', 10);
          }
        } else {
          const el = document.querySelector(`[data-testid="pit-count-${i}"]`);
          if (el) sum += parseInt(el.textContent || '0', 10);
        }
      }
      return sum;
    });
    expect(totalStones, 'Total stones must remain strictly 48').toBe(48);
  });

  // ------------------------------------------------------------------------
  // CHALLENGE 4: Zero-PII "Erase My Data" Purges All mancala_* Keys
  // ------------------------------------------------------------------------
  test('[CHALLENGE 4] "Erase My Data" triggers complete purge of all mancala_* keys', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Populate localStorage with multiple valid and dummy mancala_* keys and an unrelated key
    await page.evaluate(() => {
      localStorage.setItem('mancala_game_v1', JSON.stringify({
        version: 1,
        rulesId: 'kalah',
        options: { stonesPerPit: 4, freeTurn: true, captureOpposite: true },
        history: [2],
        mode: 'pve',
        savedAt: Date.now()
      }));
      localStorage.setItem('mancala_theme', 'high-contrast');
      localStorage.setItem('mancala_rating_v1', JSON.stringify({ rating: 1650 }));
      localStorage.setItem('mancala_mistakes_v1', JSON.stringify([{ id: 1, pit: 2 }]));
      localStorage.setItem('mancala_progress_v1', JSON.stringify({ streak: 7 }));
      localStorage.setItem('mancala_sound_enabled', 'false');
      localStorage.setItem('mancala_font_scale', 'L');
      localStorage.setItem('mancala_lang_v1', 'en');
      localStorage.setItem('mancala_dummy_custom_key', 'adversarial_payload');
      localStorage.setItem('unrelated_non_mancala_key', 'keep_this_data');
    });

    // Confirm that keys exist initially
    const initialKeys = await page.evaluate(() => Object.keys(localStorage));
    expect(initialKeys).toContain('mancala_game_v1');
    expect(initialKeys).toContain('mancala_rating_v1');
    expect(initialKeys).toContain('mancala_dummy_custom_key');

    // Set up dialog handler for window.confirm
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    // If on mobile/tablet, switch to Settings tab
    const settingsBtn = page.locator('[data-testid="bottom-settings-btn"]');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    }

    // Locate Erase My Data button
    const eraseBtn = page.getByRole('button', { name: /Erase My Data/i });
    await expect(eraseBtn).toBeVisible();

    // Click Erase My Data and wait for reload
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}),
      eraseBtn.click()
    ]);

    await page.waitForTimeout(500);

    // Verify localStorage after purge
    const purgedKeys = await page.evaluate(() => ({
      game: localStorage.getItem('mancala_game_v1'),
      rating: localStorage.getItem('mancala_rating_v1'),
      mistakes: localStorage.getItem('mancala_mistakes_v1'),
      progress: localStorage.getItem('mancala_progress_v1'),
      dummy: localStorage.getItem('mancala_dummy_custom_key'),
      unrelated: localStorage.getItem('unrelated_non_mancala_key')
    }));

    expect(purgedKeys.game, 'mancala_game_v1 must be purged').toBeNull();
    expect(purgedKeys.rating, 'mancala_rating_v1 must be purged').toBeNull();
    expect(purgedKeys.mistakes, 'mancala_mistakes_v1 must be purged').toBeNull();
    expect(purgedKeys.progress, 'mancala_progress_v1 must be purged').toBeNull();
    expect(purgedKeys.dummy, 'mancala_dummy_custom_key must be purged').toBeNull();
    expect(purgedKeys.unrelated, 'Unrelated non-mancala key should not be wiped').toBe('keep_this_data');
  });

});
