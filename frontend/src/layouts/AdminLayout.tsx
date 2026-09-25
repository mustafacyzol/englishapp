import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft, BookOpen, Boxes, ClipboardList, Crown, Gauge, GraduationCap, KeyRound, LayoutList, Layers, MessagesSquare, Receipt, ScrollText, Settings, ShieldCheck, Swords, Ticket, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError, hasAdminToken, onApiError, post, setAdminToken } from '@/lib/api'
import { Logo } from '@/components/game/Logo'
import { OtpInput } from '@/components/ui/OtpInput'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'

const GROUPS = [
  { title: 'Genel', items: [
    { to: '/admin', label: 'Pano', icon: Gauge, end: true },
    { to: '/admin/users', label: 'Kullanıcılar', icon: Users, admin: true },
    { to: '/admin/orders', label: 'Siparişler', icon: Receipt, admin: true },
    { to: '/admin/vouchers', label: 'Canlı ders kuponları', icon: GraduationCap },
  ] },
  { title: 'İçerik', items: [
    { to: '/admin/r/courses', label: 'Kurslar', icon: Layers },
    { to: '/admin/r/units', label: 'Üniteler', icon: LayoutList },
    { to: '/admin/r/lessons', label: 'Dersler', icon: ClipboardList },
    { to: '/admin/r/stories', label: 'Hikayeler', icon: BookOpen },
    { to: '/admin/r/scenarios', label: 'AI senaryoları', icon: MessagesSquare },
  ] },
  { title: 'Oyun & Büyüme', items: [
    { to: '/admin/r/achievements', label: 'Rozetler', icon: Trophy, admin: true },
    { to: '/admin/r/quests', label: 'Görevler', icon: Swords, admin: true },
    { to: '/admin/r/reward-items', label: 'Ödül kartları', icon: Boxes, admin: true },
    { to: '/admin/r/plans', label: 'Paketler', icon: Crown, admin: true },
    { to: '/admin/r/coupons', label: 'Kuponlar', icon: Ticket, admin: true },
    { to: '/admin/r/redeem-codes', label: 'Hediye kodları', icon: KeyRound, admin: true },
  ] },
  { title: 'Sistem', items: [
    { to: '/admin/settings', label: 'Ayarlar', icon: Settings },
    { to: '/admin/audit', label: 'Denetim kaydı', icon: ScrollText, admin: true },
  ] },
]

function StepUp({ onDone }: { onDone: () => void }) {
  const [method, setMethod] = useState<'email' | 'totp' | 'none' | null>(null)
  const [error, setError] = useState('')
  const [reset, setReset] = useState(0)
  const [recovery, setRecovery] = useState('')

  const challenge = useMutation({
    mutationFn: () => post<{ method: 'email' | 'totp' | 'none' }>('/auth/admin/challenge'),
    onSuccess: (r) => {
      setMethod(r.method)
      if (r.method === 'none') verify.mutate('')
    },
    onError: (e: ApiError) => setError(e.message),
  })
  const verify = useMutation({
    mutationFn: (code: string) => post<{ token: string }>('/auth/admin/verify', { code }),
    onSuccess: async (r) => {
      await setAdminToken(r.token)
      onDone()
    },
    onError: (e: ApiError) => {
      setError(e.first('code'))
      setReset((x) => x + 1)
    },
  })

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="ink-card w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border-2 border-line bg-[#1B1F3B] text-butter shadow-hard">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="text-2xl font-extrabold">Yönetici doğrulaması</h1>
        <p className="mb-6 mt-2 text-ink-soft">
          {method === 'totp' ? 'Doğrulayıcı uygulamandaki 6 haneli kodu gir.' : method === 'email' ? 'E-postana gönderdiğimiz 6 haneli kodu gir.' : 'Yönetim paneli ek bir doğrulama adımıyla korunur.'}
        </p>
        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
        {!method ? (
          <Button block loading={challenge.isPending} onClick={() => challenge.mutate()}>
            Kod gönder
          </Button>
        ) : (
          <>
            <OtpInput onComplete={(c) => verify.mutate(c)} status={error ? 'error' : 'idle'} disabled={verify.isPending} resetKey={reset} />
            {method === 'totp' && (
              <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); verify.mutate(recovery) }}>
                <Input placeholder="veya kurtarma kodu (XXXXX-XXXXX)" value={recovery} onChange={(e) => setRecovery(e.target.value)} className="flex-1" />
                <Button type="submit" variant="secondary" loading={verify.isPending}>OK</Button>
              </form>
            )}
            {method === 'email' && (
              <button className="mt-5 text-sm font-bold text-flame" onClick={() => challenge.mutate()}>
                Kodu tekrar gönder
              </button>
            )}
          </>
        )}
        <Link to="/learn" className="mt-6 block text-sm font-bold text-ink-soft">
          Uygulamaya dön
        </Link>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState(hasAdminToken())
  // expired / revoked step-up token → ask for the code again
  useEffect(
    () =>
      onApiError((e) => {
        if (e.status === 401 || (e.status === 403 && e.message.includes('Yönetici doğrulaması'))) {
          setAdminToken(null).then(() => setUnlocked(false))
        }
      }),
    [],
  )
  if (!user?.is_staff) return <Navigate to="/learn" replace />
  if (!unlocked) return <StepUp onDone={() => setUnlocked(true)} />
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  return (
    <div className="flex min-h-dvh bg-paper">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r-2 border-line bg-[#1B1F3B] px-3 py-5 text-[#F6F1E7] md:block">
        <div className="mb-6 px-2">
          <Logo small />
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-butter">Yönetim paneli</p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#F6F1E7]/45">{g.title}</p>
            {g.items.filter((i) => !('admin' in i) || isAdmin).map((i) => (
              <NavLink key={i.to} to={i.to} end={'end' in i} className={({ isActive }) => clsx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-flame text-white' : 'hover:bg-white/10')}>
                <i.icon className="size-4" />
                {i.label}
              </NavLink>
            ))}
          </div>
        ))}
        <button
          onClick={async () => {
            await setAdminToken(null)
            setUnlocked(false)
          }}
          className="mt-4 w-full rounded-xl border border-white/20 px-3 py-2 text-left text-xs font-bold text-[#F6F1E7]/70 hover:bg-white/10"
        >
          Yönetici oturumunu kapat
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b-2 border-line/15 px-5">
          <Link to="/learn" className="flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" /> Uygulama
          </Link>
          <select className="rounded-lg border-2 border-line bg-card px-2 py-1 text-sm md:hidden" onChange={(e) => (window.location.href = e.target.value)} defaultValue="">
            <option value="" disabled>Menü</option>
            {GROUPS.flatMap((g) => g.items).filter((i) => !('admin' in i) || isAdmin).map((i) => <option key={i.to} value={i.to}>{i.label}</option>)}
          </select>
          <span className="text-sm font-bold">{user.name} · <span className="text-flame">{user.role}</span></span>
        </header>
        <main className="p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
