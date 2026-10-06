import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Capacitor } from '@capacitor/core'
import { ApiError, DEMO, post } from '@/lib/api'
import { useSiteConfig } from '@/lib/site'
import { appleSignIn, mountGoogle } from '@/lib/social'
import { useLang } from '@/lib/i18n'
import { useToast } from '@/components/ui/Toast'
import type { Me } from '@/lib/types'

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.05-.52 2.68-1.28z" />
    </svg>
  )
}

type Done = (token: string, user: Me, remember: boolean) => void

/**
 * "Continue with Google / Apple". Uses the providers' SDKs when the admin has set
 * client ids; otherwise the buttons stay visible but explain they're coming soon.
 * `extra` carries onboarding answers when used on the sign-up screen.
 */
export function SocialButtons({ onDone, remember = true, extra, className, compact }: { onDone: Done; remember?: boolean; extra?: Record<string, unknown>; className?: string; compact?: boolean }) {
  const { t } = useLang()
  const toast = useToast()
  const { data: cfg } = useSiteConfig()
  const googleRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)
  const googleId = cfg?.social_login?.google ?? null
  const appleId = cfg?.social_login?.apple ?? null
  const extraRef = useRef(extra)
  extraRef.current = extra

  const finish = async (provider: 'google' | 'apple', idToken: string, name?: string) => {
    setBusy(provider)
    try {
      const r = await post<{ token: string; user: Me }>(`/auth/social/${provider}`, { id_token: idToken, name, remember, device: Capacitor.getPlatform(), ...extraRef.current })
      onDone(r.token, r.user, remember)
    } catch (e) {
      toast((e as ApiError).first?.() ?? (e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (!googleId || DEMO || !googleRef.current) return
    const el = googleRef.current
    mountGoogle(el, googleId, (tok) => finish('google', tok), Math.min(400, el.offsetWidth || 320)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleId])

  const google = () => {
    if (DEMO) return finish('google', 'demo')
    if (!googleId) return toast('Google ile giriş çok yakında açılıyor.', 'info')
  }
  const apple = async () => {
    if (DEMO) return finish('apple', 'demo')
    if (!appleId) return toast('Apple ile giriş çok yakında açılıyor.', 'info')
    try {
      const r = await appleSignIn(appleId)
      await finish('apple', r.idToken, r.name)
    } catch {
      /* popup closed */
    }
  }

  const btn = 'relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 text-[15px] font-extrabold transition active:translate-y-px disabled:opacity-60'

  return (
    <div className={clsx('grid gap-2.5', compact && 'sm:grid-cols-2', className)}>
      {googleId && !DEMO ? (
        <div ref={googleRef} className="flex h-12 w-full items-center justify-center overflow-hidden [&>div]:!w-full" aria-label={t('Google ile devam et')} />
      ) : (
        <button type="button" onClick={google} disabled={busy !== null} className={clsx(btn, 'border-line bg-card text-ink hover:border-ink/25 hover:bg-paper-2/60')}>
          {busy === 'google' ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark className="size-5" />}
          {compact ? <><span className="sm:hidden">{t('Google ile devam et')}</span><span className="hidden sm:inline">Google</span></> : t('Google ile devam et')}
        </button>
      )}
      <button type="button" onClick={apple} disabled={busy !== null} className={clsx(btn, 'border-inv bg-inv text-on-inv hover:opacity-90')}>
        {busy === 'apple' ? <Loader2 className="size-5 animate-spin" /> : <AppleMark className="size-5 -translate-y-px" />}
        {compact ? <><span className="sm:hidden">{t('Apple ile devam et')}</span><span className="hidden sm:inline">Apple</span></> : t('Apple ile devam et')}
      </button>
    </div>
  )
}
