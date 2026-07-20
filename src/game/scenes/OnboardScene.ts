import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMany, fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { STARTER_TRIO } from '../data/types'
import { rarityFlash } from '../fx'
import { L, drawShell } from '../layout'
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
    fadeIn(this)
    void this.showIntro()
  }

  clearUi() {
    this.children.removeAll(true)
    this.preview = undefined
  }

  async showIntro() {
    this.clearUi()
    await paintScene(this, BG.onboard, { dim: 0.4 })
    drawShell(this, { title: 'Bienvenue', showWallet: false, accent: Theme.red })

    titleText(this, GAME_W / 2, L.contentY + 28, 'Ton premier partenaire', {
      size: '22px',
    }).setDepth(20)
    bodyText(this, GAME_W / 2, L.contentY + 58, 'Tirage gratuit · trio de Kanto', {
      size: '13px',
    }).setDepth(20)

    const starters = await fetchMany([...STARTER_TRIO], { full: false })
    await ensureTextures(
      this,
      starters.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )
    starters.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      const x = GAME_W * 0.28 + i * (GAME_W * 0.22)
      const y = L.contentCenterY
      this.add.image(x, y, m.homeKey).setScale(0.26).setDepth(15)
      bodyText(this, x, y + 86, m.nameFr, { size: '13px', color: '#ffffff' }).setDepth(16)
    })

    makeButton(this, GAME_W / 2, L.contentY + L.contentH - 28, 'Invoquer', {
      tone: 'gold',
      fontSize: '15px',
      padX: 24,
      padY: 10,
      onClick: () => void this.showFirstPull(),
    }).setDepth(22)
  }

  async showFirstPull() {
    this.clearUi()
    await paintScene(this, BG.gacha, { dim: 0.45 })
    drawShell(this, { title: 'Invocation', showWallet: false, accent: Theme.gold })

    this.status = bodyText(this, GAME_W / 2, L.contentY + 24, 'Starter gratuit', {
      size: '14px',
      color: 'rgba(255,255,255,0.85)',
    }).setDepth(20)

    this.add.ellipse(GAME_W / 2, L.contentCenterY + 48, 150, 28, 0x000000, 0.28).setDepth(11)
    drawPokeBall(this, GAME_W / 2, L.contentCenterY - 4, 30).setDepth(15)

    makeButton(this, GAME_W / 2, L.contentY + L.contentH - 28, 'Ouvrir', {
      tone: 'gold',
      fontSize: '15px',
      padX: 28,
      padY: 10,
      onClick: () => void this.doStarterPull(),
    }).setDepth(22)
  }

  async doStarterPull() {
    if (this.busy) return
    this.busy = true
    this.status.setText('Ouverture…')

    const cx = GAME_W / 2
    const cy = L.contentCenterY - 4
    const ball = drawPokeBall(this, cx, cy, 34).setDepth(25)
    for (let s = 0; s < 3; s++) {
      this.tweens.add({
        targets: ball,
        angle: s % 2 === 0 ? 12 : -12,
        duration: 70,
        yoyo: true,
        repeat: 1,
      })
      await new Promise<void>((r) => this.time.delayedCall(380, () => r()))
    }
    ball.destroy()
    rarityFlash(this, 1)

    const res = pullStarterTrio(loadSave())
    writeSave(res.save)
    const mon = await fetchMon(res.id, { full: true })
    await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])

    this.preview?.destroy()
    this.preview = this.add.image(cx, cy, mon.homeKey).setScale(0.06).setDepth(26).setAlpha(0)
    this.tweens.add({
      targets: this.preview,
      alpha: 1,
      scale: 0.34,
      duration: 360,
      ease: 'Back.easeOut',
    })
    playCry(mon.cryUrl, 0.5)
    this.status.setText(`${mon.nameFr}  ·  ${starsLabel(1)}`)

    makeButton(this, GAME_W / 2, L.contentY + L.contentH - 28, 'Entrer au Centre', {
      tone: 'red',
      fontSize: '14px',
      padX: 20,
      padY: 9,
      onClick: () => goScene(this, 'hub'),
    }).setDepth(22)
    this.busy = false
  }
}
