import {
  ALL_TYPES,
  GACHA_BALL_COST,
  GACHA_MULTI_BALL_COST,
  GACHA_PITY,
  GEN_MAX_ID,
  MAX_WAVES,
  MISSION_DEFS,
  REGION_BANNERS,
  STARTER_TRIO,
  TYPE_COLORS,
  bannerForId,
  defaultMissions,
  defaultOwned,
  emptyInventory,
  emptyPity,
  starsFromSpecies,
  type Inventory,
  type MissionId,
  type MonSummary,
  type MoveKind,
  type MoveSummary,
  type OwnedMon,
  type RegionBanner,
  type RegionId,
  type SaveData,
} from './types'

const CACHE_KEY = 'pokearena-api-v5'
const TYPE_KEY = 'pokearena-types-v2'
const MOVE_KEY = 'pokearena-moves-v1'
const SAVE_KEY = 'pokearena-save-v4'
const SAVE_LEGACY_V3 = 'pokearena-save-v3'
const SAVE_LEGACY_V2 = 'pokearena-save-v2'
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

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeOwned(m: Partial<OwnedMon> & { id: number }): OwnedMon {
  const bonus = m.trainBonus ?? 0
  const level = Math.min(100, (m.level ?? 5) + bonus)
  return {
    id: m.id,
    level,
    xp: m.xp ?? 0,
    shiny: Boolean(m.shiny),
    stars: Math.min(4, Math.max(1, m.stars ?? 1)),
    // Folded into level — Super Bonbon increments level, not trainBonus
    trainBonus: 0,
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as SaveData
      if (data.version === 4) return sanitizeSave(data)
    }
  } catch {
    /* fall through */
  }

  // Migrate v3
  try {
    const v3raw = localStorage.getItem(SAVE_LEGACY_V3)
    if (v3raw) {
      const old = JSON.parse(v3raw) as Record<string, unknown>
      return migrateLegacy(old)
    }
  } catch {
    /* fall through */
  }

  // Migrate v2
  try {
    const v2raw = localStorage.getItem(SAVE_LEGACY_V2)
    if (v2raw) {
      const old = JSON.parse(v2raw) as Record<string, unknown>
      return migrateLegacy(old)
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
      return migrateLegacy({
        starterId,
        roster: [...new Set([starterId, ...roster].filter(Boolean))],
        team: starterId ? [defaultOwned(starterId, 12)] : [],
        box: roster.filter((id) => id !== starterId).map((id) => defaultOwned(id, 5)),
        seen: [...new Set([starterId, ...roster].filter(Boolean))],
        coins: old.coins ?? 0,
        bestWave: old.bestWave ?? 0,
        runs: old.runs ?? 0,
        inventory: emptyInventory(),
        unlockedGen: Math.min(3, Math.max(1, Math.ceil((old.bestWave ?? 1) / 5))),
        mute: false,
        autoMode: false,
      })
    }
  } catch {
    /* empty */
  }

  return sanitizeSave({
    version: 4,
    starterId: 0,
    roster: [],
    team: [],
    box: [],
    seen: [],
    coins: 3000,
    bestWave: 0,
    runs: 0,
    inventory: emptyInventory(),
    unlockedGen: 1,
    mute: false,
    autoMode: false,
    gachaPityByBanner: emptyPity(),
    missions: defaultMissions(),
    lastMissionDay: todayKey(),
  })
}

function migrateLegacy(old: Record<string, unknown>): SaveData {
  const inv = { ...(old.inventory as Partial<Inventory> & { candy?: number }) }
  const oldCandy = typeof inv.candy === 'number' ? inv.candy : 0
  delete (inv as { candy?: number }).candy
  const rareCandy = (inv.rareCandy ?? 0) + Math.ceil(oldCandy / 2)
  const pityOld = typeof old.gachaPity === 'number' ? old.gachaPity : 0
  const migrated = sanitizeSave({
    version: 4,
    starterId: (old.starterId as number) ?? 0,
    roster: (old.roster as number[]) ?? [],
    team: ((old.team as OwnedMon[]) ?? []).map((t) => normalizeOwned(t)),
    box: ((old.box as OwnedMon[]) ?? []).map((t) => normalizeOwned(t)),
    seen: (old.seen as number[]) ?? [],
    coins: Math.max(3000, ((old.coins as number) ?? 0) * 8),
    bestWave: (old.bestWave as number) ?? 0,
    runs: (old.runs as number) ?? 0,
    inventory: {
      ...emptyInventory(),
      ...inv,
      rareCandy,
      masterball: inv.masterball ?? 0,
      hyperpotion: inv.hyperpotion ?? 0,
    },
    unlockedGen: (old.unlockedGen as number) ?? 1,
    mute: Boolean(old.mute),
    autoMode: Boolean(old.autoMode),
    gachaPityByBanner: { kanto: pityOld },
    missions: defaultMissions(),
    lastMissionDay: todayKey(),
  })
  writeSave(migrated)
  return migrated
}

