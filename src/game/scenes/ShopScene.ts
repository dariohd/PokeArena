import Phaser from 'phaser'
import { GAME_W } from '../config'
import { buyItem, loadSave, writeSave } from '../data/pokeapi'
import { SHOP_CATALOG, formatPokedollars, type InventoryKey } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawRoom,
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
    fadeIn(this, Theme.martBlue)
    drawRoom(this, 'mart')
    await ensureItemIcons(this)

    const save = loadSave()
    titleText(this, GAME_W / 2, 28, 'Poké Mart', { size: '26px', color: '#ffffff' })
    walletBar(
      this,
      54,
      [
        formatPokedollars(save.coins),
        `${save.inventory.pokeball} Ball`,
        `${save.inventory.rareCandy} Super Bonbon`,
      ],
      { color: '#e8f0f8' },
    )

    SHOP_CATALOG.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 50 + col * 460
      const y = 100 + row * 100
      const can = save.coins >= item.price
      const owned = save.inventory[item.id as InventoryKey] ?? 0

      drawPanel(this, x, y, 430, 86, {
        stroke: can ? Theme.blue : Theme.muted,
        radius: 12,
        fill: can ? Theme.panel : Theme.panelDeep,
      })

      const key = itemTextureKey(item.id)
      if (this.textures.exists(key)) {
        this.add.image(x + 44, y + 43, key).setScale(2.2)
      }

      this.add.text(x + 90, y + 14, item.label, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '16px',
        color: hexCss(can ? Theme.ink : Theme.muted),
      })
      bodyText(this, x + 90, y + 40, `${item.desc} · stock ${owned}`, {
        size: '12px',
        origin: 0,
        color: hexCss(Theme.muted),
      })
      bodyText(this, x + 90, y + 60, formatPokedollars(item.price), {
        size: '13px',
        origin: 0,
        color: hexCss(can ? Theme.blueDark : Theme.muted),
      })

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
        })
      }
    })

    makeBackButton(this)
  }
}
