import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { ensureTypeChart, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { STARTERS, TYPE_FR, defaultOwned, type MonSummary } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class SelectScene extends Phaser.Scene {
  private mons: MonSummary[] = []
  private selected = 0
  private cards: Phaser.GameObjects.Container[] = []
  private info!: Phaser.GameObjects.Text
  private preview?: Phaser.GameObjects.Image
  private previewFrame!: Phaser.GameObjects.Rectangle
  private loadingText!: Phaser.GameObjects.Text
  private ready = false
  private confirming = false

  constructor() {
    super('select')
  }

  create() {
    this.ready = false
    this.confirming = false
    this.mons = []
    this.cards = []
    this.selected = 0

    this.cameras.main.fadeIn(250, 126, 200, 227)
    this.drawBg()

    this.add
      .text(GAME_W / 2, 28, 'Choisis ton starter !', {
        fontFamily: FONT_TITLE,
        fontSize: '28px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.loadingText = this.add
      .text(GAME_W / 2, GAME_H / 2, 'Chargement des Pokémon…', {
        fontFamily: FONT_UI,
        fontSize: '18px',
        color: '#6a6a7a',
      })
      .setOrigin(0.5)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
    void this.bootSelect()
  }

  cleanup() {
    this.input.keyboard?.off('keydown-ENTER')
    this.input.keyboard?.off('keydown-LEFT')
    this.input.keyboard?.off('keydown-RIGHT')
    this.input.keyboard?.off('keydown-UP')
    this.input.keyboard?.off('keydown-DOWN')
  }

  drawBg() {
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.grass, 1)
    g.fillRect(0, GAME_H - 90, GAME_W, 90)
    g.fillStyle(Theme.grassDark, 1)
    for (let x = 0; x < GAME_W; x += 24) {
      g.fillTriangle(x, GAME_H - 90, x + 12, GAME_H - 108, x + 24, GAME_H - 90)
    }
  }

  async bootSelect() {
    try {
      void ensureTypeChart()
      this.mons = await fetchMany(STARTERS, { full: false })
      if (!this.mons.length) throw new Error('Aucun starter')

      for (const m of this.mons) {
        if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
        if (!this.textures.exists(m.battleKey)) this.load.image(m.battleKey, m.battleUrl)
      }
      if (this.load.list.size > 0) {
        await new Promise<void>((resolve) => {
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
          this.load.start()
        })
      }

      this.loadingText.destroy()
      this.buildUi()
      this.ready = true
      this.highlight(0)
      playCry(this.mons[0].cryUrl, 0.3)
    } catch (e) {
      console.warn(e)
      this.loadingText.setText('Erreur réseau PokéAPI.\nRéessaie dans un instant.')
      this.time.delayedCall(1800, () => this.scene.restart())
    }
  }

  buildUi() {
    const cols = 4
    const startX = 90
    const startY = 100
    const gapX = 115
    const gapY = 120

    this.mons.forEach((mon, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      this.cards.push(this.makeCard(startX + col * gapX, startY + row * gapY, mon, i))
    })

    // Preview panel (Pokémon-style white card)
    this.previewFrame = this.add
      .rectangle(700, 220, 280, 300, Theme.panel)
      .setStrokeStyle(4, Theme.red)
    this.add
      .rectangle(700, 90, 280, 36, Theme.red)
      .setStrokeStyle(0)
    this.add
      .text(700, 90, 'APERÇU', {
        fontFamily: FONT_TITLE,
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.info = this.add
      .text(700, 360, '', {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#2a2a3a',
        align: 'center',
        wordWrap: { width: 250 },
      })
      .setOrigin(0.5, 0)

    const go = this.add
      .text(GAME_W / 2, 500, 'C’est parti !', {
        fontFamily: FONT_TITLE,
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    go.on('pointerover', () => go.setScale(1.05))
    go.on('pointerout', () => go.setScale(1))
    go.on('pointerdown', () => this.confirm())

    this.input.keyboard?.on('keydown-ENTER', () => this.confirm())
    this.input.keyboard?.on('keydown-LEFT', () => this.moveSel(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSel(1))
    this.input.keyboard?.on('keydown-UP', () => this.moveSel(-cols))
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSel(cols))
  }

  makeCard(x: number, y: number, mon: MonSummary, index: number) {
    const bg = this.add.rectangle(0, 0, 100, 108, Theme.panel).setStrokeStyle(3, mon.color)
    const img = this.textures.exists(mon.battleKey)
      ? this.add.image(0, -8, mon.battleKey).setScale(1.7)
      : this.add.circle(0, -8, 24, mon.color)
    const name = this.add
      .text(0, 40, mon.nameFr, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: '#2a2a3a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const c = this.add.container(x, y, [bg, img, name]).setSize(100, 108)
    c.setInteractive(new Phaser.Geom.Rectangle(-50, -54, 100, 108), Phaser.Geom.Rectangle.Contains)
    c.on('pointerdown', () => {
      if (!this.ready) return
      this.selected = index
      this.highlight(index)
      playCry(mon.cryUrl, 0.35)
    })
    return c
  }

  moveSel(delta: number) {
    if (!this.ready || !this.mons.length) return
    this.selected = Phaser.Math.Clamp(this.selected + delta, 0, this.mons.length - 1)
    this.highlight(this.selected)
    playCry(this.mons[this.selected].cryUrl, 0.28)
  }

  highlight(i: number) {
    if (!this.mons[i]) return
    this.cards.forEach((c, idx) => {
      const bg = c.list[0] as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(idx === i ? 4 : 3, idx === i ? Theme.red : this.mons[idx].color)
      c.setScale(idx === i ? 1.08 : 1)
      c.setDepth(idx === i ? 20 : 10)
    })

    const mon = this.mons[i]
    this.preview?.destroy()
    if (this.textures.exists(mon.spriteKey)) {
      this.preview = this.add.image(700, 200, mon.spriteKey).setScale(0.32).setDepth(15)
    } else if (this.textures.exists(mon.battleKey)) {
      this.preview = this.add.image(700, 200, mon.battleKey).setScale(3.2).setDepth(15)
    }

    const types = mon.types.map((t) => TYPE_FR[t] ?? t).join(' / ')
    this.info.setText(
      `${mon.nameFr}\n${mon.genusFr}\n${types}\nTalent : ${mon.abilityNameFr}\nPV ${mon.hp} · Atk ${mon.atk} · Déf ${mon.def}\nVit ${mon.spe}`,
    )
  }

  confirm() {
    if (!this.ready || this.confirming || !this.mons[this.selected]) return
    this.confirming = true
    const mon = this.mons[this.selected]
    const save = loadSave()
    save.starterId = mon.id
    save.roster = [mon.id]
    save.seen = [mon.id]
    save.team = [defaultOwned(mon.id, 12)]
    save.box = []
    writeSave(save)
    playCry(mon.cryUrl, 0.45)
    this.cameras.main.fadeOut(280, 126, 200, 227)
    this.time.delayedCall(300, () => this.scene.start('hub'))
  }
}
