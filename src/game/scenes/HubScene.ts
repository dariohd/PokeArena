import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { BG } from '../assets'
import { paintScene } from '../backdrop'
import { GAME_W } from '../config'
import { claimMission, loadSave, writeSave } from '../data/pokeapi'
import { MISSION_DEFS } from '../data/types'
import { L, contentCard, drawShell, listRow, sectionTitle } from '../layout'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton } from '../ui'

const NAV = [
  { title: 'Arène', sub: 'Combats & loot', accent: Theme.red, scene: 'arena' },
  { title: 'Bannières', sub: 'x1 / x10 · pity 50', accent: Theme.gold, scene: 'gacha' },
  { title: 'Dojo', sub: 'Super Bonbons', accent: Theme.grassDark, scene: 'train' },
  { title: 'Équipe', sub: 'Roster & PC', accent: Theme.blue, scene: 'team' },
  { title: 'Poké Mart', sub: 'Balls & soins', accent: 0xe09030, scene: 'shop' },
  { title: 'Pokédex', sub: 'Espèces vues', accent: 0x48c8e0, scene: 'pokedex' },
]

/** Home gacha : héros + nav gauche + quêtes + dock */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    const save = loadSave()
    const heroId = save.team[0]?.id || save.starterId || 25

    await paintScene(this, BG.hub, {
      dim: 0.28,
      heroId,
      heroKind: 'home',
      heroX: GAME_W * 0.62,
      heroY: L.contentCenterY + 10,
      heroScale: 0.48,
    })

    drawShell(this, { title: 'Centre Pokémon', back: false, showWallet: true })

    // Colonne nav gauche
    contentCard(this, L.pad, L.contentY, 280, L.contentH - 8, { depth: 12 })
    sectionTitle(this, L.pad + 16, L.contentY + 14, 'Destination')

    NAV.forEach((n, i) => {
      listRow(this, L.pad + 12, L.contentY + 40 + i * 58, 256, 52, {
        title: n.title,
        sub: n.sub,
        accent: n.accent,
        onClick: () => goScene(this, n.scene, n.accent),
        depth: 14,
      })
    })

    // Quête (carte droite basse)
    const m =
      save.missions.find((x) => {
        const d = MISSION_DEFS.find((dd) => dd.id === x.id)
        return d && x.progress >= x.target && !x.claimed
      }) ?? save.missions[0]
    const def = m ? MISSION_DEFS.find((d) => d.id === m.id) : null
    if (m && def) {
      const qx = GAME_W - L.pad - 300
      const qy = L.contentY + L.contentH - 110
      contentCard(this, qx, qy, 300, 100, { accent: Theme.gold, depth: 12 })
      sectionTitle(this, qx + 14, qy + 12, 'Quête du jour')
      bodyText(this, qx + 14, qy + 40, def.title, {
        size: '12px',
        color: '#ffffff',
        origin: 0,
        wrap: 270,
      }).setDepth(20)
      bodyText(this, qx + 14, qy + 68, `${m.progress} / ${m.target}`, {
        size: '12px',
        color: 'rgba(255,255,255,0.7)',
        origin: 0,
      }).setDepth(20)
      if (m.progress >= m.target && !m.claimed) {
        makeButton(this, qx + 230, qy + 72, 'OK', {
          tone: 'gold',
          fontSize: '12px',
          padX: 10,
          padY: 5,
          onClick: () => {
            const next = claimMission(loadSave(), m.id)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        }).setDepth(22)
      }
    }

    // Dock actions
    makeButton(this, 90, L.dockY, save.autoMode ? 'Auto ON' : 'Auto OFF', {
      tone: save.autoMode ? 'green' : 'dark',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => {
        const s = loadSave()
        s.autoMode = !s.autoMode
        writeSave(s)
        this.scene.restart()
      },
    }).setDepth(102)

    makeButton(this, 210, L.dockY, save.mute ? 'Son OFF' : 'Son ON', {
      tone: 'dark',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(102)

    makeButton(this, 320, L.dockY, 'Menu', {
      tone: 'red',
      fontSize: '13px',
      padX: 12,
      padY: 8,
      onClick: () => goScene(this, 'title'),
    }).setDepth(102)
  }
}
