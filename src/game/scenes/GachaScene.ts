import Phaser from 'phaser'
import { playCry } from '../audio'
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
  drawPanel,
  drawPokeBall,
  drawRoom,
  ensureTextures,
  fadeIn,
  hexCss,
  makeBackButton,
  makeButton,
  starsLabel,
  titleText,
  walletBar,
} from '../ui'
import { spawnAmbientSparkles } from '../fx'

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
    fadeIn(this, Theme.machine)
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

  drawPick(banners: RegionBanner[], balls: number, coins: number, unlockedGen: number) {
    drawRoom(this, 'machine', Theme.gold)
    spawnAmbientSparkles(this, 16, 0xffd070)
    titleText(this, GAME_W / 2, 28, 'Bannières régionales', { size: '26px', color: '#ffd070' })
    walletBar(
      this,
      56,
      [`${balls} Poké Ball`, formatPokedollars(coins), `x1 / x10 · pity 4★ ${GACHA_PITY}`],
      { color: '#c8d0e0' },
    )

    banners.forEach((b, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 60 + col * 300
      const y = 100 + row * 130
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0
      drawPanel(this, x, y, 280, 108, { stroke: b.color, radius: 14 })
      const hit = this.add
        .zone(x + 140, y + 54, 280, 108)
        .setInteractive({ useHandCursor: true })
      this.add.text(x + 18, y + 16, b.nameFr, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '20px',
        color: hexCss(Theme.ink),
      })
      bodyText(this, x + 18, y + 48, b.gamesFr, {
        size: '11px',
        origin: 0,
      })
      bodyText(this, x + 18, y + 72, `Pity 4★ ${pity}/${GACHA_PITY}`, {
        size: '12px',
        color: hexCss(b.color),
        origin: 0,
      })
      hit.on('pointerover', () => hit.setScale(1.02))
      hit.on('pointerout', () => hit.setScale(1))
      hit.on('pointerdown', () => this.scene.restart({ bannerId: b.id }))
    })

    if (unlockedGen < 9) {
      bodyText(this, GAME_W / 2, 460, 'Gagne des arènes pour débloquer les régions', {
        size: '12px',
        color: '#a0a8b8',
      })
    }

    makeBackButton(this)
  }

  drawPull(balls: number, coins: number) {
    const b = this.selected!
    const save = loadSave()
    const pity = save.gachaPityByBanner[b.id] ?? 0
    drawRoom(this, 'machine', b.color)
    spawnAmbientSparkles(this, 14, 0xffd070)

    titleText(this, GAME_W / 2, 28, `Bannière · ${b.nameFr}`, {
      size: '24px',
      color: '#ffd070',
    })
    this.resLabel = walletBar(
      this,
      56,
      [`${balls} Poké Ball`, formatPokedollars(coins), `Pity 4★ ${pity}/${GACHA_PITY}`],
      { color: '#e8eef8' },
    )
    bodyText(this, GAME_W / 2, 78, '1★ base · 2★ milieu · 3★ finale · 4★ légendaire', {
      size: '11px',
      color: '#b0b8c8',
    })

    drawPanel(this, GAME_W / 2 - 130, 100, 260, 250, { stroke: b.color, radius: 16 })
    drawPokeBall(this, GAME_W / 2, 220, 26)

    this.status = bodyText(this, GAME_W / 2, 375, 'x10 = un 3★ garanti', {
      size: '14px',
      color: '#ffffff',
      align: 'center',
    })

    makeButton(this, GAME_W / 2 - 130, 430, `x1 · ${GACHA_BALL_COST} Ball`, {
      tone: 'gold',
      fontSize: '15px',
      padX: 16,
      padY: 10,
      onClick: () => void this.doPull(false),
    })
    makeButton(this, GAME_W / 2 + 130, 430, `x10 · ${GACHA_MULTI_BALL_COST} Balls`, {
      tone: 'red',
      fontSize: '15px',
      padX: 16,
      padY: 10,
      onClick: () => void this.doPull(true),
    })

    makeButton(this, GAME_W / 2, 490, 'Autres régions', {
      tone: 'ghost',
      fontSize: '13px',
      padX: 14,
      padY: 8,
      onClick: () => this.scene.restart(),
    })

    makeBackButton(this)
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
        `x10 · meilleur ${starsLabel(best)}\n` + res.results.map((r) => starsLabel(r.stars)).join(' '),
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
      await this.showPull(res.id, res.stars, res.shiny, 100)
    }
    this.busy = false
  }

  async showPull(id: number, stars: number, shiny: boolean, holdMs = 90) {
    this.status.setText('…')
    const mon = await fetchMon(id, { full: false })
    await ensureTextures(this, [{ key: mon.spriteKey, url: mon.spriteUrl }])
    this.preview?.destroy()
    this.preview = this.add.image(GAME_W / 2, 210, mon.spriteKey).setScale(0.1)
    if (shiny) this.preview.setTint(0xfff1a8)
    this.tweens.add({ targets: this.preview, scale: 0.28, duration: 120, ease: 'Back.easeOut' })
    this.cameras.main.shake(stars >= 4 ? 80 : stars >= 3 ? 45 : 22, stars >= 4 ? 0.012 : 0.004)
    playCry(mon.cryUrl, 0.35)
    this.status.setText(`${mon.nameFr}${shiny ? ' (chromatique)' : ''}\n${starsLabel(stars)}`)
    await this.wait(holdMs)
  }
}
