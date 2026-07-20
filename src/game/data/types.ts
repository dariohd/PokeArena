export type MoveKind = 'physical' | 'special' | 'status'

export type MoveSummary = {
  id: number
  name: string
  nameFr: string
  type: string
  power: number | null
  accuracy: number | null
  pp: number
  priority: number
  damageClass: MoveKind
  effectChance: number | null
}

export type MonSummary = {
  id: number
  name: string
  nameFr: string
  genusFr: string
  flavorFr: string
  spriteKey: string
  spriteUrl: string
  /** Sprite Pokémon HOME (512px HQ) */
  homeKey: string
  homeUrl: string
  homeShinyUrl: string
  battleKey: string
  battleUrl: string
  spriteUrlShiny: string
  battleShinyUrl: string
  cryUrl: string | null
  types: string[]
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
  color: number
  captureRate: number
  isLegendary: boolean
  isMythical: boolean
  /** 0 = forme de base, 1 = milieu, 2+ = finale */
  evoStage: number
  generation: number
  evolutionChainId: number | null
  evolvesTo: number[]
  moves: MoveSummary[]
  abilityName: string
  abilityNameFr: string
}

export type OwnedMon = {
  id: number
  level: number
  xp: number
  shiny: boolean
  /** Rareté 1–3 (stade d’évolution) · 4 (légendaire / mythique) */
  stars: number
  /** Niveaux gagnés via Super Bonbons */
  trainBonus: number
}

export type Inventory = {
  /** Poké Ball = ticket de bannière. Autres Balls gardées pour saves legacy. */
  pokeball: number
  greatball: number
  ultraball: number
  masterball: number
  potion: number
  superpotion: number
  hyperpotion: number
  revive: number
  /** Super Bonbon : +1 niveau */
  rareCandy: number
}

export type MissionId = 'wave3' | 'win1' | 'gacha1' | 'train1'

export type MissionState = {
  id: MissionId
  progress: number
  target: number
  claimed: boolean
}

export type RegionId =
  | 'kanto'
  | 'johto'
  | 'hoenn'
  | 'sinnoh'
  | 'unova'
  | 'kalos'
  | 'alola'
  | 'galar'
  | 'paldea'

export type RegionBanner = {
  id: RegionId
  gen: number
  nameFr: string
  gamesFr: string
  color: number
  minId: number
  maxId: number
  /** Stars / légendaires mis en avant */
  featured: number[]
}

export type SaveData = {
  version: 4
  starterId: number
  roster: number[]
  team: OwnedMon[]
  box: OwnedMon[]
  seen: number[]
  /** Pokédollars */
  coins: number
  bestWave: number
  runs: number
  inventory: Inventory
  unlockedGen: number
  mute: boolean
  autoMode: boolean
  gachaPityByBanner: Partial<Record<RegionId, number>>
  missions: MissionState[]
  lastMissionDay: string
}

export type ArenaResult = {
  won: boolean
  wave: number
  coins: number
  kos: number
  damageDealt: number
  xpGained: number
}

export const TYPE_COLORS: Record<string, number> = {
  normal: 0xa8a878,
  fire: 0xf08030,
  water: 0x6890f0,
  electric: 0xf8d030,
  grass: 0x78c850,
  ice: 0x98d8d8,
  fighting: 0xc03028,
  poison: 0xa040a0,
  ground: 0xe0c068,
  flying: 0xa890f0,
  psychic: 0xf85888,
  bug: 0xa8b820,
  rock: 0xb8a038,
  ghost: 0x705898,
  dragon: 0x7038f8,
  dark: 0x705848,
  steel: 0xb8b8d0,
  fairy: 0xee99ac,
}

