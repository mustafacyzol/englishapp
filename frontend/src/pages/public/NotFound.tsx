import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BookOpen, Compass, GraduationCap, Home, LifeBuoy, Volume2 } from 'lucide-react'
import { higoImg } from '@/components/game/Higo'
import { useAuth } from '@/lib/auth'
import { useSeo } from '@/lib/seo'
import { speak } from '@/lib/speech'

const WORDS = [
  { en: 'lost', tr: 'kayıp', ex: "I'm lost. Can you help me?", exTr: 'Kayboldum. Yardım eder misin?' },
  { en: 'the way back', tr: 'dönüş yolu', ex: 'Higo knows the way back.', exTr: 'Higo dönüş yolunu biliyor.' },
  { en: 'missing', tr: 'eksik, kayıp', ex: 'This page is missing.', exTr: 'Bu sayfa kayıp.' },
]

/**
 * A lost page turned into a small lesson: Higo with his map between the two
 * fours, a word of the moment you can listen to, and the places people
 * usually meant to go.
 */
export default function NotFound() {
  useSeo({ title: 'Sayfa bulunamadı', noindex: true })
  const { pathname } = useLocation()
  const { user } = useAuth()
  const still = useReducedMotion()
  const [w] = useState(() => WORDS[[...pathname].reduce((a, c) => a + c.charCodeAt(0), 0) % WORDS.length])
  const links = user
    ? [{ to: '/learn', label: 'Yol haritam', icon: Compass }, { to: '/stories', label: 'Hikâyeler', icon: BookOpen }, { to: '/exam', label: 'Sınav modu', icon: GraduationCap }, { to: '/yardim', label: 'Yardım', icon: LifeBuoy }]
    : [{ to: '/', label: 'Ana sayfa', icon: Home }, { to: '/placement', label: 'Seviye testi', icon: GraduationCap }, { to: '/blog', label: 'Blog', icon: BookOpen }, { to: '/yardim', label: 'Yardım', icon: LifeBuoy }]

  return (
    <section className="relative mx-auto flex min-h-[78dvh] max-w-3xl flex-col items-center justify-center px-5 py-14 text-center">
      {/* faint dotted route behind everything */}
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-64 w-full max-w-2xl text-line" viewBox="0 0 600 240" fill="none">
        <motion.path d="M20 200 C 120 40, 220 220, 300 120 S 480 20, 580 90" stroke="currentColor" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
      </svg>

      <div className="relative flex items-center justify-center gap-1 sm:gap-3">
        <motion.span initial={{ opacity: 0, x: -30, rotate: -8 }} animate={{ opacity: 1, x: 0, rotate: -6 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="font-display text-[clamp(6rem,24vw,12rem)] font-black leading-none tracking-tighter text-flame">4</motion.span>
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 13, delay: 0.15 }} className="relative grid size-[clamp(7rem,26vw,12.5rem)] place-items-center rounded-full bg-gradient-to-br from-butter/50 to-flame/20 ring-8 ring-card">
          <motion.img
            src={higoImg('map')}
            alt="Higo haritaya bakıyor"
            className="w-[86%] object-contain drop-shadow-lg"
            animate={still ? undefined : { rotate: [0, -4, 4, 0], y: [0, -4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }} className="absolute -right-4 -top-2 rounded-2xl rounded-bl-md bg-ink px-3 py-1.5 text-xs font-black text-paper shadow-lg sm:text-sm">Hmm, burası neresi?</motion.span>
        </motion.div>
        <motion.span initial={{ opacity: 0, x: 30, rotate: 8 }} animate={{ opacity: 1, x: 0, rotate: 6 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="font-display text-[clamp(6rem,24vw,12rem)] font-black leading-none tracking-tighter text-flame">4</motion.span>
      </div>

      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 font-display text-3xl font-black sm:text-4xl">Bu sayfa kaybolmuş</motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mt-2 max-w-md text-ink-soft">Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Merak etme, Higo haritayı açtı bile.</motion.p>

      {/* turn the dead end into a word */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-7 w-full max-w-md rounded-3xl border-2 border-line bg-card p-4 text-left shadow-soft">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-soft">Kaybolmuşken bir kelime öğren</p>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={() => speak(`${w.en}. ${w.ex}`)} aria-label="Dinle" className="press grid size-11 shrink-0 place-items-center rounded-2xl bg-sky text-white shadow-[0_3px_0_0_rgba(0,0,0,.18)]"><Volume2 className="size-5" /></button>
          <div className="min-w-0">
            <p className="font-display text-xl font-black leading-tight">{w.en} <span className="text-base font-bold text-ink-soft">= {w.tr}</span></p>
            <p className="text-sm text-ink-soft"><span className="font-semibold text-ink">{w.ex}</span> {w.exTr}</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6 grid w-full max-w-md grid-cols-3 gap-2">
        {links.map((l, i) => (
          <Link key={l.to} to={l.to} className={i === 0 ? 'press col-span-3 flex h-13 items-center justify-center gap-2 rounded-2xl bg-flame py-3.5 font-display font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_var(--color-flame-deep)]' : 'flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-card px-2 py-2.5 text-[13px] font-extrabold sm:flex-row sm:gap-2 sm:text-sm transition hover:border-ink/25'}>
            <l.icon className="size-4" /> {l.label} {i === 0 && <ArrowRight className="size-4" />}
          </Link>
        ))}
      </motion.div>
      <p className="mt-5 text-xs text-ink-soft">Bir bağlantı seni buraya getirdiyse <Link to="/contact?konu=support" className="font-bold text-ink underline underline-offset-2">bize haber ver</Link>, düzeltelim.</p>
    </section>
  )
}
