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
import {
  bodyText,
  ensureItemIcons,
  ensureTextures,
  fadeIn,
  goScene,
  itemTextureKey,
  makeButton,
  makeDockIcon,
  starsLabel,
} from '../ui'

/**
 * Home : une composition.
 * Héros + bannière · dock icônes.
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
    await ensureItemIcons(this, ['pokeball', 'rareCandy', 'potion'])

    drawShell(this, { title: 'Centre', back: false, showWallet: true, accent: Theme.red })

    const banners = unlockedBanners(save.unlockedGen)
    const featured = banners[banners.length - 1]
    const pity = featured ? (save.gachaPityByBanner[featured.id] ?? 0) : 0

    const lx = L.pad + 8
    const ly = L.contentY + 36

    bodyText(this, lx, ly, 'Bannière', {
      size: '12px',
      color: 'rgba(232,185,35,0.95)',
      origin: 0,
    }).setDepth(20)

    bodyText(this, lx, ly + 28, featured?.nameFr ?? 'Kanto', {
      size: '26px',
      color: '#ffffff',
      origin: 0,
    }).setDepth(20)

    bodyText(this, lx, ly + 64, featured?.gamesFr ?? '', {
      size: '13px',
      color: 'rgba(255,255,255,0.65)',
      origin: 0,
    }).setDepth(20)

    bodyText(this, lx, ly + 96, `Pity 4★  ${pity} / ${GACHA_PITY}`, {
      size: '14px',
      color: 'rgba(255,255,255,0.88)',
      origin: 0,
    }).setDepth(20)

    const barW = 220
    this.add.rectangle(lx + barW / 2, ly + 124, barW, 5, 0x000000, 0.45).setDepth(19)
    this.add
      .rectangle(lx, ly + 124, Math.max(4, (barW * pity) / GACHA_PITY), 5, Theme.gold, 1)
      .setOrigin(0, 0.5)
      .setDepth(20)

    makeButton(this, lx + 90, ly + 172, 'Invoquer', {
      tone: 'gold',
      fontSize: '15px',
      padX: 26,
      padY: 10,
      onClick: () => {
        if (featured) this.scene.start('gacha', { bannerId: featured.id })
        else goScene(this, 'gacha', Theme.gold)
      },
    }).setDepth(22)

    makeButton(this, lx + 90, ly + 222, 'Combattre', {
      tone: 'red',
      fontSize: '13px',
      padX: 20,
      padY: 8,
      onClick: () => goScene(this, 'arena', Theme.red),
    }).setDepth(22)

    await this.drawTeamQuiet(save.team.slice(0, 5), lx, ly + 280)

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

    this.buildIconDock(save)
  }

  buildIconDock(save: ReturnType<typeof loadSave>) {
    const y = L.dockY
    const startX = 56
    const gap = 56

    const items: {
      label: string
      accent: number
      scene?: string
      iconKey?: string
      drawIcon?: (g: Phaser.GameObjects.Graphics) => void
      onClick?: () => void
    }[] = [
      {
        label: 'Arène',
        accent: Theme.red,
        scene: 'arena',
        drawIcon: (g) => {
          g.lineStyle(2.5, 0xffffff, 0.95)
          g.strokeTriangle(0, -14, -8, 0, 8, 0)
          g.fillStyle(0xffffff, 0.9)
          g.fillTriangle(0, -12, -6, -1, 6, -1)
        },
      },
      {
        label: 'Invoc',
        accent: Theme.gold,
        scene: 'gacha',
        iconKey: itemTextureKey('pokeball'),
      },
      {
        label: 'Dojo',
        accent: Theme.grassDark,
        scene: 'train',
        iconKey: itemTextureKey('rareCandy'),
      },
      {
        label: 'Équipe',
        accent: Theme.blue,
        scene: 'team',
        drawIcon: (g) => {
          g.fillStyle(0xffffff, 0.95)
          g.fillCircle(-7, -8, 4)
          g.fillCircle(7, -8, 4)
          g.fillCircle(0, -2, 4)
        },
      },
      {
        label: 'Mart',
        accent: 0xe09030,
        scene: 'shop',
        iconKey: itemTextureKey('potion'),
      },
      {
        label: 'Dex',
        accent: 0x48c8e0,
        scene: 'pokedex',
        drawIcon: (g) => {
          g.fillStyle(0xffffff, 0.95)
          g.fillRoundedRect(-7, -14, 14, 16, 2)
          g.fillStyle(Theme.red, 1)
          g.fillRect(-7, -14, 14, 7)
        },
      },
    ]

    items.forEach((it, i) => {
      makeDockIcon(this, startX + i * gap, y, {
        label: it.label,
        accent: it.accent,
        iconKey: it.iconKey,
        drawIcon: it.drawIcon,
        onClick: () => goScene(this, it.scene!),
      }).setDepth(102)
    })

    // Options à droite (toujours compact)
    makeDockIcon(this, GAME_W - 148, y, {
      label: save.autoMode ? 'Auto' : 'Manu',
      accent: save.autoMode ? Theme.grassDark : Theme.machine,
      drawIcon: (g) => {
        g.fillStyle(0xffffff, 0.9)
        g.fillCircle(0, -6, 3)
        g.lineStyle(2, 0xffffff, 0.9)
        g.strokeCircle(0, -6, 8)
      },
      onClick: () => {
        const s = loadSave()
        s.autoMode = !s.autoMode
        writeSave(s)
        this.scene.restart()
      },
    }).setDepth(102)

    makeDockIcon(this, GAME_W - 92, y, {
      label: 'Son',
      accent: Theme.machine,
      drawIcon: (g) => {
        g.fillStyle(0xffffff, 0.9)
        g.fillTriangle(-6, -6, -6, -6, 2, -12)
        g.fillRect(-8, -10, 4, 8)
        g.lineStyle(1.5, 0xffffff, 0.8)
        g.beginPath()
        g.arc(2, -6, 6, -0.6, 0.6, false)
        g.strokePath()
      },
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(102)

    makeDockIcon(this, GAME_W - 36, y, {
      label: 'Menu',
      accent: Theme.red,
      drawIcon: (g) => {
        g.lineStyle(2.5, 0xffffff, 0.95)
        g.lineBetween(-7, -12, 7, -12)
        g.lineBetween(-7, -6, 7, -6)
        g.lineBetween(-7, 0, 7, 0)
      },
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
