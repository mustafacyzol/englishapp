import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import clsx from 'clsx'
import { Plane } from 'lucide-react'
import type { Cefr, SkillKey } from '@/lib/types'
import { SKILL } from '@/lib/skills'
import { EXAMS, INTERESTS, MOTIVATIONS, PACES, STUDY_TIMES } from '@/lib/onboarding'

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

/** Higo's pose and line for each sign-up step. */
const HIGO: Record<string, { pose: string; line: string }> = {
  name: { pose: 'wave', line: 'Selam! Ben Higo. Adını sağdaki kutuya yaz, kartına basayım.' },
  age: { pose: 'think', line: 'Sana uygun içerik seçmem için yaş grubun lazım.' },
  goal: { pose: 'point', line: 'Neden öğrendiğini bilirsem planı ona göre çizerim.' },
  exam: { pose: 'read', line: 'Sınav formatında sorularla hazırlanacağız.' },
  interests: { pose: 'music', line: 'Hikâyeler ve sohbetler bu konulardan gelecek.' },
  focus: { pose: 'read', line: 'Zorlandığın beceriye biraz daha yüklenelim.' },
  level: { pose: 'think', line: 'Seviyeni bilmiyorsan dert etme, sonra değiştirebilirsin.' },
  time: { pose: 'thumbs', line: 'Harika! Hatırlatmaları bu saate kuruyorum.' },
  account: { pose: 'cheer', line: 'Kartın hazır. Hesabını açınca ilk derse geçiyoruz!' },
}

/** A tiny deterministic "QR" grid from the learner's name. */
function Code({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261
    for (const c of seed || 'dilgo') h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    return Array.from({ length: 81 }, (_, i) => {
      h = Math.imul(h ^ (h >>> 13), 1274126177) + i
      const r = Math.floor(i / 9), c = i % 9
      const finder = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)
      return finder || Math.abs(h) % 3 === 0
    })
  }, [seed])
  return (
    <span aria-hidden className="grid size-[72px] shrink-0 grid-cols-9 gap-[2px] rounded-xl bg-white p-1.5 ring-1 ring-black/5">
      {cells.map((on, i) => <span key={i} className={clsx('rounded-[1.5px]', on ? 'bg-[#1f2433]' : 'bg-transparent')} />)}
    </span>
  )
}

/**
 * Sign-up's left side: a clean, brand-coloured stage with Higo and the learner's
 * DilGO pass, styled like a wallet pass. Every answer lands on the pass as it is
 * given; empty fields are quiet bars, and Higo's speech bubble tells people where
 * to type, so nobody tries to write on the picture.
 */
