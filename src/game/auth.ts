/**
 * Comptes embarqués sécurisés (sans serveur).
 * Mot de passe : PBKDF2-SHA-256 (120k itérations) + sel aléatoire.
 * Session : jeton aléatoire hashé, durée 30 jours.
 * Sauvegardes isolées par userId.
 */

const ACCOUNTS_KEY = 'pokearena-accounts-v1'
const SESSION_KEY = 'pokearena-session-v1'
const LEGACY_SAVE = 'pokearena-save-v4'
const PBKDF2_ITERS = 120_000
const SESSION_DAYS = 30

export type AccountRecord = {
  id: string
  username: string
  salt: string
  hash: string
  createdAt: number
  sessionHash?: string
}

export type Session = {
  userId: string
  token: string
  exp: number
}

type AccountStore = Record<string, AccountRecord>

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function randomHex(bytes = 32): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return bufToHex(a.buffer)
}

async function deriveKey(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBuf(saltHex) as BufferSource,
      iterations: PBKDF2_ITERS,
    },
    baseKey,
    256,
  )
  return bufToHex(bits)
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder()
  const dig = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return bufToHex(dig)
}

function readAccounts(): AccountStore {
  return safeParse(localStorage.getItem(ACCOUNTS_KEY), {})
}

function writeAccounts(store: AccountStore) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(store))
}

function normalizeUser(name: string) {
  return name.trim().toLowerCase()
}

export function saveKeyForUser(userId: string) {
  return `pokearena-save-v4:${userId}`
}

export function getSession(): Session | null {
  const s = safeParse<Session | null>(localStorage.getItem(SESSION_KEY), null)
  if (!s?.userId || !s.token || !s.exp) return null
  if (Date.now() > s.exp) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return s
}

export async function validateSession(): Promise<AccountRecord | null> {
  const session = getSession()
  if (!session) return null
  const store = readAccounts()
  const acc = Object.values(store).find((a) => a.id === session.userId)
  if (!acc?.sessionHash) return null
  const hash = await sha256Hex(session.token)
  if (hash !== acc.sessionHash) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return acc
}

export function getActiveUserId(): string | null {
  return getSession()?.userId ?? null
}

export function getActiveUsername(): string | null {
  const id = getActiveUserId()
  if (!id) return null
  const acc = Object.values(readAccounts()).find((a) => a.id === id)
  return acc?.username ?? null
}

function migrateLegacySave(userId: string) {
  const userKey = saveKeyForUser(userId)
  if (localStorage.getItem(userKey)) return
  const legacy = localStorage.getItem(LEGACY_SAVE)
  if (legacy) {
    localStorage.setItem(userKey, legacy)
    localStorage.removeItem(LEGACY_SAVE)
  }
}

async function openSession(acc: AccountRecord): Promise<Session> {
  const token = randomHex(32)
  const sessionHash = await sha256Hex(token)
  const store = readAccounts()
  store[normalizeUser(acc.username)] = { ...acc, sessionHash }
  writeAccounts(store)
  const session: Session = {
    userId: acc.id,
    token,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  migrateLegacySave(acc.id)
  return session
}

export async function registerAccount(
  username: string,
  password: string,
): Promise<{ ok: true; account: AccountRecord } | { ok: false; error: string }> {
  const u = normalizeUser(username)
  if (u.length < 3 || u.length > 20) return { ok: false, error: 'Pseudo 3 à 20 caractères' }
  if (!/^[a-z0-9._-]+$/i.test(u)) return { ok: false, error: 'Lettres, chiffres, . _ - uniquement' }
  if (password.length < 6) return { ok: false, error: 'Mot de passe 6 caractères min.' }

  const store = readAccounts()
  if (store[u]) return { ok: false, error: 'Ce pseudo existe déjà' }

  const salt = randomHex(16)
  const hash = await deriveKey(password, salt)
  const account: AccountRecord = {
    id: randomHex(16),
    username: u,
    salt,
    hash,
    createdAt: Date.now(),
  }
  store[u] = account
  writeAccounts(store)
  await openSession(account)
  return { ok: true, account }
}

export async function loginAccount(
  username: string,
  password: string,
): Promise<{ ok: true; account: AccountRecord } | { ok: false; error: string }> {
  const u = normalizeUser(username)
  const store = readAccounts()
  const acc = store[u]
  if (!acc) return { ok: false, error: 'Compte introuvable' }
  const hash = await deriveKey(password, acc.salt)
  if (hash !== acc.hash) return { ok: false, error: 'Mot de passe incorrect' }
  await openSession(acc)
  return { ok: true, account: acc }
}

export function logout() {
  const session = getSession()
  if (session) {
    const store = readAccounts()
    for (const key of Object.keys(store)) {
      if (store[key].id === session.userId) {
        store[key] = { ...store[key], sessionHash: undefined }
      }
    }
    writeAccounts(store)
  }
  localStorage.removeItem(SESSION_KEY)
}

export function hasAnyAccount(): boolean {
  return Object.keys(readAccounts()).length > 0
}
