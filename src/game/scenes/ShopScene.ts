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
    fadeIn(this, 0x0b0d12)
    await paintScene(this, BG.shop, { dim: 0.42 })
    await ensureItemIcons(this)
    const zone = drawShell(this, { title: 'Poké Mart', back: true })
    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12 })
    sectionTitle(this, zone.x + 16, zone.y + 14, 'Catalogue')

    const save = loadSave()
    const colW = (zone.w - 48) / 2

    SHOP_CATALOG.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = zone.x + 16 + col * (colW + 16)
      const y = zone.y + 44 + row * 70
      const can = save.coins >= item.price
      const owned = save.inventory[item.id as InventoryKey] ?? 0

      this.add.rectangle(x + colW / 2, y + 30, colW, 62, 0x000000, 0.35).setDepth(14)
      this.add
        .rectangle(x + colW / 2, y + 30, colW, 62)
        .setStrokeStyle(2, can ? Theme.blue : Theme.muted)
        .setDepth(14)

      const key = itemTextureKey(item.id)
      if (this.textures.exists(key)) {
        this.add.image(x + 28, y + 30, key).setScale(1.8).setDepth(15)
      }

      this.add
        .text(x + 52, y + 14, item.label, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '14px',
          color: can ? '#ffffff' : hexCss(Theme.muted),
        })
        .setDepth(15)
      bodyText(this, x + 52, y + 36, `${formatPokedollars(item.price)} · stock ${owned}`, {
        size: '11px',
        origin: 0,
        color: 'rgba(255,255,255,0.65)',
      }).setDepth(15)

      if (can) {
        makeButton(this, x + colW - 50, y + 30, 'OK', {
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
