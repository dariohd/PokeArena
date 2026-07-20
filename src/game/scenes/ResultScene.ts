import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import type { ArenaResult } from '../data/types'
import { loadSave } from '../data/pokeapi'
import { formatPokedollars } from '../data/types'
import { L, drawShell } from '../layout'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton, titleText } from '../ui'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  async create(data: ArenaResult) {
    fadeIn(this, 0x07090e)
    await paintScene(this, data.won ? BG.resultWin : BG.resultLose, { dim: 0.42 })
    drawShell(this, {
      title: 'Résultat',
      back: false,
      showWallet: true,
      accent: data.won ? 0x7ac74f : Theme.red,
    })

    const save = loadSave()
    titleText(this, GAME_W / 2, L.contentY + 48, data.won ? 'Victoire' : 'K.O.', {
      size: '32px',
      color: data.won ? '#7ac74f' : '#e3350d',
    }).setDepth(20)

    const lines = [
      `Vague ${data.wave} · ${formatPokedollars(data.coins)}`,
      `K.O. ${data.kos} · Dégâts ${data.damageDealt} · XP ${data.xpGained}`,
      `${save.inventory.pokeball} Ball · ${save.inventory.rareCandy} SB · record ${save.bestWave}`,
    ]
    lines.forEach((line, i) => {
      bodyText(this, GAME_W / 2, L.contentY + 120 + i * 32, line, {
        size: '15px',
        color: 'rgba(255,255,255,0.9)',
      }).setDepth(20)
    })

    makeButton(this, GAME_W / 2 - 140, L.dockY, 'Rejouer', {
      tone: 'blue',
      fontSize: '14px',
      padX: 16,
      padY: 9,
      onClick: () => goScene(this, 'arena'),
    }).setDepth(102)
    makeButton(this, GAME_W / 2, L.dockY, 'Centre', {
      tone: 'green',
      fontSize: '14px',
      padX: 16,
      padY: 9,
      onClick: () => goScene(this, 'hub'),
    }).setDepth(102)
    makeButton(this, GAME_W / 2 + 140, L.dockY, 'Menu', {
      tone: 'red',
      fontSize: '14px',
      padX: 16,
      padY: 9,
      onClick: () => goScene(this, 'title'),
    }).setDepth(102)
  }
}
