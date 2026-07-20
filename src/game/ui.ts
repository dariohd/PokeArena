import Phaser from 'phaser'
import { GAME_H, GAME_W } from './config'
import { ITEM_SPRITE, type InventoryKey } from './data/types'
import { FONT_TITLE, FONT_UI, Theme, type RoomKind } from './theme'

export type UiButton = Phaser.GameObjects.Container & {
  setLabel: (label: string) => void
}

export function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

export function starsLabel(n: number): string {
  return '★'.repeat(Math.max(0, Math.min(4, n)))
}

export function fadeIn(scene: Phaser.Scene, color: number = Theme.skyTop) {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  scene.cameras.main.fadeIn(220, r, g, b)
}

export function goScene(scene: Phaser.Scene, key: string, color: number = Theme.skyTop) {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  scene.cameras.main.fadeOut(160, r, g, b)
  scene.time.delayedCall(170, () => scene.scene.start(key))
}

/** Fond de salle distinct par lieu */
export function drawRoom(scene: Phaser.Scene, kind: RoomKind, accent: number = Theme.red) {
  const g = scene.add.graphics()
  if (kind === 'outdoor') {
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.grass, 1)
    g.fillRect(0, GAME_H - 110, GAME_W, 110)
    g.fillStyle(Theme.grassDark, 1)
    for (let x = -10; x < GAME_W; x += 36) {
      g.fillTriangle(x, GAME_H - 110, x + 18, GAME_H - 138, x + 36, GAME_H - 110)
    }
    return g
  }
  if (kind === 'centre') {
    g.fillGradientStyle(0xfff0f4, 0xfff0f4, Theme.pinkSoft, Theme.pinkSoft, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.pink, 1)
    g.fillRect(0, 0, GAME_W, 56)
    g.fillStyle(Theme.white, 1)
    g.fillRect(0, 56, GAME_W, 8)
    g.fillStyle(Theme.centreFloor, 1)
    g.fillRect(0, GAME_H - 64, GAME_W, 64)
    g.fillStyle(0xe8d8c8, 1)
    for (let x = 0; x < GAME_W; x += 48) g.fillRect(x, GAME_H - 64, 24, 64)
    return g
  }
  if (kind === 'mart') {
    g.fillGradientStyle(0xb8d4ec, 0xb8d4ec, 0x7eb0d8, 0x7eb0d8, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.martBlue, 1)
    g.fillRect(0, 0, GAME_W, 64)
    g.fillStyle(Theme.martShelf, 1)
    g.fillRect(24, 90, GAME_W - 48, 360)
    g.fillStyle(0x1e4060, 0.35)
    for (let y = 150; y < 430; y += 70) g.fillRect(36, y, GAME_W - 72, 4)
    return g
  }
  if (kind === 'dojo') {
    g.fillGradientStyle(0xf0d8b0, 0xf0d8b0, 0xd8b078, 0xd8b078, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.dojoWood, 1)
    g.fillRect(0, 0, GAME_W, 58)
    g.fillStyle(Theme.dojoDark, 1)
    for (let x = 0; x < GAME_W; x += 40) g.fillRect(x, 58, 2, GAME_H - 58)
    g.fillStyle(0xa86830, 0.25)
    g.fillEllipse(GAME_W / 2, GAME_H - 40, 520, 70)
    return g
  }
  if (kind === 'dex') {
    g.fillGradientStyle(Theme.dexRed, Theme.dexRed, Theme.dexDark, Theme.dexDark, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(0x1a1a28, 1)
    g.fillRoundedRect(28, 72, GAME_W - 56, GAME_H - 120, 18)
    g.fillStyle(0x88e0f0, 0.12)
    g.fillRoundedRect(40, 84, GAME_W - 80, GAME_H - 144, 12)
    g.fillStyle(Theme.white, 1)
    g.fillCircle(70, 40, 10)
    g.fillStyle(0x48c8f0, 1)
    g.fillCircle(70, 40, 6)
    return g
  }
  if (kind === 'machine') {
    g.fillGradientStyle(0x2d3748, 0x2d3748, 0x1a202c, 0x1a202c, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.machine, 1)
    g.fillRoundedRect(40, 70, GAME_W - 80, GAME_H - 140, 16)
    g.lineStyle(5, accent, 1)
    g.strokeRoundedRect(40, 70, GAME_W - 80, GAME_H - 140, 16)
    g.fillStyle(Theme.machineLite, 0.35)
    g.fillRoundedRect(56, 86, GAME_W - 112, 36, 8)
    return g
  }
  if (kind === 'pc') {
    g.fillGradientStyle(0x1e3a5f, 0x1e3a5f, 0x0f2240, 0x0f2240, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(0x88c8f0, 1)
    g.fillRoundedRect(36, 70, GAME_W - 72, GAME_H - 130, 14)
    g.fillStyle(0xe8f6ff, 1)
    g.fillRoundedRect(48, 82, GAME_W - 96, GAME_H - 154, 10)
    return g
  }
  // result
  g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
  g.fillRect(0, 0, GAME_W, GAME_H)
  g.fillStyle(Theme.grass, 1)
  g.fillRect(0, GAME_H - 80, GAME_W, 80)
  return g
}

/** Cadre dialogue RPG (double bordure) */
export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { fill?: number; stroke?: number; radius?: number; depth?: number },
) {
  const g = scene.add.graphics()
  const fill = opts?.fill ?? Theme.panel
  const stroke = opts?.stroke ?? Theme.panelStroke
  const r = opts?.radius ?? 14
  g.fillStyle(stroke, 1)
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, r + 2)
  g.fillStyle(fill, 1)
  g.fillRoundedRect(x, y, w, h, r)
  g.lineStyle(2, Theme.panelEdge, 0.35)
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, Math.max(6, r - 4))
  if (opts?.depth != null) g.setDepth(opts.depth)
  return g
}

