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
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Logo } from '@/components/game/Logo'
import { SocialButtons } from '@/components/auth/SocialButtons'
import { Turnstile } from './Turnstile'
import { higoImg } from '@/components/game/Higo'

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
      <header className="relative z-10 flex items-center justify-between px-5 py-3 sm:px-8">
        <Link to="/" aria-label="DilGO ana sayfa"><Logo small /></Link>
        <Link to="/register" className="press flex h-10 items-center gap-1.5 rounded-xl border-2 border-line bg-card px-3.5 text-sm font-extrabold shadow-hard-sm hover:border-ink/30">
          <span className="hidden text-ink-soft sm:inline">{t('Hesabın yok mu?')}</span> <span className="text-flame">{t('Kayıt ol')}</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-6 pt-2">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
          <div className="relative mt-10 rounded-[28px] border-2 border-line bg-card p-5 pt-9 shadow-soft sm:p-7 sm:pt-10">
            {/* Higo peeks over the card edge and waves, taking no room from the form */}
            <div aria-hidden className="absolute -top-12 left-1/2 flex -translate-x-1/2 items-end">
              <motion.img
                src={higoImg('wave')}
                alt=""
                className="size-[76px] object-contain drop-shadow-[0_8px_10px_rgba(160,40,10,.18)]"
                initial={{ y: 30, opacity: 0, rotate: -8 }}
                animate={{ y: [0, -4, 0], opacity: 1, rotate: [0, -4, 0] }}
                transition={{ y: { repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: 0.6 }, rotate: { repeat: Infinity, duration: 2.6, ease: 'easeInOut', delay: 0.6 }, opacity: { duration: 0.3 } }}
              />
              <motion.span initial={{ opacity: 0, scale: 0.6, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 380, damping: 18 }} className="mb-9 -ml-1 whitespace-nowrap rounded-2xl rounded-bl-md bg-ink px-2.5 py-1 text-xs font-extrabold text-paper">
                {t('Seni özledim!')}
              </motion.span>
            </div>
            <div className="mb-5 flex flex-col items-center text-center">
              <h1 className="text-[26px] leading-tight">{t('Tekrar hoş geldin')}</h1>
              <p className="mt-1 text-[15px] text-ink-soft">{t('Hesabına giriş yap ve kaldığın yerden devam et.')}</p>
            </div>

            <SocialButtons onDone={done} remember={remember} compact />

            <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-ink-soft">
              <span className="h-0.5 flex-1 rounded bg-line" />
              {t('veya e-posta ile')}
              <span className="h-0.5 flex-1 rounded bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-3.5">
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
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
              DilGO'da oturum açarak <Link to="/terms" className="font-bold text-ink underline underline-offset-2">Koşullarımızı</Link> ve <Link to="/privacy" className="font-bold text-ink underline underline-offset-2">Gizlilik Politikamızı</Link> kabul etmiş olursun.
            </p>
          </div>

        </motion.div>
      </main>
    </div>
  )
}
