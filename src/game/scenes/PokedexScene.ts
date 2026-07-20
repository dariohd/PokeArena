import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, fetchMany, loadSave } from '../data/pokeapi'
import { GEN_MAX_ID, TYPE_FR, type MonSummary } from '../data/types'

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
    this.cameras.main.fadeIn(250, 7, 11, 18)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b12).setOrigin(0)
    const save = loadSave()
    const maxId = GEN_MAX_ID[Math.min(save.unlockedGen, 3)] ?? 151

    this.add
      .text(GAME_W / 2, 32, 'POKÉDEX', {
        fontFamily: 'Bungee, cursive',
        fontSize: '28px',
        color: '#56f0b0',
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_W / 2, 60, `Vus ${save.seen.length} · Capturés ${save.roster.length} · Gen 1–${save.unlockedGen}`, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    // Prefetch current page species (seen get full data; others placeholder)
    await this.loadPage(maxId)

    this.detail = this.add
      .text(620, 120, 'Sélectionne une entrée', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '14px',
        color: '#e8f2ff',
        wordWrap: { width: 300 },
        lineSpacing: 6,
      })

    this.add
      .text(120, 500, '◀ PAGE', {
        fontFamily: 'Bungee, cursive',
        fontSize: '14px',
        color: '#070b12',
        backgroundColor: '#3cf0ff',
        padding: { x: 10, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        this.page = Math.max(0, this.page - 1)
        await this.loadPage(maxId)
      })

    this.add
      .text(280, 500, 'PAGE ▶', {
        fontFamily: 'Bungee, cursive',
        fontSize: '14px',
        color: '#070b12',
        backgroundColor: '#3cf0ff',
        padding: { x: 10, y: 8 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        this.page += 1
        await this.loadPage(maxId)
      })

    this.add
      .text(800, 500, 'RETOUR', {
        fontFamily: 'Bungee, cursive',
        fontSize: '14px',
        color: '#070b12',
        backgroundColor: '#ffc14a',
        padding: { x: 10, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('hub'))
  }

  async loadPage(maxId: number) {
    // Clear previous entry buttons by restarting overlay layer — simple: destroy children tagged
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

    // Only fully fetch seen/caught to save API; unknown show silhouette
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
      const x = 90 + col * 160
      const y = 120 + row * 90
      const knownMon = map.get(id)
      const caught = save.roster.includes(id)
      const seen = save.seen.includes(id) || caught
      const label = seen ? (knownMon?.nameFr ?? `#${id}`) : '???'
      const t = this.add
        .text(x, y, `${String(id).padStart(3, '0')} ${label}${caught ? ' ★' : ''}`, {
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '13px',
          color: seen ? '#e8f2ff' : '#5a6a7a',
          backgroundColor: '#101826',
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
    this.sprite = this.add.image(760, 200, mon.spriteKey).setScale(0.28).setData('dexEntry', true)
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
