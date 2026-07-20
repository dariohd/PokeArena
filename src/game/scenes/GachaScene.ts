import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, loadSave, pullGacha, pullGachaMulti, writeSave } from '../data/pokeapi'
import {
  GACHA_BALL_COST,
  GACHA_MULTI_BALL_COST,
  GACHA_PITY,
  formatPokedollars,
  unlockedBanners,
  type RegionBanner,
  type RegionId,
} from '../data/types'
import { FONT_TITLE, FONT_UI } from '../theme'

export class GachaScene extends Phaser.Scene {
  private busy = false
  private status!: Phaser.GameObjects.Text
  private resLabel!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image
  private selected?: RegionBanner

  constructor() {
    super('gacha')
  }

  create(data?: { bannerId?: RegionId }) {
    this.cameras.main.fadeIn(100, 42, 24, 72)
    this.busy = false
    const save = loadSave()
    const banners = unlockedBanners(save.unlockedGen)

    if (data?.bannerId) {
      this.selected = banners.find((b) => b.id === data.bannerId)
      if (this.selected) {
        this.drawPull(save.inventory.pokeball, save.coins)
        return
      }
    }

    this.drawPick(banners, save.inventory.pokeball, save.coins, save.unlockedGen)
  }

  drawBg(top: number, bot: number) {
    const g = this.add.graphics()
    g.fillGradientStyle(top, top, bot, bot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
  }

  drawPick(banners: RegionBanner[], balls: number, coins: number, unlockedGen: number) {
    this.drawBg(0x1a1030, 0x3a2060)
    this.add
      .text(GAME_W / 2, 28, 'Bannières régionales', {
        fontFamily: FONT_TITLE,
        fontSize: '26px',
        color: '#ffd070',
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_W / 2,
        56,
        `${balls} Poké Ball · ${formatPokedollars(coins)} · x1 / x10 · 4★ pity ${GACHA_PITY}`,
        { fontFamily: FONT_UI, fontSize: '12px', color: '#d0c0e8' },
      )
      .setOrigin(0.5)

    banners.forEach((b, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 170 + col * 300
      const y = 120 + row * 120
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0
      const card = this.add
        .rectangle(x, y, 270, 96, 0xfff8f0)
        .setStrokeStyle(4, b.color)
        .setInteractive({ useHandCursor: true })
      this.add.text(x - 120, y - 30, b.nameFr, {
        fontFamily: FONT_TITLE,
        fontSize: '20px',
        color: '#2a2a3a',
      })
      this.add.text(x - 120, y - 2, b.gamesFr, {
        fontFamily: FONT_UI,
        fontSize: '11px',
        color: '#6a6a7a',
      })
      this.add.text(x - 120, y + 22, `Pity 4★ ${pity}/${GACHA_PITY}`, {
        fontFamily: FONT_UI,
        fontSize: '11px',
        color: '#9b59d0',
      })
      card.on('pointerover', () => card.setScale(1.03))
      card.on('pointerout', () => card.setScale(1))
      card.on('pointerdown', () => this.scene.restart({ bannerId: b.id }))
    })

    if (unlockedGen < 9) {
      this.add
        .text(GAME_W / 2, 470, 'Gagne des arènes pour débloquer les régions', {
          fontFamily: FONT_UI,
          fontSize: '12px',
          color: '#a090b8',
        })
        .setOrigin(0.5)
    }

    this.addBack()
  }

  drawPull(balls: number, coins: number) {
    const b = this.selected!
    const save = loadSave()
    const pity = save.gachaPityByBanner[b.id] ?? 0
    this.drawBg(0x1a1030, b.color)

    this.add
      .text(GAME_W / 2, 28, `Bannière · ${b.nameFr}`, {
        fontFamily: FONT_TITLE,
        fontSize: '26px',
        color: '#ffd070',
      })
      .setOrigin(0.5)

    this.resLabel = this.add
      .text(
        GAME_W / 2,
        58,
        `${balls} Poké Ball · ${formatPokedollars(coins)} · Pity 4★ ${pity}/${GACHA_PITY}`,
        { fontFamily: FONT_UI, fontSize: '12px', color: '#fff8f0' },
      )
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 82, '1★ base · 2★ milieu · 3★ finale · 4★ légendaire', {
        fontFamily: FONT_UI,
        fontSize: '11px',
        color: '#d0c0e8',
      })
      .setOrigin(0.5)

    this.add.rectangle(GAME_W / 2, 230, 260, 240, 0xfff8f0).setStrokeStyle(4, b.color)
    this.status = this.add
      .text(GAME_W / 2, 380, 'x10 = un 3★ garanti', {
        fontFamily: FONT_UI,
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)

    const one = this.add
      .text(GAME_W / 2 - 130, 440, `x1 · ${GACHA_BALL_COST} Ball`, {
        fontFamily: FONT_TITLE,
        fontSize: '15px',
        color: '#2a2a3a',
        backgroundColor: '#ffd070',
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const ten = this.add
      .text(GAME_W / 2 + 130, 440, `x10 · ${GACHA_MULTI_BALL_COST} Balls`, {
        fontFamily: FONT_TITLE,
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#9b59d0',
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    one.on('pointerdown', () => void this.doPull(false))
    ten.on('pointerdown', () => void this.doPull(true))

    this.add
      .text(GAME_W / 2, 500, 'Autres régions', {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#ffd070',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart())

    this.addBack()
  }

  addBack() {
    this.add
      .text(80, 510, 'Retour', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('hub'))
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }

  refreshRes() {
    const save = loadSave()
    const b = this.selected!
    const pity = save.gachaPityByBanner[b.id] ?? 0
    this.resLabel.setText(
      `${save.inventory.pokeball} Poké Ball · ${formatPokedollars(save.coins)} · Pity 4★ ${pity}/${GACHA_PITY}`,
    )
  }

  async doPull(multi: boolean) {
    if (this.busy || !this.selected) return
    this.busy = true
    const save = loadSave()
    if (multi) {
      const res = await pullGachaMulti(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball ! Va au Poké Mart.')
        this.busy = false
        return
      }
      writeSave(res.save)
      this.refreshRes()
      for (const r of res.results) {
        await this.showPull(r.id, r.stars, r.shiny, 55)
      }
      const best = Math.max(...res.results.map((r) => r.stars))
      this.status.setText(
        `x10 · meilleur ${'★'.repeat(best)}\n` + res.results.map((r) => `${'★'.repeat(r.stars)}`).join(' '),
      )
    } else {
      const res = await pullGacha(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball ! Va au Poké Mart.')
        this.busy = false
        return
      }
      writeSave(res.save)
      this.refreshRes()
      await this.showPull(res.id, res.stars, res.shiny, 90)
    }
    this.busy = false
  }

  async showPull(id: number, stars: number, shiny: boolean, holdMs = 90) {
    this.status.setText('…')
    const mon = await fetchMon(id, { full: false })
    if (!this.textures.exists(mon.spriteKey)) {
      await new Promise<void>((resolve) => {
        this.load.image(mon.spriteKey, mon.spriteUrl)
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
        this.load.start()
      })
    }
    this.preview?.destroy()
    this.preview = this.add.image(GAME_W / 2, 220, mon.spriteKey).setScale(0.12)
    if (shiny) this.preview.setTint(0xfff1a8)
    this.tweens.add({ targets: this.preview, scale: 0.3, duration: 80, ease: 'Back.easeOut' })
    this.cameras.main.shake(stars >= 4 ? 70 : stars >= 3 ? 40 : 20, stars >= 4 ? 0.012 : 0.004)
    playCry(mon.cryUrl, 0.35)
    this.status.setText(`${mon.nameFr}${shiny ? ' (chromatique)' : ''}\n${'★'.repeat(stars)}`)
    await this.wait(holdMs)
  }
}
