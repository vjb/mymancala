import { test, expect } from '@playwright/test';

test.describe('Preserved data-testid Runtime Completeness E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('verifies core board, stores, and header testids', async ({ page }) => {
    // 1. Stores (store-6 and store-13)
    await expect(page.locator('[data-testid="store-6"]')).toBeVisible();
    await expect(page.locator('[data-testid="store-13"]')).toBeVisible();

    // 2. Player 1 pits (0-5) and counts (pit-count-0 .. 5)
    for (let i = 0; i <= 5; i++) {
      await expect(page.locator(`[data-testid="pit-${i}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="pit-count-${i}"]`)).toBeVisible();
    }

    // 3. Player 2 pits (7-12) and counts (pit-count-7 .. 12)
    for (let i = 7; i <= 12; i++) {
      await expect(page.locator(`[data-testid="pit-${i}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="pit-count-${i}"]`)).toBeVisible();
    }

    // 4. TurnBanner testids
    await expect(page.locator('[data-testid="turn-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-stones"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-stones"]')).toContainText('48');

    // 5. Eval gauge
    await expect(page.locator('[data-testid="eval-gauge"]')).toBeVisible();

    // 6. Header reset button
    const resetBtn = page.locator('[data-testid="reset-game-btn"]');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await expect(page.locator('[data-testid="total-stones"]')).toContainText('48');
  });

  test('verifies bottom tray navigation and rules modal testids', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (!isMobile) return;

    await expect(page.locator('[data-testid="bottom-tray"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-board-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-analysis-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutor-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-rules-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-settings-btn"]')).toBeVisible();

    // Open Rules modal via tray
    await page.locator('[data-testid="bottom-rules-btn"]').click();
    const rulesHeading = page.locator('text=How to Play Mancala');
    await expect(rulesHeading).toBeVisible();
    await page.locator('button[aria-label="Close rules"]').click();
    await expect(rulesHeading).not.toBeVisible();
  });

  test('verifies settings panel, presets, lenses, modes, and ai-duel-toggle testids', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }

    // Presets
    const presets = ['justPlay', 'hints', 'coach', 'full'];
    for (const p of presets) {
      await expect(page.locator(`[data-testid="preset-${p}"]`)).toBeVisible();
    }

    // Lenses (the 7 registered lenses)
    const lenses = [
      'advantageBar',
      'bestMoveMarks',
      'coach',
      'explanations',
      'errorRate',
      'winPercent',
      'mainLine'
    ];
    for (const l of lenses) {
      await expect(page.locator(`[data-testid="lens-${l}"]`)).toBeVisible();
    }

    // Modes
    const modes = ['pve', 'ai_vs_ai', 'pvp', 'sandbox'];
    for (const m of modes) {
      await expect(page.locator(`[data-testid="mode-${m}"]`)).toBeVisible();
    }

    // Switch to AI vs AI mode to verify ai-duel-toggle
    await page.locator('[data-testid="mode-ai_vs_ai"]').click();
    await expect(page.locator('[data-testid="ai-duel-toggle"]')).toBeVisible();

    // Diagnostics modal
    const diagBtn = page.locator('[data-testid="open-diagnostics-btn"]');
    await expect(diagBtn).toBeVisible();
    await diagBtn.click();

    const diagModal = page.locator('[data-testid="diagnostics-modal"]');
    await expect(diagModal).toBeVisible();
    await page.locator('[data-testid="diagnostics-modal"] button[aria-label="Close"]').click();
    await expect(diagModal).not.toBeVisible();
  });

  test('verifies sandbox mode and sandbox plus/minus pit testids', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }

    // Switch to Sandbox mode
    await page.locator('[data-testid="mode-sandbox"]').click();

    if (isMobile) {
      await page.locator('[data-testid="bottom-board-btn"]').click();
    }

    // Check sandbox-plus-0 and sandbox-minus-0 are rendered
    const plus0 = page.locator('[data-testid="sandbox-plus-0"]');
    const minus0 = page.locator('[data-testid="sandbox-minus-0"]');
    await expect(plus0).toBeVisible();
    await expect(minus0).toBeVisible();

    // Click plus0 to add a stone
    await plus0.click();
    await expect(page.locator('[data-testid="pit-count-0"]')).toHaveText('5');

    // Click minus0 to remove a stone
    await minus0.click();
    await expect(page.locator('[data-testid="pit-count-0"]')).toHaveText('4');
  });

  test('verifies analysis panel, eval rows, and eval play testids', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;

    // Switch to Analysis tab on mobile
    if (isMobile) {
      await page.locator('[data-testid="bottom-analysis-btn"]').click();
    }

    // Wait for analysis to evaluate initial state (using :visible)
    const evalRow0 = page.locator('[data-testid="eval-row-0"]:visible');
    await evalRow0.waitFor({ state: 'visible', timeout: 5000 });

    // Eval rows
    await expect(evalRow0).toBeVisible();
    await expect(page.locator('[data-testid="eval-row-worst"]:visible')).toBeVisible();

    // Eval play pit button
    const evalPlayBtn = page.locator('[data-testid^="eval-play-pit-"]:visible').first();
    await expect(evalPlayBtn).toBeVisible();
  });

  test('verifies tutor modal and coach testids on mistake', async ({ page }) => {
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 1024 : false;
    if (isMobile) {
      await page.locator('[data-testid="bottom-settings-btn"]').click();
    }
    await page.locator('[data-testid="preset-coach"]').click();

    if (isMobile) {
      await page.locator('[data-testid="bottom-board-btn"]').click();
    }

    // Wait for analysis to evaluate initial position
    await page.waitForTimeout(600);

    // Pit 0 is a mistake/blunder in Kalah (pit 2 is best with free turn)
    const pit0 = page.locator('[data-testid="pit-0"]');
    await pit0.click();

    // Tutor modal should appear
    const tutorModal = page.locator('[data-testid="tutor-modal"]');
    await expect(tutorModal).toBeVisible();

    // Verify tutor action buttons
    await expect(page.locator('[data-testid="tutor-reconsider"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutor-play-best"]')).toBeVisible();
    await expect(page.locator('[data-testid="tutor-confirm"]')).toBeVisible();

    // Reconsider should dismiss tutor modal
    await page.locator('[data-testid="tutor-reconsider"]').click();
    await expect(tutorModal).not.toBeVisible();
  });
});
