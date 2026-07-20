import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_H, GAME_W } from '../config'
import { loadSave, resetProgress, writeSave } from '../data/pokeapi'
import { emptyInventory, defaultMissions, emptyPity, formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton, titleText } from '../ui'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  async create() {
    const save = loadSave()
    fadeIn(this, 0x0b0d12)
    const heroId = save.team[0]?.id || save.starterId || 6
    await paintScene(this, BG.title, {
      dim: 0.28,
      heroId,
      heroKind: 'home',
      heroX: GAME_W * 0.72,
      heroY: GAME_H * 0.55,
      heroScale: 0.48,
    })

    this.add.rectangle(0, 0, GAME_W * 0.42, GAME_H, 0x000000, 0.4).setOrigin(0).setDepth(15)

    titleText(this, 36, 110, 'PokeArena', {
      size: '56px',
      color: '#ffffff',
      origin: 0,
    })
      .setDepth(20)
      .setStroke('#e3350d', 5)

    bodyText(this, 40, 170, 'Gacha · Arène · Évolution', {
      size: '16px',
      color: 'rgba(255,255,255,0.9)',
      origin: 0,
    }).setDepth(20)

    const hasSave = Boolean(save.starterId && save.team.length)
    makeButton(this, 140, 270, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '20px',
      padX: 28,
      padY: 12,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard', Theme.red),
    }).setDepth(30)

    if (hasSave) {
      makeButton(this, 140, 330, 'Recommencer', {
        tone: 'dark',
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
      }).setDepth(30)

      bodyText(
        this,
        40,
        400,
        `${formatPokedollars(save.coins)}  ·  vague ${save.bestWave}  ·  région ${save.unlockedGen}`,
        { size: '12px', color: 'rgba(255,255,255,0.75)', origin: 0 },
      ).setDepth(20)
    }

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }
}
