import Phaser from 'phaser'
import { paintArtBackdrop } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, effectiveLevel } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  ensureTextures,
  fadeIn,
  hexCss,
  makeBackButton,
  starsLabel,
  titleText,
} from '../ui'

export class TeamScene extends Phaser.Scene {
  constructor() {
    super('team')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    await paintArtBackdrop(this, 137, { dim: 0.65, zoom: 1.2, tint: 0x888898 })
    const save = loadSave()

    titleText(this, GAME_W / 2, 28, 'Équipe & PC', { size: '24px', color: '#ffffff' }).setDepth(20)
    bodyText(this, GAME_W / 2, 54, 'Clic équipe = retirer · clic boîte = ajouter', {
      size: '12px',
      color: 'rgba(255,255,255,0.65)',
    }).setDepth(20)

    const ids = [...new Set([...save.team, ...save.box].map((t) => t.id))]
    const mons = ids.length ? await fetchMany(ids, { full: false }) : []
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.spriteKey, url: m.spriteUrl })),
    )
    const byId = new Map(mons.map((m) => [m.id, m]))

    bodyText(this, 48, 78, `Équipe (${save.team.length}/${MAX_TEAM})`, {
      size: '13px',
      color: hexCss(Theme.red),
      origin: 0,
    }).setDepth(20)

    save.team.forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = 70 + i * 150
      const y = 160
      this.add.rectangle(x, y, 120, 130, 0x000000, 0.55).setDepth(12)
      this.add.rectangle(x, y, 120, 130).setStrokeStyle(2, mon?.color ?? Theme.blue).setDepth(12)
      if (mon && this.textures.exists(mon.spriteKey)) {
        this.add.image(x, y - 16, mon.spriteKey).setScale(0.16).setDepth(13)
      }
      bodyText(this, x, y + 42, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '11px',
        color: '#ffffff',
        align: 'center',
      }).setDepth(13)
      this.add
        .zone(x, y, 120, 130)
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

    bodyText(this, 48, 250, 'Boîte PC', {
      size: '13px',
      color: 'rgba(255,255,255,0.75)',
      origin: 0,
    }).setDepth(20)

    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = 70 + (i % 6) * 145
      const y = 330 + Math.floor(i / 6) * 90
      this.add.rectangle(x, y, 120, 78, 0x000000, 0.5).setDepth(12)
      if (mon && this.textures.exists(mon.spriteKey)) {
        this.add.image(x - 28, y, mon.spriteKey).setScale(0.1).setDepth(13)
      }
      bodyText(this, x + 18, y - 8, mon?.nameFr ?? `#${slot.id}`, {
        size: '11px',
        color: '#ffffff',
        origin: 0.5,
      }).setDepth(13)
      bodyText(this, x + 18, y + 12, `N.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '10px',
        origin: 0.5,
        color: 'rgba(255,255,255,0.65)',
      }).setDepth(13)
      this.add
        .zone(x, y, 120, 78)
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

    makeBackButton(this).setDepth(30)
  }
}
