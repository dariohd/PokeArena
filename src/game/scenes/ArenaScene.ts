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
  private comboBarBg!: Phaser.GameObjects.Rectangle
  private comboBarFg!: Phaser.GameObjects.Rectangle
  private playerBarBg!: Phaser.GameObjects.Rectangle
  private playerBarFg!: Phaser.GameObjects.Rectangle
  private playerBarText!: Phaser.GameObjects.Text
  private playerNameText!: Phaser.GameObjects.Text
  private flashFx!: Phaser.GameObjects.Rectangle
  private vignette!: Phaser.GameObjects.Rectangle
  private banner!: Phaser.GameObjects.Text
  private spawning = false
  private ended = false
  private lastCombo = 0

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

    // Readability panels behind the HUD text so it stays legible over a busy arena.
    const hudBg = this.add.graphics().setDepth(1999).setScrollFactor(0)
    hudBg.fillStyle(0x070b12, 0.55)
    hudBg.fillRoundedRect(14, 10, 190, 62, 8)
    hudBg.fillRoundedRect(GAME_W - 190, 10, 176, 40, 8)
    hudBg.fillRoundedRect(14, GAME_H - 54, 240, 40, 8)

    this.hudWave = this.add
      .text(26, 16, '', {
        fontFamily: 'Bungee, cursive',
        fontSize: '20px',
        color: '#3cf0ff',
      })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudCoins = this.add
      .text(26, 44, '', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '14px',
        color: '#ffc14a',
      })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudCombo = this.add
      .text(GAME_W - 24, 14, '', {
        fontFamily: 'Bungee, cursive',
        fontSize: '22px',
        color: '#ff4d7a',
      })
      .setOrigin(1, 0)
      .setDepth(2000)
      .setScrollFactor(0)
    this.comboBarBg = this.add
      .rectangle(GAME_W - 176, 40, 152, 6, 0x0a1018, 0.8)
      .setOrigin(0, 0.5)
      .setDepth(2000)
      .setScrollFactor(0)
    this.comboBarFg = this.add
      .rectangle(GAME_W - 176, 40, 0, 6, 0xff4d7a)
      .setOrigin(0, 0.5)
      .setDepth(2001)
      .setScrollFactor(0)

    // Dedicated, always-on-screen HP readout for the player so it never gets lost in the chaos.
    this.playerNameText = this.add
      .text(26, GAME_H - 50, '', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '12px',
        color: '#8aa0b8',
      })
      .setDepth(2000)
      .setScrollFactor(0)
    this.playerBarBg = this.add
      .rectangle(26, GAME_H - 30, 216, 14, 0x0a1018, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x3cf0ff, 0.6)
      .setDepth(2000)
      .setScrollFactor(0)
    this.playerBarFg = this.add
      .rectangle(28, GAME_H - 30, 212, 10, 0x56f0b0)
      .setOrigin(0, 0.5)
      .setDepth(2001)
      .setScrollFactor(0)
    this.playerBarText = this.add
      .text(26 + 108, GAME_H - 30, '', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        stroke: '#070b12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2002)
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
      .setDepth(2010)
      .setAlpha(0)

    this.add
      .text(GAME_W / 2, GAME_H - 18, 'ZQSD / flèches · auto-attaque au contact · esquive = distance', {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '12px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScrollFactor(0)

    // Full-screen overlays for damage flash + low-HP vignette; both stay invisible until needed.
    this.flashFx = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xff4d7a, 0)
      .setOrigin(0)
      .setDepth(2500)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.vignette = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xff0033, 0)
      .setOrigin(0)
      .setDepth(2490)
      .setScrollFactor(0)

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
    this.hudCombo.setColor(this.combo >= 10 ? '#ffc14a' : this.combo >= 5 ? '#ff9d4d' : '#ff4d7a')

    if (this.combo > this.lastCombo && this.combo > 1) {
      this.tweens.add({
        targets: this.hudCombo,
        scale: 1.35,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      })
    }
    this.lastCombo = this.combo
  }

  updatePlayerBar() {
    const ratio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1)
    this.playerBarFg.width = 212 * ratio
    this.playerBarFg.fillColor = ratio < 0.25 ? 0xff4d7a : ratio < 0.5 ? 0xffc14a : 0x56f0b0
    this.playerNameText.setText(this.player.mon.name.toUpperCase())
    this.playerBarText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp}`)

    const dangerAlpha = ratio < 0.25 ? 0.08 + Math.abs(Math.sin(this.time.now / 160)) * 0.1 : 0
    this.vignette.setAlpha(dangerAlpha)
  }

  update(_t: number, dt: number) {
    if (this.ended || this.spawning) return
    const now = this.time.now

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      this.comboBarFg.width = 152 * Phaser.Math.Clamp(this.comboTimer / 1600, 0, 1)
      if (this.comboTimer <= 0) {
        this.combo = 0
        this.refreshHud()
      }
    }

    this.movePlayer()
    this.aiEnemies(now)
    this.resolveCombat(now)
    ;[...this.allies, ...this.enemies].forEach((f) => f.alive && f.updateFx())
    this.updatePlayerBar()

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
      if (dmg > 0) {
        const isPlayer = target === this.player
        const intensity = Phaser.Math.Clamp(dmg / target.maxHp, 0.02, 0.14)
        this.cameras.main.shake(isPlayer ? 130 : 40, isPlayer ? 0.006 + intensity : 0.004)
        if (isPlayer) this.flashDamage()
      }
    }
  }

  flashDamage() {
    this.flashFx.setAlpha(0.22)
    this.tweens.add({ targets: this.flashFx, alpha: 0, duration: 220, ease: 'Quad.easeOut' })
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
        const crit = dmg > a.atk * 1.05
        this.spawnHitFx(nearest.x, nearest.y - 20, dmg, crit)
        this.combo += 1
        this.comboTimer = 1600
        this.refreshHud()
        if (a === this.player) {
          const intensity = Phaser.Math.Clamp(dmg / nearest.maxHp, 0.03, 0.16)
          this.cameras.main.shake(60 + (crit ? 60 : 0), 0.005 + intensity)
        }
      }
    }
  }

  spawnHitFx(x: number, y: number, dmg: number, crit = false) {
    const t = this.add
      .text(x, y, `-${Math.round(dmg)}${crit ? '!' : ''}`, {
        fontFamily: 'Bungee, cursive',
        fontSize: crit ? '22px' : '16px',
        color: crit ? '#ffc14a' : '#e8f2ff',
        stroke: '#070b12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(3000)
      .setScale(0.5)
    this.tweens.add({
      targets: t,
      scale: crit ? 1.15 : 1,
      y: y - 36,
      alpha: 0,
      duration: crit ? 550 : 450,
      ease: 'Back.easeOut',
      onComplete: () => t.destroy(),
    })

    const ring = this.add.circle(x, y + 10, crit ? 12 : 8, crit ? 0xffc14a : 0x3cf0ff, 0.5).setDepth(2999)
    this.tweens.add({
      targets: ring,
      scale: crit ? 4 : 3,
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

    e.playDeathFx(() => e.destroyAll())
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
