import Phaser from 'phaser'
import { playCry, playSfx } from '../audio'
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
import { rarityFlash, summonBurst } from '../fx'
import { L, drawShell, listRow } from '../layout'
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
  private pullBtns: Phaser.GameObjects.Container[] = []

  constructor() {
    super('gacha')
  }

  create(data?: { bannerId?: RegionId }) {
    fadeIn(this)
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

    banners.forEach((b, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cellW = (zone.w - 24) / 2
      const pity = loadSave().gachaPityByBanner[b.id] ?? 0
      listRow(this, zone.x + col * (cellW + 12), zone.y + 16 + row * 68, cellW, 56, {
        title: b.nameFr,
        sub: `${b.gamesFr} · pity ${pity}/${GACHA_PITY}`,
        accent: b.color,
        onClick: () => this.scene.restart({ bannerId: b.id }),
      })
    })

    if (unlockedGen < 9) {
      bodyText(this, GAME_W / 2, zone.y + zone.h - 12, 'Gagne des arènes pour débloquer d’autres régions', {
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

    this.status = bodyText(
      this,
      GAME_W / 2,
      L.contentY + 20,
      `${b.gamesFr} · Pity 4★ ${pity}/${GACHA_PITY}`,
      { size: '13px', color: 'rgba(255,255,255,0.85)' },
    ).setDepth(20)

    this.add.ellipse(GAME_W / 2, L.contentCenterY + 48, 150, 28, 0x000000, 0.28).setDepth(11)
    this.idleBall = drawPokeBall(this, GAME_W / 2, L.contentCenterY - 4, 30).setDepth(15)
    this.tweens.add({
      targets: this.idleBall,
      y: L.contentCenterY - 10,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // CTAs dans le contenu (dock = Retour seul)
    const cy = L.contentY + L.contentH - 28
    this.pullBtns = [
      makeButton(this, GAME_W / 2 - 100, cy, `x1 · ${GACHA_BALL_COST}`, {
        tone: 'gold',
        fontSize: '14px',
        padX: 18,
        padY: 9,
        onClick: () => void this.doPull(false),
      }),
      makeButton(this, GAME_W / 2 + 100, cy, `x10 · ${GACHA_MULTI_BALL_COST}`, {
        tone: 'red',
        fontSize: '14px',
        padX: 18,
        padY: 9,
        onClick: () => void this.doPull(true),
      }),
    ]
    this.pullBtns.forEach((b) => b.setDepth(22))

    makeButton(this, GAME_W - L.pad - 50, L.contentY + 22, 'Régions', {
      tone: 'dark',
      fontSize: '12px',
      padX: 12,
      padY: 6,
      onClick: () => this.scene.restart(),
    }).setDepth(22)
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }

  setPullUi(v: boolean) {
    this.pullBtns.forEach((b) => b.setAlpha(v ? 1 : 0))
    this.status?.setAlpha(v ? 1 : 0)
  }

  async resetCamera() {
    const cam = this.cameras.main
    await new Promise<void>((resolve) => {
      cam.zoomTo(1, 360, 'Cubic.easeOut', true, (_c, p) => {
        if (p >= 1) resolve()
      })
      cam.pan(GAME_W / 2, GAME_H / 2, 360, 'Cubic.easeOut')
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
      await this.showMultiGrid(res.results)
    } else {
      const res = await pullGacha(save, this.selected.id)
      if (!res) {
        this.status.setText('Plus de Poké Ball · va au Mart')
        this.busy = false
        return
      }
      writeSave(res.save)
      await this.showPull(res.id, res.stars, res.shiny)
    }
    const pity = loadSave().gachaPityByBanner[this.selected.id] ?? 0
    this.status.setText(`Pity 4★ ${pity}/${GACHA_PITY}`)
    this.busy = false
  }

  /** x10 : une ouverture, puis grille 5×2 */
  async showMultiGrid(results: { id: number; stars: number; shiny: boolean }[]) {
    this.preview?.destroy()
    this.idleBall?.setVisible(false)
    this.setPullUi(false)

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 4
    const best = Math.max(...results.map((r) => r.stars))

    this.veil = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0)
      .setOrigin(0)
      .setDepth(30)
    this.tweens.add({ targets: this.veil, alpha: 0.82, duration: 280 })

    this.ballGfx = drawPokeBall(this, cx, cy, 34).setDepth(40)
    playSfx('open')
    for (let s = 0; s < 4; s++) {
      this.tweens.add({
        targets: this.ballGfx,
        angle: s % 2 === 0 ? 12 : -12,
        duration: 70,
        yoyo: true,
        repeat: 1,
      })
      await this.wait(320)
    }
    rarityFlash(this, best)
    if (best >= 3) playSfx('rare')
    this.ballGfx.destroy()
    this.ballGfx = undefined

    const mons = await Promise.all(results.map((r) => fetchMon(r.id, { full: false })))
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )

    const cellW = 110
    const cellH = 120
    const cols = 5
    const startX = GAME_W / 2 - ((cols - 1) * cellW) / 2
    const startY = L.contentCenterY - 70

    const grid: Phaser.GameObjects.GameObject[] = []
    for (let i = 0; i < results.length; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * cellW
      const y = startY + row * cellH
      const r = results[i]
      const mon = mons[i]
      const accent = STAR_COLOR[r.stars] ?? 0xffffff

      const frame = this.add.rectangle(x, y, 96, 100, 0x000000, 0.45).setDepth(42)
      frame.setStrokeStyle(2, accent, r.stars >= 3 ? 1 : 0.55)
      grid.push(frame)

      if (this.textures.exists(mon.homeKey)) {
        const img = this.add
          .image(x, y - 8, mon.homeKey)
          .setScale(0.04)
          .setAlpha(0)
          .setDepth(43)
        if (r.shiny) img.setTint(0xfff1a8)
        this.tweens.add({
          targets: img,
          alpha: 1,
          scale: r.stars >= 4 ? 0.16 : 0.13,
          duration: 220,
          delay: i * 55,
          ease: 'Back.easeOut',
        })
        grid.push(img)
      }
      const star = bodyText(this, x, y + 38, starsLabel(r.stars), {
        size: '11px',
        color: `#${accent.toString(16).padStart(6, '0')}`,
      }).setDepth(44)
      grid.push(star)
    }

    if (best >= 3) {
      const bestIdx = results.findIndex((r) => r.stars === best)
      playCry(mons[bestIdx]?.cryUrl, 0.35)
      summonBurst(
        this,
        startX + (bestIdx % cols) * cellW,
        startY + Math.floor(bestIdx / cols) * cellH,
        STAR_COLOR[best],
        20,
      )
    }

    this.status.setAlpha(1)
    this.status.setText(`x10 · meilleur ${starsLabel(best)}`)
    await this.wait(2200)

    grid.forEach((c) => c.destroy())
    this.veil?.destroy()
    this.veil = undefined
    this.setPullUi(true)
    this.idleBall?.setVisible(true)
  }

  async showPull(id: number, stars: number, shiny: boolean) {
    this.preview?.destroy()
    this.ballGfx?.destroy()
    this.veil?.destroy()
    this.hintRing?.destroy()
    this.idleBall?.setVisible(false)
    this.setPullUi(false)

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 4
    const cam = this.cameras.main
    const color = STAR_COLOR[stars] ?? 0xffffff

    const monPromise = fetchMon(id, { full: false }).then(async (mon) => {
      await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])
      return mon
    })

    this.veil = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0)
      .setOrigin(0)
      .setDepth(30)
      .setScrollFactor(0)
    this.tweens.add({ targets: this.veil, alpha: 0.78, duration: 300 })

    this.ballGfx = drawPokeBall(this, cx, cy, stars >= 4 ? 36 : 30).setDepth(40)
    playSfx('open')

    const targetZoom = stars >= 4 ? 1.5 : stars >= 3 ? 1.38 : 1.28
    cam.pan(cx, cy + 10, 400, 'Cubic.easeInOut')
    cam.zoomTo(targetZoom, 400, 'Cubic.easeInOut')
    await this.wait(400)

    this.hintRing = this.add.ellipse(cx, cy, 96, 96, color, 0).setDepth(39)
    this.tweens.add({
      targets: this.hintRing,
      alpha: stars >= 3 ? 0.25 : 0.08,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 700,
      yoyo: true,
      repeat: -1,
    })

    const suspenseMs = stars >= 4 ? 2400 : stars >= 3 ? 1800 : 1400
    const shakes = stars >= 4 ? 5 : stars >= 3 ? 4 : 3
    for (let s = 0; s < shakes; s++) {
      this.tweens.add({
        targets: this.ballGfx,
        angle: s % 2 === 0 ? 14 : -14,
        x: cx + (s % 2 === 0 ? 6 : -6),
        duration: 60 + s * 12,
        yoyo: true,
        repeat: 1,
      })
      if (s === shakes - 1 && stars >= 3) {
        cam.shake(40, 0.004)
        cam.zoomTo(targetZoom + 0.06, 160, 'Cubic.easeIn')
      }
      await this.wait(suspenseMs / shakes)
    }

    await this.wait(stars >= 3 ? 180 : 80)
    rarityFlash(this, stars)
    if (stars >= 3) playSfx('rare')
    this.ballGfx.destroy()
    this.ballGfx = undefined
    this.hintRing?.destroy()
    this.hintRing = undefined

    const mon = await monPromise
    if (stars >= 3) summonBurst(this, cx, cy, color, stars >= 4 ? 28 : 14)

    this.preview = this.add
      .image(cx, cy, mon.homeKey)
      .setScale(0.04)
      .setDepth(45)
      .setAlpha(0)
    if (shiny) this.preview.setTint(0xfff1a8)

    this.tweens.add({
      targets: this.preview,
      alpha: 1,
      scale: stars >= 4 ? 0.36 : stars >= 3 ? 0.3 : 0.26,
      duration: 360,
      ease: 'Back.easeOut',
    })
    cam.zoomTo(stars >= 4 ? 1.18 : 1.1, 480, 'Cubic.easeOut')
    playCry(mon.cryUrl, 0.4)
    this.status.setAlpha(1)
    this.status.setText(`${mon.nameFr}${shiny ? ' chromatique' : ''}  ${starsLabel(stars)}`)

    await this.wait(stars >= 4 ? 1200 : stars >= 3 ? 900 : 600)

    this.veil?.destroy()
    this.veil = undefined
    await this.resetCamera()
    this.setPullUi(true)
    this.idleBall?.setVisible(true)
  }
}
