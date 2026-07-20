import { loadSave, writeSave } from './data/pokeapi'

let current: HTMLAudioElement | null = null

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

export function toggleMute(): boolean {
  const save = loadSave()
  save.mute = !save.mute
  writeSave(save)
  return save.mute
}
