import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Gem } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { num } from '@/lib/format'
import { sfx } from '@/lib/fx'
import type { Me, RewardItem, UserItem } from '@/lib/types'
import { ChestOpening, type ChestResult } from '@/components/game/ChestOpening'
import { rewardImg, img } from '@/lib/assets'
import { RARITY } from '@/components/game/RewardCard'
import { Button, LinkButton } from '@/components/ui/Button'
import { PageHeader, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

const GROUPS = [
  { title: 'Sandıklar', text: 'Olasılıklar açık, iş ortaklarımızdan hediyeler dahil.', types: ['chest'] },
  { title: 'Güçlendiriciler', text: 'XP takviyesi, can ve seri koruması.', types: ['xp_boost', 'streak_freeze', 'heart_refill'] },
  { title: 'Profil çerçeveleri', text: 'Profilinde ve liglerde görünür.', types: ['avatar_frame'] },
  { title: 'Premium', text: 'Elmaslarınla Premium günleri aç.', types: ['premium_days'] },
]

export default function Shop() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['shop'], queryFn: () => get<{ items: RewardItem[]; gems: number; heart_refill_gems: number }>('/shop') })
  const [chest, setChest] = useState<UserItem | null>(null)
  const buy = useMutation({
    mutationFn: (id: number) => post<{ user: Me; item: UserItem }>(`/shop/${id}/buy`),
    onSuccess: (r, id) => {
      setUser(r.user)
      qc.invalidateQueries({ queryKey: ['inventory'] })
      // A chest opens right away, straight into the ceremony.
      if (r.item?.item?.type === 'chest') return setChest({ ...r.item, odds: data?.items.find((x) => x.id === id)?.odds })
      sfx.reward()
      toast('Satın alındı! Kartın Ödül Kasası\'nda seni bekliyor.', 'success')
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const refill = useMutation({
    mutationFn: () => post<{ user: typeof user }>('/hearts/refill'),
    onSuccess: (r) => { setUser(r.user); toast('Canların doldu ❤️', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (isLoading || !data || !user) return <SkeletonPage variant="cards" />
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Elmaslarını harca" title="Mağaza">
        <span className="ink-chip bg-sky/10 text-lg"><Img src={img('rewards/gems.webp')} alt="" className="size-7" /> {num(user.stats.gems)}</span>
      </PageHeader>

      <section className="ink-card mb-8 flex flex-wrap items-center gap-5 p-5">
        <div className="flex -space-x-2">
          {Array.from({ length: 5 }, (_, i) => <Img key={i} src={img('rewards/heart.webp')} alt="" className={clsx('size-11 transition', !(i < user.hearts.hearts || user.hearts.unlimited) && 'opacity-25 grayscale')} />)}
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

      {GROUPS.map((g) => {
        const items = data.items.filter((it) => g.types.includes(it.type))
        if (!items.length) return null
        return (
          <section key={g.title} className="mb-10">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-extrabold">{g.title}</h2>
              <p className="text-sm text-ink-soft">{g.text}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => {
                const r = RARITY[it.rarity] ?? RARITY.common
                const afford = user.stats.gems >= (it.price_gems ?? 0)
                return (
                  <article key={it.id} className={clsx('ink-card group flex flex-col overflow-hidden', it.type === 'chest' && 'sm:col-span-2 lg:col-span-1')}>
                    <div className={clsx('relative grid h-36 place-items-center bg-gradient-to-b to-transparent', r.glow)}>
                      <span className={clsx('absolute left-4 top-3 text-[11px] font-extrabold uppercase tracking-widest', r.text)}>{r.label}</span>
                      <Img src={rewardImg(it.icon)} alt="" loading="lazy" className="size-28 object-contain drop-shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-2 px-5 pb-5 text-center">
                      <h3 className="font-display text-xl font-extrabold">{it.name}</h3>
                      <p className="flex-1 text-sm text-ink-soft">{it.description}</p>
                      {!!it.odds?.length && (
                        <ul className="mt-1 w-full space-y-1 rounded-2xl bg-paper-2 p-2.5 text-left text-xs font-bold">
                          {it.odds.map((o, k) => (
                            <li key={k} className="flex items-center gap-2">
                              <span className={clsx('size-2 shrink-0 rounded-full', { common: 'bg-mint', rare: 'bg-sky', epic: 'bg-berry', legendary: 'bg-butter' }[o.rarity])} />
                              <span className="min-w-0 flex-1 truncate">{o.label}</span>
                              <span className="tabular-nums text-ink-soft">%{o.chance}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button block className="mt-3" variant={afford ? 'primary' : 'secondary'} disabled={!afford} loading={buy.isPending && buy.variables === it.id} onClick={() => buy.mutate(it.id)} icon={<Gem className="size-4" />}>
                        {it.type === 'chest' && afford ? `${num(it.price_gems ?? 0)} · Aç` : num(it.price_gems ?? 0)}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
      {chest && <ChestOpening chest={chest.item} odds={chest.odds} onOpen={() => post<ChestResult & { user: Me }>(`/inventory/${chest.id}/activate`).then((r) => { setUser(r.user); qc.invalidateQueries({ queryKey: ['inventory'] }); return r })} onClose={() => setChest(null)} />}
    </div>
  )
}
