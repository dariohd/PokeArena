import Phaser from 'phaser'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { applyTrain, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { effectiveLevel, type OwnedMon } from '../data/types'
import { drawShell, sectionTitle } from '../layout'
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
    fadeIn(this, 0x07090e)
    await paintScene(this, BG.train, { dim: 0.45 })
    await ensureItemIcons(this, ['rareCandy'])
    const zone = drawShell(this, { title: 'Dojo', back: true, accent: Theme.gold })

    const save = loadSave()
    sectionTitle(this, zone.x, zone.y + 4, `${save.inventory.rareCandy} Super Bonbon`)
    if (this.textures.exists(itemTextureKey('rareCandy'))) {
      this.add.image(zone.x + 180, zone.y + 12, itemTextureKey('rareCandy')).setScale(1.2).setDepth(20)
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

    const cellW = 150
    const gap = 18
    const startX = zone.x + 28
    const startY = zone.y + 56

    pool.forEach((slot, i) => {
      const mon = byId.get(slot.mon.id)
      const col = i % 7
      const row = Math.floor(i / 7)
      const x = startX + col * (cellW + gap) + cellW / 2
      const y = startY + row * 180 + 70

      this.add.rectangle(x, y, cellW, 160, 0x000000, 0.4).setDepth(14)
      this.add.rectangle(x, y, cellW, 160).setStrokeStyle(2, mon?.color ?? Theme.gold).setDepth(14)
      if (mon && this.textures.exists(mon.homeKey)) {
        this.add.image(x, y - 28, mon.homeKey).setScale(0.22).setDepth(15)
      }
      bodyText(
        this,
        x,
        y + 40,
        `${mon?.nameFr ?? '#' + slot.mon.id}\nN.${effectiveLevel(slot.mon)} ${starsLabel(slot.mon.stars)}`,
        { size: '12px', color: '#ffffff', align: 'center' },
      ).setDepth(15)
      makeButton(this, x, y + 62, '+1', {
        tone: 'gold',
        fontSize: '13px',
        padX: 12,
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
