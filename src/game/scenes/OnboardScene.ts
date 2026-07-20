import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMany, fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { STARTER_TRIO } from '../data/types'
import { L, contentCard, drawShell } from '../layout'
import { bodyText, ensureTextures, fadeIn, goScene, makeButton, starsLabel, titleText } from '../ui'

export class OnboardScene extends Phaser.Scene {
  private busy = false
  private status!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image

  constructor() {
    super('onboard')
  }

  create() {
    this.busy = false
    fadeIn(this, 0x0b0d12)
    void this.showIntro()
  }

  clearUi() {
    this.children.removeAll(true)
    this.preview = undefined
  }

  async showIntro() {
    this.clearUi()
    await paintScene(this, BG.onboard, { dim: 0.35 })
    drawShell(this, { title: 'Bienvenue', back: false, showWallet: false })

    const zone = { x: L.pad, y: L.contentY, w: GAME_W - L.pad * 2, h: L.contentH - 8 }
    contentCard(this, zone.x, zone.y, zone.w, zone.h, { depth: 12 })

    const starters = await fetchMany([...STARTER_TRIO], { full: false })
    await ensureTextures(
      this,
      starters.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )

    starters.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      const x = zone.x + zone.w * 0.22 + i * (zone.w * 0.28)
      this.add.image(x, zone.y + zone.h * 0.42, m.homeKey).setScale(0.3).setDepth(15)
      bodyText(this, x, zone.y + zone.h * 0.68, m.nameFr, {
        size: '13px',
        color: '#ffffff',
      }).setDepth(16)
    })

    titleText(this, GAME_W / 2, zone.y + 28, 'Choisis ton partenaire', {
      size: '22px',
      color: '#ffffff',
    }).setDepth(20)

    bodyText(this, GAME_W / 2, zone.y + 56, '1 Ball = 1 tirage · x10 = 3★ · pity 4★ / 50', {
      size: '12px',
      color: 'rgba(255,255,255,0.7)',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, L.dockY, 'Première invocation', {
      tone: 'red',
      fontSize: '16px',
      padX: 22,
      padY: 10,
      onClick: () => void this.showFirstPull(),
    }).setDepth(102)
  }

  async showFirstPull() {
    this.clearUi()
    await paintScene(this, BG.gacha, { dim: 0.4 })
    drawShell(this, { title: 'Invocation', back: false, showWallet: false })

    contentCard(this, GAME_W / 2 - 200, L.contentY + 20, 400, L.contentH - 40, { depth: 12 })

    this.status = bodyText(this, GAME_W / 2, L.contentCenterY + 80, 'Starter gratuit', {
      size: '15px',
      color: '#ffffff',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, L.dockY, 'Invoquer', {
      tone: 'gold',
      fontSize: '18px',
      padX: 28,
      padY: 10,
      onClick: () => void this.doStarterPull(),
    }).setDepth(102)
  }

  async doStarterPull() {
    if (this.busy) return
    this.busy = true
    this.status.setText('…')

    const res = pullStarterTrio(loadSave())
    writeSave(res.save)
    const mon = await fetchMon(res.id, { full: true })
    await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])

    this.preview?.destroy()
    this.preview = this.add
      .image(GAME_W / 2, L.contentCenterY - 20, mon.homeKey)
      .setScale(0.1)
      .setDepth(18)
    this.tweens.add({ targets: this.preview, scale: 0.42, duration: 400, ease: 'Back.easeOut' })
    playCry(mon.cryUrl, 0.5)
    this.status.setText(`${mon.nameFr}  ·  ${starsLabel(1)}`)

    makeButton(this, GAME_W / 2, L.dockY, 'Entrer au Centre', {
      tone: 'red',
      fontSize: '16px',
      padX: 20,
      padY: 10,
      onClick: () => goScene(this, 'hub', 0x0b0d12),
    }).setDepth(102)
    this.busy = false
  }
}
