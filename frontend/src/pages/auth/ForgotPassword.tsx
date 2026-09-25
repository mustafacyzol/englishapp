import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { OtpInput } from '@/components/ui/OtpInput'
import { AuthShell } from './AuthShell'
import { Turnstile } from './Turnstile'

export default function ForgotPassword() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [captcha, setCaptcha] = useState('')

  const request = useMutation({ mutationFn: () => post<{ message: string }>('/auth/forgot-password', { email, captcha }) })
  const reset = useMutation({
    mutationFn: () => post<{ token: string; user: Me }>('/auth/reset-password', { email, code, password, password_confirmation: confirm }),
    onSuccess: async ({ token, user }) => {
      await signIn(token, user)
      nav('/learn', { replace: true })
    },
  })
  const err = (request.error ?? reset.error) as ApiError | null

  return (
    <AuthShell
      title={request.isSuccess ? 'Yeni şifreni belirle' : 'Şifreni mi unuttun?'}
      subtitle={request.isSuccess ? 'E-postana gelen 6 haneli kodu ve yeni şifreni gir.' : 'Hesabına kayıtlı e-postayı yaz, sana bir sıfırlama kodu gönderelim.'}
      footer={<Link to="/login" className="font-extrabold text-flame">Girişe dön</Link>}
    >
      {err && <div className="mb-4"><Alert tone="error">{err.first()}</Alert></div>}
      {!request.isSuccess ? (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); request.mutate() }} className="space-y-4">
          <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <Turnstile onToken={setCaptcha} />
          <Button type="submit" block size="lg" loading={request.isPending}>Kod gönder</Button>
        </form>
      ) : (
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); reset.mutate() }} className="space-y-5">
          <OtpInput onComplete={setCode} status={reset.error ? 'error' : 'idle'} />
          <Input label="Yeni şifre" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required hint="En az 8 karakter, harf ve rakam." />
          <Input label="Yeni şifre (tekrar)" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <Button type="submit" block size="lg" loading={reset.isPending} disabled={code.length < 6}>Şifremi güncelle</Button>
          <p className="text-center text-sm text-ink-soft">Kod gelmediyse birkaç dakika bekle veya <button type="button" className="font-bold text-flame" onClick={() => request.mutate()}>tekrar gönder</button>.</p>
        </form>
      )}
    </AuthShell>
  )
}
