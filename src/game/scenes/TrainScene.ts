import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { applyTrain, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { effectiveLevel, type OwnedMon } from '../data/types'
import { drawShell, sectionTitle, slotFrame } from '../layout'
import { Theme } from '../theme'
import {
  bodyText,
  ensureItemIcons,
  ensureTextures,
  fadeIn,
  itemTextureKey,
  makeButton,
  starsLabel,
} from '../ui'

export class TrainScene extends Phaser.Scene {
  constructor() {
    super('train')
  }

  async create() {
    fadeIn(this)
    await paintScene(this, BG.train, { dim: 0.45 })
    await ensureItemIcons(this, ['rareCandy'])
    const zone = drawShell(this, { title: 'Dojo', back: true, accent: Theme.gold })

    const save = loadSave()
    sectionTitle(this, zone.x, zone.y + 4, 'Entraînement')
    bodyText(this, zone.x + 120, zone.y + 6, `${save.inventory.rareCandy} super bonbons`, {
      size: '12px',
      origin: 0,
    }).setDepth(20)
    if (this.textures.exists(itemTextureKey('rareCandy'))) {
      this.add.image(zone.x + 280, zone.y + 12, itemTextureKey('rareCandy')).setScale(1.2).setDepth(20)
    }

    const pool: { where: 'team' | 'box'; index: number; mon: OwnedMon }[] = [
      ...save.team.map((mon, index) => ({ where: 'team' as const, index, mon })),
      ...save.box.slice(0, 8).map((mon, index) => ({ where: 'box' as const, index, mon })),
    ]

    const ids = [...new Set(pool.map((p) => p.mon.id))]
    const details = ids.length ? await fetchMany(ids, { full: true }) : []
    await ensureTextures(
      this,
      details.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )
    const byId = new Map(details.map((m) => [m.id, m]))

    const cellW = 130
    const gap = 16
    const startX = zone.x + 20
    const startY = zone.y + 48

    pool.forEach((slot, i) => {
      const mon = byId.get(slot.mon.id)
      const col = i % 7
      const row = Math.floor(i / 7)
      const x = startX + col * (cellW + gap) + cellW / 2
      const y = startY + row * 170 + 70

      slotFrame(this, x, y, cellW, 150, mon?.color ?? Theme.gold)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 28, mon.homeKey).setScale(0.18).setDepth(15)
      }
      bodyText(
        this,
        x,
        y + 36,
        `${mon?.nameFr ?? '#' + slot.mon.id}\nN.${effectiveLevel(slot.mon)} ${starsLabel(slot.mon.stars)}`,
        { size: '12px', color: '#ffffff', align: 'center' },
      ).setDepth(15)
      makeButton(this, x, y + 58, '+1 niv.', {
        tone: 'gold',
        fontSize: '12px',
        padX: 10,
        padY: 5,
        onClick: () => {
          const next = applyTrain(loadSave(), slot.where, slot.index, mon)
          if (!next) return
          writeSave(next)
          this.scene.restart()
        },
      }).setDepth(16)
    })
  }
}
