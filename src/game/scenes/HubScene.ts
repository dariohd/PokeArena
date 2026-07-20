import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { paintArtBackdrop, placeHeroArt } from '../backdrop'
import { GAME_H, GAME_W } from '../config'
import { claimMission, loadSave, writeSave } from '../data/pokeapi'
import { MISSION_DEFS, formatPokedollars } from '../data/types'
import { Theme } from '../theme'
import { bodyText, fadeIn, goScene, makeButton, makeGlassOrb, titleText } from '../ui'

const NAV = [
  { title: 'Arène', accent: Theme.red, scene: 'arena' },
  { title: 'Bannières', accent: Theme.gold, scene: 'gacha' },
  { title: 'Dojo', accent: Theme.grassDark, scene: 'train' },
  { title: 'Équipe', accent: Theme.blue, scene: 'team' },
  { title: 'Poké Mart', accent: 0xe09030, scene: 'shop' },
  { title: 'Pokédex', accent: 0x48c8e0, scene: 'pokedex' },
]

/** Hub : artwork réel + UI plate. Zéro décor inventé. */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this, 0x0b0d12)
    const save = loadSave()
    const heroId = save.team[0]?.id || save.starterId || 25

    const mon = await paintArtBackdrop(this, heroId, { dim: 0.55, zoom: 1.35, tint: 0xb0b8c8 })
    if (mon) placeHeroArt(this, mon.spriteKey, GAME_W * 0.68, GAME_H * 0.52, 0.58)

    // Barre top plate
    this.add.rectangle(GAME_W / 2, 30, GAME_W, 60, 0x000000, 0.55).setDepth(30)
    titleText(this, 28, 30, 'PokeArena', { size: '20px', color: '#ffffff', origin: 0 }).setDepth(31)
    bodyText(
      this,
      160,
      30,
      `${formatPokedollars(save.coins)}  ·  ${save.inventory.pokeball} Ball  ·  ${save.inventory.rareCandy} SB  ·  R${save.unlockedGen}`,
      { size: '12px', color: 'rgba(255,255,255,0.88)', origin: 0 },
    ).setDepth(31)

    NAV.forEach((n, i) => {
      makeGlassOrb(this, 128, 96 + i * 52, n.title, n.accent, () =>
        goScene(this, n.scene, n.accent),
      ).setDepth(25)
    })

    // Quête une ligne
    const m = save.missions.find((x) => {
      const d = MISSION_DEFS.find((dd) => dd.id === x.id)
      return d && x.progress >= x.target && !x.claimed
    }) ?? save.missions[0]
    const def = m ? MISSION_DEFS.find((d) => d.id === m.id) : null
    if (m && def) {
      this.add.rectangle(GAME_W - 150, GAME_H - 70, 260, 90, 0x000000, 0.55).setDepth(24)
      bodyText(this, GAME_W - 260, GAME_H - 95, def.title, {
        size: '12px',
        color: '#ffffff',
        origin: 0,
        wrap: 230,
      }).setDepth(25)
      bodyText(this, GAME_W - 260, GAME_H - 70, `${m.progress}/${m.target}`, {
        size: '11px',
        color: 'rgba(255,255,255,0.65)',
        origin: 0,
      }).setDepth(25)
      if (m.progress >= m.target && !m.claimed) {
        makeButton(this, GAME_W - 150, GAME_H - 42, 'Réclamer', {
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
        }).setDepth(26)
      }
    }

    makeButton(this, 64, GAME_H - 28, save.autoMode ? 'Auto' : 'Manuel', {
      tone: save.autoMode ? 'green' : 'dark',
      fontSize: '12px',
      padX: 10,
      padY: 6,
      onClick: () => {
        const s = loadSave()
        s.autoMode = !s.autoMode
        writeSave(s)
        this.scene.restart()
      },
    }).setDepth(30)

    makeButton(this, 150, GAME_H - 28, 'Son', {
      tone: 'dark',
      fontSize: '12px',
      padX: 10,
      padY: 6,
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(30)

    makeButton(this, 230, GAME_H - 28, 'Menu', {
      tone: 'red',
      fontSize: '12px',
      padX: 10,
      padY: 6,
      onClick: () => goScene(this, 'title'),
    }).setDepth(30)
  }
}
