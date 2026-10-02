import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Gem } from 'lucide-react'
import { ApiError, get, patch, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { num } from '@/lib/format'
import { sfx } from '@/lib/fx'
import type { Me, RewardItem, UserItem } from '@/lib/types'
import { ChestOpening, type ChestResult } from '@/components/game/ChestOpening'
import { rewardImg, img } from '@/lib/assets'
import { RARITY } from '@/components/game/RewardCard'
import { Button, LinkButton } from '@/components/ui/Button'
import { PageHeader, SkeletonPage } from '@/components/ui/Misc'
import { UserAvatar } from '@/components/game/UserAvatar'
import { ProfileBanner } from '@/components/game/ProfileBanner'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

type LookFilter = 'all' | 'avatar_frame' | 'profile_banner'
const LOOK_FILTERS: { value: LookFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'avatar_frame', label: 'Çerçeveler' },
  { value: 'profile_banner', label: 'Arka plan kapakları' },
]
type TabKey = 'look' | 'boost' | 'pack' | 'chest' | 'premium'
const GROUPS: { key: TabKey; title: string; art: string; text: string; types: string[] }[] = [
  { key: 'look', title: 'Görünüm', art: 'frame', text: 'Çerçeveler fotoğrafını, arka plan kapakları profilinin üst kısmını süsler. Herkes görür.', types: ['avatar_frame', 'profile_banner'] },
  { key: 'boost', title: 'Güçlendirici', art: 'boost', text: 'XP takviyesi, can ve seri koruması.', types: ['xp_boost', 'streak_freeze', 'heart_refill'] },
  { key: 'pack', title: 'Paketler', art: 'gems', text: 'Birlikte al, daha az öde. Paket açılınca kartlar kasana düşer.', types: ['bundle'] },
  { key: 'chest', title: 'Sandıklar', art: 'chest', text: 'Sandığı aç, içinden elmas, güçlendirici ya da iş ortağı hediyesi çıksın. Neler çıkabileceğini açtıktan sonra görürsün.', types: ['chest'] },
  { key: 'premium', title: 'Premium', art: 'crown', text: 'Elmaslarınla Premium günleri aç.', types: ['premium_days'] },
]

