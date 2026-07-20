import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { loadSave } from './data/pokeapi'
import { formatPokedollars } from './data/types'
import { FONT_TITLE, FONT_UI, Theme } from './theme'
import { goScene, makeButton } from './ui'

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

/** Chrome unique : top + dock (Retour seul si back). */
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
    const wallet = `${formatPokedollars(save.coins)} · ${save.inventory.pokeball} balls · ${save.inventory.rareCandy} bonbons · gen ${save.unlockedGen}`
    scene.add
      .text(GAME_W - L.pad - (opts.back ? 96 : 0), L.topH / 2, wallet, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.8)',
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

/** Ligne liste unique */
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
  },
) {
  const depth = opts.depth ?? 14
  const accent = opts.accent ?? Theme.blue

  const bg = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.32).setDepth(depth)
  bg.setStrokeStyle(1.5, accent, 0.8)

  scene.add
    .text(x + 16, y + h / 2 - (opts.sub ? 8 : 0), opts.title, {
      fontFamily: FONT_TITLE,
      fontSize: '15px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)
    .setDepth(depth + 1)

  if (opts.sub) {
    scene.add
      .text(x + 16, y + h / 2 + 12, opts.sub, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.58)',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
  }

  if (opts.onClick) {
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => bg.setFillStyle(0xffffff, 0.08))
    bg.on('pointerout', () => bg.setFillStyle(0x000000, 0.32))
    bg.on('pointerdown', opts.onClick)
  }
  return bg
}

/** Case mon / item cohérente */
export function slotFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: number,
  depth = 14,
) {
  const bg = scene.add.rectangle(x, y, w, h, 0x000000, 0.3).setDepth(depth)
  bg.setStrokeStyle(1.5, accent, 0.85)
  return bg
}

export function sectionTitle(scene: Phaser.Scene, x: number, y: number, label: string) {
  return scene.add
    .text(x, y, label, {
      fontFamily: FONT_TITLE,
      fontSize: '13px',
      color: `#${Theme.gold.toString(16).padStart(6, '0')}`,
    })
    .setDepth(20)
}
