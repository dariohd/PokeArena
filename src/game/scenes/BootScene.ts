import Phaser from 'phaser'
import { fetchMany, loadSave } from '../data/pokeapi'
import { STARTERS } from '../data/types'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    const save = loadSave()
    const ids = [
      ...new Set([
        ...STARTERS,
        ...save.roster,
        10, 16, 19, 25, 39, 52, 54, 66, 74, 92, 129, 133,
      ]),
    ]

    try {
      const mons = await fetchMany(ids)
      for (const m of mons) {
        if (!this.textures.exists(m.spriteKey)) {
          this.load.image(m.spriteKey, m.spriteUrl)
        }
      }
      if (this.load.list.size > 0) {
        await new Promise<void>((resolve) => {
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.start()
        })
      }
    } catch (e) {
      console.warn('PokéAPI boot partial fail', e)
    }

    document.getElementById('boot')?.classList.add('is-hidden')
    this.scene.start('title')
  }
}
