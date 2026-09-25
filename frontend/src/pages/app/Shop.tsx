import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Gem } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { num } from '@/lib/format'
import { sfx } from '@/lib/fx'
import type { RewardItem } from '@/lib/types'
import { rewardImg, img } from '@/lib/assets'
import { RARITY } from '@/components/game/RewardCard'
import { Button, LinkButton } from '@/components/ui/Button'
import { PageHeader, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'

export default function Shop() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['shop'], queryFn: () => get<{ items: RewardItem[]; gems: number; heart_refill_gems: number }>('/shop') })
  const buy = useMutation({
    mutationFn: (id: number) => post<{ user: typeof user }>(`/shop/${id}/buy`),
    onSuccess: (r) => {
      sfx.fanfare()
      setUser(r.user)
      toast('Satın alındı! Kartın Ödül Kasası\'nda seni bekliyor.', 'success')
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const refill = useMutation({
    mutationFn: () => post<{ user: typeof user }>('/hearts/refill'),
    onSuccess: (r) => { setUser(r.user); toast('Canların doldu ❤️', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (isLoading || !data || !user) return <Spinner />
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Elmaslarını harca" title="Mağaza">
        <span className="ink-chip bg-sky/10 text-lg"><img src={img('rewards/gems.webp')} alt="" className="size-7" /> {num(user.stats.gems)}</span>
      </PageHeader>

      <section className="ink-card mb-8 flex flex-wrap items-center gap-5 p-5">
        <div className="flex -space-x-2">
          {Array.from({ length: 5 }, (_, i) => <img key={i} src={img('rewards/heart.webp')} alt="" className={clsx('size-11 transition', !(i < user.hearts.hearts || user.hearts.unlimited) && 'opacity-25 grayscale')} />)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-extrabold">{user.hearts.unlimited ? 'Sınırsız can' : `${user.hearts.hearts}/5 can`}</p>
          <p className="text-sm text-ink-soft">{user.hearts.unlimited ? 'Premium üyeliğin sayesinde.' : 'Her 30 dakikada 1 can yenilenir. Pratik sekmesinde kelime tekrarı yaparak da kazanabilirsin.'}</p>
        </div>
        {!user.hearts.unlimited && (
          <div className="flex gap-2">
            <Button variant="butter" disabled={user.hearts.hearts >= 5} loading={refill.isPending} onClick={() => refill.mutate()} icon={<Gem className="size-4" />}>{data.heart_refill_gems}</Button>
            <LinkButton to="/premium" variant="dark">Sınırsız</LinkButton>
          </div>
        )}
      </section>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((it) => {
          const r = RARITY[it.rarity] ?? RARITY.common
          return (
            <article key={it.id} className="ink-card flex flex-col overflow-hidden">
              <div className={clsx('relative grid h-36 place-items-center bg-gradient-to-b to-transparent', r.glow)}>
                <span className={clsx('absolute left-4 top-3 text-[11px] font-extrabold uppercase tracking-widest', r.text)}>{r.label}</span>
                <img src={rewardImg(it.icon)} alt="" loading="lazy" className="size-28 object-contain drop-shadow-lg transition duration-300 hover:-translate-y-1 hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col items-center gap-2 px-5 pb-5 text-center">
                <h3 className="font-display text-xl font-extrabold">{it.name}</h3>
                <p className="flex-1 text-sm text-ink-soft">{it.description}</p>
                <Button block className="mt-3" variant={user.stats.gems >= (it.price_gems ?? 0) ? 'primary' : 'secondary'} disabled={user.stats.gems < (it.price_gems ?? 0)} loading={buy.isPending && buy.variables === it.id} onClick={() => buy.mutate(it.id)} icon={<Gem className="size-4" />}>
                  {num(it.price_gems ?? 0)}
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
