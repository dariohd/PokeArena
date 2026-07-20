import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { claimMission, loadSave, writeSave } from '../data/pokeapi'
import { MISSION_DEFS, formatPokedollars } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  create() {
    this.cameras.main.fadeIn(200, 126, 200, 227)
    const save = loadSave()
    this.drawBg()

    this.add
      .text(GAME_W / 2, 22, 'Centre Pokémon', {
        fontFamily: FONT_TITLE,
        fontSize: '26px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_W / 2,
        50,
        `${formatPokedollars(save.coins)} · ${save.inventory.pokeball} Ball · ${save.inventory.rareCandy} Super Bonbon · Région max ${save.unlockedGen}`,
        { fontFamily: FONT_UI, fontSize: '12px', color: '#6a6a7a' },
      )
      .setOrigin(0.5)

    const board = this.add.graphics()
    board.fillStyle(0xd4a574, 1)
    board.fillRoundedRect(40, 72, 560, 400, 12)
    board.lineStyle(4, 0xa87848, 1)
    board.strokeRoundedRect(40, 72, 560, 400, 12)

    this.add.text(60, 88, 'Tableau d’affichage', {
      fontFamily: FONT_TITLE,
      fontSize: '16px',
      color: '#5a3a20',
    })

    const posts: { title: string; sub: string; color: number; scene: string }[] = [
      { title: 'ARÈNE', sub: 'Combats · loot Balls & Bonbons', color: 0xe03028, scene: 'arena' },
      { title: 'BANNIÈRES', sub: 'x1 / x10 · pity 4★ à 50', color: 0x9b59d0, scene: 'gacha' },
      { title: 'DOJO', sub: 'Super Bonbon = +1 niveau', color: 0x58a038, scene: 'train' },
      { title: 'ÉQUIPE / PC', sub: 'Roster & boîte PC', color: 0x3090e0, scene: 'team' },
      { title: 'POKÉ MART', sub: 'Poké Ball · soins · Super Bonbons', color: 0xe09030, scene: 'shop' },
      { title: 'POKÉDEX', sub: 'Espèces vues', color: 0x3090a0, scene: 'pokedex' },
    ]

    posts.forEach((p, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 90 + col * 250
      const y = 140 + row * 100
      const note = this.add
        .rectangle(x, y, 220, 78, 0xfff8f0)
        .setStrokeStyle(3, p.color)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
      this.add.circle(x + 12, y + 12, 6, p.color)
      this.add.text(x + 28, y + 10, p.title, {
        fontFamily: FONT_TITLE,
        fontSize: '16px',
        color: '#2a2a3a',
      })
      this.add.text(x + 28, y + 38, p.sub, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: '#6a6a7a',
      })
      note.on('pointerover', () => note.setScale(1.02))
      note.on('pointerout', () => note.setScale(1))
      note.on('pointerdown', () => {
        this.cameras.main.fadeOut(140, 126, 200, 227)
        this.time.delayedCall(160, () => this.scene.start(p.scene))
      })
    })

    this.add.rectangle(760, 270, 280, 380, Theme.panel).setStrokeStyle(4, Theme.red)
    this.add
      .text(760, 100, 'Quêtes du jour', {
        fontFamily: FONT_TITLE,
        fontSize: '16px',
        color: '#e03028',
      })
      .setOrigin(0.5)

    save.missions.forEach((m, i) => {
      const def = MISSION_DEFS.find((d) => d.id === m.id)
      if (!def) return
      const y = 140 + i * 72
      const done = m.progress >= m.target
      this.add.text(640, y, def.title, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: '#2a2a3a',
        wordWrap: { width: 240 },
      })
      this.add.text(
        640,
        y + 22,
        `${m.progress}/${m.target} · +${formatPokedollars(def.rewardCoins)} +${def.rewardBalls} Ball +${def.rewardRareCandy} SB`,
        { fontFamily: FONT_UI, fontSize: '11px', color: '#6a6a7a' },
      )
      if (done && !m.claimed) {
        const btn = this.add
          .text(640, y + 40, 'Réclamer', {
            fontFamily: FONT_TITLE,
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#58a038',
            padding: { x: 8, y: 4 },
          })
          .setInteractive({ useHandCursor: true })
        btn.on('pointerdown', () => {
          const next = claimMission(loadSave(), m.id)
          if (!next) return
          writeSave(next)
          this.scene.restart()
        })
      } else if (m.claimed) {
        this.add.text(640, y + 40, 'OK', { fontFamily: FONT_UI, fontSize: '12px', color: '#58a038' })
      }
    })

    const auto = this.add
      .text(120, 510, save.autoMode ? 'Mode auto : ON' : 'Mode auto : OFF', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: save.autoMode ? '#58a038' : '#6a6a7a',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    auto.on('pointerdown', () => {
      const s = loadSave()
      s.autoMode = !s.autoMode
      writeSave(s)
      this.scene.restart()
    })

    this.add
      .text(320, 510, save.mute ? 'Son off' : 'Son on', {
        fontFamily: FONT_UI,
        fontSize: '14px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        toggleMute()
        this.scene.restart()
      })

    this.add
      .text(520, 510, 'Menu', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('title'))
  }

  drawBg() {
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.grass, 1)
    g.fillRect(0, GAME_H - 50, GAME_W, 50)
  }
}
