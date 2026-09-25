import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AudioLines, ChevronRight, Lock, MessageSquareText, PenLine } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { PHOTO, rewardImg, scenarioImg } from '@/lib/assets'
import { PageHeader, Progress, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { dateTR } from '@/lib/format'

interface Scenario { id: number; key: string; title: string; description: string; emoji: string; category: string; cefr_min: string; goals: string[]; is_premium: boolean; locked: boolean }
interface Usage { used: number; limit: number; remaining: number }

const CAT: Record<string, string> = { daily: 'Günlük hayat', travel: 'Seyahat', career: 'Kariyer', exam: 'Sınav', fun: 'Tartışma' }

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
  return (
    <div>
      <PageHeader kicker="Konuşma ve yazma" title="Ada ile pratik" />

      <section className="mb-10 overflow-hidden rounded-3xl border-2 border-line bg-card">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="p-6 sm:p-8">
            <h2 className="text-3xl">Merhaba, ben Ada.</h2>
            <p className="mt-2 text-lg text-ink-soft">Seviyeni, hedefini ve kaydettiğin kelimeleri biliyorum. Hatanı Türkçe açıklarım. İster yaz, ister sesli konuş.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              <ModeButton icon={AudioLines} label="Sesli sohbet" color="bg-flame" onClick={() => start.mutate({ mode: 'speaking' })} />
              <ModeButton icon={MessageSquareText} label="Yazılı sohbet" color="bg-sky" onClick={() => start.mutate({ mode: 'chat' })} />
              <ModeButton icon={PenLine} label="Yazma atölyesi" color="bg-mint" to="/ai/writing" />
            </div>
            <div className="mt-6 max-w-sm">
              <div className="mb-1.5 flex justify-between text-sm font-bold"><span className="text-ink-soft">Bugünkü mesaj hakkın</span><span>{data.usage.remaining}/{data.usage.limit}</span></div>
              <Progress value={data.usage.remaining} max={data.usage.limit} color="bg-sky" />
            </div>
          </div>
          <img src={PHOTO.adaWave} alt="Ada el sallıyor" className="h-full max-h-80 w-full object-cover md:max-h-none" />
        </div>
      </section>

      <h2 className="text-2xl">Rol yapma görevleri</h2>
      <p className="mb-5 text-ink-soft">Gerçek hayattan sahneler. Görevleri tamamla, özgüvenini kazan.</p>
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {data.data.map((s) => (
          <button key={s.key} onClick={() => (s.locked ? nav('/premium') : start.mutate({ mode: 'roleplay', scenario_key: s.key }))} className="group overflow-hidden rounded-3xl border-2 border-line bg-card text-left transition hover:-translate-y-1 hover:shadow-soft">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img src={scenarioImg(s.key)} alt="" loading="lazy" className={clsx('photo transition duration-700 group-hover:scale-105', s.locked && 'grayscale-[40%]')} />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span className="rounded-lg bg-card/95 px-2 py-0.5 text-xs font-black">{s.cefr_min}+</span>
                <span className="rounded-lg bg-card/95 px-2 py-0.5 text-xs font-black">{CAT[s.category] ?? s.category}</span>
              </div>
              {s.is_premium && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-butter px-2 py-0.5 text-xs font-black text-[#1f2433]">
                  {s.locked ? <Lock className="size-3.5" /> : <img src={rewardImg('crown')} alt="" className="size-4" />} Premium
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black">{s.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{s.description}</p>
                <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-mint-deep">{s.goals?.length ?? 0} görev</p>
              </div>
              <ChevronRight className="size-5 text-ink-soft transition group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>

      {!!convs.data?.data.length && (
        <section className="mt-12">
          <h2 className="mb-3 text-xl">Son sohbetlerin</h2>
          <div className="divide-y-2 divide-line overflow-hidden rounded-2xl border-2 border-line bg-card">
            {convs.data.data.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/ai/${c.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-paper-2">
                <span className="font-bold">{c.title}</span>
                <span className="text-sm text-ink-soft">{dateTR(c.updated_at)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ModeButton({ icon: Icon, label, color, onClick, to }: { icon: typeof PenLine; label: string; color: string; onClick?: () => void; to?: string }) {
  const cls = 'press flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-3 text-left font-black shadow-hard hover:bg-paper-2'
  const inner = (
    <>
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl text-white', color)}><Icon className="size-5" /></span>
      {label}
    </>
  )
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>
}
