import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import type { ArenaResult } from '../data/types'
import { loadSave } from '../data/pokeapi'
import { formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton, titleText } from '../ui'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  async create(data: ArenaResult) {
    fadeIn(this, 0x0b0d12)
    await paintScene(this, data.won ? BG.resultWin : BG.resultLose, { dim: 0.42 })

    this.add.rectangle(GAME_W / 2, 270, 680, 400, 0x000000, 0.55).setDepth(10)

    const save = loadSave()
    titleText(this, GAME_W / 2, 95, data.won ? 'Victoire' : 'K.O.', {
      size: '40px',
      color: data.won ? '#7ac74f' : '#e3350d',
    }).setDepth(20)

    const lines = [
      `Vague · ${data.wave}`,
      `Pokédollars · ${formatPokedollars(data.coins)}`,
      `K.O. · ${data.kos}`,
      `Dégâts · ${data.damageDealt}`,
      `XP · ${data.xpGained}`,
      `Stock · ${save.inventory.pokeball} Ball · ${save.inventory.rareCandy} SB`,
      `Total · ${formatPokedollars(save.coins)} · record ${save.bestWave}`,
    ]
    lines.forEach((line, i) => {
      bodyText(this, GAME_W / 2, 150 + i * 30, line, {
        size: '15px',
        color: '#ffffff',
      }).setDepth(20)
    })

    makeButton(this, GAME_W / 2 - 140, 430, 'Rejouer', {
      tone: 'blue',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: () => goScene(this, 'arena'),
    }).setDepth(30)
    makeButton(this, GAME_W / 2, 430, 'Centre', {
      tone: 'green',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: () => goScene(this, 'hub'),
    }).setDepth(30)
    makeButton(this, GAME_W / 2 + 140, 430, 'Menu', {
      tone: 'red',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: () => goScene(this, 'title'),
    }).setDepth(30)
  }
}
