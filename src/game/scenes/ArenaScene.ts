import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { effectivenessColor, resolveAttack } from '../data/battle'
import {
  addToRoster,
  addXp,
  captureCheck,
  ensureTypeChart,
  fetchMon,
  loadSave,
  markSeen,
  randomWildId,
  writeSave,
  type TypeChart,
} from '../data/pokeapi'
import { MAX_WAVES, TYPE_COLORS, TYPE_FR, type ArenaResult, type Inventory, type MonSummary } from '../data/types'
import { Fighter } from '../entities/Fighter'

type BallKey = 'pokeball' | 'greatball' | 'ultraball'

export class ArenaScene extends Phaser.Scene {
  private player!: Fighter
  private allies: Fighter[] = []
  private enemies: Fighter[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: {
    Z: Phaser.Input.Keyboard.Key
    Q: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    C: Phaser.Input.Keyboard.Key
    H: Phaser.Input.Keyboard.Key
    ONE: Phaser.Input.Keyboard.Key
    TWO: Phaser.Input.Keyboard.Key
    THREE: Phaser.Input.Keyboard.Key
    FOUR: Phaser.Input.Keyboard.Key
  }
  private wave = 1
  private coins = 0
  private damageDealt = 0
  private xpGained = 0
  private combo = 0
  private comboTimer = 0
  private captured: MonSummary[] = []
  private chart!: TypeChart
  private inventory!: Inventory
  private selectedBall: BallKey = 'pokeball'
  private unlockedGen = 1
  private hudWave!: Phaser.GameObjects.Text
  private hudCoins!: Phaser.GameObjects.Text
  private hudCombo!: Phaser.GameObjects.Text
  private hudMoves!: Phaser.GameObjects.Text
  private hudBall!: Phaser.GameObjects.Text
  private comboBarFg!: Phaser.GameObjects.Rectangle
  private playerBarFg!: Phaser.GameObjects.Rectangle
  private playerBarText!: Phaser.GameObjects.Text
  private playerNameText!: Phaser.GameObjects.Text
  private flashFx!: Phaser.GameObjects.Rectangle
  private vignette!: Phaser.GameObjects.Rectangle
  private banner!: Phaser.GameObjects.Text
  private spawning = false
  private ended = false
  private lastCombo = 0
  private stick = { x: 0, y: 0 }
  private touchActive = false

  constructor() {
    super('arena')
  }

  async create() {
    this.ended = false
    this.wave = 1
    this.coins = 0
    this.damageDealt = 0
    this.xpGained = 0
    this.combo = 0
    this.captured = []
    this.allies = []
    this.enemies = []
    this.stick = { x: 0, y: 0 }

    const save = loadSave()
    this.inventory = { ...save.inventory }
    this.unlockedGen = save.unlockedGen
    this.selectedBall =
      this.inventory.ultraball > 0 ? 'ultraball' : this.inventory.greatball > 0 ? 'greatball' : 'pokeball'

    this.chart = await ensureTypeChart()
    this.cameras.main.fadeIn(350, 126, 200, 227)
    this.drawArena()
    this.physics.world.setBounds(60, 100, GAME_W - 120, GAME_H - 170)

    const team = save.team.length
      ? save.team
      : [{ id: save.starterId || 25, level: 8, xp: 0, shiny: false }]

    for (let i = 0; i < team.length; i++) {
      const slot = team[i]
      const mon = await this.ensureMon(slot.id, slot.level)
      save.seen = markSeen(save, mon.id).seen
      const x = GAME_W / 2 + (i - (team.length - 1) / 2) * 70
      const y = GAME_H / 2 + 50
      const f = new Fighter(this, x, y, mon, 'player', {
        scaleMul: i === 0 ? 1.15 : 0.95,
        level: slot.level,
        shiny: slot.shiny,
      })
      if (i === 0) this.player = f
      this.allies.push(f)
      if (i === 0) playCry(mon.cryUrl, 0.35)
    }
    writeSave(save)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('Z,Q,S,D,W,A,C,H,ONE,TWO,THREE,FOUR') as typeof this.keys

    this.buildHud()
    this.setupMobileControls()
    await this.startWave()
  }

  buildHud() {
    const hudBg = this.add.graphics().setDepth(1999).setScrollFactor(0)
    hudBg.fillStyle(0xfff8f0, 0.92)
    hudBg.fillRoundedRect(12, 10, 220, 70, 10)
    hudBg.lineStyle(3, 0xe03028, 1)
    hudBg.strokeRoundedRect(12, 10, 220, 70, 10)
    hudBg.fillStyle(0xfff8f0, 0.92)
    hudBg.fillRoundedRect(GAME_W - 200, 10, 188, 50, 10)
    hudBg.lineStyle(3, 0x3090e0, 1)
    hudBg.strokeRoundedRect(GAME_W - 200, 10, 188, 50, 10)
    hudBg.fillStyle(0xfff8f0, 0.94)
    hudBg.fillRoundedRect(12, GAME_H - 86, 340, 72, 10)
    hudBg.lineStyle(3, 0x58a038, 1)
    hudBg.strokeRoundedRect(12, GAME_H - 86, 340, 72, 10)

    this.hudWave = this.add
      .text(26, 16, '', { fontFamily: 'Fredoka, Nunito, sans-serif', fontSize: '18px', color: '#e03028' })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudCoins = this.add
      .text(26, 40, '', { fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#2a2a3a' })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudBall = this.add
      .text(26, 58, '', { fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: '#6a6a7a' })
      .setDepth(2000)
      .setScrollFactor(0)

    this.hudCombo = this.add
      .text(GAME_W - 24, 14, '', { fontFamily: 'Fredoka, Nunito, sans-serif', fontSize: '18px', color: '#e03028' })
      .setOrigin(1, 0)
      .setDepth(2000)
      .setScrollFactor(0)
    this.add.rectangle(GAME_W - 188, 44, 160, 6, 0xe8d8c8, 1).setOrigin(0, 0.5).setDepth(2000).setScrollFactor(0)
    this.comboBarFg = this.add
      .rectangle(GAME_W - 188, 44, 0, 6, 0xe03028)
      .setOrigin(0, 0.5)
      .setDepth(2001)
      .setScrollFactor(0)

    this.playerNameText = this.add
      .text(26, GAME_H - 80, '', { fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: '#2a2a3a' })
      .setDepth(2000)
      .setScrollFactor(0)
    this.add
      .rectangle(26, GAME_H - 58, 216, 14, 0x2a2a3a, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(2000)
      .setScrollFactor(0)
    this.playerBarFg = this.add
      .rectangle(28, GAME_H - 58, 212, 10, 0x48c878)
      .setOrigin(0, 0.5)
      .setDepth(2001)
      .setScrollFactor(0)
    this.playerBarText = this.add
      .text(134, GAME_H - 58, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2002)
      .setScrollFactor(0)

    this.hudMoves = this.add
      .text(26, GAME_H - 38, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '11px',
        color: '#2a2a3a',
      })
      .setDepth(2000)
      .setScrollFactor(0)

    this.banner = this.add
      .text(GAME_W / 2, 100, '', {
        fontFamily: 'Fredoka, Nunito, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#e03028',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(2010)
      .setAlpha(0)

    this.add
      .text(GAME_W / 2, GAME_H - 12, 'ZQSD · 1-4 attaques · C capture · H soin', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '11px',
        color: '#2a2a3a',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScrollFactor(0)

    this.flashFx = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xe03028, 0)
      .setOrigin(0)
      .setDepth(2500)
      .setScrollFactor(0)
    this.vignette = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xe03028, 0)
      .setOrigin(0)
      .setDepth(2490)
      .setScrollFactor(0)
  }

  setupMobileControls() {
    const zone = this.add
      .circle(90, GAME_H - 140, 52, 0x3cf0ff, 0.12)
      .setStrokeStyle(2, 0x3cf0ff, 0.35)
      .setScrollFactor(0)
      .setDepth(2100)
      .setInteractive()
    const knob = this.add.circle(90, GAME_H - 140, 22, 0x3cf0ff, 0.45).setScrollFactor(0).setDepth(2101)

    const ballBtn = this.add
      .text(GAME_W - 70, GAME_H - 160, 'BALL', {
        fontFamily: 'Bungee, cursive',
        fontSize: '14px',
        color: '#070b12',
        backgroundColor: '#ffc14a',
        padding: { x: 12, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100)
      .setInteractive({ useHandCursor: true })
    ballBtn.on('pointerdown', () => this.tryCapture())

    const healBtn = this.add
      .text(GAME_W - 70, GAME_H - 110, 'SOIN', {
        fontFamily: 'Bungee, cursive',
        fontSize: '14px',
        color: '#070b12',
        backgroundColor: '#56f0b0',
        padding: { x: 12, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100)
      .setInteractive({ useHandCursor: true })
    healBtn.on('pointerdown', () => this.tryHeal())

    const updateStick = (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - zone.x
      const dy = pointer.y - zone.y
      const len = Math.hypot(dx, dy) || 1
      const max = 40
      const clamped = Math.min(len, max)
      this.stick.x = (dx / len) * (clamped / max)
      this.stick.y = (dy / len) * (clamped / max)
      knob.setPosition(zone.x + this.stick.x * max, zone.y + this.stick.y * max)
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (Phaser.Math.Distance.Between(p.x, p.y, zone.x, zone.y) < 70) {
        this.touchActive = true
        updateStick(p)
      }
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.touchActive && p.isDown) updateStick(p)
    })
    this.input.on('pointerup', () => {
      this.touchActive = false
      this.stick.x = 0
      this.stick.y = 0
      knob.setPosition(zone.x, zone.y)
    })
  }

  drawArena() {
    const g = this.add.graphics()
    g.fillGradientStyle(0x7ec8e3, 0x7ec8e3, 0xc8ecf8, 0xc8ecf8, 1)
    g.fillRect(0, 0, GAME_W, GAME_H)

    // Soft hills
    g.fillStyle(0x68b040, 1)
    g.fillEllipse(180, 220, 280, 90)
    g.fillEllipse(780, 200, 260, 80)

    // Arena dirt oval (classic outdoor battle feel)
    g.fillStyle(0x58a038, 1)
    g.fillEllipse(GAME_W / 2, GAME_H / 2 + 40, 820, 300)
    g.fillStyle(0xe0c068, 1)
    g.fillEllipse(GAME_W / 2, GAME_H / 2 + 45, 700, 240)
    g.fillStyle(0xc8a850, 1)
    g.fillEllipse(GAME_W / 2, GAME_H / 2 + 45, 620, 200)
    g.lineStyle(4, 0xffffff, 0.55)
    g.strokeEllipse(GAME_W / 2, GAME_H / 2 + 45, 620, 200)
  }

  async ensureMon(id: number, levelHint = 40): Promise<MonSummary> {
    const mon = await fetchMon(id, { levelHint, full: false })
    const keys = [
      { key: mon.battleKey, url: mon.battleUrl },
      { key: `${mon.battleKey}-shiny`, url: mon.battleShinyUrl },
    ]
    for (const { key, url } of keys) {
      if (!this.textures.exists(key) && url) {
        await new Promise<void>((resolve) => {
          this.load.image(key, url)
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
          this.load.start()
        })
      }
    }
    return mon
  }

  async startWave() {
    this.spawning = true
    const boss = this.wave % 5 === 0
    this.showBanner(boss ? `BOSS · VAGUE ${this.wave}` : `VAGUE ${this.wave}`)
    this.refreshHud()

    const count = boss ? 1 : Math.min(2 + Math.floor(this.wave * 0.9), 5)
    for (let i = 0; i < count; i++) {
      let id = randomWildId(this.unlockedGen, this.wave)
      if (boss) {
        // Prefer stronger species near end of unlocked dex
        const max = this.unlockedGen >= 3 ? 386 : this.unlockedGen >= 2 ? 251 : 151
        id = Math.max(1, max - Math.floor(Math.random() * 40))
      }
      const mon = await this.ensureMon(id, 20 + this.wave * 3)
      let save = loadSave()
      save = markSeen(save, mon.id)
      writeSave(save)

      const angle = (i / count) * Math.PI * 2
      const x = GAME_W / 2 + Math.cos(angle) * (boss ? 0 : 260)
      const y = GAME_H / 2 + 30 + Math.sin(angle) * (boss ? -40 : 110)
      const level = Math.round(6 + this.wave * 1.4 + (boss ? 8 : 0))
      const foe = new Fighter(this, x, y, mon, 'enemy', {
        scaleMul: boss ? 1.35 : 0.95 + this.wave * 0.015,
        level,
        shiny: Math.random() < 0.02,
      })
      foe.maxHp = Math.round(foe.maxHp * (1 + this.wave * 0.07) * (boss ? 2.2 : 1))
      foe.hp = foe.maxHp
      this.enemies.push(foe)
      this.tweens.add({
        targets: foe,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.05, to: foe.scale },
        duration: 280,
      })
      if (boss) playCry(mon.cryUrl, 0.5)
    }
    this.spawning = false
  }

  showBanner(text: string) {
    this.banner.setText(text).setAlpha(1).setScale(0.8)
    this.tweens.add({
      targets: this.banner,
      scale: 1.08,
      duration: 180,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({ targets: this.banner, alpha: 0, delay: 500, duration: 300 })
      },
    })
  }

  refreshHud() {
    this.hudWave.setText(`Vague ${this.wave}/${MAX_WAVES}`)
    this.hudCoins.setText(`Pièces ${this.coins}`)
    const balls = `Balls P${this.inventory.pokeball} S${this.inventory.greatball} H${this.inventory.ultraball} · ${this.selectedBall}`
    this.hudBall.setText(balls)
    this.hudCombo.setText(this.combo > 1 ? `COMBO x${this.combo}` : '')
    this.hudCombo.setColor(this.combo >= 10 ? '#ffc14a' : this.combo >= 5 ? '#ff9d4d' : '#ff4d7a')

    if (this.player) {
      const moves = this.player.mon.moves
        .map((m, i) => {
          const mark = i === this.player.preferredMove ? '>' : ' '
          return `${mark}${i + 1}.${m.nameFr}`
        })
        .join('  ')
      this.hudMoves.setText(moves || 'Charge')
    }

    if (this.combo > this.lastCombo && this.combo > 1) {
      this.tweens.add({ targets: this.hudCombo, scale: 1.3, duration: 90, yoyo: true })
    }
    this.lastCombo = this.combo
  }

  updatePlayerBar() {
    const ratio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1)
    this.playerBarFg.width = 212 * ratio
    this.playerBarFg.fillColor = ratio < 0.25 ? 0xff4d7a : ratio < 0.5 ? 0xffc14a : 0x56f0b0
    const types = this.player.mon.types.map((t) => TYPE_FR[t] ?? t).join('/')
    this.playerNameText.setText(
      `${this.player.mon.nameFr.toUpperCase()} · ${types} · ${this.player.mon.abilityNameFr}`,
    )
    this.playerBarText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp}`)
    this.vignette.setAlpha(ratio < 0.25 ? 0.08 + Math.abs(Math.sin(this.time.now / 160)) * 0.1 : 0)
  }

  update(_t: number, dt: number) {
    if (this.ended || this.spawning || !this.player) return
    const now = this.time.now

    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) {
      this.player.preferredMove = 0
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
      this.player.preferredMove = Math.min(1, this.player.mon.moves.length - 1)
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
      this.player.preferredMove = Math.min(2, this.player.mon.moves.length - 1)
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) {
      this.player.preferredMove = Math.min(3, this.player.mon.moves.length - 1)
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) this.tryCapture()
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) this.tryHeal()

    // Cycle ball with B not available — cycle on shift+c via inventory priority already set

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      this.comboBarFg.width = 168 * Phaser.Math.Clamp(this.comboTimer / 1600, 0, 1)
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
    // HUD text only when combo/wave context needs it — not every frame
    if (this.comboTimer > 0 || this.combo !== this.lastCombo) this.refreshHud()

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
      if (this.wave >= MAX_WAVES) {
        this.finish(true)
      } else {
        this.wave += 1
        void this.startWave()
      }
    }
  }

  movePlayer() {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    let vx = this.stick.x
    let vy = this.stick.y
    if (this.cursors.left?.isDown || this.keys.Q.isDown || this.keys.A.isDown) vx -= 1
    if (this.cursors.right?.isDown || this.keys.D.isDown) vx += 1
    if (this.cursors.up?.isDown || this.keys.Z.isDown || this.keys.W.isDown) vy -= 1
    if (this.cursors.down?.isDown || this.keys.S.isDown) vy += 1
    const len = Math.hypot(vx, vy) || 1
    if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) {
      body.setVelocity(0, 0)
      return
    }
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
      body.setVelocity(Math.cos(angle) * e.moveSpeed * 0.72, Math.sin(angle) * e.moveSpeed * 0.72)
      e.setFlipX(target.x < e.x)
      if (now < e.attackCd || !e.inMeleeRange(target)) continue
      e.attackCd = now + e.attackDelay()
      const result = resolveAttack({
        attacker: e.mon,
        defender: target.mon,
        attackerLevel: e.level,
        chart: this.chart,
        waveMul: 1 + this.wave * 0.03,
      })
      if (result.missed) {
        this.spawnFloat(target.x, target.y - 24, 'Raté', '#8aa0b8')
        continue
      }
      const dmg = target.takeDamage(result.damage)
      this.spawnHitFx(target.x, target.y - 20, dmg, result.crit, result.effectiveness, result.move.nameFr)
      if (target === this.player) {
        this.cameras.main.shake(120, 0.006)
        this.flashDamage()
      }
    }
  }

  flashDamage() {
    this.flashFx.setAlpha(0.22)
    this.tweens.add({ targets: this.flashFx, alpha: 0, duration: 220 })
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
      if (!nearest || !a.inMeleeRange(nearest) || now < a.attackCd) continue
      a.attackCd = now + a.attackDelay()
      const preferred = a === this.player ? a.preferredMove : null
      const result = resolveAttack({
        attacker: a.mon,
        defender: nearest.mon,
        attackerLevel: a.level,
        chart: this.chart,
        preferredMoveIndex: preferred,
        waveMul: 1,
      })
      if (result.missed) {
        this.spawnFloat(nearest.x, nearest.y - 24, 'Raté !', '#8aa0b8')
        continue
      }
      const dmg = nearest.takeDamage(result.damage)
      this.damageDealt += dmg
      this.spawnHitFx(nearest.x, nearest.y - 20, dmg, result.crit, result.effectiveness, result.move.nameFr)
      if (result.label.includes('efficace') || result.crit) {
        this.spawnFloat(nearest.x, nearest.y - 48, result.label, effectivenessColor(result.effectiveness))
      }
      this.combo += 1
      this.comboTimer = 1600
      if (a === this.player) this.cameras.main.shake(result.crit ? 90 : 50, result.crit ? 0.01 : 0.005)
    }
  }

  spawnHitFx(x: number, y: number, dmg: number, crit: boolean, eff: number, moveName: string) {
    const color = eff >= 2 ? '#56f0b0' : eff === 0 ? '#8aa0b8' : crit ? '#ffc14a' : '#e8f2ff'
    const t = this.add
      .text(x, y, dmg > 0 ? `-${dmg}` : '0', {
        fontFamily: 'Bungee, cursive',
        fontSize: crit ? '20px' : '15px',
        color,
        stroke: '#070b12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(3000)
    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: 480,
      onComplete: () => t.destroy(),
    })
    const ring = this.add
      .circle(x, y + 10, 8, TYPE_COLORS[moveName] ? 0x3cf0ff : crit ? 0xffc14a : 0x3cf0ff, 0.45)
      .setDepth(2999)
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
  }

  spawnFloat(x: number, y: number, text: string, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: '13px',
        color,
        stroke: '#070b12',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(3001)
    this.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    })
  }

  tryHeal() {
    if (!this.player.alive) return
    if (this.inventory.superpotion > 0 && this.player.hp < this.player.maxHp) {
      this.inventory.superpotion -= 1
      this.player.heal(90)
      this.showBanner('SUPER POTION')
      return
    }
    if (this.inventory.potion > 0 && this.player.hp < this.player.maxHp) {
      this.inventory.potion -= 1
      this.player.heal(40)
      this.showBanner('POTION')
      return
    }
    if (this.inventory.revive > 0) {
      const down = this.allies.find((a) => a !== this.player && !a.alive)
      if (down) {
        this.inventory.revive -= 1
        down.hp = Math.round(down.maxHp * 0.5)
        down.setAlpha(1)
        down.setActive(true)
        down.setVisible(true)
        const body = down.body as Phaser.Physics.Arcade.Body
        body.enable = true
        this.showBanner(`RAPPEL · ${down.mon.nameFr}`)
        return
      }
    }
    this.spawnFloat(this.player.x, this.player.y - 40, 'Pas de soin', '#8aa0b8')
  }

  tryCapture() {
    const target =
      this.enemies
        .filter((e) => e.alive)
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
            Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y),
        )[0] ?? null
    if (!target) return
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) > 140) {
      this.spawnFloat(this.player.x, this.player.y - 40, 'Trop loin', '#8aa0b8')
      return
    }

    const order: BallKey[] = ['ultraball', 'greatball', 'pokeball']
    let ball = this.selectedBall
    if (this.inventory[ball] <= 0) {
      ball = order.find((b) => this.inventory[b] > 0) ?? 'pokeball'
    }
    if (this.inventory[ball] <= 0) {
      this.spawnFloat(this.player.x, this.player.y - 40, 'Plus de Balls', '#ff4d7a')
      return
    }

    this.inventory[ball] -= 1
    this.selectedBall = ball
    const ratio = target.hp / target.maxHp
    const ok = captureCheck(target.mon.captureRate, ratio, ball)
    this.showBanner(ok ? `CAPTURÉ · ${target.mon.nameFr}` : 'Oh non ! Échappé…')

    if (ok) {
      playCry(target.mon.cryUrl, 0.55)
      this.captured.push(target.mon)
      let save = loadSave()
      save = addToRoster(save, target.mon.id, Math.max(5, target.level - 2), target.shiny)
      writeSave(save)
      if (this.allies.length < 4) {
        const ally = new Fighter(this, target.x, target.y, target.mon, 'player', {
          scaleMul: 0.9,
          level: Math.max(5, target.level - 2),
          shiny: target.shiny,
        })
        ally.hp = Math.round(ally.maxHp * 0.7)
        this.allies.push(ally)
      }
      target.hp = 0
      target.playDeathFx(() => target.destroyAll())
      this.enemies = this.enemies.filter((e) => e !== target)
    } else {
      this.spawnFloat(target.x, target.y - 40, 'Raté…', '#ff4d7a')
    }
  }

  onEnemyDown(e: Fighter) {
    const gain = 10 + this.wave * 3 + this.combo + (e.mon.isLegendary ? 40 : 0)
    this.coins += gain
    const xp = 12 + this.wave * 4 + Math.round(e.level * 1.5)
    this.xpGained += xp
    this.refreshHud()
    playCry(e.mon.cryUrl, 0.25)
    e.playDeathFx(() => e.destroyAll())
  }

  finish(won: boolean) {
    if (this.ended) return
    this.ended = true

    let save = loadSave()
    save.coins += this.coins
    save.bestWave = Math.max(save.bestWave, this.wave)
    save.runs += 1
    save.inventory = this.inventory
    if (won) save.unlockedGen = Math.min(9, Math.max(save.unlockedGen, Math.min(3 + Math.floor(save.runs / 3), 9)))
    else if (this.wave >= 8) save.unlockedGen = Math.min(9, Math.max(save.unlockedGen, 2))

    // Apply XP to team leads
    save.team = save.team.map((slot) => {
      const mon = this.allies.find((a) => a.mon.id === slot.id)?.mon
      if (!mon) return { ...slot, xp: slot.xp + Math.floor(this.xpGained / Math.max(1, save.team.length)) }
      const res = addXp(slot, Math.floor(this.xpGained / Math.max(1, save.team.length)), mon)
      if (res.evolved && res.newId) {
        save.roster = [...new Set([...save.roster, res.newId])]
        save.seen = [...new Set([...save.seen, res.newId])]
      }
      return res.owned
    })

    writeSave(save)

    const result: ArenaResult = {
      won,
      wave: this.wave,
      coins: this.coins,
      captured: this.captured,
      damageDealt: Math.round(this.damageDealt),
      xpGained: this.xpGained,
    }

    this.cameras.main.fadeOut(400, 7, 11, 18)
    this.time.delayedCall(420, () => this.scene.start('result', result))
  }
}
