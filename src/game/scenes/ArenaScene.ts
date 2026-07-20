import Phaser from 'phaser'
import { GAME_H, GAME_W } from '../config'
import { fetchMon, loadSave, randomWildId, writeSave } from '../data/pokeapi'
import type { ArenaResult, MonSummary } from '../data/types'
import { Fighter } from '../entities/Fighter'

export class ArenaScene extends Phaser.Scene {
  private player!: Fighter
  private allies: Fighter[] = []
  private enemies: Fighter[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private wave = 1
  private coins = 0
  private damageDealt = 0
  private combo = 0
  private comboTimer = 0
  private recruited: MonSummary[] = []
  private hudWave!: Phaser.GameObjects.Text
  private hudCoins!: Phaser.GameObjects.Text
  private hudCombo!: Phaser.GameObjects.Text
  private banner!: Phaser.GameObjects.Text
  private spawning = false
  private ended = false

  constructor() {
    super('arena')
  }

  async create() {
    this.ended = false
    this.wave = 1
    this.coins = 0
    this.damageDealt = 0
    this.combo = 0
    this.recruited = []
    this.allies = []
    this.enemies = []

    this.cameras.main.fadeIn(350, 7, 11, 18)
    this.drawArena()
    this.physics.world.setBounds(80, 90, GAME_W - 160, GAME_H - 160)

    const save = loadSave()
    const starterId = save.starterId || 25
    const mon = await this.ensureMon(starterId)
    this.player = new Fighter(this, GAME_W / 2, GAME_H / 2 + 40, mon, 'player', 1.15)
    this.allies.push(this.player)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd

    this.hudWave = this.add
      .text(24, 18, '', {
        fontFamily: 'Bungee, cursive',
        fontSize: '20px',
        color: '#3cf0ff',
      })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudCoins = this.add
      .text(24, 46, '', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '14px',
        color: '#ffc14a',
      })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudCombo = this.add
      .text(GAME_W - 24, 18, '', {
        fontFamily: 'Bungee, cursive',
        fontSize: '22px',
        color: '#ff4d7a',
      })
      .setOrigin(1, 0)
      .setDepth(2000)
      .setScrollFactor(0)
    this.banner = this.add
      .text(GAME_W / 2, 90, '', {
        fontFamily: 'Bungee, cursive',
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#070b12',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0)

    this.add
      .text(GAME_W / 2, GAME_H - 18, 'ZQSD / flèches · auto-attaque au contact · esquive = distance', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '12px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)
      .setDepth(2000)

    await this.startWave()
  }

  drawArena() {
    const g = this.add.graphics()
    g.fillStyle(0x0a1220, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)

    // Floor plate (2.5D ellipse)
    g.fillStyle(0x152033, 1)
    g.fillEllipse(GAME_W / 2, GAME_H / 2 + 30, 760, 320)
    g.lineStyle(3, 0x3cf0ff, 0.35)
    g.strokeEllipse(GAME_W / 2, GAME_H / 2 + 30, 760, 320)
    g.lineStyle(2, 0xffc14a, 0.2)
    g.strokeEllipse(GAME_W / 2, GAME_H / 2 + 30, 640, 250)

    // Iso grid hints
    g.lineStyle(1, 0x3cf0ff, 0.06)
    for (let i = -6; i <= 6; i++) {
      g.lineBetween(GAME_W / 2 + i * 55, 140, GAME_W / 2 + i * 55 + 180, 420)
      g.lineBetween(GAME_W / 2 + i * 55, 140, GAME_W / 2 + i * 55 - 180, 420)
    }

    // Neon pillars
    for (const x of [90, GAME_W - 90]) {
      g.fillStyle(0x101826, 1)
      g.fillRoundedRect(x - 18, 70, 36, 120, 8)
      g.fillStyle(0x3cf0ff, 0.5)
      g.fillCircle(x, 70, 10)
    }
  }

  async ensureMon(id: number): Promise<MonSummary> {
    const mon = await fetchMon(id)
    if (!this.textures.exists(mon.spriteKey)) {
      await new Promise<void>((resolve) => {
        this.load.image(mon.spriteKey, mon.spriteUrl)
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
        this.load.start()
      })
    }
    return mon
  }

  async startWave() {
    this.spawning = true
    this.showBanner(`VAGUE ${this.wave}`)
    this.refreshHud()

    const count = Math.min(2 + Math.floor(this.wave * 1.2), 8)
    for (let i = 0; i < count; i++) {
      const id = randomWildId(this.wave < 4 ? 151 : 251)
      const mon = await this.ensureMon(id)
      const angle = (i / count) * Math.PI * 2
      const x = GAME_W / 2 + Math.cos(angle) * 260
      const y = GAME_H / 2 + 30 + Math.sin(angle) * 110
      const foe = new Fighter(this, x, y, mon, 'enemy', 0.95 + this.wave * 0.02)
      foe.maxHp = Math.round(foe.maxHp * (1 + this.wave * 0.08))
      foe.hp = foe.maxHp
      foe.atk *= 1 + this.wave * 0.06
      this.enemies.push(foe)
      this.tweens.add({
        targets: foe,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.05, to: foe.scale },
        duration: 280,
      })
    }
    this.spawning = false
  }

  showBanner(text: string) {
    this.banner.setText(text).setAlpha(1).setScale(0.8)
    this.tweens.add({
      targets: this.banner,
      scale: 1.1,
      duration: 180,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({ targets: this.banner, alpha: 0, delay: 500, duration: 300 })
      },
    })
  }

  refreshHud() {
    this.hudWave.setText(`Vague ${this.wave}`)
    this.hudCoins.setText(`Pièces ${this.coins}`)
    this.hudCombo.setText(this.combo > 1 ? `COMBO x${this.combo}` : '')
  }

  update(_t: number, dt: number) {
    if (this.ended || this.spawning) return
    const now = this.time.now

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      if (this.comboTimer <= 0) {
        this.combo = 0
        this.refreshHud()
      }
    }

    this.movePlayer()
    this.aiEnemies(now)
    this.resolveCombat(now)
    ;[...this.allies, ...this.enemies].forEach((f) => f.alive && f.updateFx())

    if (!this.player.alive) {
      this.finish(false)
      return
    }

    this.enemies = this.enemies.filter((e) => {
      if (e.alive) return true
      this.onEnemyDown(e)
      return false
    })

    if (this.enemies.length === 0 && !this.spawning) {
      this.spawning = true
      this.wave += 1
      if (this.wave > 12) {
        this.finish(true)
      } else {
        void this.startWave()
      }
    }
  }

