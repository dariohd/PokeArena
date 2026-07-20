import Phaser from 'phaser'
import { paintArtBackdrop, placeHeroArt } from '../backdrop'
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

    const heroId = save.team[0]?.id || save.starterId || 25
    const mon = await paintArtBackdrop(this, heroId, { dim: 0.5, zoom: 1.45, tint: 0xa8b0c0 })
    if (mon) placeHeroArt(this, mon.spriteKey, GAME_W * 0.7, GAME_H * 0.55, 0.52)

    this.add.rectangle(0, 0, GAME_W * 0.46, GAME_H, 0x000000, 0.35).setOrigin(0).setDepth(15)

    titleText(this, 40, 120, 'PokeArena', {
      size: '56px',
      color: '#ffffff',
      origin: 0,
    })
      .setDepth(20)
      .setStroke('#e3350d', 5)

    bodyText(this, 44, 180, 'Gacha · Arène · Évolution', {
      size: '16px',
      color: 'rgba(255,255,255,0.85)',
      origin: 0,
    }).setDepth(20)

    const hasSave = Boolean(save.starterId && save.team.length)
    makeButton(this, 150, 280, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '20px',
      padX: 28,
      padY: 12,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard', Theme.red),
    }).setDepth(30)

    if (hasSave) {
      makeButton(this, 150, 340, 'Recommencer', {
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
        44,
        400,
        `${formatPokedollars(save.coins)}  ·  vague ${save.bestWave}  ·  région ${save.unlockedGen}`,
        { size: '12px', color: 'rgba(255,255,255,0.7)', origin: 0 },
      ).setDepth(20)
    }

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }
}
