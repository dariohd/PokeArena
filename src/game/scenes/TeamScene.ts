import Phaser from 'phaser'
import { GAME_W } from '../config'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { MAX_TEAM, effectiveLevel } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawRoom,
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
    fadeIn(this, Theme.blueDark)
    drawRoom(this, 'pc')
    const save = loadSave()

    titleText(this, GAME_W / 2, 28, 'Équipe & boîte PC', { size: '24px', color: '#ffffff' })
    bodyText(this, GAME_W / 2, 54, 'Clic équipe = retirer · clic boîte = ajouter', {
      size: '12px',
      color: '#c8e0f0',
    })

    const ids = [...new Set([...save.team, ...save.box].map((t) => t.id))]
    const mons = ids.length ? await fetchMany(ids, { full: false }) : []
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.battleKey, url: m.battleUrl })),
    )
    const byId = new Map(mons.map((m) => [m.id, m]))

    bodyText(this, 48, 78, `Équipe (${save.team.length}/${MAX_TEAM})`, {
      size: '13px',
      color: hexCss(Theme.red),
      origin: 0,
    })

    save.team.forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = 70 + i * 150
      const y = 160
      drawPanel(this, x - 55, y - 60, 120, 130, {
        stroke: mon?.color ?? Theme.blue,
        radius: 12,
      })
      if (mon && this.textures.exists(mon.battleKey)) {
        this.add.image(x, y - 16, mon.battleKey).setScale(1.7)
      }
      bodyText(this, x, y + 40, `${mon?.nameFr ?? slot.id}\nN.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '11px',
        color: hexCss(Theme.ink),
        align: 'center',
      })
      const hit = this.add.zone(x, y, 120, 130).setInteractive({ useHandCursor: true })
      hit.on('pointerdown', () => {
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
      color: hexCss(Theme.blueDark),
      origin: 0,
    })

    save.box.slice(0, 12).forEach((slot, i) => {
      const mon = byId.get(slot.id)
      const x = 70 + (i % 6) * 145
      const y = 330 + Math.floor(i / 6) * 90
      drawPanel(this, x - 55, y - 40, 120, 78, {
        stroke: mon?.color ?? Theme.muted,
        radius: 10,
      })
      if (mon && this.textures.exists(mon.battleKey)) {
        this.add.image(x - 28, y, mon.battleKey).setScale(1.1)
      }
      bodyText(this, x + 18, y - 8, mon?.nameFr ?? `#${slot.id}`, {
        size: '11px',
        color: hexCss(Theme.ink),
        origin: 0.5,
      })
      bodyText(this, x + 18, y + 12, `N.${effectiveLevel(slot)} ${starsLabel(slot.stars)}`, {
        size: '10px',
        origin: 0.5,
      })
      const hit = this.add.zone(x, y, 120, 78).setInteractive({ useHandCursor: true })
      hit.on('pointerdown', () => {
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

    makeBackButton(this)
  }
}
