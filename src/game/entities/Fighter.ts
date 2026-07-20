import Phaser from 'phaser'
import type { MonSummary } from '../data/types'

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  mon: MonSummary
  maxHp: number
  hp: number
  displayHp: number
  atk: number
  def: number
  moveSpeed: number
  team: 'player' | 'enemy'
  attackCd = 0
  hitFlash = 0
  lowHpPulse = 0
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
    scaleMul = 1,
  ) {
    super(scene, x, y, mon.spriteKey)
    this.mon = mon
    this.team = team

    const bulk = (mon.hp + mon.def) / 160
    this.maxHp = Math.round(80 + mon.hp * 1.35)
    this.hp = this.maxHp
    this.displayHp = this.hp
    this.atk = 10 + mon.atk * 0.22
    this.def = 6 + mon.def * 0.12
    this.moveSpeed = 140 + mon.spd * 0.55

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(28, 8, 20)
    body.setCollideWorldBounds(true)
    body.setDrag(900, 900)
    body.setMaxVelocity(this.moveSpeed, this.moveSpeed)

    this.setScale(0.28 * scaleMul * (0.9 + bulk * 0.15))
    this.setDepth(y)

    this.shadow = scene.add
      .ellipse(x, y + 34, 54, 18, 0x000000, 0.35)
      .setDepth(y - 1)

    this.label = scene.add
      .text(x, y - 58, mon.name, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '12px',
        color: '#e8f2ff',
        stroke: '#070b12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1000)

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

  hpColor(ratio: number) {
    if (this.team === 'player') {
      if (ratio < 0.25) return 0xff4d7a
      if (ratio < 0.5) return 0xffc14a
      return 0x56f0b0
    }
    return ratio < 0.3 ? 0xffc14a : 0xff4d7a
  }

  takeDamage(raw: number): number {
    const dmg = Math.max(1, raw - this.def * 0.35)
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

  tryAttack(target: Fighter, now: number): number {
    if (now < this.attackCd || !target.alive) return 0
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y)
    if (dist > 78) return 0
    this.attackCd = now + Math.max(280, 720 - this.mon.spd * 2.2)
    const dmg = this.atk * Phaser.Math.FloatBetween(0.9, 1.15)
    return target.takeDamage(dmg)
  }

  updateFx() {
    this.setDepth(this.y)
    this.shadow.setPosition(this.x, this.y + 34).setDepth(this.y - 1)
    this.label.setPosition(this.x, this.y - 58)
    this.hpBarBg.setPosition(this.x, this.y - 42)
    this.hpBarFg.setPosition(this.x - this.barWidth / 2, this.y - 42)

    // Smoothly ease the visible bar toward the real HP so hits read clearly instead of snapping.
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
      if (this.hitFlash <= 0) this.clearTint()
    }
  }

  /** Plays a short death poof (fade, stretch, ring burst) then invokes the callback to finish cleanup. */
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
      onComplete: onComplete,
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
