import { Suspense, useEffect, useState } from 'react'
import { PageFallback } from '@/components/motion/Page'
import { Link, NavLink, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Gauge, Mail, Menu, Settings, Users, UsersRound } from 'lucide-react'
import { get, type ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Logo } from '@/components/game/Logo'
import { SkeletonPage } from '@/components/ui/Misc'
import { LangSelect } from '@/components/ui/LangSelect'
import { TYPE, type InstitutionReport } from '@/components/institution/Report'

const NAV = [
  { to: '/kurum', label: 'Genel bakış', icon: Gauge, end: true },
  { to: '/kurum/ogrenciler', label: 'Öğrenciler', icon: Users },
  { to: '/kurum/siniflar', label: 'Sınıflar', icon: UsersRound },
  { to: '/kurum/davetler', label: 'Davetler', icon: Mail },
  { to: '/kurum/ayarlar', label: 'Kurum ayarları', icon: Settings },
]

export const useInstitution = () => useOutletContext<{ data: InstitutionReport }>()

/** The institution's initials in its brand colour, until a logo is uploaded. */
export function InstitutionMark({ name, logo, color, className }: { name: string; logo?: string | null; color?: string | null; className?: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase('tr')
  return logo ? (
    <img src={logo} alt={name} className={clsx('rounded-2xl bg-white object-contain p-1.5 ring-2 ring-line', className)} />
  ) : (
    <span className={clsx('grid place-items-center rounded-2xl font-display font-black text-white', className)} style={{ background: color ?? 'var(--color-sage)' }}>{initials}</span>
  )
}

/**
 * The institution panel is its own space, like the admin panel: the school's
 * logo and colour on top, a short menu for what a manager actually does, and a
 * clear way back to the learner app. Only institution managers can open it.
 */
export default function InstitutionLayout() {
  const { user } = useAuth()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const allowed = user?.institution_role === 'manager'
  const { data, error } = useQuery({ queryKey: ['institution'], queryFn: () => get<InstitutionReport>('/institution'), enabled: allowed })
  useEffect(() => setOpen(false), [loc.pathname])

  if (!allowed) return <Navigate to="/learn" replace />
  const inst = data?.institution
  const accent = inst?.brand_color ?? 'var(--color-sage)'

  const side = (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3 px-2">
        {inst ? <InstitutionMark name={inst.name} logo={inst.logo_url} color={inst.brand_color} className="size-12 shrink-0 text-lg" /> : <span className="size-12 rounded-2xl bg-paper-2" />}
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black leading-tight">{inst?.name ?? 'Kurum'}</p>
          <p className="text-xs font-bold text-ink-soft">{inst ? `${TYPE[inst.type] ?? inst.type} paneli` : 'Yükleniyor'}</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Kurum menüsü">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition', isActive ? 'text-ink' : 'text-ink-soft hover:bg-paper-2 hover:text-ink')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="inst-active" className="absolute inset-0 rounded-xl" style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)` }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <n.icon className="relative size-5" style={isActive ? { color: accent } : undefined} />
                <span className="relative">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3 pt-6">
        {inst && (
          <div className="rounded-2xl border-2 border-line p-3 text-xs">
            <p className="font-black uppercase tracking-widest text-ink-soft">Koltuk</p>
            <p className="mt-1 font-display text-xl font-black tabular-nums">{inst.seats_used}<span className="text-ink-soft">/{inst.seats}</span></p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (inst.seats_used / Math.max(1, inst.seats)) * 100)}%`, background: accent }} /></div>
          </div>
        )}
        <Link to="/learn" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-ink-soft hover:bg-paper-2 hover:text-ink"><ArrowLeft className="size-4" /> Öğrenci uygulamasına dön</Link>
        <p className="flex items-center gap-2 px-3 text-[11px] font-bold text-ink-soft">Altyapı: <Logo small /></p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-paper" style={{ ['--inst' as string]: accent }}>
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r-2 border-line bg-card/50 px-3 py-5 lg:block">{side}</aside>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button aria-label="Kapat" className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="safe-top absolute inset-y-0 left-0 w-[280px] bg-card px-3 py-5" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>{side}</motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-30 border-b-2 border-line bg-paper/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl hover:bg-paper-2 lg:hidden" aria-label="Menü"><Menu className="size-6" /></button>
            {inst && <span className="flex min-w-0 items-center gap-2 lg:hidden"><InstitutionMark name={inst.name} logo={inst.logo_url} color={inst.brand_color} className="size-8 shrink-0 rounded-xl text-xs" /><span className="truncate font-display font-black">{inst.name}</span></span>}
            <p className="hidden text-sm font-bold text-ink-soft lg:block">Kurum paneli · yalnızca yöneticiler görür</p>
            <div className="ml-auto flex items-center gap-2">
              <LangSelect />
              <span className="hidden items-center gap-2 rounded-full bg-paper-2 py-1 pl-1 pr-3 text-sm font-bold sm:flex"><span className="grid size-7 place-items-center rounded-full text-xs font-black text-white" style={{ background: accent }}>{user?.name[0]}</span>{user?.name.split(' ')[0]}</span>
            </div>
          </div>
          <span aria-hidden className="block h-[3px] w-full" style={{ background: accent }} />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {error ? <p className="text-ink-soft">{(error as ApiError).message}</p> : data ? <Suspense fallback={<PageFallback />}><Outlet context={{ data }} /></Suspense> : <SkeletonPage variant="cards" />}
        </main>
      </div>
    </div>
  )
}
