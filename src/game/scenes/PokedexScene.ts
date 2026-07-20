import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMon, fetchMany, loadSave } from '../data/pokeapi'
import { GEN_MAX_ID, TYPE_COLORS, TYPE_FR, type MonSummary } from '../data/types'
import { L, drawShell, sectionTitle, slotFrame } from '../layout'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, makeButton, typeBadge } from '../ui'

export class PokedexScene extends Phaser.Scene {
  private page = 0
  private pageSize = 12
  private list: MonSummary[] = []
  private detail!: Phaser.GameObjects.Text
  private sprite?: Phaser.GameObjects.Image
  private badges: Phaser.GameObjects.Container[] = []
  private maxId = 151
  private listW = 720
  private detailX = 0

  constructor() {
    super('pokedex')
  }

  async create() {
    fadeIn(this)
    await paintScene(this, BG.dex, { dim: 0.5 })
    const save = loadSave()
    this.maxId = GEN_MAX_ID[save.unlockedGen] ?? 151

    const zone = drawShell(this, { title: 'Pokédex', back: true, accent: Theme.red })
    this.listW = 720
    this.detailX = zone.x + this.listW + 16

    sectionTitle(this, zone.x, zone.y + 4, `Vus ${save.seen.length} · Capturés ${save.roster.length}`)

    this.detail = this.add
      .text(this.detailX + 12, zone.y + 220, 'Sélectionne une entrée', {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: '#ffffff',
        wordWrap: { width: zone.w - this.listW - 40 },
        lineSpacing: 4,
      })
      .setDepth(20)

    await this.loadPage()

    const cy = L.contentY + L.contentH - 28
    makeButton(this, zone.x + 60, cy, 'Préc.', {
      tone: 'blue',
      fontSize: '13px',
      padX: 14,
      padY: 8,
      onClick: async () => {
        this.page = Math.max(0, this.page - 1)
        await this.loadPage()
      },
    }).setDepth(22)

    makeButton(this, zone.x + 150, cy, 'Suiv.', {
      tone: 'blue',
      fontSize: '13px',
      padX: 14,
      padY: 8,
      onClick: async () => {
        this.page += 1
        await this.loadPage()
      },
    }).setDepth(22)
  }

  async loadPage() {
    this.children.getAll().forEach((c) => {
      if (c.getData?.('dexEntry')) c.destroy()
    })

    const save = loadSave()
    const start = this.page * this.pageSize + 1
    if (start > this.maxId) {
      this.page = Math.max(0, this.page - 1)
      return
    }
    const ids = Array.from({ length: this.pageSize }, (_, i) => start + i).filter((id) => id <= this.maxId)
    const known = ids.filter((id) => save.seen.includes(id) || save.roster.includes(id))
    const mons = known.length ? await fetchMany(known) : []
    const map = new Map(mons.map((m) => [m.id, m]))
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )

    ids.forEach((id, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = L.pad + 80 + col * 170
      const y = L.contentY + 90 + row * 110
      const knownMon = map.get(id)
      const caught = save.roster.includes(id)
      const seen = save.seen.includes(id) || caught

      slotFrame(this, x, y, 150, 90, seen ? Theme.red : Theme.muted).setData('dexEntry', true)

      if (seen && knownMon && this.textures.exists(knownMon.homeKey)) {
        const img = this.add
          .image(x - 40, y, knownMon.homeKey)
          .setScale(0.12)
          .setData('dexEntry', true)
          .setDepth(15)
        if (!caught) img.setTint(0x333344)
      }

      this.add
        .text(x + 10, y - 22, String(id).padStart(3, '0'), {
          fontFamily: FONT_UI,
          fontSize: '11px',
          color: 'rgba(255,255,255,0.45)',
        })
        .setData('dexEntry', true)
        .setDepth(15)

      this.add
        .text(x + 10, y + 2, seen ? (knownMon?.nameFr ?? `#${id}`) : '???', {
          fontFamily: FONT_TITLE,
          fontSize: '13px',
          color: seen ? '#ffffff' : 'rgba(255,255,255,0.4)',
          wordWrap: { width: 70 },
        })
        .setData('dexEntry', true)
        .setDepth(15)

      if (seen) {
        this.add
          .zone(x, y, 150, 90)
          .setInteractive({ useHandCursor: true })
          .setData('dexEntry', true)
          .on('pointerdown', () => void this.showDetail(id))
      }
    })

    this.list = mons
  }

  async showDetail(id: number) {
    const mon = await fetchMon(id)
    await ensureTextures(this, [{ key: mon.homeKey, url: mon.homeUrl }])
    this.sprite?.destroy()
    this.badges.forEach((b) => b.destroy())
    this.badges = []

    const cx = this.detailX + (GAME_W - L.pad - this.detailX) / 2
    this.sprite = this.add
      .image(cx, L.contentY + 100, mon.homeKey)
      .setScale(0.32)
      .setData('dexEntry', true)
      .setDepth(16)
    mon.types.forEach((t, i) => {
      const badge = typeBadge(
        this,
        cx - 36 + i * 72,
        L.contentY + 190,
        TYPE_FR[t] ?? t,
        TYPE_COLORS[t] ?? Theme.blue,
      )
      badge.setData('dexEntry', true).setDepth(16)
      this.badges.push(badge)
    })

    this.detail.setPosition(this.detailX + 12, L.contentY + 230)
    this.detail.setText(
      `${mon.nameFr} · ${mon.genusFr}\n` +
        `Talent ${mon.abilityNameFr}\n` +
        `PV ${mon.hp}  Atk ${mon.atk}  Déf ${mon.def}\n` +
        `AtqSp ${mon.spa}  DéfSp ${mon.spd}  Vit ${mon.spe}\n\n` +
        mon.flavorFr,
    )
    playCry(mon.cryUrl, 0.4)
  }
}
