import Phaser from 'phaser'
import { preloadBackgrounds } from '../backdrop'
import { ensureTypeChart, fetchMany, loadSave } from '../data/pokeapi'
import { STARTER_TRIO } from '../data/types'
import { hideBootOverlay, setBootProgress } from '../fx'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    setBootProgress(8, 'Préparation…')
    const save = loadSave()

    try {
      await Promise.all([preloadBackgrounds(this), ensureTypeChart()])
      setBootProgress(45, 'Équipe…')

      const ids = [
        ...new Set([
          ...STARTER_TRIO,
          ...save.team.map((t) => t.id),
          save.starterId || 0,
          25,
        ].filter(Boolean)),
      ]
      const mons = await fetchMany(ids, { full: false })
      for (const m of mons) {
        if (!this.textures.exists(m.homeKey)) this.load.image(m.homeKey, m.homeUrl)
      }

      if (this.load.list.size > 0) {
        setBootProgress(65, 'Sprites…')
        await new Promise<void>((resolve) => {
          this.load.on('progress', (v: number) => setBootProgress(65 + v * 30, 'Presque…'))
          this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
          this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve())
          this.load.start()
        })
      }

      setBootProgress(100, 'Go')
    } catch (e) {
      console.warn('boot partial', e)
      setBootProgress(100, 'Go')
    }

    hideBootOverlay()
    await this.wait(80)

    // Direct hub / onboard — pas de title
    const ready = Boolean(save.starterId && save.team.length)
    this.scene.start(ready ? 'hub' : 'onboard')
  }

  wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, () => resolve()))
  }
}
