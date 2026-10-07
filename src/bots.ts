/**
 * Bot Personas and Banter Engine for Mancala
 * Crafted for teens/kids (12+) with fun personalities, avatars, and situational trash-talk.
 */

export type BotReactionEvent = 
  | 'start'
  | 'bot_move'
  | 'bot_free_turn'
  | 'bot_capture'
  | 'player_capture'
  | 'player_free_turn'
  | 'player_blunder'
  | 'bot_win'
  | 'bot_loss';

export interface BotPersona {
  id: string;
  name: string;
  title: string;
  avatar: string;
  depth: number;
  badgeColor: string;
  bgGradient: string;
  tagline: string;
  quotes: Record<BotReactionEvent, string[]>;
}

export const BOT_PERSONAS: Record<string, BotPersona> = {
  pip: {
    id: 'pip',
    name: 'Speedy Pip',
    title: 'Speed Demon',
    avatar: '⚡🐰',
    depth: 2,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
    bgGradient: 'from-amber-400 to-orange-500',
    tagline: 'Hyperactive rookie who loves turbo free-turns!',
    quotes: {
      start: [
        "Beep beep! Fast moves only, let's GO!",
        "Don't blink or you'll miss my turn!",
        "Pebbles go ZOOM!"
      ],
      bot_move: [
        "Zooming through the pits!",
        "Catch me if you can!",
        "Next pit, next pit, done!"
      ],
      bot_free_turn: [
        "FREE TURN BABY! I get to go AGAIN!",
        "Another one! Can't stop, won't stop!",
        "Bonus turn streak unlocked!"
      ],
      bot_capture: [
        "YOINK! Snatched your pebbles right up!",
        "Free snack for my store! Yum!",
        "Clean sweep! My turn again soon!"
      ],
      player_capture: [
        "Hey! Those were my pebbles!",
        "Whoa, rude! Put 'em back!",
        "Ouch! Lucky grab, friend."
      ],
      player_free_turn: [
        "Wait, you got a free turn too?! Unfair!",
        "Hey, save some turns for me!",
        "Nice chain... but mine will be faster!"
      ],
      player_blunder: [
        "Hehe, did your finger slip?",
        "Oof! I saw that from a mile away!",
        "Thanks for the gift!"
      ],
      bot_win: [
        "VICTORY LAP! Speed beats everything!",
        "Gotta go fast! GG friend!",
        "Champion of the speed pits!"
      ],
      bot_loss: [
        "Aww, you got me! Rematch right now?",
        "Too good! My turbo ran out of juice!",
        "GG! You're ridiculously fast!"
      ]
    }
  },

  gary: {
    id: 'gary',
    name: 'Greedy Gary',
    title: 'Stone Hoarder',
    avatar: '🦝💰',
    depth: 4,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
    bgGradient: 'from-emerald-500 to-teal-600',
    tagline: 'Raccoon hoarder who stacks massive pebble towers.',
    quotes: {
      start: [
        "All your pebbles will soon be MINE!",
        "I smell shiny pebbles. Hand 'em over!",
        "Step away from the board, I'm collecting."
      ],
      bot_move: [
        "Adding more to my secret treasure stash...",
        "Building a mountain of stones!",
        "Every seed brings me closer to wealth!"
      ],
      bot_free_turn: [
        "Double the turns = double the profit!",
        "The rich get richer! Another turn for Gary!",
        "More turns, more pebbles, more GLORY!"
      ],
      bot_capture: [
        "MINE! ALL MINE! MWAHAHA!",
        "Look at that haul! Raccoon jackpot!",
        "Your pit is empty, my vault is full!"
      ],
      player_capture: [
        "NOOO! MY PRECIOUS PEBBLES!",
        "You thief! I was saving those for winter!",
        "My treasure hoard... how dare you!"
      ],
      player_free_turn: [
        "Don't get too comfortable over there...",
        "One free turn won't save your stash!",
        "Fine, take your little bonus."
      ],
      player_blunder: [
        "Free real estate! Thanks for the blunder!",
        "Did you really just leave that open for me?!",
        "Chef's kiss! Delicious mistake!"
      ],
      bot_win: [
        "THE VAULT IS PACKED! Gary takes the gold!",
        "Another satisfied heist! GG!",
        "King of the Shiny Stones!"
      ],
      bot_loss: [
        "My pebbles... gone... You out-hustled me!",
        "I demand a refund on this game!",
        "Well played... but my raccoon gang will return!"
      ]
    }
  },

  pebble: {
    id: 'pebble',
    name: 'Prof. Pebble',
    title: 'Tactical Owl',
    avatar: '🦉📐',
    depth: 6,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
    bgGradient: 'from-blue-600 to-indigo-600',
    tagline: 'Calculates every pit trajectory. Zero mercy, witty roasts.',
    quotes: {
      start: [
        "According to my calculations, you have a 41.9% survival rate.",
        "Let us explore the mathematical elegance of Mancala.",
        "Grab your notebook. Class is in session."
      ],
      bot_move: [
        "Executing line optimal sequence #47...",
        "A mathematically irrefutable maneuver.",
        "Notice the geometric harmony of this pit distribution."
      ],
      bot_free_turn: [
        "Store parity achieved. An extra tempo for me.",
        "Calculated to the exact stone. Free turn executed.",
        "Predictable perfection. I shall proceed again."
      ],
      bot_capture: [
        "Direct opposite-pit intercept. +QED.",
        "Your stones have been absorbed into my statistical margin.",
        "Flawless trajectory. The math never lies."
      ],
      player_capture: [
        "Fascinating... an unexpected tactical counter-punch.",
        "Hmph. My variance model did not predict that capture.",
        "Credit where due: mathematically sound move."
      ],
      player_free_turn: [
        "Competent parity calculation. Keep it up.",
        "A valid repetition. Let us see your follow-up.",
        "Not bad for a mortal student."
      ],
      player_blunder: [
        "Did you skip your probability homework today?",
        "Sub-optimal. That move leaks severe equity.",
        "An educational catastrophe! Allow me to exploit it."
      ],
      bot_win: [
        "Checkmate in pebble notation! Q.E.D.",
        "A masterclass in combinatorial game theory. GG!",
        "Theory prevails once again. Good attempt!"
      ],
      bot_loss: [
        "Inconceivable! You out-calculated the professor!",
        "A statistical anomaly... you played brilliantly!",
        "Full marks. You have graduated to master class."
      ]
    }
  },

  kalah: {
    id: 'kalah',
    name: 'Grandmaster Kalah',
    title: 'Ancient Master',
    avatar: '👑🗿',
    depth: 8,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
    bgGradient: 'from-purple-600 to-pink-600',
    tagline: 'The ancient Mancala oracle. Sees 8 turns into the future.',
    quotes: {
      start: [
        "The ancient sands awaken. Show me your true spirit.",
        "Ten thousand years of Mancala flow through my hands.",
        "Play with honor, young traveler."
      ],
      bot_move: [
        "The seeds fall precisely where destiny dictates.",
        "Patience is the sharpest weapon on the wooden board.",
        "Every stone carries the weight of a thousand games."
      ],
      bot_free_turn: [
        "The flow of the river returns to its source.",
        "Harmony restored. The cycle repeats.",
        "Time bends. Another turn belongs to Kalah."
      ],
      bot_capture: [
        "As the hawk strikes from the desert sky.",
        "Your seeds return to the earth of my sanctuary.",
        "The balance shifts inexorably."
      ],
      player_capture: [
        "A fierce and noble strike! You honor this board.",
        "Impressive. The fire of a true challenger burns within you.",
        "A worthy response to the ancient arts."
      ],
      player_free_turn: [
        "You walk the path of the masters.",
        "Clean execution. The rhythm is yours.",
        "Show me how deep your vision goes."
      ],
      player_blunder: [
        "Haste is the poison of wisdom.",
        "A reckless seed has fallen from grace.",
        "The sands forgive no carelessness."
      ],
      bot_win: [
        "The sands rest once more. Honor to your valiant fight.",
        "Experience was the victor today. Study the review well.",
        "A legendary match. Return when your spirit has grown."
      ],
      bot_loss: [
        "Incredible... the student has surpassed the master!",
        "The crown passes to you, young grandmaster! Glorious victory!",
        "Bows before you. Truly a masterpiece of Mancala play."
      ]
    }
  }
};

export const DEFAULT_BOT_ID = 'gary';

export function getBotReaction(
  botId: string, 
  event: BotReactionEvent, 
  customContext?: string
): string {
  const bot = BOT_PERSONAS[botId] || BOT_PERSONAS[DEFAULT_BOT_ID];
  const list = bot.quotes[event];
  if (!list || list.length === 0) return customContext || "Let's play!";
  
  // Pick a random quote
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
