import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useScroll, useSpring } from 'motion/react'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, Mail, Menu, X } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { higoImg } from '@/components/game/Higo'
import { useAuth } from '@/lib/auth'
import { Logo } from '@/components/game/Logo'
import { LangSelect } from '@/components/ui/LangSelect'
import { useLang } from '@/lib/i18n'
import { useSiteConfig } from '@/lib/site'
import { LinkButton } from '@/components/ui/Button'
import { PageTransition } from '@/components/motion/Page'
import { PageBoundary } from '@/components/ui/PageBoundary'
import { BRAND, SUPPORT_EMAIL, WORDMARK } from '@/lib/brand'
import { TUTOR } from '@/lib/tutor'
import { rewardImg } from '@/lib/assets'

/** A short main menu: who we are, who it's for, what it costs, and the blog. */
const LINKS = [
  { to: '/okullar', label: 'Okullar için' },
  { to: '/#paketler', label: 'Fiyatlar' },
  { to: '/yardim', label: 'Yardım' },
  { to: '/blog', label: 'Blog' },
]
/** The phone menu has no dropdown, so "Ürün" items fold into its list. */
const MOBILE_LINKS = [{ to: '/#nasil', label: 'Nasıl çalışır' }, ...LINKS.map((l) => (l.to === '/yardim' ? { ...l, label: 'Yardım merkezi' } : l)), { to: '/about', label: 'Hakkımızda' }]
const MORE = [
  { to: '/contact', label: 'İletişim' },
  { to: '/placement', label: 'Seviye testi' },
]
/** The desktop "Ürün" panel: what you can do, with a picture each. */
const PRODUCT = [
  { to: '/#nasil', title: 'Ders yolu', text: "A1'den B2'ye, adım adım", art: higoImg('map') },
  { to: '/#dene', title: 'Defne ile konuş', text: 'Sesli arama, rol oyunları', art: TUTOR.avatar, round: true },
  { to: '/#oduller', title: 'Seri ve ödüller', text: 'Sandıklar, ligler, rozetler', art: rewardImg('chest') },
  { to: '/#kimler-icin', title: 'Sınava hazırlık', text: 'LGS, YDT, YDS, IELTS', art: rewardImg('trophy') },
]
const COMPANY = [
  { to: '/about', label: 'Hakkımızda' },
  { to: '/okullar', label: 'Okullar için' },
  { to: '/yardim', label: 'Yardım merkezi' },
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

      <PageBoundary key={loc.pathname}><PageTransition>{outlet}</PageTransition></PageBoundary>

      <Footer />
    </div>
  )
}

/**
 * The header sits flush at the top, then lifts into a floating, rounded bar once
 * the page scrolls, so it never covers content with a heavy slab.
 */
