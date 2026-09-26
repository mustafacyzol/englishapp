import { useEffect, useState } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import clsx from 'clsx'
import { ArrowUp, ArrowUpRight, Clock, Mail, Menu, ShieldCheck, Smartphone, X, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { Logo } from '@/components/game/Logo'
import { ThemeButton, ThemeToggle } from '@/components/ui/ThemeToggle'
import { LinkButton } from '@/components/ui/Button'
import { PageTransition } from '@/components/motion/Page'

/** Primary sections — the full row shows from lg; below that everything lives in the sheet. */
const LINKS = [
  { to: '/#beceriler', label: 'Yöntem' },
  { to: '/#defne', label: 'Defne' },
  { to: '/#duello', label: 'Düello' },
  { to: '/#kurumlar', label: 'Kurumlar' },
  { to: '/#paketler', label: 'Fiyatlar' },
  { to: '/blog', label: 'Blog' },
]
const MORE = [
  { to: '/about', label: 'Hakkımızda' },
  { to: '/placement', label: 'Seviye testi' },
  { to: '/contact', label: 'İletişim' },
]

/** A link is active when its path matches and, for section links, the hash matches too. */
function useIsActive() {
  const loc = useLocation()
  return (to: string) => {
    const [path, hash] = to.split('#')
    if (hash) return loc.pathname === (path || '/') && loc.hash === `#${hash}`
    return loc.pathname === path || loc.pathname.startsWith(`${path}/`)
  }
}

export default function PublicLayout() {
  const loc = useLocation()
  const outlet = useOutlet()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
    if (!loc.hash) {
      window.scrollTo({ top: 0 })
      return
    }
    // Let the target section mount (pages are lazy) before jumping to it.
    const id = decodeURIComponent(loc.hash.slice(1))
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [loc.pathname, loc.hash])

  return (
    <div className="min-h-dvh bg-card">
      <SiteHeader onMenu={() => setOpen(true)} />
      <MenuSheet open={open} onClose={() => setOpen(false)} />
      <ScrollProgress />

      <PageTransition key={loc.pathname}>{outlet}</PageTransition>

      <Footer />
    </div>
  )
}

/**
 * The header sits flush at the top, then lifts into a floating, rounded bar once
 * the page scrolls — so it never covers content with a heavy slab.
 */
