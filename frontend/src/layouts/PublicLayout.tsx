import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
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
    window.scrollTo({ top: 0 })
  }, [loc.pathname])
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

      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={loc.pathname}>{outlet}</PageTransition>
      </AnimatePresence>

      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t-2 border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-ink-soft">Bayrak Dil Okulları'nın İngilizce uygulaması. Oku, dinle, konuş, yaz — her gün birkaç dakika.</p>
        </div>
        <FooterCol title="Uygulama" links={[['/register', 'Ücretsiz başla'], ['/placement', 'Seviye testi'], ['/login', 'Giriş yap']]} />
        <FooterCol title="Kurum" links={[['/about', 'Hakkımızda'], ['/blog', 'Blog'], ['/contact', 'İletişim']]} />
        <FooterCol title="Yasal" links={[['/terms', 'Kullanım koşulları'], ['/privacy', 'Gizlilik ve KVKK']]} />
      </div>
      <p className="safe-bottom border-t-2 border-line py-5 text-center text-sm font-semibold text-ink-soft">© {new Date().getFullYear()} Bayrak Dil Okulları · Tüm hakları saklıdır.</p>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-soft">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([to, l]) => <li key={to}><Link to={to} className="font-bold hover:text-flame">{l}</Link></li>)}
      </ul>
    </div>
  )
}
