import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMany, fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { STARTER_TRIO } from '../data/types'
import { summonBurst } from '../fx'
import { L, contentCard, drawShell, rarityFlash } from '../layout'
import { Theme } from '../theme'
import { bodyText, drawPokeBall, ensureTextures, fadeIn, goScene, makeButton, starsLabel, titleText } from '../ui'

export class OnboardScene extends Phaser.Scene {
  private busy = false
  private status!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image

  constructor() {
    super('onboard')
  }

  create() {
    this.busy = false
    fadeIn(this, 0x07090e)
    void this.showIntro()
  }

  clearUi() {
    this.children.removeAll(true)
    this.preview = undefined
  }

  async showIntro() {
    this.clearUi()
    await paintScene(this, BG.onboard, { dim: 0.38 })
    drawShell(this, { title: 'Bienvenue', back: false, showWallet: false, accent: Theme.red })

    const zone = { x: L.pad, y: L.contentY, w: GAME_W - L.pad * 2, h: L.contentH - 8 }
    contentCard(this, zone.x, zone.y, zone.w, zone.h, { depth: 12, accent: Theme.red })

    const starters = await fetchMany([...STARTER_TRIO], { full: false })
    await ensureTextures(
      this,
      starters.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )

    starters.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      const x = zone.x + zone.w * 0.22 + i * (zone.w * 0.28)
      const img = this.add
        .image(x, zone.y + zone.h * 0.44, m.homeKey)
        .setScale(0.18)
        .setDepth(15)
        .setAlpha(0)
      this.tweens.add({
        targets: img,
        alpha: 1,
        scale: 0.36,
        duration: 380,
        delay: 80 + i * 90,
        ease: 'Back.easeOut',
      })
      bodyText(this, x, zone.y + zone.h * 0.72, m.nameFr, {
        size: '16px',
        color: '#ffffff',
      }).setDepth(16)
    })

    titleText(this, GAME_W / 2, zone.y + 36, 'Choisis ton partenaire', {
      size: '28px',
      color: '#ffffff',
    }).setDepth(20)

    bodyText(this, GAME_W / 2, zone.y + 72, '1 Ball = 1 tirage · x10 = 3★ · pity 4★ / 50', {
      size: '14px',
      color: 'rgba(255,255,255,0.7)',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, L.dockY, 'Première invocation', {
      tone: 'red',
      fontSize: '18px',
      padX: 28,
      padY: 12,
      onClick: () => void this.showFirstPull(),
    }).setDepth(102)
  }

  async showFirstPull() {
    this.clearUi()
    await paintScene(this, BG.gacha, { dim: 0.42 })
    drawShell(this, { title: 'Invocation', back: false, showWallet: false, accent: Theme.gold })

    contentCard(this, GAME_W / 2 - 260, L.contentY + 16, 520, L.contentH - 32, {
      depth: 12,
      accent: Theme.gold,
    })

    this.status = bodyText(this, GAME_W / 2, L.contentCenterY + 100, 'Starter gratuit · trio Kanto', {
      size: '16px',
      color: '#ffffff',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, L.dockY, 'Invoquer', {
      tone: 'gold',
      fontSize: '20px',
      padX: 36,
      padY: 12,
      onClick: () => void this.doStarterPull(),
    }).setDepth(102)
  }

  async doStarterPull() {
    if (this.busy) return
    this.busy = true
    this.status.setText('Ouverture…')

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 20
    const ball = drawPokeBall(this, cx, cy, 48).setDepth(25)
    this.tweens.add({
      targets: ball,
      x: cx + 12,
      duration: 55,
      yoyo: true,
      repeat: 8,
    })
    await new Promise<void>((r) => this.time.delayedCall(480, () => r()))
    ball.destroy()
    rarityFlash(this, 1)

    const res = pullStarterTrio(loadSave())
    writeSave(res.save)
    const mon = await fetchMon(res.id, { full: true })
    await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])

    summonBurst(this, cx, cy, Theme.red, 18)
    this.preview?.destroy()
    this.preview = this.add
      .image(cx, cy, mon.homeKey)
      .setScale(0.08)
      .setDepth(26)
      .setAlpha(0)
    this.tweens.add({
      targets: this.preview,
      alpha: 1,
      scale: 0.5,
      duration: 420,
      ease: 'Back.easeOut',
    })
    playCry(mon.cryUrl, 0.5)
    this.status.setText(`${mon.nameFr}  ·  ${starsLabel(1)}`)

    makeButton(this, GAME_W / 2, L.dockY, 'Entrer au Centre', {
      tone: 'red',
      fontSize: '18px',
      padX: 24,
      padY: 12,
      onClick: () => goScene(this, 'hub', 0x07090e),
    }).setDepth(102)
    this.busy = false
  }
}
