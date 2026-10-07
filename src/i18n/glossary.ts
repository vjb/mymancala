/**
 * src/i18n/glossary.ts
 * 10 calm tactical Mancala terms written in plain, friendly language (Grade 4 reading level).
 * Replaces engine jargon ("centipawns", "equity loss", "PR", "minimax rollout", "plies").
 */

export interface GlossaryEntry {
  id: string;
  term: string;
  calmAlternativeFor: string;
  definition: string;
  mancalaExample: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  positionBalance: {
    id: 'positionBalance',
    term: 'Position balance',
    calmAlternativeFor: 'Evaluation / Centipawns',
    definition: 'A calm measure of which player controls more stones and future scoring opportunities.',
    mancalaExample: 'When both players have 24 stones in their stores and pits, the balance is even (±0.0).'
  },
  expectedLead: {
    id: 'expectedLead',
    term: 'Expected lead',
    calmAlternativeFor: 'Equity / Advantage',
    definition: 'The estimated difference in banked stones if both sides play thoughtful moves.',
    mancalaExample: '+2 stones ahead means you are on pace to finish with 2 more stones in your store.'
  },
  bestLine: {
    id: 'bestLine',
    term: 'Best line',
    calmAlternativeFor: 'Principal Variation / PV',
    definition: 'The predicted sequence of moves that both players are expected to make next.',
    mancalaExample: 'P3 → P1 → P5 shows a recommended first move and the anticipated responses.'
  },
  goAgain: {
    id: 'goAgain',
    term: 'Go again',
    calmAlternativeFor: 'Free Turn / Extra Turn',
    definition: 'An extra turn earned immediately when your last dropped pebble lands in your own store.',
    mancalaExample: 'Sowing from pit 3 with 3 pebbles lands right in your store, giving you a bonus turn.'
  },
  oppositeCapture: {
    id: 'oppositeCapture',
    term: 'Opposite capture',
    calmAlternativeFor: 'Capture / Material theft',
    definition: 'When your last pebble lands in an empty pit on your side, you take all pebbles in the pit directly across.',
    mancalaExample: 'Landing in empty Pit 2 captures all 7 pebbles sitting in opponent Pit 10.'
  },
  tacticalThreat: {
    id: 'tacticalThreat',
    term: 'Tactical threat',
    calmAlternativeFor: 'Threat / Blunder condition',
    definition: 'An opponent pit that can execute a big capture or chain multiple extra turns on their next turn.',
    mancalaExample: 'An opponent pit with 4 stones that will land in an empty pit across from your rich storehouse.'
  },
  mistakesPer100: {
    id: 'mistakesPer100',
    term: 'Mistakes per 100 moves',
    calmAlternativeFor: 'PR / Performance Rating',
    definition: 'An encouraging measure of how accurately you played over the entire match.',
    mancalaExample: 'Losing an average of less than 2 stones per 100 moves is master-level play!'
  },
  turnsAhead: {
    id: 'turnsAhead',
    term: 'Looking ahead',
    calmAlternativeFor: 'Plies / Search Depth',
    definition: 'How many turns into the future the computer calculates before choosing a move.',
    mancalaExample: 'Looking ahead 5 moves means evaluating your turn, their turn, your next turn, etc.'
  },
  bankedStones: {
    id: 'bankedStones',
    term: 'Banked stones',
    calmAlternativeFor: 'Store Score / Invariant',
    definition: 'Stones safely held in your Kalah Store that cannot be moved, stolen, or captured.',
    mancalaExample: 'Once 25 stones are in your store, victory is guaranteed regardless of board play.'
  },
  endgameSweep: {
    id: 'endgameSweep',
    term: 'Endgame sweep',
    calmAlternativeFor: 'Terminal Sweep / Cleanup',
    definition: 'When one player clears all their pits, the other player collects all stones remaining on their side.',
    mancalaExample: 'Clearing your side triggers the sweep, adding the opponent’s remaining stones to their store.'
  }
};
