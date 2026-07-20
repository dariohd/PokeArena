/** FX utiles uniquement (pas d’ambiance inventée). */

import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'

export function setBootProgress(pct: number, label?: string) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const fill = document.getElementById('boot-fill')
  const text = document.getElementById('boot-pct')
  const sub = document.querySelector('.boot__sub')
  const bar = document.querySelector('.boot__bar')
  if (fill) fill.style.width = `${clamped}%`
  if (text) text.textContent = `${clamped}%`
  if (sub && label) sub.textContent = label
  if (bar) bar.setAttribute('aria-valuenow', String(clamped))
}

export function hideBootOverlay() {
  document.getElementById('boot')?.classList.add('is-hidden')
}

export const ARENA_FAR_Y = 330
export const ARENA_NEAR_Y = 620

export function depthScale(y: number, base = 1): number {
  const t = Phaser.Math.Clamp((y - ARENA_FAR_Y) / (ARENA_NEAR_Y - ARENA_FAR_Y), 0, 1)
  return base * Phaser.Math.Linear(0.72, 1.28, t)
}

/** Ombre fixe sous un héros (pas de pulse) */
export function heroShadow(scene: Phaser.Scene, x: number, y: number) {
  return scene.add.ellipse(x, y, 140, 28, 0x000000, 0.35).setDepth(9)
}

/** Burst uniquement pour rareté haute */
export function summonBurst(scene: Phaser.Scene, x: number, y: number, color: number, count = 20) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count
    const dist = 36 + Math.random() * 70
    const p = scene.add.circle(x, y, 2 + Math.random() * 2.5, color, 0.9).setDepth(50)
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist,
      alpha: 0,
      scale: 0.2,
      duration: 380 + Math.random() * 200,
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    })
  }
}

export function rarityFlash(scene: Phaser.Scene, stars: number) {
  const colors: Record<number, number> = {
    1: 0xffffff,
    2: 0x4caf70,
    3: 0x3b7dd8,
    4: 0xe8b923,
  }
  const c = colors[stars] ?? 0xffffff
  const fx = scene.add
    .rectangle(0, 0, GAME_W, GAME_H, c, stars >= 4 ? 0.48 : stars >= 3 ? 0.3 : 0.14)
    .setOrigin(0)
    .setDepth(4000)
  scene.tweens.add({
    targets: fx,
    alpha: 0,
    duration: stars >= 4 ? 420 : 200,
    onComplete: () => fx.destroy(),
  })
  if (stars >= 3) {
    scene.cameras.main.shake(stars >= 4 ? 90 : 40, stars >= 4 ? 0.01 : 0.004)
  }
}
