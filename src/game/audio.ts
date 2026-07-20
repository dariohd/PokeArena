import { loadSave, writeSave } from './data/pokeapi'

let current: HTMLAudioElement | null = null
let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function playCry(url: string | null | undefined, volume = 0.45) {
  const save = loadSave()
  if (save.mute || !url) return
  try {
    if (current) {
      current.pause()
      current = null
    }
    const audio = new Audio(url)
    audio.volume = volume
    current = audio
    void audio.play().catch(() => undefined)
  } catch {
    /* ignore */
  }
}

/** Beeps UI (pas de fichiers externes) */
export function playSfx(kind: 'click' | 'open' | 'rare' | 'hit' | 'wave') {
  const save = loadSave()
  if (save.mute) return
  const ac = audioCtx()
  if (!ac) return

  const now = ac.currentTime
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.connect(g)
  g.connect(ac.destination)

  if (kind === 'click') {
    o.type = 'sine'
    o.frequency.setValueAtTime(520, now)
    g.gain.setValueAtTime(0.04, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    o.start(now)
    o.stop(now + 0.07)
  } else if (kind === 'open') {
    o.type = 'triangle'
    o.frequency.setValueAtTime(180, now)
    o.frequency.exponentialRampToValueAtTime(420, now + 0.18)
    g.gain.setValueAtTime(0.07, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    o.start(now)
    o.stop(now + 0.24)
  } else if (kind === 'rare') {
    o.type = 'sine'
    o.frequency.setValueAtTime(440, now)
    o.frequency.setValueAtTime(660, now + 0.12)
    o.frequency.setValueAtTime(880, now + 0.24)
    g.gain.setValueAtTime(0.08, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    o.start(now)
    o.stop(now + 0.42)
  } else if (kind === 'hit') {
    o.type = 'square'
    o.frequency.setValueAtTime(140, now)
    g.gain.setValueAtTime(0.035, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    o.start(now)
    o.stop(now + 0.06)
  } else {
    o.type = 'sine'
    o.frequency.setValueAtTime(300, now)
    o.frequency.exponentialRampToValueAtTime(520, now + 0.25)
    g.gain.setValueAtTime(0.06, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    o.start(now)
    o.stop(now + 0.32)
  }
}

export function toggleMute(): boolean {
  const save = loadSave()
  save.mute = !save.mute
  writeSave(save)
  return save.mute
}
