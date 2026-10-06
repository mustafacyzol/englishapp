import { cancelAllListening, stopVoice } from '@/lib/speech'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useOutlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import clsx from 'clsx'
import { Bell, Settings } from 'lucide-react'
import { IconBag, IconBook, IconCards, IconExam, IconGhost, IconGift, IconPath, IconProfile, IconQuest, IconSchool, IconShield, IconSliders, IconTicket, IconTalk, type NavIcon } from '@/components/ui/NavIcons'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { img, rewardImg } from '@/lib/assets'
import { Logo } from '@/components/game/Logo'
import { StatChips } from '@/components/game/StatChips'
import { PageTransition } from '@/components/motion/Page'
import { PageBoundary } from '@/components/ui/PageBoundary'
import { LangSelect } from '@/components/ui/LangSelect'
import { useLang } from '@/lib/i18n'
import { useSiteConfig } from '@/lib/site'
import { SideRail, type Dashboard } from './SideRail'
import { Img } from '@/components/ui/Img'

/**
 * Publishes the header's real height as --app-header, so everything pinned under
 * it (the "kaldığın yer" card, reader and shop toolbars) sits exactly below it on
 * every phone: notches, safe areas and wrapped stat chips included.
 */
function useHeaderHeight() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => document.documentElement.style.setProperty('--app-header', `${Math.round(el.getBoundingClientRect().height)}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return ref
}
import { CoachMarks } from '@/components/game/CoachMarks'
import { PlacementReveal } from '@/components/game/PlacementReveal'
import { examOn } from '@/lib/onboarding'
import { ProfileBanner } from '@/components/game/ProfileBanner'
import { UserAvatar } from '@/components/game/UserAvatar'
import { TUTOR } from '@/lib/tutor'

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
      { to: '/ai', label: 'Defne AI', icon: IconTalk, tone: 'sage', feature: 'ai', tour: 'ai', badge: 'Canlı' },
      { to: '/stories', label: 'Hikâyeler', icon: IconBook, tone: 'butter', feature: 'stories' },
      { to: '/practice', label: 'Kelime pratiği', icon: IconCards, tone: 'sky', tour: 'practice' },
      { to: '/exam', label: 'Sınav modu', icon: IconExam, tone: 'lilac', feature: 'exam', tour: 'exam' },
    ],
  },
  {
    title: 'Yarış',
    items: [{ to: '/duel', label: 'Arena', icon: IconGhost, tone: 'ink', badge: 'Blitz', match: ['/duel', '/leagues'], feature: 'duel', tour: 'arena' }],
  },
  {
    title: 'Hesabım',
    items: [
      { to: '/rewards', label: 'Ödüller', icon: IconGift, tone: 'berry', match: ['/rewards', '/quests', '/shop', '/coupons'], tour: 'rewards' },
      { to: '/profile', label: 'Profil', icon: IconProfile, tone: 'sky', match: ['/profile', '/settings'] },
    ],
  },
]

/** Pages that live together under one menu entry, switched with a tab strip. */
export const HUBS: { key: string; mobileOnly?: boolean; tabs: { to: string; label: string; icon: NavIcon; feature?: 'exam' }[] }[] = [
  // On phones, everything you practise with lives under one Pratik tab.
  { key: 'practice', mobileOnly: true, tabs: [{ to: '/practice', label: 'Kelimeler', icon: IconCards }, { to: '/stories', label: 'Hikâyeler', icon: IconBook }, { to: '/exam', label: 'Sınav', icon: IconExam, feature: 'exam' }] },
  { key: 'rewards', tabs: [{ to: '/rewards', label: 'Ödüllerim', icon: IconGift }, { to: '/quests', label: 'Görevler', icon: IconQuest }, { to: '/shop', label: 'Mağaza', icon: IconBag }, { to: '/coupons', label: 'Kuponlar', icon: IconTicket }] },
]

/**
 * Phone tab bar: two tabs either side of Defne, who sits raised in the middle as
 * the app's signature. Everything else lives in a short "Menü" sheet.
 */
const TABS: Item[] = [
  { to: '/learn', label: 'Öğren', icon: IconPath, tone: 'flame', match: ['/learn', '/lesson'] },
  { to: '/practice', label: 'Pratik', icon: IconCards, tone: 'sky', tour: 'tab-practice', match: ['/practice', '/stories', '/exam'] },
  { to: '/duel', label: 'Arena', icon: IconGhost, tone: 'ink', match: ['/duel', '/leagues'], tour: 'tab-arena' },
]

const isOn = (n: Item, path: string) => (n.match ?? [n.to]).some((m) => path === m || path.startsWith(`${m}/`))

export default function AppLayout() {
  const { user } = useAuth()
  const headerRef = useHeaderHeight()
  const { t } = useLang()
  const { data: cfg } = useSiteConfig()
  const on = (f?: Item['feature']) => !f || (cfg?.site?.features?.[f] !== false && (f !== 'exam' || examOn(user)))
  const loc = useLocation()
  const hub = HUBS.find((h) => h.tabs.some((x) => loc.pathname === x.to))
  const outlet = useOutlet()
  const [more, setMore] = useState(false)
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
  useEffect(() => setMore(false), [loc.pathname])
  // a page change ends any open mic or voice from the page we left (Defne, lessons, calls)
  useEffect(() => () => { cancelAllListening(); stopVoice() }, [loc.pathname])
  // Age group drives a few global touches (tint, type size) through one attribute.
  useEffect(() => {
    const el = document.documentElement
    if (user?.age_group) el.dataset.age = user.age_group
    else delete el.dataset.age
    return () => { delete el.dataset.age }
  }, [user?.age_group])
  if (!user) return null
  // The dashboard rail belongs to the home screen only; every other page gets the
  // full column so reading, chat and pricing have room to breathe.
  const withRail = loc.pathname === '/learn'

  return (
    <div className="relative isolate mx-auto flex min-h-dvh max-w-[1700px]">
      <div aria-hidden className="app-backdrop pointer-events-none fixed inset-0 -z-10" />
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
          {(user.institution_role === 'manager' || user.institution_role === 'teacher') && (
            <div>
              <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft/80">{user.institution?.name ?? 'Kurum'}</p>
              <SideLink item={{ to: '/kurum', label: user.institution_role === 'teacher' ? 'Öğretmen paneli' : 'Okul paneli', icon: IconSchool, tone: 'sage' }} path={loc.pathname} />
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
        <header ref={headerRef} className="safe-top sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
            <Link to="/learn" className="shrink-0 lg:hidden" aria-label="Yol haritası">
              <span className="sm:hidden"><Logo small className="[&>span:last-child]:hidden" /></span>
              <span className="hidden sm:inline"><Logo small /></span>
            </Link>
            <p className="hidden min-w-0 truncate text-sm font-bold text-ink-soft lg:block">
              {data?.announcement ? <span className="rounded-lg bg-butter/20 px-2 py-1 text-ink">📣 {data.announcement}</span> : withRail && <Greeting name={user.name} />}
            </p>
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              <span data-tour="stats" className="flex min-w-0"><StatChips user={user} /></span>
              <LangSelect className="mr-1 hidden md:grid" />
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
            {hub && <div className={clsx(hub.mobileOnly && 'lg:hidden')}><HubTabs tabs={hub.tabs.filter((x) => !x.feature || on(x.feature))} path={loc.pathname} /></div>}
            <PageBoundary key={loc.pathname}><PageTransition>{outlet}</PageTransition></PageBoundary>
          </main>
          {withRail && data && <SideRail data={data} />}
        </div>
      </div>

      {/* Phone and tablet dock: edge to edge like a native app, safe-area aware. Five equal
          tabs, Defne among them at the same size; the active one gets a small bar and its colour. */}
      <nav aria-label="Alt menü" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur-xl lg:hidden">
        <div className="safe-bottom mx-auto grid max-w-xl grid-cols-5 px-1">
          {TABS.slice(0, 2).map((n) => <Tab key={n.to} n={n} active={isOn(n, loc.pathname)} />)}
          <DefneTab active={loc.pathname.startsWith('/ai')} />
          <Tab n={TABS[2]} active={isOn(TABS[2], loc.pathname)} />
          <button onClick={() => setMore(true)} data-tour="more" aria-label="Ben" className="relative flex flex-col items-center gap-0.5 pb-1.5 pt-2">
            <DockBar on={MENU_PATHS.some((p) => loc.pathname.startsWith(p))} color="bg-ink" />
            <span className="relative">
              <UserAvatar name={user.name} avatar={user.avatar} className="size-[26px]" />
              {!!data?.available_items && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-flame ring-2 ring-card" />}
            </span>
            <span className={clsx('text-[11px]', MENU_PATHS.some((p) => loc.pathname.startsWith(p)) ? 'font-black text-ink' : 'font-bold text-ink-soft')}>{t('Ben')}</span>
          </button>
        </div>
      </nav>

      <MoreSheet open={more} onClose={() => setMore(false)} staff={!!user.is_staff} manager={user.institution_role === 'manager' || user.institution_role === 'teacher'} exam={on('exam')} />
      <CoachMarks />
      <PlacementReveal />
    </div>
  )
}

const MENU_PATHS = ['/rewards', '/quests', '/shop', '/coupons', '/profile', '/settings', '/notifications', '/kurum']

/** The little bar over the active dock tab; it glides from tab to tab. */
function DockBar({ on, color }: { on: boolean; color: string }) {
  return on ? <motion.span layoutId="dock-bar" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className={clsx('absolute inset-x-5 top-0 h-[3px] rounded-b-full', color)} /> : null
}

/** A dock tab: the icon fills with its colour when active, the name under it. */
function Tab({ n, active }: { n: Item; active: boolean }) {
  const { t } = useLang()
  const [text] = TONE[n.tone].split(' ')
  return (
    <Link to={n.to} data-tour={n.tour} aria-current={active ? 'page' : undefined} className="relative flex flex-col items-center gap-0.5 pb-1.5 pt-2">
      <DockBar on={active} color={text.replace('text-', 'bg-')} />
      <n.icon className={clsx('size-[26px] transition-transform duration-200', active ? `${text} scale-105` : 'text-ink-soft')} strokeWidth={active ? 2.4 : 2} />
      <span className={clsx('text-[11px] transition-colors', active ? 'font-black text-ink' : 'font-bold text-ink-soft')}>{t(n.label)}</span>
    </Link>
  )
}

/** Defne as an ordinary tab: her face in the icon's place, with a small online dot. */
function DefneTab({ active }: { active: boolean }) {
  return (
    <Link to="/ai" data-tour="tab-defne" aria-label="Defne AI ile konuş" aria-current={active ? 'page' : undefined} className="relative flex flex-col items-center gap-0.5 pb-1.5 pt-2">
      <DockBar on={active} color="bg-sage" />
      <span className={clsx('relative rounded-full transition', active ? 'ring-2 ring-sage ring-offset-1 ring-offset-card' : '')}>
        <Img src={TUTOR.avatar} alt="" className="size-[26px] rounded-full object-cover" />
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-mint" />
      </span>
      <span className={clsx('text-[11px]', active ? 'font-black text-ink' : 'font-bold text-ink-soft')}>Defne</span>
    </Link>
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
      <div className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-2xl border-2 border-line bg-card p-1 sm:inline-flex sm:w-auto" role="tablist">
        {tabs.map((x) => {
          const on = path === x.to
          return (
            <Link key={x.to} to={x.to} role="tab" aria-selected={on} className={clsx('relative flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-1.5 py-2 text-[13px] font-extrabold transition sm:px-4 sm:text-sm', on ? 'text-on-inv' : 'text-ink-soft hover:text-ink')}>
              {on && <motion.span layoutId="hub-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-inv" />}
              <x.icon className="relative hidden size-[18px] sm:block" />
              <span className="relative">{t(x.label)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function MoreSheet({ open, onClose, staff, manager, exam }: { open: boolean; onClose: () => void; staff: boolean; manager: boolean; exam: boolean }) {
  const { t } = useLang()
  const { user } = useAuth()
  const drag = useDragControls()
  const [full, setFull] = useState(false)
  useEffect(() => { if (!open) setFull(false) }, [open])
  if (!user) return null
  const lvl = user.stats
  const pct = Math.round(((lvl.xp_total - lvl.level_floor) / Math.max(1, lvl.level_ceil - lvl.level_floor)) * 100)
  // big illustrated tiles for the things people open most
  const tiles = [
    { to: '/rewards', label: 'Ödüllerim', sub: 'Kasa ve sandıklar', art: rewardImg('chest'), tint: 'from-berry/15' },
    { to: '/quests', label: 'Görevler', sub: 'Günlük ve haftalık', art: rewardImg('star'), tint: 'from-butter/25' },
    { to: '/shop', label: 'Mağaza', sub: 'Çerçeve, kapak, güç', art: rewardImg('gems'), tint: 'from-sky/15' },
    { to: '/leagues', label: 'Ligler', sub: `${lvl.league_name} ligi`, art: img(`leagues/${Math.max(0, Math.min(9, lvl.league_tier))}.webp`), tint: 'from-lilac/15' },
    ...(exam ? [{ to: '/exam', label: 'Sınav modu', sub: 'Deneme ve analiz', art: rewardImg('trophy'), tint: 'from-flame/12' }] : []),
    { to: '/coupons', label: 'Kuponlar', sub: 'Marka hediyeleri', art: rewardImg('coupon'), tint: 'from-mint/15' },
  ]
  const rows: Item[] = [
    { to: '/settings', label: 'Ayarlar', icon: IconSliders, tone: 'ink' },
    ...(manager ? [{ to: '/kurum', label: 'Okul paneli', icon: IconSchool, tone: 'sage' }] : []),
    ...(staff ? [{ to: '/admin', label: 'Yönetim paneli', icon: IconShield, tone: 'ink' }] : []),
  ]
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Ben">
          <motion.button aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          {/* A real bottom sheet: grab the handle (or the cover) and pull it up to full height,
              down to half, further down to close. The list inside scrolls on its own. */}
          <motion.div
            className="safe-bottom absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] bg-card"
            initial={{ y: '100%' }}
            animate={{ y: 0, height: full ? '94dvh' : '72dvh' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.25, bottom: 0.7 }}
            onDragEnd={(_, i) => {
              if (i.offset.y < -50 || i.velocity.y < -500) setFull(true)
              else if (i.offset.y > 80 || i.velocity.y > 500) { if (full) setFull(false); else onClose() }
            }}
          >
            <div onPointerDown={(e) => drag.start(e)} className="absolute inset-x-0 top-0 z-20 flex h-8 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing" aria-label="Sürükle">
              <span className="h-1.5 w-12 rounded-full bg-white/80 shadow" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
            {/* you, on your own cover */}
            <Link to="/profile" className="relative block overflow-hidden rounded-t-[28px]">
              <ProfileBanner banner={user.banner} className="h-28" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              <span className="relative -mt-12 flex items-end gap-3 px-5">
                <UserAvatar name={user.name} avatar={user.avatar} frame={user.frame} className="size-[72px]" />
                <span className="min-w-0 flex-1 pb-1">
                  <span className="block truncate font-display text-xl font-black">{user.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-xs font-bold text-ink-soft">
                    Seviye {lvl.level}
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2"><span className="block h-full rounded-full bg-flame" style={{ width: `${pct}%` }} /></span>
                  </span>
                </span>
                <span className="mb-1 rounded-full bg-paper-2 px-3 py-1.5 text-xs font-extrabold">Profil</span>
              </span>
            </Link>

            <div className="mt-4 grid grid-cols-2 gap-2.5 px-4">
              {tiles.map((x, k) => (
                <motion.div key={x.to} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + k * 0.035, type: 'spring', stiffness: 420, damping: 30 }}>
                  <NavLink to={x.to} className={({ isActive }) => clsx('relative flex h-[84px] items-center gap-2 overflow-hidden rounded-2xl border-2 bg-gradient-to-br to-transparent p-3 transition active:scale-[.98]', x.tint, isActive ? 'border-ink/30' : 'border-line')}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[15px] font-black leading-tight">{t(x.label)}</span>
                      <span className="block truncate text-[11px] font-bold text-ink-soft">{x.sub}</span>
                    </span>
                    <Img src={x.art} alt="" className="size-12 shrink-0 object-contain drop-shadow" />
                  </NavLink>
                </motion.div>
              ))}
            </div>

            <div className="mx-4 mt-3 divide-y-2 divide-line/50 rounded-2xl border-2 border-line">
              {rows.map((n) => (
                <Link key={n.to} to={n.to} className="flex items-center gap-3 px-4 py-3 text-sm font-extrabold"><n.icon className="size-5 text-ink-soft" /> {t(n.label)}<span className="ml-auto text-ink-soft">›</span></Link>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-extrabold">{t('Dil')}</span>
                <LangSelect />
              </div>
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** The one friendly line of the app, beside the stats on the path screen only. */
function Greeting({ name }: { name: string }) {
  const h = new Date().getHours()
  const hello = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar'
  return <>{hello}, <span className="text-ink">{name.split(' ')[0]}</span>! Bugün de biraz İngilizce?</>
}
