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
import { L, drawShell, listRow, rarityFlash } from '../layout'
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
  private hintRing?: Phaser.GameObjects.Ellipse

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
    await paintScene(this, BG.gachaDark, { dim: 0.42 })
    const zone = drawShell(this, { title: 'Bannières', back: true, accent: Theme.gold })

    bodyText(this, zone.x, zone.y + 8, 'Choisis une région', {
      size: '13px',
      color: 'rgba(255,255,255,0.6)',
      origin: 0,
    }).setDepth(20)

    banners.forEach((b, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cellW = (zone.w - 24) / 2
      const x = zone.x + col * (cellW + 12)
      const y = zone.y + 40 + row * 70
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0
      listRow(this, x, y, cellW, 58, {
        title: b.nameFr,
        sub: `${b.gamesFr} · pity ${pity}/${GACHA_PITY}`,
        accent: b.color,
        onClick: () => this.scene.restart({ bannerId: b.id }),
        depth: 14,
        delay: 20 + i * 30,
      })
    })

    if (unlockedGen < 9) {
      bodyText(this, GAME_W / 2, zone.y + zone.h - 16, 'Gagne des arènes pour débloquer d’autres régions', {
        size: '12px',
        color: 'rgba(255,255,255,0.5)',
      }).setDepth(20)
    }
  }

  async drawPull() {
    const b = this.selected!
    const save = loadSave()
    const pity = save.gachaPityByBanner[b.id] ?? 0
    await paintScene(this, BG.gacha, { dim: 0.45 })
    drawShell(this, { title: b.nameFr, back: true, accent: b.color })

    bodyText(this, GAME_W / 2, L.contentY + 16, b.gamesFr, {
      size: '13px',
      color: 'rgba(255,255,255,0.65)',
    }).setDepth(20)

    this.status = bodyText(
      this,
      GAME_W / 2,
      L.contentY + 42,
      `Pity 4★ ${pity}/${GACHA_PITY} · x10 = 3★ garanti`,
      { size: '13px', color: 'rgba(255,255,255,0.85)' },
    ).setDepth(20)

    // Spot sobre
    this.add.ellipse(GAME_W / 2, L.contentCenterY + 50, 180, 36, 0x000000, 0.3).setDepth(11)

    makeButton(this, GAME_W / 2 - 110, L.dockY, `x1 · ${GACHA_BALL_COST}`, {
      tone: 'gold',
      fontSize: '14px',
      padX: 18,
      padY: 9,
      onClick: () => void this.doPull(false),
    }).setDepth(102)

    makeButton(this, GAME_W / 2 + 110, L.dockY, `x10 · ${GACHA_MULTI_BALL_COST}`, {
      tone: 'red',
      fontSize: '14px',
      padX: 18,
      padY: 9,
      onClick: () => void this.doPull(true),
    }).setDepth(102)

    makeButton(this, GAME_W - 110, L.dockY, 'Régions', {
      tone: 'dark',
      fontSize: '12px',
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
      for (const r of res.results) await this.showPull(r.id, r.stars, r.shiny, true)
      const best = Math.max(...res.results.map((r) => r.stars))
      this.status.setText(`x10 · meilleur ${starsLabel(best)}`)
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
    this.status.setText(`Pity 4★ ${pity}/${GACHA_PITY}`)
    this.busy = false
  }

  /** Suspense 2–3s (plus long si 3★/4★), puis reveal */
  async showPull(id: number, stars: number, shiny: boolean, multi: boolean) {
    this.status.setText('…')
    this.preview?.destroy()
    this.ballGfx?.destroy()
    this.veil?.destroy()
    this.hintRing?.destroy()

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 8

    // Précharge pendant le suspense
    const monPromise = fetchMon(id, { full: false }).then(async (mon) => {
      await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])
      return mon
    })

    this.veil = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.62)
      .setOrigin(0)
      .setDepth(30)
      .setAlpha(0)
    this.tweens.add({ targets: this.veil, alpha: 0.62, duration: 280 })

    const ballR = stars >= 4 ? 40 : 34
    this.ballGfx = drawPokeBall(this, cx, cy, ballR).setDepth(35)

    // Teinte d’ambiance selon rareté (indice, pas spoiler total)
    const color = STAR_COLOR[stars] ?? 0xffffff
    this.hintRing = this.add.ellipse(cx, cy, 120, 120, color, 0).setDepth(34)
    this.tweens.add({
      targets: this.hintRing,
      alpha: stars >= 3 ? 0.22 : 0.08,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 900,
      yoyo: true,
      repeat: 2,
    })

    // Suspense : shakes escaladés
    const suspenseMs = multi
      ? stars >= 4
        ? 2200
        : stars >= 3
          ? 1600
          : 900
      : stars >= 4
        ? 2800
        : stars >= 3
          ? 2200
          : 1600

    const shakes = stars >= 4 ? 5 : stars >= 3 ? 4 : 3
    for (let s = 0; s < shakes; s++) {
      this.tweens.add({
        targets: this.ballGfx,
        angle: s % 2 === 0 ? 14 : -14,
        x: cx + (s % 2 === 0 ? 8 : -8),
        duration: 70 + s * 15,
        yoyo: true,
        repeat: 1,
        delay: s * (suspenseMs / shakes) * 0.85,
      })
      if (stars >= 3 && s === shakes - 1) {
        this.cameras.main.shake(40, 0.003)
      }
      await this.wait(suspenseMs / shakes)
    }

    // Pause finale avant ouverture
    await this.wait(stars >= 3 ? 280 : 120)

    rarityFlash(this, stars)
    this.ballGfx.destroy()
    this.ballGfx = undefined
    this.hintRing?.destroy()
    this.hintRing = undefined

    const mon = await monPromise
    summonBurst(this, cx, cy, color, stars >= 4 ? 28 : stars >= 3 ? 16 : 8)

    this.preview = this.add
      .image(cx, cy, mon.homeKey)
      .setScale(0.05)
      .setDepth(40)
      .setAlpha(0)
    if (shiny) this.preview.setTint(0xfff1a8)

    const targetScale = stars >= 4 ? 0.4 : stars >= 3 ? 0.34 : 0.28
    this.tweens.add({
      targets: this.preview,
      alpha: 1,
      scale: targetScale,
      duration: 360,
      ease: 'Back.easeOut',
    })

    playCry(mon.cryUrl, 0.4)
    this.status.setText(`${mon.nameFr}${shiny ? ' chromatique' : ''}  ${starsLabel(stars)}`)

    const hold = multi
      ? stars >= 4
        ? 900
        : stars >= 3
          ? 550
          : 280
      : stars >= 4
        ? 1400
        : stars >= 3
          ? 1000
          : 700

    await this.wait(hold)

    this.veil?.destroy()
    this.veil = undefined
  }
}
