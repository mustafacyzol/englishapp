import { NavLink, useLocation, useOutlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'motion/react'
import clsx from 'clsx'
import { Bell, BookOpen, Dumbbell, Gift, Home, MessageCircle, Settings, ShoppingBag, Swords, Trophy, User, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { rewardImg } from '@/lib/assets'
import { Logo } from '@/components/game/Logo'
import { StatChips } from '@/components/game/StatChips'
import { PageTransition } from '@/components/motion/Page'
import { SideRail, type Dashboard } from './SideRail'
import { Img } from '@/components/ui/Img'

const NAV = [
  { to: '/learn', label: 'Öğren', icon: Home },
  { to: '/stories', label: 'Hikayeler', icon: BookOpen },
  { to: '/ai', label: 'Ada ile Konuş', icon: MessageCircle },
  { to: '/practice', label: 'Pratik', icon: Dumbbell },
  { to: '/leagues', label: 'Ligler', icon: Trophy },
  { to: '/quests', label: 'Görevler', icon: Swords },
  { to: '/rewards', label: 'Ödüller', icon: Gift },
  { to: '/shop', label: 'Mağaza', icon: ShoppingBag },
  { to: '/profile', label: 'Profil', icon: User },
]

const MOBILE = [
  { to: '/learn', label: 'Öğren', icon: Home },
  { to: '/stories', label: 'Hikaye', icon: BookOpen },
  { to: '/ai', label: 'Ada', icon: MessageCircle },
  { to: '/rewards', label: 'Ödüller', icon: Gift },
  { to: '/profile', label: 'Profil', icon: User },
]

export default function AppLayout() {
  const { user } = useAuth()
  const loc = useLocation()
  const outlet = useOutlet()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  if (!user) return null
  // The dashboard rail belongs to the home screen only; every other page gets the
  // full column so reading, chat and pricing have room to breathe.
  const withRail = loc.pathname === '/learn'

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1700px]">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r-2 border-line px-3 py-6 lg:flex">
        <Link to="/learn" className="mb-7 px-3"><Logo /></Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => clsx('flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-[15px] font-extrabold uppercase tracking-wide transition', isActive ? 'border-sky/40 bg-sky/10 text-sky' : 'border-transparent text-ink-soft hover:bg-paper-2 hover:text-ink')}
            >
              <n.icon className="size-6" strokeWidth={2.2} />
              {n.label}
            </NavLink>
          ))}
          {user.is_staff && (
            <NavLink to="/admin" className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-extrabold uppercase tracking-wide text-ink-soft hover:bg-paper-2 hover:text-ink">
              <Shield className="size-6" /> Yönetim
            </NavLink>
          )}
        </nav>
        {!user.premium.active && (
          <Link to="/premium" className="press group mt-4 flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-3 shadow-hard">
            <Img src={rewardImg('crown')} alt="" className="size-12 object-contain transition group-hover:scale-110" />
            <span>
              <span className="block font-black leading-tight">Premium'a geç</span>
              <span className="block text-xs text-ink-soft">Sınırsız can, tüm hikayeler</span>
            </span>
          </Link>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/learn" className="lg:hidden"><Logo small /></Link>
            <p className="hidden truncate text-sm font-bold text-ink-soft lg:block">
              {data?.announcement ? <span className="rounded-lg bg-butter/20 px-2 py-1 text-ink">📣 {data.announcement}</span> : <>Merhaba, {user.name.split(' ')[0]}! Bugün de biraz İngilizce?</>}
            </p>
            <div className="flex items-center gap-1">
              <StatChips user={user} />
              <Link to="/notifications" className="relative ml-1 hidden size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2 sm:grid" aria-label="Bildirimler">
                <Bell className="size-6" />
                {!!data?.unread_notifications && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-flame text-[10px] font-black text-white">{data.unread_notifications}</span>}
              </Link>
              <Link to="/settings" className="hidden size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2 sm:grid" aria-label="Ayarlar">
                <Settings className="size-6" />
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-10 px-4 pb-28 pt-7 sm:px-8 lg:pb-12">
          <main className="min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={loc.pathname}>{outlet}</PageTransition>
            </AnimatePresence>
          </main>
          {withRail && data && <SideRail data={data} />}
        </div>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-card lg:hidden">
        <div className="mx-auto flex max-w-md justify-around px-2 pt-1.5">
          {MOBILE.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-extrabold', isActive ? 'text-sky' : 'text-ink-soft')}>
              <n.icon className="size-6" strokeWidth={2.2} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