  movePlayer() {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    let vx = 0
    let vy = 0
    if (this.cursors.left?.isDown || this.wasd.A.isDown) vx -= 1
    if (this.cursors.right?.isDown || this.wasd.D.isDown) vx += 1
    if (this.cursors.up?.isDown || this.wasd.W.isDown) vy -= 1
    if (this.cursors.down?.isDown || this.wasd.S.isDown) vy += 1
    const len = Math.hypot(vx, vy) || 1
    body.setVelocity((vx / len) * this.player.moveSpeed, (vy / len) * this.player.moveSpeed)
    if (vx !== 0) this.player.setFlipX(vx < 0)
  }

  aiEnemies(now: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue
      const target = this.nearestAlly(e)
      if (!target) continue
      const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y)
      const body = e.body as Phaser.Physics.Arcade.Body
      const speed = e.moveSpeed * 0.72
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
      e.setFlipX(target.x < e.x)
      const dmg = e.tryAttack(target, now)
      if (dmg > 0) this.cameras.main.shake(40, 0.004)
    }
  }

  nearestAlly(from: Fighter) {
    let best: Fighter | null = null
    let bestD = Infinity
    for (const a of this.allies) {
      if (!a.alive) continue
      const d = Phaser.Math.Distance.Between(from.x, from.y, a.x, a.y)
      if (d < bestD) {
        bestD = d
        best = a
      }
    }
    return best
  }

  resolveCombat(now: number) {
    for (const a of this.allies) {
      if (!a.alive) continue
      let nearest: Fighter | null = null
      let best = Infinity
      for (const e of this.enemies) {
        if (!e.alive) continue
        const d = Phaser.Math.Distance.Between(a.x, a.y, e.x, e.y)
        if (d < best) {
          best = d
          nearest = e
        }
      }
      if (!nearest) continue
      const dmg = a.tryAttack(nearest, now)
      if (dmg > 0) {
        this.damageDealt += dmg
        this.spawnHitFx(nearest.x, nearest.y - 20, dmg)
        this.combo += 1
        this.comboTimer = 1600
        this.refreshHud()
        if (a === this.player) this.cameras.main.shake(50, 0.005)
      }
    }
  }

  spawnHitFx(x: number, y: number, dmg: number) {
    const t = this.add
      .text(x, y, `-${Math.round(dmg)}`, {
        fontFamily: 'Bungee, cursive',
        fontSize: '16px',
        color: '#ffc14a',
        stroke: '#070b12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(3000)
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 450,
      onComplete: () => t.destroy(),
    })

    const ring = this.add.circle(x, y + 10, 8, 0x3cf0ff, 0.5).setDepth(2999)
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 280,
      onComplete: () => ring.destroy(),
    })
  }

  onEnemyDown(e: Fighter) {
    const gain = 8 + this.wave * 2 + this.combo
    this.coins += gain
    this.refreshHud()

    // Recruit chance
    const chance = 0.18 + Math.min(0.25, this.combo * 0.02)
    if (Math.random() < chance && this.allies.length < 4) {
      this.recruited.push(e.mon)
      const ally = new Fighter(this, e.x, e.y, e.mon, 'player', 0.9)
      ally.hp = Math.round(ally.maxHp * 0.7)
      this.allies.push(ally)
      this.showBanner(`RECRUTÉ · ${e.mon.name}`)
      const save = loadSave()
      save.roster = [...new Set([...save.roster, e.mon.id])]
      writeSave(save)
    }

    e.destroyAll()
  }

  finish(won: boolean) {
    if (this.ended) return
    this.ended = true
    const result: ArenaResult = {
      won,
      wave: this.wave,
      coins: this.coins,
      recruited: this.recruited,
      damageDealt: Math.round(this.damageDealt),
    }
    const save = loadSave()
    save.coins += this.coins
    save.bestWave = Math.max(save.bestWave, this.wave)
    save.runs += 1
    writeSave(save)

    this.cameras.main.fadeOut(400, 7, 11, 18)
    this.time.delayedCall(420, () => this.scene.start('result', result))
  }
}
