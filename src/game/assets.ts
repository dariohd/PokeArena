/** Assets libres : fonds Pokémon Showdown (gen6 / client) + URLs sprites. */

export const BG = {
  title: 'bg-charizard',
  hub: 'bg-horizon',
  onboard: 'bg-shaymin',
  gacha: 'bg-skypillar',
  gachaDark: 'bg-darkmeadow',
  arena: ['bg-meadow', 'bg-forest', 'bg-beach', 'bg-sea'] as const,
  shop: 'bg-city',
  train: 'bg-cave',
  team: 'bg-ocean',
  dex: 'bg-library',
  resultWin: 'bg-meadow',
  resultLose: 'bg-desert',
} as const

export const BG_FILES: Record<string, string> = {
  'bg-meadow': '/assets/bg/meadow.jpg',
  'bg-forest': '/assets/bg/forest.jpg',
  'bg-beach': '/assets/bg/beach.jpg',
  'bg-city': '/assets/bg/city.jpg',
  'bg-library': '/assets/bg/library.jpg',
  'bg-cave': '/assets/bg/cave.jpg',
  'bg-skypillar': '/assets/bg/skypillar.jpg',
  'bg-darkmeadow': '/assets/bg/darkmeadow.jpg',
  'bg-sea': '/assets/bg/sea.jpg',
  'bg-desert': '/assets/bg/desert.jpg',
  'bg-horizon': '/assets/bg/horizon.jpg',
  'bg-charizard': '/assets/bg/charizard.jpg',
  'bg-ocean': '/assets/bg/ocean.jpg',
  'bg-shaymin': '/assets/bg/shaymin.jpg',
}

export function homeSpriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`
}

export function homeShinyUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`
}

export function artSpriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

export function randomArenaBg(): string {
  const list = BG.arena
  return list[Math.floor(Math.random() * list.length)]
}
