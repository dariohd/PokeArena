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
  private idleBall?: Phaser.GameObjects.Graphics
  private uiHide: Phaser.GameObjects.GameObject[] = []

  constructor() {
    super('gacha')
  }

  create(data?: { bannerId?: RegionId }) {
    fadeIn(this, 0x07090e)
    this.busy = false
    this.cameras.main.setZoom(1)
    this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2)
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
    await paintScene(this, BG.gacha, { dim: 0.48 })
    drawShell(this, { title: b.nameFr, back: true, accent: b.color })

    const sub = bodyText(this, GAME_W / 2, L.contentY + 14, b.gamesFr, {
      size: '12px',
      color: 'rgba(255,255,255,0.6)',
    }).setDepth(20)

    this.status = bodyText(
      this,
      GAME_W / 2,
      L.contentY + 38,
      `Pity 4★ ${pity}/${GACHA_PITY} · x10 = 3★ garanti`,
      { size: '13px', color: 'rgba(255,255,255,0.85)' },
    ).setDepth(20)

    // Ball au repos : point focal unique
    this.add.ellipse(GAME_W / 2, L.contentCenterY + 48, 160, 30, 0x000000, 0.28).setDepth(11)
    this.idleBall = drawPokeBall(this, GAME_W / 2, L.contentCenterY - 4, 32).setDepth(15)
    this.tweens.add({
      targets: this.idleBall,
      y: L.contentCenterY - 10,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const b1 = makeButton(this, GAME_W / 2 - 110, L.dockY, `x1 · ${GACHA_BALL_COST}`, {
      tone: 'gold',
      fontSize: '14px',
      padX: 18,
      padY: 9,
      onClick: () => void this.doPull(false),
    }).setDepth(102)

    const b2 = makeButton(this, GAME_W / 2 + 110, L.dockY, `x10 · ${GACHA_MULTI_BALL_COST}`, {
      tone: 'red',
      fontSize: '14px',
      padX: 18,
      padY: 9,
      onClick: () => void this.doPull(true),
    }).setDepth(102)

    const b3 = makeButton(this, GAME_W - 110, L.dockY, 'Régions', {
      tone: 'dark',
      fontSize: '12px',
      padX: 12,
      padY: 8,
      onClick: () => this.scene.restart(),
    }).setDepth(102)

    this.uiHide = [sub, this.status, b1, b2, b3]
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }

  setUiVisible(v: boolean) {
    this.uiHide.forEach((o) => {
      const any = o as Phaser.GameObjects.GameObject & { setAlpha?: (a: number) => void }
      any.setAlpha?.(v ? 1 : 0)
    })
  }

  async resetCamera() {
    const cam = this.cameras.main
    await new Promise<void>((resolve) => {
      cam.zoomTo(1, 380, 'Cubic.easeOut', true, (_c, progress) => {
        if (progress >= 1) resolve()
      })
      cam.pan(GAME_W / 2, GAME_H / 2, 380, 'Cubic.easeOut')
    })
    cam.setZoom(1)
    cam.centerOn(GAME_W / 2, GAME_H / 2)
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

  /** Staging : dark + zoom sur ball seule, suspense, reveal */
  async showPull(id: number, stars: number, shiny: boolean, multi: boolean) {
    this.preview?.destroy()
    this.ballGfx?.destroy()
    this.veil?.destroy()
    this.hintRing?.destroy()
    this.idleBall?.setVisible(false)

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 4
    const cam = this.cameras.main
    const color = STAR_COLOR[stars] ?? 0xffffff

    const monPromise = fetchMon(id, { full: false }).then(async (mon) => {
      await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])
      return mon
    })

    // UI hors champ
    this.setUiVisible(false)

    // Dark full
    this.veil = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0)
      .setOrigin(0)
      .setDepth(30)
      .setScrollFactor(0)
    this.tweens.add({ targets: this.veil, alpha: 0.78, duration: 320 })

    // Ball seule
    const ballR = stars >= 4 ? 38 : 32
    this.ballGfx = drawPokeBall(this, cx, cy, ballR).setDepth(40)

    // Zoom caméra sur la ball
    const targetZoom = stars >= 4 ? 1.55 : stars >= 3 ? 1.42 : 1.32
    cam.pan(cx, cy + 10, 420, 'Cubic.easeInOut')
    cam.zoomTo(targetZoom, 420, 'Cubic.easeInOut')
    await this.wait(420)

    this.hintRing = this.add.ellipse(cx, cy, 100, 100, color, 0).setDepth(39)
    this.tweens.add({
      targets: this.hintRing,
      alpha: stars >= 3 ? 0.28 : 0.1,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 700,
      yoyo: true,
      repeat: -1,
    })

    const suspenseMs = multi
      ? stars >= 4
        ? 2000
        : stars >= 3
          ? 1400
          : 800
      : stars >= 4
        ? 2600
        : stars >= 3
          ? 2000
          : 1500

    const shakes = stars >= 4 ? 5 : stars >= 3 ? 4 : 3
    for (let s = 0; s < shakes; s++) {
      this.tweens.add({
        targets: this.ballGfx,
        angle: s % 2 === 0 ? 16 : -16,
        x: cx + (s % 2 === 0 ? 7 : -7),
        duration: 65 + s * 12,
        yoyo: true,
        repeat: 1,
      })
      if (s === shakes - 1 && stars >= 3) {
        cam.shake(50, 0.004)
        // léger push zoom avant ouverture
        cam.zoomTo(targetZoom + 0.08, 180, 'Cubic.easeIn')
      }
      await this.wait(suspenseMs / shakes)
    }

    await this.wait(stars >= 3 ? 220 : 100)

    rarityFlash(this, stars)
    this.ballGfx.destroy()
    this.ballGfx = undefined
    this.hintRing?.destroy()
    this.hintRing = undefined

    const mon = await monPromise
    summonBurst(this, cx, cy, color, stars >= 4 ? 30 : stars >= 3 ? 18 : 8)

    this.preview = this.add
      .image(cx, cy, mon.homeKey)
      .setScale(0.04)
      .setDepth(45)
      .setAlpha(0)
    if (shiny) this.preview.setTint(0xfff1a8)

    const targetScale = stars >= 4 ? 0.38 : stars >= 3 ? 0.32 : 0.26
    this.tweens.add({
      targets: this.preview,
      alpha: 1,
      scale: targetScale,
      duration: 380,
      ease: 'Back.easeOut',
    })

    // Zoom out doux pour révéler le mon
    cam.zoomTo(stars >= 4 ? 1.2 : 1.12, 500, 'Cubic.easeOut')

    playCry(mon.cryUrl, 0.4)
    this.status.setAlpha(1)
    this.status.setText(`${mon.nameFr}${shiny ? ' chromatique' : ''}  ${starsLabel(stars)}`)

    const hold = multi
      ? stars >= 4
        ? 850
        : stars >= 3
          ? 500
          : 260
      : stars >= 4
        ? 1300
        : stars >= 3
          ? 950
          : 650

    await this.wait(hold)

    this.veil?.destroy()
    this.veil = undefined
    await this.resetCamera()
    this.setUiVisible(true)
    this.idleBall?.setVisible(true)
  }
}