export const TYPE_FR: Record<string, string> = {
  normal: 'Normal',
  fire: 'Feu',
  water: 'Eau',
  electric: 'Électrik',
  grass: 'Plante',
  ice: 'Glace',
  fighting: 'Combat',
  poison: 'Poison',
  ground: 'Sol',
  flying: 'Vol',
  psychic: 'Psy',
  bug: 'Insecte',
  rock: 'Roche',
  ghost: 'Spectre',
  dragon: 'Dragon',
  dark: 'Ténèbres',
  steel: 'Acier',
  fairy: 'Fée',
}

export const ALL_TYPES = Object.keys(TYPE_COLORS)

export const STARTERS = [1, 4, 7]
/** Première invocation : Bulbizarre, Salamèche, Carapuce */
export const STARTER_TRIO = [1, 4, 7] as const

export const GEN_MAX_ID: Record<number, number> = {
  1: 151,
  2: 251,
  3: 386,
  4: 493,
  5: 649,
  6: 721,
  7: 809,
  8: 905,
  9: 1025,
}

export const REGION_BANNERS: RegionBanner[] = [
  {
    id: 'kanto',
    gen: 1,
    nameFr: 'Kanto',
    gamesFr: 'Rouge · Bleu · Jaune',
    color: 0xe03028,
    minId: 1,
    maxId: 151,
    featured: [6, 9, 3, 25, 143, 144, 145, 146, 150, 151],
  },
  {
    id: 'johto',
    gen: 2,
    nameFr: 'Johto',
    gamesFr: 'Or · Argent · Cristal',
    color: 0xf0a030,
    minId: 152,
    maxId: 251,
    featured: [154, 157, 160, 243, 244, 245, 249, 250, 251],
  },
  {
    id: 'hoenn',
    gen: 3,
    nameFr: 'Hoenn',
    gamesFr: 'Rubis · Saphir · Émeraude',
    color: 0x3090e0,
    minId: 252,
    maxId: 386,
    featured: [254, 257, 260, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386],
  },
  {
    id: 'sinnoh',
    gen: 4,
    nameFr: 'Sinnoh',
    gamesFr: 'Diamant · Perle · Platine',
    color: 0x70a0c8,
    minId: 387,
    maxId: 493,
    featured: [389, 392, 395, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493],
  },
  {
    id: 'unova',
    gen: 5,
    nameFr: 'Unys',
    gamesFr: 'Noir · Blanc',
    color: 0x2a2a3a,
    minId: 494,
    maxId: 649,
    featured: [497, 500, 503, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649],
  },
  {
    id: 'kalos',
    gen: 6,
    nameFr: 'Kalos',
    gamesFr: 'X · Y',
    color: 0xe070a0,
    minId: 650,
    maxId: 721,
    featured: [652, 655, 658, 716, 717, 718, 719, 720, 721],
  },
  {
    id: 'alola',
    gen: 7,
    nameFr: 'Alola',
    gamesFr: 'Soleil · Lune',
    color: 0xf8c030,
    minId: 722,
    maxId: 809,
    featured: [724, 727, 730, 785, 786, 787, 788, 789, 790, 791, 792, 800, 801, 802, 807, 808, 809],
  },
  {
    id: 'galar',
    gen: 8,
    nameFr: 'Galar',
    gamesFr: 'Épée · Bouclier',
    color: 0x9050c0,
    minId: 810,
    maxId: 905,
    featured: [812, 815, 818, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 905],
  },
  {
    id: 'paldea',
    gen: 9,
    nameFr: 'Paldea',
    gamesFr: 'Écarlate · Violet',
    color: 0xe05040,
    minId: 906,
    maxId: 1025,
    featured: [908, 911, 914, 1007, 1008, 1009, 1010, 1017, 1024, 1025],
  },
]

export const MAX_WAVES = 8
export const MAX_TEAM = 4

/** 1 Poké Ball = 1 tirage · multi = x10 */
export const GACHA_BALL_COST = 1
export const GACHA_MULTI_BALL_COST = 10
/** Compteur affiché : 4★ légendaire garanti à 50 */
export const GACHA_PITY = 50
export const MAX_STARS = 4

