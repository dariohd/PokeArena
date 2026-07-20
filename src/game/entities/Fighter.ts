import Phaser from 'phaser'
import type { MonSummary, MoveSummary } from '../data/types'
import { depthScale } from '../fx'
import { FONT_UI, Theme } from '../theme'

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
  preferredMove = 0
  barWidth: number
  barHeight: number
  baseScale: number
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
    const key = shiny ? `${mon.battleKey}-shiny` : mon.battleKey
    const fallback = mon.battleKey
    super(scene, x, y, scene.textures.exists(key) ? key : fallback)
    this.mon = mon
    this.team = team
    this.level = opts?.level ?? (team === 'player' ? 10 : 8)
    this.shiny = shiny

    const lvlFactor = 0.7 + this.level * 0.045
    this.maxHp = Math.round((50 + mon.hp * 1.5) * lvlFactor)
    this.hp = this.maxHp
    this.displayHp = this.hp
    this.moveSpeed = 210 + mon.spe * 0.85

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(22, 4, 12)
    body.setCollideWorldBounds(true)
    body.setDrag(1000, 1000)
    body.setMaxVelocity(this.moveSpeed, this.moveSpeed)

    this.baseScale = 2.05 * (opts?.scaleMul ?? 1)
    this.setScale(depthScale(y, this.baseScale))
    this.setDepth(y)
    if (shiny) this.setTint(0xfff1a8)

    const s = depthScale(y, 1)
    this.shadow = scene.add
      .ellipse(x, y + 22 * s, 48 * s, 16 * s, Theme.shadow, 0.32)
      .setDepth(y - 1)

    this.label = scene.add
      .text(x, y - 52 * s, `N.${this.level} ${mon.nameFr}`, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: '#fffbf5',
        backgroundColor: '#1e2438cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(1000)

    this.barWidth = team === 'player' ? 54 : 44
    this.barHeight = 6
    this.hpBarBg = scene.add
      .rectangle(x, y - 36 * s, this.barWidth + 2, this.barHeight + 2, 0x1e2438, 0.9)
      .setDepth(1001)
    this.hpBarFg = scene.add
      .rectangle(
        x - this.barWidth / 2,
        y - 36 * s,
        this.barWidth,
        this.barHeight,
        team === 'player' ? Theme.hpGreen : Theme.hpRed,
      )
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
    if (ratio < 0.25) return Theme.hpRed
    if (ratio < 0.5) return Theme.hpYellow
    return this.team === 'player' ? Theme.hpGreen : Theme.hpRed
  }

  takeDamage(raw: number): number {
    const dmg = Math.max(0, Math.round(raw))
    this.hp = Math.max(0, this.hp - dmg)
    this.hitFlash = 100
    this.setTintFill(0xffffff)
    return dmg
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  attackDelay(): number {
    return Math.max(120, 380 - this.mon.spe * 2.4 - this.level * 4)
  }

  inMeleeRange(target: Fighter, range = 88) {
    return Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= range
  }

  updateFx() {
    const s = depthScale(this.y, 1)
    this.setScale(depthScale(this.y, this.baseScale))
    this.setDepth(this.y)

    this.shadow
      .setPosition(this.x, this.y + 22 * s)
      .setSize(48 * s, 16 * s)
      .setDisplaySize(48 * s, 16 * s)
      .setDepth(this.y - 1)
      .setAlpha(0.22 + s * 0.14)

    this.label.setPosition(this.x, this.y - 52 * s).setScale(0.85 + s * 0.2)
    this.hpBarBg.setPosition(this.x, this.y - 36 * s).setScale(0.9 + s * 0.15)
    this.hpBarFg.setPosition(this.x - this.barWidth / 2, this.y - 36 * s)

    const dt = this.scene.game.loop.delta
    this.displayHp += (this.hp - this.displayHp) * Math.min(1, dt / 120)
    const ratio = Phaser.Math.Clamp(this.displayHp / this.maxHp, 0, 1)
    this.hpBarFg.width = this.barWidth * ratio
    this.hpBarFg.fillColor = this.hpColor(ratio)

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
    this.scene.tweens.add({
      targets: [this, this.label, this.hpBarBg, this.hpBarFg, this.shadow],
      alpha: 0,
      duration: 90,
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
