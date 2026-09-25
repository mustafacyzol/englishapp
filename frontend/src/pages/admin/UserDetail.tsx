import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, get, patch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR, num, tl } from '@/lib/format'
import type { Me, Paginated, RewardItem } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pill, Table } from './kit'

interface Detail {
  user: Me & { is_banned: boolean; banned_reason: string | null; last_login_at: string | null; last_login_ip: string | null; locked_until: string | null }
  orders: { uuid: string; total: string; status: string; created_at: string; plan: { name: string } | null }[]
  items: { id: number; status: string; source: string; code: string | null; created_at: string; item: { name: string } }[]
  audit: { id: number; action: string; ip: string; created_at: string }[]
}

export default function UserDetail() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['admin-user', id], queryFn: () => get<Detail>(`/admin/users/${id}`, true) })
  const items = useQuery({ queryKey: ['admin-items'], queryFn: () => get<Paginated<RewardItem>>('/admin/reward-items?per_page=100', true) })
  const [gems, setGems] = useState(0)
  const [days, setDays] = useState(7)
  const [itemId, setItemId] = useState('')
  const [reason, setReason] = useState('')

  const update = useMutation({
    mutationFn: (b: Record<string, unknown>) => patch<Detail>(`/admin/users/${id}`, b, true),
    onSuccess: (r) => { qc.setQueryData(['admin-user', id], r); toast('Güncellendi ✓', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (isLoading || !data) return <Spinner />
  const u = data.user
  return (
    <div>
      <AdminTitle title={u.name}>
        <Pill tone="info">{u.role}</Pill>
        {u.is_banned && <Pill tone="bad">askıda</Pill>}
        {u.premium.active && <Pill tone="good">premium · {dateTR(u.premium.until)}</Pill>}
      </AdminTitle>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="ink-card p-5 text-sm">
          <h2 className="mb-3 text-lg font-extrabold">Bilgiler</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-ink-soft">E-posta</dt><dd className="font-bold">{u.email} {u.email_verified ? '✓' : '✗'}</dd>
            <dt className="text-ink-soft">Kullanıcı adı</dt><dd>@{u.username}</dd>
            <dt className="text-ink-soft">Seviye</dt><dd>{u.cefr_level} · Lv {u.stats.level}</dd>
            <dt className="text-ink-soft">XP / Elmas</dt><dd>{num(u.stats.xp_total)} / {num(u.stats.gems)}</dd>
            <dt className="text-ink-soft">Seri</dt><dd>{u.stats.streak} (en uzun {u.stats.streak_longest})</dd>
            <dt className="text-ink-soft">Son giriş</dt><dd>{dateTR(u.last_login_at, true)} · {u.last_login_ip}</dd>
            <dt className="text-ink-soft">Kilit</dt><dd>{u.locked_until ? dateTR(u.locked_until, true) : '—'}</dd>
            <dt className="text-ink-soft">2FA</dt><dd>{u.two_factor_enabled ? 'açık' : 'kapalı'}</dd>
            <dt className="text-ink-soft">Davet kodu</dt><dd className="font-mono">{u.referral_code}</dd>
          </dl>
        </section>

        <section className="ink-card space-y-4 p-5">
          <h2 className="text-lg font-extrabold">Ödül ver</h2>
          <div className="flex gap-2"><Input type="number" value={gems} onChange={(e) => setGems(Number(e.target.value))} className="flex-1" /><Button size="sm" onClick={() => update.mutate({ gems_delta: gems })}>Elmas ±</Button></div>
          <div className="flex gap-2"><Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="flex-1" /><Button size="sm" onClick={() => update.mutate({ premium_days: days })}>+ Premium gün</Button></div>
          <div className="flex gap-2">
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="flex-1">
              <option value="">Kart seç…</option>
              {items.data?.data.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
            <Button size="sm" disabled={!itemId} onClick={() => update.mutate({ grant_item_id: Number(itemId) })}>Ver</Button>
          </div>
        </section>

        <section className="ink-card space-y-3 p-5">
          <h2 className="text-lg font-extrabold">Hesap işlemleri</h2>
          <div className="flex flex-wrap gap-2">
            {!u.email_verified && <Button size="sm" variant="secondary" onClick={() => update.mutate({ verify_email: true })}>E-postayı doğrula</Button>}
            <Button size="sm" variant="secondary" onClick={() => update.mutate({ unlock: true })}>Kilidi aç</Button>
            {u.two_factor_enabled && <Button size="sm" variant="secondary" onClick={() => update.mutate({ reset_2fa: true })}>2FA sıfırla</Button>}
          </div>
          {u.is_banned ? (
            <Button size="sm" variant="success" onClick={() => update.mutate({ is_banned: false })}>Askıyı kaldır</Button>
          ) : (
            <div className="flex gap-2"><Input placeholder="Askı sebebi" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" /><Button size="sm" variant="danger" onClick={() => update.mutate({ is_banned: true, banned_reason: reason })}>Askıya al</Button></div>
          )}
          {me?.role === 'super_admin' && me.id !== u.id && (
            <Select label="Rol" value={u.role} onChange={(e) => update.mutate({ role: e.target.value })}>
              {['user', 'editor', 'admin', 'super_admin'].map((r) => <option key={r}>{r}</option>)}
            </Select>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Kartlar</h2>
          <Table head={['Kart', 'Durum', 'Kaynak', 'Kod', 'Tarih']} empty={!data.items.length}>
            {data.items.map((i) => <tr key={i.id}><td className="px-4 py-2">{i.item.name}</td><td className="px-4"><Pill>{i.status}</Pill></td><td className="px-4">{i.source}</td><td className="px-4 font-mono">{i.code ?? '—'}</td><td className="px-4">{dateTR(i.created_at)}</td></tr>)}
          </Table>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-extrabold">Siparişler</h2>
          <Table head={['Paket', 'Tutar', 'Durum', 'Tarih']} empty={!data.orders.length}>
            {data.orders.map((o) => <tr key={o.uuid}><td className="px-4 py-2">{o.plan?.name}</td><td className="px-4 font-mono">{tl(o.total)}</td><td className="px-4"><Pill tone={o.status === 'paid' ? 'good' : 'default'}>{o.status}</Pill></td><td className="px-4">{dateTR(o.created_at)}</td></tr>)}
          </Table>
          <h2 className="mb-3 mt-6 text-lg font-extrabold">Güvenlik kaydı</h2>
          <Table head={['İşlem', 'IP', 'Tarih']} empty={!data.audit.length}>
            {data.audit.map((a) => <tr key={a.id}><td className="px-4 py-2 font-mono text-xs">{a.action}</td><td className="px-4">{a.ip}</td><td className="px-4">{dateTR(a.created_at, true)}</td></tr>)}
          </Table>
        </section>
      </div>
    </div>
  )
}
