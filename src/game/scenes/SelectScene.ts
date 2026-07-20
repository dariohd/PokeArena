import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { STARTERS, type MonSummary } from '../data/types'

export class SelectScene extends Phaser.Scene {
  private mons: MonSummary[] = []
  private selected = 0
  private cards: Phaser.GameObjects.Container[] = []

  constructor() {
    super('select')
  }

  async create() {
    this.cameras.main.fadeIn(300, 7, 11, 18)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b12).setOrigin(0)

    this.add
      .text(GAME_W / 2, 48, 'CHOISIS TA FIGURINE', {
        fontFamily: 'Bungee, cursive',
        fontSize: '32px',
        color: '#ffc14a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 86, 'Stats & sprites live · génération 1–3', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '14px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    this.mons = await fetchMany(STARTERS)
    for (const m of this.mons) {
      if (!this.textures.exists(m.spriteKey)) {
        this.load.image(m.spriteKey, m.spriteUrl)
      }
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.start()
      })
    }

    const cols = 6
    const startX = 110
    const startY = 170
    const gapX = 140
    const gapY = 150

    this.mons.forEach((mon, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * gapX
      const y = startY + row * gapY
      const card = this.makeCard(x, y, mon, i)
      this.cards.push(card)
    })

    this.highlight(0)

    const go = this.add
      .text(GAME_W / 2, 500, 'ENTRER DANS L’ARÈNE', {
        fontFamily: 'Bungee, cursive',
        fontSize: '22px',
        color: '#070b12',
        backgroundColor: '#3cf0ff',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    go.on('pointerdown', () => this.confirm())
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm())
    this.input.keyboard?.on('keydown-LEFT', () => this.moveSel(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSel(1))
    this.input.keyboard?.on('keydown-UP', () => this.moveSel(-cols))
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSel(cols))
  }

  makeCard(x: number, y: number, mon: MonSummary, index: number) {
    const bg = this.add.rectangle(0, 0, 120, 128, 0x101826).setStrokeStyle(2, mon.color, 0.7)
    const img = this.textures.exists(mon.spriteKey)
      ? this.add.image(0, -8, mon.spriteKey).setScale(0.22)
      : this.add.circle(0, -8, 28, mon.color)
    const name = this.add
      .text(0, 46, mon.name, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '12px',
        color: '#e8f2ff',
      })
      .setOrigin(0.5)
    const c = this.add.container(x, y, [bg, img, name]).setSize(120, 128)
    c.setInteractive(
      new Phaser.Geom.Rectangle(-60, -64, 120, 128),
      Phaser.Geom.Rectangle.Contains,
    )
    c.on('pointerdown', () => {
      this.selected = index
      this.highlight(index)
    })
    return c
  }

  moveSel(delta: number) {
    this.selected = Phaser.Math.Clamp(this.selected + delta, 0, this.mons.length - 1)
    this.highlight(this.selected)
  }

  highlight(i: number) {
    this.cards.forEach((c, idx) => {
      const bg = c.list[0] as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(idx === i ? 3 : 2, idx === i ? 0xffc14a : this.mons[idx].color, idx === i ? 1 : 0.55)
      c.setScale(idx === i ? 1.08 : 1)
    })
  }

  confirm() {
    const mon = this.mons[this.selected]
    const save = loadSave()
    save.starterId = mon.id
    save.roster = [...new Set([mon.id, ...save.roster])]
    writeSave(save)
    this.cameras.main.fadeOut(250, 7, 11, 18)
    this.time.delayedCall(260, () => this.scene.start('arena'))
  }
}
