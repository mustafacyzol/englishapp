import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Clock, Gauge, GraduationCap, Heart, Sparkles, Target, User } from 'lucide-react'
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

/** One line of the plan: an icon, what it is, and the answer once given. */
function Row({ icon, label, active, done, children }: { icon: ReactNode; label: string; active: boolean; done: boolean; children: ReactNode }) {
  return (
    <motion.li layout className={clsx('flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors', active ? 'bg-flame/[0.07] ring-1 ring-flame/25' : '')}>
      <span className={clsx('grid size-9 shrink-0 place-items-center rounded-xl transition-colors', done ? 'bg-mint/15 text-mint-deep' : active ? 'bg-flame/15 text-flame' : 'bg-[#f1f3f6] text-[#9aa1b2]')}>
        {done ? <Check className="size-4" strokeWidth={3} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#8a90a0]">{label}</span>
        <span className="block min-h-5 truncate text-[15px] font-extrabold text-[#1f2433]">{children}</span>
      </span>
    </motion.li>
  )
}

/**
 * Sign-up's left side: a calm stage with Higo and the learner's plan as a short
 * checklist that fills in as they answer. The question being asked is
 * highlighted; answers tick green. Nothing on it looks like an input.
 */
export function PassPanel({ name, age, mot, exam, interests, focus, level, slot, pace, weeks, step }: PassProps) {
  const at = ORDER.indexOf(step)
  const reached = (s: string) => at > ORDER.indexOf(s)
  const higo = HIGO[step] ?? HIGO.name
  const steps = ORDER.filter((k) => k !== 'exam' || exam || step === 'exam')
  const pct = Math.round((Math.min(at, ORDER.length - 1) / (ORDER.length - 1)) * 100)
  const to = exam ? exam.name : NEXT[level]

  return (
    <aside className="relative hidden overflow-hidden bg-[#f6f4ef] lg:flex lg:flex-col">
      <div aria-hidden className="absolute inset-0 [background:radial-gradient(42rem_28rem_at_10%_0%,rgba(255,90,54,.10),transparent_70%),radial-gradient(36rem_26rem_at_100%_100%,rgba(47,124,246,.10),transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(31,36,51,.12)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,#000,transparent_80%)]" />

      <Link to="/" className="relative z-10 ml-10 mt-9 w-fit font-display text-3xl font-black tracking-tight text-[#1f2433] xl:ml-14">dil<span className="text-flame">go</span></Link>

      <div className="relative z-10 flex flex-1 items-center justify-center px-8 py-6">
        <div className="w-full max-w-[400px]">
          {/* Higo and his line */}
          <div className="mb-4 flex items-end gap-3">
            <AnimatePresence mode="popLayout">
              <motion.img key={higo.pose} src={`${import.meta.env.BASE_URL}img/higo/${higo.pose}.webp`} alt="Higo" className="size-24 shrink-0 object-contain drop-shadow-[0_12px_14px_rgba(160,40,10,.18)]" initial={{ opacity: 0, y: 16, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 320, damping: 18 }} />
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mb-6 rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm font-bold leading-snug text-[#1f2433] shadow-[0_10px_30px_-12px_rgba(31,36,51,.25)] ring-1 ring-black/5">
                {higo.line}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* the plan */}
          <div className="rounded-[28px] bg-white p-4 shadow-[0_30px_60px_-30px_rgba(31,36,51,.35)] ring-1 ring-black/5">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-flame">Kişisel planın</p>
                <p className="h-7 truncate font-display text-xl font-black text-[#1f2433]">{name || <span className="mt-2 inline-block h-3 w-32 rounded-full bg-[#eef0f4]" />}</p>
              </div>
              <span className="rounded-full bg-[#1f2433] px-2.5 py-1 font-mono text-xs font-bold text-white">{level} → {to}</span>
            </div>
            <ul className="space-y-0.5">
              <Row icon={<User className="size-4" />} label="Yaş grubu" active={step === 'age'} done={!!age && reached('age')}>{age ? AGE_SHORT[age] : ''}</Row>
              <Row icon={<Target className="size-4" />} label="Hedef" active={step === 'goal'} done={!!mot && reached('goal')}>{mot?.label ?? ''}</Row>
              {steps.includes('exam') && <Row icon={<GraduationCap className="size-4" />} label="Sınav" active={step === 'exam'} done={!!exam && reached('exam')}>{exam ? `${exam.name} · ${exam.label}` : ''}</Row>}
              <Row icon={<Heart className="size-4" />} label="İlgi alanları" active={step === 'interests'} done={interests.length > 0 && reached('interests')}>{interests.map((k) => INTERESTS.find((x) => x.key === k)?.label).filter(Boolean).join(', ')}</Row>
              <Row icon={<Sparkles className="size-4" />} label="Odak beceri" active={step === 'focus'} done={!!focus && reached('focus')}>{focus ? SKILL[focus].label : ''}</Row>
              <Row icon={<Gauge className="size-4" />} label="Başlangıç seviyesi" active={step === 'level'} done={reached('level')}>{reached('level') ? level : ''}</Row>
              <Row icon={<Clock className="size-4" />} label="Günlük plan" active={step === 'time'} done={!!slot && reached('time')}>{slot ? `${slot.label} · ${pace.minutes} dk` : ''}</Row>
            </ul>
            <div className="mt-3 px-2 pb-1">
              <div className="mb-1.5 flex justify-between text-xs font-bold text-[#676d7c]"><span>Plan %{pct} hazır</span>{slot && <span className="text-mint-deep">İlk ünite ~{weeks} günde</span>}</div>
              <div className="h-2 overflow-hidden rounded-full bg-[#eef0f4]"><motion.div className="h-full rounded-full bg-gradient-to-r from-flame to-butter" initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 80, damping: 18 }} /></div>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 mb-7 text-center text-sm font-semibold text-[#676d7c]">Ücretsiz başla · kredi kartı gerekmez · istediğin an bırak</p>
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
