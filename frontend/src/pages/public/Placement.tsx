import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Progress, Spinner } from '@/components/ui/Misc'
import { celebrate } from '@/lib/fx'
import { storage } from '@/lib/storage'

interface Q { id: number; level: string; prompt: string; options: string[] }

const LEVEL_TEXT: Record<string, string> = {
  A1: 'Temelleri birlikte sağlamlaştıralım. İlk adımlar yolundan başlıyorsun.',
  A2: 'Günlük konuşmaları anlıyorsun. Şimdi geçmişi anlatmayı ve planları konuşmayı öğrenelim.',
  B1: 'Bağımsız bir kullanıcısın! Akıcılık ve deneyim anlatımı üzerine çalışacağız.',
  B2: 'Çok iyisin. İnce nüanslar, fikir savunma ve iş İngilizcesi seni bekliyor.',
  C1: 'Neredeyse akıcısın. Üst düzey hikayeler ve münazara senaryoları seni zorlayacak.',
  C2: 'Etkileyici! Ustalık seviyesindesin — Defne ile zor konularda tartışmaya hazır ol.',
}

export default function Placement() {
  const { user, refresh } = useAuth()
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['placement'], queryFn: () => get<{ data: Q[] }>('/placement') })
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const submit = useMutation({
    mutationFn: (a: Record<number, number>) => post<{ level: string }>('/placement', { answers: a }),
    onSuccess: async (r) => {
      celebrate(true)
      await storage.set('dilgo.placement', r.level)
      if (user) refresh()
    },
  })

  if (isLoading || !data) return <Spinner />
  const qs = data.data
  const q = qs[i]

  const choose = (opt: number) => {
    const next = { ...answers, [q.id]: opt }
    setAnswers(next)
    if (i + 1 < qs.length) setI(i + 1)
    else submit.mutate(next)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
      <div className="mb-8 flex items-center gap-4">
        <Link to={user ? '/learn' : '/'} aria-label="Çık"><X className="size-7 text-ink-soft" /></Link>
        <Progress value={submit.isSuccess ? qs.length : i} max={qs.length} color="bg-flame" tall className="flex-1" />
      </div>

      {submit.data ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="ink-card my-auto p-8 text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-flame">Seviyen</p>
          <p className="my-4 font-display text-8xl font-extrabold">{submit.data.level}</p>
          <p className="mx-auto mb-8 max-w-sm text-ink-soft">{LEVEL_TEXT[submit.data.level]}</p>
          {user ? <Button block onClick={() => nav('/learn')}>Yoluma git</Button> : <Button block onClick={() => nav('/register')}>Hesabını oluştur</Button>}
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} className="flex-1">
            <p className="mb-2 text-sm font-extrabold uppercase tracking-widest text-ink-soft">Soru {i + 1} / {qs.length}</p>
            <h1 className="mb-8 text-3xl font-extrabold leading-tight">{q.prompt}</h1>
            <div className="grid gap-3">
              {q.options.map((o, oi) => (
                <button key={oi} onClick={() => choose(oi)} disabled={submit.isPending} className={clsx('press ink-card flex items-center gap-4 px-5 py-4 text-left text-lg font-bold hover:bg-paper-2')}>
                  <span className="grid size-8 place-items-center rounded-lg border-2 border-line font-mono text-sm">{oi + 1}</span>
                  {o}
                </button>
              ))}
            </div>
            <button className="mt-6 text-sm font-bold text-ink-soft" onClick={() => choose(-1)}>Bilmiyorum, geç</button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
