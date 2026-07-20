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
    fadeIn(this)
    const heroId = save.team[0]?.id || save.starterId || 6
    const hx = GAME_W * 0.72
    const hy = GAME_H * 0.52

    await paintScene(this, BG.title, {
      dim: 0.28,
      heroId,
      heroKind: 'home',
      heroX: hx,
      heroY: hy,
      heroScale: 0.5,
    })

    const veil = this.add.graphics().setDepth(12)
    veil.fillStyle(0x05070c, 0.55)
    veil.fillRect(0, 0, GAME_W * 0.44, GAME_H)

    titleText(this, 56, 180, 'PokeArena', {
      size: '40px',
      color: '#ffffff',
      origin: 0,
    })
      .setDepth(20)
      .setStroke('#e3350d', 4)

    bodyText(this, 56, 236, 'Gacha · Arène · Évolution', {
      size: '14px',
      color: 'rgba(255,255,255,0.8)',
      origin: 0,
    }).setDepth(20)

    const hasSave = Boolean(save.starterId && save.team.length)
    makeButton(this, 140, 310, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '16px',
      padX: 24,
      padY: 11,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard', Theme.red),
    }).setDepth(30)

    if (hasSave) {
      makeButton(this, 140, 370, 'Recommencer', {
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
        56,
        420,
        `${formatPokedollars(save.coins)} · vague ${save.bestWave} · gen ${save.unlockedGen}`,
        { size: '12px', origin: 0 },
      ).setDepth(20)
    }

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }
}
