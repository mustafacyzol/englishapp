import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Copy, Lock, Share2 } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { celebrate, sfx } from '@/lib/fx'
import { dateTR } from '@/lib/format'
import { rewardImg } from '@/lib/assets'
import type { Me, UserItem } from '@/lib/types'
import { RewardCard } from '@/components/game/RewardCard'
import { ChestOpening, type ChestResult } from '@/components/game/ChestOpening'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Empty, PageHeader, Progress, SkeletonPage, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

type Tab = 'vault' | 'kupon' | 'yol' | 'redeem' | 'invite'
const HASH: Record<string, Tab> = { '#yol': 'yol', '#kuponlar': 'kupon' }

export default function Rewards() {
  const { hash } = useLocation()
  const [tab, setTab] = useState<Tab>(() => HASH[hash] ?? 'vault')
  useEffect(() => {
    if (HASH[hash]) setTab(HASH[hash])
  }, [hash])
  // Partner gifts get their own tab the moment one is won, so they never hide among cards.
  const coupons = useQuery({ queryKey: ['coupons'], queryFn: () => get<{ data: UserItem[] }>('/coupons') })
  const live = coupons.data?.data.filter((c) => c.status === 'active').length ?? 0
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader kicker="Kazandıkların" title="Ödüller" />
      <div className="mb-8">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'vault', label: 'Kasam' }, ...(coupons.data?.data.length ? [{ value: 'kupon' as Tab, label: live ? `Kuponlarım (${live})` : 'Kuponlarım' }] : []), { value: 'yol', label: 'Nasıl kazanırım?' }, { value: 'redeem', label: 'Kod kullan' }, { value: 'invite', label: 'Arkadaş davet et' }]} />
      </div>
      {tab === 'vault' && <Vault />}
      {tab === 'kupon' && <Coupons list={coupons.data?.data} />}
      {tab === 'yol' && <Roadmap />}
      {tab === 'redeem' && <Redeem />}
      {tab === 'invite' && <Invite />}
    </div>
  )
}

