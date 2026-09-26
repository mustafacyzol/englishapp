import { useEffect, useState } from 'react'
import { NavLink, useLocation, useOutlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Bell, BookOpen, Dumbbell, Gift, Grid2x2, Home, MessageCircle, Settings, Shield, ShoppingBag, Swords, Target, Trophy, User, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { rewardImg } from '@/lib/assets'
import { TUTOR } from '@/lib/tutor'
import { Logo } from '@/components/game/Logo'
import { StatChips } from '@/components/game/StatChips'
import { PageTransition } from '@/components/motion/Page'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SideRail, type Dashboard } from './SideRail'
import { Img } from '@/components/ui/Img'
import { SkillMeter } from '@/components/game/SkillMeter'
import { ProductTour } from '@/components/game/ProductTour'

interface Item { to: string; label: string; icon: LucideIcon; badge?: string }

/** Grouped so the sidebar reads as three jobs: learn, compete, your account. */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Öğren',
    items: [
      { to: '/learn', label: 'Yol haritası', icon: Home },
      { to: '/stories', label: 'Hikâyeler', icon: BookOpen },
      { to: '/ai', label: `${TUTOR.name} ile konuş`, icon: MessageCircle },
      { to: '/practice', label: 'Pratik', icon: Dumbbell },
    ],
  },
  {
    title: 'Yarış',
    items: [
      { to: '/duel', label: 'Gölge Düellosu', icon: Swords, badge: 'Yeni' },
      { to: '/leagues', label: 'Ligler', icon: Trophy },
      { to: '/quests', label: 'Görevler', icon: Target },
    ],
  },
  {
    title: 'Hesabım',
    items: [
      { to: '/rewards', label: 'Ödüller', icon: Gift },
      { to: '/shop', label: 'Mağaza', icon: ShoppingBag },
      { to: '/profile', label: 'Profil', icon: User },
    ],
  },
]

/** Phone tab bar: the four daily jobs plus a "more" sheet for everything else. */
const TABS: Item[] = [
  { to: '/learn', label: 'Öğren', icon: Home },
  { to: '/practice', label: 'Pratik', icon: Dumbbell },
  { to: '/duel', label: 'Düello', icon: Swords },
  { to: '/ai', label: TUTOR.name, icon: MessageCircle },
]

