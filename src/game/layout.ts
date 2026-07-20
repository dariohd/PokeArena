import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { loadSave } from './data/pokeapi'
import { formatPokedollars } from './data/types'
import { FONT_TITLE, FONT_UI, Theme } from './theme'
import { goScene, hexCss, makeButton } from './ui'

/** Grille HD 1280×720 — chrome commun à tous les écrans meta */
export const L = {
  topH: 64,
  dockH: 72,
  pad: 28,
  contentY: 78,
  get contentH() {
    return GAME_H - this.topH - this.dockH - 12
  },
  get dockY() {
    return GAME_H - this.dockH / 2
  },
  get contentCenterY() {
    return this.contentY + this.contentH / 2
  },
} as const

export type ShellOpts = {
  title: string
  back?: boolean
  showWallet?: boolean
  accent?: number
}

/**
 * Chrome commun : barre top + dock bas + bandeau accent.
 * Retourne la zone contenu utile.
 */
export function drawShell(scene: Phaser.Scene, opts: ShellOpts) {
  const save = loadSave()
  const showWallet = opts.showWallet !== false
  const accent = opts.accent ?? Theme.red

  const top = scene.add.graphics().setDepth(100)
  top.fillStyle(0x05070c, 0.82)
  top.fillRect(0, 0, GAME_W, L.topH)
  top.fillStyle(accent, 1)
  top.fillRect(0, L.topH - 3, GAME_W, 3)
  top.lineStyle(1, 0xffffff, 0.08)
  top.lineBetween(0, L.topH, GAME_W, L.topH)

  const title = scene.add
    .text(L.pad, L.topH / 2, opts.title, {
      fontFamily: FONT_TITLE,
      fontSize: '26px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)
    .setDepth(101)
  title.setAlpha(0)
  scene.tweens.add({ targets: title, alpha: 1, x: L.pad + 4, duration: 280, ease: 'Cubic.easeOut' })

  if (showWallet) {
    drawWalletChips(scene, GAME_W - L.pad - (opts.back ? 118 : 0), L.topH / 2, {
      coins: save.coins,
      balls: save.inventory.pokeball,
      candy: save.inventory.rareCandy,
      gen: save.unlockedGen,
    })
  }

  const dock = scene.add.graphics().setDepth(100)
  dock.fillStyle(0x05070c, 0.86)
  dock.fillRect(0, GAME_H - L.dockH, GAME_W, L.dockH)
  dock.fillStyle(accent, 0.85)
  dock.fillRect(0, GAME_H - L.dockH, GAME_W, 3)
  dock.lineStyle(1, 0xffffff, 0.08)
  dock.lineBetween(0, GAME_H - L.dockH, GAME_W, GAME_H - L.dockH)

  if (opts.back) {
    makeButton(scene, 86, L.dockY, 'Retour', {
      tone: 'red',
      fontSize: '15px',
      padX: 18,
      padY: 10,
      onClick: () => goScene(scene, 'hub'),
    }).setDepth(102)
  }

  return {
    x: L.pad,
    y: L.contentY,
    w: GAME_W - L.pad * 2,
    h: L.contentH,
    cx: GAME_W / 2,
    cy: L.contentCenterY,
  }
}

function drawWalletChips(
  scene: Phaser.Scene,
  rightX: number,
  y: number,
  data: { coins: number; balls: number; candy: number; gen: number },
) {
  const parts = [
    { label: formatPokedollars(data.coins), color: Theme.gold },
    { label: `${data.balls} Ball`, color: Theme.red },
    { label: `${data.candy} SB`, color: Theme.blue },
    { label: `R${data.gen}`, color: 0x88aacc },
  ]
  let x = rightX
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    const t = scene.add
      .text(0, 0, p.label, {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    const w = t.width + 22
    const h = 28
    const g = scene.add.graphics().setDepth(101)
    g.fillStyle(0x000000, 0.45)
    g.fillRoundedRect(x - w, y - h / 2, w, h, 8)
    g.lineStyle(1.5, p.color, 0.9)
    g.strokeRoundedRect(x - w, y - h / 2, w, h, 8)
    t.setPosition(x - w / 2, y).setDepth(102)
    x -= w + 8
  }
}

/** Carte contenu semi-transparente */
export function contentCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { accent?: number; depth?: number; enter?: boolean },
) {
  const g = scene.add.graphics().setDepth(opts?.depth ?? 12)
  g.fillStyle(0x080a10, 0.78)
  g.fillRoundedRect(x, y, w, h, 16)
  g.lineStyle(2, opts?.accent ?? 0xffffff, 0.2)
  g.strokeRoundedRect(x, y, w, h, 16)
  if (opts?.accent) {
    g.fillStyle(opts.accent, 1)
    g.fillRect(x + 2, y + 14, 4, h - 28)
  }
  if (opts?.enter !== false) {
    g.setAlpha(0)
    scene.tweens.add({ targets: g, alpha: 1, duration: 220, ease: 'Cubic.easeOut' })
  }
  return g
}

/** Ligne de liste cliquable */
export function listRow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    title: string
    sub?: string
    accent?: number
    onClick?: () => void
    depth?: number
    delay?: number
  },
) {
  const depth = opts.depth ?? 14
  const accent = opts.accent ?? Theme.blue
  const delay = opts.delay ?? 0

  const bg = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.4).setDepth(depth)
  bg.setStrokeStyle(2, accent, 0.9)

  const bar = scene.add.rectangle(x + 3, y + h / 2, 4, h - 10, accent, 1).setDepth(depth + 1)

  const title = scene.add
    .text(x + 20, y + h / 2 - (opts.sub ? 10 : 0), opts.title, {
      fontFamily: FONT_TITLE,
      fontSize: '18px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)
    .setDepth(depth + 1)

  let sub: Phaser.GameObjects.Text | undefined
  if (opts.sub) {
    sub = scene.add
      .text(x + 20, y + h / 2 + 14, opts.sub, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.62)',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
  }

  const targets = [bg, bar, title, ...(sub ? [sub] : [])]
  targets.forEach((t) => {
    t.setAlpha(0)
    t.setX((t as Phaser.GameObjects.Components.Transform).x + 12)
  })
  scene.tweens.add({
    targets,
    alpha: 1,
    x: '-=12',
    duration: 280,
    delay,
    ease: 'Cubic.easeOut',
  })

  if (opts.onClick) {
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      bg.setFillStyle(0xffffff, 0.1)
      scene.tweens.add({ targets: bg, scaleX: 1.01, duration: 80 })
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(0x000000, 0.4)
      scene.tweens.add({ targets: bg, scaleX: 1, duration: 80 })
    })
    bg.on('pointerdown', opts.onClick)
  }
  return bg
}

export function sectionTitle(scene: Phaser.Scene, x: number, y: number, label: string) {
  return scene.add
    .text(x, y, label, {
      fontFamily: FONT_TITLE,
      fontSize: '15px',
      color: hexCss(Theme.gold),
    })
    .setDepth(20)
}

/** Flash de rareté pour invoc */
export function rarityFlash(scene: Phaser.Scene, stars: number) {
  const colors: Record<number, number> = {
    1: 0xffffff,
    2: 0x4caf70,
    3: 0x3b7dd8,
    4: 0xe8b923,
  }
  const c = colors[stars] ?? 0xffffff
  const fx = scene.add
    .rectangle(0, 0, GAME_W, GAME_H, c, stars >= 4 ? 0.55 : stars >= 3 ? 0.38 : 0.22)
    .setOrigin(0)
    .setDepth(4000)
  scene.tweens.add({
    targets: fx,
    alpha: 0,
    duration: stars >= 4 ? 420 : 220,
    onComplete: () => fx.destroy(),
  })
  if (stars >= 3) {
    scene.cameras.main.shake(stars >= 4 ? 90 : 40, stars >= 4 ? 0.012 : 0.005)
  }
}
