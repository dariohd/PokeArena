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
  /** Compact battle sprite (~96px) — use in arena for performance */
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
  generation: number
  evolutionChainId: number | null
  evolvesTo: number[]
  /** Up to 4 battle moves */
  moves: MoveSummary[]
  abilityName: string
  abilityNameFr: string
}

export type OwnedMon = {
  id: number
  level: number
  xp: number
  shiny: boolean
}

export type Inventory = {
  pokeball: number
  greatball: number
  ultraball: number
  potion: number
  superpotion: number
  revive: number
}

export type SaveData = {
  version: 2
  starterId: number
  /** Species IDs ever owned (Pokédex caught) */
  roster: number[]
  /** Active party for arena (max 4, first is lead) */
  team: OwnedMon[]
  /** Box / storage beyond team */
  box: OwnedMon[]
  /** Seen for Pokédex */
  seen: number[]
  coins: number
  bestWave: number
  runs: number
  inventory: Inventory
  unlockedGen: number
  mute: boolean
}

export type ArenaResult = {
  won: boolean
  wave: number
  coins: number
  captured: MonSummary[]
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

/** Classic starters gens 1–3 only (fast select, clear grid) */
export const STARTERS = [1, 4, 7, 25, 133, 152, 155, 158, 252, 255, 258]

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

export const MAX_WAVES = 15
export const MAX_TEAM = 4

export const SHOP_CATALOG = [
  { id: 'pokeball' as const, label: 'Poké Ball', price: 50, desc: 'Capture standard' },
  { id: 'greatball' as const, label: 'Super Ball', price: 150, desc: 'Meilleure capture' },
  { id: 'ultraball' as const, label: 'Hyper Ball', price: 400, desc: 'Capture élevée' },
  { id: 'potion' as const, label: 'Potion', price: 80, desc: '+40 PV en run' },
  { id: 'superpotion' as const, label: 'Super Potion', price: 200, desc: '+90 PV en run' },
  { id: 'revive' as const, label: 'Rappel', price: 350, desc: 'Relance un allié K.O.' },
]

export function emptyInventory(): Inventory {
  return {
    pokeball: 8,
    greatball: 2,
    ultraball: 0,
    potion: 2,
    superpotion: 0,
    revive: 0,
  }
}

export function defaultOwned(id: number, level = 5): OwnedMon {
  return { id, level, xp: 0, shiny: false }
}
