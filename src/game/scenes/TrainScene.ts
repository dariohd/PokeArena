import Phaser from 'phaser'
import { GAME_W } from '../config'
import { applyTrain, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { effectiveLevel, type OwnedMon } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawRoom,
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
    fadeIn(this, Theme.dojoWood)
    drawRoom(this, 'dojo')
    await ensureItemIcons(this, ['rareCandy'])

    const save = loadSave()
    titleText(this, GAME_W / 2, 28, 'Dojo · Super Bonbons', { size: '24px', color: '#ffffff' })
    if (this.textures.exists(itemTextureKey('rareCandy'))) {
      this.add.image(GAME_W / 2 - 160, 54, itemTextureKey('rareCandy')).setScale(1.8)
    }
    walletBar(this, 54, [`${save.inventory.rareCandy} Super Bonbon · 1 = +1 niveau`], {
      color: '#5a3a20',
    })

    const pool: { where: 'team' | 'box'; index: number; mon: OwnedMon }[] = [
      ...save.team.map((mon, index) => ({ where: 'team' as const, index, mon })),
      ...save.box.slice(0, 8).map((mon, index) => ({ where: 'box' as const, index, mon })),
    ]

    const ids = [...new Set(pool.map((p) => p.mon.id))]
    const details = ids.length ? await fetchMany(ids, { full: true }) : []
    await ensureTextures(
      this,
      details.map((m) => ({ key: m.battleKey, url: m.battleUrl })),
    )
    const byId = new Map(details.map((m) => [m.id, m]))

    pool.forEach((slot, i) => {
      const mon = byId.get(slot.mon.id)
      const x = 80 + (i % 6) * 145
      const y = 150 + Math.floor(i / 6) * 155
      drawPanel(this, x - 55, y - 55, 120, 140, {
        stroke: mon?.color ?? Theme.dojoWood,
        radius: 12,
      })
      if (mon && this.textures.exists(mon.battleKey)) {
        this.add.image(x, y - 18, mon.battleKey).setScale(1.55)
      }
      bodyText(
        this,
        x,
        y + 32,
        `${mon?.nameFr ?? '#' + slot.mon.id}\nN.${effectiveLevel(slot.mon)} ${starsLabel(slot.mon.stars)}`,
        { size: '11px', color: hexCss(Theme.ink), align: 'center' },
      )
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
      })
    })

    makeBackButton(this)
  }
}
