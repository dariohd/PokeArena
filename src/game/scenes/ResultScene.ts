import Phaser from 'phaser'
import { GAME_W } from '../config'
import type { ArenaResult } from '../data/types'
import { loadSave } from '../data/pokeapi'
import { formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawRoom,
  fadeIn,
  goScene,
  hexCss,
  makeButton,
  titleText,
} from '../ui'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(data: ArenaResult) {
    fadeIn(this)
    drawRoom(this, 'result')
    drawPanel(this, 140, 55, 680, 410, {
      stroke: data.won ? Theme.grassDark : Theme.red,
      radius: 18,
    })

    const save = loadSave()
    const title = data.won ? 'Victoire !' : 'K.O…'
    const color = data.won ? hexCss(Theme.grassDark) : hexCss(Theme.red)

    titleText(this, GAME_W / 2, 95, title, { size: '40px', color })

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
      bodyText(this, GAME_W / 2, 150 + i * 30, line, {
        size: '15px',
        color: hexCss(Theme.ink),
      })
    })

    makeButton(this, GAME_W / 2 - 140, 430, 'Rejouer', {
      tone: 'blue',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: () => goScene(this, 'arena'),
    })
    makeButton(this, GAME_W / 2, 430, 'Centre', {
      tone: 'green',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: () => goScene(this, 'hub'),
    })
    makeButton(this, GAME_W / 2 + 140, 430, 'Menu', {
      tone: 'red',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: () => goScene(this, 'title'),
    })
  }
}