export function drawPokeBall(scene: Phaser.Scene, x: number, y: number, radius = 36) {
  const g = scene.add.graphics()
  g.fillStyle(Theme.white, 1)
  g.fillCircle(x, y, radius)
  g.fillStyle(Theme.red, 1)
  g.fillRect(x - radius, y - radius, radius * 2, radius + 1)
  g.lineStyle(4, Theme.ink, 1)
  g.strokeCircle(x, y, radius)
  g.lineBetween(x - radius, y, x + radius, y)
  g.fillStyle(Theme.white, 1)
  g.fillCircle(x, y, radius * 0.32)
  g.lineStyle(3, Theme.ink, 1)
  g.strokeCircle(x, y, radius * 0.32)
  g.fillStyle(Theme.ink, 1)
  g.fillCircle(x, y, radius * 0.12)
  return g
}

type BtnTone = 'red' | 'blue' | 'green' | 'gold' | 'ghost' | 'dark'

const BTN_COLORS: Record<BtnTone, { bg: number; text: string }> = {
  red: { bg: Theme.red, text: '#ffffff' },
  blue: { bg: Theme.blue, text: '#ffffff' },
  green: { bg: Theme.grassDark, text: '#ffffff' },
  gold: { bg: Theme.gold, text: '#1e2438' },
  ghost: { bg: Theme.panelDeep, text: '#1e2438' },
  dark: { bg: Theme.machine, text: '#ffffff' },
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts?: {
    tone?: BtnTone
    fontSize?: string
    padX?: number
    padY?: number
    onClick?: () => void
    width?: number
  },
): UiButton {
  const tone = opts?.tone ?? 'red'
  const colors = BTN_COLORS[tone]
  const padX = opts?.padX ?? 16
  const padY = opts?.padY ?? 10
  const fontSize = opts?.fontSize ?? '15px'

  const bg = scene.add.graphics()
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_TITLE,
      fontSize,
      color: colors.text,
    })
    .setOrigin(0.5)

  const tw = opts?.width ?? text.width + padX * 2
  const th = text.height + padY * 2
  const drawBg = (scale = 1) => {
    bg.clear()
    const w = tw * scale
    const h = th * scale
    bg.fillStyle(0x000000, 0.18)
    bg.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 10)
    bg.fillStyle(colors.bg, 1)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10)
    bg.lineStyle(2, Theme.white, tone === 'ghost' ? 0.2 : 0.45)
    bg.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 9)
  }
  drawBg()

  const hit = scene.add.zone(0, 0, tw, th).setInteractive({ useHandCursor: true })
  const container = scene.add.container(x, y, [bg, text, hit]) as UiButton
  container.setSize(tw, th)

  container.setLabel = (next: string) => {
    text.setText(next)
  }

  hit.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.05, duration: 90, ease: 'Back.easeOut' })
  })
  hit.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 90 })
  })
  hit.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scale: 0.96,
      duration: 60,
      yoyo: true,
      onComplete: () => opts?.onClick?.(),
    })
  })

  return container
}

