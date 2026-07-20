import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_W } from '../config'
import { fetchMon, loadSave, pullStarterTrio, writeSave } from '../data/pokeapi'
import { Theme } from '../theme'
import {
  bodyText,
  drawPanel,
  drawPokeBall,
  drawRoom,
  ensureTextures,
  fadeIn,
  goScene,
  hexCss,
  makeButton,
  starsLabel,
  titleText,
} from '../ui'

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
    this.showGuide()
  }

  clearUi() {
    this.children.removeAll(true)
    this.preview = undefined
  }

  showGuide() {
    this.clearUi()
    drawRoom(this, 'centre')
    titleText(this, GAME_W / 2, 28, 'Bienvenue dresseur', { size: '28px', color: '#ffffff' })

    const tips = [
      { t: 'Centre Pokémon', d: 'Hub : arène, bannières, dojo, mart.' },
      { t: 'Bannières', d: '1 Poké Ball = 1 tirage. x10 = un 3★ garanti.' },
      { t: 'Raretés', d: 'Stade 1/2/3 = ★/★★/★★★. Légendaire = ★★★★.' },
      { t: 'Pity', d: 'Compteur affiché : 4★ garanti à 50 tirages.' },
    ]

    tips.forEach((tip, i) => {
      const y = 90 + i * 72
      drawPanel(this, GAME_W / 2 - 320, y, 640, 60, { stroke: Theme.red, radius: 12 })
      this.add.text(GAME_W / 2 - 300, y + 10, `${i + 1} · ${tip.t}`, {
        fontFamily: '"Fredoka", "Nunito", sans-serif',
        fontSize: '15px',
        color: hexCss(Theme.red),
      })
      bodyText(this, GAME_W / 2 - 300, y + 34, tip.d, {
        size: '13px',
        color: hexCss(Theme.ink),
        origin: 0,
      })
    })

    makeButton(this, GAME_W / 2, 480, 'Première invocation', {
      tone: 'red',
      fontSize: '18px',
      padX: 24,
      padY: 12,
      onClick: () => this.showFirstPull(),
    })
  }

  showFirstPull() {
    this.clearUi()
    drawRoom(this, 'machine', Theme.red)
    titleText(this, GAME_W / 2, 28, 'Invocation de départ', { size: '26px', color: '#ffd070' })
    bodyText(this, GAME_W / 2, 58, 'Starter garanti : Bulbizarre · Salamèche · Carapuce', {
      size: '13px',
      color: '#d0d8e8',
    })

    drawPanel(this, GAME_W / 2 - 130, 100, 260, 250, { stroke: Theme.red, radius: 16 })
    const ball = drawPokeBall(this, GAME_W / 2, 220, 28)
    this.tweens.add({
      targets: ball,
      angle: 12,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.status = bodyText(this, GAME_W / 2, 380, 'Tire ton premier partenaire (gratuit)', {
      size: '15px',
      color: '#ffffff',
      align: 'center',
    })

    makeButton(this, GAME_W / 2, 450, 'Invoquer', {
      tone: 'gold',
      fontSize: '20px',
      padX: 28,
      padY: 12,
      onClick: () => void this.doStarterPull(),
    })
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
    this.preview = this.add.image(GAME_W / 2, 220, mon.spriteKey).setScale(0.1)
    this.tweens.add({ targets: this.preview, scale: 0.3, duration: 280, ease: 'Back.easeOut' })
    this.cameras.main.shake(50, 0.01)
    playCry(mon.cryUrl, 0.5)
    this.status.setText(`${mon.nameFr}\n${starsLabel(1)} · Ton premier partenaire`)

    makeButton(this, GAME_W / 2, 490, 'Entrer au Centre', {
      tone: 'green',
      fontSize: '17px',
      padX: 20,
      padY: 10,
      onClick: () => goScene(this, 'hub'),
    })
    this.busy = false
  }
}
