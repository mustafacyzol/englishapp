import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Plane } from 'lucide-react'
import type { Cefr, SkillKey } from '@/lib/types'
import { PHOTO } from '@/lib/assets'
import { SKILL } from '@/lib/skills'
import { EXAMS, INTERESTS, MOTIVATIONS, PACES, STUDY_TIMES } from '@/lib/onboarding'
import { Img } from '@/components/ui/Img'

const NEXT: Record<string, string> = {
  A1: 'A2',
  A2: 'B1',
  B1: 'B2',
  B2: 'C1',
  C1: 'C2',
  C2: 'C2',
}
const ORDER = ['name', 'age', 'goal', 'exam', 'interests', 'focus', 'level', 'time', 'account']

/** A value that flips in like a split-flap board whenever it changes. */
function Flap({ value, className, empty = '···' }: { value?: ReactNode; className?: string; empty?: string }) {
  const k = typeof value === 'string' || typeof value === 'number' ? String(value) : value ? 'node' : ''
  return (
    <span className={clsx('relative inline-block [perspective:400px]', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={k} className="inline-block origin-center" initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ rotateX: 90, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          {value || <span className="text-ink-soft/50">{empty}</span>}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}


/** Deterministic barcode from the passenger's name, so it changes as they type. */
function Barcode({ seed, className }: { seed: string; className?: string }) {
  const bars = useMemo(() => {
    let h = 2166136261
    for (const c of seed || 'dilgo') h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    return Array.from({ length: 34 }, (_, i) => {
      h = Math.imul(h ^ (h >>> 13), 1274126177) + i
      return 1 + (Math.abs(h) % 3)
    })
  }, [seed])
  return (
    <span aria-hidden className={clsx('flex h-12 items-stretch gap-[2px]', className)}>
      {bars.map((w, i) => (
        <span key={i} className="bg-ink" style={{ width: w }} />
      ))}
    </span>
  )
}

interface PassProps {
  name: string
  age?: string
  mot?: (typeof MOTIVATIONS)[number]
  exam?: (typeof EXAMS)[number]
  interests: string[]
  focus: SkillKey | null
  level: Cefr
  slot?: (typeof STUDY_TIMES)[number]
  pace: (typeof PACES)[number]
  weeks: number
  step: string
}

export const AGE_LABEL: Record<string, string> = { kid: 'Çocuk · 7-12', teen: 'Genç · 13-17', adult: 'Yetişkin · 18+' }

/** An empty field is a quiet placeholder bar, never text that looks like an input. */
function Blank({ w = 'w-16' }: { w?: string }) {
  return <span aria-hidden className={clsx('inline-block h-3 rounded-full bg-paper-2', w)} />
}

function Cell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <div className="mt-1 flex min-h-6 items-center truncate text-[15px] font-extrabold leading-tight">{children}</div>
    </div>
  )
}

/**
 * Sign-up's left side: the learner's plan as a boarding pass for their English
 * journey. Every answer lands on the ticket as it's given. Empty fields are
 * placeholder bars (so nobody tries to type into the picture), the pass tilts
 * gently with the pointer, and it gets stamped when the plan is complete.
 */
export function PassPanel({ name, age, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const at = ORDER.indexOf(step)
  const reached = (s: string) => at > ORDER.indexOf(s)
  const lastInterest = INTERESTS.find((i) => i.key === interests[interests.length - 1])
  const photo = (at >= ORDER.indexOf('time') && slot?.photo) || (at >= ORDER.indexOf('focus') && focus && SKILL[focus].photo) || (at >= ORDER.indexOf('interests') && lastInterest?.photo) || mot?.photo || PHOTO.hero
  const to = exam ? exam.name : reached('level') ? NEXT[level] : ''
  const progress = Math.min(1, at / (ORDER.length - 1))
  const done = step === 'account'
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 120, damping: 14 })
  const sry = useSpring(ry, { stiffness: 120, damping: 14 })
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 8)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 6)
  }

  return (
    <aside className="relative hidden overflow-hidden bg-[#10131a] lg:block" onPointerMove={move} onPointerLeave={() => { rx.set(0); ry.set(0) }}>
      <AnimatePresence initial={false}>
        <motion.div key={photo} className="absolute inset-0" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          <Img src={photo} alt="" className="photo" />
        </motion.div>
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/80" />
      <Link to="/" className="absolute left-10 top-10 z-10 rounded-2xl bg-white/95 px-4 py-2 text-[#1f2433] shadow-soft xl:left-14">
        <span className="font-display text-xl font-black">dil<span className="text-flame">go</span></span>
      </Link>

      <div className="absolute inset-x-8 bottom-10 z-10 [perspective:1200px] xl:inset-x-12">
        <motion.div style={{ rotateX: srx, rotateY: sry }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 110, damping: 16 }} className="flex text-ink drop-shadow-[0_30px_45px_rgba(0,0,0,.5)]">
          {/* main part */}
          <div className="ticket-l relative min-w-0 flex-1 overflow-hidden rounded-l-[26px] bg-card">
            <div className="flex items-center justify-between bg-ink px-6 py-3 text-paper">
              <span className="font-display text-sm font-black tracking-wide">dil<span className="text-flame">go</span><span className="ml-2 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-paper/60">Biniş kartı · Boarding pass</span></span>
              <span className="font-mono text-xs font-bold tracking-widest text-paper/70">DG {level}{to ? `-${to.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()}` : ''}</span>
            </div>
            <div className="px-6 pb-5 pt-4">
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-soft">Bugün</p>
                  <Flap value={reached('level') || level !== 'A1' ? level : ''} className="font-display text-5xl font-black leading-none" empty="··" />
                </div>
                <div className="relative mb-3 flex-1">
                  <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-5 w-full overflow-visible"><path d="M0 18 Q50 -8 100 18" fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /></svg>
                  <motion.span className="absolute -top-2 grid size-7 place-items-center rounded-full bg-flame text-white shadow-soft" initial={false} animate={{ left: `calc(${progress * 100}% - ${progress * 28}px)`, top: `${-8 + Math.abs(progress - 0.5) * 20}px` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }}>
                    <Plane className="size-4 rotate-45" />
                  </motion.span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-soft">{exam ? 'Sınav' : 'Hedef'}</p>
                  <Flap value={to} className="font-display text-5xl font-black leading-none" empty="··" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-x-5 gap-y-3">
                <Cell label="Yolcu" className="col-span-2">
                  {name ? <span className="truncate font-display text-xl font-black uppercase tracking-wide">{name.toLocaleUpperCase('tr')}</span> : <span className="flex items-center gap-2"><Blank w="w-28" /><Blank w="w-14" /></span>}
                </Cell>
                <Cell label="Kabin"><Flap value={age ? AGE_LABEL[age] : undefined} empty="" />{!age && <Blank w="w-20" />}</Cell>
                <Cell label="Amaç" className="col-span-2">{mot ? <Flap value={mot.label} /> : <Blank w="w-40" />}</Cell>
                <Cell label="Kapı">{focus ? <Flap value={<span className={SKILL[focus].text}>{SKILL[focus].label}</span>} /> : <Blank />}</Cell>
              </div>

              <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2 border-t-2 border-dashed border-line pt-3">
                {interests.length ? interests.map((k, i) => (
                  <motion.span key={k} initial={{ scale: 2.2, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: ((i * 37) % 18) - 9 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }} className="rounded-lg border-2 border-sky/70 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-sky">
                    {INTERESTS.find((x) => x.key === k)?.label}
                  </motion.span>
                )) : <><Blank w="w-14" /><Blank w="w-12" /><Blank w="w-16" /></>}
              </div>
            </div>
            <AnimatePresence>
              {done && (
                <motion.span initial={{ scale: 2.6, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 0.9, rotate: -14 }} transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.2 }} className="absolute bottom-5 right-6 rounded-xl border-4 border-mint bg-card/70 px-3 py-1 font-display text-xl font-black tracking-widest text-mint">
                  ONAYLANDI
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* stub, torn along a perforation */}
          <div className="ticket-r relative flex w-40 shrink-0 flex-col overflow-hidden rounded-r-[26px] border-l-2 border-dashed border-line bg-card xl:w-44">
            <div aria-hidden className="h-[46px] bg-[linear-gradient(115deg,#ff8a7a,#ffd36b,#7ee2b8,#7fb2ff,#c7a2ff,#ff8a7a)] bg-[length:300%_100%] [animation:foil_6s_linear_infinite]" />
            <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
              <Cell label="Kalkış">{slot ? <Flap value={slot.label} /> : <Blank w="w-16" />}</Cell>
              <Cell label="Koltuk">{slot ? <Flap value={`${pace.minutes} dk/gün`} /> : <Blank w="w-14" />}</Cell>
              <Barcode seed={name + (age ?? '')} className="mt-auto h-10" />
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {step === 'name' && !name && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex items-center justify-end gap-2 text-sm font-bold text-white/85">
              Adını sağdaki kutuya yaz, biletine basılsın <ArrowRight className="size-4" />
            </motion.p>
          )}
          {slot && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-right text-sm font-black text-white/90">
              İlk ünite ~{weeks} günde · ayda {Math.round((pace.minutes * 30) / 60)} saat pratik
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}

