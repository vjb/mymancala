import { GameReviewData, MoveRecord, SwingMoment } from '../GameReviewModal';
import { GameStateRecord } from './gameTypes';
import { BotPersona } from '../bots';
import { P1_STORE, P2_STORE } from '../engine';

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
  const p1Elo = Math.round(800 + (p1Acc / 100) * 850 + (activeBot.depth * 40));
  const p2Elo = Math.round(800 + (p2Acc / 100) * 850 + (activeBot.depth * 40));

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
      description: m.classification === 'Blunder'
        ? `Pit ${m.pit} was a severe blunder (-${((m.equityLoss || 0) * 10).toFixed(1)} stones)`
        : m.classification === 'Mistake'
          ? `Pit ${m.pit} conceded equity (-${((m.equityLoss || 0) * 10).toFixed(1)} stones)`
          : `Turn ${idx + 1}: Inaccuracy on Pit ${m.pit}`
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
    p1Counts: countGrades(p1Moves),
    p2Counts: countGrades(p2Moves),
    totalMoves: state.gameMovesHistory.length,
    turningPoint: state.lastDecisiveTurn || undefined,
    topSwings,
    bot: state.gameMode === 'pve' ? activeBot : undefined
  };
}
