/*
  Google and Apple sign-in on the web. Both SDKs are loaded on demand only when
  the admin has configured a client id; they hand back a signed ID token which the
  server verifies (see AuthController::social). Nothing here trusts the token.
*/
type GoogleId = {
  accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void; prompt: () => void } }
}
type AppleId = { auth: { init: (o: object) => void; signIn: () => Promise<{ authorization: { id_token: string }; user?: { name?: { firstName?: string; lastName?: string } } }> } }

declare global {
  interface Window {
    google?: GoogleId
    AppleID?: AppleId
  }
}

const scripts = new Map<string, Promise<void>>()
function load(src: string) {
  let p = scripts.get(src)
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Giriş servisine ulaşılamadı.'))
      document.head.appendChild(s)
    })
    scripts.set(src, p)
  }
  return p
}

/** Renders Google's own button (required by its brand rules) into `el`. */
export async function mountGoogle(el: HTMLElement, clientId: string, onToken: (idToken: string) => void, width: number) {
  await load('https://accounts.google.com/gsi/client')
  window.google!.accounts.id.initialize({ client_id: clientId, callback: (r: { credential: string }) => onToken(r.credential), ux_mode: 'popup', auto_select: false })
  el.innerHTML = ''
  window.google!.accounts.id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width, locale: document.documentElement.lang || 'tr' })
}

export async function appleSignIn(clientId: string) {
  await load('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/tr_TR/appleid.auth.js')
  window.AppleID!.auth.init({ clientId, scope: 'name email', redirectURI: `${location.origin}/login`, usePopup: true })
  const r = await window.AppleID!.auth.signIn()
  const n = r.user?.name
  return { idToken: r.authorization.id_token, name: n ? [n.firstName, n.lastName].filter(Boolean).join(' ') : undefined }
}