function sanitizeSave(s: SaveData): SaveData {
  const day = todayKey()
  let missions = s.missions?.length ? s.missions : defaultMissions()
  if (s.lastMissionDay !== day) {
    missions = defaultMissions()
  }
  for (const def of MISSION_DEFS) {
    const existing = missions.find((m) => m.id === def.id)
    if (!existing) {
      missions.push({ id: def.id, progress: 0, target: def.target, claimed: false })
    } else {
      existing.target = def.target
    }
  }

  // Migrate legacy mission ids
  missions = missions
    .map((m) => {
      const legacy = m as { id: string; progress: number; target: number; claimed: boolean }
      if (legacy.id === 'wave5') return { ...m, id: 'wave3' as MissionId, target: 3 }
      if (legacy.id === 'capture3' || legacy.id === 'capture2') return { ...m, id: 'win1' as MissionId, target: 1, progress: 0 }
      return m
    })
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)

  const invRaw = { ...(s.inventory as Inventory & { candy?: number }) }
  if (typeof invRaw.candy === 'number') {
    invRaw.rareCandy = (invRaw.rareCandy ?? 0) + Math.ceil(invRaw.candy / 2)
    delete invRaw.candy
  }

  return {
    ...s,
    version: 4,
    roster: [...new Set(s.roster ?? [])],
    seen: [...new Set(s.seen ?? [])],
    team: (s.team ?? []).slice(0, 4).map((t) => normalizeOwned(t)),
    box: (s.box ?? []).map((t) => normalizeOwned(t)),
    inventory: { ...emptyInventory(), ...invRaw },
    unlockedGen: Math.min(9, Math.max(1, s.unlockedGen || 1)),
    mute: Boolean(s.mute),
    autoMode: Boolean(s.autoMode),
    gachaPityByBanner: s.gachaPityByBanner ?? emptyPity(),
    missions,
    lastMissionDay: day,
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
  localStorage.removeItem(SAVE_LEGACY_V3)
  localStorage.removeItem(SAVE_LEGACY_V2)
  localStorage.removeItem(SAVE_LEGACY)
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function battleSpriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

function battleShinyUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
}

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

function shinyUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
}

function homeUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`
}

function homeShiny(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
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

/** Instant local chart (Gen 6+) — no network on boot */
function builtinTypeChart(): TypeChart {
  const N = 1
  const chart: TypeChart = {}
  const set = (atk: string, map: Record<string, number>) => {
    const row: Record<string, number> = {}
    for (const t of ALL_TYPES) row[t] = N
    Object.assign(row, map)
    chart[atk] = row
  }
  set('normal', { rock: 0.5, ghost: 0, steel: 0.5 })
  set('fire', { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 })
  set('water', { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 })
  set('electric', { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 })
  set('grass', {
    fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5,
  })
  set('ice', { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 })
  set('fighting', {
    normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5,
  })
  set('poison', { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 })
  set('ground', { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 })
  set('flying', { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 })
  set('psychic', { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 })
  set('bug', {
    fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5,
  })
  set('rock', { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 })
  set('ghost', { normal: 0, psychic: 2, ghost: 2, dark: 0.5 })
  set('dragon', { dragon: 2, steel: 0.5, fairy: 0 })
  set('dark', { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 })
  set('steel', { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 })
  set('fairy', { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 })
  return chart
}

export async function ensureTypeChart(): Promise<TypeChart> {
  const cached = readTypeChart()
  if (cached && Object.keys(cached).length >= 18) return cached
  const chart = builtinTypeChart()
  writeTypeChart(chart)
  // Refresh from API in background (non-blocking)
  void (async () => {
    try {
      const live: TypeChart = {}
      await Promise.all(
        ALL_TYPES.map(async (type) => {
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
          live[type] = row
        }),
      )
      writeTypeChart(live)
    } catch {
      /* keep builtin */
    }
  })()
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
    front_default?: string | null
    front_shiny?: string | null
    other?: {
      'official-artwork'?: { front_default?: string; front_shiny?: string }
      home?: { front_default?: string; front_shiny?: string }
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

/** Stade 1 (base) · 2 (milieu) · 3 (finale) */
function findEvoStage(node: EvoNode, targetId: number, depth = 0): number | null {
  const id = Number(node.species.url.split('/').filter(Boolean).pop())
  if (id === targetId) return Math.min(3, depth + 1)
  for (const child of node.evolves_to) {
    const found = findEvoStage(child, targetId, depth + 1)
    if (found != null) return found
  }
  return null
}

async function resolveMoves(names: string[]): Promise<MoveSummary[]> {
  const unique = [...new Set(names)].slice(0, 4)
  const settled = await Promise.all(
    unique.map(async (name) => {
      try {
        return await fetchMove(name)
      } catch {
        return null
      }
    }),
  )
  const moves: MoveSummary[] = []
  for (const m of settled) {
    if (!m) continue
    if (m.damageClass !== 'status' && (m.power ?? 0) > 0) moves.push(m)
    else if (moves.length < 2) moves.push(m)
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

export async function fetchMon(
  id: number,
  opts?: { levelHint?: number; full?: boolean },
): Promise<MonSummary> {
  const cache = readCache()
  const key = String(id)
  const cached = cache[key]
  if (cached?.moves?.length && cached.battleUrl) {
    const needsEvo =
      (cached.evoStage == null || cached.evoStage < 1 || cached.evolvesTo.length === 0) &&
      Boolean(cached.evolutionChainId)
    if (!needsEvo) {
      if (cached.evoStage == null) cached.evoStage = 1
      return cached
    }
    try {
      const chain = await fetchJson<EvoChainApi>(
        `https://pokeapi.co/api/v2/evolution-chain/${cached.evolutionChainId}/`,
      )
      cached.evolvesTo = collectEvolvesTo(chain.chain, cached.id)
      cached.evoStage = findEvoStage(chain.chain, cached.id) ?? 1
      cache[key] = cached
      writeCache(cache)
    } catch {
      cached.evoStage = cached.evoStage ?? 1
    }
    return cached
  }

  const full = opts?.full ?? false

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
  if (full && abilityEn) {
    try {
      const ab = await fetchJson<AbilityApi>(`https://pokeapi.co/api/v2/ability/${abilityEn}`)
      abilityNameFr = ab.names.find((n) => n.language.name === 'fr')?.name ?? abilityNameFr
    } catch {
      /* keep */
    }
  }

  const evoId = Number(species.evolution_chain.url.split('/').filter(Boolean).pop()) || null
  let evolvesTo: number[] = []
  let evoStage = 1
  if (evoId) {
    try {
      const chain = await fetchJson<EvoChainApi>(`https://pokeapi.co/api/v2/evolution-chain/${evoId}`)
      evolvesTo = collectEvolvesTo(chain.chain, poke.id)
      evoStage = findEvoStage(chain.chain, poke.id) ?? 1
    } catch {
      evolvesTo = []
      evoStage = 1
    }
  }

  const moveNames = pickLevelUpMoves(poke, opts?.levelHint ?? 40)
  const moves = await resolveMoves(moveNames)

  const art =
    poke.sprites?.other?.['official-artwork']?.front_default ?? spriteUrl(poke.id)
  const artShiny =
    poke.sprites?.other?.['official-artwork']?.front_shiny ?? shinyUrl(poke.id)
  const home = poke.sprites?.other?.home?.front_default ?? homeUrl(poke.id)
  const homeSh = poke.sprites?.other?.home?.front_shiny ?? homeShiny(poke.id)

  const mon: MonSummary = {
    id: poke.id,
    name: capitalize(poke.name),
    nameFr,
    genusFr,
    flavorFr,
    spriteKey: `art-${poke.id}`,
    spriteUrl: art,
    homeKey: `home-${poke.id}`,
    homeUrl: home,
    homeShinyUrl: homeSh,
    // Combat = HOME (plus beau que le sprite pixel 96px)
    battleKey: `home-${poke.id}`,
    battleUrl: home,
    spriteUrlShiny: artShiny,
    battleShinyUrl: homeSh,
    cryUrl: poke.cries?.latest ?? poke.cries?.legacy ?? null,
    types,
    hp: stats['hp'] ?? 50,
    atk: stats['attack'] ?? 50,
    def: stats['defense'] ?? 50,
    spa: stats['special-attack'] ?? 50,
    spd: stats['special-defense'] ?? 50,
    spe: stats['speed'] ?? 50,
    color: TYPE_COLORS[primary] ?? 0x3090e0,
    captureRate: species.capture_rate ?? 45,
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    evoStage,
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

export async function fetchMany(ids: number[], opts?: { full?: boolean }): Promise<MonSummary[]> {
  const unique = [...new Set(ids)]
  const results: MonSummary[] = []
  const chunk = 4
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    const part = await Promise.all(slice.map((id) => fetchMon(id, opts).catch(() => null)))
    for (const m of part) if (m) results.push(m)
  }
  const map = new Map(results.map((m) => [m.id, m]))
  return ids.map((id) => map.get(id)!).filter(Boolean)
}

