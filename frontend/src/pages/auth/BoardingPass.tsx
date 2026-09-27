import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Plane } from 'lucide-react'
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
const ORDER = ['name', 'goal', 'exam', 'interests', 'focus', 'level', 'time', 'account']

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

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <div className="truncate text-[15px] font-extrabold leading-snug">{children}</div>
    </div>
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

/**
 * Sign-up's left side: the learner's plan as a boarding pass for their English
 * journey. Every answer lands on the ticket as it's given (name typed live,
 * route from today's level to the goal or exam, interests stamped on the stub).
 */
export function PassPanel({ name, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const at = ORDER.indexOf(step)
  const reached = (s: string) => at > ORDER.indexOf(s)
  const lastInterest = INTERESTS.find((i) => i.key === interests[interests.length - 1])
  const photo = (at >= ORDER.indexOf('time') && slot?.photo) || (at >= ORDER.indexOf('focus') && focus && SKILL[focus].photo) || (at >= ORDER.indexOf('interests') && lastInterest?.photo) || mot?.photo || PHOTO.hero
  const to = exam ? exam.name : reached('level') ? NEXT[level] : ''
  const progress = Math.min(1, at / (ORDER.length - 1))

  return (
    <aside className="relative hidden overflow-hidden bg-[#10131a] lg:block">
      <AnimatePresence initial={false}>
        <motion.div key={photo} className="absolute inset-0" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          <Img src={photo} alt="" className="photo" />
        </motion.div>
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/70" />
      <Link to="/" className="absolute left-10 top-10 z-10 rounded-2xl bg-white/95 px-4 py-2 text-[#1f2433] shadow-soft xl:left-14">
        <span className="font-display text-xl font-black">
          dil<span className="text-flame">go</span>
        </span>
      </Link>

      <motion.div
        initial={{ y: 30, opacity: 0, rotate: -1.5 }}
        animate={{ y: 0, opacity: 1, rotate: -1.5 }}
        transition={{
          delay: 0.15,
          type: 'spring',
          stiffness: 120,
          damping: 16,
        }}
        className="absolute inset-x-10 bottom-10 z-10 xl:inset-x-14"
      >
        <div className="text-ink drop-shadow-[0_24px_40px_rgba(0,0,0,.45)]">
          <div className="ticket-top overflow-hidden rounded-t-[26px] bg-card">
            {/* header strip */}
            <div className="flex items-center justify-between bg-ink px-6 py-3 text-paper">
              <span className="font-display text-sm font-black tracking-wide">
                dil<span className="text-flame">go</span> <span className="ml-1 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-paper/60">Biniş kartı</span>
              </span>
              <span className="font-mono text-xs font-bold tracking-widest text-paper/70">
                DG-{level}
                {to
                  ? `·${to
                      .replace(/[^A-Z0-9]/gi, '')
                      .slice(0, 4)
                      .toUpperCase()}`
                  : ''}
              </span>
            </div>

            <div className="px-6 pb-5 pt-5">
              {/* route */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-soft">Bugün</p>
                  <Flap value={reached('level') || level !== 'A1' ? level : ''} className="font-display text-5xl font-black leading-none" empty="--" />
                </div>
                <div className="relative mb-3 flex-1">
                  <div className="h-0.5 w-full border-t-2 border-dashed border-line" />
                  <motion.span
                    className="absolute -top-[13px] grid size-7 place-items-center rounded-full bg-flame text-white shadow-soft"
                    initial={false}
                    animate={{
                      left: `calc(${progress * 100}% - ${progress * 28}px)`,
                    }}
                    transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                  >
                    <Plane className="size-4 rotate-45" />
                  </motion.span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-soft">{exam ? 'Sınav' : 'Hedef'}</p>
                  <Flap value={to} className="font-display text-5xl font-black leading-none" empty="--" />
                </div>
              </div>

              {/* passenger */}
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-soft">Yolcu</p>
                <p className="truncate font-display text-2xl font-black uppercase tracking-wide">
                  {name ? name.toLocaleUpperCase('tr') : <span className="text-ink-soft/40">Adın buraya</span>}
                  {step === 'name' && <span className="ml-0.5 inline-block h-6 w-[3px] translate-y-0.5 animate-pulse bg-flame" />}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-4">
                <Field label="Amaç" className="col-span-2">
                  <Flap value={mot?.label} />
                </Field>
                <Field label="Kapı">
                  <Flap value={focus ? <span className={SKILL[focus].text}>{SKILL[focus].label}</span> : undefined} />
                </Field>
                <Field label="Kalkış">
                  <Flap value={slot ? `${slot.label} · ${pace.minutes} dk` : undefined} />
                </Field>
              </div>
            </div>
          </div>
          {/* perforation + stub */}
          <div className="ticket-bottom overflow-hidden rounded-b-[26px] bg-card">
            <div className="mx-6 border-t-2 border-dashed border-line" />
            <div className="flex items-center gap-5 px-6 pb-5 pt-4">
              <div className="flex min-h-14 flex-1 flex-wrap items-center gap-2">
                {interests.length ? (
                  interests.map((k, i) => (
                    <motion.span
                      key={k}
                      initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        rotate: ((i * 37) % 22) - 11,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 16,
                      }}
                      className="rounded-lg border-2 border-sky/70 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-sky"
                    >
                      {INTERESTS.find((x) => x.key === k)?.label}
                    </motion.span>
                  ))
                ) : (
                  <span className="text-xs font-bold text-ink-soft/60">İlgi alanların buraya damgalanacak</span>
                )}
              </div>
              <Barcode seed={name} className="shrink-0 opacity-85" />
            </div>
            <AnimatePresence>
              {slot && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-mint/12 px-6 py-2.5 text-sm font-black text-mint-deep">
                  İlk ünite ~{weeks} günde · ayda {Math.round((pace.minutes * 30) / 60)} saat pratik
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
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
