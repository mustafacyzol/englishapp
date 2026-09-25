import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Quote, Star } from 'lucide-react'
import { get } from '@/lib/api'
import { rewardImg } from '@/lib/assets'
import { Logo } from '@/components/game/Logo'
import { Img } from '@/components/ui/Img'
import { ThemeButton } from '@/components/ui/ThemeToggle'
import type { Review } from '../public/Landing'

/** Drifting highlight chips + a rotating student quote — the login side feels alive,
 *  and a newcomer sees real outcomes before they even sign in. */
function Showcase() {
  const { data } = useQuery({ queryKey: ['landing'], queryFn: () => get<{ testimonials?: Review[] }>('/landing'), staleTime: 600_000 })
  const reviews = data?.testimonials ?? []
  const [i, setI] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || reviews.length < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % reviews.length), 5000)
    return () => clearInterval(t)
  }, [reviews.length, reduced])

  const r = reviews[i]
  const bubbles = [
    { t: '🔥 97 gün seri', c: 'text-flame', pos: 'left-8 top-28', d: 0 },
    { t: '⭐ Elmas Lig', c: 'text-butter-deep', pos: 'right-10 top-40', d: 0.6 },
    { t: '💬 Ada ile mülakat', c: 'text-sky', pos: 'left-12 top-[46%]', d: 1.2 },
    { t: '✅ B2 seviye', c: 'text-mint-deep', pos: 'right-8 top-[54%]', d: 1.8 },
  ]

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-flame/12 via-paper to-sky/12 lg:block">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--line)_1.4px,transparent_1.4px)] [background-size:26px_26px]" />
      <span className="glow left-[-15%] top-[-10%] size-[420px] bg-flame/20" />
      <span className="glow bottom-[-12%] right-[-10%] size-[380px] bg-sky/16" />

      <Link to="/" className="absolute left-10 top-10 z-10 rounded-2xl bg-card/90 px-4 py-2 shadow-hard-sm backdrop-blur"><Logo small /></Link>

      {/* drifting bubbles */}
      {!reduced &&
        bubbles.map((b) => (
          <motion.span
            key={b.t}
            className={`absolute ${b.pos} rounded-full border-2 border-line bg-card/95 px-3.5 py-2 text-sm font-extrabold shadow-soft backdrop-blur ${b.c}`}
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 5, delay: b.d, ease: 'easeInOut' }}
          >
            {b.t}
          </motion.span>
        ))}

      {/* rotating quote */}
      <div className="absolute inset-x-10 bottom-10">
        <AnimatePresence mode="wait">
          {r && (
            <motion.figure
              key={r.id}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl bg-card/95 p-6 shadow-soft backdrop-blur"
            >
              <Quote className="mb-2 size-7 text-flame/30" />
              <blockquote className="font-display text-lg font-extrabold leading-snug">“{r.quote}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky font-display font-black text-white">{r.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{r.name}</span>
                  <span className="block truncate text-sm text-ink-soft">{r.role}</span>
                </span>
                {!!r.streak && (
                  <span className="ink-chip shrink-0 py-0.5 text-xs">
                    <Img src={rewardImg('flame')} alt="" className="size-4" /> {r.streak}g
                  </span>
                )}
              </figcaption>
              {reviews.length > 1 && (
                <div className="mt-4 flex gap-1.5">
                  {reviews.map((x, k) => (
                    <button key={x.id} onClick={() => setI(k)} aria-label={`${k + 1}. yorum`} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-flame' : 'w-1.5 bg-line'}`} />
                  ))}
                </div>
              )}
            </motion.figure>
          )}
        </AnimatePresence>
        {!r && (
          <div className="flex items-center gap-1 rounded-3xl bg-card/95 p-6 shadow-soft backdrop-blur">
            {[...Array(5)].map((_, k) => <Star key={k} className="size-5 fill-butter text-butter" />)}
            <span className="ml-2 font-extrabold">Öğrencilerimiz DilGO’yu seviyor.</span>
          </div>
        )}
      </div>
    </aside>
  )
}

export function AuthShell({ title, subtitle, children, footer, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[1.05fr_1fr]">
      <Showcase />
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden"><Logo small /></Link>
          <span className="hidden lg:block" />
          <ThemeButton />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`mx-auto my-auto w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}>
          <h1 className="text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center font-semibold text-ink-soft">{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}
