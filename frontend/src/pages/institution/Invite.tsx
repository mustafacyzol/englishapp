import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Building2, Check } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Me } from '@/lib/types'
import { Button, LinkButton } from '@/components/ui/Button'
import { Alert, Spinner } from '@/components/ui/Misc'
import { AuthShell, REGISTER_SLIDES } from '../auth/AuthShell'

/** Landing for an institution invite link (/davet/:token), from the e-mail a school sends. */
export default function Invite() {
  const { token = '' } = useParams()
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['invite', token], queryFn: () => get<{ institution: { name: string; type: string; city: string | null }; email: string; name: string | null; role: string }>(`/invites/${token}`), retry: false })
  const accept = useMutation({
    mutationFn: () => post<{ user: Me }>(`/invites/${token}/accept`),
    onSuccess: (r) => { setUser(r.user); nav(r.user.institution_role === 'manager' ? '/kurum' : '/learn') },
  })

  if (q.isLoading) return <Spinner />
  if (q.error || !q.data) {
    return (
      <AuthShell slides={REGISTER_SLIDES} title="Davet bulunamadı" subtitle="Bağlantının süresi dolmuş ya da daha önce kullanılmış olabilir.">
        <LinkButton to="/" block>Ana sayfaya dön</LinkButton>
      </AuthShell>
    )
  }
  const inv = q.data
  const manager = inv.role === 'manager'
  return (
    <AuthShell slides={REGISTER_SLIDES} title={`${inv.institution.name} seni bekliyor`} subtitle={manager ? 'Kurum panelinden öğrencilerinin gelişimini takip edeceksin.' : 'Okulun sana bir DilGO Premium koltuğu ayırdı.'}>
      <div className="mb-6 flex items-center gap-4 rounded-3xl border-2 border-line p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage text-white"><Building2 className="size-6" /></span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black">{inv.institution.name}</p>
          <p className="truncate text-sm text-ink-soft">{inv.email}</p>
        </div>
      </div>
      {!manager && (
        <ul className="mb-6 space-y-2 text-sm font-bold">
          {['Tüm dersler, hikâyeler ve Defne ile sınırsız pratik', 'Dört beceri karnen öğretmeninle paylaşılır', 'Gölge Düellosu’nda sınıf arkadaşlarınla yarış'].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="size-4 text-mint-deep" strokeWidth={3} /> {t}</li>
          ))}
        </ul>
      )}
      {accept.error && <div className="mb-4"><Alert tone="error">{(accept.error as ApiError).message}</Alert></div>}
      {user ? (
        <Button block size="lg" loading={accept.isPending} onClick={() => accept.mutate()}>Daveti kabul et</Button>
      ) : (
        <div className="grid gap-3">
          <LinkButton to={`/register?davet=${token}`} block size="lg">Hesap oluştur ve katıl</LinkButton>
          <LinkButton to={`/login?next=${encodeURIComponent(`/davet/${token}`)}`} block size="lg" variant="secondary">Hesabım var, giriş yap</LinkButton>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-ink-soft"><Link to="/about" className="font-bold underline">DilGO nedir?</Link></p>
    </AuthShell>
  )
}
