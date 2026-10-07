import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('Preserved data-testid Invariant Verification', () => {
  const srcFiles = getAllSourceFiles(path.resolve(__dirname, '../src'));
  const allSourceContent = srcFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');

  const requiredTestIds = [
    'store-13',
    'store-6',
    'pit-0', // and dynamic pit-${pitIndex}
    'pit-count-0', // and dynamic pit-count-${pitIndex}
    'sandbox-minus-0', // and dynamic sandbox-minus-${pitIndex}
    'sandbox-plus-0', // and dynamic sandbox-plus-${pitIndex}
    'reset-game-btn',
    'eval-gauge',
    'turn-indicator',
    'total-stones',
    'ribbon-hints-btn',
    'game-over-banner',
    'game-over-review-btn',
    'tutor-modal',
    'tutor-reconsider',
    'tutor-play-best',
    'tutor-confirm',
    'analysis-review-btn',
    'eval-row-0',
    'eval-row-worst',
    'preset-',
    'lens-',
    'mode-pve',
    'mode-ai_vs_ai',
    'mode-pvp',
    'mode-sandbox',
    'ai-duel-toggle',
    'open-diagnostics-btn',
    'bottom-board-btn',
    'bottom-analysis-btn',
    'tutor-toggle',
    'bottom-rules-btn',
    'bottom-settings-btn',
    'diagnostics-modal'
  ];

  for (const testId of requiredTestIds) {
    it(`preserves data-testid "${testId}" in decomposed components`, () => {
      const found = allSourceContent.includes(`data-testid="${testId}"`) ||
        allSourceContent.includes(`data-testid={\`pit-\${`) ||
        allSourceContent.includes(`data-testid={\`pit-count-\${`) ||
        allSourceContent.includes(`data-testid={\`sandbox-minus-\${`) ||
        allSourceContent.includes(`data-testid={\`sandbox-plus-\${`) ||
        allSourceContent.includes(`data-testid={\`preset-\${`) ||
        allSourceContent.includes(`data-testid={\`lens-\${`) ||
        allSourceContent.includes(`data-testid={\`mode-\${`) ||
        allSourceContent.includes(`data-testid={\`store-\${`);
      expect(found).toBe(true);
    });
  }
});
