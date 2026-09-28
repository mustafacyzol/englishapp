import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, X } from 'lucide-react'
import clsx from 'clsx'
import { patch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { TUTOR } from '@/lib/tutor'
import { examName, examOn } from '@/lib/onboarding'
import { Img } from '@/components/ui/Img'

interface Mark {
  /** data-tour value(s) to spotlight, first visible one wins */
  targets: string[]
  title: string
  text: string
}

const PAD = 8

/**
 * First-run guide as coach marks: the screen dims, a spotlight cuts out the real
 * control, and Defne explains it in one line beside it. It points at what is
 * actually on screen (sidebar on desktop, tab bar on phones) and remembers on the
 * account that it has been seen.
 */
export function CoachMarks() {
  const { user, setUser } = useAuth()
  const loc = useLocation()
  const [i, setI] = useState(0)
  const [ready, setReady] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [closed, setClosed] = useState(false)
  const active = !!user && !user.preferences?.tour_done && !closed && loc.pathname === '/learn'

  const marks = useMemo<Mark[]>(() => {
    if (!user) return []
    const first = user.name.split(' ')[0]
    const exam = examOn(user) ? examName(user.exam_target) ?? 'Sınav' : undefined
    return [
      { targets: ['here', 'path'], title: `Merhaba ${first}, burası senin yolun`, text: '“Buradasın” işareti kaldığın durağı gösterir. Dokun, dersi başlat. Her ünitenin sonunda bir kupa var.' },
      { targets: ['stats'], title: 'Serin, elmasın, canların', text: 'Her gün biraz çalış, alev büyüsün. Elmaslarla mağazadan dondurucu ve sandık alırsın.' },
      { targets: ['practice', 'tab-practice'], title: 'Kelime pratiği', text: 'Kaydırmalı kartlar ve hızlı oyunlarla kelimeleri unutmadan tekrar et. Sağa bildim, sola bilmedim.' },
      ...(exam ? [{ targets: ['exam', 'more'], title: `${exam} hazırlığın burada`, text: `${exam} formatında sorular, Türkçe çözümler ve zayıf bölümüne göre öneri. Defne de sınavına göre konuşur.` }] : []),
      { targets: ['ai', 'more'], title: `${TUTOR.name} ile konuş`, text: 'Sesli arama, rol oyunları ve yazı düzeltme. Hata yapmaktan korkma, ben buradayım.' },
      { targets: ['arena', 'tab-arena'], title: 'Arena: Gölge Düellosu', text: '12 saniyelik blitz sorular, seri çarpanı ve rakibinin gölgesi. Kupaları topla, ligde yüksel.' },
      { targets: ['rewards', 'tab-rewards'], title: 'Ödüllerin tek yerde', text: 'Kasandaki kartlar, günlük görevler ve mağaza. Gizemli sandıktan iş ortaklarımızın hediyeleri bile çıkabilir.' },
    ]
  }, [user])

  const find = useCallback((m?: Mark) => {
    if (!m) return null
    for (const t of m.targets) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`))) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el
      }
    }
    return null
  }, [])

  // Give the page a moment to lay out before the first mark.
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(t)
  }, [active])

  const measure = useCallback(() => {
    const el = find(marks[i])
    setRect(el ? el.getBoundingClientRect() : null)
  }, [find, marks, i])

  useLayoutEffect(() => {
    if (!active || !ready) return
    const el = find(marks[i])
    if (!el) {
      // Nothing to point at on this screen size: move on.
      if (i < marks.length - 1) setI(i + 1)
      else setRect(null)
      return
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const t = setTimeout(measure, 280)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, ready, i, marks, find, measure])

  const finish = useCallback(() => {
    setClosed(true)
    if (!user) return
    setUser({ ...user, preferences: { ...user.preferences, tour_done: true } })
    patch('/account', { preferences: { tour_done: true } }).catch(() => {})
  }, [user, setUser])

  const next = useCallback(() => {
    if (i >= marks.length - 1) finish()
    else setI(i + 1)
  }, [i, marks.length, finish])

  useEffect(() => {
    if (!active || !ready) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [active, ready, next, finish])

  if (!active || !ready || !rect) return null
  const m = marks[i]
  const vw = window.innerWidth
  const vh = window.innerHeight
  const hole = { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 }
  // Place the card where there is most room: right of a sidebar item, above a bottom bar, else below.
  const CARD_W = Math.min(340, vw - 24)
  let place: 'right' | 'above' | 'below' = 'below'
  if (rect.right + CARD_W + 24 < vw && rect.width < vw / 3) place = 'right'
  else if (rect.top > vh * 0.55) place = 'above'
  const cardStyle: React.CSSProperties =
    place === 'right'
      ? { left: rect.right + PAD + 16, top: Math.min(Math.max(12, rect.top + rect.height / 2 - 90), vh - 240), width: CARD_W }
      : place === 'above'
        ? { left: Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12), bottom: vh - rect.top + PAD + 16, width: CARD_W }
        : { left: Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12), top: rect.bottom + PAD + 16, width: CARD_W }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Uygulama rehberi">
      {/* dim layer with a rounded spotlight hole */}
      <svg className="absolute inset-0 size-full" onClick={next} aria-hidden>
        <defs>
          <mask id="coach-hole">
            <rect width="100%" height="100%" fill="#fff" />
            <motion.rect initial={false} animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} rx="16" fill="#000" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(10,12,18,.62)" mask="url(#coach-hole)" />
      </svg>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute rounded-2xl"
        initial={false}
        animate={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: ['0 0 0 3px #ffc233, 0 0 0 0 rgba(255,194,51,.5)', '0 0 0 3px #ffc233, 0 0 0 10px rgba(255,194,51,0)'] }}
        transition={{ type: 'spring', stiffness: 260, damping: 30, boxShadow: { repeat: Infinity, duration: 1.4, ease: 'easeOut' } }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: place === 'above' ? 8 : -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="absolute rounded-3xl border-2 border-line bg-card p-4 text-ink shadow-soft"
          style={cardStyle}
        >
          <div className="flex items-start gap-3">
            <Img src={TUTOR.avatar} alt="" className="size-11 shrink-0 rounded-full bg-sage/15 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-black leading-tight">{m.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.text}</p>
            </div>
            <button onClick={finish} aria-label="Rehberi kapat" className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-2"><X className="size-4" /></button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1">
              {marks.map((_, k) => <span key={k} className={clsx('h-1.5 rounded-full transition-all', k === i ? 'w-5 bg-flame' : k < i ? 'w-1.5 bg-flame/40' : 'w-1.5 bg-line')} />)}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={finish} className="rounded-xl px-3 py-2 text-sm font-bold text-ink-soft hover:text-ink">Geç</button>
              <button onClick={next} className="press flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-sm font-extrabold text-paper">
                {i === marks.length - 1 ? 'Başlayalım' : 'İleri'} <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
