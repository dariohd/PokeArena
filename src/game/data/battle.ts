import type { MonSummary, MoveSummary } from './types'
import { typeEffectiveness, type TypeChart } from './pokeapi'

export type AttackResult = {
  damage: number
  effectiveness: number
  crit: boolean
  missed: boolean
  move: MoveSummary
  label: string
}

function pickMove(
  mon: MonSummary,
  preferredIndex: number | null,
  defenderTypes: string[],
  chart: TypeChart,
): MoveSummary {
  const moves = mon.moves.length ? mon.moves : []
  if (!moves.length) {
    return {
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
    }
  }
  if (preferredIndex != null && moves[preferredIndex]) return moves[preferredIndex]

  let best = moves[0]
  let bestScore = -1
  for (const m of moves) {
    if (m.damageClass === 'status' || !m.power) continue
    const eff = typeEffectiveness(chart, m.type, defenderTypes)
    const stab = mon.types.includes(m.type) ? 1.5 : 1
    const atkStat = m.damageClass === 'special' ? mon.spa : mon.atk
    const score = (m.power ?? 0) * eff * stab * (atkStat / 100) * ((m.accuracy ?? 100) / 100)
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

export function resolveAttack(opts: {
  attacker: MonSummary
  defender: MonSummary
  attackerLevel: number
  chart: TypeChart
  preferredMoveIndex?: number | null
  waveMul?: number
}): AttackResult {
  const move = pickMove(opts.attacker, opts.preferredMoveIndex ?? null, opts.defender.types, opts.chart)
  const acc = move.accuracy ?? 100
  if (Math.random() * 100 > acc) {
    return { damage: 0, effectiveness: 1, crit: false, missed: true, move, label: 'Raté !' }
  }

  if (move.damageClass === 'status' || !move.power) {
    return { damage: 0, effectiveness: 1, crit: false, missed: false, move, label: move.nameFr }
  }

  const crit = Math.random() < 1 / 16
  const level = opts.attackerLevel
  const power = move.power
  const isSpecial = move.damageClass === 'special'
  const A = (isSpecial ? opts.attacker.spa : opts.attacker.atk) * (0.85 + level * 0.04)
  const D = (isSpecial ? opts.defender.spd : opts.defender.def) * (0.85 + level * 0.03)
  const stab = opts.attacker.types.includes(move.type) ? 1.5 : 1
  const eff = typeEffectiveness(opts.chart, move.type, opts.defender.types)
  const random = 0.85 + Math.random() * 0.15
  const waveMul = opts.waveMul ?? 1

  let dmg =
    ((((2 * level) / 5 + 2) * power * (A / Math.max(1, D))) / 50 + 2) *
    stab *
    eff *
    random *
    (crit ? 1.5 : 1) *
    waveMul

  dmg = Math.max(eff === 0 ? 0 : 1, Math.round(dmg))

  let label = move.nameFr
  if (eff === 0) label = 'Sans effet…'
  else if (eff >= 2) label = 'Super efficace !'
  else if (eff > 0 && eff < 1) label = 'Peu efficace…'
  if (crit && eff > 0) label = `Critique ! ${label}`

  return { damage: dmg, effectiveness: eff, crit, missed: false, move, label }
}

export function effectivenessColor(eff: number): string {
  if (eff === 0) return '#8aa0b8'
  if (eff >= 2) return '#56f0b0'
  if (eff < 1) return '#ff4d7a'
  return '#e8f2ff'
}
