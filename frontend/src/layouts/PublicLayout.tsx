import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import clsx from 'clsx'
import { ArrowUp, Clock, Mail, Menu, ShieldCheck, Smartphone, X, type LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import { Logo } from '@/components/game/Logo'
import { LinkButton } from '@/components/ui/Button'
import { PageTransition } from '@/components/motion/Page'

const LINKS = [
  { to: '/', label: 'Ana sayfa', end: true },
  { to: '/about', label: 'Hakkımızda' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'İletişim' },
]

export default function PublicLayout() {
  const { user } = useAuth()
  const loc = useLocation()
  const outlet = useOutlet()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div className="min-h-dvh bg-card">
      <header className={clsx('safe-top sticky top-0 z-40 transition', scrolled ? 'border-b-2 border-line bg-card/95 backdrop-blur-md' : 'bg-card')}>
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" aria-label="DilGO ana sayfa"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => clsx('rounded-xl px-4 py-2 text-[15px] font-extrabold transition', isActive ? 'text-flame' : 'text-ink-soft hover:text-ink')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <LinkButton to="/learn" size="sm">Uygulamaya git</LinkButton>
            ) : (
              <>
                <LinkButton to="/login" variant="secondary" size="sm">Giriş yap</LinkButton>
                <LinkButton to="/register" size="sm">Ücretsiz başla</LinkButton>
              </>
            )}
          </div>
          <button className="grid size-11 place-items-center rounded-xl md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menü" aria-expanded={open}>
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t-2 border-line bg-card md:hidden">
              <div className="flex flex-col gap-1 px-5 py-4">
                {LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => clsx('rounded-xl px-3 py-3 text-lg font-extrabold', isActive ? 'bg-flame/10 text-flame' : 'text-ink')}>{l.label}</NavLink>
                ))}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <LinkButton to="/login" variant="secondary">Giriş</LinkButton>
                  <LinkButton to="/register">Başla</LinkButton>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <ScrollProgress />

      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={loc.pathname}>{outlet}</PageTransition>
      </AnimatePresence>

      <Footer />
    </div>
  )
}

/** A hairline reading-progress bar pinned under the header. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const width = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 })
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-flame via-berry to-sky" style={{ scaleX: width }} />
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
      ['/#ada', 'AI öğretmen Ada'],
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
      <span className="glow left-[-6%] top-[-30%] size-[360px] bg-flame/10" />

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
