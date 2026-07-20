import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { claimMission, fetchMon, loadSave, writeSave } from '../data/pokeapi'
import { MISSION_DEFS, unlockedBanners } from '../data/types'
import { heroGlowRing } from '../fx'
import { L, contentCard, drawShell, listRow, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, goScene, makeButton, starsLabel } from '../ui'

const NAV = [
  { title: 'Arène', sub: 'Combats & loot', accent: Theme.red, scene: 'arena' },
  { title: 'Bannières', sub: 'x1 / x10 · pity 50', accent: Theme.gold, scene: 'gacha' },
  { title: 'Dojo', sub: 'Super Bonbons', accent: Theme.grassDark, scene: 'train' },
  { title: 'Équipe', sub: 'Roster & PC', accent: Theme.blue, scene: 'team' },
  { title: 'Poké Mart', sub: 'Balls & soins', accent: 0xe09030, scene: 'shop' },
  { title: 'Pokédex', sub: 'Espèces vues', accent: 0x48c8e0, scene: 'pokedex' },
]

/** Home gacha : héros + nav + équipe + quête */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this, 0x07090e)
    const save = loadSave()
    const heroId = save.team[0]?.id || save.starterId || 25
    const hx = GAME_W * 0.68
    const hy = L.contentCenterY + 20

    await paintScene(this, BG.hub, {
      dim: 0.32,
      heroId,
      heroKind: 'home',
      heroX: hx,
      heroY: hy,
      heroScale: 0.58,
    })
    heroGlowRing(this, hx, hy + 120, Theme.gold)

    drawShell(this, { title: 'Centre Pokémon', back: false, showWallet: true, accent: Theme.red })

    // Nav gauche
    const navW = 320
    contentCard(this, L.pad, L.contentY, navW, L.contentH - 8, { depth: 12, accent: Theme.red })
    sectionTitle(this, L.pad + 18, L.contentY + 16, 'Destination')

    NAV.forEach((n, i) => {
      listRow(this, L.pad + 14, L.contentY + 46 + i * 72, navW - 28, 62, {
        title: n.title,
        sub: n.sub,
        accent: n.accent,
        onClick: () => goScene(this, n.scene, n.accent),
        depth: 14,
        delay: 40 + i * 45,
      })
    })

    // Bandeau équipe sous le héros
    await this.drawTeamStrip(save.team.slice(0, 6))

    // Bannière featured
    const banners = unlockedBanners(save.unlockedGen)
    const featured = banners[banners.length - 1]
    if (featured) {
      const pity = save.gachaPityByBanner[featured.id] ?? 0
      const bx = GAME_W - L.pad - 340
      const by = L.contentY + 12
      contentCard(this, bx, by, 340, 120, { accent: featured.color, depth: 12 })
      sectionTitle(this, bx + 16, by + 14, 'Bannière active')
      bodyText(this, bx + 16, by + 44, featured.nameFr, {
        size: '18px',
        color: '#ffffff',
        origin: 0,
      }).setDepth(20)
      bodyText(this, bx + 16, by + 72, `${featured.gamesFr} · Pity ${pity}/50`, {
        size: '12px',
        color: 'rgba(255,255,255,0.65)',
        origin: 0,
      }).setDepth(20)
      makeButton(this, bx + 250, by + 88, 'Invoquer', {
        tone: 'gold',
        fontSize: '13px',
        padX: 12,
        padY: 6,
        onClick: () => goScene(this, 'gacha', Theme.gold),
      }).setDepth(22)
    }

    // Quête
    const m =
      save.missions.find((x) => {
        const d = MISSION_DEFS.find((dd) => dd.id === x.id)
        return d && x.progress >= x.target && !x.claimed
      }) ?? save.missions[0]
    const def = m ? MISSION_DEFS.find((d) => d.id === m.id) : null
    if (m && def) {
      const qx = GAME_W - L.pad - 340
      const qy = L.contentY + L.contentH - 118
      contentCard(this, qx, qy, 340, 110, { accent: Theme.gold, depth: 12 })
      sectionTitle(this, qx + 16, qy + 14, 'Quête du jour')
      bodyText(this, qx + 16, qy + 42, def.title, {
        size: '13px',
        color: '#ffffff',
        origin: 0,
        wrap: 300,
      }).setDepth(20)
      bodyText(this, qx + 16, qy + 74, `${m.progress} / ${m.target}`, {
        size: '13px',
        color: 'rgba(255,255,255,0.7)',
        origin: 0,
      }).setDepth(20)
      if (m.progress >= m.target && !m.claimed) {
        makeButton(this, qx + 270, qy + 78, 'OK', {
          tone: 'gold',
          fontSize: '12px',
          padX: 12,
          padY: 6,
          onClick: () => {
            const next = claimMission(loadSave(), m.id)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        }).setDepth(22)
      }
    }

    // Dock
    makeButton(this, 100, L.dockY, save.autoMode ? 'Auto ON' : 'Auto OFF', {
      tone: save.autoMode ? 'green' : 'dark',
      fontSize: '14px',
      padX: 14,
      padY: 10,
      onClick: () => {
        const s = loadSave()
        s.autoMode = !s.autoMode
        writeSave(s)
        this.scene.restart()
      },
    }).setDepth(102)

    makeButton(this, 230, L.dockY, save.mute ? 'Son OFF' : 'Son ON', {
      tone: 'dark',
      fontSize: '14px',
      padX: 14,
      padY: 10,
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(102)

    makeButton(this, 350, L.dockY, 'Menu', {
      tone: 'red',
      fontSize: '14px',
      padX: 14,
      padY: 10,
      onClick: () => goScene(this, 'title'),
    }).setDepth(102)
  }

  async drawTeamStrip(
    team: { id: number; level: number; stars: number; shiny?: boolean }[],
  ) {
    if (!team.length) return
    const stripY = L.contentY + L.contentH - 100
    const stripX = L.pad + 340
    const stripW = 360
    contentCard(this, stripX, stripY, stripW, 92, { depth: 12 })
    sectionTitle(this, stripX + 14, stripY + 10, 'Équipe')

    const mons = await Promise.all(team.map((t) => fetchMon(t.id, { full: false })))
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )

    mons.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      const x = stripX + 48 + i * 56
      const img = this.add
        .image(x, stripY + 58, m.homeKey)
        .setScale(0.12)
        .setDepth(16)
        .setAlpha(0)
      if (team[i].shiny) img.setTint(0xfff1a8)
      this.tweens.add({
        targets: img,
        alpha: 1,
        scale: 0.16,
        duration: 280,
        delay: 80 + i * 50,
        ease: 'Back.easeOut',
      })
      bodyText(this, x, stripY + 82, starsLabel(team[i].stars), {
        size: '10px',
        color: '#e8b923',
      }).setDepth(17)
    })
  }
}
