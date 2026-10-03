import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Check, Copy, Share2 } from 'lucide-react'
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
import { XpGuide } from '@/components/game/XpGuide'
import { Empty, PageHeader, Progress, SkeletonPage, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'
import { BRAND, WORDMARK } from '@/lib/brand'

/**
 * Four plain tabs: what do I have (cards and chests), how do I earn more, a gift
 * code to use, and friends to invite. Partner coupons have their own page.
 */
type Tab = 'vault' | 'earn' | 'code' | 'invite'
const HASH: Record<string, Tab> = { '#yol': 'earn', '#seri': 'earn', '#xp': 'earn', '#davet': 'invite', '#kod': 'code' }

export default function Rewards() {
  const { hash } = useLocation()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>(() => HASH[hash] ?? 'vault')
  useEffect(() => {
    if (hash === '#kuponlar') nav('/coupons', { replace: true })
    else if (HASH[hash]) setTab(HASH[hash])
  }, [hash, nav])
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader kicker="Kazandıkların" title="Ödüllerim" />
      <div className="mb-8">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'vault', label: 'Kasam' }, { value: 'earn', label: 'Nasıl kazanırım?' }, { value: 'code', label: 'Kod kullan' }, { value: 'invite', label: 'Davet et' }]} />
      </div>
      {tab === 'vault' && <Vault />}
      {tab === 'earn' && (
        <>
          <h2 className="mb-1 font-display text-xl font-black">Seri ödülleri</h2>
          <p className="mb-5 text-sm text-ink-soft">Seri günlerin arttıkça bu duraklarda kartlar açılır ve kasana düşer.</p>
          <Roadmap onVault={() => setTab('vault')} />
          <h2 className="mb-1 mt-12 font-display text-xl font-black">XP ve elmas nereden gelir?</h2>
          <p className="mb-5 text-sm text-ink-soft">Her etkinliğin kazandırdığı puanlar. Elmaslarını Mağaza’da harcarsın.</p>
          <Earn />
        </>
      )}
      {tab === 'code' && <Redeem />}
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
  // cards and chests only: frames and covers are worn from the profile, partner gifts live under Kuponlar
  const cards = data.data.filter((i) => !['avatar_frame', 'profile_banner', 'partner_coupon'].includes(i.item.type))
  const open = cards.filter((i) => i.status === 'available' || i.status === 'active')
  const history = cards.filter((i) => i.status === 'used' || i.status === 'expired')
  const list = filter === 'open' ? open : history

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-ink-soft">Kazandığın ve Mağaza’dan aldığın kartlar, sandıklar burada. Her kartın altında nereden geldiği yazar. Çerçeve ve kapaklar profilinde, marka hediyeleri <Link to="/coupons" className="font-bold text-flame underline underline-offset-2">Kuponlar</Link>’da.</p>
        <Tabs value={filter} onChange={setFilter} items={[{ value: 'open', label: `Hazır (${open.length})` }, { value: 'history', label: 'Geçmiş' }]} />
      </div>
      {!list.length ? (
        <Empty icon={<Img src={rewardImg('chest')} alt="" className="size-12 object-contain opacity-60" />} title="Kasan şimdilik boş" text="Günlük hedefini tamamla, serini sürdür, görevleri bitir. Kartlar burada birikecek." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
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
                <div className="mt-3 min-h-12">
                  {e.status === 'available' && e.item.type !== 'streak_freeze' && !f && (
                    <Button block variant="butter" loading={activate.isPending && activate.variables?.id === e.id} onClick={() => (e.item.type === 'chest' ? setChest(e) : activate.mutate(e))}>
                      {e.item.type === 'chest' ? 'Sandığı aç' : 'Kartı kullan'}
                    </Button>
                  )}
                  {e.item.type === 'streak_freeze' && e.status === 'available' && <p className="text-center text-xs font-bold text-sky sm:text-sm">Otomatik korur</p>}
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

interface RoadmapData {
  streak: number
  level: number
  daily_goal_gems: number
  level_up_gems: number
  level_chest_every: number
  milestones: { days: number; title: string; icon: string; gems: number; claimed: boolean; current: number; target: number }[]
}

/**
 * Streak rewards on one track: where you are, what drops next and when. Rewards
 * are paid automatically the day the streak reaches them, straight into the vault.
 */
function Roadmap({ onVault }: { onVault: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['roadmap'], queryFn: () => get<RoadmapData>('/rewards/roadmap') })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const next = data.milestones.find((m) => !m.claimed)
  const got = data.milestones.filter((m) => m.claimed)
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-flame to-[#d9391f] p-6 text-white sm:p-8">
        <span aria-hidden className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Img src={rewardImg('flame')} alt="" className="size-20 drop-shadow-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white/80">Şu anki serin</p>
            <p className="font-display text-5xl font-black leading-none">{data.streak} gün</p>
          </div>
          {next && (
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-widest text-white/75">Sıradaki ödül</p>
              <div className="mt-1 flex items-center gap-3">
                <Img src={rewardImg(next.icon)} alt="" className="size-12 object-contain" />
                <div>
                  <p className="font-display text-lg font-black leading-tight">{next.title}</p>
                  <p className="text-sm font-bold">{next.days - data.streak} gün sonra · {next.days}. gün</p>
                </div>
              </div>
            </div>
          )}
        </div>
        {next && <div className="relative mt-5"><Progress value={data.streak} max={next.days} color="bg-white" tall /></div>}
      </section>

      <p className="flex items-start gap-2 rounded-2xl bg-mint/10 p-4 text-sm font-semibold">
        <Check className="mt-0.5 size-4 shrink-0 text-mint-deep" strokeWidth={3} />
        <span>Toplamana gerek yok: serin o güne ulaştığı an ödül <b>kendiliğinden Kasana</b> düşer ve bildirim gelir. Kasadan açıp kullanırsın.{got.length > 0 && <> <button onClick={onVault} className="font-extrabold text-flame underline underline-offset-2">Kasama git</button></>}</span>
      </p>

      <div className="pb-2">
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.milestones.map((m, i) => {
            const reached = data.streak >= m.days
            const isNext = m === next
            return (
              <motion.li key={m.days} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={clsx('relative flex w-full flex-col items-center rounded-3xl border-2 p-4 text-center', m.claimed ? 'border-mint/50 bg-mint/8' : isNext ? 'border-flame bg-flame/5 shadow-[0_0_0_4px_rgba(255,90,54,.12)]' : 'border-line bg-card')}>
                <p className="font-display text-3xl font-black leading-none">{m.days}</p>
                <p className="text-xs font-bold text-ink-soft">gün</p>
                <Img src={rewardImg(m.icon)} alt="" className={clsx('my-3 size-16 object-contain', !reached && !isNext && 'opacity-40 grayscale')} />
                <p className="text-sm font-black leading-tight">{m.title}</p>
                {m.gems > 0 && m.icon !== 'gem' && <p className="text-xs font-bold text-ink-soft">+ {m.gems} elmas</p>}
                <span className={clsx('mt-3 rounded-full px-2.5 py-1 text-[11px] font-black', m.claimed ? 'bg-mint text-white' : isNext ? 'bg-flame text-white' : 'bg-paper-2 text-ink-soft')}>
                  {m.claimed ? 'Kasana eklendi' : isNext ? `${m.days - data.streak} gün kaldı` : 'Kilitli'}
                </span>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/** Everything about earning: XP per activity with daily caps, and every way to earn gems. */
function Earn() {
  const { data } = useQuery({ queryKey: ['roadmap'], queryFn: () => get<RoadmapData>('/rewards/roadmap') })
  const WAYS = data ? [
    { icon: 'gem', title: 'Günlük hedef', text: `Her gün hedefini tamamla: +${data.daily_goal_gems} elmas.` },
    { icon: 'crown', title: 'Seviye atla', text: `Her seviyede +${data.level_up_gems} elmas, her ${data.level_chest_every}. seviyede Gizemli Sandık.` },
    { icon: 'chest', title: 'Görevler', text: 'Günlük ve haftalık görevleri bitir, elmas ve kart topla.' },
    { icon: 'voucher', title: 'Lig', text: 'Haftayı ilk 3 bitir: elmas. Birinci ol: Gizemli Sandık.' },
  ] : []
  return (
    <div className="space-y-8">
      <XpGuide />
      {!!WAYS.length && (
        <section>
          <h2 className="mb-4 text-2xl">Elmas nasıl kazanılır?</h2>
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
      )}
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
    <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-[1fr_1.1fr]">
      {/* a gift card, so the page says what it is before reading a word */}
      <div className="relative mx-auto aspect-[1.6] w-full max-w-[300px] rotate-[-4deg] sm:max-w-sm overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1f2433] via-[#2b3350] to-[#3b2a5c] p-6 text-white shadow-[0_30px_50px_-25px_rgba(31,36,51,.8)]">
        <span aria-hidden className="absolute -right-10 -top-12 size-44 rounded-full bg-butter/25 blur-2xl" />
        <span aria-hidden className="absolute inset-y-0 right-16 w-6 bg-gradient-to-b from-butter to-flame opacity-90" />
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 bg-gradient-to-r from-butter to-flame opacity-90" />
        <Img src={rewardImg('voucher')} alt="" className="absolute right-6 top-1/2 size-20 -translate-y-1/2 object-contain drop-shadow-xl" />
        <p className="relative font-display text-2xl font-black italic">{WORDMARK.join('')}</p>
        <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/60">Hediye kartı</p>
        <p className="absolute bottom-5 left-6 font-mono text-lg font-bold tracking-[0.18em] text-white/90">{code || 'DG-XXXX-XXXX'}</p>
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate() }} className="rounded-3xl border-2 border-line bg-card p-6 sm:p-8">
        <h2 className="text-2xl">Hediye kodunu kullan</h2>
        <p className="mb-5 mt-1 text-sm text-ink-soft">Hediye kartı, okul ya da kampanya kodun varsa buraya yaz. Premium günler, elmas veya kartlar hemen hesabına geçer.</p>
        <Input id="redeem-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DG-XXXX-XXXX" className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-widest" error={(m.error as ApiError | null)?.first('code')} />
        <Button type="submit" block className="mt-4" loading={m.isPending} disabled={code.length < 3}>Kodu kullan</Button>
        {m.data && <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 rounded-xl bg-mint/15 p-3 font-bold text-mint-deep">{m.data.message}</motion.p>}
        <ul className="mt-5 space-y-1.5 text-xs text-ink-soft">
          <li className="flex gap-2"><Check className="size-3.5 shrink-0 text-mint-deep" strokeWidth={3} /> Kodlar büyük-küçük harfe duyarlı değildir.</li>
          <li className="flex gap-2"><Check className="size-3.5 shrink-0 text-mint-deep" strokeWidth={3} /> Her kod hesap başına bir kez kullanılır.</li>
        </ul>
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
      if (navigator.share) await navigator.share({ title: BRAND, text: `${BRAND} ile İngilizce öğreniyorum! Bu bağlantıyla katıl, ${data.rewards.referee_gems} elmas kazan:`, url: data.link })
      else {
        await navigator.clipboard.writeText(data.link)
        toast('Bağlantı kopyalandı!', 'success')
      }
    } catch {
      toast(data.link)
    }
  }
  const copyCode = () => { navigator.clipboard?.writeText(data.code).catch(() => {}); toast('Davet kodu kopyalandı', 'success') }
  const STATUS: Record<string, [string, string]> = { pending: ['Doğrulama bekliyor', 'bg-paper-2 text-ink-soft'], qualified: ['Katıldı', 'bg-butter/25'], rewarded: ['Premium aldı', 'bg-mint/15 text-mint-deep'] }
  const STEPS = [
    { n: 1, title: 'Bağlantını paylaş', text: 'WhatsApp, Instagram ya da sınıf grubunda.' },
    { n: 2, title: 'Arkadaşın katılsın', text: `E-postasını doğrulayınca sana ${data.rewards.referrer_gems}, ona ${data.rewards.referee_gems} elmas.` },
    { n: 3, title: 'Premium alırsa', text: `Sana ${data.rewards.referrer_premium_days} gün Premium kartı.` },
  ]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-flame p-6 text-white sm:p-8">
        <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
        <span aria-hidden className="absolute -bottom-20 right-24 size-40 rounded-full bg-butter/30" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end [&>*]:min-w-0">
          <div>
            <h2 className="text-3xl leading-tight sm:text-4xl">Arkadaşını getir,<br />birlikte kazanın</h2>
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-card p-2 text-ink">
              <span className="min-w-0 flex-1 truncate px-2 font-mono text-sm font-bold">{data.link}</span>
              <Button size="sm" variant="dark" onClick={share} icon={<Share2 className="size-4" />}>Paylaş</Button>
            </div>
            <button onClick={copyCode} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
              Davet kodun: <span className="rounded-lg bg-white/20 px-2 py-0.5 font-mono font-bold">{data.code}</span> <Copy className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Davet', data.stats.total], ['Katılan', data.stats.qualified], ['Premium', data.stats.rewarded]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-white/15 p-3 backdrop-blur"><p className="font-display text-3xl font-black">{v}</p><p className="text-xs font-bold text-white/80">{l}</p></div>
            ))}
          </div>
        </div>
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((x) => (
          <li key={x.n} className="flex gap-3 rounded-2xl border-2 border-line bg-card p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-flame/12 font-display text-lg font-black text-flame">{x.n}</span>
            <span><span className="block font-black">{x.title}</span><span className="block text-sm text-ink-soft">{x.text}</span></span>
          </li>
        ))}
      </ol>

      <section className="rounded-3xl border-2 border-line bg-card p-5 sm:p-6">
        <h3 className="mb-3 font-display text-lg font-black">Davet ettiklerin</h3>
        {data.data.length === 0 ? <p className="py-4 text-center text-ink-soft">Henüz davetin yok. İlk arkadaşını çağır!</p> : (
          <ul className="divide-y-2 divide-line">
            {data.data.map((r) => (
              <li key={r.username} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate font-bold">{r.name}</span>
                <span className={clsx('shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold', STATUS[r.status]?.[1])}>{STATUS[r.status]?.[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
