import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { claimMission, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MISSION_DEFS, formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawRoom,
  ensureTextures,
  fadeIn,
  goScene,
  hexCss,
  makeButton,
  titleText,
  walletBar,
} from '../ui'

const NAV = [
  { title: 'ARÈNE', sub: 'Combats · loot Balls & Bonbons', accent: Theme.red, scene: 'arena', mascot: 25 },
  { title: 'BANNIÈRES', sub: 'x1 / x10 · pity 4★ à 50', accent: Theme.gold, scene: 'gacha', mascot: 150 },
  { title: 'DOJO', sub: 'Super Bonbon = +1 niveau', accent: Theme.grassDark, scene: 'train', mascot: 68 },
  { title: 'ÉQUIPE / PC', sub: 'Roster & boîte PC', accent: Theme.blue, scene: 'team', mascot: 133 },
  { title: 'POKÉ MART', sub: 'Balls · soins · Bonbons', accent: 0xe09030, scene: 'shop', mascot: 143 },
  { title: 'POKÉDEX', sub: 'Espèces vues', accent: 0x3090a0, scene: 'pokedex', mascot: 151 },
] as const

export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this, Theme.pink)
    drawRoom(this, 'centre')
    const save = loadSave()

    titleText(this, GAME_W / 2, 28, 'Centre Pokémon', { size: '24px', color: '#ffffff' })
    walletBar(
      this,
      52,
      [
        formatPokedollars(save.coins),
        `${save.inventory.pokeball} Ball`,
        `${save.inventory.rareCandy} Super Bonbon`,
        `Région ${save.unlockedGen}`,
      ],
      { color: '#5a3040' },
    )

    const mascotIds = [...new Set(NAV.map((n) => n.mascot))]
    const mons = await fetchMany(mascotIds, { full: false })
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.battleKey, url: m.battleUrl })),
    )
    const byId = new Map(mons.map((m) => [m.id, m]))

    drawPanel(this, 28, 70, 580, 390, { stroke: Theme.red, radius: 16 })
    this.add.text(48, 86, 'Tableau d’affichage', {
      fontFamily: '"Fredoka", "Nunito", sans-serif',
      fontSize: '15px',
      color: hexCss(Theme.red),
    })

    NAV.forEach((p, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 55 + col * 270
      const y = 125 + row * 105
      const note = this.add.container(x, y)
      const bg = this.add.graphics()
      bg.fillStyle(Theme.panel, 1)
      bg.fillRoundedRect(0, 0, 250, 88, 12)
      bg.lineStyle(3, p.accent, 1)
      bg.strokeRoundedRect(0, 0, 250, 88, 12)
      const mon = byId.get(p.mascot)
      const img =
        mon && this.textures.exists(mon.battleKey)
          ? this.add.image(42, 44, mon.battleKey).setScale(1.35)
          : this.add.circle(42, 44, 18, p.accent)
      const title = this.add.text(80, 16, p.title, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '16px',
        color: hexCss(Theme.ink),
      })
      const sub = this.add.text(80, 44, p.sub, {
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontSize: '11px',
        color: hexCss(Theme.muted),
        wordWrap: { width: 155 },
      })
      note.add([bg, img, title, sub])
      note.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, 250, 88),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      })
      note.on('pointerover', () => this.tweens.add({ targets: note, scale: 1.04, duration: 80 }))
      note.on('pointerout', () => this.tweens.add({ targets: note, scale: 1, duration: 80 }))
      note.on('pointerdown', () => goScene(this, p.scene, p.accent))
    })

    drawPanel(this, 630, 70, 300, 390, { stroke: Theme.blue, radius: 16 })
    titleText(this, 780, 92, 'Quêtes du jour', { size: '16px', color: hexCss(Theme.blue) })

    save.missions.forEach((m, i) => {
      const def = MISSION_DEFS.find((d) => d.id === m.id)
      if (!def) return
      const y = 130 + i * 78
      bodyText(this, 650, y, def.title, {
        size: '12px',
        color: hexCss(Theme.ink),
        origin: 0,
        wrap: 260,
      })
      bodyText(
        this,
        650,
        y + 24,
        `${m.progress}/${m.target} · +${formatPokedollars(def.rewardCoins)} +${def.rewardBalls} Ball`,
        { size: '11px', origin: 0 },
      )
      const done = m.progress >= m.target
      if (done && !m.claimed) {
        makeButton(this, 780, y + 52, 'Réclamer', {
          tone: 'green',
          fontSize: '12px',
          padX: 10,
          padY: 5,
          onClick: () => {
            const next = claimMission(loadSave(), m.id)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        })
      } else if (m.claimed) {
        bodyText(this, 780, y + 52, 'OK', { size: '12px', color: hexCss(Theme.grassDark) })
      }
    })

    makeButton(this, 120, GAME_H - 28, save.autoMode ? 'Auto ON' : 'Auto OFF', {
      tone: save.autoMode ? 'green' : 'ghost',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => {
        const s = loadSave()
        s.autoMode = !s.autoMode
        writeSave(s)
        this.scene.restart()
      },
    })

    makeButton(this, 280, GAME_H - 28, save.mute ? 'Son off' : 'Son on', {
      tone: 'ghost',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    })

    makeButton(this, 430, GAME_H - 28, 'Menu', {
      tone: 'red',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => goScene(this, 'title'),
    })
  }
}
