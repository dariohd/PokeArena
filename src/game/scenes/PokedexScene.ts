import Phaser from 'phaser'
import { playCry } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { fetchMon, fetchMany, loadSave } from '../data/pokeapi'
import { GEN_MAX_ID, TYPE_COLORS, TYPE_FR, type MonSummary } from '../data/types'
import { L, drawShell, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, makeButton, typeBadge } from '../ui'

export class PokedexScene extends Phaser.Scene {
  private page = 0
  private pageSize = 12
  private list: MonSummary[] = []
  private detail!: Phaser.GameObjects.Text
  private sprite?: Phaser.GameObjects.Image
  private badges: Phaser.GameObjects.Container[] = []
  private maxId = 151
  private listW = 700
  private detailX = 0

  constructor() {
    super('pokedex')
  }

  async create() {
    fadeIn(this, 0x07090e)
    await paintScene(this, BG.dex, { dim: 0.5 })
    const save = loadSave()
    this.maxId = GEN_MAX_ID[save.unlockedGen] ?? 151

    const zone = drawShell(this, { title: 'Pokédex', back: true, accent: Theme.red })
    this.listW = 720
    this.detailX = zone.x + this.listW + 16

    sectionTitle(
      this,
      zone.x,
      zone.y + 4,
      `Vus ${save.seen.length} · Capturés ${save.roster.length}`,
    )

    this.detail = this.add
      .text(this.detailX + 12, zone.y + 220, 'Sélectionne une entrée', {
        fontFamily: '"Nunito", system-ui, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        wordWrap: { width: zone.w - this.listW - 40 },
        lineSpacing: 4,
      })
      .setDepth(20)

    await this.loadPage()

    makeButton(this, zone.x + 90, L.dockY, '◀', {
      tone: 'blue',
      fontSize: '16px',
      padX: 16,
      padY: 10,
      onClick: async () => {
        this.page = Math.max(0, this.page - 1)
        await this.loadPage()
      },
    }).setDepth(102)

    makeButton(this, zone.x + 180, L.dockY, '▶', {
      tone: 'blue',
      fontSize: '16px',
      padX: 16,
      padY: 10,
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

    const zoneX = L.pad
    const zoneY = L.contentY

    ids.forEach((id, i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = zoneX + 18 + col * 172
      const y = zoneY + 48 + row * 120
      const knownMon = map.get(id)
      const caught = save.roster.includes(id)
      const seen = save.seen.includes(id) || caught

      const card = this.add.container(x, y).setData('dexEntry', true).setDepth(15)
      const g = this.add.graphics()
      g.fillStyle(0x000000, seen ? 0.45 : 0.3)
      g.fillRoundedRect(0, 0, 158, 104, 12)
      g.lineStyle(1.5, seen ? Theme.red : Theme.muted, 0.9)
      g.strokeRoundedRect(0, 0, 158, 104, 12)
      card.add(g)

      if (seen && knownMon && this.textures.exists(knownMon.homeKey)) {
        const img = this.add.image(40, 52, knownMon.homeKey).setScale(0.14)
        if (!caught) img.setTint(0x333344)
        card.add(img)
      }

      card.add(
        this.add.text(78, 20, String(id).padStart(3, '0'), {
          fontFamily: '"Nunito", system-ui, sans-serif',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
        }),
      )
      card.add(
        this.add.text(78, 46, seen ? (knownMon?.nameFr ?? `#${id}`) : '???', {
          fontFamily: '"Fredoka", "Nunito", sans-serif',
          fontSize: '14px',
          color: seen ? '#ffffff' : 'rgba(255,255,255,0.4)',
          wordWrap: { width: 72 },
        }),
      )

      if (seen) {
        card.setSize(158, 104)
        card.setInteractive(new Phaser.Geom.Rectangle(0, 0, 158, 104), Phaser.Geom.Rectangle.Contains)
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

    const cx = this.detailX + (GAME_W - L.pad - this.detailX) / 2
    this.sprite = this.add
      .image(cx, L.contentY + 110, mon.homeKey)
      .setScale(0.36)
      .setData('dexEntry', true)
      .setDepth(16)
    mon.types.forEach((t, i) => {
      const badge = typeBadge(
        this,
        cx - 40 + i * 80,
        L.contentY + 210,
        TYPE_FR[t] ?? t,
        TYPE_COLORS[t] ?? Theme.blue,
      )
      badge.setData('dexEntry', true).setDepth(16)
      this.badges.push(badge)
    })

    this.detail.setPosition(this.detailX + 20, L.contentY + 250)
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
