import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Capacitor } from '@capacitor/core'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { AuthShell } from './AuthShell'
import { Turnstile } from './Turnstile'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')

  const m = useMutation({
    mutationFn: () => post<{ token: string; user: Me }>('/auth/login', { login, password, captcha, device: Capacitor.getPlatform() }),
    onSuccess: async ({ token, user }) => {
      await signIn(token, user)
      const next = params.get('next')
      nav(!user.email_verified ? '/verify-email' : next && next.startsWith('/') ? next : '/learn', { replace: true })
    },
  })
  const err = m.error as ApiError | null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    m.mutate()
  }

  return (
    <AuthShell title="Tekrar hoş geldin!" subtitle="Serin seni bekliyor 🔥" footer={<>Hesabın yok mu? <Link to="/register" className="font-extrabold text-flame">Ücretsiz kayıt ol</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert tone="error">{err.first()}</Alert>}
        <Input label="E-posta veya kullanıcı adı" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required autoFocus />
        <Input label="Şifre" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-bold text-flame">Şifremi unuttum</Link>
        </div>
        <Turnstile onToken={setCaptcha} />
        <Button type="submit" block size="lg" loading={m.isPending}>Giriş yap</Button>
      </form>
    </AuthShell>
  )
}
