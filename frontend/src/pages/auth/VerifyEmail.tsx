import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Me } from '@/lib/types'
import { OtpInput } from '@/components/ui/OtpInput'
import { Alert } from '@/components/ui/Misc'
import { celebrate } from '@/lib/fx'
import { AuthShell } from './AuthShell'

export default function VerifyEmail() {
  const { user, setUser, signOut } = useAuth()
  const nav = useNavigate()
  const [cooldown, setCooldown] = useState(60)
  const [reset, setReset] = useState(0)

  useEffect(() => {
    if (user?.email_verified) nav('/learn', { replace: true })
  }, [user, nav])
  useEffect(() => {
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const verify = useMutation({
    mutationFn: (code: string) => post<{ user: Me }>('/auth/email/verify', { code }),
    onSuccess: ({ user }) => {
      celebrate(true)
      setTimeout(() => {
        setUser(user)
        nav('/learn', { replace: true })
      }, 900)
    },
    onError: () => setReset((r) => r + 1),
  })
  const resend = useMutation({
    mutationFn: () => post<{ retry_after: number }>('/auth/email/send'),
    onSuccess: (r) => setCooldown(r.retry_after || 60),
  })
  const err = verify.error as ApiError | null

  return (
    <AuthShell title="E-postanı doğrula" subtitle={<><b className="text-ink">{user?.email}</b> adresine 6 haneli bir kod gönderdik.</>}>
      <div className="mx-auto mb-8 grid size-20 place-items-center rounded-full bg-sky/10 text-sky">
        <MailCheck className="size-10" />
      </div>
      <OtpInput onComplete={(c) => verify.mutate(c)} status={err ? 'error' : verify.isSuccess ? 'success' : 'idle'} disabled={verify.isPending || verify.isSuccess} resetKey={reset} />
      <div className="mt-6 space-y-3 text-center">
        {err && <Alert tone="error">{err.first('code')}</Alert>}
        {verify.isSuccess && <Alert tone="success">Harika! Hesabın aktif 🎉</Alert>}
        <p className="text-sm text-ink-soft">
          Kod gelmedi mi? Spam klasörünü kontrol et ya da{' '}
          <button disabled={cooldown > 0 || resend.isPending} onClick={() => resend.mutate()} className="font-extrabold text-flame disabled:text-ink-soft">
            {cooldown > 0 ? `${cooldown} sn sonra tekrar gönder` : 'yeniden gönder'}
          </button>
        </p>
        <button onClick={signOut} className="text-sm font-bold text-ink-soft underline">Farklı bir hesapla giriş yap</button>
      </div>
    </AuthShell>
  )
}
