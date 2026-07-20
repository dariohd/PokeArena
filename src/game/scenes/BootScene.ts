import Phaser from 'phaser'
import { ensureTypeChart, fetchMany, loadSave } from '../data/pokeapi'
import { STARTERS } from '../data/types'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    const bootSub = document.querySelector('.boot__sub')
    if (bootSub) bootSub.textContent = 'Préparation de l’arène…'

    const save = loadSave()
    try {
      await ensureTypeChart()
      if (bootSub) bootSub.textContent = 'Chargement des starters…'
      const ids = [
        ...new Set([
          ...STARTERS,
          ...save.team.map((t) => t.id),
          ...save.roster.slice(0, 12),
          25,
        ]),
      ]
      const mons = await fetchMany(ids, { full: false })
      for (const m of mons) {
        if (!this.textures.exists(m.battleKey)) this.load.image(m.battleKey, m.battleUrl)
        if (!this.textures.exists(m.spriteKey)) this.load.image(m.spriteKey, m.spriteUrl)
      }
      if (this.load.list.size > 0) {
        await new Promise<void>((resolve) => {
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
          this.load.start()
        })
      }
    } catch (e) {
      console.warn('PokéAPI boot partial fail', e)
      if (bootSub) bootSub.textContent = 'Mode hors-ligne partiel…'
    }

    document.getElementById('boot')?.classList.add('is-hidden')
    this.scene.start('title')
  }
}
