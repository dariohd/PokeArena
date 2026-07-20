import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, fetchMany, loadSave } from '../data/pokeapi'
import { GEN_MAX_ID, TYPE_FR, type MonSummary } from '../data/types'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'

export class PokedexScene extends Phaser.Scene {
  private page = 0
  private pageSize = 12
  private list: MonSummary[] = []
  private detail!: Phaser.GameObjects.Text
  private sprite?: Phaser.GameObjects.Image

  constructor() {
    super('pokedex')
  }

  async create() {
    this.cameras.main.fadeIn(250, 126, 200, 227)
    const g = this.add.graphics()
    g.fillGradientStyle(Theme.skyTop, Theme.skyTop, Theme.skyBot, Theme.skyBot, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)
    g.fillStyle(Theme.panel, 1)
    g.fillRoundedRect(40, 90, 520, 380, 12)
    g.lineStyle(4, Theme.red, 1)
    g.strokeRoundedRect(40, 90, 520, 380, 12)
    g.fillStyle(Theme.panel, 1)
    g.fillRoundedRect(580, 90, 340, 380, 12)
    g.lineStyle(4, Theme.blue, 1)
    g.strokeRoundedRect(580, 90, 340, 380, 12)

    const save = loadSave()
    const maxId = GEN_MAX_ID[save.unlockedGen] ?? 151

    this.add
      .text(GAME_W / 2, 28, 'Pokédex', {
        fontFamily: FONT_TITLE,
        fontSize: '28px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 58, `Vus ${save.seen.length} · Capturés ${save.roster.length} · Gen 1–${save.unlockedGen}`, {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#6a6a7a',
      })
      .setOrigin(0.5)

    await this.loadPage(maxId)

    this.detail = this.add.text(600, 110, 'Sélectionne une entrée', {
      fontFamily: FONT_UI,
      fontSize: '13px',
      color: '#2a2a3a',
      wordWrap: { width: 300 },
      lineSpacing: 5,
    })

    this.add
      .text(120, 500, '◀ Page', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#3090e0',
        padding: { x: 10, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        this.page = Math.max(0, this.page - 1)
        await this.loadPage(maxId)
      })

    this.add
      .text(280, 500, 'Page ▶', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#3090e0',
        padding: { x: 10, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        this.page += 1
        await this.loadPage(maxId)
      })

    this.add
      .text(800, 500, 'Retour', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#e03028',
        padding: { x: 10, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('hub'))
  }

  async loadPage(maxId: number) {
    this.children.getAll().forEach((c) => {
      if (c.getData?.('dexEntry')) c.destroy()
    })

    const save = loadSave()
    const start = this.page * this.pageSize + 1
    if (start > maxId) {
      this.page = Math.max(0, this.page - 1)
      return
    }
    const ids = Array.from({ length: this.pageSize }, (_, i) => start + i).filter((id) => id <= maxId)

    const known = ids.filter((id) => save.seen.includes(id) || save.roster.includes(id))
    const mons = known.length ? await fetchMany(known) : []
    const map = new Map(mons.map((m) => [m.id, m]))

    for (const m of mons) {
      if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
    }
    if (this.load.list.size > 0) {
      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.start()
      })
    }

    ids.forEach((id, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 60 + col * 160
      const y = 110 + row * 85
      const knownMon = map.get(id)
      const caught = save.roster.includes(id)
      const seen = save.seen.includes(id) || caught
      const label = seen ? (knownMon?.nameFr ?? `#${id}`) : '???'
      const t = this.add
        .text(x, y, `${String(id).padStart(3, '0')} ${label}${caught ? ' ★' : ''}`, {
          fontFamily: FONT_UI,
          fontSize: '12px',
          color: seen ? '#2a2a3a' : '#6a6a7a',
          backgroundColor: seen ? '#fff8f0' : '#e8d8c8',
          padding: { x: 8, y: 8 },
        })
        .setData('dexEntry', true)
      if (seen) {
        t.setInteractive({ useHandCursor: true })
        t.on('pointerdown', () => void this.showDetail(id))
      }
    })

    this.list = mons
  }

  async showDetail(id: number) {
    const mon = await fetchMon(id)
    if (!this.textures.exists(mon.spriteKey)) {
      await new Promise<void>((resolve) => {
        this.load.image(mon.spriteKey, mon.spriteUrl)
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.start()
      })
    }
    this.sprite?.destroy()
    this.sprite = this.add.image(750, 200, mon.spriteKey).setScale(0.28).setData('dexEntry', true)
    const types = mon.types.map((t) => TYPE_FR[t] ?? t).join(' / ')
    const moves = mon.moves.map((m) => m.nameFr).join(', ')
    this.detail.setText(
      `${mon.nameFr} · ${mon.genusFr}\n` +
        `Types ${types}\n` +
        `Talent ${mon.abilityNameFr}\n` +
        `PV ${mon.hp}  Atk ${mon.atk}  Déf ${mon.def}\n` +
        `AtqSp ${mon.spa}  DéfSp ${mon.spd}  Vit ${mon.spe}\n` +
        `Capture ${mon.captureRate}\n` +
        `Attaques : ${moves}\n\n` +
        mon.flavorFr,
    )
    playCry(mon.cryUrl, 0.4)
  }
}
