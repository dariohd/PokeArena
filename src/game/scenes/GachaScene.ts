import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMon, loadSave, pullGacha, pullGachaMulti, writeSave } from '../data/pokeapi'
import {
  GACHA_BALL_COST,
  GACHA_MULTI_BALL_COST,
  GACHA_PITY,
  unlockedBanners,
  type RegionBanner,
  type RegionId,
} from '../data/types'
import { L, contentCard, drawShell, listRow, sectionTitle } from '../layout'
import { bodyText, ensureTextures, fadeIn, makeButton, starsLabel } from '../ui'

export class GachaScene extends Phaser.Scene {
  private busy = false
  private status!: Phaser.GameObjects.Text
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
        void this.drawPull()
        return
      }
    }
    void this.drawPick(banners, save.unlockedGen)
  }

  async drawPick(banners: RegionBanner[], unlockedGen: number) {
    await paintScene(this, BG.gachaDark, { dim: 0.38 })
    const zone = drawShell(this, { title: 'Bannières', back: true })

    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12 })
    sectionTitle(this, zone.x + 16, zone.y + 14, 'Régions débloquées')

    banners.forEach((b, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = zone.x + 16 + col * ((zone.w - 40) / 2 + 8)
      const y = zone.y + 44 + row * 72
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0
      listRow(this, x, y, (zone.w - 40) / 2, 64, {
        title: b.nameFr,
        sub: `${b.gamesFr} · Pity ${pity}/${GACHA_PITY}`,
        accent: b.color,
        onClick: () => this.scene.restart({ bannerId: b.id }),
        depth: 14,
      })
    })

    if (unlockedGen < 9) {
      bodyText(this, GAME_W / 2, zone.y + zone.h - 24, 'Gagne des arènes pour débloquer d’autres régions', {
        size: '12px',
        color: 'rgba(255,255,255,0.55)',
      }).setDepth(20)
    }
  }

  async drawPull() {
    const b = this.selected!
    const save = loadSave()
    const pity = save.gachaPityByBanner[b.id] ?? 0
    await paintScene(this, BG.gacha, { dim: 0.4 })
    const zone = drawShell(this, { title: `Bannière · ${b.nameFr}`, back: true })

    contentCard(this, zone.x + zone.w / 2 - 200, zone.y, 400, zone.h - 4, {
      accent: b.color,
      depth: 12,
    })

    this.status = bodyText(
      this,
      GAME_W / 2,
      zone.y + zone.h - 60,
      `Pity 4★ ${pity}/${GACHA_PITY} · x10 = 3★ garanti`,
      { size: '13px', color: 'rgba(255,255,255,0.8)' },
    ).setDepth(20)

    makeButton(this, GAME_W / 2 - 110, L.dockY, `x1 · ${GACHA_BALL_COST}`, {
      tone: 'gold',
      fontSize: '14px',
      padX: 16,
      padY: 8,
      onClick: () => void this.doPull(false),
    }).setDepth(102)

    makeButton(this, GAME_W / 2 + 110, L.dockY, `x10 · ${GACHA_MULTI_BALL_COST}`, {
      tone: 'red',
      fontSize: '14px',
      padX: 16,
      padY: 8,
      onClick: () => void this.doPull(true),
    }).setDepth(102)

    makeButton(this, GAME_W - 100, L.dockY, 'Régions', {
      tone: 'dark',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => this.scene.restart(),
    }).setDepth(102)
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }

  async doPull(multi: boolean) {
    if (this.busy || !this.selected) return
    this.busy = true
    const save = loadSave()
    if (multi) {
      const res = await pullGachaMulti(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball · va au Mart')
        this.busy = false
        return
      }
      writeSave(res.save)
      for (const r of res.results) await this.showPull(r.id, r.stars, r.shiny, 45)
      const best = Math.max(...res.results.map((r) => r.stars))
      this.status.setText(`x10 · ${starsLabel(best)}`)
    } else {
      const res = await pullGacha(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball · va au Mart')
        this.busy = false
        return
      }
      writeSave(res.save)
      await this.showPull(res.id, res.stars, res.shiny, 90)
    }
    // refresh pity line
    const pity = loadSave().gachaPityByBanner[this.selected.id] ?? 0
    this.status.setText(
      `${this.status.text}\nPity 4★ ${pity}/${GACHA_PITY}`,
    )
    this.busy = false
  }

  async showPull(id: number, stars: number, shiny: boolean, holdMs = 90) {
    this.status.setText('…')
    const mon = await fetchMon(id, { full: false })
    await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])
    this.preview?.destroy()
    this.preview = this.add
      .image(GAME_W / 2, L.contentCenterY - 10, mon.homeKey)
      .setScale(0.08)
      .setDepth(18)
    if (shiny) this.preview.setTint(0xfff1a8)
    this.tweens.add({ targets: this.preview, scale: 0.36, duration: 140, ease: 'Back.easeOut' })
    this.cameras.main.shake(stars >= 4 ? 60 : 20, stars >= 4 ? 0.01 : 0.003)
    playCry(mon.cryUrl, 0.35)
    this.status.setText(`${mon.nameFr}${shiny ? ' chromatique' : ''}\n${starsLabel(stars)}`)
    await this.wait(holdMs)
  }
}