export function makeBackButton(scene: Phaser.Scene, to = 'hub') {
  return makeButton(scene, 78, GAME_H - 28, 'Retour', {
    tone: 'red',
    fontSize: '14px',
    padX: 14,
    padY: 8,
    onClick: () => goScene(scene, to),
  })
}

export function titleText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts?: { size?: string; color?: string; origin?: number },
) {
  return scene.add
    .text(x, y, label, {
      fontFamily: FONT_TITLE,
      fontSize: opts?.size ?? '28px',
      color: opts?.color ?? hexCss(Theme.ink),
    })
    .setOrigin(opts?.origin ?? 0.5)
}

export function bodyText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts?: { size?: string; color?: string; origin?: number; align?: string; wrap?: number },
) {
  return scene.add
    .text(x, y, label, {
      fontFamily: FONT_UI,
      fontSize: opts?.size ?? '13px',
      color: opts?.color ?? hexCss(Theme.muted),
      align: opts?.align ?? 'left',
      wordWrap: opts?.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(opts?.origin ?? 0.5)
}

/** Badge de type coloré (Pokémon) */
export function typeBadge(scene: Phaser.Scene, x: number, y: number, typeName: string, color: number) {
  const label = scene.add
    .text(0, 0, typeName, {
      fontFamily: FONT_TITLE,
      fontSize: '11px',
      color: '#ffffff',
    })
    .setOrigin(0.5)
  const w = Math.max(52, label.width + 16)
  const g = scene.add.graphics()
  g.fillStyle(color, 1)
  g.fillRoundedRect(-w / 2, -11, w, 22, 8)
  g.lineStyle(1, Theme.white, 0.35)
  g.strokeRoundedRect(-w / 2, -11, w, 22, 8)
  return scene.add.container(x, y, [g, label])
}

export function itemTextureKey(id: InventoryKey | string): string {
  return `item-${id}`
}

export function itemSpriteUrl(apiName: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${apiName}.png`
}

export async function ensureTextures(
  scene: Phaser.Scene,
  entries: { key: string; url: string }[],
): Promise<void> {
  let queued = false
  for (const e of entries) {
    if (!scene.textures.exists(e.key)) {
      scene.load.image(e.key, e.url)
      queued = true
    }
  }
  if (!queued) return
  await new Promise<void>((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
    scene.load.start()
  })
}

export async function ensureItemIcons(scene: Phaser.Scene, keys: InventoryKey[] = Object.keys(ITEM_SPRITE) as InventoryKey[]) {
  await ensureTextures(
    scene,
    keys.map((k) => ({ key: itemTextureKey(k), url: itemSpriteUrl(ITEM_SPRITE[k]) })),
  )
}

export function walletBar(
  scene: Phaser.Scene,
  y: number,
  parts: string[],
  opts?: { color?: string },
) {
  return bodyText(scene, GAME_W / 2, y, parts.join('  ·  '), {
    size: '12px',
    color: opts?.color ?? hexCss(Theme.muted),
  })
}
