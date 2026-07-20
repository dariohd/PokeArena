import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { fetchMon } from './data/pokeapi'
import type { MonSummary } from './data/types'
import { ensureTextures } from './ui'

/**
 * Fond = vrai artwork PokéAPI (official-artwork), pas de décor généré.
 * Base plate + image cover + overlay sombre pour lisibilité UI.
 */
export async function paintArtBackdrop(
  scene: Phaser.Scene,
  monId: number,
  opts?: {
    /** Opacité de l’overlay sombre (0–1). Défaut 0.48 */
    dim?: number
    /** Multiplicateur de couverture. Défaut 1.2 */
    zoom?: number
    /** Teinte légère de l’art */
    tint?: number
  },
): Promise<MonSummary | null> {
  scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0d12).setOrigin(0).setDepth(0)

  try {
    const mon = await fetchMon(monId, { full: false })
    await ensureTextures(scene, [{ key: mon.spriteKey, url: mon.spriteUrl }])
    if (!scene.textures.exists(mon.spriteKey)) return mon

    const src = scene.textures.get(mon.spriteKey).getSourceImage() as HTMLImageElement
    const tw = src.width || 475
    const th = src.height || 475
    const zoom = opts?.zoom ?? 1.2
    const cover = Math.max(GAME_W / tw, GAME_H / th) * zoom

    const art = scene.add
      .image(GAME_W / 2, GAME_H / 2, mon.spriteKey)
      .setScale(cover)
      .setAlpha(0.7)
      .setDepth(1)
    if (opts?.tint != null) art.setTint(opts.tint)

    scene.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x080a10, opts?.dim ?? 0.48)
      .setOrigin(0)
      .setDepth(2)

    return mon
  } catch {
    return null
  }
}

/** Héros net au premier plan (même mon ou autre) */
export function placeHeroArt(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  scale = 0.55,
): Phaser.GameObjects.Image | undefined {
  if (!scene.textures.exists(key)) return undefined
  const hero = scene.add.image(x, y, key).setScale(scale * 0.92).setDepth(10).setAlpha(0)
  scene.tweens.add({
    targets: hero,
    alpha: 1,
    scale,
    duration: 400,
    ease: 'Cubic.easeOut',
  })
  return hero
}
