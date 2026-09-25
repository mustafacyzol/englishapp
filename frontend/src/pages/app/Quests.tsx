import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Clock } from 'lucide-react'
import { img } from '@/lib/assets'
import { get, post } from '@/lib/api'
import { timeLeft } from '@/lib/format'
import { celebrate, sfx } from '@/lib/fx'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { PageHeader, Progress, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

interface Quest { id: number; title: string; period: 'daily' | 'weekly'; target: number; progress: number; completed: boolean; claimed: boolean; reward_gems: number; reward_xp: number; reward_item_key: string | null }

export default function Quests() {
  const qc = useQueryClient()
  const toast = useToast()
  const { refresh } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['quests'], queryFn: () => get<{ data: Quest[]; resets: { daily: string; weekly: string } }>('/quests') })
  const claim = useMutation({
    mutationFn: (id: number) => post<{ gems: number; item: { item: { name: string } } | null }>(`/quests/${id}/claim`),
    onSuccess: (r) => {
      celebrate()
      sfx.fanfare()
      toast(`+${r.gems} elmas${r.item ? ` ve ${r.item.item.name} kartı` : ''}!`, 'success')
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      refresh()
    },
  })
  if (isLoading || !data) return <SkeletonPage variant="list" />

  const section = (period: 'daily' | 'weekly', title: string, reset: string) => (
    <section className="mb-10">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <span className="flex items-center gap-1 text-sm font-bold text-ink-soft"><Clock className="size-4" /> {timeLeft(reset)}</span>
      </div>
      <div className="grid gap-3">
        {data.data.filter((q) => q.period === period).map((q) => (
          <div key={q.id} className={clsx('ink-card flex items-center gap-4 p-4 transition', q.claimed && 'opacity-60')}>
            <span className={clsx('grid size-16 shrink-0 place-items-center rounded-2xl', q.completed ? 'bg-butter/25' : 'bg-paper-2')}>
              <Img src={img(q.reward_item_key ? 'rewards/chest.webp' : 'rewards/gems.webp')} alt="" className={clsx('size-12 object-contain', q.completed && !q.claimed && 'animate-bounce')} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-extrabold">{q.title}</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={q.progress} max={q.target} color={q.completed ? 'bg-flame' : 'bg-sky'} className="flex-1" />
                <span className="font-mono text-xs font-bold">{q.progress}/{q.target}</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-ink-soft"><Img src={img('rewards/gems.webp')} alt="" className="size-4" /> {q.reward_gems} elmas{q.reward_xp ? ` · ${q.reward_xp} XP` : ''}{q.reward_item_key && ' + ödül kartı'}</p>
            </div>
            {q.completed && !q.claimed && <Button size="sm" variant="butter" loading={claim.isPending && claim.variables === q.id} onClick={() => claim.mutate(q.id)}>Al</Button>}
            {q.claimed && <span className="text-sm font-bold text-mint-deep">Alındı ✓</span>}
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader kicker="Her gün yenilenir" title="Görevler" />
      {section('daily', 'Günlük görevler', data.resets.daily)}
      {section('weekly', 'Haftalık meydan okumalar', data.resets.weekly)}
    </div>
  )
}