function SiteHeader({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth()
  const isActive = useIsActive()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className="safe-top sticky top-0 z-40 px-3 pt-2 sm:px-4 lg:pt-3">
      <div
        className={clsx(
          'mx-auto flex h-16 max-w-6xl items-center gap-3 rounded-2xl pl-3 pr-2 transition-[background-color,box-shadow,border-color] duration-300 sm:pl-4',
          scrolled ? 'border-2 border-line bg-card/92 shadow-soft backdrop-blur-md' : 'border-2 border-transparent',
        )}
      >
        <Link to="/" aria-label="DilGO ana sayfa" className="shrink-0"><Logo /></Link>

        <nav aria-label="Ana menü" className="mx-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = isActive(l.to)
            return (
              <Link key={l.to} to={l.to} className={clsx('relative rounded-xl px-3.5 py-2 text-[15px] font-extrabold transition-colors', active ? 'text-ink' : 'text-ink-soft hover:bg-paper-2 hover:text-ink')}>
                {l.label}
                {active && <motion.span layoutId="nav-dot" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-x-3.5 -bottom-0.5 h-[3px] rounded-full bg-flame" />}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <ThemeButton className="hidden sm:grid" />
          {user ? (
            <span className="hidden sm:block"><LinkButton to="/learn" size="sm">Uygulamaya git</LinkButton></span>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-xl px-3 py-2 text-[15px] font-extrabold text-ink-soft transition hover:bg-paper-2 hover:text-ink lg:block">Giriş yap</Link>
              <span className="hidden min-[400px]:block"><LinkButton to="/register" size="sm">Ücretsiz başla</LinkButton></span>
            </>
          )}
          <button
            onClick={onMenu}
            aria-label="Menüyü aç"
            className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm lg:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

/**
 * Full-screen menu for phones and tablets: large, numbered links with room to
 * breathe, account actions pinned to the bottom, and the page locked behind it.
 */
function MenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const isActive = useIsActive()

  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card lg:hidden"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="safe-top px-3 pt-2 sm:px-4">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between pl-3 pr-2 sm:pl-4">
              <Link to="/" onClick={onClose} aria-label="DilGO ana sayfa"><Logo /></Link>
              <button onClick={onClose} aria-label="Menüyü kapat" className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm">
                <X className="size-5" />
              </button>
            </div>
          </div>

          <nav aria-label="Ana menü" className="mx-auto w-full max-w-2xl flex-1 px-6 pt-6 sm:px-10">
            <ul>
              {LINKS.map((l, i) => (
                <motion.li key={l.to} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 + i * 0.035, duration: 0.3 }}>
                  <Link to={l.to} onClick={onClose} className="group flex items-center gap-4 border-b-2 border-line py-4">
                    <span className="w-7 font-mono text-xs text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                    <span className={clsx('flex-1 font-display text-[28px] font-black leading-none tracking-tight sm:text-4xl', isActive(l.to) ? 'text-flame' : 'text-ink')}>{l.label}</span>
                    <ArrowUpRight className="size-6 text-ink-soft transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-flame" />
                  </Link>
                </motion.li>
              ))}
            </ul>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 flex flex-wrap gap-2">
              {MORE.map((l) => (
                <Link key={l.to} to={l.to} onClick={onClose} className="rounded-full border-2 border-line px-4 py-2 text-sm font-extrabold text-ink-soft hover:border-ink/30 hover:text-ink">{l.label}</Link>
              ))}
            </motion.div>
          </nav>

          <div className="safe-bottom mx-auto w-full max-w-2xl px-6 pb-6 pt-8 sm:px-10">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-extrabold text-ink-soft">Görünüm</span>
              <ThemeToggle />
            </div>
            {user ? (
              <LinkButton to="/learn" block size="lg" onClick={onClose}>Uygulamaya git</LinkButton>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <LinkButton to="/register" block size="lg" onClick={onClose}>Ücretsiz başla</LinkButton>
                <LinkButton to="/login" block size="lg" variant="secondary" onClick={onClose}>Giriş yap</LinkButton>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A hairline reading-progress bar — one solid brand colour, no gradient. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const width = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-flame" style={{ scaleX: width }} />
}

/**
 * Social accounts. Left empty on purpose — fill in the school's real handles and
 * the row appears; an empty list keeps the footer free of dead links.
 */
const SOCIAL: { label: string; href: string; icon: LucideIcon }[] = []

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Uygulama',
    links: [
      ['/register', 'Ücretsiz başla'],
      ['/placement', 'Seviye testi'],
      ['/#beceriler', 'Dört beceri'],
      ['/#defne', 'AI öğretmen Defne'],
      ['/#oduller', 'Ödül sistemi'],
      ['/#paketler', 'Paketler ve fiyatlar'],
      ['/login', 'Giriş yap'],
    ],
  },
  {
    title: 'Kurum',
    links: [
      ['/about', 'Hakkımızda'],
      ['/about#okul', 'Bayrak Dil Okulları'],
      ['/blog', 'Blog'],
      ['/contact', 'İletişim'],
      ['/contact?konu=corporate', 'Kurumsal eğitim'],
      ['/contact?konu=partnership', 'İş birliği'],
    ],
  },
  {
    title: 'Destek',
    links: [
      ['/#sss', 'Sık sorulanlar'],
      ['/contact?konu=support', 'Teknik destek'],
      ['/contact?konu=course', 'Kurslarımız hakkında'],
      ['/forgot-password', 'Şifremi unuttum'],
      ['/refund', 'İptal ve iade'],
    ],
  },
  {
    title: 'Yasal',
    links: [
      ['/terms', 'Kullanım koşulları'],
      ['/privacy', 'Gizlilik ve KVKK'],
      ['/cookies', 'Çerez politikası'],
      ['/distance-sales', 'Mesafeli satış sözleşmesi'],
    ],
  },
]

function Footer() {
  const { data } = useQuery({ queryKey: ['config'], queryFn: () => get<{ support_email: string }>('/config'), staleTime: 600_000 })
  const email = data?.support_email ?? 'destek@dilgo.app'

  return (
    <footer className="relative overflow-hidden border-t-2 border-line bg-paper">
      <div className="relative mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2.5fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm leading-relaxed text-ink-soft">
              DilGO, Bayrak Dil Okulları’nın İngilizce uygulamasıdır. Oku, dinle, konuş, yaz — her gün birkaç dakika, gerçek öğretmen desteğiyle.
            </p>

            <ul className="mt-6 space-y-3 text-sm font-bold">
              <li className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-line bg-card"><Mail className="size-4 text-flame" /></span>
                <a href={`mailto:${email}`} className="hover:text-flame">{email}</a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-line bg-card"><Clock className="size-4 text-sky" /></span>
                <span className="text-ink-soft">Hafta içi 09:00–19:00</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-line bg-card"><Smartphone className="size-4 text-mint" /></span>
                <span className="text-ink-soft">Web, iOS ve Android</span>
              </li>
            </ul>

            {SOCIAL.length > 0 && (
              <div className="mt-6 flex gap-2">
                {SOCIAL.map((s) => (
                  <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer" className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card hover:border-flame/40 hover:text-flame">
                    <s.icon className="size-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="mb-4 text-sm font-extrabold uppercase tracking-widest text-ink-soft">{c.title}</p>
                <ul className="space-y-2.5">
                  {c.links.map(([to, l]) => (
                    <li key={to + l}>
                      <Link to={to} className="text-[15px] font-bold text-ink/90 transition hover:text-flame">{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-card p-5">
          <ShieldCheck className="size-6 shrink-0 text-mint" />
          <p className="flex-1 text-sm font-bold">
            Ödemeler iyzico altyapısıyla 3D Secure alınır. Kart bilgileriniz bizde saklanmaz.
          </p>
          <Link to="/register" className="press rounded-xl bg-flame px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_3px_0_0_var(--color-flame-deep)]">Ücretsiz başla</Link>
        </div>
      </div>

      <div className="safe-bottom border-t-2 border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-sm font-semibold text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} Bayrak Dil Okulları · Tüm hakları saklıdır.</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1.5 font-bold hover:text-flame">
            Başa dön <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </footer>
  )
}
