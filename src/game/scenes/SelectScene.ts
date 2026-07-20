import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { ensureTypeChart, fetchMany, loadSave, writeSave } from '../data/pokeapi'
import { STARTERS, TYPE_FR, defaultOwned, type MonSummary } from '../data/types'

export class SelectScene extends Phaser.Scene {
  private mons: MonSummary[] = []
  private selected = 0
  private cards: Phaser.GameObjects.Container[] = []
  private info!: Phaser.GameObjects.Text

  constructor() {
    super('select')
  }

  async create() {
    this.cameras.main.fadeIn(300, 7, 11, 18)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b12).setOrigin(0)
    void ensureTypeChart()

    this.add
      .text(GAME_W / 2, 40, 'CHOISIS TON STARTER', {
        fontFamily: 'Bungee, cursive',
        fontSize: '28px',
        color: '#ffc14a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 74, 'Noms FR · types · talents · stats PokéAPI', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    this.mons = await fetchMany(STARTERS)
    for (const m of this.mons) {
      if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.start()
      })
    }

    const cols = 7
    const startX = 80
    const startY = 140
    const gapX = 120
    const gapY = 130

    this.mons.forEach((mon, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const card = this.makeCard(startX + col * gapX, startY + row * gapY, mon, i)
      this.cards.push(card)
    })

    this.info = this.add
      .text(GAME_W / 2, 420, '', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color: '#e8f2ff',
        align: 'center',
      })
      .setOrigin(0.5)

    this.highlight(0)

    const go = this.add
      .text(GAME_W / 2, 500, 'ENTRER AU CENTRE', {
        fontFamily: 'Bungee, cursive',
        fontSize: '20px',
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
    const bg = this.add.rectangle(0, 0, 108, 118, 0x101826).setStrokeStyle(2, mon.color, 0.7)
    const img = this.textures.exists(mon.spriteKey)
      ? this.add.image(0, -10, mon.spriteKey).setScale(0.2)
      : this.add.circle(0, -10, 26, mon.color)
    const name = this.add
      .text(0, 42, mon.nameFr, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '11px',
        color: '#e8f2ff',
      })
      .setOrigin(0.5)
    const c = this.add.container(x, y, [bg, img, name]).setSize(108, 118)
    c.setInteractive(new Phaser.Geom.Rectangle(-54, -59, 108, 118), Phaser.Geom.Rectangle.Contains)
    c.on('pointerdown', () => {
      this.selected = index
      this.highlight(index)
      playCry(mon.cryUrl, 0.35)
    })
    return c
  }

  moveSel(delta: number) {
    this.selected = Phaser.Math.Clamp(this.selected + delta, 0, this.mons.length - 1)
    this.highlight(this.selected)
    playCry(this.mons[this.selected].cryUrl, 0.3)
  }

  highlight(i: number) {
    this.cards.forEach((c, idx) => {
      const bg = c.list[0] as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(idx === i ? 3 : 2, idx === i ? 0xffc14a : this.mons[idx].color, idx === i ? 1 : 0.55)
      c.setScale(idx === i ? 1.08 : 1)
    })
    const mon = this.mons[i]
    const types = mon.types.map((t) => TYPE_FR[t] ?? t).join(' / ')
    this.info.setText(
      `${mon.nameFr} · ${mon.genusFr}\n${types} · Talent ${mon.abilityNameFr}\nPV ${mon.hp}  Atk ${mon.atk}  Déf ${mon.def}  AtqSp ${mon.spa}  DéfSp ${mon.spd}  Vit ${mon.spe}`,
    )
  }

  confirm() {
    const mon = this.mons[this.selected]
    const save = loadSave()
    save.starterId = mon.id
    save.roster = [mon.id]
    save.seen = [mon.id]
    save.team = [defaultOwned(mon.id, 8)]
    save.box = []
    writeSave(save)
    playCry(mon.cryUrl, 0.45)
    this.cameras.main.fadeOut(250, 7, 11, 18)
    this.time.delayedCall(260, () => this.scene.start('hub'))
  }
}