function SiteHeader({ onMenu }: { onMenu: () => void }) {
  const { t } = useLang()
  const { user } = useAuth()
  const isActive = useIsActive()
  const [scrolled, setScrolled] = useState(false)
  const [hover, setHover] = useState<string | null>(null)
  const [mega, setMega] = useState(false)
  const loc = useLocation()
  useEffect(() => setMega(false), [loc.pathname, loc.hash])
  useEffect(() => {
    if (!mega) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMega(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [mega])

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
          'mx-auto flex h-16 w-full max-w-6xl items-center gap-2 rounded-full pl-4 pr-2 transition-[background-color,box-shadow,border-color] duration-300 sm:gap-3 sm:pl-5',
          scrolled ? 'border border-line bg-card/85 shadow-[0_10px_40px_-12px_rgba(31,36,51,.25)] backdrop-blur-xl' : 'border border-transparent',
        )}
      >
        <Link to="/" aria-label={`${BRAND} ana sayfa`} className="shrink-0"><Logo /></Link>

        <nav aria-label="Ana menü" className="relative mx-auto hidden items-center lg:flex" onMouseLeave={() => { setHover(null); setMega(false) }}>
          <button
            onMouseEnter={() => { setHover('mega'); setMega(true) }}
            onClick={() => setMega((m) => !m)}
            aria-expanded={mega}
            aria-haspopup="true"
            className={clsx('relative flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-bold transition-colors', mega || hover === 'mega' ? 'text-ink' : 'text-ink-soft')}
          >
            {hover === 'mega' && <motion.span layoutId="nav-hover" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-full bg-paper-2" />}
            <span className="relative">{t('Ürün')}</span>
            <ChevronDown className={clsx('relative size-4 transition-transform', mega && 'rotate-180')} />
          </button>
          {LINKS.map((l) => {
            const active = isActive(l.to)
            return (
              <Link key={l.to} to={l.to} onMouseEnter={() => { setHover(l.to); setMega(false) }} className={clsx('relative whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-bold transition-colors', active || hover === l.to ? 'text-ink' : 'text-ink-soft')}>
                {hover === l.to && <motion.span layoutId="nav-hover" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-full bg-paper-2" />}
                <span className="relative">{t(l.label)}</span>
                {active && <motion.span layoutId="nav-dot" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-flame" />}
              </Link>
            )
          })}

          {/* the product panel: four things you can do, the company links and a nudge to the level test */}
          <AnimatePresence>
            {mega && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-full z-50 pt-3"
              >
                <div className="grid w-[720px] grid-cols-[1.5fr_1fr] overflow-hidden rounded-[28px] border border-line bg-card shadow-[0_30px_80px_-24px_rgba(31,36,51,.35)]">
                  <div className="grid grid-cols-2 gap-1 p-3">
                    {PRODUCT.map((p, k) => (
                      <motion.div key={p.to} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * k }}>
                        <Link to={p.to} onClick={() => setMega(false)} className="group flex h-full flex-col gap-3 rounded-2xl p-3 transition hover:bg-paper-2">
                          <span className="grid size-14 place-items-center rounded-2xl bg-paper-2 transition group-hover:bg-card group-hover:shadow-sm">
                            <img src={p.art} alt="" className={clsx('object-contain transition group-hover:scale-110', p.round ? 'size-11 rounded-full object-cover' : 'size-11')} />
                          </span>
                          <span>
                            <span className="flex items-center gap-1 font-display text-[15px] font-black">{p.title}<ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" /></span>
                            <span className="block text-[13px] text-ink-soft">{p.text}</span>
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex flex-col bg-paper-2/70 p-5">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-ink-soft">{BRAND}</p>
                    {COMPANY.map((c) => (
                      <Link key={c.to} to={c.to} onClick={() => setMega(false)} className="rounded-lg py-1.5 text-[15px] font-bold text-ink/80 transition hover:text-flame">{c.label}</Link>
                    ))}
                    <Link to="/placement" onClick={() => setMega(false)} className="group mt-auto flex items-center gap-3 rounded-2xl bg-ink p-3 text-paper">
                      <img src={higoImg('point')} alt="" className="size-12 shrink-0 object-contain transition group-hover:-rotate-6" />
                      <span className="min-w-0">
                        <span className="block font-display text-[15px] font-black leading-tight">Seviyeni bul</span>
                        <span className="block text-xs opacity-75">3 dakika, ücretsiz</span>
                      </span>
                      <ArrowRight className="ml-auto size-4 shrink-0 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
          <LangSelect className="hidden xl:grid" />
          {user ? (
            <span className="hidden sm:block"><LinkButton to="/learn" size="sm">{t('Uygulamaya git')}</LinkButton></span>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-xl px-3 py-2 text-[15px] font-extrabold text-ink-soft transition hover:bg-paper-2 hover:text-ink sm:block">{t('Giriş yap')}</Link>
              <span className="hidden min-[400px]:block"><LinkButton to="/register" size="sm" variant="dark" className="group gap-1.5">{t('Ücretsiz başla')} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></LinkButton></span>
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
              <Link to="/" onClick={onClose} aria-label={`${BRAND} ana sayfa`}><Logo /></Link>
              <button onClick={onClose} aria-label="Menüyü kapat" className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm">
                <X className="size-5" />
              </button>
            </div>
          </div>

          <nav aria-label="Ana menü" className="mx-auto w-full max-w-2xl flex-1 px-6 pt-6 sm:px-10">
            <ul>
              {MOBILE_LINKS.map((l, i) => (
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
              <span className="text-sm font-extrabold text-ink-soft">Dil / Language</span>
              <LangSelect />
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

/** A hairline reading-progress bar, one solid brand colour, no gradient. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const width = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-flame" style={{ scaleX: width }} />
}

/**
 * Social accounts. Left empty on purpose, fill in the school's real handles and
 * the row appears; an empty list keeps the footer free of dead links.
 */
/** Brand marks drawn inline (lucide dropped brand icons). */
const SOCIAL_ICON: Record<string, (p: { className?: string }) => React.JSX.Element> = {
  instagram: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>,
  youtube: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.4-1.2.4-3.8.4-3.8s0-2.6-.4-3.8zM10 15V9l5.2 3z" /></svg>,
  tiktok: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M16.6 3c.3 2.1 1.6 3.6 3.9 3.8v3a7 7 0 0 1-3.9-1.2v6.1A5.7 5.7 0 1 1 11 9v3.1a2.6 2.6 0 1 0 2.5 2.6V3z" /></svg>,
  linkedin: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zM9 9h2.9v1.7c.4-.8 1.4-1.9 3.3-1.9 3.5 0 4.1 2.3 4.1 5.3V21h-3v-6c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9z" /></svg>,
  x: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z" /></svg>,
}

const COLS: { title: string; links: [string, string][] }[] = [
  { title: 'Ürün', links: [['/#nasil', 'Nasıl çalışır'], ['/#paketler', 'Paketler'], ['/placement', 'Seviye testi'], ['/okullar', 'Okullar için']] },
  { title: 'Şirket', links: [['/about', 'Hakkımızda'], ['/blog', 'Blog'], ['/contact?konu=partnership', 'İş birliği'], ['/contact', 'İletişim']] },
  { title: 'Destek', links: [['/yardim', 'Yardım merkezi'], ['/contact?konu=support', 'Teknik destek'], ['/contact?konu=course', 'Kurs bilgisi'], ['/okullar', 'Okul paneli']] },
  { title: 'Yasal', links: [['/terms', 'Kullanım koşulları'], ['/privacy', 'Gizlilik ve KVKK'], ['/distance-sales', 'Mesafeli satış'], ['/refund', 'İptal ve iade']] },
]

/** Social accounts, in this order; the addresses come from Yönetim > Site ayarları. */
const SOCIAL_ORDER = ['instagram', 'youtube', 'tiktok', 'linkedin', 'x'] as const
const SOCIAL_NAME: Record<string, string> = { instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X' }

/** App Store and Google Play badges, drawn inline so they stay crisp in light and dark. */
export function StoreBadges({ className }: { className?: string }) {
  const { data } = useSiteConfig()
  const apps = data?.site?.apps ?? {}
  const items = [
    { href: apps.ios, top: "App Store'dan", name: 'İndir', icon: <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" /></svg> },
    { href: apps.android, top: "Google Play'den", name: 'Edinin', icon: <svg viewBox="0 0 24 24" className="size-6" aria-hidden><path d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1z" fill="#2fb8a0" /><path d="m16.7 8.7-3.3 3.3-9.8-9.7c.2-.1.5-.1.8 0z" fill="#22b573" /><path d="m16.7 15.3-12.3 7c-.3.1-.6.1-.8 0l9.8-9.7z" fill="#e8403a" /><path d="M20.4 10.8c.8.5.8 1.9 0 2.4l-3.7 2.1-3.3-3.3 3.3-3.3z" fill="#ffc233" /></svg> },
  ].filter((x) => !!x.href)
  if (!items.length) return null
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {items.map((x) => (
        <a key={x.top} href={x.href!} target="_blank" rel="noreferrer" className="press flex h-12 items-center gap-2.5 rounded-xl bg-ink px-3.5 text-paper shadow-[0_3px_0_rgba(0,0,0,.25)] transition hover:-translate-y-0.5">
          {x.icon}
          <span className="leading-none">
            <span className="block text-[10px] font-semibold opacity-80">{x.top}</span>
            <span className="block font-display text-[15px] font-black">{x.name}</span>
          </span>
        </a>
      ))}
    </div>
  )
}

/** Newsletter: double opt-in on the server, so a typo never subscribes someone else. */
function Newsletter() {
  const [email, setEmail] = useState('')
  const [trap, setTrap] = useState('')
  const sub = useMutation({ mutationFn: () => post<{ message: string }>('/newsletter', { email, source: 'footer', website: trap || undefined }) })
  const err = sub.error as ApiError | null
  return (
    <div id="bulten" className="mt-6 max-w-sm scroll-mt-24">
      <p className="mb-2 text-sm font-extrabold text-ink">Haftada bir İngilizce ipucu</p>
      {sub.isSuccess ? (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl bg-mint/15 px-3 py-3 text-sm font-bold text-mint-deep">
          <Check className="size-4 shrink-0" strokeWidth={3} /> {sub.data?.message ?? 'Onay bağlantısını e-postana gönderdik.'}
        </motion.p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); sub.mutate() }}>
          <div className="flex gap-1.5 rounded-2xl bg-paper-2 p-1 ring-1 ring-line transition focus-within:ring-flame/70">
            <label htmlFor="nl-email" className="sr-only">E-posta adresin</label>
            <input id="nl-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-ink placeholder:text-ink-soft/60 focus:outline-none" />
            <input tabIndex={-1} aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" name="website" />
            <button type="submit" disabled={sub.isPending} aria-label="Abone ol" className="press grid h-10 shrink-0 place-items-center rounded-xl bg-flame px-4 text-white disabled:opacity-60">
              {sub.isPending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ArrowRight className="size-4" />}
            </button>
          </div>
          <p className={clsx('mt-1.5 px-1 text-[11px]', err ? 'font-bold text-berry' : 'text-ink-soft')}>{err ? err.first() : <>Sıfır spam, tek tıkla çık. <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">Gizlilik</Link></>}</p>
        </form>
      )}
    </div>
  )
}

/**
 * A corporate footer: brand, contact and newsletter, four short link columns, the
 * big "dilgo" wordmark rising as the page ends, then a thin legal bar.
 */
function Footer() {
  const { data } = useSiteConfig()
  const email = data?.site?.contact?.email ?? data?.support_email ?? SUPPORT_EMAIL
  // Social links are filled in from the admin panel (Yönetim > Site ayarları).
  const social = (data?.site?.social ?? {}) as Record<string, string | null>
  const SOCIAL = SOCIAL_ORDER.filter((k) => !!social[k]).map((k) => ({ label: SOCIAL_NAME[k], href: social[k] as string, icon: SOCIAL_ICON[k] }))
  // The big wordmark waits below the legal bar and only rises once you reach the very end.
  const ref = useRef<HTMLDivElement>(null)
  const atEnd = useInView(ref, { amount: 0.75 })

  return (
    <footer className="relative overflow-hidden border-t border-line bg-card text-ink">
      <span aria-hidden className="absolute inset-x-0 top-0 mx-auto h-[3px] max-w-3xl bg-gradient-to-r from-transparent via-flame to-transparent" />
      <div className="relative mx-auto max-w-6xl px-5 pt-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.9fr]">
          <div>
            <Link to="/" aria-label={`${BRAND} ana sayfa`} className="inline-flex items-center gap-2">
              <img src={higoImg('wave')} alt="" className="size-9" />
              <span className="font-display text-2xl font-black tracking-tight">dil<span className="text-flame">go</span></span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">Bayrak Dil Okulları’nın İngilizce platformu. İlkokuldan üniversiteye; bireyler, aileler ve okullar için.</p>
            <a href={`mailto:${email}`} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-ink-soft transition hover:text-ink"><Mail className="size-4 text-flame" />{email}</a>
            <Newsletter />
            <StoreBadges className="mt-6" />
          </div>

          <nav aria-label="Alt bilgi" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-ink-soft">{c.title}</p>
                <ul className="space-y-2">
                  {c.links.map(([to, l]) => (
                    <li key={to + l}><Link to={to} className="text-[14px] font-semibold text-ink/75 transition hover:text-flame">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-3 border-t border-line py-5 text-[13px] font-semibold text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} Bayrak Dil Okulları · Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {SOCIAL.length > 0 && (
              <div className="flex gap-0.5">
                {SOCIAL.map((s) => (
                  <a key={s.label} href={s.href} aria-label={s.label} title={s.label} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-xl transition hover:bg-paper-2 hover:text-ink">
                    <s.icon className="size-[18px]" />
                  </a>
                ))}
              </div>
            )}
            <Link to="/privacy" className="hover:text-ink">Gizlilik</Link>
            <Link to="/cookies" className="hover:text-ink">Çerezler</Link>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1 font-bold hover:text-ink">Başa dön <ArrowUp className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {/* the closing wordmark: hidden while you read the links, it rises as the page ends */}
      <div ref={ref} className="safe-bottom relative mx-auto flex h-[clamp(8rem,21vw,16.5rem)] max-w-6xl select-none items-end justify-center gap-3 overflow-x-clip px-5 pb-3" aria-hidden>
        <motion.p initial={false} animate={atEnd ? { y: '0%', opacity: 1 } : { y: '70%', opacity: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} style={{ backgroundImage: 'linear-gradient(180deg, var(--ink) 0%, color-mix(in oklab, var(--ink) 25%, transparent) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }} className="px-[0.06em] pb-[0.12em] font-display text-[clamp(4.5rem,17vw,13rem)] font-black leading-[1.05] tracking-[-0.035em]">
          {WORDMARK.join('')}
        </motion.p>
        <motion.img initial={false} animate={atEnd ? { y: '0%', rotate: 0 } : { y: '130%', rotate: -20 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: atEnd ? 0.2 : 0 }} src={higoImg('wave')} alt="" className="mb-[2%] w-[clamp(44px,7vw,84px)] shrink-0" />
      </div>
    </footer>
  )
}
