import { useEffect, useState } from 'react'
import { NavLink, useLocation, useOutlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Bell, Settings, X } from 'lucide-react'
import { IconBag, IconBook, IconCards, IconCup, IconExam, IconGhost, IconGift, IconMore, IconPath, IconProfile, IconQuest, IconSchool, IconShield, IconSliders, IconTalk, type NavIcon } from '@/components/ui/NavIcons'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { rewardImg } from '@/lib/assets'
import { Logo } from '@/components/game/Logo'
import { StatChips } from '@/components/game/StatChips'
import { PageTransition } from '@/components/motion/Page'
import { LangSelect } from '@/components/ui/LangSelect'
import { useLang } from '@/lib/i18n'
import { useSiteConfig } from '@/lib/site'
import { SideRail, type Dashboard } from './SideRail'
import { Img } from '@/components/ui/Img'
import { CoachMarks } from '@/components/game/CoachMarks'

interface Item { to: string; label: string; icon: NavIcon; tone: string; badge?: string; match?: string[]; tour?: string; feature?: 'exam' | 'duel' | 'ai' | 'stories' }

/** Each item owns a colour: the icon and its soft pill take it on when active. */
const TONE: Record<string, string> = {
  flame: 'text-flame bg-flame/10',
  butter: 'text-butter-deep bg-butter/15',
  sage: 'text-sage-deep bg-sage/15 dark:text-sage',
  sky: 'text-sky bg-sky/10',
  ink: 'text-ink bg-ink/[0.07]',
  berry: 'text-berry bg-berry/10',
  mint: 'text-mint-deep bg-mint/12',
  lilac: 'text-lilac bg-lilac/15',
}

/**
 * Grouped so the sidebar reads as three jobs: learn, compete, your account.
 * Related pages share one entry and switch with tabs at the top of the page
 * (Arena = duel + leagues, Ödüller = vault + quests + shop), which keeps the menu short.
 */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Öğren',
    items: [
      { to: '/learn', label: 'Yol haritası', icon: IconPath, tone: 'flame', tour: 'path' },
      { to: '/stories', label: 'Hikâyeler', icon: IconBook, tone: 'butter', feature: 'stories' },
      { to: '/practice', label: 'Kelime pratiği', icon: IconCards, tone: 'sky', tour: 'practice' },
      { to: '/exam', label: 'Sınav modu', icon: IconExam, tone: 'lilac', feature: 'exam', tour: 'exam' },
      { to: '/ai', label: 'Defne ile konuş', icon: IconTalk, tone: 'sage', feature: 'ai', tour: 'ai' },
    ],
  },
  {
    title: 'Yarış',
    items: [{ to: '/duel', label: 'Arena', icon: IconGhost, tone: 'ink', badge: 'Blitz', match: ['/duel', '/leagues'], feature: 'duel', tour: 'arena' }],
  },
  {
    title: 'Hesabım',
    items: [
      { to: '/rewards', label: 'Ödüller', icon: IconGift, tone: 'berry', match: ['/rewards', '/quests', '/shop'], tour: 'rewards' },
      { to: '/profile', label: 'Profil', icon: IconProfile, tone: 'sky', match: ['/profile', '/settings'] },
    ],
  },
]

/** Pages that live together under one menu entry, switched with a tab strip. */
export const HUBS: { key: string; tabs: { to: string; label: string; icon: NavIcon }[] }[] = [
  { key: 'arena', tabs: [{ to: '/duel', label: 'Gölge Düellosu', icon: IconGhost }, { to: '/leagues', label: 'Ligler', icon: IconCup }] },
  { key: 'rewards', tabs: [{ to: '/rewards', label: 'Kasa', icon: IconGift }, { to: '/quests', label: 'Görevler', icon: IconQuest }, { to: '/shop', label: 'Mağaza', icon: IconBag }] },
]

