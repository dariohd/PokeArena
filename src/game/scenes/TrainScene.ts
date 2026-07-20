import Phaser from 'phaser'
import { paintArtBackdrop } from '../backdrop'
import { GAME_W } from '../config'
import { applyTrain, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { effectiveLevel, type OwnedMon } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  ensureItemIcons,
  ensureTextures,
  fadeIn,
  hexCss,
  itemTextureKey,
  makeBackButton,
  makeButton,
  starsLabel,
  titleText,
  walletBar,
} from '../ui'

export class TrainScene extends Phaser.Scene {
  constructor() {
    super('train')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    await paintArtBackdrop(this, 68, { dim: 0.62, zoom: 1.2, tint: 0x909090 })
    await ensureItemIcons(this, ['rareCandy'])

    const save = loadSave()
    titleText(this, GAME_W / 2, 28, 'Dojo', { size: '26px', color: '#ffffff' }).setDepth(20)
    if (this.textures.exists(itemTextureKey('rareCandy'))) {
      this.add.image(GAME_W / 2 - 90, 54, itemTextureKey('rareCandy')).setScale(1.8).setDepth(20)
    }
    walletBar(this, 54, [`${save.inventory.rareCandy} Super Bonbon`], {
      color: 'rgba(255,255,255,0.8)',
    }).setDepth(20)

    const pool: { where: 'team' | 'box'; index: number; mon: OwnedMon }[] = [
      ...save.team.map((mon, index) => ({ where: 'team' as const, index, mon })),
      ...save.box.slice(0, 8).map((mon, index) => ({ where: 'box' as const, index, mon })),
    ]

    const ids = [...new Set(pool.map((p) => p.mon.id))]
    const details = ids.length ? await fetchMany(ids, { full: true }) : []
    await ensureTextures(
      this,
      details.map((m) => ({ key: m.spriteKey, url: m.spriteUrl })),
    )
    const byId = new Map(details.map((m) => [m.id, m]))

    pool.forEach((slot, i) => {
      const mon = byId.get(slot.mon.id)
      const x = 80 + (i % 6) * 145
      const y = 150 + Math.floor(i / 6) * 155
      this.add.rectangle(x, y, 120, 140, 0x000000, 0.55).setDepth(12)
      this.add.rectangle(x, y, 120, 140).setStrokeStyle(2, mon?.color ?? Theme.gold).setDepth(12)
      if (mon && this.textures.exists(mon.spriteKey)) {
        this.add.image(x, y - 18, mon.spriteKey).setScale(0.14).setDepth(13)
      }
      bodyText(
        this,
        x,
        y + 36,
        `${mon?.nameFr ?? '#' + slot.mon.id}\nN.${effectiveLevel(slot.mon)} ${starsLabel(slot.mon.stars)}`,
        { size: '11px', color: '#ffffff', align: 'center' },
      ).setDepth(13)
      makeButton(this, x, y + 62, '+1 niv.', {
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
      }).setDepth(14)
    })

    makeBackButton(this).setDepth(30)
  }
}
