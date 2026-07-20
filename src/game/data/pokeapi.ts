import { TYPE_COLORS, type MonSummary, type SaveData } from './types'

const CACHE_KEY = 'pokearena-api-v1'
const SAVE_KEY = 'pokearena-save-v1'

type CacheBag = Record<string, MonSummary>

function readCache(): CacheBag {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as CacheBag
  } catch {
    return {}
  }
}

function writeCache(cache: CacheBag) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) throw new Error('empty')
    return JSON.parse(raw) as SaveData
  } catch {
    return {
      version: 1,
      starterId: 0,
      roster: [],
      coins: 0,
      bestWave: 0,
      runs: 0,
    }
  }
}

export function writeSave(save: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

export async function fetchMon(id: number): Promise<MonSummary> {
  const cache = readCache()
  const key = String(id)
  if (cache[key]) return cache[key]

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  if (!res.ok) throw new Error(`PokéAPI ${id}: ${res.status}`)
  const data = (await res.json()) as {
    id: number
    name: string
    types: { type: { name: string } }[]
    stats: { base_stat: number; stat: { name: string } }[]
  }

  const stats = Object.fromEntries(data.stats.map((s) => [s.stat.name, s.base_stat]))
  const types = data.types.map((t) => t.type.name)
  const primary = types[0] ?? 'normal'

  const mon: MonSummary = {
    id: data.id,
    name: capitalize(data.name),
    spriteKey: `mon-${data.id}`,
    spriteUrl: spriteUrl(data.id),
    types,
    hp: stats['hp'] ?? 50,
    atk: stats['attack'] ?? 50,
    def: stats['defense'] ?? 50,
    spd: stats['speed'] ?? 50,
    color: TYPE_COLORS[primary] ?? 0x3cf0ff,
  }

  cache[key] = mon
  writeCache(cache)
  return mon
}

export async function fetchMany(ids: number[]): Promise<MonSummary[]> {
  const unique = [...new Set(ids)]
  const results = await Promise.all(unique.map((id) => fetchMon(id)))
  const map = new Map(results.map((m) => [m.id, m]))
  return ids.map((id) => map.get(id)!).filter(Boolean)
}

export function randomWildId(maxId = 151): number {
  return 1 + Math.floor(Math.random() * maxId)
}
