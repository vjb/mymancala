import { describe, it, expect } from 'vitest';
import { BOT_PERSONAS, getBotReaction, DEFAULT_BOT_ID } from './bots';

describe('Bot Personas & Trash-Talk Engine', () => {
  it('defines all 4 key bot personas with increasing depths', () => {
    expect(BOT_PERSONAS['pip']).toBeDefined();
    expect(BOT_PERSONAS['gary']).toBeDefined();
    expect(BOT_PERSONAS['pebble']).toBeDefined();
    expect(BOT_PERSONAS['kalah']).toBeDefined();

    expect(BOT_PERSONAS['pip'].depth).toBe(2);
    expect(BOT_PERSONAS['gary'].depth).toBe(4);
    expect(BOT_PERSONAS['pebble'].depth).toBe(6);
    expect(BOT_PERSONAS['kalah'].depth).toBe(8);
  });

  it('provides quotes for all major reaction events', () => {
    const bot = BOT_PERSONAS['gary'];
    const events = [
      'start', 'bot_move', 'bot_free_turn', 'bot_capture',
      'player_capture', 'player_free_turn', 'player_blunder',
      'bot_win', 'bot_loss'
    ] as const;

    for (const evt of events) {
      expect(bot.quotes[evt]).toBeDefined();
      expect(bot.quotes[evt].length).toBeGreaterThan(0);
      const quote = getBotReaction('gary', evt);
      expect(typeof quote).toBe('string');
      expect(quote.length).toBeGreaterThan(0);
    }
  });

  it('falls back gracefully to default bot if invalid botId is supplied', () => {
    const reaction = getBotReaction('non_existent_bot', 'bot_capture');
    expect(typeof reaction).toBe('string');
    expect(reaction.length).toBeGreaterThan(0);
  });
});
