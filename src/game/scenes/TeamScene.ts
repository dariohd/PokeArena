import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, effectiveLevel } from '../data/types'
import { drawShell, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, starsLabel } from '../ui'

export class TeamScene extends Phaser.Scene {
  constructor() {
    super('team')
  }

  async create() {
    fadeIn(this, 0x07090e)
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
    bodyText(this, zone.x + 160, zone.y + 6, 'Clic = retirer', {
      size: '11px',
      color: 'rgba(255,255,255,0.45)',
      origin: 0,
    }).setDepth(20)

    save.team.forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 70 + i * 160
      const y = zone.y + 100
      this.add.rectangle(x, y, 130, 130, 0x000000, 0.28).setDepth(14)
      this.add.rectangle(x, y, 130, 130).setStrokeStyle(1.5, mon?.color ?? Theme.blue).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 14, mon.homeKey).setScale(0.2).setDepth(15)
      }
      bodyText(this, x, y + 46, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '12px',
        color: '#ffffff',
        align: 'center',
      }).setDepth(15)
      this.add
        .zone(x, y, 130, 130)
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

    sectionTitle(this, zone.x, zone.y + 200, 'Boîte PC')
    bodyText(this, zone.x + 100, zone.y + 202, 'Clic = ajouter', {
      size: '11px',
      color: 'rgba(255,255,255,0.45)',
      origin: 0,
    }).setDepth(20)

    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 70 + (i % 6) * 160
      const y = zone.y + 280 + Math.floor(i / 6) * 90
      this.add.rectangle(x, y, 130, 76, 0x000000, 0.28).setDepth(14)
      this.add.rectangle(x, y, 130, 76).setStrokeStyle(1, mon?.color ?? Theme.muted).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x - 36, y, mon.homeKey).setScale(0.12).setDepth(15)
      }
      bodyText(this, x + 18, y - 8, mon?.nameFr ?? `#${slot.id}`, {
        size: '12px',
        color: '#ffffff',
        origin: 0.5,
      }).setDepth(15)
      bodyText(this, x + 18, y + 14, `N.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '11px',
        color: 'rgba(255,255,255,0.6)',
        origin: 0.5,
      }).setDepth(15)
      this.add
        .zone(x, y, 130, 76)
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