function Vault() {
  const qc = useQueryClient()
  const { setUser } = useAuth()
  const toast = useToast()
  const [flipped, setFlipped] = useState<Record<number, { message: string; code?: string; img: string }>>({})
  const [filter, setFilter] = useState<'open' | 'history'>('open')
  const [chest, setChest] = useState<UserItem | null>(null)
  const openChest = async (e: UserItem) => {
    const r = await post<ChestResult & { user: Me }>(`/inventory/${e.id}/activate`)
    setUser(r.user)
    qc.invalidateQueries({ queryKey: ['inventory'] })
    return r
  }
  const { data, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: () => get<{ data: UserItem[] }>('/inventory') })

  const activate = useMutation({
    mutationFn: (e: UserItem) => post<{ message: string; extra?: { code?: string; prize?: { item?: { item: { icon: string } } } }; user: Me }>(`/inventory/${e.id}/activate`),
    onSuccess: (r, e) => {
      const prizeIcon = r.extra?.prize?.item?.item.icon
      setFlipped((f) => ({ ...f, [e.id]: { message: r.message, code: r.extra?.code, img: rewardImg(prizeIcon ?? (e.item.type === 'chest' ? 'gem' : e.item.icon)) } }))
      celebrate()
      sfx.reward()
      setUser(r.user)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['inventory'] }), 5000)
    },
    onError: (err: ApiError) => toast(err.first(), 'error'),
  })

  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const open = data.data.filter((i) => i.status === 'available' || i.status === 'active')
  const history = data.data.filter((i) => i.status === 'used' || i.status === 'expired')
  const list = filter === 'open' ? open : history

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-ink-soft">Seriden, rozetlerden, görevlerden ve liglerden kazandığın kartlar burada birikir. İstediğin an aç.</p>
        <Tabs value={filter} onChange={setFilter} items={[{ value: 'open', label: `Hazır (${open.length})` }, { value: 'history', label: 'Geçmiş' }]} />
      </div>
      {!list.length ? (
        <Empty icon={<Img src={rewardImg('chest')} alt="" className="size-12 object-contain opacity-60" />} title="Kasan şimdilik boş" text="Günlük hedefini tamamla, serini sürdür, görevleri bitir. Kartlar burada birikecek." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => {
            const f = flipped[e.id]
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <RewardCard
                  entry={e}
                  flipped={!!f}
                  back={
                    f && (
                      <>
                        <motion.img initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.25 }} src={f.img} alt="" className="size-28 object-contain" />
                        <p className="text-xl font-black leading-snug">{f.message}</p>
                        {f.code && (
                          <button onClick={() => { navigator.clipboard?.writeText(f.code!).catch(() => {}); toast('Kod kopyalandı', 'success') }} className="flex items-center gap-2 rounded-xl bg-paper-2 px-4 py-2 font-mono text-lg font-bold">
                            {f.code} <Copy className="size-4" />
                          </button>
                        )}
                      </>
                    )
                  }
                />
                <div className="mt-4 min-h-12">
                  {e.status === 'available' && e.item.type !== 'streak_freeze' && !f && (
                    <Button block variant="butter" loading={activate.isPending && activate.variables?.id === e.id} onClick={() => (e.item.type === 'chest' ? setChest(e) : activate.mutate(e))}>
                      {e.item.type === 'chest' ? 'Sandığı aç' : 'Kartı kullan'}
                    </Button>
                  )}
                  {e.item.type === 'streak_freeze' && e.status === 'available' && <p className="text-center text-sm font-bold text-sky">Hazır bekliyor · bir gün kaçırırsan serini otomatik korur</p>}
                  {e.meta?.offer && <p className="mb-1 text-center text-sm font-extrabold">{e.meta.partner}: {e.meta.offer}</p>}
                  {e.status === 'active' && e.code && <p className="text-center text-sm font-bold">Kodun: <span className="font-mono">{e.code}</span>{e.expires_at && <span className="text-ink-soft"> · {dateTR(e.expires_at)} tarihine kadar</span>}</p>}
                  {e.status === 'active' && !e.code && e.expires_at && <p className="text-center text-sm font-bold text-mint-deep">Aktif · {new Date(e.expires_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'e kadar</p>}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
      {chest && <ChestOpening chest={chest.item} odds={chest.odds} onOpen={() => openChest(chest)} onClose={() => setChest(null)} />}
    </>
  )
}

/** Won partner gifts as tickets: brand, the offer, the code to copy, expiry and "I used it". */
function Coupons({ list }: { list?: UserItem[] }) {
  const qc = useQueryClient()
  const toast = useToast()
  const used = useMutation({
    mutationFn: (id: number) => post(`/coupons/${id}/used`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); toast('Kupon kullanıldı olarak işaretlendi', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!list) return <SkeletonPage variant="cards" />
  if (!list.length) return <Empty icon={<Img src={rewardImg('ticket')} alt="" className="size-12 object-contain opacity-60" />} title="Henüz kuponun yok" text="Gizemli sandıklardan bazen iş ortaklarımızın hediyeleri çıkar. Kazandığında burada görünür." />
  const copy = (c: string) => { navigator.clipboard?.writeText(c).catch(() => {}); toast('Kod kopyalandı', 'success') }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {list.map((c, i) => {
        const m = c.meta ?? {}
        const on = c.status === 'active'
        const days = c.expires_at ? Math.max(0, Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 864e5)) : null
        return (
          <motion.article key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={clsx('relative flex overflow-hidden rounded-3xl border-2 border-line bg-card', !on && 'opacity-60 grayscale-[.6]')}>
            <div className="w-2 shrink-0" style={{ background: m.color ?? 'var(--color-flame)' }} />
            <div className="min-w-0 flex-1 p-5">
              <div className="flex items-center gap-3">
                {m.partner_logo ? <Img src={m.partner_logo} alt="" className="size-10 rounded-xl bg-paper-2 object-contain p-1" /> : <span className="grid size-10 place-items-center rounded-xl font-black text-white" style={{ background: m.color ?? 'var(--color-flame)' }}>{m.partner?.[0]}</span>}
                <div className="min-w-0">
                  <p className="truncate text-xs font-black uppercase tracking-wider text-ink-soft">{m.partner}</p>
                  <p className="font-display text-lg font-black leading-tight">{m.offer}</p>
                </div>
              </div>
              {m.description && <p className="mt-2 text-sm text-ink-soft">{m.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => on && c.code && copy(c.code)} disabled={!on} className="flex items-center gap-2 rounded-xl border-2 border-dashed border-ink/25 bg-paper-2 px-3 py-1.5 font-mono text-[15px] font-bold tracking-wider">
                  {c.code} {on && <Copy className="size-4 text-ink-soft" />}
                </button>
                <span className={clsx('rounded-full px-2.5 py-1 text-xs font-black', on ? (days !== null && days <= 3 ? 'bg-berry/12 text-berry' : 'bg-mint/15 text-mint-deep') : 'bg-paper-2 text-ink-soft')}>
                  {c.status === 'used' ? `Kullanıldı${m.used_at ? ` · ${dateTR(m.used_at)}` : ''}` : c.status === 'expired' ? 'Süresi doldu' : days === 0 ? 'Bugün son gün' : `${days} gün kaldı`}
                </span>
              </div>
              {m.terms && <p className="mt-3 text-[11px] leading-snug text-ink-soft">{m.terms}</p>}
              {on && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {m.partner_url && <a href={m.partner_url} target="_blank" rel="noreferrer" className="press rounded-xl bg-ink px-3.5 py-2 text-sm font-extrabold text-paper">Markaya git</a>}
                  <button onClick={() => used.mutate(c.id)} disabled={used.isPending} className="rounded-xl border-2 border-line px-3.5 py-2 text-sm font-bold hover:border-ink/30"><Check className="mr-1 inline size-4" />Kullandım</button>
                </div>
              )}
            </div>
          </motion.article>
        )
      })}
    </div>
  )
}

interface RoadmapData {
  streak: number
  level: number
  daily_goal_gems: number
  level_up_gems: number
  level_chest_every: number
  milestones: { days: number; title: string; icon: string; gems: number; claimed: boolean; current: number; target: number }[]
}

function Roadmap() {
  const { data, isLoading } = useQuery({ queryKey: ['roadmap'], queryFn: () => get<RoadmapData>('/rewards/roadmap') })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const WAYS = [
    { icon: 'gem', title: 'Günlük hedef', text: `Her gün hedefini tamamla: +${data.daily_goal_gems} elmas.` },
    { icon: 'crown', title: 'Seviye atla', text: `Her seviyede +${data.level_up_gems} elmas, her ${data.level_chest_every}. seviyede Gizemli Sandık.` },
    { icon: 'chest', title: 'Görevler', text: 'Günlük ve haftalık görevleri bitir, elmas ve kart topla.' },
    { icon: 'voucher', title: 'Lig', text: 'Haftayı ilk 3 bitir: elmas. Birinci ol: Gizemli Sandık.' },
  ]
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl">Seri ödülleri</h2>
            <p className="text-ink-soft">Serin büyüdükçe kasana özel kartlar düşer.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-flame/10 px-4 py-2">
            <Img src={rewardImg('flame')} alt="" className="size-7" />
            <span className="text-xl font-black text-flame">{data.streak} gün</span>
          </div>
        </div>
        <ol className="relative space-y-3">
          {data.milestones.map((m) => {
            const reached = data.streak >= m.days
            return (
              <li key={m.days} className={clsx('flex items-center gap-4 rounded-2xl border-2 p-4', m.claimed ? 'border-mint/40 bg-mint/8' : reached ? 'border-butter bg-butter/10' : 'border-line bg-card')}>
                <div className="w-16 shrink-0 text-center">
                  <p className="text-2xl font-black leading-none">{m.days}</p>
                  <p className="text-xs font-bold text-ink-soft">gün</p>
                </div>
                <Img src={rewardImg(m.icon)} alt="" className={clsx('size-14 object-contain', !reached && 'opacity-50 grayscale')} />
                <div className="min-w-0 flex-1">
                  <p className="font-black">{m.title}{m.gems > 0 && m.icon !== 'gem' && ` + ${m.gems} elmas`}</p>
                  {!m.claimed && <Progress value={m.current} max={m.target} color="bg-flame" className="mt-2 max-w-xs" />}
                </div>
                {m.claimed ? (
                  <span className="flex items-center gap-1 text-sm font-black text-mint-deep"><Check className="size-4" strokeWidth={3} /> Kazanıldı</span>
                ) : (
                  <Lock className="size-5 text-ink-soft" />
                )}
              </li>
            )
          })}
        </ol>
      </section>
      <section>
        <h2 className="mb-4 text-2xl">Başka nasıl kazanırım?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {WAYS.map((w) => (
            <div key={w.title} className="flex items-center gap-4 rounded-2xl border-2 border-line bg-card p-4">
              <Img src={rewardImg(w.icon)} alt="" className="size-14 object-contain" />
              <div>
                <p className="font-black">{w.title}</p>
                <p className="text-sm text-ink-soft">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Redeem() {
  const [code, setCode] = useState('')
  const { setUser } = useAuth()
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: () => post<{ message: string; user: Me }>('/redeem', { code }),
    onSuccess: (r) => {
      celebrate(true)
      setUser(r.user)
      setCode('')
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate() }} className="rounded-3xl border-2 border-line bg-card p-8 text-center">
        <Img src={rewardImg('coupon')} alt="" className="mx-auto mb-2 size-24 object-contain" />
        <h2 className="text-2xl">Hediye kodunu kullan</h2>
        <p className="mb-6 mt-1 text-ink-soft">Bayrak Dil Okulları kampanyalarından ya da hediye kartlarından gelen kodu gir.</p>
        <Input id="redeem-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DG-XXXX-XXXX" className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-widest" error={(m.error as ApiError | null)?.first('code')} />
        <Button type="submit" block className="mt-4" loading={m.isPending} disabled={code.length < 3}>Kodu kullan</Button>
        {m.data && <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 rounded-xl bg-mint/15 p-3 font-bold text-mint-deep">{m.data.message}</motion.p>}
      </form>
    </div>
  )
}

interface Ref { code: string; link: string; rewards: { referee_gems: number; referrer_gems: number; referrer_premium_days: number }; stats: { total: number; qualified: number; rewarded: number }; data: { name: string; username: string; status: string; joined_at: string }[] }

function Invite() {
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['referrals'], queryFn: () => get<Ref>('/referrals') })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'DilGO', text: `DilGO ile İngilizce öğreniyorum! Bu bağlantıyla katıl, ${data.rewards.referee_gems} elmas kazan:`, url: data.link })
      else {
        await navigator.clipboard.writeText(data.link)
        toast('Bağlantı kopyalandı!', 'success')
      }
    } catch {
      toast(data.link)
    }
  }
  const STATUS: Record<string, [string, string]> = { pending: ['Doğrulama bekliyor', 'bg-paper-2 text-ink-soft'], qualified: ['Katıldı', 'bg-butter/25'], rewarded: ['Premium aldı', 'bg-mint/15 text-mint-deep'] }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-3xl bg-flame p-7 text-white">
        <h2 className="text-3xl">Arkadaşını getir, birlikte kazanın</h2>
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3"><Img src={rewardImg('gem')} alt="" className="size-10" /><p className="font-bold">Arkadaşın e-postasını doğrulayınca: sana {data.rewards.referrer_gems}, ona {data.rewards.referee_gems} elmas</p></div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3"><Img src={rewardImg('crown')} alt="" className="size-10" /><p className="font-bold">İlk Premium alışverişinde: sana {data.rewards.referrer_premium_days} gün Premium kartı</p></div>
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-card p-2 text-ink">
          <span className="flex-1 truncate px-2 font-mono text-sm font-bold">{data.link}</span>
          <Button size="sm" variant="dark" onClick={share} icon={<Share2 className="size-4" />}>Paylaş</Button>
        </div>
        <p className="mt-3 text-sm font-semibold">Davet kodun: <span className="rounded-lg bg-white/20 px-2 py-0.5 font-mono font-bold">{data.code}</span></p>
      </section>
      <section className="rounded-3xl border-2 border-line bg-card p-6">
        <div className="mb-5 grid grid-cols-3 gap-2 text-center">
          {[['Davet', data.stats.total], ['Katılan', data.stats.qualified], ['Premium', data.stats.rewarded]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-paper-2 p-3"><p className="text-2xl font-black">{v}</p><p className="text-xs font-bold text-ink-soft">{l}</p></div>
          ))}
        </div>
        {data.data.length === 0 ? <p className="text-center text-ink-soft">Henüz davetin yok. İlk arkadaşını çağır!</p> : (
          <ul className="divide-y-2 divide-line">
            {data.data.map((r) => (
              <li key={r.username} className="flex items-center justify-between py-3">
                <span className="font-bold">{r.name}</span>
                <span className={clsx('rounded-lg px-2 py-0.5 text-xs font-bold', STATUS[r.status]?.[1])}>{STATUS[r.status]?.[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
