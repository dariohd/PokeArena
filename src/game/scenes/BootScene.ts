import Phaser from 'phaser'
import { ensureTypeChart, fetchMany, loadSave } from '../data/pokeapi'
import { ITEM_SPRITE, STARTERS } from '../data/types'
import { hideBootOverlay, setBootProgress } from '../fx'
import { ensureItemIcons, itemSpriteUrl, itemTextureKey } from '../ui'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    setBootProgress(4, 'Connexion PokéAPI…')
    const save = loadSave()

    try {
      setBootProgress(12, 'Chart des types…')
      await ensureTypeChart()

      setBootProgress(28, 'Objets du Mart…')
      await ensureItemIcons(this)

      setBootProgress(42, 'Équipe & mascottes…')
      const ids = [
        ...new Set([
          ...STARTERS,
          ...save.team.map((t) => t.id),
          ...save.roster.slice(0, 16),
          6,
          25,
          150,
          151,
          249,
          384,
        ]),
      ]
      const mons = await fetchMany(ids, { full: false })
      setBootProgress(58, `${mons.length} espèces en cache…`)

      for (const m of mons) {
        if (!this.textures.exists(m.battleKey)) this.load.image(m.battleKey, m.battleUrl)
        if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
      }
      for (const [k, api] of Object.entries(ITEM_SPRITE)) {
        const key = itemTextureKey(k as keyof typeof ITEM_SPRITE)
        if (!this.textures.exists(key)) this.load.image(key, itemSpriteUrl(api))
      }

      if (this.load.list.size > 0) {
        setBootProgress(68, 'Téléchargement des sprites…')
        await new Promise<void>((resolve) => {
          this.load.on('progress', (v: number) => {
            setBootProgress(68 + v * 28, 'Sprites PokéAPI…')
          })
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
          this.load.start()
        })
      }

      setBootProgress(100, 'Prêt !')
      await this.wait(380)
    } catch (e) {
      console.warn('PokéAPI boot partial fail', e)
      setBootProgress(100, 'Mode hors-ligne partiel…')
      await this.wait(450)
    }

    hideBootOverlay()
    await this.wait(280)
    this.scene.start('title')
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }
}
