import Phaser from 'phaser'
import type { MonSummary, MoveSummary } from '../data/types'
import { TYPE_FR } from '../data/types'

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  mon: MonSummary
  level: number
  shiny: boolean
  maxHp: number
  hp: number
  displayHp: number
  moveSpeed: number
  team: 'player' | 'enemy'
  attackCd = 0
  hitFlash = 0
  lowHpPulse = 0
  preferredMove = 0
  barWidth: number
  barHeight: number
  shadow!: Phaser.GameObjects.Ellipse
  label!: Phaser.GameObjects.Text
  hpBarBg!: Phaser.GameObjects.Rectangle
  hpBarFg!: Phaser.GameObjects.Rectangle

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    mon: MonSummary,
    team: 'player' | 'enemy',
    opts?: { scaleMul?: number; level?: number; shiny?: boolean },
  ) {
    const shiny = opts?.shiny ?? false
    const key = shiny ? `${mon.spriteKey}-shiny` : mon.spriteKey
    super(scene, x, y, scene.textures.exists(key) ? key : mon.spriteKey)
    this.mon = mon
    this.team = team
    this.level = opts?.level ?? (team === 'player' ? 10 : 8)
    this.shiny = shiny

    const bulk = (mon.hp + mon.def) / 160
    const lvlFactor = 0.7 + this.level * 0.045
    this.maxHp = Math.round((50 + mon.hp * 1.5) * lvlFactor)
    this.hp = this.maxHp
    this.displayHp = this.hp
    this.moveSpeed = 130 + mon.spe * 0.55

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(28, 8, 20)
    body.setCollideWorldBounds(true)
    body.setDrag(900, 900)
    body.setMaxVelocity(this.moveSpeed, this.moveSpeed)

    const scaleMul = opts?.scaleMul ?? 1
    this.setScale(0.28 * scaleMul * (0.9 + bulk * 0.15))
    this.setDepth(y)
    if (shiny) this.setTint(0xfff1a8)

    this.shadow = scene.add
      .ellipse(x, y + 34, 54, 18, 0x000000, 0.35)
      .setDepth(y - 1)

    const typeTag = mon.types.map((t) => TYPE_FR[t] ?? t).join('/')
    this.label = scene.add
      .text(x, y - 58, `N.${this.level} ${mon.nameFr}`, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '11px',
        color: '#e8f2ff',
        stroke: '#070b12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1000)
    this.label.setData('types', typeTag)

    this.barWidth = team === 'player' ? 58 : 46
    this.barHeight = team === 'player' ? 7 : 5
    this.hpBarBg = scene.add
      .rectangle(x, y - 42, this.barWidth + 2, this.barHeight + 2, 0x0a1018, 0.85)
      .setStrokeStyle(1, team === 'player' ? 0x3cf0ff : 0x000000, team === 'player' ? 0.75 : 0.55)
      .setDepth(1001)
    this.hpBarFg = scene.add
      .rectangle(x - this.barWidth / 2, y - 42, this.barWidth, this.barHeight, team === 'player' ? 0x56f0b0 : 0xff4d7a)
      .setOrigin(0, 0.5)
      .setDepth(1002)
  }

  get alive() {
    return this.hp > 0 && this.active
  }

  get activeMove(): MoveSummary {
    return this.mon.moves[this.preferredMove] ?? this.mon.moves[0]
  }

  hpColor(ratio: number) {
    if (this.team === 'player') {
      if (ratio < 0.25) return 0xff4d7a
      if (ratio < 0.5) return 0xffc14a
      return 0x56f0b0
    }
    return ratio < 0.3 ? 0xffc14a : 0xff4d7a
  }

  takeDamage(raw: number): number {
    const dmg = Math.max(0, Math.round(raw))
    this.hp = Math.max(0, this.hp - dmg)
    this.hitFlash = 130
    this.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.1,
      scaleY: this.scaleY * 0.88,
      yoyo: true,
      duration: 80,
      ease: 'Quad.easeOut',
    })
    return dmg
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  attackDelay(): number {
    return Math.max(260, 780 - this.mon.spe * 2.1 - this.level * 4)
  }

  inMeleeRange(target: Fighter, range = 82) {
    return Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= range
  }

  updateFx() {
    this.setDepth(this.y)
    this.shadow.setPosition(this.x, this.y + 34).setDepth(this.y - 1)
    this.label.setPosition(this.x, this.y - 58)
    this.hpBarBg.setPosition(this.x, this.y - 42)
    this.hpBarFg.setPosition(this.x - this.barWidth / 2, this.y - 42)

    const dt = this.scene.game.loop.delta
    this.displayHp += (this.hp - this.displayHp) * Math.min(1, dt / 140)
    const ratio = Phaser.Math.Clamp(this.displayHp / this.maxHp, 0, 1)
    this.hpBarFg.width = this.barWidth * ratio
    this.hpBarFg.fillColor = this.hpColor(ratio)

    if (ratio > 0 && ratio < 0.25) {
      this.lowHpPulse += dt
      this.hpBarFg.setAlpha(0.55 + Math.abs(Math.sin(this.lowHpPulse / 140)) * 0.45)
    } else {
      this.hpBarFg.setAlpha(1)
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt
      if (this.hitFlash <= 0) {
        if (this.shiny) this.setTint(0xfff1a8)
        else this.clearTint()
      }
    }
  }

  playDeathFx(onComplete: () => void) {
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.enable = false

    const ring = this.scene.add
      .circle(this.x, this.y + 10, 16, this.team === 'player' ? 0xff4d7a : 0x3cf0ff, 0.55)
      .setDepth(this.y + 1)
    this.scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 340,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })

    this.scene.tweens.add({
      targets: [this.label, this.hpBarBg, this.hpBarFg, this.shadow],
      alpha: 0,
      duration: 220,
    })

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.scaleX * 1.25,
      scaleY: this.scaleY * 0.3,
      y: this.y - 8,
      duration: 260,
      ease: 'Cubic.easeIn',
      onComplete,
    })
  }

  destroyAll() {
    this.shadow.destroy()
    this.label.destroy()
    this.hpBarBg.destroy()
    this.hpBarFg.destroy()
    this.destroy()
  }
}
