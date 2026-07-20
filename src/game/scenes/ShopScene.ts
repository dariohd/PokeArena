import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { buyItem, loadSave, writeSave } from '../data/pokeapi'
import { SHOP_CATALOG, formatPokedollars } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('shop')
  }

  create() {
    this.cameras.main.fadeIn(160, 126, 200, 227)
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)

    const save = loadSave()
    this.add
      .text(GAME_W / 2, 32, 'Poké Mart', {
        fontFamily: FONT_TITLE,
        fontSize: '28px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)
    this.add
      .text(
        GAME_W / 2,
        64,
        `${formatPokedollars(save.coins)} · ${save.inventory.pokeball} Poké Ball · ${save.inventory.rareCandy} Super Bonbon`,
        { fontFamily: FONT_UI, fontSize: '13px', color: '#6a6a7a' },
      )
      .setOrigin(0.5)

    SHOP_CATALOG.forEach((item, i) => {
      const col = i < 5 ? 0 : 1
      const row = i < 5 ? i : i - 5
      const x = GAME_W / 2 - 220 + col * 440
      const y = 110 + row * 58
      const can = save.coins >= item.price
      const rowText = this.add
        .text(x, y, `${item.label}\n${formatPokedollars(item.price)} · ${item.desc}`, {
          fontFamily: FONT_UI,
          fontSize: '13px',
          color: can ? '#2a2a3a' : '#9a9aaa',
          backgroundColor: '#fff8f0',
          padding: { x: 12, y: 8 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: can })
      if (can) {
        rowText.on('pointerdown', () => {
          const next = buyItem(loadSave(), item.id, item.price)
          if (!next) return
          writeSave(next)
          this.scene.restart()
        })
      }
    })

    this.add
      .text(80, 500, 'Retour', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('hub'))
  }
}
