import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { loadSave } from './data/pokeapi'
import { formatPokedollars } from './data/types'
import { FONT_TITLE, FONT_UI, Theme } from './theme'
import { goScene, hexCss, makeButton } from './ui'

/** Grille HD — chrome léger, pas de gros blocs */
export const L = {
  topH: 52,
  dockH: 64,
  pad: 24,
  contentY: 64,
  get contentH() {
    return GAME_H - this.topH - this.dockH - 8
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

export function drawShell(scene: Phaser.Scene, opts: ShellOpts) {
  const save = loadSave()
  const showWallet = opts.showWallet !== false
  const accent = opts.accent ?? Theme.red

  const top = scene.add.graphics().setDepth(100)
  top.fillStyle(0x05070c, 0.72)
  top.fillRect(0, 0, GAME_W, L.topH)
  top.fillStyle(accent, 1)
  top.fillRect(0, L.topH - 2, GAME_W, 2)

  scene.add
    .text(L.pad, L.topH / 2, opts.title, {
      fontFamily: FONT_TITLE,
      fontSize: '18px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)
    .setDepth(101)

  if (showWallet) {
    const wallet = `${formatPokedollars(save.coins)} · ${save.inventory.pokeball} Ball · ${save.inventory.rareCandy} SB · R${save.unlockedGen}`
    scene.add
      .text(GAME_W - L.pad - (opts.back ? 100 : 0), L.topH / 2, wallet, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.82)',
      })
      .setOrigin(1, 0.5)
      .setDepth(101)
  }

  const dock = scene.add.graphics().setDepth(100)
  dock.fillStyle(0x05070c, 0.78)
  dock.fillRect(0, GAME_H - L.dockH, GAME_W, L.dockH)
  dock.fillStyle(accent, 0.9)
  dock.fillRect(0, GAME_H - L.dockH, GAME_W, 2)

  if (opts.back) {
    makeButton(scene, 72, L.dockY, 'Retour', {
      tone: 'red',
      fontSize: '13px',
      padX: 14,
      padY: 8,
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

/** Panneau discret (usage rare) */
export function contentCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { accent?: number; depth?: number; enter?: boolean },
) {
  const g = scene.add.graphics().setDepth(opts?.depth ?? 12)
  g.fillStyle(0x080a10, 0.55)
  g.fillRoundedRect(x, y, w, h, 10)
  g.lineStyle(1, opts?.accent ?? 0xffffff, 0.16)
  g.strokeRoundedRect(x, y, w, h, 10)
  if (opts?.accent) {
    g.fillStyle(opts.accent, 1)
    g.fillRect(x, y + 10, 3, h - 20)
  }
  return g
}

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

  const bg = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.32).setDepth(depth)
  bg.setStrokeStyle(1.5, accent, 0.75)

  const title = scene.add
    .text(x + 16, y + h / 2 - (opts.sub ? 8 : 0), opts.title, {
      fontFamily: FONT_TITLE,
      fontSize: '15px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)
    .setDepth(depth + 1)

  let sub: Phaser.GameObjects.Text | undefined
  if (opts.sub) {
    sub = scene.add
      .text(x + 16, y + h / 2 + 12, opts.sub, {
        fontFamily: FONT_UI,
        fontSize: '11px',
        color: 'rgba(255,255,255,0.58)',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
  }

  const targets = [bg, title, ...(sub ? [sub] : [])]
  targets.forEach((t) => t.setAlpha(0))
  scene.tweens.add({ targets, alpha: 1, duration: 200, delay, ease: 'Cubic.easeOut' })

  if (opts.onClick) {
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => bg.setFillStyle(0xffffff, 0.08))
    bg.on('pointerout', () => bg.setFillStyle(0x000000, 0.32))
    bg.on('pointerdown', opts.onClick)
  }
  return bg
}

export function sectionTitle(scene: Phaser.Scene, x: number, y: number, label: string) {
  return scene.add
    .text(x, y, label, {
      fontFamily: FONT_TITLE,
      fontSize: '13px',
      color: hexCss(Theme.gold),
    })
    .setDepth(20)
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
    .rectangle(0, 0, GAME_W, GAME_H, c, stars >= 4 ? 0.5 : stars >= 3 ? 0.32 : 0.18)
    .setOrigin(0)
    .setDepth(4000)
  scene.tweens.add({
    targets: fx,
    alpha: 0,
    duration: stars >= 4 ? 480 : 240,
    onComplete: () => fx.destroy(),
  })
  if (stars >= 3) {
    scene.cameras.main.shake(stars >= 4 ? 100 : 45, stars >= 4 ? 0.01 : 0.004)
  }
}
