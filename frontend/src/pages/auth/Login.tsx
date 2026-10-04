import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import { Capacitor } from '@capacitor/core'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useLang } from '@/lib/i18n'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Logo } from '@/components/game/Logo'
import { SocialButtons } from '@/components/auth/SocialButtons'
import { Turnstile } from './Turnstile'
import { HigoHello } from '@/components/auth/HigoHello'
import { BRAND } from '@/lib/brand'

/**
 * Sign-in is deliberately quiet: one centred card, the fastest options first
 * (Google, Apple), then e-mail. Sign-up keeps the rich, photo-led onboarding.
 */
export default function Login() {
  const { signIn } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [captcha, setCaptcha] = useState('')

  const done = async (token: string, user: Me, keep: boolean) => {
    await signIn(token, user, keep)
    const next = params.get('next')
    nav(!user.email_verified ? '/verify-email' : next && next.startsWith('/') ? next : '/learn', { replace: true })
  }

  const m = useMutation({
    mutationFn: () => post<{ token: string; user: Me }>('/auth/login', { login, password, captcha, remember, device: Capacitor.getPlatform() }),
    onSuccess: ({ token, user }) => done(token, user, remember),
  })
  const err = m.error as ApiError | null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    m.mutate()
  }

  return (
    <div className="auth-backdrop relative flex min-h-dvh flex-col overflow-hidden">
      <header className="relative z-10 flex items-center justify-between px-4 py-2.5 sm:px-8 sm:py-3">
        <Link to="/" aria-label={`${BRAND} ana sayfa`}><Logo small /></Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-bold text-ink-soft sm:inline">{t('Hesabın yok mu?')}</span>
          <Link to="/register" className="press flex h-11 items-center gap-1.5 rounded-xl bg-flame px-4 font-display text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_3px_0_0_var(--color-flame-deep)] transition hover:brightness-105">
            {t('Kayıt ol')} <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-4 pt-1">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
          <div className="rounded-[28px] border-2 border-line bg-card p-5 shadow-soft sm:p-7 [@media(max-height:680px)]:py-4">
            {/* Higo as a round profile picture beside the heading: fits every screen */}
            <div className="mb-5 flex items-center gap-3.5 [@media(max-height:680px)]:mb-3">
              <HigoHello />
              <div className="min-w-0">
                <h1 className="whitespace-nowrap font-display text-[23px] font-black leading-tight min-[400px]:text-[26px]">{t('Tekrar hoş geldin')}</h1>
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-sm font-bold text-ink-soft">{t('Seni özledim!')}</motion.p>
              </div>
            </div>

            <SocialButtons onDone={done} remember={remember} compact />

            <div className="my-4 flex items-center gap-3 text-xs [@media(max-height:700px)]:my-2.5 font-black uppercase tracking-widest text-ink-soft">
              <span className="h-0.5 flex-1 rounded bg-line" />
              {t('veya e-posta ile')}
              <span className="h-0.5 flex-1 rounded bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-3 [@media(max-height:700px)]:space-y-2">
              {err && <Alert tone="error">{err.first()}</Alert>}
              <Input label={t('E-posta veya kullanıcı adı')} autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required autoFocus />
              <Input label={t('Şifre')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <div className="flex items-center justify-between gap-3">
                <label className="group flex cursor-pointer select-none items-center gap-2.5 text-sm font-bold">
                  <input type="checkbox" className="peer sr-only" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span className={clsx('grid size-6 place-items-center rounded-lg border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-sky/25', remember ? 'border-flame bg-flame text-white' : 'border-line bg-card group-hover:border-ink/30')}>
                    <Check className={clsx('size-4 transition', remember ? 'scale-100' : 'scale-0')} strokeWidth={3.5} />
                  </span>
                  {t('Beni hatırla')}
                </label>
                <Link to="/forgot-password" className="text-sm font-bold text-flame hover:underline">{t('Şifremi unuttum')}</Link>
              </div>
              <Turnstile onToken={setCaptcha} />
              <Button type="submit" block size="lg" loading={m.isPending}>{t('Giriş yap')}</Button>
            </form>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-soft">
              {BRAND}'da oturum açarak <Link to="/terms" className="font-bold text-ink underline underline-offset-2">Koşullarımızı</Link> ve <Link to="/privacy" className="font-bold text-ink underline underline-offset-2">Gizlilik Politikamızı</Link> kabul etmiş olursun.
            </p>
          </div>

        </motion.div>
      </main>
    </div>
  )
}
