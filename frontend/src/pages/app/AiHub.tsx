import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AudioLines, Crown, Lock, MessageSquareText, PenLine } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { Ada } from '@/components/game/Ada'
import { PageHeader, Progress, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { dateTR } from '@/lib/format'

interface Scenario { id: number; key: string; title: string; description: string; emoji: string; category: string; cefr_min: string; goals: string[]; is_premium: boolean; locked: boolean }
interface Usage { used: number; limit: number; remaining: number }

const CAT: Record<string, string> = { daily: 'Günlük hayat', travel: 'Seyahat', career: 'Kariyer', exam: 'Sınav', fun: 'Eğlence' }

export default function AiHub() {
  const nav = useNavigate()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['scenarios'], queryFn: () => get<{ data: Scenario[]; usage: Usage }>('/ai/scenarios') })
  const convs = useQuery({ queryKey: ['conversations'], queryFn: () => get<{ data: { id: number; title: string; mode: string; updated_at: string }[] }>('/ai/conversations') })
  const start = useMutation({
    mutationFn: (b: { mode: string; scenario_key?: string }) => post<{ conversation: { id: number } }>('/ai/conversations', b),
    onSuccess: (r) => nav(`/ai/${r.conversation.id}`),
    onError: (e: ApiError) => (e.status === 402 ? nav('/premium') : toast(e.message, 'error')),
  })

  if (isLoading || !data) return <Spinner />
  const groups = Object.entries(
    data.data.reduce<Record<string, Scenario[]>>((acc, s) => {
      ;(acc[s.category] ??= []).push(s)
      return acc
    }, {}),
  )

  return (
    <div>
      <PageHeader kicker="Konuş & yaz" title="Ada ile pratik" />
      <section className="ink-card relative mb-8 overflow-hidden bg-sky p-6 text-white sm:p-8">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-extrabold">Merhaba, ben Ada 👋</h2>
          <p className="mt-2 text-white/90">Seviyeni, hedefini ve kaydettiğin kelimeleri biliyorum. Hatalarını Türkçe açıklarım, seni asla yargılamam. Yaz ya da sesli konuş!</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => start.mutate({ mode: 'speaking' })} className="press flex items-center gap-2 rounded-2xl border-2 border-line bg-flame px-4 py-3 font-display font-extrabold uppercase shadow-hard"><AudioLines className="size-5" /> Sesli sohbet</button>
            <button onClick={() => start.mutate({ mode: 'chat' })} className="press flex items-center gap-2 rounded-2xl border-2 border-line bg-card px-4 py-3 font-display font-extrabold uppercase text-ink shadow-hard"><MessageSquareText className="size-5" /> Yazılı sohbet</button>
            <Link to="/ai/writing" className="press flex items-center gap-2 rounded-2xl border-2 border-line bg-butter px-4 py-3 font-display font-extrabold uppercase text-[#1B1F3B] shadow-hard"><PenLine className="size-5" /> Yazma atölyesi</Link>
          </div>
          <div className="mt-6 max-w-xs">
            <div className="mb-1 flex justify-between text-xs font-bold"><span>Bugünkü mesaj hakkın</span><span>{data.usage.remaining}/{data.usage.limit}</span></div>
            <Progress value={data.usage.remaining} max={data.usage.limit} color="bg-butter" />
          </div>
        </div>
        <Ada className="absolute -bottom-6 -right-6 size-48 opacity-95 sm:size-60" />
      </section>

      <h2 className="mb-1 text-2xl font-extrabold">Rol yapma görevleri</h2>
      <p className="mb-5 text-ink-soft">Gerçek hayattan sahneler. Görevleri tamamla, özgüvenini kazan.</p>
      {groups.map(([cat, list]) => (
        <section key={cat} className="mb-8">
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-ink-soft">{CAT[cat] ?? cat}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((s) => (
              <button key={s.key} onClick={() => (s.locked ? nav('/premium') : start.mutate({ mode: 'roleplay', scenario_key: s.key }))} className={clsx('press ink-card flex gap-4 p-5 text-left', s.locked && 'opacity-80')}>
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-line bg-paper-2 text-3xl">{s.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-lg font-extrabold">{s.title}</span>
                    <span className="rounded-md border-2 border-line px-1.5 font-mono text-[10px] font-bold">{s.cefr_min}+</span>
                    {s.is_premium && (s.locked ? <Lock className="size-4 text-ink-soft" /> : <Crown className="size-4 text-flame" />)}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{s.description}</span>
                  <span className="mt-2 block text-xs font-bold text-mint-deep">{s.goals?.length ?? 0} görev</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {!!convs.data?.data.length && (
        <section>
          <h2 className="mb-3 text-xl font-extrabold">Son sohbetlerin</h2>
          <div className="ink-card divide-y-2 divide-line/10">
            {convs.data.data.slice(0, 8).map((c) => (
              <Link key={c.id} to={`/ai/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-paper-2">
                <span className="font-bold">{c.title}</span>
                <span className="text-xs text-ink-soft">{dateTR(c.updated_at)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
