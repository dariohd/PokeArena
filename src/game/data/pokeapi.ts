import {
  ALL_TYPES,
  GEN_MAX_ID,
  TYPE_COLORS,
  emptyInventory,
  type Inventory,
  type MonSummary,
  type MoveKind,
  type MoveSummary,
  type OwnedMon,
  type SaveData,
} from './types'

const CACHE_KEY = 'pokearena-api-v3'
const TYPE_KEY = 'pokearena-types-v1'
const MOVE_KEY = 'pokearena-moves-v1'
const SAVE_KEY = 'pokearena-save-v2'
const SAVE_LEGACY = 'pokearena-save-v1'

type CacheBag = Record<string, MonSummary>
export type TypeChart = Record<string, Record<string, number>>
type MoveCache = Record<string, MoveSummary>

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readCache(): CacheBag {
  return safeParse(localStorage.getItem(CACHE_KEY), {})
}

function writeCache(cache: CacheBag) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* quota */
  }
}

function readMoveCache(): MoveCache {
  return safeParse(localStorage.getItem(MOVE_KEY), {})
}

function writeMoveCache(cache: MoveCache) {
  try {
    localStorage.setItem(MOVE_KEY, JSON.stringify(cache))
  } catch {
    /* quota */
  }
}

function readTypeChart(): TypeChart | null {
  return safeParse(localStorage.getItem(TYPE_KEY), null)
}

function writeTypeChart(chart: TypeChart) {
  try {
    localStorage.setItem(TYPE_KEY, JSON.stringify(chart))
  } catch {
    /* quota */
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      if (data.version === 2) return sanitizeSave(data)
    }
  } catch {
    /* fall through */
  }

  // Migrate v1
  try {
    const legacy = localStorage.getItem(SAVE_LEGACY)
    if (legacy) {
      const old = JSON.parse(legacy) as {
        starterId?: number
        roster?: number[]
        coins?: number
        bestWave?: number
        runs?: number
      }
      const starterId = old.starterId ?? 0
      const roster = old.roster ?? []
      const team: OwnedMon[] = starterId
        ? [{ id: starterId, level: 8, xp: 0, shiny: false }]
        : []
      const migrated: SaveData = sanitizeSave({
        version: 2,
        starterId,
        roster: [...new Set([starterId, ...roster].filter(Boolean))],
        team,
        box: roster
          .filter((id) => id !== starterId)
          .map((id) => ({ id, level: 5, xp: 0, shiny: false })),
        seen: [...new Set([starterId, ...roster].filter(Boolean))],
        coins: old.coins ?? 0,
        bestWave: old.bestWave ?? 0,
        runs: old.runs ?? 0,
        inventory: emptyInventory(),
        unlockedGen: Math.min(3, Math.max(1, Math.ceil((old.bestWave ?? 1) / 5))),
        mute: false,
      })
      writeSave(migrated)
      return migrated
    }
  } catch {
    /* empty */
  }

  return sanitizeSave({
    version: 2,
    starterId: 0,
    roster: [],
    team: [],
    box: [],
    seen: [],
    coins: 0,
    bestWave: 0,
    runs: 0,
    inventory: emptyInventory(),
    unlockedGen: 1,
    mute: false,
  })
}

function sanitizeSave(s: SaveData): SaveData {
  return {
    ...s,
    version: 2,
    roster: [...new Set(s.roster ?? [])],
    seen: [...new Set(s.seen ?? [])],
    team: (s.team ?? []).slice(0, 4),
    box: s.box ?? [],
    inventory: { ...emptyInventory(), ...(s.inventory ?? {}) },
    unlockedGen: Math.min(9, Math.max(1, s.unlockedGen || 1)),
    mute: Boolean(s.mute),
  }
}

export function writeSave(save: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(sanitizeSave(save)))
  } catch {
    /* quota */
  }
}

export function resetProgress() {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(SAVE_LEGACY)
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

function shinyUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
}

