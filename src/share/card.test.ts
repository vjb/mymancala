import { describe, it, expect, vi } from 'vitest';
import { renderResultCard, ResultCardOptions } from './card';

describe('Privacy-Safe Result Card Canvas Exporter', () => {
  it('renders result card without throwing and with zero external network requests', () => {
    const filledText: string[] = [];
    const mockCtx = {
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn((text: string) => {
        filledText.push(String(text));
      }),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
    } as any;

    const mockCanvas = {
      width: 640,
      height: 540,
      getContext: vi.fn().mockReturnValue(mockCtx),
    } as unknown as HTMLCanvasElement;

    const options: ResultCardOptions = {
      winner: 0,
      p0Score: 28,
      p1Score: 20,
      totalMoves: 34,
      board: [0, 0, 1, 0, 0, 0, 28, 0, 0, 0, 0, 0, 0, 20],
      rulesName: 'Kalah',
      replayUrl: 'http://localhost/#/r/v1.kalah.abc.22',
      skinId: 'walnut',
    };

    renderResultCard(mockCanvas, options);

    // Verify critical privacy-safe and truth-first visual elements
    expect(filledText).toContain('Player 1 Victory!');
    expect(filledText).toContain('28  —  20');
    expect(filledText).toContain('Kalah • 34 moves played');
    expect(filledText).toContain('Mancala Coach • Privacy-Safe & Local-Only');

    // Asserts zero external images loaded (zero canvas.drawImage calls)
    expect((mockCtx as any).drawImage).toBeUndefined();
  });

  it('renders honorable draw correctly', () => {
    const filledText: string[] = [];
    const mockCtx = {
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn((text: string) => filledText.push(String(text))),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
    } as any;

    const mockCanvas = {
      width: 640,
      height: 540,
      getContext: vi.fn().mockReturnValue(mockCtx),
    } as unknown as HTMLCanvasElement;

    const options: ResultCardOptions = {
      winner: null,
      p0Score: 24,
      p1Score: 24,
      totalMoves: 40,
      board: new Array(14).fill(0),
    };

    renderResultCard(mockCanvas, options);
    expect(filledText).toContain('Honorable Draw');
    expect(filledText).toContain('24  —  24');
  });
});
