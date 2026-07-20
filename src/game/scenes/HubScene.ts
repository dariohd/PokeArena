import Phaser from 'phaser'
import { toggleMute } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { claimMission, fetchMon, loadSave, writeSave } from '../data/pokeapi'
import { MISSION_DEFS, formatPokedollars } from '../data/types'
import { spawnAmbientSparkles } from '../fx'
import { Theme } from '../theme'
import {
  bodyText,
  drawCinematicLobby,
  ensureTextures,
  fadeIn,
  goScene,
  makeButton,
  makeGlassOrb,
  titleText,
} from '../ui'

/**
 * Hub style gacha premium (inspiré Brave Souls) :
 * artwork HQ full-bleed + orbes menu glossy + HUD ressources.
 */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub')
  }

  async create() {
    fadeIn(this, 0x0a1020)
    drawCinematicLobby(this)
    spawnAmbientSparkles(this, 28, 0xa8d0ff)

    const save = loadSave()
    const heroId = save.team[0]?.id || save.starterId || 25
    const mon = await fetchMon(heroId, { full: false }).catch(() => null)

    if (mon) {
      await ensureTextures(this, [{ key: mon.spriteKey, url: mon.spriteUrl }])
      if (this.textures.exists(mon.spriteKey)) {
        // Glow derrière le héros
        const glow = this.add.circle(GAME_W * 0.62, GAME_H * 0.52, 160, Theme.blue, 0.18).setDepth(4)
        this.tweens.add({
          targets: glow,
          alpha: 0.32,
          scale: 1.12,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })

        const hero = this.add
          .image(GAME_W * 0.62, GAME_H * 0.48, mon.spriteKey)
          .setScale(0.55)
          .setDepth(8)
          .setAlpha(0)
        this.tweens.add({
          targets: hero,
          alpha: 1,
          scale: 0.62,
          duration: 650,
          ease: 'Cubic.easeOut',
        })
        this.tweens.add({
          targets: hero,
          y: hero.y - 12,
          duration: 2600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })

        // Reflet sol
        const mirror = this.add
          .image(GAME_W * 0.62, GAME_H * 0.86, mon.spriteKey)
          .setScale(0.62, -0.22)
          .setAlpha(0.12)
          .setDepth(7)

        bodyText(this, GAME_W * 0.62, GAME_H - 36, mon.nameFr, {
          size: '14px',
          color: 'rgba(255,255,255,0.7)',
        }).setDepth(20)

        void mirror
      }
    }

    // HUD top glass
    const hud = this.add.graphics().setDepth(30)
    hud.fillStyle(0x000000, 0.45)
    hud.fillRoundedRect(16, 12, GAME_W - 32, 44, 14)
    hud.lineStyle(1, 0xffffff, 0.18)
    hud.strokeRoundedRect(16, 12, GAME_W - 32, 44, 14)

    titleText(this, 36, 34, 'PokeArena', {
      size: '18px',
      color: '#ffffff',
      origin: 0,
    }).setDepth(31)

    bodyText(
      this,
      200,
      34,
      `${formatPokedollars(save.coins)}   ·   ${save.inventory.pokeball} Ball   ·   ${save.inventory.rareCandy} SB   ·   R${save.unlockedGen}`,
      { size: '12px', color: 'rgba(255,255,255,0.85)', origin: 0 },
    ).setDepth(31)

    // Menu orbes gauche
    const nav = [
      { title: 'Arène', accent: Theme.red, scene: 'arena' },
      { title: 'Bannières', accent: Theme.gold, scene: 'gacha' },
      { title: 'Dojo', accent: Theme.grassDark, scene: 'train' },
      { title: 'Équipe', accent: Theme.blue, scene: 'team' },
      { title: 'Poké Mart', accent: 0xe09030, scene: 'shop' },
      { title: 'Pokédex', accent: 0x48c8e0, scene: 'pokedex' },
    ]

    nav.forEach((n, i) => {
      const orb = makeGlassOrb(this, 130, 100 + i * 54, n.title, n.accent, () =>
        goScene(this, n.scene, n.accent),
      )
      orb.setDepth(25)
      orb.setAlpha(0)
      this.tweens.add({
        targets: orb,
        alpha: 1,
        x: 140,
        duration: 280,
        delay: 80 + i * 45,
        ease: 'Cubic.easeOut',
      })
    })

    // Quêtes compactes (bas droite)
    const qPanel = this.add.graphics().setDepth(24)
    qPanel.fillStyle(0x000000, 0.4)
    qPanel.fillRoundedRect(GAME_W - 290, GAME_H - 150, 270, 120, 14)
    qPanel.lineStyle(1, 0xffffff, 0.15)
    qPanel.strokeRoundedRect(GAME_W - 290, GAME_H - 150, 270, 120, 14)

    bodyText(this, GAME_W - 155, GAME_H - 132, 'Quêtes', {
      size: '13px',
      color: '#ffd070',
    }).setDepth(25)

    const claimable = save.missions.find((m) => {
      const def = MISSION_DEFS.find((d) => d.id === m.id)
      return def && m.progress >= m.target && !m.claimed
    })
    const first = claimable ?? save.missions[0]
    const def = first ? MISSION_DEFS.find((d) => d.id === first.id) : null
    if (first && def) {
      bodyText(this, GAME_W - 275, GAME_H - 108, def.title, {
        size: '11px',
        color: '#ffffff',
        origin: 0,
        wrap: 240,
      }).setDepth(25)
      bodyText(
        this,
        GAME_W - 275,
        GAME_H - 82,
        `${first.progress}/${first.target}`,
        { size: '11px', color: 'rgba(255,255,255,0.65)', origin: 0 },
      ).setDepth(25)

      if (first.progress >= first.target && !first.claimed) {
        makeButton(this, GAME_W - 155, GAME_H - 52, 'Réclamer', {
          tone: 'gold',
          fontSize: '12px',
          padX: 12,
          padY: 6,
          onClick: () => {
            const next = claimMission(loadSave(), first.id)
            if (!next) return
            writeSave(next)
            this.scene.restart()
          },
        }).setDepth(26)
      }
    }

    // Footer controls
    makeButton(this, 70, GAME_H - 28, save.autoMode ? 'Auto' : 'Manuel', {
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

    makeButton(this, 160, GAME_H - 28, save.mute ? 'Son' : 'Son', {
      tone: 'dark',
      fontSize: '12px',
      padX: 10,
      padY: 6,
      onClick: () => {
        toggleMute()
        this.scene.restart()
      },
    }).setDepth(30)

    makeButton(this, 250, GAME_H - 28, 'Menu', {
      tone: 'red',
      fontSize: '12px',
      padX: 10,
      padY: 6,
      onClick: () => goScene(this, 'title'),
    }).setDepth(30)
  }
}
