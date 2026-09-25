import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, get, post } from '@/lib/api'
import { dateTR, tl } from '@/lib/format'
import type { Paginated } from '@/lib/types'
import { Input, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pager, Pill, Table } from './kit'

interface O { id: number; uuid: string; total: string; discount: string; status: string; gateway: string; gateway_ref: string | null; created_at: string; paid_at: string | null; user: { name: string; email: string } | null; plan: { name: string } | null; coupon: { code: string } | null }

export default function Orders() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const toast = useToast()
  const params = new URLSearchParams({ page: String(page), ...(status && { status }), ...(q && { q }) })
  const { data, isLoading } = useQuery({ queryKey: ['admin-orders', params.toString()], queryFn: () => get<Paginated<O>>(`/admin/orders?${params}`, true) })
  const refund = useMutation({
    mutationFn: (id: number) => post(`/admin/orders/${id}/refund`, { revoke_premium: true }, true),
    onSuccess: () => { toast('İade işlendi. Ödeme sağlayıcı panelinden iadeyi de tamamlamayı unutma.', 'success'); qc.invalidateQueries({ queryKey: ['admin-orders'] }) },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })

  return (
    <div>
      <AdminTitle title="Siparişler">
        <Input placeholder="Sipariş no / e-posta" value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">Tümü</option>{['paid', 'pending', 'failed', 'refunded'].map((s) => <option key={s}>{s}</option>)}
        </Select>
      </AdminTitle>
      {isLoading || !data ? <Spinner /> : (
        <>
          <Table head={['Sipariş', 'Kullanıcı', 'Paket', 'Tutar', 'Kupon', 'Durum', 'Tarih', '']} empty={!data.data.length}>
            {data.data.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2.5 font-mono text-xs">{o.uuid.slice(0, 8)}<br /><span className="text-ink-soft">{o.gateway}</span></td>
                <td className="px-4">{o.user?.email}</td>
                <td className="px-4">{o.plan?.name}</td>
                <td className="px-4 font-mono">{tl(o.total)}{Number(o.discount) > 0 && <span className="block text-xs text-mint-deep">-{tl(o.discount)}</span>}</td>
                <td className="px-4 font-mono text-xs">{o.coupon?.code ?? '—'}</td>
                <td className="px-4"><Pill tone={o.status === 'paid' ? 'good' : o.status === 'failed' ? 'bad' : o.status === 'refunded' ? 'warn' : 'default'}>{o.status}</Pill></td>
                <td className="px-4">{dateTR(o.created_at, true)}</td>
                <td className="px-4">{o.status === 'paid' && <button onClick={() => confirm('Bu siparişi iade olarak işaretle ve Premium süresini geri al?') && refund.mutate(o.id)} className="text-xs font-bold text-berry">İade</button>}</td>
              </tr>
            ))}
          </Table>
          <Pager page={data.current_page} last={data.last_page} onPage={setPage} />
        </>
      )}
    </div>
  )
}
