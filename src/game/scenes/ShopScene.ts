import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { buyItem, loadSave, writeSave } from '../data/pokeapi'
import { SHOP_CATALOG, formatPokedollars, type InventoryKey } from '../data/types'
import { drawShell, sectionTitle } from '../layout'
import { Theme } from '../theme'
import {
  bodyText,
  ensureItemIcons,
  fadeIn,
  hexCss,
  itemTextureKey,
  makeButton,
} from '../ui'

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('shop')
  }

  async create() {
    fadeIn(this, 0x07090e)
    await paintScene(this, BG.shop, { dim: 0.42 })
    await ensureItemIcons(this)
    const zone = drawShell(this, { title: 'Poké Mart', back: true, accent: Theme.blue })
    sectionTitle(this, zone.x, zone.y + 4, 'Catalogue')
    const save = loadSave()
    const colW = (zone.w - 40) / 2

    SHOP_CATALOG.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = zone.x + col * (colW + 16)
      const y = zone.y + 36 + row * 78
      const can = save.coins >= item.price
      const owned = save.inventory[item.id as InventoryKey] ?? 0

      this.add.rectangle(x + colW / 2, y + 32, colW, 68, 0x000000, 0.28).setDepth(14)
      this.add
        .rectangle(x + colW / 2, y + 32, colW, 68)
        .setStrokeStyle(1.5, can ? Theme.blue : Theme.muted)
        .setDepth(14)

      const key = itemTextureKey(item.id)
      if (this.textures.exists(key)) {
        this.add.image(x + 32, y + 32, key).setScale(1.8).setDepth(15)
      }

      this.add
        .text(x + 56, y + 14, item.label, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '14px',
          color: can ? '#ffffff' : hexCss(Theme.muted),
        })
        .setDepth(15)
      bodyText(this, x + 56, y + 40, `${formatPokedollars(item.price)} · stock ${owned}`, {
        size: '12px',
        origin: 0,
        color: 'rgba(255,255,255,0.6)',
      }).setDepth(15)

      if (can) {
        makeButton(this, x + colW - 48, y + 32, 'OK', {
          tone: 'blue',
          fontSize: '12px',
          padX: 10,
          padY: 5,
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