export default function AppLayout() {
  const { user } = useAuth()
  const loc = useLocation()
  const outlet = useOutlet()
  const [more, setMore] = useState(false)
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  useEffect(() => setMore(false), [loc.pathname])
  if (!user) return null
  // The dashboard rail belongs to the home screen only; every other page gets the
  // full column so reading, chat and pricing have room to breathe.
  const withRail = loc.pathname === '/learn'

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1700px]">
      <aside className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col border-r-2 border-line bg-card/40 px-3 py-5 lg:flex">
        <Link to="/learn" className="mb-6 px-3"><Logo /></Link>
        <nav className="no-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto" aria-label="Uygulama menüsü">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft/80">{g.title}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.map((n) => <SideLink key={n.to} item={n} />)}
              </div>
            </div>
          ))}
          {user.is_staff && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft/80">Yönetim</p>
              <SideLink item={{ to: '/admin', label: 'Yönetim paneli', icon: Shield }} />
            </div>
          )}
        </nav>

        <SkillMeter compact className="mt-4" />

        {!user.premium.active && (
          <Link to="/premium" className="press group mt-3 flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-3 shadow-hard">
            <Img src={rewardImg('crown')} alt="" className="size-11 object-contain transition group-hover:scale-110" />
            <span className="min-w-0">
              <span className="block font-black leading-tight">Premium'a geç</span>
              <span className="block truncate text-xs text-ink-soft">Sınırsız can, tüm hikâyeler</span>
            </span>
          </Link>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
            <Link to="/learn" className="shrink-0 lg:hidden" aria-label="Yol haritası">
              <span className="sm:hidden"><Logo small className="[&>span:last-child]:hidden" /></span>
              <span className="hidden sm:inline"><Logo small /></span>
            </Link>
            <p className="hidden min-w-0 truncate text-sm font-bold text-ink-soft lg:block">
              {data?.announcement ? <span className="rounded-lg bg-butter/20 px-2 py-1 text-ink">📣 {data.announcement}</span> : <>Merhaba, {user.name.split(' ')[0]}! Bugün de biraz İngilizce?</>}
            </p>
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              <StatChips user={user} />
              <Link to="/notifications" className="relative grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label="Bildirimler">
                <Bell className="size-[22px]" />
                {!!data?.unread_notifications && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-flame text-[10px] font-black text-white">{data.unread_notifications}</span>}
              </Link>
              <Link to="/settings" className="hidden size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2 sm:grid" aria-label="Ayarlar">
                <Settings className="size-[22px]" />
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-8 px-4 pb-32 pt-6 sm:px-6 md:px-8 lg:pb-12 xl:gap-10">
          <main className="min-w-0 flex-1">
            <PageTransition key={loc.pathname}>{outlet}</PageTransition>
          </main>
          {withRail && data && <SideRail data={data} />}
        </div>
      </div>

      {/* Floating tab bar (phones and tablets). */}
      <nav aria-label="Alt menü" className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 pb-2 lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch rounded-[22px] border-2 border-line bg-card/95 p-1.5 shadow-soft backdrop-blur-md">
          {TABS.map((n) => (
            <NavLink key={n.to} to={n.to} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-2xl bg-flame/10" />}
                  <n.icon className={clsx('relative size-6', isActive ? 'text-flame' : 'text-ink-soft')} strokeWidth={2.2} />
                  <span className={clsx('relative', isActive ? 'text-flame' : 'text-ink-soft')}>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold text-ink-soft" aria-label="Diğer sayfalar">
            <Grid2x2 className="size-6" strokeWidth={2.2} />
            Daha
          </button>
        </div>
      </nav>

      <MoreSheet open={more} onClose={() => setMore(false)} staff={!!user.is_staff} />
      <ProductTour />
    </div>
  )
}

function SideLink({ item: n }: { item: Item }) {
  return (
    <NavLink to={n.to} end={n.to === '/admin'} className="group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-extrabold transition">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="side-active" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-xl bg-flame/10" />}
          <span className={clsx('relative grid size-8 place-items-center rounded-lg transition', isActive ? 'bg-flame text-white shadow-[0_2px_0_0_var(--color-flame-deep)]' : 'text-ink-soft group-hover:bg-paper-2 group-hover:text-ink')}>
            <n.icon className="size-[18px]" strokeWidth={2.4} />
          </span>
          <span className={clsx('relative flex-1 truncate', isActive ? 'text-ink' : 'text-ink-soft group-hover:text-ink')}>{n.label}</span>
          {n.badge && <span className="relative rounded-md bg-butter px-1.5 py-0.5 text-[10px] font-black uppercase text-[#1f2433]">{n.badge}</span>}
        </>
      )}
    </NavLink>
  )
}

const MORE_TONE = ['bg-sky/12 text-sky', 'bg-mint/12 text-mint-deep', 'bg-butter/20 text-butter-deep', 'bg-berry/12 text-berry', 'bg-flame/10 text-flame', 'bg-lilac/15 text-lilac', 'bg-sage/15 text-sage-deep']

function MoreSheet({ open, onClose, staff }: { open: boolean; onClose: () => void; staff: boolean }) {
  const items: Item[] = [
    { to: '/stories', label: 'Hikâyeler', icon: BookOpen },
    { to: '/leagues', label: 'Ligler', icon: Trophy },
    { to: '/quests', label: 'Görevler', icon: Target },
    { to: '/rewards', label: 'Ödüller', icon: Gift },
    { to: '/shop', label: 'Mağaza', icon: ShoppingBag },
    { to: '/profile', label: 'Profil', icon: User },
    { to: '/settings', label: 'Ayarlar', icon: Settings },
    ...(staff ? [{ to: '/admin', label: 'Yönetim', icon: Shield }] : []),
  ]
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Diğer sayfalar">
          <motion.button aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-[28px] border-t-2 border-line bg-card px-5 pb-6 pt-3"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => i.offset.y > 90 && onClose()}
          >
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-line" />
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl font-black">Menü</p>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-xl hover:bg-paper-2" aria-label="Kapat"><X className="size-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
              {items.map((n, i) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 text-center text-xs font-extrabold transition', isActive ? 'border-flame/40 bg-flame/5' : 'border-transparent hover:bg-paper-2')}>
                  <span className={clsx('grid size-12 place-items-center rounded-2xl', MORE_TONE[i % MORE_TONE.length])}><n.icon className="size-6" strokeWidth={2.2} /></span>
                  <span className="leading-tight">{n.label}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-paper-2 px-4 py-3">
              <span className="text-sm font-extrabold">Görünüm</span>
              <ThemeToggle />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
