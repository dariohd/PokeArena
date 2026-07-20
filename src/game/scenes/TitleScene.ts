import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_H, GAME_W } from '../config'
import { L, contentCard, drawShell } from '../layout'
import { loadSave, resetProgress, writeSave } from '../data/pokeapi'
import { emptyInventory, defaultMissions, emptyPity, formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton, titleText } from '../ui'

/**
 * Splash d’accueil : une composition (brand + CTA + héros).
 * Pas de shell hub ici.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  async create() {
    const save = loadSave()
    fadeIn(this, 0x0b0d12)
    const heroId = save.team[0]?.id || save.starterId || 6
    await paintScene(this, BG.title, {
      dim: 0.22,
      heroId,
      heroKind: 'home',
      heroX: GAME_W * 0.7,
      heroY: GAME_H * 0.52,
      heroScale: 0.5,
    })

    // Panneau brand gauche
    contentCard(this, 24, 80, 360, 340, { accent: Theme.red, depth: 15 })

    titleText(this, 44, 120, 'PokeArena', {
      size: '42px',
      color: '#ffffff',
      origin: 0,
    })
      .setDepth(20)
      .setStroke('#e3350d', 4)

    bodyText(this, 44, 175, 'Gacha · Arène · Évolution', {
      size: '15px',
      color: 'rgba(255,255,255,0.85)',
      origin: 0,
    }).setDepth(20)

    bodyText(this, 44, 210, 'Invoque, combat, fais évoluer\nton équipe.', {
      size: '13px',
      color: 'rgba(255,255,255,0.65)',
      origin: 0,
      align: 'left',
    }).setDepth(20)

    const hasSave = Boolean(save.starterId && save.team.length)
    makeButton(this, 204, 300, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '18px',
      padX: 24,
      padY: 12,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard', Theme.red),
    }).setDepth(30)

    if (hasSave) {
      makeButton(this, 204, 360, 'Recommencer', {
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
        `${formatPokedollars(save.coins)} · vague ${save.bestWave} · R${save.unlockedGen}`,
        { size: '12px', color: 'rgba(255,255,255,0.7)', origin: 0 },
      ).setDepth(20)
    }

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }
}
