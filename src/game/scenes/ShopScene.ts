import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { buyItem, loadSave, writeSave } from '../data/pokeapi'
import { SHOP_CATALOG, formatPokedollars, type InventoryKey } from '../data/types'
import { contentCard, drawShell, sectionTitle } from '../layout'
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
    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12, accent: Theme.blue })
    sectionTitle(this, zone.x + 20, zone.y + 16, 'Catalogue')
    const save = loadSave()
    const colW = (zone.w - 56) / 2

    SHOP_CATALOG.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = zone.x + 20 + col * (colW + 16)
      const y = zone.y + 52 + row * 88
      const can = save.coins >= item.price
      const owned = save.inventory[item.id as InventoryKey] ?? 0

      this.add.rectangle(x + colW / 2, y + 36, colW, 76, 0x000000, 0.35).setDepth(14)
      this.add
        .rectangle(x + colW / 2, y + 36, colW, 76)
        .setStrokeStyle(2, can ? Theme.blue : Theme.muted)
        .setDepth(14)

      const key = itemTextureKey(item.id)
      if (this.textures.exists(key)) {
        this.add.image(x + 36, y + 36, key).setScale(2.2).setDepth(15)
      }

      this.add
        .text(x + 64, y + 16, item.label, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '16px',
          color: can ? '#ffffff' : hexCss(Theme.muted),
        })
        .setDepth(15)
      bodyText(this, x + 64, y + 44, `${formatPokedollars(item.price)} · stock ${owned}`, {
        size: '13px',
        origin: 0,
        color: 'rgba(255,255,255,0.65)',
      }).setDepth(15)

      if (can) {
        makeButton(this, x + colW - 56, y + 36, 'OK', {
          tone: 'blue',
          fontSize: '13px',
          padX: 12,
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
