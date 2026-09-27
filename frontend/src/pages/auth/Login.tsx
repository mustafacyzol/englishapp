import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { Capacitor } from '@capacitor/core'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useLang } from '@/lib/i18n'
import type { Me } from '@/lib/types'
import { TUTOR } from '@/lib/tutor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Img } from '@/components/ui/Img'
import { Logo } from '@/components/game/Logo'
import { LangSelect } from '@/components/ui/LangSelect'
import { SocialButtons } from '@/components/auth/SocialButtons'
import { Turnstile } from './Turnstile'

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
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" aria-label="DilGO ana sayfa"><Logo small /></Link>
        <LangSelect />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-4">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
          <div className="rounded-[28px] border-2 border-line bg-card p-6 shadow-soft sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="relative mb-4">
                <Img src={TUTOR.avatar} alt="" className="size-16 rounded-full bg-sage/15 object-cover ring-4 ring-card" />
                <motion.span initial={{ rotate: -20 }} animate={{ rotate: [0, 18, -6, 14, 0] }} transition={{ delay: 0.5, duration: 1.1 }} className="absolute -right-2 -top-1 origin-bottom-left text-2xl" aria-hidden>👋</motion.span>
              </span>
              <h1 className="text-[28px] leading-tight sm:text-3xl">{t('Tekrar hoş geldin')}</h1>
              <p className="mt-1.5 text-ink-soft">{t('Hesabına giriş yap ve kaldığın yerden devam et.')}</p>
            </div>

            <SocialButtons onDone={done} remember={remember} />

            <div className="my-6 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-ink-soft">
              <span className="h-0.5 flex-1 rounded bg-line" />
              {t('veya e-posta ile')}
              <span className="h-0.5 flex-1 rounded bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-4">
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
          </div>

          <p className="mt-6 text-center font-semibold text-ink-soft">
            {t('Hesabın yok mu?')} <Link to="/register" className="font-extrabold text-flame hover:underline">{t('Ücretsiz kayıt ol')}</Link>
          </p>
        </motion.div>
      </main>
    </div>
  )
}
