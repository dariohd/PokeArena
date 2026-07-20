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
    fadeIn(this, 0x07090e)
    await paintScene(this, BG.team, { dim: 0.48 })
    const zone = drawShell(this, { title: 'Équipe & PC', back: true, accent: Theme.blue })
    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12, accent: Theme.blue })

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
      const x = zone.x + 90 + i * 180
      const y = zone.y + 130
      this.add.rectangle(x, y, 150, 150, 0x000000, 0.4).setDepth(14)
      this.add.rectangle(x, y, 150, 150).setStrokeStyle(2, mon?.color ?? Theme.blue).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 18, mon.homeKey).setScale(0.24).setDepth(15)
      }
      bodyText(this, x, y + 52, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '13px',
        color: '#ffffff',
        align: 'center',
      }).setDepth(15)
      this.add
        .zone(x, y, 150, 150)
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

    sectionTitle(this, zone.x + 16, zone.y + 240, 'Boîte PC')
    bodyText(this, zone.x + 130, zone.y + 242, 'Clic = ajouter', {
      size: '12px',
      color: 'rgba(255,255,255,0.5)',
      origin: 0,
    }).setDepth(20)

    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = zone.x + 90 + (i % 6) * 180
      const y = zone.y + 330 + Math.floor(i / 6) * 100
      this.add.rectangle(x, y, 150, 86, 0x000000, 0.4).setDepth(14)
      this.add.rectangle(x, y, 150, 86).setStrokeStyle(1, mon?.color ?? Theme.muted).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x - 40, y, mon.homeKey).setScale(0.14).setDepth(15)
      }
      bodyText(this, x + 22, y - 10, mon?.nameFr ?? `#${slot.id}`, {
        size: '12px',
        color: '#ffffff',
        origin: 0.5,
      }).setDepth(15)
      bodyText(this, x + 22, y + 14, `N.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '11px',
        color: 'rgba(255,255,255,0.65)',
        origin: 0.5,
      }).setDepth(15)
      this.add
        .zone(x, y, 150, 86)
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
