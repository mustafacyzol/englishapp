import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { BarChart3, Clock, FileText, Headphones, Sparkles, Target, UserRound } from 'lucide-react'
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

/** Higo's pose and line for each sign-up step. */
const HIGO: Record<string, { pose: string; line: string }> = {
  name: { pose: 'wave', line: 'Selam! Ben Higo. Adını sağdaki kutuya yaz, planını birlikte kuralım.' },
  age: { pose: 'think', line: 'İçerik ve rakiplerin yaşına göre seçilecek.' },
  goal: { pose: 'point', line: 'Neden öğrendiğini bilirsem örnekleri ona göre seçerim.' },
  exam: { pose: 'read', line: 'Sınav formatında sorularla hazırlanacağız.' },
  interests: { pose: 'music', line: 'Hikâyeler ve sohbetler bu konulardan gelecek.' },
  focus: { pose: 'read', line: 'Zorlandığın beceriye biraz daha yükleneceğiz.' },
  level: { pose: 'think', line: 'Emin değilsen sorun değil, sonra değiştirebilirsin.' },
  time: { pose: 'thumbs', line: 'Hatırlatmaları bu saate kuruyorum.' },
  account: { pose: 'cheer', line: 'Planın hazır! Hesabını açınca ilk derse geçiyoruz.' },
}

const AGE_SHORT: Record<string, string> = { kid: 'Çocuk (7-12)', teen: 'Genç (13-17)', adult: 'Yetişkin (18+)' }

const STOPS: { key: string; label: string }[] = [
  { key: 'age', label: 'Yaş grubu' },
  { key: 'goal', label: 'Hedef' },
  { key: 'exam', label: 'Sınav' },
  { key: 'interests', label: 'İlgi alanları' },
  { key: 'focus', label: 'Odak' },
  { key: 'level', label: 'Seviye' },
  { key: 'time', label: 'Günlük plan' },
]

const STOP_ICON: Record<string, typeof UserRound> = { age: UserRound, goal: Target, exam: FileText, interests: Sparkles, focus: Headphones, level: BarChart3, time: Clock }

/**
 * Sign-up's left side as a plan being written: a straight, calm timeline with a
 * row per question. The row being asked opens up with Higo beside it, answered
 * rows tick off with their answer, and the line fills in as you go. Before the
 * first answer Higo greets in the header, never on the road.
 */
