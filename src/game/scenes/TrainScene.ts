import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { applyTrain, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { effectiveLevel, type OwnedMon } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class TrainScene extends Phaser.Scene {
  constructor() {
    super('train')
  }

  async create() {
    this.cameras.main.fadeIn(160, 126, 200, 227)
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)

    const save = loadSave()
    this.add
      .text(GAME_W / 2, 28, 'Dojo · Super Bonbons', {
        fontFamily: FONT_TITLE,
        fontSize: '26px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 58, `${save.inventory.rareCandy} Super Bonbon · 1 bonbon = +1 niveau (évo. possible)`, {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#6a6a7a',
      })
      .setOrigin(0.5)

    const pool: { where: 'team' | 'box'; index: number; mon: OwnedMon }[] = [
      ...save.team.map((mon, index) => ({ where: 'team' as const, index, mon })),
      ...save.box.slice(0, 8).map((mon, index) => ({ where: 'box' as const, index, mon })),
    ]

    const ids = [...new Set(pool.map((p) => p.mon.id))]
    const details = ids.length ? await fetchMany(ids, { full: true }) : []
    for (const m of details) {
      if (!this.textures.exists(m.battleKey)) this.load.image(m.battleKey, m.battleUrl)
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
        this.load.start()
      })
    }

    pool.forEach((slot, i) => {
      const mon = details.find((d) => d.id === slot.mon.id)
      const x = 90 + (i % 6) * 140
      const y = 140 + Math.floor(i / 6) * 150
      this.add.rectangle(x, y, 120, 130, Theme.panel).setStrokeStyle(3, mon?.color ?? Theme.blue)
      if (mon && this.textures.exists(mon.battleKey)) {
        this.add.image(x, y - 20, mon.battleKey).setScale(1.5)
      }
      this.add
        .text(x, y + 28, `${mon?.nameFr ?? '#' + slot.mon.id}\nN.${effectiveLevel(slot.mon)}`, {
          fontFamily: FONT_UI,
          fontSize: '11px',
          color: '#2a2a3a',
          align: 'center',
        })
        .setOrigin(0.5)

      const btn = this.add
        .text(x, y + 52, '+1 niv.', {
          fontFamily: FONT_TITLE,
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#e09030',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
      btn.on('pointerdown', () => {
        const next = applyTrain(loadSave(), slot.where, slot.index, mon)
        if (!next) return
        writeSave(next)
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
