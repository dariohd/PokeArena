import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, loadSave, pullGacha, pullGachaMulti, writeSave } from '../data/pokeapi'
import {
  GACHA_BALL_COST,
  GACHA_MULTI_BALL_COST,
  GACHA_PITY,
  unlockedBanners,
  type RegionBanner,
  type RegionId,
} from '../data/types'
import { summonBurst } from '../fx'
import { L, contentCard, drawShell, listRow, rarityFlash, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, drawPokeBall, ensureTextures, fadeIn, makeButton, starsLabel } from '../ui'

const STAR_COLOR: Record<number, number> = {
  1: 0xffffff,
  2: 0x4caf70,
  3: 0x3b7dd8,
  4: 0xe8b923,
}

export class GachaScene extends Phaser.Scene {
  private busy = false
  private status!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image
  private selected?: RegionBanner
  private veil?: Phaser.GameObjects.Rectangle
  private ballGfx?: Phaser.GameObjects.Graphics

  constructor() {
    super('gacha')
  }

  create(data?: { bannerId?: RegionId }) {
    fadeIn(this, 0x07090e)
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
    await paintScene(this, BG.gachaDark, { dim: 0.4 })
    const zone = drawShell(this, { title: 'Bannières', back: true, accent: Theme.gold })

    contentCard(this, zone.x, zone.y, zone.w, zone.h - 4, { depth: 12, accent: Theme.gold })
    sectionTitle(this, zone.x + 20, zone.y + 18, 'Régions débloquées')

    banners.forEach((b, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cellW = (zone.w - 48) / 2
      const x = zone.x + 20 + col * (cellW + 8)
      const y = zone.y + 52 + row * 88
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0
      listRow(this, x, y, cellW, 76, {
        title: b.nameFr,
        sub: `${b.gamesFr} · Pity ${pity}/${GACHA_PITY}`,
        accent: b.color,
        onClick: () => this.scene.restart({ bannerId: b.id }),
        depth: 14,
        delay: 30 + i * 40,
      })
    })

    if (unlockedGen < 9) {
      bodyText(this, GAME_W / 2, zone.y + zone.h - 28, 'Gagne des arènes pour débloquer d’autres régions', {
        size: '13px',
        color: 'rgba(255,255,255,0.55)',
      }).setDepth(20)
    }
  }

  async drawPull() {
    const b = this.selected!
    const save = loadSave()
    const pity = save.gachaPityByBanner[b.id] ?? 0
    await paintScene(this, BG.gacha, { dim: 0.42 })
    const zone = drawShell(this, { title: `Bannière · ${b.nameFr}`, back: true, accent: b.color })

    contentCard(this, zone.cx - 260, zone.y + 8, 520, zone.h - 16, {
      accent: b.color,
      depth: 12,
    })

    bodyText(this, GAME_W / 2, zone.y + 36, b.gamesFr, {
      size: '14px',
      color: 'rgba(255,255,255,0.7)',
    }).setDepth(20)

    this.status = bodyText(
      this,
      GAME_W / 2,
      zone.y + zone.h - 48,
      `Pity 4★ ${pity}/${GACHA_PITY} · x10 = 3★ garanti`,
      { size: '14px', color: 'rgba(255,255,255,0.85)' },
    ).setDepth(20)

    // Spot vide au centre
    const spot = this.add.ellipse(GAME_W / 2, L.contentCenterY + 40, 220, 48, 0x000000, 0.35).setDepth(13)
    this.tweens.add({
      targets: spot,
      scaleX: 1.06,
      alpha: 0.22,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    makeButton(this, GAME_W / 2 - 130, L.dockY, `x1 · ${GACHA_BALL_COST}`, {
      tone: 'gold',
      fontSize: '16px',
      padX: 20,
      padY: 10,
      onClick: () => void this.doPull(false),
    }).setDepth(102)

    makeButton(this, GAME_W / 2 + 130, L.dockY, `x10 · ${GACHA_MULTI_BALL_COST}`, {
      tone: 'red',
      fontSize: '16px',
      padX: 20,
      padY: 10,
      onClick: () => void this.doPull(true),
    }).setDepth(102)

    makeButton(this, GAME_W - 120, L.dockY, 'Régions', {
      tone: 'dark',
      fontSize: '14px',
      padX: 14,
      padY: 10,
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
      for (const r of res.results) await this.showPull(r.id, r.stars, r.shiny, true)
      const best = Math.max(...res.results.map((r) => r.stars))
      this.status.setText(`x10 terminé · meilleur ${starsLabel(best)}`)
    } else {
      const res = await pullGacha(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball · va au Mart')
        this.busy = false
        return
      }
      writeSave(res.save)
      await this.showPull(res.id, res.stars, res.shiny, false)
    }
    const pity = loadSave().gachaPityByBanner[this.selected.id] ?? 0
    this.status.setText(`${this.status.text}\nPity 4★ ${pity}/${GACHA_PITY}`)
    this.busy = false
  }

  async showPull(id: number, stars: number, shiny: boolean, multi: boolean) {
    this.status.setText(multi ? 'Ouverture…' : 'Invocation…')
    this.preview?.destroy()
    this.ballGfx?.destroy()
    this.veil?.destroy()

    this.veil = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(30)

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 10
    this.ballGfx = drawPokeBall(this, cx, cy, stars >= 4 ? 52 : 44).setDepth(35)

    // Shake ball
    this.tweens.add({
      targets: this.ballGfx,
      x: cx + 10,
      duration: 50,
      yoyo: true,
      repeat: 7,
      ease: 'Sine.easeInOut',
    })
    await this.wait(stars >= 3 ? 520 : 360)

    rarityFlash(this, stars)
    this.ballGfx.destroy()
    this.ballGfx = undefined

    const mon = await fetchMon(id, { full: false })
    await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])

    const color = STAR_COLOR[stars] ?? 0xffffff
    summonBurst(this, cx, cy, color, stars >= 4 ? 36 : stars >= 3 ? 22 : 12)

    this.preview = this.add
      .image(cx, cy, mon.homeKey)
      .setScale(0.06)
      .setDepth(40)
      .setAlpha(0)
    if (shiny) this.preview.setTint(0xfff1a8)

    const targetScale = stars >= 4 ? 0.48 : stars >= 3 ? 0.42 : 0.36
    this.tweens.add({
      targets: this.preview,
      alpha: 1,
      scale: targetScale,
      duration: stars >= 4 ? 420 : 280,
      ease: 'Back.easeOut',
    })

    playCry(mon.cryUrl, 0.4)
    this.status.setText(`${mon.nameFr}${shiny ? ' chromatique' : ''}\n${starsLabel(stars)}`)

    const hold = multi
      ? stars >= 4
        ? 700
        : stars >= 3
          ? 420
          : 220
      : stars >= 4
        ? 1100
        : stars >= 3
          ? 750
          : 550

    await this.wait(hold)

    this.veil?.destroy()
    this.veil = undefined
  }
}
