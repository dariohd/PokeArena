import Phaser from 'phaser'
import { playCry } from '../audio'
import { paintArtBackdrop } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMon, fetchMany, loadSave } from '../data/pokeapi'
import { GEN_MAX_ID, TYPE_COLORS, TYPE_FR, type MonSummary } from '../data/types'
import { Theme } from '../theme'
import {
  bodyText,
  ensureTextures,
  fadeIn,
  hexCss,
  makeBackButton,
  makeButton,
  titleText,
  typeBadge,
} from '../ui'

export class PokedexScene extends Phaser.Scene {
  private page = 0
  private pageSize = 12
  private list: MonSummary[] = []
  private detail!: Phaser.GameObjects.Text
  private sprite?: Phaser.GameObjects.Image
  private badges: Phaser.GameObjects.Container[] = []

  constructor() {
    super('pokedex')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    await paintArtBackdrop(this, 151, { dim: 0.7, zoom: 1.15, tint: 0x707888 })
    const save = loadSave()
    const maxId = GEN_MAX_ID[save.unlockedGen] ?? 151

    titleText(this, GAME_W / 2, 28, 'Pokédex', { size: '26px', color: '#ffffff' }).setDepth(20)
    bodyText(
      this,
      GAME_W / 2,
      54,
      `Vus ${save.seen.length} · Capturés ${save.roster.length} · Gen 1–${save.unlockedGen}`,
      { size: '12px', color: 'rgba(255,255,255,0.7)' },
    ).setDepth(20)

    this.add.rectangle(300, 270, 520, 380, 0x000000, 0.55).setDepth(10)
    this.add.rectangle(750, 270, 340, 380, 0x000000, 0.55).setDepth(10)

    await this.loadPage(maxId)

    this.detail = this.add
      .text(600, 250, 'Sélectionne une entrée', {
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        wordWrap: { width: 300 },
        lineSpacing: 5,
      })
      .setDepth(20)

    makeButton(this, 120, 500, '◀ Page', {
      tone: 'blue',
      fontSize: '14px',
      padX: 12,
      padY: 8,
      onClick: async () => {
        this.page = Math.max(0, this.page - 1)
        await this.loadPage(maxId)
      },
    }).setDepth(30)
    makeButton(this, 280, 500, 'Page ▶', {
      tone: 'blue',
      fontSize: '14px',
      padX: 12,
      padY: 8,
      onClick: async () => {
        this.page += 1
        await this.loadPage(maxId)
      },
    }).setDepth(30)
    makeBackButton(this).setDepth(30)
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

    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.spriteKey, url: m.spriteUrl })),
    )

    ids.forEach((id, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 60 + col * 165
      const y = 100 + row * 88
      const knownMon = map.get(id)
      const caught = save.roster.includes(id)
      const seen = save.seen.includes(id) || caught

      const card = this.add.container(x, y).setData('dexEntry', true).setDepth(15)
      const g = this.add.graphics()
      g.fillStyle(0x000000, seen ? 0.55 : 0.35)
      g.fillRoundedRect(0, 0, 150, 76, 8)
      g.lineStyle(1, seen ? Theme.red : Theme.muted, 1)
      g.strokeRoundedRect(0, 0, 150, 76, 8)
      card.add(g)

      if (seen && knownMon && this.textures.exists(knownMon.spriteKey)) {
        const img = this.add.image(32, 38, knownMon.spriteKey).setScale(0.09)
        if (!caught) img.setTint(0x333344)
        card.add(img)
      }

      card.add(
        this.add.text(58, 14, String(id).padStart(3, '0'), {
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
        }),
      )
      card.add(
        this.add.text(58, 34, seen ? (knownMon?.nameFr ?? `#${id}`) : '???', {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '13px',
          color: seen ? '#ffffff' : 'rgba(255,255,255,0.4)',
          wordWrap: { width: 85 },
        }),
      )

      if (seen) {
        card.setSize(150, 76)
        card.setInteractive(new Phaser.Geom.Rectangle(0, 0, 150, 76), Phaser.Geom.Rectangle.Contains)
        card.input!.cursor = 'pointer'
        card.on('pointerdown', () => void this.showDetail(id))
      }
    })

    this.list = mons
  }

  async showDetail(id: number) {
    const mon = await fetchMon(id)
    await ensureTextures(this, [{ key: mon.spriteKey, url: mon.spriteUrl }])
    this.sprite?.destroy()
    this.badges.forEach((b) => b.destroy())
    this.badges = []

    this.sprite = this.add.image(750, 170, mon.spriteKey).setScale(0.26).setData('dexEntry', true).setDepth(16)
    mon.types.forEach((t, i) => {
      const badge = typeBadge(this, 660 + i * 70, 250, TYPE_FR[t] ?? t, TYPE_COLORS[t] ?? Theme.blue)
      badge.setData('dexEntry', true).setDepth(16)
      this.badges.push(badge)
    })

    const moves = mon.moves.map((m) => m.nameFr).join(', ')
    this.detail.setPosition(600, 275)
    this.detail.setText(
      `${mon.nameFr} · ${mon.genusFr}\n` +
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
