/** Helpers visuels « feeling jeu » (particules, parallaxe, boot DOM). */

import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { Theme } from './theme'

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

/** Nuages / poussière légère pour ambiance gacha */
export function spawnAmbientSparkles(scene: Phaser.Scene, count = 18, color = 0xffffff) {
  const g = scene.add.graphics().setDepth(5).setAlpha(0.55)
  for (let i = 0; i < count; i++) {
    const x = Math.random() * GAME_W
    const y = 40 + Math.random() * (GAME_H * 0.55)
    const r = 1 + Math.random() * 2.2
    g.fillStyle(color, 0.35 + Math.random() * 0.45)
    g.fillCircle(x, y, r)
  }
  scene.tweens.add({
    targets: g,
    alpha: 0.2,
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  return g
}

export function spawnDriftClouds(scene: Phaser.Scene, depth = 2) {
  const clouds: Phaser.GameObjects.Ellipse[] = []
  for (let i = 0; i < 5; i++) {
    const c = scene.add
      .ellipse(
        -80 + i * 220,
        50 + (i % 3) * 28,
        120 + (i % 2) * 40,
        36 + (i % 2) * 10,
        0xffffff,
        0.22,
      )
      .setDepth(depth)
    clouds.push(c)
    scene.tweens.add({
      targets: c,
      x: GAME_W + 120,
      duration: 28000 + i * 4000,
      repeat: -1,
      ease: 'Linear',
    })
  }
  return clouds
}

/** Sol arène simple (lisible, pas de décor inventé) */
export function drawPerspectiveArena(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(0)
  g.fillStyle(0x5a9ec8, 1)
  g.fillRect(0, 0, GAME_W, 220)
  g.fillStyle(0x4a8a38, 1)
  g.fillRect(0, 220, GAME_W, GAME_H - 220)
  g.fillStyle(0xc9a24a, 1)
  g.fillEllipse(GAME_W / 2, GAME_H / 2 + 40, 640, 220)
  g.fillStyle(0xb89040, 1)
  g.fillEllipse(GAME_W / 2, GAME_H / 2 + 40, 560, 180)
  g.lineStyle(2, 0xffffff, 0.35)
  g.strokeEllipse(GAME_W / 2, GAME_H / 2 + 40, 560, 180)
  return g
}

export const ARENA_FAR_Y = 250
export const ARENA_NEAR_Y = 470

/** Échelle 2.5D selon la profondeur (Y) */
export function depthScale(y: number, base = 1): number {
  const t = Phaser.Math.Clamp((y - ARENA_FAR_Y) / (ARENA_NEAR_Y - ARENA_FAR_Y), 0, 1)
  return base * Phaser.Math.Linear(0.72, 1.28, t)
}

export function flashWhite(scene: Phaser.Scene, duration = 120) {
  const fx = scene.add
    .rectangle(0, 0, GAME_W, GAME_H, Theme.white, 0.55)
    .setOrigin(0)
    .setDepth(5000)
    .setScrollFactor(0)
  scene.tweens.add({
    targets: fx,
    alpha: 0,
    duration,
    onComplete: () => fx.destroy(),
  })
}
