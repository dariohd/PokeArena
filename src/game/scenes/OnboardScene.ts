import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

/**
 * Guide rapide + première invocation gratuite
 * (Bulbizarre / Salamèche / Carapuce).
 */
export class OnboardScene extends Phaser.Scene {
  private step = 0
  private busy = false
  private status!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image

  constructor() {
    super('onboard')
  }

  create() {
    this.step = 0
    this.busy = false
    this.cameras.main.fadeIn(200, 126, 200, 227)
    this.drawBg()
    this.showGuide()
  }

  drawBg() {
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
  }

  clearUi() {
    this.children.removeAll(true)
    this.preview = undefined
    this.drawBg()
  }

  showGuide() {
    this.clearUi()
    this.add
      .text(GAME_W / 2, 40, 'Bienvenue dresseur', {
        fontFamily: FONT_TITLE,
        fontSize: '30px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    const tips = [
      { t: '1 · Centre Pokémon', d: 'Hub : arène, bannières, dojo, mart.' },
      { t: '2 · Bannières', d: '1 Poké Ball = 1 tirage. x10 = un 3★ garanti.' },
      { t: '3 · Raretés', d: 'Stade 1/2/3 = ★/★★/★★★. Légendaire = ★★★★.' },
      { t: '4 · Pity', d: 'Compteur affiché : 4★ garanti à 50 tirages.' },
    ]

    tips.forEach((tip, i) => {
      const y = 110 + i * 70
      this.add.rectangle(GAME_W / 2, y, 640, 58, Theme.panel).setStrokeStyle(3, Theme.red)
      this.add
        .text(GAME_W / 2 - 300, y - 14, tip.t, {
          fontFamily: FONT_TITLE,
          fontSize: '16px',
          color: '#e03028',
        })
      this.add
        .text(GAME_W / 2 - 300, y + 8, tip.d, {
          fontFamily: FONT_UI,
          fontSize: '13px',
          color: '#2a2a3a',
        })
    })

    const cta = this.add
      .text(GAME_W / 2, 480, 'Première invocation', {
        fontFamily: FONT_TITLE,
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    cta.on('pointerdown', () => this.showFirstPull())
  }

  showFirstPull() {
    this.clearUi()
    this.add
      .text(GAME_W / 2, 36, 'Invocation de départ', {
        fontFamily: FONT_TITLE,
        fontSize: '28px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 72, 'Starter garanti : Bulbizarre · Salamèche · Carapuce', {
        fontFamily: FONT_UI,
        fontSize: '14px',
        color: '#6a6a7a',
      })
      .setOrigin(0.5)

    this.add.rectangle(GAME_W / 2, 230, 260, 240, 0xfff8f0).setStrokeStyle(4, 0xe03028)

    this.status = this.add
      .text(GAME_W / 2, 390, 'Tire ton premier partenaire (gratuit)', {
        fontFamily: FONT_UI,
        fontSize: '15px',
        color: '#2a2a3a',
        align: 'center',
      })
      .setOrigin(0.5)

    const pull = this.add
      .text(GAME_W / 2, 460, 'Invoquer', {
        fontFamily: FONT_TITLE,
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#9b59d0',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    pull.on('pointerdown', () => void this.doStarterPull(pull))
  }

  async doStarterPull(btn: Phaser.GameObjects.Text) {
    if (this.busy) return
    this.busy = true
    btn.disableInteractive()
    this.status.setText('…')

    const save = loadSave()
    const res = pullStarterTrio(save)
    writeSave(res.save)

    const mon = await fetchMon(res.id, { full: true })
    if (!this.textures.exists(mon.spriteKey)) {
      await new Promise<void>((resolve) => {
        this.load.image(mon.spriteKey, mon.spriteUrl)
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
        this.load.start()
      })
    }

    this.preview?.destroy()
    this.preview = this.add.image(GAME_W / 2, 220, mon.spriteKey).setScale(0.12)
    this.tweens.add({ targets: this.preview, scale: 0.32, duration: 220, ease: 'Back.easeOut' })
    this.cameras.main.shake(40, 0.008)
    playCry(mon.cryUrl, 0.5)
    this.status.setText(`${mon.nameFr}\n★ · Ton premier partenaire`)

    const go = this.add
      .text(GAME_W / 2, 500, 'Entrer au Centre', {
        fontFamily: FONT_TITLE,
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#58a038',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    go.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 126, 200, 227)
      this.time.delayedCall(220, () => this.scene.start('hub'))
    })
    this.busy = false
  }
}
