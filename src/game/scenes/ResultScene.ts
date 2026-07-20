import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import type { ArenaResult } from '../data/types'
import { loadSave } from '../data/pokeapi'
import { formatPokedollars } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(data: ArenaResult) {
    this.cameras.main.fadeIn(120, 126, 200, 227)
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.panel, 1)
    g.fillRoundedRect(140, 60, 680, 400, 16)
    g.lineStyle(4, data.won ? Theme.grassDark : Theme.red, 1)
    g.strokeRoundedRect(140, 60, 680, 400, 16)

    const save = loadSave()
    const title = data.won ? 'Victoire !' : 'K.O…'
    const color = data.won ? '#58a038' : '#e03028'

    this.add
      .text(GAME_W / 2, 95, title, {
        fontFamily: FONT_TITLE,
        fontSize: '40px',
        color,
      })
      .setOrigin(0.5)

    const lines = [
      `Vague · ${data.wave}`,
      `Pokédollars · ${formatPokedollars(data.coins)}`,
      `K.O. · ${data.kos}`,
      `Dégâts · ${data.damageDealt}`,
      `XP · ${data.xpGained}`,
      `Stock · ${save.inventory.pokeball} Poké Ball · ${save.inventory.rareCandy} Super Bonbon`,
      `Total · ${formatPokedollars(save.coins)} · record ${save.bestWave}`,
    ]

    lines.forEach((line, i) => {
      this.add
        .text(GAME_W / 2, 155 + i * 30, line, {
          fontFamily: FONT_UI,
          fontSize: '15px',
          color: '#2a2a3a',
        })
        .setOrigin(0.5)
    })

    const mk = (x: number, label: string, bg: string, scene: string) => {
      const t = this.add
        .text(x, 430, label, {
          fontFamily: FONT_TITLE,
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: bg,
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      t.on('pointerdown', () => this.scene.start(scene))
    }
    mk(GAME_W / 2 - 140, 'Rejouer', '#3090e0', 'arena')
    mk(GAME_W / 2, 'Centre', '#58a038', 'hub')
    mk(GAME_W / 2 + 140, 'Menu', '#e03028', 'title')
  }
}
