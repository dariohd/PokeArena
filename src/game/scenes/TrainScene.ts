import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { applyTrain, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { effectiveLevel, type OwnedMon } from '../data/types'
import { contentCard, drawShell, sectionTitle } from '../layout'
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
    fadeIn(this, 0x0b0d12)
    await paintScene(this, BG.train, { dim: 0.45 })
    await ensureItemIcons(this, ['rareCandy'])
    const zone = drawShell(this, { title: 'Dojo', back: true })
    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12 })

    const save = loadSave()
    sectionTitle(this, zone.x + 16, zone.y + 14, `${save.inventory.rareCandy} Super Bonbon`)
    if (this.textures.exists(itemTextureKey('rareCandy'))) {
      this.add.image(zone.x + 200, zone.y + 22, itemTextureKey('rareCandy')).setScale(1.4).setDepth(20)
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

    const cellW = 120
    const gap = 14
    const startX = zone.x + 24
    const startY = zone.y + 50

    pool.forEach((slot, i) => {
      const mon = byId.get(slot.mon.id)
      const col = i % 6
      const row = Math.floor(i / 6)
      const x = startX + col * (cellW + gap) + cellW / 2
      const y = startY + row * 150 + 60

      this.add.rectangle(x, y, cellW, 130, 0x000000, 0.4).setDepth(14)
      this.add.rectangle(x, y, cellW, 130).setStrokeStyle(2, mon?.color ?? Theme.gold).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 22, mon.homeKey).setScale(0.16).setDepth(15)
      }
      bodyText(
        this,
        x,
        y + 32,
        `${mon?.nameFr ?? '#' + slot.mon.id}\nN.${effectiveLevel(slot.mon)} ${starsLabel(slot.mon.stars)}`,
        { size: '11px', color: '#ffffff', align: 'center' },
      ).setDepth(15)
      makeButton(this, x, y + 52, '+1', {
        tone: 'gold',
        fontSize: '12px',
        padX: 10,
        padY: 4,
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
