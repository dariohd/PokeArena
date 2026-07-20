import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { loadSave, resetProgress, writeSave } from '../data/pokeapi'
import { emptyInventory, defaultMissions, emptyPity, formatPokedollars } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  create() {
    const save = loadSave()
    this.cameras.main.fadeIn(350, 126, 200, 227)
    this.drawBackdrop()

    // Pokéball motif
    const cx = GAME_W / 2
    const cy = 95
    const ball = this.add.graphics()
    ball.fillStyle(Theme.red, 1)
    ball.fillCircle(cx, cy, 36)
    ball.fillStyle(Theme.white, 1)
    ball.fillCircle(cx, cy + 1, 36)
    ball.fillStyle(Theme.red, 1)
    ball.fillRect(cx - 36, cy - 36, 72, 37)
    ball.lineStyle(4, Theme.ink, 1)
    ball.strokeCircle(cx, cy, 36)
    ball.lineBetween(cx - 36, cy, cx + 36, cy)
    ball.fillStyle(Theme.white, 1)
    ball.fillCircle(cx, cy, 11)
    ball.lineStyle(3, Theme.ink, 1)
    ball.strokeCircle(cx, cy, 11)
    ball.fillStyle(Theme.ink, 1)
    ball.fillCircle(cx, cy, 4)

    this.add
      .text(GAME_W / 2, 160, 'PokeArena', {
        fontFamily: FONT_TITLE,
        fontSize: '52px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 210, 'Arène · Bannières · Dojo', {
        fontFamily: FONT_UI,
        fontSize: '16px',
        color: '#6a6a7a',
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_W / 2,
        265,
        'Invoque des Pokémon par région, combat en arène\net monte-les avec des Super Bonbons.',
        {
          fontFamily: FONT_UI,
          fontSize: '15px',
          color: '#2a2a3a',
          align: 'center',
          lineSpacing: 6,
        },
      )
      .setOrigin(0.5)

    const hasSave = Boolean(save.starterId && save.team.length)
    const cta = this.add
      .text(GAME_W / 2, 360, hasSave ? 'Continuer' : 'Nouvelle partie', {
        fontFamily: FONT_TITLE,
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    cta.on('pointerover', () => cta.setScale(1.05))
    cta.on('pointerout', () => cta.setScale(1))
    cta.on('pointerdown', () => {
      this.cameras.main.fadeOut(250, 126, 200, 227)
      this.time.delayedCall(260, () => {
        this.scene.start(hasSave ? 'hub' : 'onboard')
      })
    })

    this.add
      .text(
        GAME_W / 2,
        470,
        `${formatPokedollars(save.coins)}  ·  record vague ${save.bestWave}  ·  région ${save.unlockedGen}`,
        {
          fontFamily: FONT_UI,
          fontSize: '13px',
          color: '#6a6a7a',
        },
      )
      .setOrigin(0.5)

    if (hasSave) {
      const reset = this.add
        .text(GAME_W / 2, 410, 'Recommencer à zéro', {
          fontFamily: FONT_UI,
          fontSize: '14px',
          color: '#e03028',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      reset.on('pointerdown', () => {
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
      })
    }

    this.input.keyboard?.once('keydown-ENTER', () => cta.emit('pointerdown'))
    this.input.keyboard?.once('keydown-SPACE', () => cta.emit('pointerdown'))
  }

  drawBackdrop() {
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.grass, 1)
    g.fillRect(0, GAME_H - 120, GAME_W, 120)
    g.fillStyle(Theme.grassDark, 1)
    for (let x = 0; x < GAME_W; x += 28) {
      g.fillTriangle(x, GAME_H - 120, x + 14, GAME_H - 142, x + 28, GAME_H - 120)
    }
    g.fillStyle(Theme.panel, 0.9)
    g.fillRoundedRect(GAME_W / 2 - 280, 145, 560, 300, 18)
    g.lineStyle(4, Theme.red, 1)
    g.strokeRoundedRect(GAME_W / 2 - 280, 145, 560, 300, 18)
  }
}
