import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { OnboardScene } from './scenes/OnboardScene'
import { HubScene } from './scenes/HubScene'
import { PokedexScene } from './scenes/PokedexScene'
import { ArenaScene } from './scenes/ArenaScene'
import { ResultScene } from './scenes/ResultScene'
import { GachaScene } from './scenes/GachaScene'
import { TrainScene } from './scenes/TrainScene'
import { TeamScene } from './scenes/TeamScene'
import { ShopScene } from './scenes/ShopScene'

export const GAME_W = 960
export const GAME_H = 540

export function createGame(parent: string) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#7ec8e3',
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
    scene: [
      BootScene,
      TitleScene,
      OnboardScene,
      HubScene,
      GachaScene,
      TrainScene,
      TeamScene,
      ShopScene,
      PokedexScene,
      ArenaScene,
      ResultScene,
    ],
    render: {
      antialias: false,
      roundPixels: true,
      pixelArt: true,
    },
  })
}
