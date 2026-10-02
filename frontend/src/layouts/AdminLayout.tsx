import { Suspense, useEffect, useState } from 'react'
import { PageFallback } from '@/components/motion/Page'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft, Building2, Menu, X, BookOpen, Boxes, ClipboardList, Crown, FileQuestion, Gift, Handshake, Gauge, GraduationCap, KeyRound, LayoutList, Layers, Mail, MessagesSquare, Newspaper, Package, Quote, Receipt, ScrollText, Send, Settings, ShieldCheck, SmilePlus, Swords, Ticket, Trophy, UserCog, Users, Wallet } from 'lucide-react'
import { can, roleLabel } from '@/lib/adminAccess'
import type { Me } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { ApiError, hasAdminToken, onApiError, post, setAdminToken } from '@/lib/api'
import { Logo } from '@/components/game/Logo'
import { OtpInput } from '@/components/ui/OtpInput'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'

type Item = { to: string; label: string; icon: typeof Gauge; perm?: string; end?: boolean; superOnly?: boolean }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Genel', items: [
    { to: '/admin', label: 'Pano', icon: Gauge, end: true },
  ] },
  { title: 'Kullanıcılar', items: [
    { to: '/admin/users', label: 'Tüm kullanıcılar', icon: Users, perm: 'users' },
    { to: '/admin/staff', label: 'Ekip, roller ve yetkiler', icon: UserCog, superOnly: true },
  ] },
  { title: 'Satış', items: [
    { to: '/admin/revenue', label: 'Gelir', icon: Wallet, perm: 'sales' },
    { to: '/admin/subscribers', label: 'Premium aboneler', icon: Crown, perm: 'sales' },
    { to: '/admin/orders', label: 'Siparişler ve iadeler', icon: Receipt, perm: 'sales' },
    { to: '/admin/r/plans', label: 'Paketler ve fiyatlar', icon: Package, perm: 'sales' },
    { to: '/admin/r/coupons', label: 'İndirim kuponları', icon: Ticket, perm: 'sales' },
  ] },
  { title: 'Eğitim içeriği', items: [
    { to: '/admin/r/courses', label: 'Kurslar', icon: Layers, perm: 'content' },
    { to: '/admin/r/units', label: 'Üniteler', icon: LayoutList, perm: 'content' },
    { to: '/admin/r/lessons', label: 'Dersler', icon: ClipboardList, perm: 'content' },
    { to: '/admin/r/stories', label: 'Hikâyeler', icon: BookOpen, perm: 'content' },
    { to: '/admin/r/exam-questions', label: 'Sınav soruları', icon: FileQuestion, perm: 'content' },
    { to: '/admin/r/placement-results', label: 'Seviye tespit sonuçları', icon: Gauge, perm: 'content' },
    { to: '/admin/r/scenarios', label: 'AI senaryoları', icon: MessagesSquare, perm: 'content' },
  ] },
  { title: 'Blog ve site', items: [
    { to: '/admin/blog', label: 'Blog yazıları', icon: Newspaper, perm: 'blog' },
    { to: '/admin/r/testimonials', label: 'Öğrenci yorumları', icon: Quote, perm: 'blog' },
  ] },
  { title: 'Oyunlaştırma', items: [
    { to: '/admin/r/achievements', label: 'Rozetler', icon: Trophy, perm: 'gamification' },
    { to: '/admin/r/quests', label: 'Görevler', icon: Swords, perm: 'gamification' },
    { to: '/admin/r/avatars', label: 'Avatarlar', icon: SmilePlus, perm: 'gamification' },
    { to: '/admin/r/reward-items', label: 'Mağaza, kartlar ve sandıklar', icon: Boxes, perm: 'gamification' },
    { to: '/admin/r/redeem-codes', label: 'Hediye kodları', icon: KeyRound, perm: 'gamification' },
    { to: '/admin/r/partners', label: 'İş ortakları', icon: Handshake, perm: 'gamification' },
    { to: '/admin/r/partner-offers', label: 'Sandık teklifleri', icon: Gift, perm: 'gamification' },
  ] },
  { title: 'Kurumlar', items: [
    { to: '/admin/r/institutions', label: 'Okul, kurs ve şirketler', icon: Building2, perm: 'institutions' },
  ] },
  { title: 'Pazarlama ve iletişim', items: [
    { to: '/admin/r/newsletter-subscribers', label: 'Bülten', icon: Send, perm: 'marketing' },
    { to: '/admin/r/contact-messages', label: 'İletişim mesajları', icon: Mail, perm: 'marketing' },
  ] },
  { title: 'Ön büro', items: [
    { to: '/admin/vouchers', label: 'Canlı ders kuponları', icon: GraduationCap, perm: 'desk' },
  ] },
  { title: 'Sistem', items: [
    { to: '/admin/settings', label: 'Site ayarları', icon: Settings, perm: 'settings' },
    { to: '/admin/audit', label: 'Denetim kaydı', icon: ScrollText, perm: 'audit' },
  ] },
]

