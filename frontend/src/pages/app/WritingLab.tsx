import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { PenLine, Sparkles } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import type { RewardSummary } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Alert, PageHeader } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'

interface Result {
  cefr_estimate: string
  score: number
  corrected_text: string
  mistakes: { original: string; fix: string; rule_tr: string; category: string }[]
  strengths_tr: string
  next_steps_tr: string
}

const PROMPTS = [
  'Describe your perfect weekend.',
  'Write an email to a hotel asking about breakfast times and parking.',
  'What is the best advice you have ever received? Why?',
  'Do you think social media makes people happier? Give two reasons.',
  'Describe a person who inspires you.',
]
const CAT = { grammar: 'Dilbilgisi', vocabulary: 'Kelime', spelling: 'Yazım', word_order: 'Sözcük sırası', style: 'Üslup' } as Record<string, string>

export default function WritingLab() {
  const [task, setTask] = useState(PROMPTS[0])
  const [text, setText] = useState('')
  const showReward = useReward()
  const m = useMutation({
    mutationFn: () => post<{ result: Result; reward: RewardSummary }>('/ai/writing', { text, task }),
    onSuccess: (r) => showReward(r.reward, 'Yazın değerlendirildi!'),
  })
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const r = m.data?.result

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Yazma becerisi" title="Yazma atölyesi" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ink-card p-6">
          <p className="mb-2 text-sm font-bold">Konu seç</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => setTask(p)} className={clsx('rounded-xl border-2 px-3 py-1.5 text-left text-sm font-semibold', task === p ? 'border-line bg-butter text-ink shadow-hard-sm' : 'border-line/20')}>{p}</button>
            ))}
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write here in English…" className="[&_textarea]:min-h-64 [&_textarea]:font-read [&_textarea]:text-lg" hint={`${words} kelime · en az 20 karakter`} />
          {m.error && <div className="mt-3"><Alert tone="error">{(m.error as ApiError).first()}</Alert></div>}
          <Button block className="mt-4" loading={m.isPending} disabled={text.trim().length < 20} onClick={() => m.mutate()} icon={<Sparkles className="size-5" />}>Defne değerlendirsin</Button>
        </section>

        <section>
          {!r ? (
            <div className="ink-card flex h-full flex-col items-center justify-center gap-3 border-dashed p-10 text-center text-ink-soft">
              <PenLine className="size-10" />
              <p className="font-bold">Yazını gönder; Defne seviyeni tahmin etsin, hatalarını Türkçe açıklasın ve düzeltilmiş halini göstersin.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="ink-card flex items-center gap-5 p-5">
                <div className="grid size-24 place-items-center rounded-2xl border-2 border-line bg-butter text-ink shadow-hard">
                  <div className="text-center">
                    <p className="font-display text-4xl font-extrabold leading-none">{r.cefr_estimate}</p>
                    <p className="text-xs font-bold">tahmini</p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink-soft">Puan</p>
                  <p className="font-display text-5xl font-extrabold">{r.score}<span className="text-xl text-ink-soft">/100</span></p>
                </div>
              </div>
              <div className="ink-card p-5">
                <h3 className="mb-3 text-lg font-extrabold">Düzeltmeler</h3>
                {r.mistakes.length === 0 ? <p className="text-mint-deep font-bold">Hata bulunamadı, harika! 🎉</p> : (
                  <ul className="space-y-3">
                    {r.mistakes.map((x, i) => (
                      <li key={i} className="rounded-xl border-2 border-line/15 p-3 text-sm">
                        <span className="mb-1 inline-block rounded-md bg-paper-2 px-1.5 text-[10px] font-extrabold uppercase">{CAT[x.category] ?? x.category}</span>
                        <p><s className="text-berry">{x.original}</s> → <b>{x.fix}</b></p>
                        <p className="text-ink-soft">{x.rule_tr}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="ink-card p-5">
                <h3 className="mb-2 text-lg font-extrabold">Düzeltilmiş metin</h3>
                <p className="font-read leading-relaxed">{r.corrected_text}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border-2 border-line bg-mint/20 p-4 text-sm"><p className="mb-1 font-extrabold">Güçlü yönlerin</p>{r.strengths_tr}</div>
                <div className="rounded-2xl border-2 border-line bg-sky/15 p-4 text-sm"><p className="mb-1 font-extrabold">Sonraki adım</p>{r.next_steps_tr}</div>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  )
}
