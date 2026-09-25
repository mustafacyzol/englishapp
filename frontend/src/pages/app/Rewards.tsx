import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Copy, Gift, KeyRound, Share2, Sparkles, Users } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { celebrate, sfx } from '@/lib/fx'
import { dateTR } from '@/lib/format'
import type { Me, UserItem } from '@/lib/types'
import { RewardCard } from '@/components/game/RewardCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Empty, PageHeader, Spinner, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'

export default function Rewards() {
  const [tab, setTab] = useState<'vault' | 'redeem' | 'invite'>('vault')
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader kicker="Kazandıkların" title="Ödül Kasası" />
      <div className="mb-6">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'vault', label: '🎴 Kartlarım' }, { value: 'redeem', label: '🔑 Kod kullan' }, { value: 'invite', label: '👥 Davet et' }]} />
      </div>
      {tab === 'vault' && <Vault />}
      {tab === 'redeem' && <Redeem />}
      {tab === 'invite' && <Invite />}
    </div>
  )
}

function Vault() {
  const qc = useQueryClient()
  const { setUser } = useAuth()
  const toast = useToast()
  const [flipped, setFlipped] = useState<Record<number, { message: string; code?: string }>>({})
  const [filter, setFilter] = useState<'open' | 'history'>('open')
  const { data, isLoading } = useQuery({ queryKey: ['inventory'], queryFn: () => get<{ data: UserItem[] }>('/inventory') })

  const activate = useMutation({
    mutationFn: (id: number) => post<{ message: string; extra?: { code?: string }; user: Me }>(`/inventory/${id}/activate`),
    onSuccess: (r, id) => {
      setFlipped((f) => ({ ...f, [id]: { message: r.message, code: r.extra?.code } }))
      celebrate()
      sfx.fanfare()
      setUser(r.user)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['inventory'] }), 4500)
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (isLoading || !data) return <Spinner />
  const open = data.data.filter((i) => i.status === 'available' || i.status === 'active')
  const history = data.data.filter((i) => i.status === 'used' || i.status === 'expired')
  const list = filter === 'open' ? open : history

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-ink-soft">Rozetlerden, görevlerden, liglerden ve kodlardan kazandığın kartlar burada. İstediğin an aç!</p>
        <Tabs value={filter} onChange={setFilter} items={[{ value: 'open', label: `Aktif (${open.length})` }, { value: 'history', label: 'Geçmiş' }]} />
      </div>
      {!list.length ? (
        <Empty icon={<Gift className="size-8" />} title="Kasan şimdilik boş" text="Görevleri tamamla, rozet kazan, ligde ilk 3'e gir — kartlar burada birikir." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => {
            const f = flipped[e.id]
            return (
              <div key={e.id}>
                <RewardCard
                  entry={e}
                  rotate={(i % 3) - 1}
                  flipped={!!f}
                  back={
                    f && (
                      <>
                        <Sparkles className="size-10 text-flame" />
                        <p className="font-display text-xl font-extrabold">{f.message}</p>
                        {f.code && (
                          <button onClick={() => { navigator.clipboard?.writeText(f.code!); toast('Kod kopyalandı', 'success') }} className="flex items-center gap-2 rounded-xl border-2 border-line bg-card px-3 py-2 font-mono text-lg font-bold">
                            {f.code} <Copy className="size-4" />
                          </button>
                        )}
                      </>
                    )
                  }
                />
                <div className="mt-4">
                  {e.status === 'available' && e.item.type !== 'streak_freeze' && !f && (
                    <Button block variant="butter" loading={activate.isPending && activate.variables === e.id} onClick={() => activate.mutate(e.id)}>Kartı aç</Button>
                  )}
                  {e.item.type === 'streak_freeze' && e.status === 'available' && <p className="text-center text-sm font-bold text-ink-soft">Otomatik korur · bir gün kaçırırsan devreye girer</p>}
                  {e.status === 'active' && e.code && (
                    <p className="text-center text-sm font-bold">Kodun: <span className="font-mono">{e.code}</span>{e.expires_at && <span className="text-ink-soft"> · {dateTR(e.expires_at)}'e kadar</span>}</p>
                  )}
                  {e.status === 'active' && !e.code && e.expires_at && <p className="text-center text-sm font-bold text-mint-deep">Aktif · {new Date(e.expires_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'e kadar</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
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
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate() }} className="ink-card p-6 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border-2 border-line bg-butter text-[#1B1F3B] shadow-hard"><KeyRound className="size-8" /></div>
        <h2 className="text-2xl font-extrabold">Hediye kodunu kullan</h2>
        <p className="mb-5 mt-1 text-ink-soft">Bayrak Dil Okulları kampanyalarından, etkinliklerden ya da hediye kartlarından gelen kodu gir.</p>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DG-XXXX-XXXX" className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-widest" error={(m.error as ApiError | null)?.first('code')} />
        <Button type="submit" block className="mt-4" loading={m.isPending} disabled={code.length < 3}>Kodu kullan</Button>
        {m.data && <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mt-4 rounded-xl border-2 border-line bg-mint p-3 font-bold text-[#0f2e27]">{m.data.message}</motion.p>}
      </form>
    </div>
  )
}

interface Ref { code: string; link: string; rewards: { referee_gems: number; referrer_gems: number; referrer_premium_days: number }; stats: { total: number; qualified: number; rewarded: number }; data: { name: string; username: string; status: string; joined_at: string }[] }

function Invite() {
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['referrals'], queryFn: () => get<Ref>('/referrals') })
  if (isLoading || !data) return <Spinner />
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'DilGO', text: `DilGO ile İngilizce öğreniyorum! Bu bağlantıyla katıl, ${data.rewards.referee_gems} elmas kazan:`, url: data.link })
      else {
        await navigator.clipboard.writeText(data.link)
        toast('Bağlantı kopyalandı!', 'success')
      }
    } catch {
      /* cancelled */
    }
  }
  const STATUS: Record<string, [string, string]> = { pending: ['E-posta bekleniyor', 'bg-paper-2'], qualified: ['Katıldı', 'bg-butter'], rewarded: ['Premium aldı 🎉', 'bg-mint'] }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="ink-card relative overflow-hidden bg-flame p-6 text-white">
        <Users className="absolute -bottom-6 -right-6 size-40 opacity-15" />
        <h2 className="text-3xl font-extrabold">Arkadaşını getir, birlikte kazanın</h2>
        <ul className="mt-4 space-y-2 font-semibold">
          <li>🎁 Arkadaşın e-postasını doğrulayınca: sana <b>{data.rewards.referrer_gems}</b>, ona <b>{data.rewards.referee_gems}</b> elmas</li>
          <li>👑 İlk Premium alışverişinde: sana <b>{data.rewards.referrer_premium_days} gün Premium</b> kartı</li>
        </ul>
        <div className="mt-6 flex items-center gap-2 rounded-2xl border-2 border-line bg-card p-2 text-ink">
          <span className="flex-1 truncate px-2 font-mono text-sm font-bold">{data.link}</span>
          <Button size="sm" variant="dark" onClick={share} icon={<Share2 className="size-4" />}>Paylaş</Button>
        </div>
        <p className="mt-3 text-sm">Davet kodun: <span className="rounded-lg bg-white/20 px-2 py-0.5 font-mono font-bold">{data.code}</span></p>
      </section>
      <section className="ink-card p-6">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          {[['Davet', data.stats.total], ['Katılan', data.stats.qualified], ['Premium', data.stats.rewarded]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl border-2 border-line p-3"><p className="font-display text-2xl font-extrabold">{v}</p><p className="text-xs font-bold text-ink-soft">{l}</p></div>
          ))}
        </div>
        {data.data.length === 0 ? <p className="text-center text-sm text-ink-soft">Henüz davetin yok. İlk arkadaşını çağır!</p> : (
          <ul className="divide-y-2 divide-line/10">
            {data.data.map((r) => (
              <li key={r.username} className="flex items-center justify-between py-2.5">
                <span className="font-bold">{r.name}</span>
                <span className={clsx('rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold text-[#1B1F3B]', STATUS[r.status]?.[1])}>{STATUS[r.status]?.[0]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
