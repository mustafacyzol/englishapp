import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Bell, BookOpen, Crown, Dumbbell, Gift, Home, MessageCircleHeart, Settings, ShoppingBag, Swords, Trophy, User, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { Logo } from '@/components/game/Logo'
import { StatChips } from '@/components/game/StatChips'
import { SideRail } from './SideRail'
import type { Dashboard } from './SideRail'

const NAV = [
  { to: '/learn', label: 'Öğren', icon: Home, color: 'bg-flame' },
  { to: '/stories', label: 'Hikayeler', icon: BookOpen, color: 'bg-butter' },
  { to: '/ai', label: 'Ada ile Konuş', icon: MessageCircleHeart, color: 'bg-sky' },
  { to: '/practice', label: 'Pratik', icon: Dumbbell, color: 'bg-mint' },
  { to: '/leagues', label: 'Ligler', icon: Trophy, color: 'bg-butter' },
  { to: '/quests', label: 'Görevler', icon: Swords, color: 'bg-berry' },
  { to: '/rewards', label: 'Ödül Kasası', icon: Gift, color: 'bg-lilac' },
  { to: '/shop', label: 'Mağaza', icon: ShoppingBag, color: 'bg-mint' },
  { to: '/profile', label: 'Profil', icon: User, color: 'bg-sky' },
]

const MOBILE = [
  { to: '/learn', label: 'Öğren', icon: Home },
  { to: '/stories', label: 'Hikaye', icon: BookOpen },
  { to: '/ai', label: 'Ada', icon: MessageCircleHeart, center: true },
  { to: '/leagues', label: 'Lig', icon: Trophy },
  { to: '/profile', label: 'Ben', icon: User },
]

export default function AppLayout() {
  const { user } = useAuth()
  const loc = useLocation()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  if (!user) return null
  const hideRail = ['/ai/', '/stories/'].some((p) => loc.pathname.startsWith(p) && loc.pathname !== p.slice(0, -1))

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1360px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-line/15 px-4 py-6 lg:flex">
        <Link to="/learn" className="mb-8 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx('group flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 font-display text-[15px] font-bold transition', isActive ? 'border-line bg-card shadow-hard-sm' : 'border-transparent hover:bg-card/60')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('grid size-9 place-items-center rounded-xl border-2 border-line text-[#1B1F3B] transition group-hover:-rotate-6', isActive ? n.color : 'bg-paper-2')}>
                    <n.icon className="size-[18px]" strokeWidth={2.4} />
                  </span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
          {user.is_staff && (
            <NavLink to="/admin" className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-dashed border-line/40 px-3 py-2.5 font-display text-[15px] font-bold hover:bg-card/60">
              <span className="grid size-9 place-items-center rounded-xl border-2 border-line bg-[#1B1F3B] text-[#F6F1E7]">
                <Shield className="size-[18px]" />
              </span>
              Yönetim
            </NavLink>
          )}
        </nav>
        {!user.premium.active && (
          <Link to="/premium" className="press group relative mt-4 overflow-hidden rounded-2xl border-2 border-line bg-[#1B1F3B] p-4 text-[#F6F1E7] shadow-hard">
            <Crown className="absolute -right-3 -top-3 size-20 rotate-12 text-butter/25 transition group-hover:rotate-0" />
            <p className="font-display text-lg font-extrabold leading-tight">Premium'a geç</p>
            <p className="mt-1 text-xs text-[#F6F1E7]/70">Sınırsız can, tüm hikayeler, Ada ile daha çok pratik.</p>
          </Link>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="safe-top sticky top-0 z-30 border-b-2 border-line/10 bg-paper/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/learn" className="lg:hidden">
              <Logo small />
            </Link>
            <div className="hidden text-sm font-bold text-ink-soft lg:block">
              {data?.announcement ? <span className="rounded-lg bg-butter px-2 py-1 text-[#1B1F3B]">📣 {data.announcement}</span> : <>Merhaba, {user.name.split(' ')[0]} 👋</>}
            </div>
            <div className="flex items-center gap-2">
              <StatChips user={user} compact />
              <Link to="/notifications" className="relative hidden size-10 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm sm:grid" aria-label="Bildirimler">
                <Bell className="size-5" />
                {!!data?.unread_notifications && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border-2 border-line bg-flame text-[10px] font-extrabold text-white">{data.unread_notifications}</span>}
              </Link>
              <Link to="/settings" className="hidden size-10 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm sm:grid" aria-label="Ayarlar">
                <Settings className="size-5" />
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-8 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
          {!hideRail && data && <SideRail data={data} />}
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-card lg:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-2">
          {MOBILE.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-1 flex-col items-center gap-0.5 text-[11px] font-extrabold', isActive ? 'text-flame' : 'text-ink-soft')}>
              {({ isActive }) =>
                n.center ? (
                  <span className={clsx('-mt-7 grid size-14 place-items-center rounded-2xl border-2 border-line shadow-hard transition', isActive ? 'bg-flame text-white' : 'bg-sky text-white')}>
                    <n.icon className="size-7" />
                  </span>
                ) : (
                  <>
                    <n.icon className={clsx('size-6', isActive && 'fill-flame/20')} strokeWidth={2.3} />
                    {n.label}
                  </>
                )
              }
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
