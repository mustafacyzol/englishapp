import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
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

/**
 * Sign-up's left side, kept to three calm things: a thin step bar, Higo large with
 * one short line about the current question, and a small plan card that fills in
 * as answers come (only what is answered is shown, nothing to decode).
 */
export function PassPanel({ name, age, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const higo = HIGO[step] ?? HIGO.name
  const at = Math.max(0, ORDER.indexOf(step))
  const rows = [
    { k: 'age', l: 'Yaş', v: age ? AGE_SHORT[age] : '' },
    { k: 'goal', l: 'Hedef', v: mot?.label ?? '' },
    { k: 'exam', l: 'Sınav', v: exam?.name ?? '' },
    { k: 'interests', l: 'İlgi', v: interests.map((x) => INTERESTS.find((i) => i.key === x)?.label).filter(Boolean).slice(0, 3).join(', ') },
    { k: 'focus', l: 'Odak', v: focus ? SKILL[focus].label : '' },
    { k: 'level', l: 'Seviye', v: at > ORDER.indexOf('level') ? level : '' },
    { k: 'time', l: 'Günlük', v: slot ? `${pace.minutes} dk · ${slot.label.toLowerCase()}` : '' },
  ].filter((r) => r.v && ORDER.indexOf(r.k) < at)

  return (
    <aside className="relative hidden overflow-hidden bg-[#fbf6ef] lg:flex lg:flex-col">
      <span aria-hidden className="absolute left-1/2 top-[38%] size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#ffe0cf,transparent_65%)]" />

      <div className="relative z-10 px-10 pt-9 xl:px-14">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-3xl font-black tracking-tight text-[#1f2433]">dil<span className="text-flame">go</span></Link>
        </div>
      </div>

      {/* Higo and one line */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 text-center xl:px-14">
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }} className="relative mb-5 max-w-sm rounded-3xl bg-white px-6 py-4 font-display text-xl font-black leading-snug text-[#1f2433] shadow-[0_18px_40px_-24px_rgba(31,36,51,.4)]">
            {higo.line}
            <span aria-hidden className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-white" />
          </motion.p>
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          <motion.img key={higo.pose} src={`${import.meta.env.BASE_URL}img/higo/${higo.pose}.webp`} alt="Higo" initial={{ scale: 0.7, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="w-44 object-contain drop-shadow-[0_18px_18px_rgba(160,40,10,.18)] xl:w-52" />
        </AnimatePresence>
      </div>

      {/* the plan, filling in */}
      <div className="relative z-10 mx-10 mb-9 rounded-3xl bg-white p-5 shadow-[0_24px_50px_-30px_rgba(31,36,51,.45)] ring-1 ring-black/5 xl:mx-14">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-black text-[#1f2433]">{name ? `${name.split(' ')[0]}’in planı` : 'Kişisel planın'}</p>
          <span className="rounded-full bg-[#1f2433] px-2.5 py-1 font-mono text-[11px] font-bold text-white">{level} → {exam ? exam.name : NEXT[level]}</span>
        </div>
        {rows.length ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            <AnimatePresence initial={false}>
              {rows.map((r) => (
                <motion.div key={r.k} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
                  <dt className="text-[11px] font-black uppercase tracking-[0.12em] text-[#9aa1b2]">{r.l}</dt>
                  <dd className="truncate text-[15px] font-extrabold text-[#1f2433]">{r.v}</dd>
                </motion.div>
              ))}
            </AnimatePresence>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[#676d7c]">Cevapladıkça planın burada oluşacak.</p>
        )}
        {slot && <p className="mt-4 border-t border-[#f0ebe3] pt-3 text-sm font-bold text-[#676d7c]">İlk ünite yaklaşık {weeks} günde · ücretsiz</p>}
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
