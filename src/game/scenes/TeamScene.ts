import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, effectiveLevel } from '../data/types'
import { contentCard, drawShell, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, starsLabel } from '../ui'

export class TeamScene extends Phaser.Scene {
  constructor() {
    super('team')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    await paintScene(this, BG.team, { dim: 0.48 })
    const zone = drawShell(this, { title: 'Équipe & PC', back: true })
    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12 })

    const save = loadSave()
    const ids = [...new Set([...save.team, ...save.box].map((t) => t.id))]
    const mons = ids.length ? await fetchMany(ids, { full: false }) : []
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )
    const byId = new Map(mons.map((m) => [m.id, m]))

    sectionTitle(this, zone.x + 16, zone.y + 14, `Équipe (${save.team.length}/${MAX_TEAM})`)
    bodyText(this, zone.x + 200, zone.y + 16, 'Clic = retirer', {
      size: '11px',
      color: 'rgba(255,255,255,0.5)',
      origin: 0,
    }).setDepth(20)

    save.team.forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 70 + i * 140
      const y = zone.y + 110
      this.add.rectangle(x, y, 120, 120, 0x000000, 0.4).setDepth(14)
      this.add.rectangle(x, y, 120, 120).setStrokeStyle(2, mon?.color ?? Theme.blue).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 14, mon.homeKey).setScale(0.18).setDepth(15)
      }
      bodyText(this, x, y + 40, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '11px',
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

    sectionTitle(this, zone.x + 16, zone.y + 200, 'Boîte PC')
    bodyText(this, zone.x + 120, zone.y + 202, 'Clic = ajouter', {
      size: '11px',
      color: 'rgba(255,255,255,0.5)',
      origin: 0,
    }).setDepth(20)

    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 70 + (i % 6) * 140
      const y = zone.y + 270 + Math.floor(i / 6) * 80
      this.add.rectangle(x, y, 120, 70, 0x000000, 0.4).setDepth(14)
      this.add.rectangle(x, y, 120, 70).setStrokeStyle(1, mon?.color ?? Theme.muted).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x - 30, y, mon.homeKey).setScale(0.11).setDepth(15)
      }
      bodyText(this, x + 16, y - 8, mon?.nameFr ?? `#${slot.id}`, {
        size: '11px',
        color: '#ffffff',
        origin: 0.5,
      }).setDepth(15)
      bodyText(this, x + 16, y + 12, `N.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '10px',
        color: 'rgba(255,255,255,0.65)',
        origin: 0.5,
      }).setDepth(15)
      this.add
        .zone(x, y, 120, 70)
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