export function randomWildId(unlockedGen: number, wave: number): number {
  // Early waves stick to earlier regions the player unlocked
  const genCap = wave <= 2 ? 1 : wave <= 4 ? Math.min(2, unlockedGen) : unlockedGen
  const gen = Math.max(1, Math.min(unlockedGen, genCap))
  const banner = REGION_BANNERS.find((b) => b.gen === gen) ?? REGION_BANNERS[0]
  const span = banner.maxId - banner.minId + 1
  let id = banner.minId + Math.floor(Math.random() * span)
  // Soft-avoid featured (legendaries / finals) on non-final waves
  if (wave < MAX_WAVES && banner.featured.includes(id) && Math.random() < 0.85) {
    id = banner.minId + Math.floor(Math.random() * Math.min(100, span))
  }
  return id
}

export function randomBossId(unlockedGen: number): number {
  const banner = REGION_BANNERS.find((b) => b.gen === unlockedGen) ?? REGION_BANNERS[0]
  if (banner.featured.length) {
    return banner.featured[Math.floor(Math.random() * banner.featured.length)]
  }
  const span = Math.min(40, banner.maxId - banner.minId + 1)
  return banner.maxId - Math.floor(Math.random() * span)
}

export function ballBonus(ball: keyof Inventory): number {
  if (ball === 'masterball') return 255
  if (ball === 'ultraball') return 2
  if (ball === 'greatball') return 1.5
  return 1
}

/** Simplified Gen III+ capture check */
export function captureCheck(rate: number, hpRatio: number, ball: keyof Inventory): boolean {
  if (ball === 'masterball') return true
  const a = ((1 - hpRatio * 0.45) * rate * ballBonus(ball) * 1.65) / 3
  const chance = Math.min(0.92, Math.max(0.18, a / 255))
  return Math.random() < chance
}

export function xpToNext(level: number): number {
  return Math.round(6 + level * 3.2 + level * level * 0.28)
}

export function addXp(
  owned: OwnedMon,
  amount: number,
  mon: MonSummary,
): { owned: OwnedMon; evolved: boolean; newId?: number } {
  const startLevel = owned.level
  let level = owned.level
  let xp = owned.xp + amount
  let nextNeeded = xpToNext(level)
  while (xp >= nextNeeded && level < 100) {
    xp -= nextNeeded
    level += 1
    nextNeeded = xpToNext(level)
  }
  return maybeEvolve({ ...owned, level, xp, trainBonus: 0 }, mon, startLevel)
}

