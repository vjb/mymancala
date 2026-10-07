import { GameReviewData, MoveRecord, SwingMoment } from '../GameReviewModal';
import { GameStateRecord } from './gameTypes';
import { BotPersona } from '../bots';
import { P1_STORE, P2_STORE } from '../engine';
import { formatDescriptiveLabel } from '../rules/kalah';
import { loadRatingProfile, calculateRatingDelta, BOT_RATINGS } from '../trainer/rating';

export function computeGameReviewData(state: GameStateRecord, activeBot: BotPersona): GameReviewData {
  const p1Moves = state.gameMovesHistory.filter(m => m.player === 0);
  const p2Moves = state.gameMovesHistory.filter(m => m.player === 1);
  const calcAcc = (moves: MoveRecord[]) => {
    if (moves.length === 0) return 100;
    const totalLoss = moves.reduce((sum, m) => sum + (m.equityLoss || 0), 0);
    const avgLoss = totalLoss / moves.length;
    return Math.max(20, Math.min(100, Math.round(100 - avgLoss * 160)));
  };
  const p1Acc = calcAcc(p1Moves);
  const p2Acc = calcAcc(p2Moves);

  // Persistent Elo rating ladder integration
  const ratingProfile = loadRatingProfile();
  const botRating = BOT_RATINGS[activeBot.id.toLowerCase()] || (800 + activeBot.depth * 130);
  let ratingDelta = 0;
  if (state.gameMode === 'pve' && state.isGameOver) {
    const outcome: 1 | 0.5 | 0 = state.winner === 0 ? 1 : state.winner === 1 ? 0 : 0.5;
    ratingDelta = calculateRatingDelta(ratingProfile.rating, botRating, outcome, ratingProfile.gamesPlayed);
  }
  const p1Elo = ratingProfile.rating;
  const p2Elo = botRating;

  const countGrades = (moves: MoveRecord[]) => ({
    best: moves.filter(m => m.classification === 'Best' || m.classification === 'Brilliant' || (m as any).grade === 'best').length,
    good: moves.filter(m => m.classification === 'Good' || (m as any).grade === 'good').length,
    inaccuracy: moves.filter(m => m.classification === 'Inaccuracy' || (m as any).grade === 'inaccuracy').length,
    mistake: moves.filter(m => m.classification === 'Mistake' || (m as any).grade === 'mistake').length,
    blunder: moves.filter(m => m.classification === 'Blunder' || (m as any).grade === 'blunder').length,
  });

  const topSwings: SwingMoment[] = state.gameMovesHistory
    .map((m, idx) => ({
      turnNumber: idx + 1,
      player: m.player,
      pit: m.pit,
      lossStones: m.equityLoss ? Math.round(m.equityLoss * 10) / 10 : 0,
      grade: ((m.classification?.toLowerCase() as any) || 'good') as any,
      bestPit: m.bestPit,
      boardBeforeMove: m.boardBeforeMove,
      description: m.classification === 'Blunder'
        ? `${formatDescriptiveLabel(m.pit)} was a severe blunder (-${((m.equityLoss || 0) * 10).toFixed(1)} stones)`
        : m.classification === 'Mistake'
          ? `${formatDescriptiveLabel(m.pit)} conceded equity (-${((m.equityLoss || 0) * 10).toFixed(1)} stones)`
          : `Turn ${idx + 1}: Inaccuracy on ${formatDescriptiveLabel(m.pit)}`
    }))
    .filter(m => m.lossStones > 0.5)
    .sort((a, b) => b.lossStones - a.lossStones)
    .slice(0, 3);

  return {
    winner: state.winner,
    p1Score: state.board[P1_STORE],
    p2Score: state.board[P2_STORE],
    p1Accuracy: p1Acc,
    p2Accuracy: p2Acc,
    p1Elo,
    p2Elo,
    ratingDelta,
    p1Counts: countGrades(p1Moves),
    p2Counts: countGrades(p2Moves),
    totalMoves: state.gameMovesHistory.length,
    turningPoint: state.lastDecisiveTurn || undefined,
    topSwings,
    bot: state.gameMode === 'pve' ? activeBot : undefined
  };
}