const EXTRA: [string, string][] = [['/admin/codes', 'gamification'], ['/admin/institutions/', 'institutions']]

/** The panel area a path belongs to, so a page without access says so instead of failing. */
function areaFor(path: string): { perm?: string; superOnly?: boolean } | null {
  const items = GROUPS.flatMap((g) => g.items).filter((i) => !i.end && (path === i.to || path.startsWith(i.to + '/')))
  const hit = items.sort((a, b) => b.to.length - a.to.length)[0]
  if (hit) return hit
  const extra = EXTRA.find(([p]) => path.startsWith(p))
  return extra ? { perm: extra[1] } : null
}

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
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border-2 border-line bg-ink text-butter shadow-hard">
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
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
  useEffect(() => setDrawer(false), [loc.pathname])
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
  const area = areaFor(loc.pathname)
  const allowed = !area || (area.superOnly ? user.role === 'super_admin' : can(user, area.perm))
  const lock = async () => {
    await setAdminToken(null)
    setUnlocked(false)
  }

  return (
    <div className="flex min-h-dvh bg-paper">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r-2 border-line bg-[#171b26] px-3 py-5 text-white md:block">
        <AdminNav user={user} onLock={lock} />
      </aside>

      {/* phones: a slide-in drawer instead of a cramped select */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Yönetim menüsü">
          <button className="absolute inset-0 bg-black/45" aria-label="Kapat" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-[#171b26] px-3 py-5 text-white shadow-soft">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 grid size-9 place-items-center rounded-xl hover:bg-white/10" aria-label="Menüyü kapat"><X className="size-5" /></button>
            <AdminNav user={user} onLock={lock} />
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b-2 border-line/15 px-5">
          <Link to="/learn" className="flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" /> Uygulama
          </Link>
<button onClick={() => setDrawer(true)} className="grid size-10 place-items-center rounded-xl border-2 border-line bg-card md:hidden" aria-label="Yönetim menüsü"><Menu className="size-5" /></button>
          <span className="hidden text-sm font-bold sm:inline">{user.name} · <span className="text-flame">{roleLabel(user.role)}</span></span>
        </header>
        <main className="p-4 sm:p-8">
          {allowed ? <Suspense fallback={<PageFallback />}><Outlet /></Suspense> : (
            <div className="mx-auto mt-10 max-w-md rounded-3xl border-2 border-line bg-card p-8 text-center">
              <ShieldCheck className="mx-auto size-10 text-ink-soft" />
              <h1 className="mt-3 text-2xl font-extrabold">Bu bölüme erişimin yok</h1>
              <p className="mt-2 text-sm text-ink-soft">Rolün ({roleLabel(user.role)}) bu sayfayı kapsamıyor. Gerekirse bir süper yöneticiden yetki iste.</p>
              <Link to="/admin" className="mt-5 inline-block font-bold text-flame">Panoya dön</Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function AdminNav({ user, onLock }: { user: Me; onLock: () => void }) {
  const visible = (i: Item) => (i.superOnly ? user.role === 'super_admin' : can(user, i.perm))
  return (
    <>
      <div className="mb-6 px-2">
        <Logo small />
        <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-butter">Yönetim paneli</p>
      </div>
      {GROUPS.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length).map((g) => (
        <div key={g.title} className="mb-5">
          <p className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">{g.title}</p>
          {g.items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => clsx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-flame text-white' : 'hover:bg-white/10')}>
              <i.icon className="size-4" />
              {i.label}
            </NavLink>
          ))}
        </div>
      ))}
      <button
        onClick={onLock}
        className="mt-4 w-full rounded-xl border border-white/20 px-3 py-2 text-left text-xs font-bold text-white/70 hover:bg-white/10"
      >
        Yönetici oturumunu kapat
      </button>
    </>
  )
}
