import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { buyItem, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, SHOP_CATALOG, type MonSummary, type OwnedMon } from '../data/types'

export class HubScene extends Phaser.Scene {
  private rosterMons: MonSummary[] = []

  constructor() {
    super('hub')
  }

  async create() {
    this.cameras.main.fadeIn(280, 7, 11, 18)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b12).setOrigin(0)
    const save = loadSave()

    this.add
      .text(GAME_W / 2, 36, 'CENTRE POKÉMON', {
        fontFamily: 'Bungee, cursive',
        fontSize: '30px',
        color: '#ffc14a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 68, `Pièces ${save.coins} · Gen ${save.unlockedGen} · Record vague ${save.bestWave}`, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    const ids = [...new Set([...save.roster, ...save.team.map((t) => t.id), ...save.box.map((b) => b.id), save.starterId].filter(Boolean))]
    this.rosterMons = ids.length ? await fetchMany(ids) : []
    for (const m of this.rosterMons) {
      if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.start()
      })
    }

    this.drawTeam(save.team)
    this.drawShop(save.coins)
    this.drawNav()
  }

  drawTeam(team: OwnedMon[]) {
    this.add
      .text(40, 100, 'ÉQUIPE (max 4) — clic pour retirer', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color: '#3cf0ff',
      })

    team.forEach((slot, i) => {
      const mon = this.rosterMons.find((m) => m.id === slot.id)
      const x = 70 + i * 110
      const y = 170
      const bg = this.add.rectangle(x, y, 96, 110, 0x101826).setStrokeStyle(2, mon?.color ?? 0x3cf0ff)
      if (mon && this.textures.exists(mon.spriteKey)) {
        this.add.image(x, y - 12, mon.spriteKey).setScale(0.18)
      }
      this.add
        .text(x, y + 36, mon ? `${mon.nameFr}\nN.${slot.level}` : `#${slot.id}`, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '11px',
          color: '#e8f2ff',
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

    // Box add
    this.add
      .text(40, 250, 'BOÎTE — clic pour ajouter à l’équipe', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color: '#8aa0b8',
      })

    const save = loadSave()
    const box = save.box.slice(0, 10)
    box.forEach((slot, i) => {
      const mon = this.rosterMons.find((m) => m.id === slot.id)
      const x = 70 + (i % 8) * 100
      const y = 310 + Math.floor(i / 8) * 70
      const label = this.add
        .text(x, y, mon ? mon.nameFr : `#${slot.id}`, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '12px',
          color: '#e8f2ff',
          backgroundColor: '#152033',
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
      .text(560, 100, 'BOUTIQUE', {
        fontFamily: 'Bungee, cursive',
        fontSize: '18px',
        color: '#56f0b0',
      })

    SHOP_CATALOG.forEach((item, i) => {
      const y = 140 + i * 42
      const can = coins >= item.price
      const row = this.add
        .text(560, y, `${item.label} · ${item.price}💰 — ${item.desc}`, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '13px',
          color: can ? '#e8f2ff' : '#5a6a7a',
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
          fontFamily: 'Bungee, cursive',
          fontSize: '16px',
          color: '#070b12',
          backgroundColor: color,
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      t.on('pointerdown', () => {
        this.cameras.main.fadeOut(200, 7, 11, 18)
        this.time.delayedCall(220, () => this.scene.start(scene))
      })
    }
    mk(180, 'ARÈNE', '#3cf0ff', 'arena')
    mk(360, 'POKÉDEX', '#ffc14a', 'pokedex')
    mk(540, 'MENU', '#ff4d7a', 'title')
    const mute = this.add
      .text(720, 500, loadSave().mute ? 'SON: OFF' : 'SON: ON', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '14px',
        color: '#e8f2ff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    mute.on('pointerdown', () => {
      const m = toggleMute()
      mute.setText(m ? 'SON: OFF' : 'SON: ON')
    })
  }
}
