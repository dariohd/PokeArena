import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, effectiveLevel } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class TeamScene extends Phaser.Scene {
  constructor() {
    super('team')
  }

  async create() {
    this.cameras.main.fadeIn(220, 126, 200, 227)
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)

    const save = loadSave()
    this.add
      .text(GAME_W / 2, 28, 'Équipe & boîte', {
        fontFamily: FONT_TITLE,
        fontSize: '26px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    const ids = [...new Set([...save.team, ...save.box].map((t) => t.id))]
    const mons = ids.length ? await fetchMany(ids, { full: false }) : []
    for (const m of mons) {
      if (!this.textures.exists(m.battleKey)) this.load.image(m.battleKey, m.battleUrl)
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
        this.load.start()
      })
    }

    this.add.text(40, 70, 'Équipe (clic = retirer)', { fontFamily: FONT_UI, fontSize: '13px', color: '#e03028' })
    save.team.forEach((slot, i) => {
      const mon = mons.find((m) => m.id === slot.id)
      const x = 90 + i * 140
      const y = 150
      const bg = this.add.rectangle(x, y, 120, 120, Theme.panel).setStrokeStyle(3, mon?.color ?? Theme.blue)
      if (mon && this.textures.exists(mon.battleKey)) this.add.image(x, y - 16, mon.battleKey).setScale(1.6)
      this.add
        .text(x, y + 36, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ★${slot.stars}`, {
          fontFamily: FONT_UI,
          fontSize: '11px',
          color: '#2a2a3a',
          align: 'center',
        })
        .setOrigin(0.5)
      bg.setInteractive({ useHandCursor: true })
      bg.on('pointerdown', () => {
        if (save.team.length <= 1) return
        const s = loadSave()
        const [removed] = s.team.splice(i, 1)
        s.box.push(removed)
        writeSave(s)
        this.scene.restart()
      })
    })

    this.add.text(40, 260, 'Boîte (clic = ajouter)', { fontFamily: FONT_UI, fontSize: '13px', color: '#6a6a7a' })
    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = mons.find((m) => m.id === slot.id)
      const x = 90 + (i % 6) * 140
      const y = 340 + Math.floor(i / 6) * 70
      const t = this.add
        .text(x, y, `${mon?.nameFr ?? '#' + slot.id} N.${effectiveLevel(slot)}`, {
          fontFamily: FONT_UI,
          fontSize: '12px',
          color: '#2a2a3a',
          backgroundColor: '#fff8f0',
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      t.on('pointerdown', () => {
        const s = loadSave()
        if (s.team.length >= MAX_TEAM) return
        const idx = s.box.findIndex((b) => b.id === slot.id && b.level === slot.level && b.stars === slot.stars)
        if (idx < 0) return
        const [m] = s.box.splice(idx, 1)
        s.team.push(m)
        writeSave(s)
        this.scene.restart()
      })
    })

    this.add
      .text(80, 500, 'Retour', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('hub'))
  }
}
