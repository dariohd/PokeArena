import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { logout } from '../auth'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { claimMission, fetchMon, loadSave, writeSave } from '../data/pokeapi'
import { GACHA_PITY, MISSION_DEFS, unlockedBanners } from '../data/types'
import { L, drawShell, sectionTitle } from '../layout'
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

/** Home : bannière + pity + Invoquer. Nav = dock (sans doublon Invoc). */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this)
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
      heroScale: 0.48,
    })
    await ensureItemIcons(this, ['pokeball', 'rareCandy', 'potion'])

    drawShell(this, { title: 'Centre', showWallet: true, accent: Theme.red })

    const banners = unlockedBanners(save.unlockedGen)
    const featured = banners[banners.length - 1]
    const pity = featured ? (save.gachaPityByBanner[featured.id] ?? 0) : 0

    const lx = L.pad + 8
    const ly = L.contentY + 40

    sectionTitle(this, lx, ly, 'Bannière active')
    bodyText(this, lx, ly + 28, featured?.nameFr ?? 'Kanto', {
      size: '26px',
      color: '#ffffff',
      origin: 0,
    }).setDepth(20)
    bodyText(this, lx, ly + 62, featured?.gamesFr ?? '', {
      size: '13px',
      origin: 0,
    }).setDepth(20)
    bodyText(this, lx, ly + 96, `Pity 4★  ${pity} / ${GACHA_PITY}`, {
      size: '14px',
      color: 'rgba(255,255,255,0.9)',
      origin: 0,
    }).setDepth(20)

    const barW = 220
    this.add.rectangle(lx + barW / 2, ly + 122, barW, 5, 0x000000, 0.45).setDepth(19)
    this.add
      .rectangle(lx, ly + 122, Math.max(4, (barW * pity) / GACHA_PITY), 5, Theme.gold, 1)
      .setOrigin(0, 0.5)
      .setDepth(20)

    makeButton(this, lx + 90, ly + 170, 'Invoquer', {
      tone: 'gold',
      fontSize: '15px',
      padX: 26,
      padY: 10,
      onClick: () => {
        if (featured) this.scene.start('gacha', { bannerId: featured.id })
        else goScene(this, 'gacha', Theme.gold)
      },
    }).setDepth(22)

    await this.drawTeam(save.team.slice(0, 5), lx, ly + 240)

    const m =
      save.missions.find((x) => {
        const d = MISSION_DEFS.find((dd) => dd.id === x.id)
        return d && x.progress >= x.target && !x.claimed
      }) ?? save.missions[0]
    const def = m ? MISSION_DEFS.find((d) => d.id === m.id) : null
    if (m && def) {
      const claimable = m.progress >= m.target && !m.claimed
      bodyText(
        this,
        GAME_W - L.pad,
        L.contentY + 18,
        `Quête · ${def.title}  ${m.progress}/${m.target}`,
        { size: '12px', origin: 1 },
      ).setDepth(20)
      if (claimable) {
        makeButton(this, GAME_W - L.pad - 50, L.contentY + 48, 'Réclamer', {
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

    this.buildDock(save)
  }

  buildDock(save: ReturnType<typeof loadSave>) {
    const y = L.dockY
    // Pas d’icône Invoc : le CTA Invoquer suffit
    const nav: {
      label: string
      accent: number
      scene: string
      iconKey?: string
      drawIcon?: (g: Phaser.GameObjects.Graphics) => void
    }[] = [
      {
        label: 'Arène',
        accent: Theme.red,
        scene: 'arena',
        drawIcon: (g) => {
          g.fillStyle(0xffffff, 0.95)
          g.fillTriangle(0, -14, -7, 0, 7, 0)
        },
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
          g.fillCircle(-6, -8, 3.5)
          g.fillCircle(6, -8, 3.5)
          g.fillCircle(0, -2, 3.5)
        },
      },
      {
        label: 'Mart',
        accent: Theme.mart,
        scene: 'shop',
        iconKey: itemTextureKey('potion'),
      },
      {
        label: 'Dex',
        accent: Theme.dex,
        scene: 'pokedex',
        drawIcon: (g) => {
          g.fillStyle(0xffffff, 0.95)
          g.fillRoundedRect(-6, -13, 12, 14, 2)
          g.fillStyle(Theme.red, 1)
          g.fillRect(-6, -13, 12, 6)
        },
      },
    ]

    nav.forEach((it, i) => {
      makeDockIcon(this, 56 + i * 56, y, {
        label: it.label,
        accent: it.accent,
        iconKey: it.iconKey,
        drawIcon: it.drawIcon,
        onClick: () => goScene(this, it.scene),
      }).setDepth(102)
    })

    makeDockIcon(this, GAME_W - 148, y, {
      label: save.autoMode ? 'Auto' : 'Manu',
      accent: save.autoMode ? Theme.grassDark : Theme.machine,
      drawIcon: (g) => {
        g.lineStyle(2, 0xffffff, 0.9)
        g.strokeCircle(0, -6, 7)
        g.fillStyle(0xffffff, 0.9)
        g.fillCircle(0, -6, 2.5)
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
        g.fillRect(-7, -10, 4, 8)
        g.fillTriangle(-3, -10, -3, -2, 5, -6)
      },
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(102)

    makeDockIcon(this, GAME_W - 36, y, {
      label: 'Quitter',
      accent: Theme.red,
      drawIcon: (g) => {
        g.lineStyle(2.5, 0xffffff, 0.95)
        g.lineBetween(-6, -12, 6, 0)
        g.lineBetween(6, -12, -6, 0)
      },
      onClick: () => {
        logout()
        window.location.reload()
      },
    }).setDepth(102)
  }

  async drawTeam(
    team: { id: number; level: number; stars: number; shiny?: boolean }[],
    x: number,
    y: number,
  ) {
    if (!team.length) return
    sectionTitle(this, x, y, 'Équipe')
    const mons = await Promise.all(team.map((t) => fetchMon(t.id, { full: false })))
    await ensureTextures(
      this,
      mons.map((m) => ({ key: m.homeKey, url: m.homeUrl })),
    )
    mons.forEach((m, i) => {
      if (!this.textures.exists(m.homeKey)) return
      const img = this.add.image(x + 28 + i * 50, y + 40, m.homeKey).setScale(0.12).setDepth(16)
      if (team[i].shiny) img.setTint(0xfff1a8)
      bodyText(this, x + 28 + i * 50, y + 62, starsLabel(team[i].stars), {
        size: '11px',
        color: hexGold(),
      }).setDepth(17)
    })
  }
}

function hexGold() {
  return `#${Theme.gold.toString(16).padStart(6, '0')}`
}
