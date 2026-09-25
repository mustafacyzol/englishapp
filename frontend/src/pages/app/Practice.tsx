import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Brain, Layers, Search, Trash2, Volume2 } from 'lucide-react'
import { del, get, post } from '@/lib/api'
import { speak } from '@/lib/speech'
import type { RewardSummary } from '@/lib/types'
import { Button, LinkButton } from '@/components/ui/Button'
import { Empty, PageHeader, Progress, SkeletonPage, Tabs } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'
import { useAuth } from '@/lib/auth'

interface Word { id: number; word: string; translation: string | null; example: string | null; interval_days: number; due_at: string | null; source: string | null }

export default function Practice() {
  const [tab, setTab] = useState<'review' | 'words'>('review')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Aralıklı tekrar" title="Pratik" />
      <div className="mb-6">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'review', label: 'Kelime tekrarı' }, { value: 'words', label: 'Kelime defterim' }]} />
      </div>
      {tab === 'review' ? <Review /> : <WordList />}
    </div>
  )
}

function Review() {
  const qc = useQueryClient()
  const showReward = useReward()
  const { user } = useAuth()
  const { data, isLoading, refetch } = useQuery({ queryKey: ['review'], queryFn: () => get<{ data: Word[] }>('/review') })
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const [grades, setGrades] = useState<{ id: number; grade: number }[]>([])

  const submit = useMutation({
    mutationFn: async (g: { id: number; grade: number }[]) => {
      const r = await post<{ reward: RewardSummary }>('/review', { reviews: g })
      const correct = g.filter((x) => x.grade >= 3).length
      if (correct >= 5 && user && !user.hearts.unlimited && user.hearts.hearts < 5) await post('/hearts/earn', { correct }).catch(() => {})
      return r
    },
    onSuccess: (r) => {
      showReward(r.reward, 'Tekrar tamam!')
      qc.invalidateQueries({ queryKey: ['words'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setI(0)
      setGrades([])
      refetch()
    },
  })

  if (isLoading) return <SkeletonPage variant="list" />
  const words = data?.data ?? []
  if (!words.length)
    return (
      <Empty
        icon={<Brain className="size-8" />}
        title="Tekrar edilecek kelime yok"
        text="Hikaye okurken bilmediğin kelimelere dokunup kaydet; zamanı gelince burada tekrar edeceğiz."
        action={<LinkButton to="/stories">Hikaye oku</LinkButton>}
      />
    )

  const w = words[i]
  const grade = (g: number) => {
    const next = [...grades, { id: w.id, grade: g }]
    setGrades(next)
    setFlip(false)
    if (i + 1 >= words.length) submit.mutate(next)
    else setI(i + 1)
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Progress value={i} max={words.length} color="bg-mint" tall className="flex-1" />
        <span className="font-mono text-sm font-bold">{i + 1}/{words.length}</span>
      </div>
      <p className="mb-4 text-center text-sm font-semibold text-ink-soft">Kartı çevir, sonra kelimeyi ne kadar iyi hatırladığını seç. Doğru cevaplarla can da kazanırsın ❤️</p>
      <div className="mx-auto h-72 max-w-md [perspective:1100px]">
        <motion.button onClick={() => { setFlip((f) => !f); if (!flip) speak(w.word) }} className="relative size-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flip ? 180 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
          <div className="ink-card absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 shadow-hard-lg" style={{ backfaceVisibility: 'hidden' }}>
            <span className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">İngilizce</span>
            <span className="font-display text-5xl font-extrabold">{w.word}</span>
            <span className="text-sm text-ink-soft">Çevirmek için dokun</span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-line bg-butter p-6 text-ink shadow-hard-lg" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <span className="text-xs font-extrabold uppercase tracking-widest opacity-60">Türkçe</span>
            <span className="font-display text-4xl font-extrabold">{w.translation || '—'}</span>
            {w.example && <span className="line-clamp-3 text-center font-read text-sm italic">“{w.example}”</span>}
            <span onClick={(e) => { e.stopPropagation(); speak(w.word) }} className="grid size-10 place-items-center rounded-full border-2 border-line bg-card"><Volume2 className="size-5" /></span>
          </div>
        </motion.button>
      </div>
      <AnimatePresence>
        {flip && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto mt-8 grid max-w-md grid-cols-4 gap-2">
            {[
              [0, 'Unuttum', 'danger'],
              [3, 'Zor', 'secondary'],
              [4, 'İyi', 'success'],
              [5, 'Kolay', 'butter'],
            ].map(([g, l, v]) => (
              <Button key={g as number} size="sm" variant={v as 'danger'} onClick={() => grade(g as number)} loading={submit.isPending && i + 1 >= words.length}>{l as string}</Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function WordList() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'' | 'due' | 'mastered'>('')
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['words', filter, q],
    queryFn: () => get<{ data: Word[]; stats: { total: number; due: number; mastered: number } }>(`/words?${new URLSearchParams({ ...(filter && { filter }), ...(q && { q }) })}`),
  })
  const remove = useMutation({ mutationFn: (id: number) => del(`/words/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] }) })

  return (
    <div>
      {data && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[['Toplam', data.stats.total, 'bg-card'], ['Tekrar zamanı', data.stats.due, 'bg-butter text-ink'], ['Ustalaşılan', data.stats.mastered, 'bg-mint text-white']].map(([l, v, c]) => (
            <div key={l as string} className={clsx('rounded-2xl border-2 border-line p-4 shadow-hard-sm', c as string)}>
              <p className="font-display text-3xl font-extrabold">{v as number}</p>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">{l as string}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Tabs value={filter} onChange={setFilter} items={[{ value: '', label: 'Tümü' }, { value: 'due', label: 'Tekrar zamanı' }, { value: 'mastered', label: 'Ustalaşılan' }]} />
        <label className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className="h-9 rounded-xl border-2 border-line bg-card pl-9 pr-3 text-sm font-semibold focus:outline-none" />
        </label>
      </div>
      {isLoading ? <SkeletonPage variant="list" /> : !data?.data.length ? (
        <Empty icon={<Layers className="size-8" />} title="Henüz kelime yok" text="Hikayelerde kelimelere dokunarak defterini doldur." action={<Link to="/stories" className="font-bold text-flame">Hikayelere git →</Link>} />
      ) : (
        <ul className="ink-card divide-y-2 divide-line/10">
          {data.data.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => speak(w.word)} className="text-sky" aria-label="Dinle"><Volume2 className="size-5" /></button>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{w.word}</p>
                <p className="truncate text-sm text-ink-soft">{w.translation ?? '—'}</p>
              </div>
              <span className={clsx('rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold', w.interval_days >= 21 ? 'bg-mint' : w.interval_days >= 3 ? 'bg-butter' : 'bg-paper-2')}>
                {w.interval_days >= 21 ? 'Usta' : w.interval_days >= 3 ? 'Öğreniyor' : 'Yeni'}
              </span>
              <button onClick={() => remove.mutate(w.id)} className="text-ink-soft hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