function genFromId(id: number): number {
  for (let g = 1; g <= 9; g++) {
    if (id <= GEN_MAX_ID[g]) return g
  }
  return 9
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PokéAPI ${url}: ${res.status}`)
  return res.json() as Promise<T>
}

export async function ensureTypeChart(): Promise<TypeChart> {
  const cached = readTypeChart()
  if (cached && Object.keys(cached).length >= 18) return cached

  const chart: TypeChart = {}
  await Promise.all(
    ALL_TYPES.map(async (type) => {
      try {
        const data = await fetchJson<{
          damage_relations: {
            double_damage_to: { name: string }[]
            half_damage_to: { name: string }[]
            no_damage_to: { name: string }[]
          }
        }>(`https://pokeapi.co/api/v2/type/${type}`)
        const row: Record<string, number> = {}
        for (const t of ALL_TYPES) row[t] = 1
        for (const t of data.damage_relations.double_damage_to) row[t.name] = 2
        for (const t of data.damage_relations.half_damage_to) row[t.name] = 0.5
        for (const t of data.damage_relations.no_damage_to) row[t.name] = 0
        chart[type] = row
      } catch {
        chart[type] = Object.fromEntries(ALL_TYPES.map((t) => [t, 1]))
      }
    }),
  )
  writeTypeChart(chart)
  return chart
}

export function typeEffectiveness(chart: TypeChart, moveType: string, defenderTypes: string[]): number {
  let mult = 1
  const row = chart[moveType]
  if (!row) return 1
  for (const t of defenderTypes) {
    mult *= row[t] ?? 1
  }
  return mult
}

export async function fetchMove(idOrName: string | number): Promise<MoveSummary> {
  const key = String(idOrName)
  const cache = readMoveCache()
  if (cache[key]) return cache[key]

  const data = await fetchJson<{
    id: number
    name: string
    power: number | null
    accuracy: number | null
    pp: number
    priority: number
    type: { name: string }
    damage_class: { name: string }
    effect_chance: number | null
    names: { name: string; language: { name: string } }[]
  }>(`https://pokeapi.co/api/v2/move/${idOrName}`)

  const nameFr =
    data.names.find((n) => n.language.name === 'fr')?.name ??
    capitalize(data.name.replace(/-/g, ' '))

  const mon: MoveSummary = {
    id: data.id,
    name: data.name,
    nameFr,
    type: data.type.name,
    power: data.power,
    accuracy: data.accuracy,
    pp: data.pp ?? 10,
    priority: data.priority ?? 0,
    damageClass: (data.damage_class.name as MoveKind) || 'physical',
    effectChance: data.effect_chance,
  }

  cache[key] = mon
  cache[String(data.id)] = mon
  cache[data.name] = mon
  writeMoveCache(cache)
  return mon
}

type PokemonApi = {
  id: number
  name: string
  types: { type: { name: string } }[]
  stats: { base_stat: number; stat: { name: string } }[]
  abilities: { ability: { name: string }; is_hidden: boolean }[]
  cries?: { latest?: string; legacy?: string }
  moves: {
    move: { name: string; url: string }
    version_group_details: {
      level_learned_at: number
      move_learn_method: { name: string }
    }[]
  }[]
  sprites?: {
    other?: {
      'official-artwork'?: { front_default?: string; front_shiny?: string }
    }
  }
}

type SpeciesApi = {
  names: { name: string; language: { name: string } }[]
  genera: { genus: string; language: { name: string } }[]
  flavor_text_entries: { flavor_text: string; language: { name: string } }[]
  capture_rate: number
  is_legendary: boolean
  is_mythical: boolean
  evolution_chain: { url: string }
}

type AbilityApi = {
  names: { name: string; language: { name: string } }[]
}

type EvoChainApi = {
  id: number
  chain: EvoNode
}

type EvoNode = {
  species: { name: string; url: string }
  evolves_to: EvoNode[]
}

function pickLevelUpMoves(data: PokemonApi, levelCap = 55): string[] {
  const scored = new Map<string, number>()
  for (const entry of data.moves) {
    let best = -1
    for (const vg of entry.version_group_details) {
      if (vg.move_learn_method.name !== 'level-up') continue
      if (vg.level_learned_at <= levelCap && vg.level_learned_at > best) {
        best = vg.level_learned_at
      }
    }
    if (best >= 0) scored.set(entry.move.name, best)
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name)
}