/** Super Bonbon : +1 niveau réel (canon). Évolution si seuil franchi. */
export function applyTrain(
  save: SaveData,
  where: 'team' | 'box',
  index: number,
  monData?: MonSummary,
): SaveData | null {
  const list = where === 'team' ? [...save.team] : [...save.box]
  const mon = list[index]
  if (!mon) return null
  if (save.inventory.rareCandy < 1) return null
  if (mon.level >= 100) return null

  const startLevel = mon.level
  let nextOwned: OwnedMon = { ...mon, level: mon.level + 1, trainBonus: 0 }
  let evolvedId: number | undefined
  if (monData) {
    const res = maybeEvolve(nextOwned, monData, startLevel)
    nextOwned = res.owned
    evolvedId = res.newId
  }
  list[index] = nextOwned

  let next: SaveData = {
    ...save,
    team: where === 'team' ? list : save.team,
    box: where === 'box' ? list : save.box,
    inventory: { ...save.inventory, rareCandy: save.inventory.rareCandy - 1 },
  }
  if (evolvedId) {
    next = {
      ...next,
      roster: [...new Set([...next.roster, evolvedId])],
      seen: [...new Set([...next.seen, evolvedId])],
    }
  }
  return bumpMission(next, 'train1')
}

function maybeEvolve(
  owned: OwnedMon,
  mon: MonSummary,
  startLevel: number,
): { owned: OwnedMon; evolved: boolean; newId?: number } {
  let id = owned.id
  let evolved = false
  let stars = owned.stars
  if (mon.evolvesTo.length) {
    if ((owned.level >= 16 && startLevel < 16) || (owned.level >= 36 && startLevel < 36)) {
      id = mon.evolvesTo[0]
      evolved = true
      // Stade suivant → +1★ (cap 3, légendaires restent 4)
      if (stars < 4) stars = Math.min(3, stars + 1)
    }
  }
  return { owned: { ...owned, id, stars }, evolved, newId: evolved ? id : undefined }
}

export function markSeen(save: SaveData, id: number): SaveData {
  if (save.seen.includes(id)) return save
  return { ...save, seen: [...save.seen, id] }
}

