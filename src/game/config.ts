import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { SelectScene } from './scenes/SelectScene'
import { ArenaScene } from './scenes/ArenaScene'
import { ResultScene } from './scenes/ResultScene'

export const GAME_W = 960
export const GAME_H = 540

export function createGame(parent: string) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#070b12',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, TitleScene, SelectScene, ArenaScene, ResultScene],
    render: {
      antialias: true,
      roundPixels: false,
    },
  })
}
