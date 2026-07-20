import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import type { ArenaResult } from '../data/types'
import { loadSave } from '../data/pokeapi'
import { formatPokedollars } from '../data/types'
import { L, contentCard, drawShell } from '../layout'
import { bodyText, fadeIn, goScene, makeButton, titleText } from '../ui'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  async create(data: ArenaResult) {
    fadeIn(this, 0x0b0d12)
    await paintScene(this, data.won ? BG.resultWin : BG.resultLose, { dim: 0.4 })
    drawShell(this, { title: 'Résultat', back: false, showWallet: true })

    contentCard(this, GAME_W / 2 - 280, L.contentY + 10, 560, L.contentH - 20, {
      accent: data.won ? 0x7ac74f : 0xe3350d,
      depth: 12,
    })

    const save = loadSave()
    titleText(this, GAME_W / 2, L.contentY + 50, data.won ? 'Victoire' : 'K.O.', {
      size: '36px',
      color: data.won ? '#7ac74f' : '#e3350d',
    }).setDepth(20)

    const lines = [
      `Vague · ${data.wave}`,
      `Gain · ${formatPokedollars(data.coins)}`,
      `K.O. · ${data.kos} · Dégâts · ${data.damageDealt}`,
      `XP · ${data.xpGained}`,
      `Stock · ${save.inventory.pokeball} Ball · ${save.inventory.rareCandy} SB`,
      `Total · ${formatPokedollars(save.coins)} · record ${save.bestWave}`,
    ]
    lines.forEach((line, i) => {
      bodyText(this, GAME_W / 2, L.contentY + 110 + i * 28, line, {
        size: '14px',
        color: '#ffffff',
      }).setDepth(20)
    })

    makeButton(this, GAME_W / 2 - 140, L.dockY, 'Rejouer', {
      tone: 'blue',
      fontSize: '15px',
      padX: 16,
      padY: 8,
      onClick: () => goScene(this, 'arena'),
    }).setDepth(102)
    makeButton(this, GAME_W / 2, L.dockY, 'Centre', {
      tone: 'green',
      fontSize: '15px',
      padX: 16,
      padY: 8,
      onClick: () => goScene(this, 'hub'),
    }).setDepth(102)
    makeButton(this, GAME_W / 2 + 140, L.dockY, 'Menu', {
      tone: 'red',
      fontSize: '15px',
      padX: 16,
      padY: 8,
      onClick: () => goScene(this, 'title'),
    }).setDepth(102)
  }
}