export function addToRoster(
  save: SaveData,
  id: number,
  level = 5,
  shiny = false,
  stars = 1,
): SaveData {
  const owned = defaultOwned(id, level, stars)
  owned.shiny = shiny
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

export function bumpMission(save: SaveData, id: MissionId, by = 1): SaveData {
  const missions = save.missions.map((m) => {
    if (m.id !== id || m.claimed) return m
    return { ...m, progress: Math.min(m.target, m.progress + by) }
  })
  return { ...save, missions }
}

export function claimMission(save: SaveData, id: MissionId): SaveData | null {
  const def = MISSION_DEFS.find((m) => m.id === id)
  const state = save.missions.find((m) => m.id === id)
  if (!def || !state || state.claimed || state.progress < state.target) return null
  return {
    ...save,
    coins: save.coins + def.rewardCoins,
    inventory: {
      ...save.inventory,
      pokeball: save.inventory.pokeball + def.rewardBalls,
      rareCandy: save.inventory.rareCandy + def.rewardRareCandy,
    },
    missions: save.missions.map((m) => (m.id === id ? { ...m, claimed: true } : m)),
  }
}


export type GachaResult = {
  id: number
  stars: number
  shiny: boolean
  bannerId: RegionId
  save: SaveData
}

function getBannerPity(save: SaveData, bannerId: RegionId): number {
  return save.gachaPityByBanner[bannerId] ?? 0
}

function setBannerPity(save: SaveData, bannerId: RegionId, pity: number): SaveData {
  return {
    ...save,
    gachaPityByBanner: { ...save.gachaPityByBanner, [bannerId]: pity },
  }
}

function randomBannerId(banner: RegionBanner): number {
  const span = banner.maxId - banner.minId + 1
  if (Math.random() < 0.2 && banner.featured.length) {
    return banner.featured[Math.floor(Math.random() * banner.featured.length)]
  }
  return banner.minId + Math.floor(Math.random() * span)
}

async function pickLegendaryId(banner: RegionBanner): Promise<number> {
  const pool = [...banner.featured].sort(() => Math.random() - 0.5)
  for (const id of pool) {
    try {
      const mon = await fetchMon(id, { full: true })
      if (mon.isLegendary || mon.isMythical) return id
    } catch {
      /* next */
    }
  }
  return pool[0] ?? banner.maxId
}

async function pickStage3Id(banner: RegionBanner): Promise<number> {
  for (let i = 0; i < 14; i++) {
    const id = randomBannerId(banner)
    try {
      const mon = await fetchMon(id, { full: true })
      if (starsFromSpecies(mon) === 3) return id
    } catch {
      /* retry */
    }
  }
  return banner.featured[0] ?? banner.maxId
}

async function resolveOnePull(
  banner: RegionBanner,
  pity: number,
  force?: 3 | 4,
): Promise<{ id: number; stars: number; shiny: boolean; pity: number }> {
  const shiny = Math.random() < 0.06
  const hitPity = force === 4 || pity >= GACHA_PITY - 1

  if (hitPity) {
    const id = await pickLegendaryId(banner)
    return { id, stars: 4, shiny, pity: 0 }
  }

  if (force === 3) {
    const id = await pickStage3Id(banner)
    return { id, stars: 3, shiny, pity: pity + 1 }
  }

  const id = randomBannerId(banner)
  const mon = await fetchMon(id, { full: true })
  const stars = starsFromSpecies(mon)
  return { id, stars, shiny, pity: stars >= 4 ? 0 : pity + 1 }
}

export async function pullGacha(save: SaveData, bannerId: RegionId): Promise<GachaResult | null> {
  const banner = bannerForId(bannerId)
  if (!banner || banner.gen > save.unlockedGen) return null
  if (save.inventory.pokeball < GACHA_BALL_COST) return null

  const pity = getBannerPity(save, bannerId)
  const rolled = await resolveOnePull(banner, pity)
  let next: SaveData = {
    ...save,
    inventory: {
      ...save.inventory,
      pokeball: save.inventory.pokeball - GACHA_BALL_COST,
    },
  }
  next = setBannerPity(next, bannerId, rolled.pity)
  next = addToRoster(next, rolled.id, 5 + rolled.stars * 2, rolled.shiny, rolled.stars)
  next = bumpMission(next, 'gacha1')
  return { id: rolled.id, stars: rolled.stars, shiny: rolled.shiny, bannerId, save: next }
}

export async function pullGachaMulti(
  save: SaveData,
  bannerId: RegionId,
): Promise<{ results: Omit<GachaResult, 'save'>[]; save: SaveData } | null> {
  const banner = bannerForId(bannerId)
  if (!banner || banner.gen > save.unlockedGen) return null
  if (save.inventory.pokeball < GACHA_MULTI_BALL_COST) return null

  let cur: SaveData = {
    ...save,
    inventory: {
      ...save.inventory,
      pokeball: save.inventory.pokeball - GACHA_MULTI_BALL_COST,
    },
  }
  const rolls: { id: number; stars: number; shiny: boolean; pity: number }[] = []
  let pity = getBannerPity(cur, bannerId)

  for (let i = 0; i < 10; i++) {
    const rolled = await resolveOnePull(banner, pity)
    pity = rolled.pity
    rolls.push(rolled)
  }

  // Multi x10 : au moins un 3★ garanti (remplace le dernier tirage, sans tick pity en plus)
  if (!rolls.some((r) => r.stars >= 3)) {
    const id = await pickStage3Id(banner)
    const shiny = Math.random() < 0.06
    rolls[rolls.length - 1] = { id, stars: 3, shiny, pity }
  }

  for (const r of rolls) {
    cur = addToRoster(cur, r.id, 5 + r.stars * 2, r.shiny, r.stars)
  }

  cur = setBannerPity(cur, bannerId, pity)
  cur = bumpMission(cur, 'gacha1')
  return {
    results: rolls.map((r) => ({ id: r.id, stars: r.stars, shiny: r.shiny, bannerId })),
    save: cur,
  }
}

/** Première invoc gratuite : Bulbizarre / Salamèche / Carapuce (1★) */
export function pullStarterTrio(save: SaveData): { id: number; stars: number; save: SaveData } {
  const id = STARTER_TRIO[Math.floor(Math.random() * STARTER_TRIO.length)]
  const stars = 1
  const owned = defaultOwned(id, 12, stars)
  return {
    id,
    stars,
    save: {
      ...save,
      starterId: id,
      roster: [...new Set([...save.roster, id])],
      seen: [...new Set([...save.seen, id])],
      team: [owned],
      box: save.box,
    },
  }
}