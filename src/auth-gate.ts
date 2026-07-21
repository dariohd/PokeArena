import {
  hasAnyAccount,
  loginAccount,
  registerAccount,
  validateSession,
} from './game/auth'

/** Affiche la porte d’entrée jusqu’à session valide, puis résout. */
export function ensureAuth(): Promise<void> {
  return new Promise((resolve) => {
    void (async () => {
      const existing = await validateSession()
      if (existing) {
        document.getElementById('auth')?.classList.add('is-hidden')
        resolve()
        return
      }
      mountAuthGate(resolve)
    })()
  })
}

function mountAuthGate(done: () => void) {
  const root = document.getElementById('auth')
  const boot = document.getElementById('boot')
  if (!root) {
    done()
    return
  }
  boot?.classList.add('is-hidden')
  root.classList.remove('is-hidden')
  let register = !hasAnyAccount()

  const finish = () => {
    root.classList.add('is-hidden')
    boot?.classList.remove('is-hidden')
    done()
  }

  const render = () => {
    root.innerHTML = `
      <div class="auth__card">
        <div class="auth__ball" aria-hidden="true"></div>
        <h1 class="auth__brand">PokeArena</h1>
        <p class="auth__tag">Invoque. Combat. Évolue.</p>
        <form class="auth__form" id="auth-form" autocomplete="on">
          <label class="auth__label">
            Pseudo
            <input class="auth__input" id="auth-user" name="username" type="text" maxlength="20" required autocomplete="username" spellcheck="false" />
          </label>
          <label class="auth__label">
            Mot de passe
            <input class="auth__input" id="auth-pass" name="password" type="password" minlength="6" required autocomplete="${register ? 'new-password' : 'current-password'}" />
          </label>
          <p class="auth__error" id="auth-error" hidden></p>
          <button class="auth__cta" id="auth-submit" type="submit">${register ? 'Créer mon compte' : 'Entrer'}</button>
        </form>
        <button class="auth__switch" id="auth-switch" type="button">
          ${register ? 'J’ai déjà un compte' : 'Créer un compte'}
        </button>
        <p class="auth__hint">Compte sécurisé sur cet appareil</p>
      </div>
    `

    const form = document.getElementById('auth-form') as HTMLFormElement
    const err = document.getElementById('auth-error') as HTMLParagraphElement
    const submit = document.getElementById('auth-submit') as HTMLButtonElement
    const switchBtn = document.getElementById('auth-switch') as HTMLButtonElement
    const userInput = document.getElementById('auth-user') as HTMLInputElement
    const passInput = document.getElementById('auth-pass') as HTMLInputElement

    switchBtn.addEventListener('click', () => {
      register = !register
      render()
    })

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        err.hidden = true
        submit.disabled = true
        const prev = submit.textContent
        submit.textContent = '…'
        const res = register
          ? await registerAccount(userInput.value, passInput.value)
          : await loginAccount(userInput.value, passInput.value)
        if (!res.ok) {
          err.textContent = res.error
          err.hidden = false
          submit.disabled = false
          submit.textContent = prev
          return
        }
        finish()
      })()
    })

    userInput.focus()
  }

  render()
}
