/** Palette inspirée Centre Pokémon / RPG classique (pas de néon cyber) */
export const Theme = {
  skyTop: 0x8fd3f4,
  skyBot: 0xd6f0fb,
  grass: 0x7ac74f,
  grassDark: 0x4f9a2e,
  dirt: 0xe8c878,
  dirtDark: 0xc9a24a,
  panel: 0xfffbf5,
  panelDeep: 0xf3ebe0,
  panelEdge: 0x3a4a6b,
  panelStroke: 0x203060,
  ink: 0x1e2438,
  muted: 0x6b7288,
  red: 0xe3350d,
  redDark: 0xa82018,
  blue: 0x3b7dd8,
  blueDark: 0x2456a0,
  yellow: 0xf7d02c,
  gold: 0xe8b923,
  white: 0xffffff,
  pink: 0xf7a8b8,
  pinkSoft: 0xffe4ea,
  centreFloor: 0xf0e6dc,
  martBlue: 0x3d7ab5,
  martShelf: 0x2a5a8a,
  dojoWood: 0xc48a4a,
  dojoDark: 0x8a5a2e,
  dexRed: 0xc62828,
  dexDark: 0x8e1b1b,
  machine: 0x4a5568,
  machineLite: 0x718096,
  hpGreen: 0x4caf70,
  hpYellow: 0xf0c030,
  hpRed: 0xe84848,
  shadow: 0x000000,
} as const

export const FONT_UI = '"Nunito", system-ui, sans-serif'
export const FONT_TITLE = '"Fredoka", "Nunito", sans-serif'

export type RoomKind =
  | 'outdoor'
  | 'centre'
  | 'mart'
  | 'dojo'
  | 'dex'
  | 'machine'
  | 'pc'
  | 'result'
