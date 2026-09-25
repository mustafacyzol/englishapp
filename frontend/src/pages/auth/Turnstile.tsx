import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void }
  }
}

/** Cloudflare Turnstile widget. Renders nothing when no site key is configured. */
export function Turnstile({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!SITE_KEY || !ref.current) return
    let id: string | undefined
    const mount = () => {
      if (ref.current && window.turnstile) id = window.turnstile.render(ref.current, { sitekey: SITE_KEY, callback: onToken, theme: 'auto', language: 'tr' })
    }
    if (window.turnstile) mount()
    else {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = mount
      document.head.appendChild(s)
    }
    return () => {
      if (id && window.turnstile) window.turnstile.remove(id)
    }
  }, [onToken])
  return SITE_KEY ? <div ref={ref} className="my-2" /> : null
}