/** Noms sprites PokéAPI `/sprites/items/{name}.png` */
export const ITEM_SPRITE = {
  pokeball: 'poke-ball',
  greatball: 'great-ball',
  ultraball: 'ultra-ball',
  masterball: 'master-ball',
  potion: 'potion',
  superpotion: 'super-potion',
  hyperpotion: 'hyper-potion',
  revive: 'revive',
  rareCandy: 'rare-candy',
} as const

export type InventoryKey = keyof typeof ITEM_SPRITE

export const SHOP_CATALOG: {
  id: InventoryKey
  label: string
  price: number
  desc: string
}[] = [
  { id: 'pokeball', label: 'Poké Ball', price: 150, desc: 'Ticket de bannière (x1)' },
  { id: 'potion', label: 'Potion', price: 280, desc: '+40 PV en arène' },
  { id: 'superpotion', label: 'Super Potion', price: 650, desc: '+90 PV en arène' },
  { id: 'hyperpotion', label: 'Hyper Potion', price: 1100, desc: '+160 PV en arène' },
  { id: 'revive', label: 'Rappel', price: 1400, desc: 'Relance un allié K.O.' },
  { id: 'rareCandy', label: 'Super Bonbon', price: 900, desc: '+1 niveau (évolution possible)' },
]

export const MISSION_DEFS: {
  id: MissionId
  title: string
  target: number
  rewardCoins: number
  rewardBalls: number
  rewardRareCandy: number
}[] = [
  { id: 'wave3', title: 'Atteindre la vague 3', target: 3, rewardCoins: 1600, rewardBalls: 4, rewardRareCandy: 2 },
  { id: 'win1', title: 'Gagner 1 arène', target: 1, rewardCoins: 2000, rewardBalls: 6, rewardRareCandy: 3 },
  { id: 'gacha1', title: 'Tirer 1 bannière', target: 1, rewardCoins: 800, rewardBalls: 3, rewardRareCandy: 1 },
  { id: 'train1', title: 'Donner 1 Super Bonbon', target: 1, rewardCoins: 700, rewardBalls: 2, rewardRareCandy: 1 },
]

export function emptyInventory(): Inventory {
  return {
    pokeball: 25,
    greatball: 0,
    ultraball: 0,
    masterball: 0,
    potion: 5,
    superpotion: 2,
    hyperpotion: 0,
    revive: 1,
    rareCandy: 5,
  }
}

export function emptyPity(): Partial<Record<RegionId, number>> {
  return {}
}

export function defaultMissions(): MissionState[] {
  return MISSION_DEFS.map((m) => ({
    id: m.id,
    progress: 0,
    target: m.target,
    claimed: false,
  }))
}

export function defaultOwned(id: number, level = 5, stars = 1): OwnedMon {
  return { id, level, xp: 0, shiny: false, stars: Math.min(MAX_STARS, Math.max(1, stars)), trainBonus: 0 }
}

/** Stade 1→1★ · 2→2★ · 3→3★ · légendaire/mythique→4★ */
export function starsFromSpecies(opts: {
  evoStage: number
  isLegendary: boolean
  isMythical: boolean
}): number {
  if (opts.isLegendary || opts.isMythical) return 4
  return Math.min(3, Math.max(1, opts.evoStage))
}

export function effectiveLevel(owned: OwnedMon): number {
  // trainBonus conservé pour saves legacy ; le Super Bonbon monte `level` directement
  return Math.min(100, owned.level + owned.trainBonus)
}

export function formatPokedollars(n: number): string {
  return `${n.toLocaleString('fr-FR')} ₽`
}

export function bannerForId(id: RegionId): RegionBanner | undefined {
  return REGION_BANNERS.find((b) => b.id === id)
}

export function unlockedBanners(unlockedGen: number): RegionBanner[] {
  return REGION_BANNERS.filter((b) => b.gen <= unlockedGen)
}
