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
      .text(GAME_W / 2, 80, title, {
        fontFamily: 'Bungee, cursive',
        fontSize: '40px',
        color,
        stroke: '#070b12',
        strokeThickness: 8,
      })
      .setOrigin(0.5)

    const lines = [
      `Vague atteinte · ${data.wave}`,
      `Pièces gagnées · ${data.coins}`,
      `Dégâts infligés · ${data.damageDealt}`,
      `XP gagnée · ${data.xpGained}`,
      `Capturés · ${data.captured.length ? data.captured.map((m) => m.nameFr).join(', ') : 'aucun'}`,
      `Coffre · ${save.coins} pièces · record vague ${save.bestWave} · Gen ${save.unlockedGen}`,
    ]

    lines.forEach((line, i) => {
      this.add
        .text(GAME_W / 2, 150 + i * 32, line, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '15px',
          color: '#e8f2ff',
        })
        .setOrigin(0.5)
    })

    const again = this.add
      .text(GAME_W / 2 - 130, 430, 'REJOUER', {
        fontFamily: 'Bungee, cursive',
        fontSize: '18px',
        color: '#070b12',
        backgroundColor: '#3cf0ff',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const hub = this.add
      .text(GAME_W / 2 + 20, 430, 'CENTRE', {
        fontFamily: 'Bungee, cursive',
        fontSize: '18px',
        color: '#070b12',
        backgroundColor: '#56f0b0',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const menu = this.add
      .text(GAME_W / 2 + 160, 430, 'MENU', {
        fontFamily: 'Bungee, cursive',
        fontSize: '18px',
        color: '#070b12',
        backgroundColor: '#ffc14a',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    again.on('pointerdown', () => this.scene.start('arena'))
    hub.on('pointerdown', () => this.scene.start('hub'))
    menu.on('pointerdown', () => this.scene.start('title'))
  }
}
