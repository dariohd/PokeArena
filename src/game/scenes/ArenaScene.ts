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
import { BG_FILES, randomArenaBg } from '../assets'
import { ARENA_FAR_Y, ARENA_NEAR_Y } from '../fx'
import { FONT_TITLE, FONT_UI, Theme } from '../theme'
import { hexCss } from '../ui'

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
    this.cameras.main.fadeIn(220, 107, 184, 224)
    this.drawArena()
    this.physics.world.setBounds(80, ARENA_FAR_Y - 10, GAME_W - 160, ARENA_NEAR_Y - ARENA_FAR_Y + 40)

    const team = save.team.length
      ? save.team
      : [{ id: save.starterId || 25, level: 12, xp: 0, shiny: false, stars: 1, trainBonus: 0 }]

    for (let i = 0; i < team.length; i++) {
      const slot = team[i]
      const mon = await this.ensureMon(slot.id, slot.level, true)
      save.seen = markSeen(save, mon.id).seen
      const x = GAME_W / 2 + (i - (team.length - 1) / 2) * 70
      const y = Phaser.Math.Clamp(GAME_H / 2 + 70, ARENA_FAR_Y + 40, ARENA_NEAR_Y - 20)
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
    hudBg.fillStyle(0x05070c, 0.82)
    hudBg.fillRoundedRect(16, 14, 260, 72, 12)
    hudBg.lineStyle(1, 0xffffff, 0.14)
    hudBg.strokeRoundedRect(16, 14, 260, 72, 12)
    hudBg.fillStyle(0xe3350d, 1)
    hudBg.fillRect(16, 14, 4, 72)
    hudBg.fillStyle(0x05070c, 0.82)
    hudBg.fillRoundedRect(GAME_W - 240, 14, 224, 56, 12)
    hudBg.strokeRoundedRect(GAME_W - 240, 14, 224, 56, 12)
    hudBg.fillStyle(0x05070c, 0.86)
    hudBg.fillRoundedRect(16, GAME_H - 108, 400, 88, 12)
    hudBg.strokeRoundedRect(16, GAME_H - 108, 400, 88, 12)

    this.hudWave = this.add
      .text(34, 22, '', { fontFamily: FONT_TITLE, fontSize: '20px', color: hexCss(Theme.gold) })
      .setDepth(2000)
      .setScrollFactor(0)
    this.hudCoins = this.add
      .text(34, 52, '', { fontFamily: FONT_UI, fontSize: '13px', color: 'rgba(255,255,255,0.9)' })
      .setDepth(2000)
      .setScrollFactor(0)

    this.hudCombo = this.add
      .text(GAME_W - 28, 20, '', { fontFamily: FONT_TITLE, fontSize: '18px', color: hexCss(Theme.red) })
      .setOrigin(1, 0)
      .setDepth(2000)
      .setScrollFactor(0)
    this.add.rectangle(GAME_W - 220, 52, 180, 8, 0x333340, 1).setOrigin(0, 0.5).setDepth(2000).setScrollFactor(0)
    this.comboBarFg = this.add
      .rectangle(GAME_W - 220, 52, 0, 8, Theme.red)
      .setOrigin(0, 0.5)
      .setDepth(2001)
      .setScrollFactor(0)

    this.playerNameText = this.add
      .text(32, GAME_H - 98, '', { fontFamily: FONT_UI, fontSize: '13px', color: 'rgba(255,255,255,0.9)' })
      .setDepth(2000)
      .setScrollFactor(0)
    this.add
      .rectangle(32, GAME_H - 70, 280, 16, Theme.ink, 0.95)
      .setOrigin(0, 0.5)
      .setDepth(2000)
      .setScrollFactor(0)
    this.playerBarFg = this.add
      .rectangle(34, GAME_H - 70, 276, 12, Theme.hpGreen)
      .setOrigin(0, 0.5)
      .setDepth(2001)
      .setScrollFactor(0)
    this.playerBarText = this.add
      .text(170, GAME_H - 70, '', {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2002)
      .setScrollFactor(0)

    this.hudMoves = this.add
      .text(32, GAME_H - 44, '', {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.75)',
      })
      .setDepth(2000)
      .setScrollFactor(0)

    this.banner = this.add
      .text(GAME_W / 2, 120, '', {
        fontFamily: FONT_TITLE,
        fontSize: '32px',
        color: '#ffffff',
        stroke: hexCss(Theme.red),
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(2010)
      .setAlpha(0)

    this.add
      .text(GAME_W / 2, GAME_H - 14, 'ZQSD · 1-4 · H soin · T auto', {
        fontFamily: FONT_UI,
        fontSize: '11px',
        color: 'rgba(255,255,255,0.45)',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setScrollFactor(0)

    this.flashFx = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xe3350d, 0)
      .setOrigin(0)
      .setDepth(2500)
      .setScrollFactor(0)
    this.vignette = this.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xe3350d, 0)
      .setOrigin(0)
      .setDepth(2490)
      .setScrollFactor(0)

    this.autoLabel = this.add
      .text(GAME_W - 70, 70, this.autoMode ? 'Auto' : 'Manu', {
        fontFamily: FONT_TITLE,
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: this.autoMode ? '#4f9a2e' : '#4a5568',
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
      const x = 460 + i * 160
      const btn = this.add
        .text(x, GAME_H - 56, `${i + 1}. ${m.nameFr}`, {
          fontFamily: FONT_UI,
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: i === 0 ? '#e8b923' : '#4a5568',
          padding: { x: 10, y: 8 },
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
      btn.setBackgroundColor(i === this.player.preferredMove ? '#e8b923' : '#4a5568')
      btn.setColor(i === this.player.preferredMove ? '#1e2438' : '#ffffff')
    })
  }

  toggleAuto() {
    this.autoMode = !this.autoMode
    const save = loadSave()
    save.autoMode = this.autoMode
    writeSave(save)
    this.autoLabel.setText(this.autoMode ? 'Auto' : 'Manu')
    this.autoLabel.setBackgroundColor(this.autoMode ? '#4f9a2e' : '#4a5568')
    this.showBanner(this.autoMode ? 'Mode auto' : 'Mode manuel')
  }

  setupMobileControls() {
    const zone = this.add
      .circle(110, GAME_H - 170, 58, 0x3b7dd8, 0.18)
      .setStrokeStyle(2, 0x3b7dd8, 0.5)
      .setScrollFactor(0)
      .setDepth(2100)
      .setInteractive()
    const knob = this.add.circle(110, GAME_H - 170, 24, 0x3b7dd8, 0.55).setScrollFactor(0).setDepth(2101)

    const healBtn = this.add
      .text(GAME_W - 80, GAME_H - 160, 'Soin', {
        fontFamily: FONT_TITLE,
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#4caf70',
        padding: { x: 14, y: 12 },
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
    const key = randomArenaBg()
    const url = BG_FILES[key]
    // sync load if missing (boot usually preloaded)
    if (!this.textures.exists(key) && url) {
      this.load.image(key, url)
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.placeArenaBg(key))
      this.load.start()
    } else {
      this.placeArenaBg(key)
    }
  }

  placeArenaBg(key: string) {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a2830).setOrigin(0).setDepth(0)
    if (this.textures.exists(key)) {
      const img = this.add.image(GAME_W / 2, GAME_H / 2, key).setDepth(1)
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      const cover = Math.max(GAME_W / (src.width || 700), GAME_H / (src.height || 500))
      img.setScale(cover)
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR)
    }
    // Voile bas pour HUD
    this.add.rectangle(GAME_W / 2, GAME_H - 56, GAME_W, 112, 0x000000, 0.38).setDepth(5)
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
      const x = Phaser.Math.Clamp(GAME_W / 2 + Math.cos(angle) * (boss ? 0 : 200), 120, GAME_W - 120)
      const y = Phaser.Math.Clamp(
        GAME_H / 2 + 40 + Math.sin(angle) * (boss ? -20 : 70),
        ARENA_FAR_Y + 20,
        ARENA_NEAR_Y - 10,
      )
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
      this.comboBarFg.width = 180 * Phaser.Math.Clamp(this.comboTimer / 2400, 0, 1)
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
        fontFamily: FONT_TITLE,
        fontSize: crit ? '18px' : '14px',
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
        fontFamily: FONT_UI,
        fontSize: '12px',
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
