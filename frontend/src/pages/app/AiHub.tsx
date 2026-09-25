import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AudioLines, ChevronRight, Lock, MessageSquareText, PenLine } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { PHOTO, rewardImg, scenarioImg } from '@/lib/assets'
import { PageHeader, Progress, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { dateTR } from '@/lib/format'
import { Img } from '@/components/ui/Img'

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

  if (isLoading || !data) return <SkeletonPage variant="cards" />
  return (
    <div>
      <PageHeader kicker="Konuşma ve yazma" title="Ada ile pratik" />

      {/* Ada portrait on the left, three clear mode cards on the right. */}
      <section className="mb-10 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="relative overflow-hidden rounded-3xl">
          <Img src={PHOTO.adaWave} alt="Ada, yapay zekâ İngilizce öğretmenin" className="photo min-h-64" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 text-white">
            <p className="flex items-center gap-1.5 text-sm font-black">
              <span className="size-2 rounded-full bg-mint ring-4 ring-mint/30" /> Ada · çevrim içi
            </p>
            <p className="mt-1 text-sm text-white/85">Seviyeni, hedefini ve kaydettiğin kelimeleri bilir. Hatanı Türkçe açıklar.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModeCard icon={AudioLines} title="Sesli sohbet" text="Konuş, telaffuzun düzeltilsin" color="flame" onClick={() => start.mutate({ mode: 'speaking' })} loading={start.isPending} />
            <ModeCard icon={MessageSquareText} title="Yazılı sohbet" text="Serbest sohbet, anında düzeltme" color="sky" onClick={() => start.mutate({ mode: 'chat' })} loading={start.isPending} />
            <ModeCard icon={PenLine} title="Yazma atölyesi" text="Metnini puanla, hataları gör" color="mint" to="/ai/writing" />
          </div>
          <div className="mt-auto rounded-2xl border-2 border-line bg-card p-4">
            <div className="mb-1.5 flex justify-between text-sm font-bold"><span className="text-ink-soft">Bugünkü mesaj hakkın</span><span>{data.usage.remaining}/{data.usage.limit}</span></div>
            <Progress value={data.usage.remaining} max={data.usage.limit} color="bg-sky" />
          </div>
        </div>
      </section>

      <h2 className="text-2xl">Rol yapma görevleri</h2>
      <p className="mb-5 text-ink-soft">Gerçek hayattan sahneler. Görevleri tamamla, özgüvenini kazan.</p>
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {data.data.map((s) => (
          <button key={s.key} onClick={() => (s.locked ? nav('/premium') : start.mutate({ mode: 'roleplay', scenario_key: s.key }))} className="group overflow-hidden rounded-3xl border-2 border-line bg-card text-left transition hover:-translate-y-1 hover:shadow-soft">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Img src={scenarioImg(s.key)} alt="" loading="lazy" className={clsx('photo transition duration-700 group-hover:scale-105', s.locked && 'grayscale-[40%]')} />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span className="rounded-lg bg-card/95 px-2 py-0.5 text-xs font-black">{s.cefr_min}+</span>
                <span className="rounded-lg bg-card/95 px-2 py-0.5 text-xs font-black">{CAT[s.category] ?? s.category}</span>
              </div>
              {s.is_premium && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-butter px-2 py-0.5 text-xs font-black text-[#1f2433]">
                  {s.locked ? <Lock className="size-3.5" /> : <Img src={rewardImg('crown')} alt="" className="size-4" />} Premium
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

const MODE_ACCENT: Record<string, { solid: string; tint: string; ring: string }> = {
  flame: { solid: 'bg-flame', tint: 'from-flame/10', ring: 'hover:border-flame/40' },
  sky: { solid: 'bg-sky', tint: 'from-sky/10', ring: 'hover:border-sky/40' },
  mint: { solid: 'bg-mint', tint: 'from-mint/10', ring: 'hover:border-mint/40' },
}

function ModeCard({ icon: Icon, title, text, color, onClick, to, loading }: { icon: typeof PenLine; title: string; text: string; color: string; onClick?: () => void; to?: string; loading?: boolean }) {
  const a = MODE_ACCENT[color]
  const cls = clsx('press group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-line bg-card p-5 text-left transition hover:-translate-y-1 hover:shadow-soft', a.ring)
  const inner = (
    <>
      <span aria-hidden className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent opacity-0 transition group-hover:opacity-100', a.tint)} />
      <span className={clsx('relative grid size-12 place-items-center rounded-2xl text-white shadow-hard-sm transition group-hover:scale-110', a.solid)}>
        <Icon className="size-6" />
      </span>
      <p className="relative mt-4 font-display text-lg font-black leading-tight">{title}</p>
      <p className="relative mt-1 text-sm text-ink-soft">{text}</p>
      {loading && <span className="absolute right-4 top-4 size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />}
    </>
  )
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} disabled={loading} className={cls}>{inner}</button>
}
