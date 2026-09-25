import { useSyncExternalStore } from 'react'

/**
 * App-wide theme, independent of login. The choice lives in localStorage under
 * `dilgo.theme` (the same key the boot script in index.html reads before paint),
 * so the setting works on the marketing pages too — not only once you have an account.
 */
export type Theme = 'light' | 'dark' | 'system'

const KEY = 'dilgo.theme'
const listeners = new Set<() => void>()
let media: MediaQueryList | null = null

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* private mode */
  }
  return 'system'
}

/** Whether dark styling should currently be on, resolving `system`. */
export function resolvedDark(theme = read()): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme = read()) {
  document.documentElement.classList.toggle('dark', resolvedDark(theme))
}

export function setTheme(theme: Theme) {
  try {
    theme === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
  applyTheme(theme)
  listeners.forEach((l) => l())
}

export function getTheme(): Theme {
  return read()
}

/** Follow the OS while on `system`, and re-apply across tabs when the key changes. */
export function initTheme() {
  applyTheme()
  media ??= matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (read() === 'system') applyTheme()
    listeners.forEach((l) => l())
  })
  addEventListener('storage', (e) => {
    if (e.key === KEY) {
      applyTheme()
      listeners.forEach((l) => l())
    }
  })
}

export function useTheme(): [Theme, boolean] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => 'system' as Theme,
  )
  return [theme, resolvedDark(theme)]
}
