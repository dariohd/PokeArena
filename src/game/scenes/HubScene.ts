import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { claimMission, fetchMon, loadSave, writeSave } from '../data/pokeapi'
import { GACHA_PITY, MISSION_DEFS, unlockedBanners } from '../data/types'
import { heroGlowRing } from '../fx'
import { L, drawShell } from '../layout'
import { Theme } from '../theme'
import { bodyText, ensureTextures, fadeIn, goScene, makeButton, starsLabel } from '../ui'

const DOCK_NAV = [
  { label: 'Arène', scene: 'arena', tone: 'red' as const },
  { label: 'Bannières', scene: 'gacha', tone: 'gold' as const },
  { label: 'Dojo', scene: 'train', tone: 'green' as const },
  { label: 'Équipe', scene: 'team', tone: 'blue' as const },
  { label: 'Mart', scene: 'shop', tone: 'dark' as const },
  { label: 'Dex', scene: 'pokedex', tone: 'dark' as const },
]

/**
 * Home : une composition.
 * Héros + bannière (pity + CTA) · nav secondaire au dock.
 */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this, 0x07090e)
    const save = loadSave()
    const heroId = save.team[0]?.id || save.starterId || 25
    const hx = GAME_W * 0.7
    const hy = L.contentCenterY + 8

    await paintScene(this, BG.hub, {
      dim: 0.34,
      heroId,
      heroKind: 'home',
      heroX: hx,
      heroY: hy,
      heroScale: 0.5,
    })
    heroGlowRing(this, hx, hy + 110, Theme.gold)

    drawShell(this, { title: 'Centre', back: false, showWallet: true, accent: Theme.red })

    const banners = unlockedBanners(save.unlockedGen)
    const featured = banners[banners.length - 1]
    const pity = featured ? (save.gachaPityByBanner[featured.id] ?? 0) : 0

    // Colonne gauche : info bannière (pas de grosse carte)
    const lx = L.pad + 8
    const ly = L.contentY + 36

    bodyText(this, lx, ly, 'Bannière', {
      size: '12px',
      color: 'rgba(232,185,35,0.95)',
      origin: 0,
    }).setDepth(20)

    bodyText(this, lx, ly + 28, featured?.nameFr ?? 'Kanto', {
      size: '28px',
      color: '#ffffff',
      origin: 0,
    }).setDepth(20)

    bodyText(this, lx, ly + 68, featured?.gamesFr ?? '', {
      size: '13px',
      color: 'rgba(255,255,255,0.65)',
      origin: 0,
    }).setDepth(20)

    bodyText(this, lx, ly + 100, `Pity 4★  ${pity} / ${GACHA_PITY}`, {
      size: '14px',
      color: 'rgba(255,255,255,0.88)',
      origin: 0,
    }).setDepth(20)

    // Barre pity
    const barW = 220
    const barBg = this.add.rectangle(lx + barW / 2, ly + 128, barW, 6, 0x000000, 0.45).setDepth(19)
    this.add
      .rectangle(lx, ly + 128, Math.max(4, (barW * pity) / GACHA_PITY), 6, Theme.gold, 1)
      .setOrigin(0, 0.5)
      .setDepth(20)
    void barBg

    makeButton(this, lx + 90, ly + 180, 'Invoquer', {
      tone: 'gold',
      fontSize: '16px',
      padX: 28,
      padY: 10,
      onClick: () => {
        if (featured) this.scene.start('gacha', { bannerId: featured.id })
        else goScene(this, 'gacha', Theme.gold)
      },
    }).setDepth(22)

    makeButton(this, lx + 90, ly + 230, 'Combattre', {
      tone: 'red',
      fontSize: '14px',
      padX: 22,
      padY: 8,
      onClick: () => goScene(this, 'arena', Theme.red),
    }).setDepth(22)

    // Équipe : miniatures discrètes
    await this.drawTeamQuiet(save.team.slice(0, 5), lx, ly + 290)

    // Quête : une ligne, pas une carte
    const m =
      save.missions.find((x) => {
        const d = MISSION_DEFS.find((dd) => dd.id === x.id)
        return d && x.progress >= x.target && !x.claimed
      }) ?? save.missions[0]
    const def = m ? MISSION_DEFS.find((d) => d.id === m.id) : null
    if (m && def) {
      const qx = GAME_W - L.pad
      const claimable = m.progress >= m.target && !m.claimed
      bodyText(this, qx, L.contentY + 20, `Quête · ${def.title}  ${m.progress}/${m.target}`, {
        size: '12px',
        color: 'rgba(255,255,255,0.7)',
        origin: 1,
      }).setDepth(20)
      if (claimable) {
        makeButton(this, qx - 36, L.contentY + 48, 'OK', {
          tone: 'gold',
          fontSize: '11px',
          padX: 10,
          padY: 4,
          onClick: () => {
            const next = claimMission(loadSave(), m.id)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        }).setDepth(22)
      }
    }

    // Dock : nav secondaire compacte + options
    const navX = [64, 148, 240, 330, 412, 488]
    DOCK_NAV.forEach((n, i) => {
      makeButton(this, navX[i], L.dockY, n.label, {
        tone: n.tone,
        fontSize: '12px',
        padX: 10,
        padY: 7,
        onClick: () => goScene(this, n.scene),
      }).setDepth(102)
    })

    makeButton(this, GAME_W - 210, L.dockY, save.autoMode ? 'Auto' : 'Manu', {
      tone: save.autoMode ? 'green' : 'dark',
      fontSize: '12px',
      padX: 10,
      padY: 7,
      onClick: () => {
        const s = loadSave()
        s.autoMode = !s.autoMode
        writeSave(s)
        this.scene.restart()
      },
    }).setDepth(102)

    makeButton(this, GAME_W - 130, L.dockY, 'Son', {
      tone: 'dark',
      fontSize: '12px',
      padX: 10,
      padY: 7,
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(102)

    makeButton(this, GAME_W - 52, L.dockY, 'Menu', {
      tone: 'red',
      fontSize: '12px',
      padX: 10,
      padY: 7,
      onClick: () => goScene(this, 'title'),
    }).setDepth(102)
  }

  async drawTeamQuiet(
    team: { id: number; level: number; stars: number; shiny?: boolean }[],
    x: number,
    y: number,
  ) {
    if (!team.length) return
    bodyText(this, x, y, 'Équipe', {
      size: '11px',
      color: 'rgba(255,255,255,0.5)',
      origin: 0,
    }).setDepth(20)

    const mons = await Promise.all(team.map((t) => fetchMon(t.id, { full: false })))
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )

    mons.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      const img = this.add
        .image(x + 28 + i * 48, y + 36, m.homeKey)
        .setScale(0.11)
        .setDepth(16)
        .setAlpha(0.95)
      if (team[i].shiny) img.setTint(0xfff1a8)
      bodyText(this, x + 28 + i * 48, y + 58, starsLabel(team[i].stars), {
        size: '9px',
        color: '#e8b923',
      }).setDepth(17)
    })
  }
}
