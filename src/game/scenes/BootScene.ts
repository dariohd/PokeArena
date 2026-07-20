import Phaser from 'phaser'
import { BG } from '../assets'
import { preloadBackgrounds } from '../backdrop'
import { ensureTypeChart, fetchMany, loadSave } from '../data/pokeapi'
import { ITEM_SPRITE, STARTERS } from '../data/types'
import { hideBootOverlay, setBootProgress } from '../fx'
import { ensureItemIcons, itemSpriteUrl, itemTextureKey } from '../ui'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    setBootProgress(5, 'Fonds Pokémon Showdown…')
    const save = loadSave()

    try {
      await preloadBackgrounds(this)
      setBootProgress(25, 'Chart des types…')
      await ensureTypeChart()

      setBootProgress(40, 'Objets…')
      await ensureItemIcons(this)

      setBootProgress(55, 'Sprites HOME…')
      const ids = [
        ...new Set([
          ...STARTERS,
          ...save.team.map((t) => t.id),
          ...save.roster.slice(0, 16),
          6,
          25,
          150,
          151,
        ]),
      ]
      const mons = await fetchMany(ids, { full: false })
      for (const m of mons) {
        if (!this.textures.exists(m.homeKey)) this.load.image(m.homeKey, m.homeUrl)
        if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
      }
      for (const [k, api] of Object.entries(ITEM_SPRITE)) {
        const key = itemTextureKey(k as keyof typeof ITEM_SPRITE)
        if (!this.textures.exists(key)) this.load.image(key, itemSpriteUrl(api))
      }

      if (this.load.list.size > 0) {
        setBootProgress(70, 'Téléchargement…')
        await new Promise<void>((resolve) => {
          this.load.on('progress', (v: number) => setBootProgress(70 + v * 25, 'Sprites HQ…'))
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
          this.load.start()
        })
      }

      setBootProgress(100, 'Prêt')
      await this.wait(280)
    } catch (e) {
      console.warn('boot partial', e)
      setBootProgress(100, 'Mode partiel…')
      await this.wait(400)
    }

    hideBootOverlay()
    await this.wait(220)
    this.scene.start('title')
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }
}
