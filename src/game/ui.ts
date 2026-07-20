import Phaser from 'phaser'
import { playSfx } from './audio'
import { ITEM_SPRITE, type InventoryKey } from './data/types'
import { FONT_TITLE, FONT_UI, Theme } from './theme'

export type UiButton = Phaser.GameObjects.Container & {
  setLabel: (label: string) => void
}

export function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

export function starsLabel(n: number): string {
  return `${Math.max(0, Math.min(4, n))}★`
}

export function fadeIn(scene: Phaser.Scene, color: number = Theme.fade) {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  scene.cameras.main.fadeIn(220, r, g, b)
}

export function goScene(scene: Phaser.Scene, key: string, color: number = Theme.fade) {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  scene.cameras.main.fadeOut(160, r, g, b)
  scene.time.delayedCall(170, () => scene.scene.start(key))
}

export function drawPokeBall(scene: Phaser.Scene, x: number, y: number, radius = 36) {
  const g = scene.add.graphics()
  g.fillStyle(Theme.white, 1)
  g.fillCircle(x, y, radius)
  g.fillStyle(Theme.red, 1)
  g.fillRect(x - radius, y - radius, radius * 2, radius + 1)
  g.lineStyle(3, Theme.ink, 1)
  g.strokeCircle(x, y, radius)
  g.lineBetween(x - radius, y, x + radius, y)
  g.fillStyle(Theme.white, 1)
  g.fillCircle(x, y, radius * 0.32)
  g.lineStyle(2, Theme.ink, 1)
  g.strokeCircle(x, y, radius * 0.32)
  g.fillStyle(Theme.ink, 1)
  g.fillCircle(x, y, radius * 0.12)
  return g
}

type BtnTone = 'red' | 'blue' | 'green' | 'gold' | 'dark'

const BTN_COLORS: Record<BtnTone, { bg: number; text: string }> = {
  red: { bg: Theme.red, text: '#ffffff' },
  blue: { bg: Theme.blue, text: '#ffffff' },
  green: { bg: Theme.grassDark, text: '#ffffff' },
  gold: { bg: Theme.gold, text: '#1e2438' },
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
  const fontSize = opts?.fontSize ?? '14px'

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
  const drawBg = () => {
    bg.clear()
    bg.fillStyle(0x000000, 0.2)
    bg.fillRoundedRect(-tw / 2, -th / 2 + 2, tw, th, 8)
    bg.fillStyle(colors.bg, 1)
    bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 8)
    bg.lineStyle(1.5, Theme.white, 0.35)
    bg.strokeRoundedRect(-tw / 2 + 1, -th / 2 + 1, tw - 2, th - 2, 7)
  }
  drawBg()

  const hit = scene.add.zone(0, 0, tw, th).setInteractive({ useHandCursor: true })
  const container = scene.add.container(x, y, [bg, text, hit]) as UiButton
  container.setSize(tw, th)
  container.setLabel = (next: string) => text.setText(next)

  hit.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.04, duration: 70 })
  })
  hit.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 70 })
  })
  hit.on('pointerdown', () => {
    playSfx('click')
    scene.tweens.add({
      targets: container,
      scale: 0.96,
      duration: 50,
      yoyo: true,
      onComplete: () => opts?.onClick?.(),
    })
  })

  return container
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
      color: opts?.color ?? '#ffffff',
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
      color: opts?.color ?? 'rgba(255,255,255,0.7)',
      align: opts?.align ?? 'left',
      wordWrap: opts?.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(opts?.origin ?? 0.5)
}

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
  g.fillRoundedRect(-w / 2, -11, w, 22, 6)
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

export async function ensureItemIcons(
  scene: Phaser.Scene,
  keys: InventoryKey[] = Object.keys(ITEM_SPRITE) as InventoryKey[],
) {
  await ensureTextures(
    scene,
    keys.map((k) => ({ key: itemTextureKey(k), url: itemSpriteUrl(ITEM_SPRITE[k]) })),
  )
}

export function makeDockIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: {
    label: string
    accent: number
    onClick: () => void
    iconKey?: string
    drawIcon?: (g: Phaser.GameObjects.Graphics) => void
  },
) {
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.55)
  g.fillCircle(0, -6, 18)
  g.lineStyle(2, opts.accent, 0.95)
  g.strokeCircle(0, -6, 18)

  const kids: Phaser.GameObjects.GameObject[] = [g]

  if (opts.iconKey && scene.textures.exists(opts.iconKey)) {
    kids.push(scene.add.image(0, -6, opts.iconKey).setScale(1.1))
  } else if (opts.drawIcon) {
    const ig = scene.add.graphics()
    opts.drawIcon(ig)
    kids.push(ig)
  } else {
    g.fillStyle(opts.accent, 1)
    g.fillCircle(0, -6, 5)
  }

  kids.push(
    scene.add
      .text(0, 18, opts.label, {
        fontFamily: FONT_UI,
        fontSize: '10px',
        color: 'rgba(255,255,255,0.75)',
      })
      .setOrigin(0.5),
  )

  const c = scene.add.container(x, y, kids)
  c.setSize(44, 48)
  c.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-22, -26, 44, 48),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  })
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.08, duration: 70 }))
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 70 }))
  c.on('pointerdown', () => {
    playSfx('click')
    opts.onClick()
  })
  return c
}
