import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { fetchMon, fetchMany, loadSave } from '../data/pokeapi'
import { GEN_MAX_ID, TYPE_COLORS, TYPE_FR, type MonSummary } from '../data/types'
import { L, contentCard, drawShell, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, makeButton, typeBadge } from '../ui'

export class PokedexScene extends Phaser.Scene {
  private page = 0
  private pageSize = 9
  private list: MonSummary[] = []
  private detail!: Phaser.GameObjects.Text
  private sprite?: Phaser.GameObjects.Image
  private badges: Phaser.GameObjects.Container[] = []
  private maxId = 151

  constructor() {
    super('pokedex')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    await paintScene(this, BG.dex, { dim: 0.5 })
    const save = loadSave()
    this.maxId = GEN_MAX_ID[save.unlockedGen] ?? 151

    const zone = drawShell(this, { title: 'Pokédex', back: true })
    contentCard(this, zone.x, zone.y, 520, zone.h - 4, { depth: 12 })
    contentCard(this, zone.x + 536, zone.y, zone.w - 536, zone.h - 4, { depth: 12 })

    sectionTitle(this, zone.x + 16, zone.y + 12, `Vus ${save.seen.length} · Capturés ${save.roster.length}`)

    this.detail = this.add
      .text(zone.x + 552, zone.y + 200, 'Sélectionne une entrée', {
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        wordWrap: { width: zone.w - 570 },
        lineSpacing: 4,
      })
      .setDepth(20)

    await this.loadPage()

    makeButton(this, zone.x + 80, L.dockY, '◀', {
      tone: 'blue',
      fontSize: '14px',
      padX: 14,
      padY: 8,
      onClick: async () => {
        this.page = Math.max(0, this.page - 1)
        await this.loadPage()
      },
    }).setDepth(102)

    makeButton(this, zone.x + 160, L.dockY, '▶', {
      tone: 'blue',
      fontSize: '14px',
      padX: 14,
      padY: 8,
      onClick: async () => {
        this.page += 1
        await this.loadPage()
      },
    }).setDepth(102)
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

    const zoneX = 20
    const zoneY = L.contentY

    ids.forEach((id, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = zoneX + 16 + col * 165
      const y = zoneY + 44 + row * 100
      const knownMon = map.get(id)
      const caught = save.roster.includes(id)
      const seen = save.seen.includes(id) || caught

      const card = this.add.container(x, y).setData('dexEntry', true).setDepth(15)
      const g = this.add.graphics()
      g.fillStyle(0x000000, seen ? 0.45 : 0.3)
      g.fillRoundedRect(0, 0, 150, 88, 10)
      g.lineStyle(1, seen ? Theme.red : Theme.muted, 0.9)
      g.strokeRoundedRect(0, 0, 150, 88, 10)
      card.add(g)

      if (seen && knownMon && this.textures.exists(knownMon.homeKey)) {
        const img = this.add.image(36, 44, knownMon.homeKey).setScale(0.11)
        if (!caught) img.setTint(0x333344)
        card.add(img)
      }

      card.add(
        this.add.text(70, 18, String(id).padStart(3, '0'), {
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
        }),
      )
      card.add(
        this.add.text(70, 40, seen ? (knownMon?.nameFr ?? `#${id}`) : '???', {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '13px',
          color: seen ? '#ffffff' : 'rgba(255,255,255,0.4)',
          wordWrap: { width: 70 },
        }),
      )

      if (seen) {
        card.setSize(150, 88)
        card.setInteractive(new Phaser.Geom.Rectangle(0, 0, 150, 88), Phaser.Geom.Rectangle.Contains)
        card.input!.cursor = 'pointer'
        card.on('pointerdown', () => void this.showDetail(id))
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

    this.sprite = this.add
      .image(750, L.contentY + 90, mon.homeKey)
      .setScale(0.28)
      .setData('dexEntry', true)
      .setDepth(16)
    mon.types.forEach((t, i) => {
      const badge = typeBadge(this, 680 + i * 70, L.contentY + 175, TYPE_FR[t] ?? t, TYPE_COLORS[t] ?? Theme.blue)
      badge.setData('dexEntry', true).setDepth(16)
      this.badges.push(badge)
    })

    this.detail.setPosition(576, L.contentY + 200)
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
