/**
 * Microphone permission, asked at the moment it is needed.
 *
 * Speech recognition only raises its own prompt on some browsers, and never again
 * once the site has been blocked. So a speaking exercise asks up front through
 * getUserMedia — that is the call every browser and the Capacitor WebView answer
 * with the real system dialog — and we keep the outcome so we can explain the
 * blocked case instead of failing silently.
 */

export type MicState = 'unknown' | 'prompt' | 'granted' | 'denied'

let cached: MicState = 'unknown'
let inflight: Promise<MicState> | null = null

export const micSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

/** Reads the current permission without showing a dialog. Not every browser can tell us. */
export async function readMicState(): Promise<MicState> {
  if (cached === 'granted' || cached === 'denied') return cached
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName })
    if (status) {
      cached = status.state as MicState
      status.onchange = () => {
        cached = status.state as MicState
      }
      return cached
    }
  } catch {
    /* Firefox and Safari don't expose the microphone permission — fall through. */
  }
  return cached
}

/**
 * Asks for the microphone, showing the system dialog when the answer isn't known yet.
 * The stream is released immediately: we only want the grant, recognition opens its own.
 */
export async function ensureMic(): Promise<MicState> {
  if (!micSupported()) return 'denied'
  if (cached === 'granted') return 'granted'
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      cached = 'granted'
    } catch (e) {
      const name = (e as DOMException)?.name
      cached = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'prompt'
    } finally {
      inflight = null
    }
    return cached
  })()

  return inflight
}

/** Where the person re-enables the microphone, per browser, in plain Turkish. */
export function micHelpText(): string {
  const ua = navigator.userAgent
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Adres çubuğundaki kilit simgesine dokun → Site ayarları → Mikrofon → İzin ver.'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari menüsü → Bu Web Sitesi için Ayarlar → Mikrofon → İzin Ver.'
  if (/Firefox/i.test(ua)) return 'Adres çubuğundaki kilit simgesine tıkla → Engellendi: Mikrofon yazısının yanındaki çarpıya bas, sonra sayfayı yenile.'
  if (/Edg/i.test(ua)) return 'Adres çubuğundaki kilit simgesine tıkla → İzinler → Mikrofon → İzin ver.'
  return 'Tarayıcının site ayarlarından bu siteye mikrofon izni ver, sonra sayfayı yenile.'
}
