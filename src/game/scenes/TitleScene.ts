import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, loadSave, resetProgress, writeSave } from '../data/pokeapi'
import { emptyInventory, defaultMissions, emptyPity, formatPokedollars } from '../data/types'
import { spawnAmbientSparkles, spawnDriftClouds } from '../fx'
import { Theme } from '../theme'
import {
  bodyText,
  ensureTextures,
  fadeIn,
  goScene,
  makeButton,
  titleText,
} from '../ui'

/**
 * Lobby gacha 2D : hero full-bleed (artwork), brand, 1 CTA.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  async create() {
    const save = loadSave()
    fadeIn(this, 0x1a3a5c)
    this.drawLobbyBg()
    spawnDriftClouds(this, 3)
    spawnAmbientSparkles(this, 22, 0xfff8e0)

    const heroId = save.team[0]?.id || save.starterId || 25
    const mon = await fetchMon(heroId, { full: false }).catch(() => null)
    if (mon) {
      await ensureTextures(this, [{ key: mon.spriteKey, url: mon.spriteUrl }])
      if (this.textures.exists(mon.spriteKey)) {
        const hero = this.add
          .image(GAME_W * 0.72, GAME_H * 0.58, mon.spriteKey)
          .setScale(0.42)
          .setAlpha(0)
          .setDepth(8)
        this.tweens.add({
          targets: hero,
          alpha: 1,
          scale: 0.48,
          duration: 700,
          ease: 'Cubic.easeOut',
        })
        this.tweens.add({
          targets: hero,
          y: hero.y - 10,
          duration: 2200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    }

    // Brand block (gauche / centre) — une composition
    titleText(this, 48, 120, 'PokeArena', {
      size: '64px',
      color: '#ffffff',
      origin: 0,
    }).setDepth(20).setStroke('#e3350d', 6)

    bodyText(this, 52, 188, 'Gacha · Arène · Évolution', {
      size: '18px',
      color: '#fff8e0',
      origin: 0,
    }).setDepth(20)

    bodyText(
      this,
      52,
      230,
      'Invoque, combat en 2.5D,\nmonte ton équipe.',
      { size: '16px', color: 'rgba(255,251,245,0.88)', origin: 0, align: 'left' },
    ).setDepth(20)

    const hasSave = Boolean(save.starterId && save.team.length)
    makeButton(this, 170, 320, hasSave ? 'Continuer' : 'Nouvelle partie', {
      tone: 'red',
      fontSize: '22px',
      padX: 34,
      padY: 14,
      onClick: () => goScene(this, hasSave ? 'hub' : 'onboard', Theme.red),
    }).setDepth(30)

    if (hasSave) {
      makeButton(this, 170, 380, 'Recommencer', {
        tone: 'ghost',
        fontSize: '13px',
        padX: 16,
        padY: 8,
        onClick: () => {
          resetProgress()
          writeSave({
            version: 4,
            starterId: 0,
            roster: [],
            team: [],
            box: [],
            seen: [],
            coins: 3000,
            bestWave: 0,
            runs: 0,
            inventory: emptyInventory(),
            unlockedGen: 1,
            mute: save.mute,
            autoMode: false,
            gachaPityByBanner: emptyPity(),
            missions: defaultMissions(),
            lastMissionDay: new Date().toISOString().slice(0, 10),
          })
          this.scene.start('onboard')
        },
      }).setDepth(30)

      bodyText(
        this,
        52,
        440,
        `${formatPokedollars(save.coins)}  ·  vague ${save.bestWave}  ·  région ${save.unlockedGen}`,
        { size: '13px', color: 'rgba(255,251,245,0.75)', origin: 0 },
      ).setDepth(20)
    }

    // Hint bas
    bodyText(this, GAME_W / 2, GAME_H - 22, 'Entrée / Espace pour jouer', {
      size: '12px',
      color: 'rgba(255,251,245,0.55)',
    }).setDepth(20)

    this.input.keyboard?.once('keydown-ENTER', () => goScene(this, hasSave ? 'hub' : 'onboard'))
    this.input.keyboard?.once('keydown-SPACE', () => goScene(this, hasSave ? 'hub' : 'onboard'))
  }

  drawLobbyBg() {
    const g = this.add.graphics().setDepth(0)
    g.fillGradientStyle(0x1a3a5c, 0x1a3a5c, 0x4a90c8, 0x4a90c8, 1)
    g.fillRect(0, 0, GAME_W, GAME_H * 0.58)
    g.fillGradientStyle(0x4a90c8, 0x4a90c8, 0x8fd3f4, 0x8fd3f4, 1)
    g.fillRect(0, GAME_H * 0.4, GAME_W, GAME_H * 0.2)

    // Sol herbe perspective
    g.fillStyle(0x4f9a2e, 1)
    g.fillRect(0, GAME_H * 0.58, GAME_W, GAME_H * 0.42)
    g.fillStyle(0x3d8230, 1)
    g.fillTriangle(0, GAME_H * 0.58, GAME_W, GAME_H * 0.58, GAME_W / 2, GAME_H)

    // Vignette douce gauche pour lisibilité brand
    g.fillStyle(0x0b1220, 0.35)
    g.fillRect(0, 0, GAME_W * 0.48, GAME_H)

    // Lueur brand
    const glow = this.add.circle(160, 160, 90, Theme.red, 0.12).setDepth(1)
    this.tweens.add({
      targets: glow,
      alpha: 0.22,
      scale: 1.15,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
}
