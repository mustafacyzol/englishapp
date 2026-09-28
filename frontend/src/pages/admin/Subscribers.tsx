import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api'
import { dateTR, timeLeft } from '@/lib/format'
import type { Paginated } from '@/lib/types'
import { Input, Select } from '@/components/ui/Field'
import { Spinner, Tabs } from '@/components/ui/Misc'
import { AdminTitle, Pager, Pill, Table } from './kit'

interface S { id: number; source: string; status: string; starts_at: string; ends_at: string; plan: { name: string } | null; user: { id: number; name: string; email: string } | null }

const SOURCE: Record<string, string> = { purchase: 'Satın alma', redeem: 'Hediye kodu', reward: 'Ödül', admin: 'Yönetici', referral: 'Davet' }

export default function Subscribers() {
  const [status, setStatus] = useState<'active' | 'expiring' | 'ended'>('active')
  const [source, setSource] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ status, page: String(page), ...(source && { source }), ...(q && { q }) })
  const { data, isLoading } = useQuery({ queryKey: ['admin-subs', params.toString()], queryFn: () => get<Paginated<S> & { counts: { active: number; expiring: number } }>(`/admin/subscribers?${params}`, true) })
  return (
    <div>
      <AdminTitle title="Premium aboneler">
        <Input placeholder="Ad veya e-posta" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="w-56" />
        <Select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} className="w-44">
          <option value="">Tüm kaynaklar</option>
          {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </AdminTitle>
      <div className="mb-4">
        <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1) }} items={[
          { value: 'active', label: `Aktif${data ? ` (${data.counts.active})` : ''}` },
          { value: 'expiring', label: `7 gün içinde bitecek${data ? ` (${data.counts.expiring})` : ''}` },
          { value: 'ended', label: 'Bitmiş / iptal' },
        ]} />
      </div>
      {isLoading || !data ? <Spinner /> : (
        <>
          <Table head={['Üye', 'Paket', 'Kaynak', 'Başlangıç', 'Bitiş', 'Durum']} empty={!data.data.length}>
            {data.data.map((s) => {
              const live = s.status === 'active' && new Date(s.ends_at) > new Date()
              return (
                <tr key={s.id} className="hover:bg-paper-2">
                  <td className="px-4 py-2.5">{s.user ? <Link to={`/admin/users/${s.user.id}`} className="font-bold hover:text-flame">{s.user.name}</Link> : '-'}<p className="text-xs text-ink-soft">{s.user?.email}</p></td>
                  <td className="px-4">{s.plan?.name ?? '-'}</td>
                  <td className="px-4"><Pill tone={s.source === 'purchase' ? 'good' : 'info'}>{SOURCE[s.source] ?? s.source}</Pill></td>
                  <td className="px-4">{dateTR(s.starts_at)}</td>
                  <td className="px-4">{dateTR(s.ends_at)}{live && <p className="text-xs text-ink-soft">{timeLeft(s.ends_at)} kaldı</p>}</td>
                  <td className="px-4">{live ? <Pill tone="good">aktif</Pill> : <Pill>{s.status === 'cancelled' ? 'iptal' : 'bitti'}</Pill>}</td>
                </tr>
              )
            })}
          </Table>
          <Pager page={data.current_page} last={data.last_page} onPage={setPage} />
        </>
      )}
    </div>
  )
}
