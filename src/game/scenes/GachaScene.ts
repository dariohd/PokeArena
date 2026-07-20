import Phaser from 'phaser'
import { playCry } from '../audio'
import { paintArtBackdrop, placeHeroArt } from '../backdrop'
import { GAME_W } from '../config'
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
import { Theme } from '../theme'
import {
  bodyText,
  ensureTextures,
  fadeIn,
  hexCss,
  makeBackButton,
  makeButton,
  starsLabel,
  titleText,
  walletBar,
} from '../ui'

const BANNER_BG: Record<string, number> = {
  kanto: 150,
  johto: 249,
  hoenn: 384,
  sinnoh: 483,
  unova: 643,
  kalos: 716,
  alola: 791,
  galar: 888,
  paldea: 1008,
}

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
    fadeIn(this, 0x0b0d12)
    this.busy = false
    const save = loadSave()
    const banners = unlockedBanners(save.unlockedGen)

    if (data?.bannerId) {
      this.selected = banners.find((b) => b.id === data.bannerId)
      if (this.selected) {
        void this.drawPull(save.inventory.pokeball, save.coins)
        return
      }
    }

    void this.drawPick(banners, save.inventory.pokeball, save.coins, save.unlockedGen)
  }

  async drawPick(banners: RegionBanner[], balls: number, coins: number, unlockedGen: number) {
    await paintArtBackdrop(this, 151, { dim: 0.62, zoom: 1.3, tint: 0x9098a8 })
    titleText(this, GAME_W / 2, 28, 'Bannières', { size: '26px', color: '#ffffff' }).setDepth(20)
    walletBar(
      this,
      56,
      [`${balls} Poké Ball`, formatPokedollars(coins), `pity 4★ ${GACHA_PITY}`],
      { color: 'rgba(255,255,255,0.8)' },
    ).setDepth(20)

    banners.forEach((b, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 60 + col * 300
      const y = 100 + row * 130
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0

      this.add.rectangle(x + 140, y + 54, 280, 108, 0x000000, 0.55).setDepth(15)
      this.add
        .rectangle(x + 140, y + 54, 280, 108)
        .setStrokeStyle(2, b.color)
        .setDepth(15)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.restart({ bannerId: b.id }))

      this.add
        .text(x + 18, y + 20, b.nameFr, {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '20px',
          color: '#ffffff',
        })
        .setDepth(16)
      bodyText(this, x + 18, y + 52, b.gamesFr, {
        size: '11px',
        origin: 0,
        color: 'rgba(255,255,255,0.65)',
      }).setDepth(16)
      bodyText(this, x + 18, y + 76, `Pity 4★ ${pity}/${GACHA_PITY}`, {
        size: '12px',
        color: hexCss(b.color),
        origin: 0,
      }).setDepth(16)
    })

    if (unlockedGen < 9) {
      bodyText(this, GAME_W / 2, 460, 'Gagne des arènes pour débloquer les régions', {
        size: '12px',
        color: 'rgba(255,255,255,0.5)',
      }).setDepth(20)
    }

    makeBackButton(this).setDepth(30)
  }

  async drawPull(balls: number, coins: number) {
    const b = this.selected!
    const save = loadSave()
    const pity = save.gachaPityByBanner[b.id] ?? 0
    const bgId = BANNER_BG[b.id] ?? b.featured[0] ?? 150
    await paintArtBackdrop(this, bgId, { dim: 0.6, zoom: 1.25, tint: 0x888890 })

    titleText(this, GAME_W / 2, 28, b.nameFr, { size: '24px', color: '#ffffff' }).setDepth(20)
    this.resLabel = walletBar(
      this,
      56,
      [`${balls} Poké Ball`, formatPokedollars(coins), `Pity 4★ ${pity}/${GACHA_PITY}`],
      { color: 'rgba(255,255,255,0.85)' },
    ).setDepth(20)

    bodyText(this, GAME_W / 2, 82, '1★ · 2★ · 3★ · 4★ légendaire', {
      size: '11px',
      color: 'rgba(255,255,255,0.55)',
    }).setDepth(20)

    this.add.rectangle(GAME_W / 2, 230, 260, 240, 0x000000, 0.4).setDepth(12)

    this.status = bodyText(this, GAME_W / 2, 375, 'x10 = un 3★ garanti', {
      size: '14px',
      color: '#ffffff',
      align: 'center',
    }).setDepth(20)

    makeButton(this, GAME_W / 2 - 130, 430, `x1 · ${GACHA_BALL_COST}`, {
      tone: 'gold',
      fontSize: '15px',
      padX: 16,
      padY: 10,
      onClick: () => void this.doPull(false),
    }).setDepth(30)
    makeButton(this, GAME_W / 2 + 130, 430, `x10 · ${GACHA_MULTI_BALL_COST}`, {
      tone: 'red',
      fontSize: '15px',
      padX: 16,
      padY: 10,
      onClick: () => void this.doPull(true),
    }).setDepth(30)

    makeButton(this, GAME_W / 2, 490, 'Régions', {
      tone: 'dark',
      fontSize: '13px',
      padX: 14,
      padY: 8,
      onClick: () => this.scene.restart(),
    }).setDepth(30)

    makeBackButton(this).setDepth(30)
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }

  refreshRes() {
    const save = loadSave()
    const b = this.selected!
    const pity = save.gachaPityByBanner[b.id] ?? 0
    this.resLabel.setText(
      [`${save.inventory.pokeball} Poké Ball`, formatPokedollars(save.coins), `Pity 4★ ${pity}/${GACHA_PITY}`].join(
        '  ·  ',
      ),
    )
  }

  async doPull(multi: boolean) {
    if (this.busy || !this.selected) return
    this.busy = true
    const save = loadSave()
    if (multi) {
      const res = await pullGachaMulti(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball')
        this.busy = false
        return
      }
      writeSave(res.save)
      this.refreshRes()
      for (const r of res.results) await this.showPull(r.id, r.stars, r.shiny, 50)
      const best = Math.max(...res.results.map((r) => r.stars))
      this.status.setText(
        `x10 · ${starsLabel(best)}\n` + res.results.map((r) => starsLabel(r.stars)).join(' '),
      )
    } else {
      const res = await pullGacha(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball')
        this.busy = false
        return
      }
      writeSave(res.save)
      this.refreshRes()
      await this.showPull(res.id, res.stars, res.shiny, 100)
    }
    this.busy = false
  }

  async showPull(id: number, stars: number, shiny: boolean, holdMs = 90) {
    this.status.setText('…')
    const mon = await fetchMon(id, { full: false })
    await ensureTextures(this, [{ key: mon.spriteKey, url: mon.spriteUrl }])
    this.preview?.destroy()
    this.preview = placeHeroArt(this, mon.spriteKey, GAME_W / 2, 220, 0.32) ?? undefined
    if (this.preview && shiny) this.preview.setTint(0xfff1a8)
    this.cameras.main.shake(stars >= 4 ? 70 : 25, stars >= 4 ? 0.01 : 0.003)
    playCry(mon.cryUrl, 0.35)
    this.status.setText(`${mon.nameFr}${shiny ? ' chromatique' : ''}\n${starsLabel(stars)}`)
    await this.wait(holdMs)
  }
}
