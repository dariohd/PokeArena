import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_H, GAME_W } from '../config'
import { fetchMany, fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { STARTER_TRIO } from '../data/types'
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
    await paintScene(this, BG.onboard, { dim: 0.4 })

    const starters = await fetchMany([...STARTER_TRIO], { full: false })
    await ensureTextures(
      this,
      starters.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )
    starters.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      this.add
        .image(GAME_W * 0.26 + i * 240, GAME_H * 0.55, m.homeKey)
        .setScale(0.32)
        .setDepth(8)
    })

    titleText(this, GAME_W / 2, 48, 'PokeArena', { size: '42px', color: '#ffffff' })
      .setDepth(20)
      .setStroke('#e3350d', 4)
    bodyText(this, GAME_W / 2, 100, 'Ton premier partenaire', {
      size: '16px',
      color: 'rgba(255,255,255,0.9)',
    }).setDepth(20)
    bodyText(this, GAME_W / 2, 140, '1 Ball = 1 tirage · x10 = 3★ · pity 4★ / 50', {
      size: '13px',
      color: 'rgba(255,255,255,0.7)',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, 430, 'Première invocation', {
      tone: 'red',
      fontSize: '18px',
      padX: 26,
      padY: 12,
      onClick: () => void this.showFirstPull(),
    }).setDepth(30)
  }

  async showFirstPull() {
    this.clearUi()
    await paintScene(this, BG.gacha, { dim: 0.45 })
    titleText(this, GAME_W / 2, 48, 'Invocation', { size: '28px', color: '#ffffff' }).setDepth(20)
    bodyText(this, GAME_W / 2, 88, 'Bulbizarre · Salamèche · Carapuce', {
      size: '14px',
      color: 'rgba(255,255,255,0.75)',
    }).setDepth(20)

    this.status = bodyText(this, GAME_W / 2, 360, 'Gratuit', {
      size: '16px',
      color: '#ffffff',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, 430, 'Invoquer', {
      tone: 'gold',
      fontSize: '20px',
      padX: 30,
      padY: 12,
      onClick: () => void this.doStarterPull(),
    }).setDepth(30)
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
    this.preview = this.add.image(GAME_W / 2, 230, mon.homeKey).setScale(0.1).setDepth(12)
    this.tweens.add({ targets: this.preview, scale: 0.45, duration: 400, ease: 'Back.easeOut' })
    playCry(mon.cryUrl, 0.5)
    this.status.setText(`${mon.nameFr}  ·  ${starsLabel(1)}`)

    makeButton(this, GAME_W / 2, 470, 'Entrer', {
      tone: 'red',
      fontSize: '17px',
      padX: 22,
      padY: 10,
      onClick: () => goScene(this, 'hub', 0x0b0d12),
    }).setDepth(30)
    this.busy = false
  }
}