export function PassPanel({ name, age, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const at = ORDER.indexOf(step)
  const reached = (s: string) => at > ORDER.indexOf(s)
  const to = exam ? exam.name : reached('level') ? NEXT[level] : ''
  const done = step === 'account'
  const higo = HIGO[step] ?? HIGO.name
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 120, damping: 14 })
  const sry = useSpring(ry, { stiffness: 120, damping: 14 })
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8)
  }
  const notch = 'radial-gradient(circle 14px at 0 calc(100% - 118px), transparent 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 14px at 100% calc(100% - 118px), transparent 97%, #000) right / 51% 100% no-repeat'

  return (
    <aside className="relative hidden overflow-hidden bg-[#e8452f] text-white lg:flex lg:flex-col" onPointerMove={move} onPointerLeave={() => { rx.set(0); ry.set(0) }}>
      {/* stage: brand gradient, a faint dot grid and two soft light pools, all vector so it stays sharp */}
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_0%,#ff7a4d_0%,transparent_60%),radial-gradient(70%_60%_at_100%_100%,#b92a1c_0%,transparent_65%)]" />
      <div aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.55)_1px,transparent_1.3px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]" />
      <motion.span aria-hidden className="absolute -right-24 top-24 size-72 rounded-full border-[28px] border-white/10" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 60, ease: 'linear' }} />

      <Link to="/" className="relative z-10 ml-10 mt-10 w-fit font-display text-3xl font-black tracking-tight xl:ml-14">dil<span className="text-[#ffd36b]">go</span></Link>

      <div className="relative z-10 flex flex-1 items-center justify-center px-8 pb-10 pt-4 [perspective:1400px]">
        <div className="relative">
          {/* Higo peeks over the pass and talks you through the steps */}
          <div className="absolute -right-10 -top-[118px] z-20 flex items-end gap-2 xl:-right-16">
            <AnimatePresence mode="wait">
              <motion.p key={step} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }} className="relative mb-16 max-w-[210px] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#1f2433] shadow-[0_12px_30px_-10px_rgba(0,0,0,.35)]">
                {higo.line}
              </motion.p>
            </AnimatePresence>
            <AnimatePresence mode="popLayout">
              <motion.img key={higo.pose} src={`${import.meta.env.BASE_URL}img/higo/${higo.pose}.webp`} alt="Higo" className="size-36 object-contain drop-shadow-[0_18px_22px_rgba(80,10,0,.35)]" initial={{ opacity: 0, y: 24, scale: 0.8, rotate: -8 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }} />
            </AnimatePresence>
          </div>

          <motion.div style={{ rotateX: srx, rotateY: sry }} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 110, damping: 16 }} className="drop-shadow-[0_40px_50px_rgba(90,10,0,.45)]">
            <div className="relative w-[360px] overflow-hidden rounded-[30px] bg-white text-[#1f2433] xl:w-[380px]" style={{ mask: notch, WebkitMask: notch }}>
              {/* header */}
              <div className="flex items-center justify-between px-6 pt-5">
                <span className="font-display text-lg font-black">dil<span className="text-flame">go</span></span>
                <span className="rounded-full bg-[#1f2433] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">Öğrenci kartı</span>
              </div>

              {/* route */}
              <div className="mx-6 mt-4 flex items-center gap-3 rounded-2xl bg-[#f4f5f8] px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#676d7c]">Bugün</p>
                  <Flap value={reached('level') || level !== 'A1' ? level : ''} className="font-display text-4xl font-black leading-none" empty="··" />
                </div>
                <div className="relative h-6 flex-1">
                  <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-[#d5d9e0]" />
                  <motion.span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-flame ring-4 ring-flame/20" initial={false} animate={{ left: `calc(${Math.min(1, at / (ORDER.length - 1)) * 100}% - 6px)` }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#676d7c]">{exam ? 'Sınav' : 'Hedef'}</p>
                  <Flap value={to} className="font-display text-4xl font-black leading-none" empty="··" />
                </div>
              </div>

              {/* holder */}
              <div className="px-6 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#676d7c]">Kart sahibi</p>
                <div className="mt-1 flex h-8 items-center">
                  {name ? <span className="truncate font-display text-2xl font-black">{name}</span> : <span className="flex items-center gap-2"><Blank w="w-32" /><Blank w="w-16" /></span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-3 px-6 pt-3">
                <Cell label="Yaş grubu">{age ? <Flap value={AGE_LABEL[age]} /> : <Blank w="w-20" />}</Cell>
                <Cell label="Odak">{focus ? <Flap value={<span className={SKILL[focus].text}>{SKILL[focus].label}</span>} /> : <Blank />}</Cell>
                <Cell label="Amaç" className="col-span-2">{mot ? <Flap value={mot.label} /> : <Blank w="w-40" />}</Cell>
              </div>

              <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 px-6 pb-5 pt-3">
                {interests.length ? interests.map((k) => (
                  <motion.span key={k} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="rounded-full bg-sky/12 px-2.5 py-1 text-[11px] font-extrabold text-sky">
                    {INTERESTS.find((x) => x.key === k)?.label}
                  </motion.span>
                )) : <><Blank w="w-14" /><Blank w="w-12" /><Blank w="w-16" /></>}
              </div>

              {/* perforation, then the stub */}
              <div className="mx-5 border-t-2 border-dashed border-[#e3e6eb]" />
              <div className="flex h-[104px] items-center gap-4 px-6">
                <Code seed={name + (age ?? '') + level} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#676d7c]">Günlük plan</p>
                  <p className="mt-0.5 font-display text-lg font-black leading-tight">{slot ? <Flap value={`${slot.label} · ${pace.minutes} dk`} /> : <Blank w="w-28" />}</p>
                  <p className="mt-1 text-xs font-bold text-mint-deep">{slot ? `İlk ünite ~${weeks} günde` : ' '}</p>
                </div>
              </div>

              <AnimatePresence>
                {done && (
                  <motion.span initial={{ scale: 2.6, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 0.92, rotate: -12 }} transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.2 }} className="absolute right-5 top-[42%] rounded-xl border-4 border-mint bg-white/80 px-3 py-1 font-display text-lg font-black tracking-widest text-mint">
                    HAZIR
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <p className="relative z-10 mb-8 text-center text-sm font-bold text-white/80">Ücretsiz başla · kredi kartı gerekmez · istediğin an iptal</p>
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
