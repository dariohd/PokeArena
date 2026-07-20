import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { fetchMany, fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { STARTER_TRIO } from '../data/types'
import { spawnAmbientSparkles } from '../fx'
import { Theme } from '../theme'
import {
  bodyText,
  drawCinematicLobby,
  ensureTextures,
  fadeIn,
  goScene,
  makeButton,
  starsLabel,
  titleText,
} from '../ui'

/**
 * Onboarding cinématique : artwork starters HQ, pas de cartes texte plates.
 */
export class OnboardScene extends Phaser.Scene {
  private busy = false
  private status!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image

  constructor() {
    super('onboard')
  }

  create() {
    this.busy = false
    fadeIn(this, 0x0a1020)
    void this.showIntro()
  }

  clearUi() {
    this.children.removeAll(true)
    this.preview = undefined
  }

  async showIntro() {
    this.clearUi()
    drawCinematicLobby(this)
    spawnAmbientSparkles(this, 24, 0xffd070)

    const starters = await fetchMany([...STARTER_TRIO], { full: false })
    await ensureTextures(
      this,
      starters.map((m) => ({ key: m.spriteKey, url: m.spriteUrl })),
    )

    // Trio artwork en fond
    starters.forEach((m, i) => {
      if (!this.textures.exists(m.spriteKey)) return
      const x = GAME_W * 0.22 + i * 280
      const img = this.add
        .image(x, GAME_H * 0.55, m.spriteKey)
        .setScale(0.28)
        .setAlpha(0)
        .setDepth(6)
      this.tweens.add({
        targets: img,
        alpha: 0.55,
        scale: 0.34,
        duration: 500,
        delay: i * 120,
        ease: 'Cubic.easeOut',
      })
      this.tweens.add({
        targets: img,
        y: img.y - 8,
        duration: 2200 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })

    // Overlay lisible
    const veil = this.add.graphics().setDepth(10)
    veil.fillStyle(0x0a1020, 0.42)
    veil.fillRect(0, 0, GAME_W, GAME_H)

    titleText(this, GAME_W / 2, 70, 'PokeArena', {
      size: '48px',
      color: '#ffffff',
    })
      .setDepth(20)
      .setStroke('#e3350d', 5)

    bodyText(this, GAME_W / 2, 130, 'Invoque · Combat · Évolue', {
      size: '18px',
      color: '#ffd070',
    }).setDepth(20)

    bodyText(
      this,
      GAME_W / 2,
      180,
      'Les Poké Balls ouvr tickets de bannière.\nx10 garantit un 3★. Pity 4★ à 50.',
      { size: '15px', color: 'rgba(255,255,255,0.85)', align: 'center' },
    ).setDepth(20)

    makeButton(this, GAME_W / 2, 420, 'Première invocation', {
      tone: 'red',
      fontSize: '20px',
      padX: 28,
      padY: 14,
      onClick: () => void this.showFirstPull(),
    }).setDepth(30)

    bodyText(this, GAME_W / 2, 490, 'Starter gratuit : Bulbizarre · Salamèche · Carapuce', {
      size: '12px',
      color: 'rgba(255,255,255,0.55)',
    }).setDepth(20)
  }

  async showFirstPull() {
    this.clearUi()
    drawCinematicLobby(this)
    spawnAmbientSparkles(this, 20, 0xffd070)

    titleText(this, GAME_W / 2, 40, 'Invocation de départ', {
      size: '28px',
      color: '#ffffff',
    })
      .setDepth(20)
      .setStroke('#e3350d', 4)

    bodyText(this, GAME_W / 2, 78, 'Un partenaire 1★ t’attend', {
      size: '14px',
      color: '#ffd070',
    }).setDepth(20)

    // Plateforme
    const pad = this.add.graphics().setDepth(5)
    pad.fillStyle(0x000000, 0.35)
    pad.fillEllipse(GAME_W / 2, 300, 280, 60)
    pad.lineStyle(2, Theme.gold, 0.5)
    pad.strokeEllipse(GAME_W / 2, 300, 280, 60)

    const glow = this.add.circle(GAME_W / 2, 240, 70, Theme.gold, 0.15).setDepth(6)
    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      scale: 1.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
    })

    this.status = bodyText(this, GAME_W / 2, 380, 'Touche pour invoquer', {
      size: '16px',
      color: '#ffffff',
      align: 'center',
    }).setDepth(20)

    makeButton(this, GAME_W / 2, 450, 'Invoquer', {
      tone: 'gold',
      fontSize: '22px',
      padX: 32,
      padY: 14,
      onClick: () => void this.doStarterPull(),
    }).setDepth(30)
  }

  async doStarterPull() {
    if (this.busy) return
    this.busy = true
    this.status.setText('…')

    const save = loadSave()
    const res = pullStarterTrio(save)
    writeSave(res.save)

    const mon = await fetchMon(res.id, { full: true })
    await ensureTextures(this, [{ key: mon.spriteKey, url: mon.spriteUrl }])

    this.preview?.destroy()
    this.preview = this.add.image(GAME_W / 2, 230, mon.spriteKey).setScale(0.08).setDepth(12)
    this.tweens.add({
      targets: this.preview,
      scale: 0.42,
      duration: 420,
      ease: 'Back.easeOut',
    })
    this.cameras.main.shake(60, 0.01)
    this.cameras.main.flash(180, 255, 220, 120)
    playCry(mon.cryUrl, 0.55)
    this.status.setText(`${mon.nameFr}\n${starsLabel(1)} · Ton partenaire`)

    makeButton(this, GAME_W / 2, 480, 'Entrer au Centre', {
      tone: 'red',
      fontSize: '18px',
      padX: 24,
      padY: 12,
      onClick: () => goScene(this, 'hub', 0x0a1020),
    }).setDepth(30)
    this.busy = false
  }
}
