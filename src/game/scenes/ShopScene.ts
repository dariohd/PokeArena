import Phaser from 'phaser'
import { paintArtBackdrop } from '../backdrop'
import { GAME_W } from '../config'
import { buyItem, loadSave, writeSave } from '../data/pokeapi'
import { SHOP_CATALOG, formatPokedollars, type InventoryKey } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  ensureItemIcons,
  fadeIn,
  hexCss,
  itemTextureKey,
  makeBackButton,
  makeButton,
  titleText,
  walletBar,
} from '../ui'

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('shop')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    await paintArtBackdrop(this, 52, { dim: 0.62, zoom: 1.25, tint: 0x9098a8 })
    await ensureItemIcons(this)

    const save = loadSave()
    titleText(this, GAME_W / 2, 28, 'Poké Mart', { size: '26px', color: '#ffffff' }).setDepth(20)
    walletBar(
      this,
      54,
      [
        formatPokedollars(save.coins),
        `${save.inventory.pokeball} Ball`,
        `${save.inventory.rareCandy} Super Bonbon`,
      ],
      { color: 'rgba(255,255,255,0.8)' },
    ).setDepth(20)

    SHOP_CATALOG.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 50 + col * 460
      const y = 100 + row * 100
      const can = save.coins >= item.price
      const owned = save.inventory[item.id as InventoryKey] ?? 0

      this.add.rectangle(x + 215, y + 43, 430, 86, 0x000000, 0.55).setDepth(12)
      this.add
        .rectangle(x + 215, y + 43, 430, 86)
        .setStrokeStyle(2, can ? Theme.blue : Theme.muted)
        .setDepth(12)

      const key = itemTextureKey(item.id)
      if (this.textures.exists(key)) {
        this.add.image(x + 44, y + 43, key).setScale(2.2).setDepth(13)
      }

      this.add
        .text(x + 90, y + 14, item.label, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '16px',
          color: hexCss(can ? Theme.white : Theme.muted),
        })
        .setDepth(13)
      bodyText(this, x + 90, y + 40, `${item.desc} · stock ${owned}`, {
        size: '12px',
        origin: 0,
        color: 'rgba(255,255,255,0.6)',
      }).setDepth(13)
      bodyText(this, x + 90, y + 60, formatPokedollars(item.price), {
        size: '13px',
        origin: 0,
        color: hexCss(can ? Theme.gold : Theme.muted),
      }).setDepth(13)

      if (can) {
        makeButton(this, x + 360, y + 43, 'Acheter', {
          tone: 'blue',
          fontSize: '13px',
          padX: 12,
          padY: 7,
          onClick: () => {
            const next = buyItem(loadSave(), item.id, item.price)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        }).setDepth(14)
      }
    })

    makeBackButton(this).setDepth(30)
  }
}
