import Phaser from 'phaser'
import type { MonSummary } from '../data/types'

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  mon: MonSummary
  maxHp: number
  hp: number
  atk: number
  def: number
  moveSpeed: number
  team: 'player' | 'enemy'
  attackCd = 0
  hitFlash = 0
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

    this.hpBarBg = scene.add.rectangle(x, y - 42, 48, 5, 0x1a2433).setDepth(1001)
    this.hpBarFg = scene.add
      .rectangle(x - 24, y - 42, 48, 5, team === 'player' ? 0x56f0b0 : 0xff4d7a)
      .setOrigin(0, 0.5)
      .setDepth(1002)
  }

  get alive() {
    return this.hp > 0 && this.active
  }

  takeDamage(raw: number) {
    const dmg = Math.max(1, raw - this.def * 0.35)
    this.hp = Math.max(0, this.hp - dmg)
    this.hitFlash = 120
    this.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.08,
      scaleY: this.scaleY * 0.92,
      yoyo: true,
      duration: 70,
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
    const ratio = this.hp / this.maxHp
    this.hpBarFg.setPosition(this.x - 24, this.y - 42)
    this.hpBarFg.width = 48 * ratio
    if (this.hitFlash > 0) {
      this.hitFlash -= this.scene.game.loop.delta
      if (this.hitFlash <= 0) this.clearTint()
    }
  }

  destroyAll() {
    this.shadow.destroy()
    this.label.destroy()
    this.hpBarBg.destroy()
    this.hpBarFg.destroy()
    this.destroy()
  }
}