export default function Shop() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['shop'], queryFn: () => get<{ items: RewardItem[]; gems: number; heart_refill_gems: number }>('/shop') })
  const [chest, setChest] = useState<UserItem | null>(null)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<TabKey>(() => (GROUPS.some((g) => g.key === params.get('tab')) ? (params.get('tab') as TabKey) : 'look'))
  const [look, setLook] = useState<LookFilter>('all')
  const wear = useMutation({
    mutationFn: (b: { frame?: string | null; banner?: string | null }) => patch<{ user: Me }>('/account', b),
    onSuccess: (r) => { setUser(r.user); toast('Profilinde! Ligde ve arenada artık böyle görünüyorsun.', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const buy = useMutation({
    mutationFn: (id: number) => post<{ user: Me; item: UserItem }>(`/shop/${id}/buy`),
    onSuccess: (r, id) => {
      setUser(r.user)
      qc.invalidateQueries({ queryKey: ['inventory'] })
      // A chest opens right away, straight into the ceremony.
      if (r.item?.item?.type === 'chest') return setChest({ ...r.item, odds: data?.items.find((x) => x.id === id)?.odds })
      // A frame or cover is worn straight away.
      const v = r.item?.item?.value as { frame?: string; banner?: string } | undefined
      if (r.item?.item?.type === 'avatar_frame' && v?.frame) return wear.mutate({ frame: v.frame })
      if (r.item?.item?.type === 'profile_banner' && v?.banner) return wear.mutate({ banner: v.banner })
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
      <PageHeader kicker="Elmasla al, hemen kullan" title="Mağaza">
        <span className="ink-chip bg-sky/10 text-lg"><Img src={img('rewards/gems.webp')} alt="" className="size-7" /> {num(user.stats.gems)}</span>
      </PageHeader>

      <section className="ink-card mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex -space-x-2">
          {Array.from({ length: 5 }, (_, i) => <Img key={i} src={img('rewards/heart.webp')} alt="" className={clsx('size-10 transition sm:size-11', !(i < user.hearts.hearts || user.hearts.unlimited) && 'opacity-25 grayscale')} />)}
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

      {/* Categories as tiles that all fit on screen: no hidden tabs to scroll sideways for. */}
      <div role="tablist" aria-label="Mağaza bölümleri" className="sticky top-[64px] z-20 -mx-4 mb-5 grid auto-cols-fr grid-flow-col gap-1.5 bg-paper/90 px-4 py-2 backdrop-blur sm:mx-0 sm:gap-2 sm:px-0">
        {GROUPS.filter((g) => data.items.some((it) => g.types.includes(it.type))).map((g) => (
          <button key={g.key} role="tab" aria-selected={tab === g.key} onClick={() => setTab(g.key)}
            className={clsx('flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border-2 px-1 py-1.5 text-[11px] font-extrabold transition sm:flex-row sm:justify-center sm:gap-2 sm:py-2 sm:text-sm', tab === g.key ? 'border-ink bg-card text-ink shadow-[0_3px_0_var(--color-ink)]' : 'border-line bg-card text-ink-soft hover:text-ink')}>
            <Img src={rewardImg(g.art)} alt="" className={clsx('size-7 object-contain transition sm:size-8', tab !== g.key && 'opacity-70 grayscale-[.4]')} />
            <span className="max-w-full truncate">{g.title}</span>
          </button>
        ))}
      </div>
      {GROUPS.filter((g) => g.key === tab).map((g) => {
        const items = data.items.filter((it) => g.types.includes(it.type) && (g.key !== 'look' || look === 'all' || it.type === look))
        return (
          <section key={g.title} className="mb-10">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-soft">{g.text}</p>
              {g.key === 'look' && (
                <div role="radiogroup" aria-label="Görünüm filtresi" className="flex flex-wrap gap-1.5">
                  {LOOK_FILTERS.map((f) => (
                    <button key={f.value} role="radio" aria-checked={look === f.value} onClick={() => setLook(f.value)} className={clsx('rounded-full px-3.5 py-1.5 text-sm font-bold transition', look === f.value ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-soft hover:text-ink')}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => {
                const r = RARITY[it.rarity] ?? RARITY.common
                const afford = user.stats.gems >= (it.price_gems ?? 0)
                const val = (it.value ?? {}) as { frame?: string; banner?: string; items?: { item: string; qty: number }[] }
                const cos = it.type === 'avatar_frame' ? val.frame : it.type === 'profile_banner' ? val.banner : undefined
                const owned = !!cos && [...(user.cosmetics?.frames ?? []), ...(user.cosmetics?.banners ?? [])].includes(cos)
                const worn = !!cos && (user.frame === cos || user.banner === cos)
                return (
                  <article key={it.id} className={clsx('ink-card group flex flex-col overflow-hidden', it.type === 'chest' && 'sm:col-span-2 lg:col-span-1')}>
                    <div className={clsx('relative grid place-items-center overflow-hidden bg-gradient-to-b to-transparent', it.type === 'profile_banner' ? 'aspect-[21/9]' : 'h-36', r.glow)}>
                      {it.type === 'profile_banner' && <ProfileBanner banner={val.banner} className="absolute inset-0" />}
                      <span className={clsx('absolute left-3 top-3 z-10 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-widest', r.text, it.type === 'profile_banner' && 'bg-white/90 shadow-sm')}>{r.label}</span>
                      {it.type === 'avatar_frame' ? (
                        <UserAvatar name={user.name} avatar={user.avatar} frame={val.frame} className="size-28 transition duration-300 group-hover:scale-105" rounded="rounded-full" />
                      ) : it.type === 'profile_banner' ? (
                        <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
                      ) : (
                        <Img src={rewardImg(it.icon)} alt="" loading="lazy" className="size-28 object-contain drop-shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-2 px-5 pb-5 text-center">
                      <h3 className="font-display text-xl font-extrabold">{it.name}</h3>
                      <p className="flex-1 text-sm text-ink-soft">{it.description}</p>
                      <span className="rounded-full bg-paper-2 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
                        {it.type === 'avatar_frame' ? 'Profil çerçevesi · alınca takılır' : it.type === 'profile_banner' ? 'Profil arka planı · alınca takılır' : it.type === 'chest' ? 'Sandık · hemen açılır' : it.type === 'bundle' ? 'Paket · kasana düşer' : 'Kasana düşer, istediğinde kullan'}
                      </span>
                      {it.type === 'bundle' && !!val.items?.length && (
                        <ul className="flex flex-wrap justify-center gap-1.5">
                          {val.items.map((x) => <li key={x.item} className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-bold">{x.qty} × {data.items.find((d) => d.key === x.item)?.name ?? x.item}</li>)}
                        </ul>
                      )}
                      {owned ? (
                        <Button block className="mt-3" variant={worn ? 'secondary' : 'success'} disabled={worn} loading={wear.isPending} onClick={() => wear.mutate(it.type === 'avatar_frame' ? { frame: cos } : { banner: cos })}>
                          {worn ? 'Takılı' : 'Sende · Tak'}
                        </Button>
                      ) : (
                        <Button block className="mt-3" variant={afford ? 'primary' : 'secondary'} disabled={!afford} loading={buy.isPending && buy.variables === it.id} onClick={() => buy.mutate(it.id)} icon={<Gem className="size-4" />}>
                          {it.type === 'chest' && afford ? `${num(it.price_gems ?? 0)} · Aç` : afford ? num(it.price_gems ?? 0) : `${num((it.price_gems ?? 0) - user.stats.gems)} elmas eksik`}
                        </Button>
                      )}
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
