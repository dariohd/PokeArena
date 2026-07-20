export type MonSummary = {
  id: number
  name: string
  spriteKey: string
  spriteUrl: string
  types: string[]
  hp: number
  atk: number
  def: number
  spd: number
  color: number
}

export type SaveData = {
  version: 1
  starterId: number
  roster: number[]
  coins: number
  bestWave: number
  runs: number
}

export type ArenaResult = {
  won: boolean
  wave: number
  coins: number
  recruited: MonSummary[]
  damageDealt: number
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

export const STARTERS = [1, 4, 7, 25, 133, 152, 155, 158, 252, 255, 258]
