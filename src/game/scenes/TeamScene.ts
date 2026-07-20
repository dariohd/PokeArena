import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, effectiveLevel } from '../data/types'
import { drawShell, sectionTitle, slotFrame } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, starsLabel } from '../ui'

export class TeamScene extends Phaser.Scene {
  constructor() {
    super('team')
  }

  async create() {
    fadeIn(this)
    await paintScene(this, BG.team, { dim: 0.48 })
    const zone = drawShell(this, { title: 'Équipe & PC', back: true, accent: Theme.blue })

    const save = loadSave()
    const ids = [...new Set([...save.team, ...save.box].map((t) => t.id))]
    const mons = ids.length ? await fetchMany(ids, { full: false }) : []
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )
    const byId = new Map(mons.map((m) => [m.id, m]))

    sectionTitle(this, zone.x, zone.y + 4, `Équipe (${save.team.length}/${MAX_TEAM})`)

    save.team.forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 70 + i * 150
      const y = zone.y + 100
      slotFrame(this, x, y, 120, 120, mon?.color ?? Theme.blue)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 12, mon.homeKey).setScale(0.18).setDepth(15)
      }
      bodyText(this, x, y + 42, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '12px',
        color: '#ffffff',
        align: 'center',
      }).setDepth(15)
      this.add
        .zone(x, y, 120, 120)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (save.team.length <= 1) return
          const s = loadSave()
          const [removed] = s.team.splice(i, 1)
          s.box.push(removed)
          writeSave(s)
          this.scene.restart()
        })
    })

    sectionTitle(this, zone.x, zone.y + 190, 'Boîte PC')

    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 70 + (i % 6) * 150
      const y = zone.y + 270 + Math.floor(i / 6) * 88
      slotFrame(this, x, y, 120, 72, mon?.color ?? Theme.muted)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x - 34, y, mon.homeKey).setScale(0.12).setDepth(15)
      }
      bodyText(this, x + 18, y - 8, mon?.nameFr ?? `#${slot.id}`, {
        size: '12px',
        color: '#ffffff',
        origin: 0.5,
      }).setDepth(15)
      bodyText(this, x + 18, y + 14, `N.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '11px',
        origin: 0.5,
      }).setDepth(15)
      this.add
        .zone(x, y, 120, 72)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const s = loadSave()
          if (s.team.length >= MAX_TEAM) return
          const idx = s.box.findIndex(
            (b) => b.id === slot.id && b.level === slot.level && b.stars === slot.stars,
          )
          if (idx < 0) return
          const [m] = s.box.splice(idx, 1)
          s.team.push(m)
          writeSave(s)
          this.scene.restart()
        })
    })
  }
}
