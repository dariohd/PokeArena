import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { buyItem, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, SHOP_CATALOG, type MonSummary, type OwnedMon } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class HubScene extends Phaser.Scene {
  private rosterMons: MonSummary[] = []

  constructor() {
    super('hub')
  }

  async create() {
    this.cameras.main.fadeIn(280, 126, 200, 227)
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.grass, 1)
    g.fillRect(0, GAME_H - 70, GAME_W, 70)

    const save = loadSave()

    this.add
      .text(GAME_W / 2, 28, 'Centre Pokémon', {
        fontFamily: FONT_TITLE,
        fontSize: '28px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 58, `${save.coins} pièces · Gen ${save.unlockedGen} · record vague ${save.bestWave}`, {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#6a6a7a',
      })
      .setOrigin(0.5)

    const ids = [
      ...new Set(
        [...save.roster, ...save.team.map((t) => t.id), ...save.box.map((b) => b.id), save.starterId].filter(Boolean),
      ),
    ]
    this.rosterMons = ids.length ? await fetchMany(ids, { full: false }) : []
    for (const m of this.rosterMons) {
      if (!this.textures.exists(m.battleKey)) this.load.image(m.battleKey, m.battleUrl)
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
        this.load.start()
      })
    }

    this.drawTeam(save.team)
    this.drawShop(save.coins)
    this.drawNav()
  }

  drawTeam(team: OwnedMon[]) {
    this.add
      .text(40, 90, 'Équipe (clic = retirer)', {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#e03028',
      })

    team.forEach((slot, i) => {
      const mon = this.rosterMons.find((m) => m.id === slot.id)
      const x = 80 + i * 110
      const y = 165
      const bg = this.add.rectangle(x, y, 96, 110, Theme.panel).setStrokeStyle(3, mon?.color ?? Theme.blue)
      if (mon && this.textures.exists(mon.battleKey)) {
        this.add.image(x, y - 14, mon.battleKey).setScale(1.7)
      }
      this.add
        .text(x, y + 38, mon ? `${mon.nameFr}\nN.${slot.level}` : `#${slot.id}`, {
          fontFamily: FONT_UI,
          fontSize: '11px',
          color: '#2a2a3a',
          align: 'center',
        })
        .setOrigin(0.5)
      bg.setInteractive({ useHandCursor: true })
      bg.on('pointerdown', () => {
        if (team.length <= 1) return
        const save = loadSave()
        const removed = save.team.splice(i, 1)[0]
        save.box.push(removed)
        writeSave(save)
        this.scene.restart()
      })
    })

    this.add
      .text(40, 250, 'Boîte (clic = ajouter)', {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#6a6a7a',
      })

    const save = loadSave()
    save.box.slice(0, 10).forEach((slot, i) => {
      const mon = this.rosterMons.find((m) => m.id === slot.id)
      const x = 80 + (i % 8) * 100
      const y = 300 + Math.floor(i / 8) * 60
      const label = this.add
        .text(x, y, mon ? mon.nameFr : `#${slot.id}`, {
          fontFamily: FONT_UI,
          fontSize: '12px',
          color: '#2a2a3a',
          backgroundColor: '#fff8f0',
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      label.on('pointerdown', () => {
        const s = loadSave()
        if (s.team.length >= MAX_TEAM) return
        const idx = s.box.findIndex((b) => b.id === slot.id && b.level === slot.level)
        if (idx < 0) return
        const [m] = s.box.splice(idx, 1)
        s.team.push(m)
        writeSave(s)
        this.scene.restart()
      })
    })
  }

  drawShop(coins: number) {
    this.add
      .text(560, 90, 'Boutique', {
        fontFamily: FONT_TITLE,
        fontSize: '18px',
        color: '#58a038',
      })

    SHOP_CATALOG.forEach((item, i) => {
      const y = 130 + i * 40
      const can = coins >= item.price
      const row = this.add
        .text(560, y, `${item.label} · ${item.price}¢`, {
          fontFamily: FONT_UI,
          fontSize: '13px',
          color: can ? '#2a2a3a' : '#9a9aaa',
          backgroundColor: '#fff8f0',
          padding: { x: 8, y: 6 },
        })
        .setInteractive({ useHandCursor: can })
      if (can) {
        row.on('pointerdown', () => {
          const save = loadSave()
          const next = buyItem(save, item.id, item.price)
          if (!next) return
          writeSave(next)
          this.scene.restart()
        })
      }
    })
  }

  drawNav() {
    const mk = (x: number, label: string, color: string, scene: string) => {
      const t = this.add
        .text(x, 500, label, {
          fontFamily: FONT_TITLE,
          fontSize: '15px',
          color: '#ffffff',
          backgroundColor: color,
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      t.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 126, 200, 227)
        this.time.delayedCall(220, () => this.scene.start(scene))
      })
    }
    mk(180, 'Arène', '#e03028', 'arena')
    mk(360, 'Pokédex', '#3090e0', 'pokedex')
    mk(540, 'Menu', '#58a038', 'title')
    const mute = this.add
      .text(720, 500, loadSave().mute ? 'Son off' : 'Son on', {
        fontFamily: FONT_UI,
        fontSize: '14px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    mute.on('pointerdown', () => {
      const m = toggleMute()
      mute.setText(m ? 'Son off' : 'Son on')
    })
  }
}
