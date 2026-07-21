import { ensureAuth } from './auth-gate'
import { createGame } from './game/config'

void (async () => {
  await ensureAuth()
  createGame('game')
})()