export function PassPanel({ name, age, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const higo = HIGO[step] ?? HIGO.name
  const stops = STOPS.filter((st) => st.key !== 'exam' || exam || step === 'exam')
  const cur = step === 'name' ? -1 : step === 'account' ? stops.length : stops.findIndex((st) => st.key === step)
  const n = stops.length
  const value: Record<string, string> = {
    age: age ? AGE_SHORT[age] : '',
    goal: mot?.label ?? '',
    exam: exam ? exam.name : '',
    interests: interests.map((k) => INTERESTS.find((x) => x.key === k)?.label).filter(Boolean).slice(0, 2).join(', ') + (interests.length > 2 ? ` +${interests.length - 2}` : ''),
    focus: focus ? SKILL[focus].label : '',
    level: ORDER.indexOf(step) > ORDER.indexOf('level') ? level : '',
    time: slot ? `${slot.label} · ${pace.minutes} dk` : '',
  }
  const fill = cur < 0 ? 0 : Math.min(1, cur / Math.max(1, n - 1))

  return (
    <aside className="relative hidden overflow-hidden bg-[#fbf7f2] lg:flex lg:flex-col">
      <motion.span aria-hidden className="absolute -left-24 -top-24 size-[26rem] rounded-full bg-[#ffd9c7] blur-3xl" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }} />
      <motion.span aria-hidden className="absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-[#d9e6ff] blur-3xl" animate={{ x: [0, -40, 0], y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }} />

      <div className="relative z-10 flex items-center justify-between px-10 pt-9 xl:px-14">
        <Link to="/" className="font-display text-3xl font-black tracking-tight text-[#1f2433]">dil<span className="text-flame">go</span></Link>
        <span className="rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-bold text-[#1f2433] ring-1 ring-black/5 backdrop-blur">{level} → {exam ? exam.name : NEXT[level]}</span>
      </div>

      {/* Higo speaks in the header; the line changes with each question */}
      <div className="relative z-10 flex items-center gap-4 px-10 pt-7 xl:px-14">
        <AnimatePresence mode="popLayout">
          <motion.img key={higo.pose} src={`${import.meta.env.BASE_URL}img/higo/${higo.pose}.webp`} alt="Higo" initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }} className="size-20 shrink-0 object-contain drop-shadow-[0_10px_12px_rgba(160,40,10,.2)]" />
        </AnimatePresence>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#676d7c]">{name ? `${name}'in planı` : 'Kişisel planın'}</p>
          <AnimatePresence mode="wait">
            <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }} className="mt-0.5 max-w-sm font-display text-xl font-black leading-snug text-[#1f2433]">{higo.line}</motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* the timeline */}
      <div className="relative z-10 mx-10 my-7 flex-1 xl:mx-14">
        <div className="relative rounded-3xl bg-white/70 p-5 ring-1 ring-black/5 backdrop-blur">
          <span aria-hidden className="absolute bottom-9 left-[42px] top-9 w-[3px] rounded-full bg-[#ece6dd]" />
          <motion.span aria-hidden className="absolute left-[42px] top-9 w-[3px] origin-top rounded-full bg-gradient-to-b from-flame to-[#ffb020]" style={{ height: 'calc(100% - 4.5rem)' }} initial={false} animate={{ scaleY: fill }} transition={{ type: 'spring', stiffness: 70, damping: 18 }} />
          <ol className="relative space-y-1">
            {stops.map((st, i) => {
              const done = i < cur || cur >= n
              const on = i === cur
              return (
                <motion.li key={st.key} layout transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={clsx('flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors duration-300', on && 'bg-flame/8 ring-1 ring-flame/25')}>
                  <span className={clsx('relative grid size-9 shrink-0 place-items-center rounded-full border-[3px] text-sm transition-colors duration-300', done ? 'border-flame bg-flame text-white' : on ? 'border-flame bg-white' : 'border-[#ece6dd] bg-white')}>
                    {done ? (
                      <motion.svg viewBox="0 0 24 24" className="size-4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}>
                        <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
                      </motion.svg>
                    ) : (
                      (() => { const I = STOP_ICON[st.key]; return <I className={clsx('size-4', on ? 'text-flame' : 'text-[#aab0bd]')} strokeWidth={2.5} /> })()
                    )}
                    {on && <motion.span aria-hidden className="absolute -inset-1.5 rounded-full border-2 border-flame/40" animate={{ scale: [1, 1.18, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1.8 }} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-[11px] font-black uppercase tracking-[0.14em]', on ? 'text-flame' : done ? 'text-[#676d7c]' : 'text-[#aab0bd]')}>{st.label}</span>
                    <AnimatePresence mode="wait">
                      {done && value[st.key] ? (
                        <motion.span key="v" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="block truncate text-[15px] font-extrabold text-[#1f2433]">{value[st.key]}</motion.span>
                      ) : on ? (
                        <motion.span key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="block text-sm font-bold text-[#1f2433]">Şimdi bunu seçiyorsun</motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </div>

      <div className="relative z-10 mx-10 mb-8 flex items-center justify-between rounded-2xl bg-[#1f2433] px-4 py-3 text-white xl:mx-14">
        <span className="text-sm font-bold">{slot ? `İlk ünite ~${weeks} günde · günde ${pace.minutes} dk` : 'Ücretsiz · kredi kartı gerekmez'}</span>
        <span className="font-mono text-xs font-bold text-white/70">{Math.max(0, Math.min(n, cur))}/{n}</span>
      </div>
    </aside>
  )
}

/** The plan on phones, shown on the final step where the side panel is hidden. */
export function MobilePass({ name, mot, exam, focus, level, slot, minutes, weeks }: { name: string; mot?: string; exam?: string; focus: SkillKey | null; level: Cefr; slot?: string; minutes: number; weeks: number }) {
  return (
    <div className="rounded-3xl border-2 border-line p-4 lg:hidden">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-flame">Kişisel planın</p>
        <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-xs font-bold text-paper">{level} → {exam ?? NEXT[level]}</span>
      </div>
      {name && <p className="mt-1 truncate font-display text-xl font-black">{name}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-extrabold">
        {mot && <span className="rounded-full bg-paper-2 px-2.5 py-1">{mot}</span>}
        {focus && <span className={clsx('rounded-full px-2.5 py-1', SKILL[focus].soft, SKILL[focus].text)}>Odak: {SKILL[focus].label}</span>}
        {slot && <span className="rounded-full bg-paper-2 px-2.5 py-1">{slot} · {minutes} dk</span>}
      </div>
      <p className="mt-3 text-sm font-black text-mint-deep">İlk ünite ~{weeks} günde · ayda {Math.round((minutes * 30) / 60)} saat pratik</p>
    </div>
  )
}