/** The ticket on phones, shown on the final step where the side panel is hidden. */
export function MobilePass({ name, mot, exam, focus, level, slot, minutes, weeks }: { name: string; mot?: string; exam?: string; focus: SkillKey | null; level: Cefr; slot?: string; minutes: number; weeks: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border-2 border-line lg:hidden">
      <div className="flex items-center justify-between bg-ink px-4 py-2 text-paper">
        <span className="font-display text-sm font-black">
          dil<span className="text-flame">go</span> <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-paper/60">Biniş kartı</span>
        </span>
        <Plane className="size-4 rotate-45 text-flame" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between font-display text-3xl font-black">
          <span>{level}</span>
          <span className="mx-3 h-0.5 flex-1 border-t-2 border-dashed border-line" />
          <span>{exam ?? NEXT[level]}</span>
        </div>
        {name && <p className="mt-2 truncate font-display text-lg font-black uppercase">{name.toLocaleUpperCase('tr')}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-extrabold">
          {mot && <span className="rounded-full bg-paper-2 px-2.5 py-1">{mot}</span>}
          {focus && <span className={clsx('rounded-full px-2.5 py-1', SKILL[focus].soft, SKILL[focus].text)}>Odak: {SKILL[focus].label}</span>}
          {slot && (
            <span className="rounded-full bg-paper-2 px-2.5 py-1">
              {slot} · {minutes} dk
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-black text-mint-deep">
          İlk ünite ~{weeks} günde · ayda {Math.round((minutes * 30) / 60)} saat pratik
        </p>
      </div>
    </div>
  )
}
