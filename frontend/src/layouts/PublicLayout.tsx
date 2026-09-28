import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'motion/react'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowRight, ArrowUp, ArrowUpRight, Check, Clock, Mail, Menu, Smartphone, X } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { higoImg } from '@/components/game/Higo'
import { useAuth } from '@/lib/auth'
import { Logo } from '@/components/game/Logo'
import { LangSelect } from '@/components/ui/LangSelect'
import { useLang } from '@/lib/i18n'
import { useSiteConfig } from '@/lib/site'
import { LinkButton } from '@/components/ui/Button'
import { PageTransition } from '@/components/motion/Page'

/** Primary sections, the full row shows from lg; below that everything lives in the sheet. */
const LINKS = [
  { to: '/#nasil', label: 'Nasıl çalışır' },
  { to: '/#kimler-icin', label: 'Kimler için' },
  { to: '/#dene', label: 'Dene' },
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
 * the page scrolls, so it never covers content with a heavy slab.
 */
function SiteHeader({ onMenu }: { onMenu: () => void }) {
  const { t } = useLang()
  const { user } = useAuth()
  const isActive = useIsActive()
  const [scrolled, setScrolled] = useState(false)
  const [hover, setHover] = useState<string | null>(null)

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
          'mx-auto flex h-16 items-center gap-3 rounded-full pl-4 pr-2 transition-all duration-300 sm:pl-5',
          scrolled ? 'max-w-5xl border border-line bg-card/85 shadow-[0_10px_40px_-12px_rgba(31,36,51,.25)] backdrop-blur-xl' : 'max-w-6xl border border-transparent',
        )}
      >
        <Link to="/" aria-label="DilGO ana sayfa" className="shrink-0"><Logo /></Link>

        <nav aria-label="Ana menü" className="mx-auto hidden items-center xl:flex" onMouseLeave={() => setHover(null)}>
          {LINKS.map((l) => {
            const active = isActive(l.to)
            return (
              <Link key={l.to} to={l.to} onMouseEnter={() => setHover(l.to)} className={clsx('relative whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-bold transition-colors', active || hover === l.to ? 'text-ink' : 'text-ink-soft')}>
                {hover === l.to && <motion.span layoutId="nav-hover" transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-full bg-paper-2" />}
                <span className="relative">{t(l.label)}</span>
                {active && <motion.span layoutId="nav-dot" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-flame" />}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:ml-0">
          <LangSelect className="hidden sm:block" />
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
            className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm xl:hidden"
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
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card xl:hidden"
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
  {
    title: 'Uygulama',
    links: [
      ['/register', 'Ücretsiz başla'],
      ['/placement', 'Seviye testi'],
      ['/#nasil', 'Nasıl çalışır'],
      ['/#dene', 'Kaydolmadan dene'],
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

/** Newsletter: double opt-in on the server, so a typo never subscribes someone else. */
function Newsletter() {
  const [email, setEmail] = useState('')
  const [trap, setTrap] = useState('')
  const sub = useMutation({ mutationFn: () => post<{ message: string }>('/newsletter', { email, source: 'footer', website: trap || undefined }) })
  const err = sub.error as ApiError | null
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1d2334] to-[#141926] p-6 ring-1 ring-white/10 sm:p-10">
      <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-flame/25 blur-3xl" />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_1.2fr]">
        <img src={higoImg('read')} alt="" className="hidden w-28 drop-shadow-[0_18px_20px_rgba(0,0,0,.35)] md:block" />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-butter">Bülten</p>
          <h3 className="mt-2 font-display text-2xl font-black leading-tight text-white sm:text-3xl">Haftada bir ipucu, sıfır spam.</h3>
          <p className="mt-2 text-sm text-white/65">İngilizce ipuçları, yeni hikâyeler ve DilGO yenilikleri. İstediğin an tek tıkla çık.</p>
        </div>
        {sub.isSuccess ? (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-mint/15 px-4 py-4 font-bold text-mint">
            <Check className="size-5 shrink-0" strokeWidth={3} /> {sub.data?.message ?? 'Onay bağlantısını e-postana gönderdik.'}
          </motion.p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); sub.mutate() }} className="w-full">
            <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.06] p-1.5 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-flame/70 sm:flex-row">
              <label htmlFor="nl-email" className="sr-only">E-posta adresin</label>
              <input id="nl-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className="h-12 min-w-0 flex-1 bg-transparent px-4 text-[15px] font-semibold text-white placeholder:text-white/40 focus:outline-none" />
              <input tabIndex={-1} aria-hidden value={trap} onChange={(e) => setTrap(e.target.value)} className="hidden" name="website" />
              <button type="submit" disabled={sub.isPending} className="press flex h-12 items-center justify-center gap-2 rounded-xl bg-flame px-5 font-extrabold text-white disabled:opacity-60">
                {sub.isPending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <>Abone ol <ArrowRight className="size-4" /></>}
              </button>
            </div>
            <p className={clsx('mt-2 px-1 text-xs', err ? 'font-bold text-berry' : 'text-white/45')}>{err ? err.first() : <>Abone olarak <Link to="/privacy" className="underline underline-offset-2 hover:text-white">Gizlilik Politikası</Link>’nı kabul etmiş olursun.</>}</p>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * Corporate, dark footer: the newsletter card, the brand and contact block, four
 * link columns, and a giant wordmark that rises into view as the page ends.
 */
function Footer() {
  const { data } = useSiteConfig()
  const email = data?.site?.contact?.email ?? data?.support_email ?? 'destek@dilgo.app'
  // Social links are filled in from the admin panel (Yönetim > Site ayarları).
  const SOCIAL = Object.entries(data?.site?.social ?? {}).filter(([, href]) => !!href).map(([k, href]) => ({ label: k, href: href as string, icon: SOCIAL_ICON[k] }))
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const wordY = useTransform(scrollYProgress, [0, 1], ['45%', '0%'])
  const wordO = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0.4, 1])

  return (
    <footer className="relative overflow-hidden bg-[#0e1119] text-white">
      <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pt-16">
        <Newsletter />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Link to="/" aria-label="DilGO ana sayfa" className="font-display text-3xl font-black tracking-tight">dil<span className="text-flame">go</span></Link>
            <p className="mt-4 max-w-sm leading-relaxed text-white/60">
              Bayrak Dil Okulları’nın İngilizce uygulaması. Oku, dinle, konuş, yaz; her gün birkaç dakika, gerçek öğretmen desteğiyle.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm font-semibold text-white/70">
              <li className="flex items-center gap-2.5"><Mail className="size-4 text-flame" /><a href={`mailto:${email}`} className="hover:text-white">{email}</a></li>
              <li className="flex items-center gap-2.5"><Clock className="size-4 text-butter" /> Hafta içi 09:00-19:00</li>
              <li className="flex items-center gap-2.5"><Smartphone className="size-4 text-mint" /> Web, iOS ve Android</li>
            </ul>
            {SOCIAL.length > 0 && (
              <div className="mt-6 flex gap-2">
                {SOCIAL.map((s) => (
                  <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 transition hover:bg-flame hover:ring-flame">
                    <s.icon className="size-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-white/40">{c.title}</p>
                <ul className="space-y-2.5">
                  {c.links.map(([to, l]) => (
                    <li key={to + l}>
                      <Link to={to} className="group inline-flex items-center gap-1 text-[15px] font-semibold text-white/75 transition hover:text-white">
                        {l}<ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* the closing wordmark */}
      <div ref={ref} className="relative mt-10 select-none overflow-hidden" aria-hidden>
        <motion.p style={{ y: wordY, opacity: wordO, backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.22) 10%, rgba(255,255,255,0) 95%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }} className="text-center font-display text-[25vw] font-black leading-[0.8] tracking-[-0.05em] lg:text-[20rem]">
          dilgo
        </motion.p>
        <img src={higoImg('wave')} alt="" className="absolute bottom-[8%] left-1/2 w-[14vw] max-w-[150px] translate-x-[140%] drop-shadow-[0_20px_20px_rgba(0,0,0,.4)]" />
      </div>

      <div className="safe-bottom relative border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 text-sm font-semibold text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Bayrak Dil Okulları · Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-white">Gizlilik</Link>
            <Link to="/cookies" className="hover:text-white">Çerezler</Link>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1.5 font-bold hover:text-white">Başa dön <ArrowUp className="size-4" /></button>
          </div>
        </div>
      </div>
    </footer>
  )
}
