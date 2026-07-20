import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { loadSave } from '../data/pokeapi'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  create() {
    const save = loadSave()
    this.cameras.main.fadeIn(400, 7, 11, 18)
    this.drawBackdrop()

    this.add
      .text(GAME_W / 2, 120, 'POKEARENA', {
        fontFamily: 'Bungee, cursive',
        fontSize: '64px',
        color: '#3cf0ff',
        stroke: '#070b12',
        strokeThickness: 8,
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 178, 'FIGURINES  ·  2.5D  ·  POKÉAPI', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '15px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_W / 2,
        250,
        'Survive les vagues, recrute tes vaincus,\ndomine l’arène avec des stats live PokéAPI.',
        {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '16px',
          color: '#e8f2ff',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)

    const cta = this.add
      .text(GAME_W / 2, 360, save.starterId ? 'CONTINUER' : 'JOUER', {
        fontFamily: 'Bungee, cursive',
        fontSize: '28px',
        color: '#070b12',
        backgroundColor: '#ffc14a',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    cta.on('pointerover', () => cta.setScale(1.06))
    cta.on('pointerout', () => cta.setScale(1))
    cta.on('pointerdown', () => {
      this.cameras.main.fadeOut(250, 7, 11, 18)
      this.time.delayedCall(260, () => {
        this.scene.start(save.starterId ? 'arena' : 'select')
      })
    })

    this.add
      .text(
        GAME_W / 2,
        470,
        `Pièces ${save.coins}   ·   Record vague ${save.bestWave}   ·   Runs ${save.runs}`,
        {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '13px',
          color: '#8aa0b8',
        },
      )
      .setOrigin(0.5)

    if (save.starterId) {
      const reset = this.add
        .text(GAME_W / 2, 420, 'Nouvelle partie', {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '14px',
          color: '#ff4d7a',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      reset.on('pointerdown', () => {
        this.scene.start('select')
      })
    }

    this.input.keyboard?.once('keydown-ENTER', () => cta.emit('pointerdown'))
    this.input.keyboard?.once('keydown-SPACE', () => cta.emit('pointerdown'))
  }

  drawBackdrop() {
    const g = this.add.graphics()
    g.fillStyle(0x0a1220, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)

    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, GAME_W)
      const y = Phaser.Math.Between(0, GAME_H)
      g.fillStyle(0x3cf0ff, Phaser.Math.FloatBetween(0.04, 0.14))
      g.fillCircle(x, y, Phaser.Math.Between(1, 3))
    }

    g.lineStyle(2, 0x3cf0ff, 0.15)
    g.strokeEllipse(GAME_W / 2, GAME_H / 2 + 40, 620, 220)
    g.lineStyle(2, 0xffc14a, 0.12)
    g.strokeEllipse(GAME_W / 2, GAME_H / 2 + 40, 520, 170)
  }
}
