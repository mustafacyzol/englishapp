import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
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

/**
 * Sign-up's left side as a small journey: a winding road with a stop for each
 * question. Higo hops to the stop being asked; answered stops keep their answer
 * beside them, and the road fills in behind him. A soft, slowly drifting colour
 * field sits behind it all.
 */
export function PassPanel({ name, age, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const higo = HIGO[step] ?? HIGO.name
  const stops = STOPS.filter((st) => st.key !== 'exam' || exam || step === 'exam')
  const cur = step === 'name' ? -1 : step === 'account' ? stops.length : stops.findIndex((st) => st.key === step)
  const n = stops.length
  const pos = (i: number) => ({ x: 50 + Math.sin(i * 1.15 + 0.4) * 26, y: 10 + (i * 78) / Math.max(1, n - 1) })
  const pts = stops.map((_, i) => pos(i))
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `C ${pts[i - 1].x} ${(pts[i - 1].y + p.y) / 2}, ${p.x} ${(pts[i - 1].y + p.y) / 2}, ${p.x} ${p.y}`)).join(' ')
  const value: Record<string, string> = {
    age: age ? AGE_SHORT[age] : '',
    goal: mot?.label ?? '',
    exam: exam ? exam.name : '',
    interests: interests.map((k) => INTERESTS.find((x) => x.key === k)?.label).filter(Boolean).slice(0, 2).join(', ') + (interests.length > 2 ? ` +${interests.length - 2}` : ''),
    focus: focus ? SKILL[focus].label : '',
    level: ORDER.indexOf(step) > ORDER.indexOf('level') ? level : '',
    time: slot ? `${slot.label} · ${pace.minutes} dk` : '',
  }
  // Before the first answer Higo waits just ahead of the first stop, clear of the heading.
  const at = cur < 0 ? { x: pts[0].x + 16, y: pts[0].y + 3 } : cur >= n ? { x: pts[n - 1].x, y: 100 } : pts[cur]
  const doneFrac = cur <= 0 ? 0 : Math.min(1, cur / (n - 1))

  return (
    <aside className="relative hidden overflow-hidden bg-[#fbf7f2] lg:flex lg:flex-col">
      {/* drifting colour field */}
      <motion.span aria-hidden className="absolute -left-24 -top-24 size-[26rem] rounded-full bg-[#ffd9c7] blur-3xl" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }} />
      <motion.span aria-hidden className="absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-[#d9e6ff] blur-3xl" animate={{ x: [0, -40, 0], y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }} />
      <motion.span aria-hidden className="absolute left-1/3 top-1/2 size-72 rounded-full bg-[#fff0c2] blur-3xl" animate={{ x: [0, 30, -20, 0] }} transition={{ repeat: Infinity, duration: 26, ease: 'easeInOut' }} />

      <div className="relative z-10 flex items-center justify-between px-10 pt-9 xl:px-14">
        <Link to="/" className="font-display text-3xl font-black tracking-tight text-[#1f2433]">dil<span className="text-flame">go</span></Link>
        <span className="rounded-full bg-white/80 px-3 py-1 font-mono text-xs font-bold text-[#1f2433] ring-1 ring-black/5 backdrop-blur">{level} → {exam ? exam.name : NEXT[level]}</span>
      </div>

      <div className="relative z-10 px-10 pt-6 xl:px-14">
        <p className="text-sm font-bold text-[#676d7c]">{name ? `${name}'in İngilizce yolculuğu` : 'İngilizce yolculuğun'}</p>
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-1 max-w-sm font-display text-xl font-black leading-snug text-[#1f2433]">{higo.line}</motion.p>
        </AnimatePresence>
      </div>

      {/* the road */}
      <div className="relative z-10 mx-10 mb-6 mt-16 flex-1 xl:mx-14">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <path d={d} fill="none" stroke="#e7e1d8" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="2 7" style={{ strokeWidth: 5 }} />
          <motion.path d={d} fill="none" stroke="url(#road)" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 5 }} initial={false} animate={{ pathLength: doneFrac }} transition={{ type: 'spring', stiffness: 60, damping: 18 }} />
          <defs><linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff5a36" /><stop offset="1" stopColor="#ffb020" /></linearGradient></defs>
        </svg>
        {stops.map((st, i) => {
          const p = pts[i]
          const done = i < cur || cur >= n
          const on = i === cur
          const right = p.x < 55
          return (
            <div key={st.key} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <motion.span className={clsx('absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 transition-colors duration-300', done ? 'size-4 bg-flame ring-flame/20' : on ? 'size-5 bg-white ring-flame/40' : 'size-3.5 bg-white ring-[#e7e1d8]')} animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={on ? { repeat: Infinity, duration: 1.6 } : {}} />
              <div className={clsx('absolute top-0 w-40 -translate-y-1/2', right ? 'left-5 text-left' : 'right-5 text-right')}>
                <p className={clsx('text-[11px] font-black uppercase tracking-[0.14em]', on ? 'text-flame' : 'text-[#9aa1b2]')}>{st.label}</p>
                <AnimatePresence>
                  {value[st.key] && done && (
                    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="truncate text-sm font-extrabold text-[#1f2433]">{value[st.key]}</motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
        {/* Higo walks the road */}
        <motion.img
          src={`${import.meta.env.BASE_URL}img/higo/${higo.pose}.webp`}
          alt="Higo"
          className="absolute z-20 w-16 -translate-x-1/2 -translate-y-[92%] drop-shadow-[0_10px_12px_rgba(160,40,10,.25)]"
          initial={false}
          animate={{ left: `${at.x}%`, top: `${at.y}%` }}
          transition={{ type: 'spring', stiffness: 70, damping: 16 }}
        />
      </div>

      <div className="relative z-10 mx-10 mb-8 flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3 ring-1 ring-black/5 backdrop-blur xl:mx-14">
        <span className="text-sm font-bold text-[#676d7c]">{slot ? `İlk ünite ~${weeks} günde` : 'Ücretsiz · kredi kartı gerekmez'}</span>
        <span className="flex gap-1">{ORDER.slice(1, -1).map((k) => <span key={k} className={clsx('h-1.5 w-4 rounded-full', ORDER.indexOf(step) > ORDER.indexOf(k) ? 'bg-flame' : 'bg-[#e7e1d8]')} />)}</span>
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
