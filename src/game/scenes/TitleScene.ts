import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_H, GAME_W } from '../config'
import { contentCard } from '../layout'
import { loadSave, resetProgress, writeSave } from '../data/pokeapi'
import { emptyInventory, defaultMissions, emptyPity, formatPokedollars } from '../data/types'
import { heroGlowRing } from '../fx'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton, titleText } from '../ui'

/**
 * Splash d’accueil HD : brand dominante + héros HOME + CTA.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  async create() {
    const save = loadSave()
    fadeIn(this, 0x07090e)
    const heroId = save.team[0]?.id || save.starterId || 6
    const hx = GAME_W * 0.72
    const hy = GAME_H * 0.54

    await paintScene(this, BG.title, {
      dim: 0.26,
      heroId,
      heroKind: 'home',
      heroX: hx,
      heroY: hy,
      heroScale: 0.62,
    })
    heroGlowRing(this, hx, hy + 140, Theme.red)

    // Vignette gauche pour le brand
    const veil = this.add.graphics().setDepth(12)
    veil.fillStyle(0x05070c, 0.55)
    veil.fillRect(0, 0, GAME_W * 0.48, GAME_H)

    contentCard(this, 40, 100, 420, 420, { accent: Theme.red, depth: 15 })

    const brand = titleText(this, 64, 150, 'PokeArena', {
      size: '56px',
      color: '#ffffff',
      origin: 0,
    })
      .setDepth(20)
      .setStroke('#e3350d', 6)
      .setAlpha(0)
    this.tweens.add({
      targets: brand,
      alpha: 1,
      x: 72,
      duration: 420,
      ease: 'Cubic.easeOut',
    })

    bodyText(this, 72, 230, 'Gacha · Arène · Évolution', {
      size: '18px',
      color: 'rgba(255,255,255,0.88)',
      origin: 0,
    }).setDepth(20)

    bodyText(this, 72, 270, 'Invoque, combat, fais évoluer\nton équipe de champions.', {
      size: '15px',
      color: 'rgba(255,255,255,0.65)',
      origin: 0,
      align: 'left',
    }).setDepth(20)

    const hasSave = Boolean(save.starterId && save.team.length)
    const cta = makeButton(this, 250, 380, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '22px',
      padX: 32,
      padY: 14,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard', Theme.red),
    }).setDepth(30)
    cta.setAlpha(0)
    this.tweens.add({ targets: cta, alpha: 1, delay: 200, duration: 300 })
    this.tweens.add({
      targets: cta,
      scale: 1.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 500,
    })

    if (hasSave) {
      makeButton(this, 250, 460, 'Recommencer', {
        tone: 'dark',
        fontSize: '14px',
        padX: 16,
        padY: 10,
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
        72,
        510,
        `${formatPokedollars(save.coins)} · vague ${save.bestWave} · R${save.unlockedGen}`,
        { size: '14px', color: 'rgba(255,255,255,0.7)', origin: 0 },
      ).setDepth(20)
    }

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }
}
