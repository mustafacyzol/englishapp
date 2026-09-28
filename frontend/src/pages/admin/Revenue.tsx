import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { get } from '@/lib/api'
import { num, tl } from '@/lib/format'
import { Spinner, Tabs } from '@/components/ui/Misc'
import { AdminTitle, BarChart, Table } from './kit'

interface Period { gross: number; refunded: number; net: number; orders: number; discounts: number }
interface R {
  currency: string
  days: number
  periods: Record<'today' | 'week' | 'month' | 'all', Period>
  range: Period
  series: { d: string; gross: number; net: number; count: number }[]
  by_plan: { name: string; count: number; net: number }[]
  subscribers: { premium_active: number; paying_active: number }
  avg_order: number
  pending: number
}

const PERIODS = [['today', 'Bugün'], ['week', 'Son 7 gün'], ['month', 'Son 30 gün'], ['all', 'Tüm zamanlar']] as const

/** Fill every day of the range so bars keep a stable width and gaps read as zero. */
function fill(rows: { d: string; v: number }[], days: number) {
  const map = new Map(rows.map((r) => [r.d.slice(0, 10), r.v]))
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10)
    return { d, v: map.get(d) ?? 0 }
  })
}

/**
 * Money, plainly: the net figure is what stays after refunds. Every number is an
 * order total after discounts, in Turkish lira, VAT included as charged.
 */
export default function Revenue() {
  const [days, setDays] = useState<'7' | '30' | '90' | '365'>('30')
  const { data, isLoading } = useQuery({ queryKey: ['admin-revenue', days], queryFn: () => get<R>(`/admin/revenue?days=${days}`, true) })
  if (isLoading || !data) return <Spinner />
  const top = Math.max(1, ...data.by_plan.map((p) => p.net))
  return (
    <div>
      <AdminTitle title="Gelir" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-ink-soft">Net gelir = ödenen siparişler eksi iadeler. Tutarlar indirimler düşülmüş sipariş toplamıdır.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PERIODS.map(([k, l]) => {
          const p = data.periods[k]
          return (
            <div key={k} className={clsx('ink-card p-4', k === 'month' && 'ring-2 ring-flame/40')}>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{l}</p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{tl(p.net)}</p>
              <p className="mt-1 text-xs text-ink-soft">{num(p.orders)} sipariş · brüt {tl(p.gross)}{p.refunded > 0 && <> · <span className="text-berry">iade {tl(p.refunded)}</span></>}</p>
            </div>
          )
        })}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Aktif Premium üye', num(data.subscribers.premium_active)],
          ['Ödeme yapan aktif abone', num(data.subscribers.paying_active)],
          ['Ortalama sipariş', tl(data.avg_order)],
          ['Bekleyen ödeme (24 sa)', num(data.pending)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border-2 border-line bg-paper-2 px-4 py-3">
            <p className="font-display text-xl font-extrabold tabular-nums">{v}</p>
            <p className="text-xs font-bold text-ink-soft">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Günlük net gelir</h2>
        <Tabs value={days} onChange={setDays} items={[{ value: '7', label: '7 gün' }, { value: '30', label: '30 gün' }, { value: '90', label: '90 gün' }, { value: '365', label: '1 yıl' }]} />
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <BarChart title={`Net gelir · son ${days} gün`} color="#D9401F" data={fill(data.series.map((r) => ({ d: r.d, v: r.net })), Number(days))} format={(v) => tl(Math.round(v))} />
        <div className="ink-card p-5">
          <p className="text-sm font-bold text-ink-soft">Seçili aralık özeti</p>
          <dl className="mt-3 space-y-2 text-sm">
            {[
              ['Brüt satış', tl(data.range.gross)],
              ['İadeler', `- ${tl(data.range.refunded)}`],
              ['Net gelir', tl(data.range.net)],
              ['Verilen indirim', tl(data.range.discounts)],
              ['Sipariş', num(data.range.orders)],
            ].map(([l, v], i) => (
              <div key={l} className={clsx('flex justify-between gap-3', i === 2 && 'border-t-2 border-line pt-2 text-base font-extrabold')}>
                <dt className={i === 2 ? '' : 'text-ink-soft'}>{l}</dt>
                <dd className={clsx('font-mono font-bold tabular-nums', i === 1 && 'text-berry')}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-extrabold">Pakete göre (son {days} gün)</h2>
      <Table head={['Paket', 'Sipariş', 'Net gelir', '']} empty={!data.by_plan.length}>
        {data.by_plan.map((p) => (
          <tr key={p.name}>
            <td className="px-4 py-2.5 font-bold">{p.name}</td>
            <td className="px-4 font-mono">{num(p.count)}</td>
            <td className="px-4 font-mono font-bold">{tl(p.net)}</td>
            <td className="w-1/3 px-4"><span className="block h-2 rounded-full bg-flame" style={{ width: `${(p.net / top) * 100}%` }} /></td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
