import Phaser from 'phaser'
import { BG_FILES } from './assets'
import { GAME_H, GAME_W } from './config'
import { fetchMon } from './data/pokeapi'
import type { MonSummary } from './data/types'
import { ensureTextures } from './ui'

/** Précharge tous les fonds Showdown locaux */
export async function preloadBackgrounds(scene: Phaser.Scene): Promise<void> {
  let queued = false
  for (const [key, url] of Object.entries(BG_FILES)) {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, url)
      queued = true
    }
  }
  if (!queued) return
  await new Promise<void>((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
    scene.load.start()
  })
  for (const key of Object.keys(BG_FILES)) {
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
    }
  }
}

/**
 * Fond réel (Showdown) en cover + overlay.
 * Optionnel : artwork / home mon en héros.
 */
export async function paintScene(
  scene: Phaser.Scene,
  bgKey: string,
  opts?: {
    dim?: number
    heroId?: number
    heroX?: number
    heroY?: number
    heroScale?: number
    /** 'home' | 'art' — défaut home (HQ 512) */
    heroKind?: 'home' | 'art'
  },
): Promise<MonSummary | null> {
  if (!scene.textures.exists(bgKey) && BG_FILES[bgKey]) {
    await ensureTextures(scene, [{ key: bgKey, url: BG_FILES[bgKey] }])
  }

  scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0d12).setOrigin(0).setDepth(0)

  if (scene.textures.exists(bgKey)) {
    const img = scene.add.image(GAME_W / 2, GAME_H / 2, bgKey).setDepth(1)
    const src = scene.textures.get(bgKey).getSourceImage() as HTMLImageElement
    const tw = src.width || 700
    const th = src.height || 500
    const cover = Math.max(GAME_W / tw, GAME_H / th)
    img.setScale(cover)
  }

  scene.add
    .rectangle(0, 0, GAME_W, GAME_H, 0x05070c, opts?.dim ?? 0.35)
    .setOrigin(0)
    .setDepth(2)

  if (!opts?.heroId) return null

  try {
    const mon = await fetchMon(opts.heroId, { full: false })
    const kind = opts.heroKind ?? 'home'
    const key = kind === 'art' ? mon.spriteKey : mon.homeKey
    const url = kind === 'art' ? mon.spriteUrl : mon.homeUrl
    await ensureTextures(scene, [{ key, url }])
    if (scene.textures.exists(key)) {
      const hx = opts.heroX ?? GAME_W * 0.68
      const hy = opts.heroY ?? GAME_H * 0.55
      const scale = opts.heroScale ?? (kind === 'art' ? 0.5 : 0.42)
      // Ombre d’ancrage
      scene.add.ellipse(hx, hy + scale * 220, 150 * scale * 2, 32, 0x000000, 0.32).setDepth(9)
      const hero = scene.add.image(hx, hy, key).setScale(scale * 0.92).setDepth(10).setAlpha(0)
      scene.tweens.add({
        targets: hero,
        alpha: 1,
        scale,
        duration: 420,
        ease: 'Cubic.easeOut',
      })
      scene.tweens.add({
        targets: hero,
        y: hy - 6,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
    return mon
  } catch {
    return null
  }
}
