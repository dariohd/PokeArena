import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import type { ArenaResult } from '../data/types'
import { loadSave } from '../data/pokeapi'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(data: ArenaResult) {
    this.cameras.main.fadeIn(300, 7, 11, 18)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b12).setOrigin(0)

    const save = loadSave()
    const title = data.won ? 'ARÈNE DOMINÉE' : 'K.O.'
    const color = data.won ? '#56f0b0' : '#ff4d7a'

    this.add
      .text(GAME_W / 2, 90, title, {
        fontFamily: 'Bungee, cursive',
        fontSize: '42px',
        color,
        stroke: '#070b12',
        strokeThickness: 8,
      })
      .setOrigin(0.5)

    const lines = [
      `Vague atteinte · ${data.wave}`,
      `Pièces gagnées · ${data.coins}`,
      `Dégâts infligés · ${data.damageDealt}`,
      `Recrutés · ${data.recruited.length ? data.recruited.map((m) => m.name).join(', ') : 'aucun'}`,
      `Coffre total · ${save.coins} pièces · record vague ${save.bestWave}`,
    ]

    lines.forEach((line, i) => {
      this.add
        .text(GAME_W / 2, 170 + i * 34, line, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '16px',
          color: '#e8f2ff',
        })
        .setOrigin(0.5)
    })

    const again = this.add
      .text(GAME_W / 2 - 110, 420, 'REJOUER', {
        fontFamily: 'Bungee, cursive',
        fontSize: '20px',
        color: '#070b12',
        backgroundColor: '#3cf0ff',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const menu = this.add
      .text(GAME_W / 2 + 110, 420, 'MENU', {
        fontFamily: 'Bungee, cursive',
        fontSize: '20px',
        color: '#070b12',
        backgroundColor: '#ffc14a',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    again.on('pointerdown', () => this.scene.start('arena'))
    menu.on('pointerdown', () => this.scene.start('title'))
  }
}