/** Phone tab bar: the four daily jobs plus a "more" sheet for everything else. */
const TABS: Item[] = [
  { to: '/learn', label: 'Öğren', icon: IconPath, tone: 'flame' },
  { to: '/practice', label: 'Pratik', icon: IconCards, tone: 'sky', tour: 'tab-practice' },
  { to: '/duel', label: 'Arena', icon: IconGhost, tone: 'ink', match: ['/duel', '/leagues'], tour: 'tab-arena' },
  { to: '/rewards', label: 'Ödüller', icon: IconGift, tone: 'berry', match: ['/rewards', '/quests', '/shop'], tour: 'tab-rewards' },
]

const isOn = (n: Item, path: string) => (n.match ?? [n.to]).some((m) => path === m || path.startsWith(`${m}/`))

export default function AppLayout() {
  const { user } = useAuth()
  const { t } = useLang()
  const { data: cfg } = useSiteConfig()
  const on = (f?: Item['feature']) => !f || cfg?.site?.features?.[f] !== false
  const loc = useLocation()
  const hub = HUBS.find((h) => h.tabs.some((x) => loc.pathname === x.to))
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
              <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft/80">{t(g.title)}</p>
              <div className="flex flex-col gap-0.5">
                {g.items.filter((n) => on(n.feature)).map((n) => <SideLink key={n.to} item={n} path={loc.pathname} />)}
              </div>
            </div>
          ))}
          {user.institution_role === 'manager' && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft/80">{user.institution?.name ?? 'Kurum'}</p>
              <SideLink item={{ to: '/kurum', label: 'Kurum paneli', icon: IconSchool, tone: 'sage' }} path={loc.pathname} />
            </div>
          )}
          {user.is_staff && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft/80">{t('Yönetim')}</p>
              <SideLink item={{ to: '/admin', label: 'Yönetim paneli', icon: IconShield, tone: 'ink' }} path={loc.pathname} />
            </div>
          )}
        </nav>

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
              <span data-tour="stats" className="flex min-w-0"><StatChips user={user} /></span>
              <LangSelect className="mr-1 hidden md:block" />
              <Link to="/notifications" className="relative grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label={t('Bildirimler')}>
                <Bell className="size-[22px]" />
                {!!data?.unread_notifications && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-flame text-[10px] font-black text-white">{data.unread_notifications}</span>}
              </Link>
              <Link to="/settings" className="hidden size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2 sm:grid" aria-label={t('Ayarlar')}>
                <Settings className="size-[22px]" />
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-8 px-4 pb-32 pt-6 sm:px-6 md:px-8 lg:pb-12 xl:gap-10">
          <main className="min-w-0 flex-1">
            {hub && <HubTabs tabs={hub.tabs} path={loc.pathname} />}
            <PageTransition key={loc.pathname}>{outlet}</PageTransition>
          </main>
          {withRail && data && <SideRail data={data} />}
        </div>
      </div>

      {/* Floating tab bar (phones and tablets). */}
      <nav aria-label="Alt menü" className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 pb-2 lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch rounded-[22px] border-2 border-line bg-card/95 p-1.5 shadow-soft backdrop-blur-md">
          {TABS.map((n) => {
            const isActive = isOn(n, loc.pathname)
            return (
              <Link key={n.to} to={n.to} data-tour={n.tour} aria-current={isActive ? 'page' : undefined} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold">
                {isActive && <motion.span layoutId="tab-bg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className={clsx('absolute inset-0 rounded-2xl', TONE[n.tone].split(' ').slice(1).join(' '))} />}
                <n.icon className={clsx('relative size-6', isActive ? TONE[n.tone].split(' ')[0] : 'text-ink-soft')} />
                <span className={clsx('relative', isActive ? 'text-ink' : 'text-ink-soft')}>{t(n.label)}</span>
              </Link>
            )
          })}
          <button onClick={() => setMore(true)} data-tour="more" className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold text-ink-soft" aria-label="Diğer sayfalar">
            <IconMore className="size-6" />
            {t('Daha')}
          </button>
        </div>
      </nav>

      <MoreSheet open={more} onClose={() => setMore(false)} staff={!!user.is_staff} manager={user.institution_role === 'manager'} />
      <CoachMarks />
    </div>
  )
}

