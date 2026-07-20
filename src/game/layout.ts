import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { loadSave } from './data/pokeapi'
import { formatPokedollars } from './data/types'
import { FONT_TITLE, FONT_UI, Theme } from './theme'
import { goScene, hexCss, makeButton } from './ui'

/** Grille fixe 960×540 — tous les écrans meta s’y calent */
export const L = {
  topH: 52,
  dockH: 58,
  pad: 20,
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
  /** Affiche Retour → hub */
  back?: boolean
  /** Scène active pour highlight (optionnel) */
  active?: string
  showWallet?: boolean
}

/**
 * Chrome commun : barre top + dock bas.
 * Retourne la zone contenu utile { x, y, w, h }.
 */
export function drawShell(scene: Phaser.Scene, opts: ShellOpts) {
  const save = loadSave()
  const showWallet = opts.showWallet !== false

  // Top bar
  const top = scene.add.graphics().setDepth(100)
  top.fillStyle(0x000000, 0.72)
  top.fillRect(0, 0, GAME_W, L.topH)
  top.lineStyle(1, 0xffffff, 0.12)
  top.lineBetween(0, L.topH, GAME_W, L.topH)

  scene.add
    .text(L.pad, L.topH / 2, opts.title, {
      fontFamily: FONT_TITLE,
      fontSize: '20px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)
    .setDepth(101)

  if (showWallet) {
    const wallet = `${formatPokedollars(save.coins)}   ${save.inventory.pokeball} Ball   ${save.inventory.rareCandy} SB   R${save.unlockedGen}`
    scene.add
      .text(GAME_W - L.pad - (opts.back ? 100 : 0), L.topH / 2, wallet, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.88)',
      })
      .setOrigin(1, 0.5)
      .setDepth(101)
  }

  // Dock
  const dock = scene.add.graphics().setDepth(100)
  dock.fillStyle(0x000000, 0.72)
  dock.fillRect(0, GAME_H - L.dockH, GAME_W, L.dockH)
  dock.lineStyle(1, 0xffffff, 0.12)
  dock.lineBetween(0, GAME_H - L.dockH, GAME_W, GAME_H - L.dockH)

  if (opts.back) {
    makeButton(scene, 70, L.dockY, 'Retour', {
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

/** Carte contenu semi-transparente alignée sur la grille */
export function contentCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { accent?: number; depth?: number },
) {
  const g = scene.add.graphics().setDepth(opts?.depth ?? 12)
  g.fillStyle(0x0a0c12, 0.72)
  g.fillRoundedRect(x, y, w, h, 14)
  g.lineStyle(2, opts?.accent ?? 0xffffff, 0.18)
  g.strokeRoundedRect(x, y, w, h, 14)
  return g
}

/** Ligne de liste cliquable cohérente */
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
  const bg = scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.35).setDepth(depth)
  bg.setStrokeStyle(2, accent, 0.85)

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
        fontSize: '11px',
        color: 'rgba(255,255,255,0.65)',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
  }

  if (opts.onClick) {
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => bg.setFillStyle(0xffffff, 0.08))
    bg.on('pointerout', () => bg.setFillStyle(0x000000, 0.35))
    bg.on('pointerdown', opts.onClick)
  }
  return bg
}

export function sectionTitle(scene: Phaser.Scene, x: number, y: number, label: string) {
  return scene.add
    .text(x, y, label, {
      fontFamily: FONT_TITLE,
      fontSize: '14px',
      color: hexCss(Theme.gold),
    })
    .setDepth(20)
}
