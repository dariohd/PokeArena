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

/** Fond de salle : aplats sobres (pas de décor inventé). */
export function drawRoom(scene: Phaser.Scene, kind: RoomKind, accent: number = Theme.red) {
  const g = scene.add.graphics()
  const fills: Record<RoomKind, number> = {
    outdoor: 0x1a2838,
    centre: 0x141018,
    mart: 0x102030,
    dojo: 0x201810,
    dex: 0x280c0c,
    machine: 0x12141c,
    pc: 0x0c1828,
    result: 0x121820,
  }
  g.fillStyle(fills[kind] ?? 0x101018, 1)
  g.fillRect(0, 0, GAME_W, GAME_H)
  g.fillStyle(accent, 0.12)
  g.fillRect(0, 0, GAME_W, 52)
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
  if (queued) {
    await new Promise<void>((resolve) => {
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
      scene.load.start()
    })
  }
  for (const e of entries) {
    if (scene.textures.exists(e.key)) {
      scene.textures.get(e.key).setFilter(Phaser.Textures.FilterMode.LINEAR)
    }
  }
}

/** Orbe menu sobre */
export function makeGlassOrb(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  accent: number,
  onClick: () => void,
) {
  const container = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.55)
  g.fillRoundedRect(-108, -22, 216, 44, 10)
  g.lineStyle(2, accent, 1)
  g.strokeRoundedRect(-108, -22, 216, 44, 10)
  g.fillStyle(accent, 1)
  g.fillCircle(-84, 0, 6)

  const text = scene.add
    .text(-66, 0, label, {
      fontFamily: FONT_TITLE,
      fontSize: '16px',
      color: '#ffffff',
    })
    .setOrigin(0, 0.5)

  container.add([g, text])
  container.setSize(216, 44)
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-108, -22, 216, 44),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  })
  container.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.04, duration: 80 })
  })
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 80 })
  })
  container.on('pointerdown', onClick)
  return container
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
