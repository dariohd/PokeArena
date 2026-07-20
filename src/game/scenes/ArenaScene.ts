import Phaser from 'phaser'
import { playCry } from '../audio'
import { GAME_H, GAME_W } from '../config'
import { effectivenessColor, resolveAttack } from '../data/battle'
import {
  addXp,
  bumpMission,
  ensureTypeChart,
  fetchMon,
  loadSave,
  markSeen,
  randomBossId,
  randomWildId,
  writeSave,
  type TypeChart,
} from '../data/pokeapi'
import {
  MAX_WAVES,
  TYPE_COLORS,
  TYPE_FR,
  effectiveLevel,
  type ArenaResult,
  type Inventory,
  type MonSummary,
} from '../data/types'
import { Fighter } from '../entities/Fighter'

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
    H: Phaser.Input.Keyboard.Key
    T: Phaser.Input.Keyboard.Key
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
  private chart!: TypeChart
  private inventory!: Inventory
  private unlockedGen = 1
  private hudWave!: Phaser.GameObjects.Text
  private hudCoins!: Phaser.GameObjects.Text
  private hudCombo!: Phaser.GameObjects.Text
  private hudMoves!: Phaser.GameObjects.Text
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
  private autoMode = false
  private autoLabel!: Phaser.GameObjects.Text
  private moveBtns: Phaser.GameObjects.Text[] = []
  private kosThisRun = 0

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
    this.allies = []
    this.enemies = []
    this.stick = { x: 0, y: 0 }
    this.moveBtns = []
    this.kosThisRun = 0

    const save = loadSave()
    this.autoMode = save.autoMode
    this.inventory = { ...save.inventory }
    this.unlockedGen = save.unlockedGen

    this.chart = await ensureTypeChart()
    this.cameras.main.fadeIn(150, 126, 200, 227)
    this.drawArena()
    this.physics.world.setBounds(60, 100, GAME_W - 120, GAME_H - 170)

    const team = save.team.length
      ? save.team
      : [{ id: save.starterId || 25, level: 12, xp: 0, shiny: false, stars: 1, trainBonus: 0 }]

    for (let i = 0; i < team.length; i++) {
      const slot = team[i]
      const mon = await this.ensureMon(slot.id, slot.level, true)
      save.seen = markSeen(save, mon.id).seen
      const x = GAME_W / 2 + (i - (team.length - 1) / 2) * 70
      const y = GAME_H / 2 + 50
      const f = new Fighter(this, x, y, mon, 'player', {
        scaleMul: i === 0 ? 1.15 : 0.95,
        level: effectiveLevel(slot),
        shiny: slot.shiny,
      })
      if (i === 0) this.player = f
      this.allies.push(f)
      if (i === 0) playCry(mon.cryUrl, 0.35)
    }
    writeSave(save)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys('Z,Q,S,D,W,A,H,T,ONE,TWO,THREE,FOUR') as typeof this.keys

    this.buildHud()
    this.buildMoveButtons()
    this.setupMobileControls()
    this.refreshHud()
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
      .text(GAME_W / 2, GAME_H - 12, 'ZQSD · 1-4 attaques · H soin · T auto', {
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

    this.autoLabel = this.add
      .text(GAME_W - 70, 70, this.autoMode ? 'AUTO ON' : 'AUTO OFF', {
        fontFamily: 'Fredoka, Nunito, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: this.autoMode ? '#58a038' : '#6a6a7a',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(2100)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
    this.autoLabel.on('pointerdown', () => this.toggleAuto())
  }

  buildMoveButtons() {
    const moves = this.player.mon.moves
    moves.forEach((m, i) => {
      const x = 380 + i * 140
      const btn = this.add
        .text(x, GAME_H - 48, `${i + 1}. ${m.nameFr}`, {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '11px',
          color: '#2a2a3a',
          backgroundColor: i === 0 ? '#ffd070' : '#fff8f0',
          padding: { x: 8, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(2100)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
      btn.on('pointerdown', () => {
        this.player.preferredMove = i
        this.refreshMoveButtons()
        this.refreshHud()
      })
      this.moveBtns.push(btn)
    })
  }

  refreshMoveButtons() {
    this.moveBtns.forEach((btn, i) => {
      btn.setBackgroundColor(i === this.player.preferredMove ? '#ffd070' : '#fff8f0')
    })
  }

  toggleAuto() {
    this.autoMode = !this.autoMode
    const save = loadSave()
    save.autoMode = this.autoMode
    writeSave(save)
    this.autoLabel.setText(this.autoMode ? 'AUTO ON' : 'AUTO OFF')
    this.autoLabel.setBackgroundColor(this.autoMode ? '#58a038' : '#6a6a7a')
    this.showBanner(this.autoMode ? 'MODE AUTO' : 'MODE MANUEL')
  }

  setupMobileControls() {
    const zone = this.add
      .circle(90, GAME_H - 140, 52, 0x3cf0ff, 0.12)
      .setStrokeStyle(2, 0x3cf0ff, 0.35)
      .setScrollFactor(0)
      .setDepth(2100)
      .setInteractive()
    const knob = this.add.circle(90, GAME_H - 140, 22, 0x3cf0ff, 0.45).setScrollFactor(0).setDepth(2101)

    const healBtn = this.add
      .text(GAME_W - 70, GAME_H - 130, 'SOIN', {
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

  async ensureMon(id: number, levelHint = 40, full = false): Promise<MonSummary> {
    const mon = await fetchMon(id, { levelHint, full })
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
    // Boss mid-run (vague 4) + boss final (vague MAX)
    const boss = this.wave === 4 || this.wave === MAX_WAVES
    this.showBanner(boss ? `BOSS · VAGUE ${this.wave}` : `VAGUE ${this.wave}`)
    this.refreshHud()

    const count = boss ? 1 : Math.min(1 + Math.floor(this.wave / 2), 3)
    for (let i = 0; i < count; i++) {
      const id = boss ? randomBossId(this.unlockedGen) : randomWildId(this.unlockedGen, this.wave)
      const mon = await this.ensureMon(id, 20 + this.wave * 3, false)
      let save = loadSave()
      save = markSeen(save, mon.id)
      writeSave(save)

      const angle = (i / count) * Math.PI * 2
      const x = GAME_W / 2 + Math.cos(angle) * (boss ? 0 : 220)
      const y = GAME_H / 2 + 30 + Math.sin(angle) * (boss ? -40 : 90)
      const level = Math.round(5 + this.wave * 1.1 + (boss ? 5 : 0))
      const foe = new Fighter(this, x, y, mon, 'enemy', {
        scaleMul: boss ? 1.35 : 0.95 + this.wave * 0.015,
        level,
        shiny: Math.random() < 0.05,
      })
      foe.maxHp = Math.round(foe.maxHp * (0.85 + this.wave * 0.04) * (boss ? 1.55 : 1))
      foe.hp = foe.maxHp
      this.enemies.push(foe)
      this.tweens.add({
        targets: foe,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.05, to: foe.scale },
        duration: 120,
      })
      if (boss) playCry(mon.cryUrl, 0.5)
    }
    this.spawning = false
  }

  showBanner(text: string) {
    this.banner.setText(text).setAlpha(1).setScale(0.85)
    this.tweens.add({
      targets: this.banner,
      scale: 1.12,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({ targets: this.banner, alpha: 0, delay: 220, duration: 140 })
      },
    })
  }

  refreshHud() {
    this.hudWave.setText(`Vague ${this.wave}/${MAX_WAVES}`)
    this.hudCoins.setText(`${this.coins.toLocaleString('fr-FR')} ₽`)
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
      this.refreshMoveButtons()
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
      this.player.preferredMove = Math.min(1, this.player.mon.moves.length - 1)
      this.refreshMoveButtons()
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
      this.player.preferredMove = Math.min(2, this.player.mon.moves.length - 1)
      this.refreshMoveButtons()
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) {
      this.player.preferredMove = Math.min(3, this.player.mon.moves.length - 1)
      this.refreshMoveButtons()
      this.refreshHud()
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.H)) this.tryHeal()
    if (Phaser.Input.Keyboard.JustDown(this.keys.T)) this.toggleAuto()

    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      this.comboBarFg.width = 168 * Phaser.Math.Clamp(this.comboTimer / 2400, 0, 1)
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

    if (this.autoMode && Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) {
      const target = this.enemies.filter((e) => e.alive).sort(
        (a, b) =>
          Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
          Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y),
      )[0]
      if (target) {
        const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
        vx = Math.cos(ang)
        vy = Math.sin(ang)
        // Auto pick strongest damaging move
        let bestIdx = 0
        let bestScore = -1
        for (let i = 0; i < this.player.mon.moves.length; i++) {
          const m = this.player.mon.moves[i]
          if (!m.power) continue
          const score = m.power * ((m.accuracy ?? 100) / 100)
          if (score > bestScore) {
            bestScore = score
            bestIdx = i
          }
        }
        if (this.player.preferredMove !== bestIdx) {
          this.player.preferredMove = bestIdx
          this.refreshMoveButtons()
        }
        if (this.player.hp / this.player.maxHp < 0.35) this.tryHeal()
      }
    }

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
      e.attackCd = now + e.attackDelay() * 1.35
      const result = resolveAttack({
        attacker: e.mon,
        defender: target.mon,
        attackerLevel: e.level,
        chart: this.chart,
        waveMul: 0.72 + this.wave * 0.02,
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
        waveMul: a === this.player ? 1.55 : 1.35,
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
      this.comboTimer = 2400
      if (a === this.player) this.cameras.main.shake(result.crit ? 70 : 35, result.crit ? 0.008 : 0.004)
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
      duration: 280,
      onComplete: () => t.destroy(),
    })
    const ring = this.add
      .circle(x, y + 10, 8, TYPE_COLORS[moveName] ? 0x3cf0ff : crit ? 0xffc14a : 0x3cf0ff, 0.45)
      .setDepth(2999)
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 140, onComplete: () => ring.destroy() })
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
      duration: 380,
      onComplete: () => t.destroy(),
    })
  }


  /** Sync inventaire run → save (évite double Balls si refresh mid-run) */
  persistInventory() {
    const save = loadSave()
    save.inventory = { ...this.inventory }
    writeSave(save)
  }

  tryHeal() {
    if (!this.player.alive) return
    if (this.inventory.hyperpotion > 0 && this.player.hp < this.player.maxHp) {
      this.inventory.hyperpotion -= 1
      this.player.heal(160)
      this.persistInventory()
      this.showBanner('HYPER POTION')
      return
    }
    if (this.inventory.superpotion > 0 && this.player.hp < this.player.maxHp) {
      this.inventory.superpotion -= 1
      this.player.heal(90)
      this.persistInventory()
      this.showBanner('SUPER POTION')
      return
    }
    if (this.inventory.potion > 0 && this.player.hp < this.player.maxHp) {
      this.inventory.potion -= 1
      this.player.heal(40)
      this.persistInventory()
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
        this.persistInventory()
        this.showBanner(`RAPPEL · ${down.mon.nameFr}`)
        return
      }
    }
    this.spawnFloat(this.player.x, this.player.y - 40, 'Pas de soin', '#8aa0b8')
  }


  onEnemyDown(e: Fighter) {
    this.kosThisRun += 1
    const comboMul = this.combo >= 10 ? 2 : this.combo >= 5 ? 1.5 : 1.15
    const gain = Math.round((70 + this.wave * 40 + this.combo * 15 + (e.mon.isLegendary ? 300 : 0)) * comboMul)
    this.coins += gain
    const xp = 55 + this.wave * 18 + Math.round(e.level * 4) + this.combo * 3
    this.xpGained += xp
    this.spawnFloat(e.x, e.y - 20, `+${gain} ₽`, '#f8d030')
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
    save.inventory = { ...this.inventory }

    // Loot : Balls pour bannières · Super Bonbons pour dojo
    const rareGain = (won ? 3 : 1) + Math.floor(this.wave / 3)
    const ballGain = won ? 5 : 2
    save.inventory.rareCandy += rareGain
    save.inventory.pokeball += ballGain

    save.missions = save.missions.map((m) =>
      m.id === 'wave3'
        ? { ...m, progress: Math.min(m.target, Math.max(m.progress, this.wave)) }
        : m,
    )
    if (won) save = bumpMission(save, 'win1')
    if (won) save.unlockedGen = Math.min(9, save.unlockedGen + 1)

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
      kos: this.kosThisRun,
      damageDealt: Math.round(this.damageDealt),
      xpGained: this.xpGained,
    }

    this.cameras.main.fadeOut(180, 7, 11, 18)
    this.time.delayedCall(200, () => this.scene.start('result', result))
  }
}
