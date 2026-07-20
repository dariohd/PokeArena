import Phaser from 'phaser'
import { GAME_W } from '../config'
import { loadSave, resetProgress, writeSave } from '../data/pokeapi'
import { emptyInventory, defaultMissions, emptyPity, formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawPokeBall,
  drawRoom,
  fadeIn,
  goScene,
  hexCss,
  makeButton,
  titleText,
  walletBar,
} from '../ui'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  create() {
    const save = loadSave()
    fadeIn(this)
    drawRoom(this, 'outdoor')

    const ball = drawPokeBall(this, GAME_W / 2, 88, 42)
    this.tweens.add({
      targets: ball,
      y: '+=8',
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    drawPanel(this, GAME_W / 2 - 300, 150, 600, 280, { radius: 18, stroke: Theme.red })

    titleText(this, GAME_W / 2, 188, 'PokeArena', { size: '54px', color: hexCss(Theme.red) })
    bodyText(this, GAME_W / 2, 238, 'Arène · Bannières · Dojo', { size: '16px' })
    bodyText(
      this,
      GAME_W / 2,
      278,
      'Invoque des Pokémon par région, combat en arène\net monte-les avec des Super Bonbons.',
      { size: '15px', color: hexCss(Theme.ink), align: 'center' },
    )

    const hasSave = Boolean(save.starterId && save.team.length)
    makeButton(this, GAME_W / 2, 360, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '22px',
      padX: 32,
      padY: 14,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard'),
    })

    walletBar(this, 470, [
      formatPokedollars(save.coins),
      `record vague ${save.bestWave}`,
      `région ${save.unlockedGen}`,
    ])

    if (hasSave) {
      makeButton(this, GAME_W / 2, 410, 'Recommencer à zéro', {
        tone: 'ghost',
        fontSize: '13px',
        padX: 14,
        padY: 8,
        onClick: () => {
          resetProgress()
          writeSave({
            version: 4,
            starterId: 0,
            roster: [],
            team: [],
            box: [],
            seen: [],
            coins: 3000,
            bestWave: 0,
            runs: 0,
            inventory: emptyInventory(),
            unlockedGen: 1,
            mute: save.mute,
            autoMode: false,
            gachaPityByBanner: emptyPity(),
            missions: defaultMissions(),
            lastMissionDay: new Date().toISOString().slice(0, 10),
          })
          this.scene.start('onboard')
        },
      })
    }

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }
}
