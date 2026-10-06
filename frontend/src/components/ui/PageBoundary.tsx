import { Component, type ReactNode } from 'react'
import { Higo } from '@/components/game/Higo'

const CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i

/** After a deploy the old page bundles are gone; one quiet reload picks up the new ones. */
function reloadOnce() {
  try {
    if (sessionStorage.getItem('chunk-reload')) return false
    sessionStorage.setItem('chunk-reload', '1')
  } catch { /* storage blocked: still try once */ }
  location.reload()
  return true
}
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault() })
  window.addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem('chunk-reload') } catch { /* ignore */ } }, 5000))
}

/**
 * Keeps one broken page from blanking the whole app: the menus stay, the page
 * shows Higo with a retry, and moving to another page clears the error.
 */
export class PageBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }
  componentDidCatch(error: Error) {
    if (CHUNK.test(error.message)) reloadOnce()
    console.error(error)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-14 text-center">
        <Higo pose="think" className="size-28" />
        <p className="mt-4 font-display text-2xl font-black">Bu sayfa takıldı</p>
        <p className="mt-1 text-sm text-ink-soft">Bir şeyler ters gitti. Tekrar denemek genelde yeter.</p>
        <button onClick={() => location.reload()} className="press mt-5 rounded-xl bg-inv px-5 py-2.5 font-extrabold text-on-inv">Tekrar dene</button>
      </div>
    )
  }
}
