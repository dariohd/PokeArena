import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { buyItem, loadSave, writeSave } from '../data/pokeapi'
import { SHOP_CATALOG, formatPokedollars, type InventoryKey } from '../data/types'
import { drawShell, slotFrame } from '../layout'
import { FONT_TITLE, Theme } from '../theme'
import { bodyText, ensureItemIcons, fadeIn, itemTextureKey, makeButton } from '../ui'

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('shop')
  }

  async create() {
    fadeIn(this)
    await paintScene(this, BG.shop, { dim: 0.42 })
    await ensureItemIcons(this)
    const zone = drawShell(this, { title: 'Poké Mart', back: true, accent: Theme.blue })
    const save = loadSave()
    const colW = (zone.w - 24) / 2

    SHOP_CATALOG.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = zone.x + col * (colW + 12) + colW / 2
      const cy = zone.y + 42 + row * 72
      const can = save.coins >= item.price
      const owned = save.inventory[item.id as InventoryKey] ?? 0

      slotFrame(this, cx, cy, colW, 60, can ? Theme.blue : Theme.muted)

      const key = itemTextureKey(item.id)
      if (this.textures.exists(key)) {
        this.add.image(cx - colW / 2 + 28, cy, key).setScale(1.6).setDepth(15)
      }

      this.add
        .text(cx - colW / 2 + 52, cy - 10, item.label, {
          fontFamily: FONT_TITLE,
          fontSize: '14px',
          color: can ? '#ffffff' : 'rgba(255,255,255,0.45)',
        })
        .setDepth(15)

      bodyText(this, cx - colW / 2 + 52, cy + 12, `${formatPokedollars(item.price)} · stock ${owned}`, {
        size: '12px',
        origin: 0,
      }).setDepth(15)

      if (can) {
        makeButton(this, cx + colW / 2 - 48, cy, 'Acheter', {
          tone: 'blue',
          fontSize: '12px',
          padX: 10,
          padY: 6,
          onClick: () => {
            const next = buyItem(loadSave(), item.id, item.price)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        }).setDepth(16)
      }
    })
  }
}