function SideLink({ item: n, path }: { item: Item; path: string }) {
  const { t } = useLang()
  const [text, bg] = TONE[n.tone].split(' ')
  const isActive = isOn(n, path)
  return (
    <Link to={n.to} data-tour={n.tour} aria-current={isActive ? 'page' : undefined} className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors">
      {isActive && <motion.span layoutId="side-active" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className={clsx('absolute inset-0 rounded-xl', bg)} />}
      {isActive && <motion.span layoutId="side-bar" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className={clsx('absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-current', text)} />}
      <n.icon className={clsx('relative size-[22px] shrink-0 transition-colors', isActive ? text : 'text-ink-soft group-hover:text-ink')} />
      <span className={clsx('relative flex-1 truncate', isActive ? 'font-extrabold text-ink' : 'text-ink-soft group-hover:text-ink')}>{t(n.label)}</span>
      {n.badge && <span className="relative rounded-md bg-butter px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#1f2433]">{n.badge}</span>}
    </Link>
  )
}

/** The tab strip shared by pages that live under one menu entry. */
function HubTabs({ tabs, path }: { tabs: (typeof HUBS)[number]['tabs']; path: string }) {
  const { t } = useLang()
  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex gap-1 rounded-2xl border-2 border-line bg-card p-1" role="tablist">
        {tabs.map((x) => {
          const on = path === x.to
          return (
            <Link key={x.to} to={x.to} role="tab" aria-selected={on} className={clsx('relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-extrabold transition sm:px-4', on ? 'text-paper' : 'text-ink-soft hover:text-ink')}>
              {on && <motion.span layoutId="hub-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-ink" />}
              <x.icon className="relative size-[18px]" />
              <span className="relative">{t(x.label)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function MoreSheet({ open, onClose, staff, manager }: { open: boolean; onClose: () => void; staff: boolean; manager: boolean }) {
  const { t } = useLang()
  const items: Item[] = [
    { to: '/stories', label: 'Hikâyeler', icon: IconBook, tone: 'butter' },
    { to: '/exam', label: 'Sınav modu', icon: IconExam, tone: 'lilac' },
    { to: '/ai', label: 'Defne', icon: IconTalk, tone: 'sage' },
    { to: '/leagues', label: 'Ligler', icon: IconCup, tone: 'butter' },
    { to: '/quests', label: 'Görevler', icon: IconQuest, tone: 'mint' },
    { to: '/shop', label: 'Mağaza', icon: IconBag, tone: 'lilac' },
    { to: '/profile', label: 'Profil', icon: IconProfile, tone: 'sky' },
    { to: '/settings', label: 'Ayarlar', icon: IconSliders, tone: 'ink' },
    ...(manager ? [{ to: '/kurum', label: 'Kurum', icon: IconSchool, tone: 'sage' }] : []),
    ...(staff ? [{ to: '/admin', label: 'Yönetim', icon: IconShield, tone: 'ink' }] : []),
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
              <p className="font-display text-xl font-black">{t('Menü')}</p>
              <button onClick={onClose} className="grid size-9 place-items-center rounded-xl hover:bg-paper-2" aria-label="Kapat"><X className="size-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
              {items.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 text-center text-xs font-extrabold transition', isActive ? 'border-flame/40 bg-flame/5' : 'border-transparent hover:bg-paper-2')}>
                  <span className={clsx('grid size-12 place-items-center rounded-2xl', TONE[n.tone])}><n.icon className="size-6" /></span>
                  <span className="leading-tight">{t(n.label)}</span>
                </NavLink>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-paper-2 px-4 py-3">
              <span className="text-sm font-extrabold">{t('Dil')}</span>
              <LangSelect />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
