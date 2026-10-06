export type SkinTheme = 'walnut' | 'porcelain' | 'obsidian';

export interface ThemeStyles {
  id: SkinTheme;
  name: string;
  tagline: string;
  // Page & Shell
  appBg: string;
  appText: string;
  headerBg: string;
  headerBorder: string;
  // Cards & Panels
  cardBg: string;
  cardBorder: string;
  cardTextMuted: string;
  // Mancala Board
  boardBg: string;
  boardBorder: string;
  boardTrim: string;
  // Pits
  pitBg: string;
  pitBorder: string;
  pitShadowClass: string;
  pitHoverBorder: string;
  pitCountBg: string;
  pitCountText: string;
  // Highlight Glows
  pathGlow: string;
  landingGlow: string;
  // Stores
  storeBg: string;
  storeBorder: string;
  storeP1Text: string;
  storeP2Text: string;
  // Evaluation Bar
  barBg: string;
  barP1: string;
  barP2: string;
  barDivider: string;
  // Navigation & Controls
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveText: string;
  thumbBarBg: string;
  thumbBarBorder: string;
  // Accent Badges
  turnP1Bg: string;
  turnP2Bg: string;
}

export const THEMES: Record<SkinTheme, ThemeStyles> = {
  walnut: {
    id: 'walnut',
    name: 'Walnut',
    tagline: 'Artisanal carved hardwood & polished river gemstones',
    appBg: 'bg-[#14100d]',
    appText: 'text-[#f7f2ea]',
    headerBg: 'bg-[#1b140f]/90',
    headerBorder: 'border-[#352317]',
    cardBg: 'bg-[#1c1612]/90',
    cardBorder: 'border-[#38261a]',
    cardTextMuted: 'text-[#a8988a]',
    boardBg: 'bg-gradient-to-b from-[#2b1c13] via-[#20140d] to-[#150d08]',
    boardBorder: 'border-[#4a2e1d]',
    boardTrim: 'border-[#613c25]/40',
    pitBg: 'bg-[#120a06]',
    pitBorder: 'border-[#382215]',
    pitShadowClass: 'pit-shadow-walnut',
    pitHoverBorder: 'hover:border-amber-400/80',
    pitCountBg: 'bg-[#1c110a]/90 border-[#3d2416]',
    pitCountText: 'text-[#faebd7]',
    pathGlow: 'bg-[#3b2518]/80 border-amber-500/70',
    landingGlow: 'ring-2 ring-emerald-400 bg-emerald-950/60 border-emerald-500',
    storeBg: 'bg-[#120a06]/95',
    storeBorder: 'border-[#3d2416]',
    storeP1Text: 'text-amber-400',
    storeP2Text: 'text-emerald-400',
    barBg: 'bg-[#0e0804] border-[#382215]',
    barP1: 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400',
    barP2: 'bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-400',
    barDivider: 'bg-[#faf0e6]/70',
    tabActiveBg: 'bg-amber-600 text-white shadow-md shadow-amber-900/40',
    tabActiveText: 'text-amber-400 font-bold',
    tabInactiveText: 'text-[#a8988a] hover:text-[#f7f2ea]',
    thumbBarBg: 'bg-[#17110c]/95 border-[#382417]',
    thumbBarBorder: 'border-[#382417]',
    turnP1Bg: 'bg-amber-950/70 text-amber-300 border-amber-600/40',
    turnP2Bg: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/40'
  },

  porcelain: {
    id: 'porcelain',
    name: 'Clay',
    tagline: 'Minimalist stoneware ceramic & terracotta sea-pebbles',
    appBg: 'bg-[#f7f4ee]',
    appText: 'text-[#2c2723]',
    headerBg: 'bg-[#ffffff]/90',
    headerBorder: 'border-[#e5ded4]',
    cardBg: 'bg-[#ffffff]/95',
    cardBorder: 'border-[#e5ded4]',
    cardTextMuted: 'text-[#7d7368]',
    boardBg: 'bg-gradient-to-b from-[#eee7dc] via-[#e8dfd2] to-[#e0d6c7]',
    boardBorder: 'border-[#d6ccbd]',
    boardTrim: 'border-[#cfc3b2]/60',
    pitBg: 'bg-[#ded5c6]',
    pitBorder: 'border-[#c8bdad]',
    pitShadowClass: 'pit-shadow-porcelain',
    pitHoverBorder: 'hover:border-[#c85a3c]',
    pitCountBg: 'bg-[#ede6da] border-[#cfc4b4]',
    pitCountText: 'text-[#342e29]',
    pathGlow: 'bg-[#e5dcd0] border-[#c85a3c]/70',
    landingGlow: 'ring-2 ring-[#4a7c64] bg-[#dde8e1] border-[#4a7c64]',
    storeBg: 'bg-[#ded5c6]/95',
    storeBorder: 'border-[#c8bdad]',
    storeP1Text: 'text-[#b85038]',
    storeP2Text: 'text-[#3b6654]',
    barBg: 'bg-[#e0d7c8] border-[#c8bdad]',
    barP1: 'bg-gradient-to-r from-[#d96b4f] to-[#e88c74]',
    barP2: 'bg-gradient-to-l from-[#4f836c] to-[#6da48c]',
    barDivider: 'bg-[#2c2723]/60',
    tabActiveBg: 'bg-[#2c2723] text-white shadow-md shadow-stone-400/30',
    tabActiveText: 'text-[#2c2723] font-bold',
    tabInactiveText: 'text-[#7d7368] hover:text-[#2c2723]',
    thumbBarBg: 'bg-[#ffffff]/95 border-[#e5ded4]',
    thumbBarBorder: 'border-[#e5ded4]',
    turnP1Bg: 'bg-[#f7ded7] text-[#9c3a23] border-[#e8a392]',
    turnP2Bg: 'bg-[#dbe9e2] text-[#295240] border-[#88b9a3]'
  },

  obsidian: {
    id: 'obsidian',
    name: 'Slate',
    tagline: 'Precision milled graphite & sapphire crystal stones',
    appBg: 'bg-[#0b0c10]',
    appText: 'text-[#e8ebf0]',
    headerBg: 'bg-[#13151c]/90',
    headerBorder: 'border-[#222530]',
    cardBg: 'bg-[#141620]/90',
    cardBorder: 'border-[#222530]',
    cardTextMuted: 'text-[#8b92a4]',
    boardBg: 'bg-gradient-to-b from-[#181a23] via-[#12141a] to-[#0c0d12]',
    boardBorder: 'border-[#292d3b]',
    boardTrim: 'border-[#373c4d]/50',
    pitBg: 'bg-[#090a0d]',
    pitBorder: 'border-[#1b1d26]',
    pitShadowClass: 'pit-shadow-obsidian',
    pitHoverBorder: 'hover:border-sky-400',
    pitCountBg: 'bg-[#12141c] border-[#252836]',
    pitCountText: 'text-[#e2e8f0]',
    pathGlow: 'bg-sky-950/40 border-sky-500/70',
    landingGlow: 'ring-2 ring-emerald-400 bg-emerald-950/60 border-emerald-500',
    storeBg: 'bg-[#090a0d]/95',
    storeBorder: 'border-[#1b1d26]',
    storeP1Text: 'text-sky-400',
    storeP2Text: 'text-amber-400',
    barBg: 'bg-[#07080a] border-[#222530]',
    barP1: 'bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400',
    barP2: 'bg-gradient-to-l from-amber-600 via-amber-500 to-yellow-400',
    barDivider: 'bg-white/80',
    tabActiveBg: 'bg-sky-600 text-white shadow-md shadow-sky-950/50',
    tabActiveText: 'text-sky-400 font-bold',
    tabInactiveText: 'text-[#8b92a4] hover:text-[#e8ebf0]',
    thumbBarBg: 'bg-[#11131a]/95 border-[#222530]',
    thumbBarBorder: 'border-[#222530]',
    turnP1Bg: 'bg-sky-950/70 text-sky-300 border-sky-600/40',
    turnP2Bg: 'bg-amber-950/70 text-amber-300 border-amber-600/40'
  }
};
