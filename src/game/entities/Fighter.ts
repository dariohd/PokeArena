import Phaser from 'phaser'
import type { MonSummary, MoveSummary } from '../data/types'
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
    this.moveSpeed = 125 + mon.spe * 0.5

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(22, 4, 12)
    body.setCollideWorldBounds(true)
    body.setDrag(1000, 1000)
    body.setMaxVelocity(this.moveSpeed, this.moveSpeed)

    // Battle sprites are ~96px — scale ~2.2 looks like classic arena sprites
    const scaleMul = opts?.scaleMul ?? 1
    this.setScale(2.15 * scaleMul)
    this.setDepth(y)
    if (shiny) this.setTint(0xfff1a8)

    this.shadow = scene.add
      .ellipse(x, y + 28, 42, 14, Theme.shadow, 0.28)
      .setDepth(y - 1)

    this.label = scene.add
      .text(x, y - 48, `N.${this.level} ${mon.nameFr}`, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: '#2a2a3a',
        backgroundColor: '#fff8f0cc',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(1000)

    this.barWidth = team === 'player' ? 52 : 42
    this.barHeight = 6
    this.hpBarBg = scene.add
      .rectangle(x, y - 34, this.barWidth + 2, this.barHeight + 2, 0x2a2a3a, 0.85)
      .setDepth(1001)
    this.hpBarFg = scene.add
      .rectangle(
        x - this.barWidth / 2,
        y - 34,
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
    return Math.max(280, 760 - this.mon.spe * 2 - this.level * 3)
  }

  inMeleeRange(target: Fighter, range = 70) {
    return Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) <= range
  }

  updateFx() {
    this.setDepth(this.y)
    this.shadow.setPosition(this.x, this.y + 28).setDepth(this.y - 1)
    this.label.setPosition(this.x, this.y - 48)
    this.hpBarBg.setPosition(this.x, this.y - 34)
    this.hpBarFg.setPosition(this.x - this.barWidth / 2, this.y - 34)

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
      duration: 200,
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
