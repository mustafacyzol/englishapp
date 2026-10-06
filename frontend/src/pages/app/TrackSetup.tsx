import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react'
import { post, type ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EXAMS, STAGES, ageFromStage } from '@/lib/onboarding'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { higoImg } from '@/components/game/Higo'

/**
 * "Yolumu yeniden belirle": the sign-up questions about school and exam, asked
 * again. Path, exam mode and Defne follow the answers; a change is allowed once
 * every 30 days, so an exam track is a decision rather than a menu.
 */
export default function TrackSetup() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [stage, setStage] = useState<string>(user?.school_stage ?? 'ortaokul')
  const st = STAGES.find((s) => s.key === stage)!
  const [grade, setGrade] = useState<number | null>(user?.grade ?? st.grades[0] ?? null)
  const [exam, setExam] = useState<string | null>(user?.exam_target ?? null)
  const [date, setDate] = useState(user?.exam_date ?? '')
  const kid = ageFromStage(stage, grade) === 'kid'
  const steps = ['Okul', ...(st.grades.length ? ['Sınıf'] : []), ...(!kid && st.exams.length ? ['Sınav'] : []), 'Özet']
  const [i, setI] = useState(0)
  const step = steps[i]

  const save = useMutation({
    mutationFn: () => post<{ user: Me }>('/account/track', { school_stage: stage, grade: st.grades.length ? grade : null, exam_target: kid ? null : exam, exam_date: !kid && exam && date ? date : null }),
    onSuccess: (r) => {
      setUser(r.user)
      ;['path', 'exam', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      toast('Yolun yeni tercihlerine göre kuruldu', 'success')
      nav('/learn')
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })
  const pickStage = (k: string) => {
    const s = STAGES.find((x) => x.key === k)!
    setStage(k)
    setGrade(s.grades[0] ?? null)
    if (!(s.exams as readonly string[]).includes(exam ?? '')) setExam(null)
  }
  const exams = EXAMS.filter((e) => (st.exams as readonly string[]).includes(e.key))

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-lg flex-col">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => (i ? setI(i - 1) : nav(-1))} aria-label="Geri" className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><ArrowLeft className="size-5" /></button>
        <div className="flex flex-1 gap-1.5">{steps.map((s, k) => <span key={s} className={clsx('h-2 flex-1 rounded-full transition', k <= i ? 'bg-flame' : 'bg-paper-2')} />)}</div>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <img src={higoImg(step === 'Özet' ? 'cheer' : step === 'Sınav' ? 'scope' : 'map')} alt="" className="size-16 shrink-0 object-contain" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-ink-soft">Yolumu yeniden belirle</p>
          <h1 className="text-2xl leading-tight sm:text-3xl">{step === 'Okul' ? 'Hangi okul düzeyindesin?' : step === 'Sınıf' ? 'Kaçıncı sınıftasın?' : step === 'Sınav' ? 'Hangi sınava hazırlanıyorsun?' : 'Yolun böyle kurulacak'}</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} className="flex-1">
          {step === 'Okul' && (
            <div className="grid gap-2">
              {STAGES.map((s) => (
                <button key={s.key} onClick={() => pickStage(s.key)} aria-pressed={stage === s.key} className={clsx('flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition', stage === s.key ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card hover:border-ink/25')}>
                  <span className="min-w-0 flex-1"><span className="block font-display text-lg font-black">{s.label}</span><span className={clsx('block text-xs font-bold', stage === s.key ? 'text-on-inv/70' : 'text-ink-soft')}>{s.range} · {s.points[0]}</span></span>
                  {stage === s.key && <Check className="size-5" strokeWidth={3} />}
                </button>
              ))}
            </div>
          )}
          {step === 'Sınıf' && (
            <div className="grid grid-cols-2 gap-2">
              {st.grades.map((g) => (
                <button key={g} onClick={() => setGrade(g)} aria-pressed={grade === g} className={clsx('rounded-2xl border-2 py-5 font-display text-2xl font-black transition', grade === g ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card hover:border-ink/25')}>{g}. sınıf</button>
              ))}
              {stage === 'ortaokul' && <p className="col-span-2 mt-2 flex gap-2 rounded-2xl bg-sky/10 p-3 text-sm font-semibold text-ink"><Info className="mt-0.5 size-4 shrink-0 text-sky" /> Yolunda kendi sınıfının MEB İngilizce ünite başlıklarını ve kelimelerini görürsün.</p>}
            </div>
          )}
          {step === 'Sınav' && (
            <div className="grid gap-2">
              {exams.map((e) => (
                <button key={e.key} onClick={() => setExam(e.key)} aria-pressed={exam === e.key} className={clsx('flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition', exam === e.key ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card hover:border-ink/25')}>
                  <span className="grid h-10 min-w-14 place-items-center rounded-xl px-2 text-sm font-black text-white" style={{ background: e.color }}>{e.name}</span>
                  <span className="min-w-0 flex-1 text-sm font-bold leading-tight">{e.label}<span className={clsx('block text-xs font-semibold', exam === e.key ? 'text-on-inv/70' : 'text-ink-soft')}>{e.text}</span></span>
                </button>
              ))}
              <button onClick={() => setExam(null)} aria-pressed={!exam} className={clsx('rounded-2xl border-2 p-3 text-left text-sm font-bold transition', !exam ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card hover:border-ink/25')}>Şimdilik sınav yok, genel İngilizce</button>
              {exam && (
                <label className="mt-2 block text-sm font-bold">Sınav tarihi (isteğe bağlı)
                  <input type="date" value={date} min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="mt-1.5 block h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold" />
                </label>
              )}
            </div>
          )}
          {step === 'Özet' && (
            <div className="space-y-3">
              <div className="rounded-2xl border-2 border-line bg-card p-4">
                <Row k="Okul" v={`${st.label}${st.grades.length && grade ? ` · ${grade}. sınıf` : ''}`} />
                {!kid && <Row k="Sınav" v={exam ? EXAMS.find((e) => e.key === exam)?.name ?? exam : 'Yok'} />}
                <Row k="Yol" v={grade && st.grades.length ? `${grade}. sınıf üniteleri` + (exam === 'lgs' ? ' + LGS notları' : exam === 'ydt' ? ' + YDT notları' : '') : exam ? `${EXAMS.find((e) => e.key === exam)?.name} odaklı genel yol` : 'Genel İngilizce'} />
              </div>
              <p className="flex gap-2 rounded-2xl bg-butter/15 p-3 text-sm font-semibold"><Info className="mt-0.5 size-4 shrink-0 text-butter-deep" /> Yolunu 30 günde bir yeniden belirleyebilirsin. İlerlemen ve deneme geçmişin silinmez.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] mt-6 lg:bottom-4">
        {step === 'Özet'
          ? <Button block size="lg" loading={save.isPending} onClick={() => save.mutate()} icon={<Check className="size-5" />}>Yolumu kur</Button>
          : <Button block size="lg" onClick={() => setI(i + 1)} disabled={step === 'Sınıf' && !grade}>Devam <ArrowRight className="size-5" /></Button>}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <p className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0"><span className="text-sm font-bold text-ink-soft">{k}</span><span className="text-right font-extrabold">{v}</span></p>
}
