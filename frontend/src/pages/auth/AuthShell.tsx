import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Star } from 'lucide-react'
import { get } from '@/lib/api'
import { PHOTO } from '@/lib/assets'
import { Logo } from '@/components/game/Logo'
import { Img } from '@/components/ui/Img'
import { ThemeButton } from '@/components/ui/ThemeToggle'
import type { Review } from '../public/Landing'

export interface Slide { src: string; caption: string }

/** Real moments of learning — each photo carries a short, honest caption of what it shows. */
export const LOGIN_SLIDES: Slide[] = [
  { src: PHOTO.auth, caption: 'Sabah kahvesiyle beş dakikalık ders' },
  { src: PHOTO.listen, caption: 'Vapurda bir hikâye dinlemek' },
  { src: PHOTO.classroom, caption: 'Bayrak Dil Okulları sınıflarında pratik' },
  { src: PHOTO.speak, caption: 'Kafede Defne ile konuşma provası' },
]
export const REGISTER_SLIDES: Slide[] = [
  { src: PHOTO.hero, caption: 'Kendi temponda, kendi köşende' },
  { src: PHOTO.read, caption: 'Çay molasında seviyene göre okuma' },
  { src: PHOTO.write, caption: 'Yazdığını Defne ile düzeltmek' },
  { src: PHOTO.reception, caption: 'Şubelerimizde canlı ders kuponunu kullan' },
]

const DURATION = 6500

/**
 * The photo side of the auth pages: full-bleed photographs that crossfade with a
 * slow push-in, story-style progress bars, and a single quiet quote card.
 */
function Showcase({ slides }: { slides: Slide[] }) {
  const { data } = useQuery({ queryKey: ['landing'], queryFn: () => get<{ testimonials?: Review[] }>('/landing'), staleTime: 600_000 })
  const reviews = data?.testimonials ?? []
  const [i, setI] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), DURATION)
    return () => clearTimeout(t)
  }, [i, reduced, slides.length])

  const s = slides[i]
  const r = reviews.length ? reviews[i % reviews.length] : null

  return (
    <aside className="relative hidden overflow-hidden bg-[#10131a] lg:block">
      <AnimatePresence initial={false}>
        <motion.div key={s.src} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: 'easeInOut' }}>
          <motion.div className="size-full" initial={{ scale: reduced ? 1 : 1.08 }} animate={{ scale: 1 }} transition={{ duration: DURATION / 1000 + 1.2, ease: 'linear' }}>
            <Img src={s.src} alt="" className="photo" />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/80" />

      {/* story-style progress */}
      <div className="absolute inset-x-10 top-8 z-10 flex gap-1.5">
        {slides.map((x, k) => (
          <button key={x.src} onClick={() => setI(k)} aria-label={`${k + 1}. fotoğraf`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            {k < i && <span className="block h-full w-full bg-white" />}
            {k === i && <motion.span key={i} className="block h-full bg-white" initial={{ width: reduced ? '100%' : '0%' }} animate={{ width: '100%' }} transition={{ duration: DURATION / 1000, ease: 'linear' }} />}
          </button>
        ))}
      </div>
      <Link to="/" className="absolute left-10 top-14 z-10 rounded-2xl bg-white/95 px-4 py-2 text-[#1f2433] shadow-soft"><Logo small /></Link>

      <div className="absolute inset-x-10 bottom-10 z-10 text-white">
        <AnimatePresence mode="wait">
          <motion.p key={s.caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-white/75">
            {s.caption}
          </motion.p>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {r && (
            <motion.figure key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="max-w-lg">
              <div className="mb-3 flex gap-0.5">{[...Array(r.rating || 5)].map((_, k) => <Star key={k} className="size-4 fill-butter text-butter" />)}</div>
              <blockquote className="font-read text-[22px] leading-snug xl:text-[26px]">“{r.quote}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3 text-sm">
                <span className="grid size-9 place-items-center rounded-full bg-white/15 font-display font-black backdrop-blur">{r.name[0]}</span>
                <span><b className="block">{r.name}</b><span className="text-white/70">{r.role}</span></span>
              </figcaption>
            </motion.figure>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

/** On phones the photos become a slim rotating banner above the form. */
function MobileBanner({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), DURATION)
    return () => clearInterval(t)
  }, [reduced, slides.length])
  return (
    <div className="relative mb-7 h-36 overflow-hidden rounded-3xl bg-paper-2 sm:h-44 lg:hidden">
      <AnimatePresence initial={false}>
        <motion.div key={slides[i].src} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
          <Img src={slides[i].src} alt="" className="photo" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <p className="absolute inset-x-4 bottom-3 text-xs font-black uppercase tracking-[0.14em] text-white">{slides[i].caption}</p>
    </div>
  )
}

export function AuthShell({ title, subtitle, children, footer, wide, slides = LOGIN_SLIDES, aside, banner = true, lead }: { lead?: ReactNode; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; slides?: Slide[]; aside?: ReactNode; banner?: boolean }) {
  return (
    <div className="grid min-h-dvh bg-card lg:h-dvh lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.1fr_1fr]">
      {aside ?? <Showcase slides={slides} />}
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible"><Logo small /></Link>
          <ThemeButton />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className={`mx-auto my-auto w-full py-8 ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          {banner && <MobileBanner slides={slides} />}
          {lead}
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center font-semibold text-ink-soft">{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}