function collectEvolvesTo(node: EvoNode, targetId: number, out: number[] = []): number[] {
  const id = Number(node.species.url.split('/').filter(Boolean).pop())
  if (id === targetId) {
    for (const child of node.evolves_to) {
      const cid = Number(child.species.url.split('/').filter(Boolean).pop())
      if (cid) out.push(cid)
    }
    return out
  }
  for (const child of node.evolves_to) collectEvolvesTo(child, targetId, out)
  return out
}

async function resolveMoves(names: string[]): Promise<MoveSummary[]> {
  const unique = [...new Set(names)].slice(0, 4)
  const moves: MoveSummary[] = []
  for (const name of unique) {
    try {
      const m = await fetchMove(name)
      if (m.damageClass !== 'status' && (m.power ?? 0) > 0) moves.push(m)
      else if (moves.length < 2) moves.push(m)
    } catch {
      /* skip */
    }
  }
  if (moves.length === 0) {
    moves.push({
      id: 33,
      name: 'tackle',
      nameFr: 'Charge',
      type: 'normal',
      power: 40,
      accuracy: 100,
      pp: 35,
      priority: 0,
      damageClass: 'physical',
      effectChance: null,
    })
  }
  return moves.slice(0, 4)
}

export async function fetchMon(id: number, opts?: { levelHint?: number }): Promise<MonSummary> {
  const cache = readCache()
  const key = String(id)
  if (cache[key]?.moves?.length) return cache[key]

  const [poke, species] = await Promise.all([
    fetchJson<PokemonApi>(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetchJson<SpeciesApi>(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ])

  const stats = Object.fromEntries(poke.stats.map((s) => [s.stat.name, s.base_stat]))
  const types = poke.types.map((t) => t.type.name)
  const primary = types[0] ?? 'normal'

  const nameFr = species.names.find((n) => n.language.name === 'fr')?.name ?? capitalize(poke.name)
  const genusFr = species.genera.find((g) => g.language.name === 'fr')?.genus ?? ''
  const flavorFr = (
    species.flavor_text_entries.find((f) => f.language.name === 'fr')?.flavor_text ??
    species.flavor_text_entries.find((f) => f.language.name === 'en')?.flavor_text ??
    ''
  )
    .replace(/\f|\n|\r/g, ' ')
    .trim()

  const abilityEn = poke.abilities.find((a) => !a.is_hidden)?.ability.name ?? poke.abilities[0]?.ability.name ?? ''
  let abilityNameFr = capitalize(abilityEn.replace(/-/g, ' '))
  if (abilityEn) {
    try {
      const ab = await fetchJson<AbilityApi>(`https://pokeapi.co/api/v2/ability/${abilityEn}`)
      abilityNameFr = ab.names.find((n) => n.language.name === 'fr')?.name ?? abilityNameFr
    } catch {
      /* keep */
    }
  }

  const evoId = Number(species.evolution_chain.url.split('/').filter(Boolean).pop()) || null
  let evolvesTo: number[] = []
  if (evoId) {
    try {
      const chain = await fetchJson<EvoChainApi>(`https://pokeapi.co/api/v2/evolution-chain/${evoId}`)
      evolvesTo = collectEvolvesTo(chain.chain, poke.id)
    } catch {
      evolvesTo = []
    }
  }

  const moveNames = pickLevelUpMoves(poke, opts?.levelHint ?? 50)
  const moves = await resolveMoves(moveNames)

  const art =
    poke.sprites?.other?.['official-artwork']?.front_default ?? spriteUrl(poke.id)
  const artShiny =
    poke.sprites?.other?.['official-artwork']?.front_shiny ?? shinyUrl(poke.id)

  const mon: MonSummary = {
    id: poke.id,
    name: capitalize(poke.name),
    nameFr,
    genusFr,
    flavorFr,
    spriteKey: `mon-${poke.id}`,
    spriteUrl: art,
    spriteUrlShiny: artShiny,
    cryUrl: poke.cries?.latest ?? poke.cries?.legacy ?? null,
    types,
    hp: stats['hp'] ?? 50,
    atk: stats['attack'] ?? 50,
    def: stats['defense'] ?? 50,
    spa: stats['special-attack'] ?? 50,
    spd: stats['special-defense'] ?? 50,
    spe: stats['speed'] ?? 50,
    color: TYPE_COLORS[primary] ?? 0x3cf0ff,
    captureRate: species.capture_rate ?? 45,
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    generation: genFromId(poke.id),
    evolutionChainId: evoId,
    evolvesTo,
    moves,
    abilityName: abilityEn,
    abilityNameFr,
  }

  cache[key] = mon
  writeCache(cache)
  return mon
}

export async function fetchMany(ids: number[]): Promise<MonSummary[]> {
  const unique = [...new Set(ids)]
  const results: MonSummary[] = []
  // Limit concurrency to avoid PokéAPI rate limits
  const chunk = 6
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    const part = await Promise.all(slice.map((id) => fetchMon(id).catch(() => null)))
    for (const m of part) if (m) results.push(m)
  }
  const map = new Map(results.map((m) => [m.id, m]))
  return ids.map((id) => map.get(id)!).filter(Boolean)
}

export function randomWildId(unlockedGen: number, wave: number): number {
  const gen = Math.min(unlockedGen, wave <= 3 ? 1 : wave <= 7 ? Math.min(2, unlockedGen) : unlockedGen)
  const max = GEN_MAX_ID[gen] ?? 151
  // Bias away from legendaries early: retry if id is known mythic range loosely
  let id = 1 + Math.floor(Math.random() * max)
  if (wave < 10 && (id === 144 || id === 145 || id === 146 || id === 150 || id === 151)) {
    id = 1 + Math.floor(Math.random() * Math.min(143, max))
  }
  return id
}

export function ballBonus(ball: keyof Inventory): number {
  if (ball === 'ultraball') return 2
  if (ball === 'greatball') return 1.5
  return 1
}

/** Simplified Gen III+ capture check */
export function captureCheck(rate: number, hpRatio: number, ball: keyof Inventory): boolean {
  const a = ((1 - hpRatio * 0.6) * rate * ballBonus(ball)) / 3
  const chance = Math.min(0.95, Math.max(0.05, a / 255))
  return Math.random() < chance
}

export function xpToNext(level: number): number {
  return Math.round(20 + level * 12 + level * level * 1.4)
}

export function addXp(
  owned: OwnedMon,
  amount: number,
  mon: MonSummary,
): { owned: OwnedMon; evolved: boolean; newId?: number } {
  const startLevel = owned.level
  let level = owned.level
  let xp = owned.xp + amount
  let id = owned.id
  let evolved = false
  let nextNeeded = xpToNext(level)
  while (xp >= nextNeeded && level < 100) {
    xp -= nextNeeded
    level += 1
    nextNeeded = xpToNext(level)
  }
  if (mon.evolvesTo.length) {
    if ((level >= 16 && startLevel < 16) || (level >= 36 && startLevel < 36)) {
      id = mon.evolvesTo[0]
      evolved = true
    }
  }
  return { owned: { ...owned, id, level, xp }, evolved, newId: evolved ? id : undefined }
}

export function markSeen(save: SaveData, id: number): SaveData {
  if (save.seen.includes(id)) return save
  return { ...save, seen: [...save.seen, id] }
}

export function addToRoster(save: SaveData, id: number, level = 5, shiny = false): SaveData {
  const owned: OwnedMon = { id, level, xp: 0, shiny }
  const roster = [...new Set([...save.roster, id])]
  const seen = [...new Set([...save.seen, id])]
  if (save.team.length < 4) {
    return { ...save, roster, seen, team: [...save.team, owned] }
  }
  return { ...save, roster, seen, box: [...save.box, owned] }
}

export function spendCoins(save: SaveData, amount: number): SaveData | null {
  if (save.coins < amount) return null
  return { ...save, coins: save.coins - amount }
}

export function buyItem(save: SaveData, item: keyof Inventory, price: number): SaveData | null {
  if (save.coins < price) return null
  return {
    ...save,
    coins: save.coins - price,
    inventory: { ...save.inventory, [item]: save.inventory[item] + 1 },
  }
}
