export interface ResultCardOptions {
  winner: 0 | 1 | null;
  p0Score: number;
  p1Score: number;
  totalMoves: number;
  board: number[];           // 14 pits
  rulesName?: string;
  replayUrl?: string;
  skinId?: string;
}

/**
 * Pure on-device Canvas result card renderer.
 * Strictly guarantees ZERO external calls, NO PII, NO avatars, NO trackers.
 */
export function renderResultCard(
  canvas: HTMLCanvasElement,
  options: ResultCardOptions
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Background - Calm dark obsidian/slate aesthetic
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Title / Result Header
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const resultTitle = options.winner === 0
    ? 'Player 1 Victory!'
    : options.winner === 1
      ? 'Player 2 Victory!'
      : 'Honorable Draw';
  ctx.fillText(resultTitle, width / 2, 70);

  // Score Subheader
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${options.p0Score}  —  ${options.p1Score}`, width / 2, 130);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `${options.rulesName || 'Kalah'} • ${options.totalMoves} moves played`,
    width / 2,
    165
  );

  // Board Art: Stylized Mancala Board
  const boardX = 50;
  const boardY = 200;
  const boardW = width - 100;
  const boardH = 240;

  // Board wood frame
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(boardX, boardY, boardW, boardH, 24);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.stroke();

  // P1 Store (left or right)
  const storeW = 55;
  const storeH = boardH - 40;
  
  // P2 Store (left, index 13)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(boardX + 20, boardY + 20, storeW, storeH, 16);
  ctx.fill();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(String(options.board[13] ?? 0), boardX + 20 + storeW / 2, boardY + 20 + storeH / 2 + 7);

  // P1 Store (right, index 6)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(boardX + boardW - storeW - 20, boardY + 20, storeW, storeH, 16);
  ctx.fill();
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(String(options.board[6] ?? 0), boardX + boardW - storeW - 20 + storeW / 2, boardY + 20 + storeH / 2 + 7);

  // Pits: 6 columns
  const pitStartX = boardX + storeW + 35;
  const pitWidth = (boardW - storeW * 2 - 70) / 6;

  for (let c = 0; c < 6; c++) {
    const p2PitIdx = 12 - c; // top row (7..12 from right to left)
    const p1PitIdx = c;      // bottom row (0..5 from left to right)
    const cx = pitStartX + c * pitWidth + pitWidth / 2;

    // Top pit (P2)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, boardY + 65, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(String(options.board[p2PitIdx] ?? 0), cx, boardY + 71);

    // Bottom pit (P1)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, boardY + boardH - 65, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(String(options.board[p1PitIdx] ?? 0), cx, boardY + boardH - 59);
  }

  // Footer / Replay Link Notice
  ctx.fillStyle = '#64748b';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Mancala Coach • Privacy-Safe & Local-Only', width / 2, height - 55);

  if (options.replayUrl) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px monospace';
    const displayUrl = options.replayUrl.length > 55
      ? options.replayUrl.slice(0, 52) + '...'
      : options.replayUrl;
    ctx.fillText(displayUrl, width / 2, height - 32);
  }
}

/**
 * Exports result card canvas to PNG Blob.
 */
export function exportResultCardBlob(options: ResultCardOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Canvas export requires browser DOM document.'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 540;
    renderResultCard(canvas, options);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob conversion failed.'));
    }, 'image/png');
  });
}

/**
 * Triggers native OS share or downloads PNG fallback.
 */
export async function shareOrDownloadResultCard(
  options: ResultCardOptions
): Promise<{ shared: boolean; downloaded: boolean }> {
  try {
    const blob = await exportResultCardBlob(options);
    const file = new File([blob], 'mancala-match-result.png', { type: 'image/png' });

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Mancala Match Result',
        text: `Mancala game result: ${options.p0Score} - ${options.p1Score}`,
        files: [file],
      });
      return { shared: true, downloaded: false };
    }
  } catch {
    // Fall back to direct file download
  }

  // Fallback: trigger download
  if (typeof document !== 'undefined') {
    const blob = await exportResultCardBlob(options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mancala-match-result.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { shared: false, downloaded: true };
  }

  return { shared: false, downloaded: false };
}
