import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Crown, GraduationCap, Receipt, UserCheck, Users, Wallet, Activity, BookOpen } from 'lucide-react'
import { get } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { can } from '@/lib/adminAccess'
import { dateTR, num, tl } from '@/lib/format'
import { Spinner } from '@/components/ui/Misc'
import { AdminTitle, BarChart, Pill, Table, ORDER_STATUS } from './kit'

interface D {
  kpis: Record<string, number | null>
  series: { revenue: { d: string; total: string }[]; signups: { d: string; count: number }[]; dau: { d: string; count: number }[] }
  recent_orders: { uuid: string; total: string; status: string; created_at: string; user: { name: string; email: string } | null; plan: { name: string } | null }[]
  recent_users: { id: number; name: string; email: string; created_at: string; email_verified_at: string | null; premium_until: string | null }[]
}

/** Fill the last 30 days so bars keep a stable width and gaps read as zero days. */
function last30(rows: { d: string; v: number }[]) {
  const map = new Map(rows.map((r) => [r.d.slice(0, 10), r.v]))
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10)
    return { d, v: map.get(d) ?? 0 }
  })
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['admin-dash'], queryFn: () => get<D>('/admin/dashboard', true) })
  if (isLoading || !data) return <Spinner />
  const k = data.kpis as Record<string, number>
  const sales = can(user, 'sales')
  const tiles = [
    [Users, 'Toplam kullanıcı', num(k.users), can(user, 'users') ? '/admin/users' : null],
    [UserCheck, 'Doğrulanmış', num(k.verified), null],
    [Crown, 'Aktif Premium', num(k.premium), sales ? '/admin/subscribers' : null],
    [Activity, 'Bugün aktif', num(k.active_today), null],
    ...(sales ? [[Wallet, 'Ödenen (30 gün)', tl(k.revenue_30d), '/admin/revenue'], [Receipt, 'Sipariş (30 gün)', num(k.orders_30d), '/admin/orders']] as const : []),
    [BookOpen, 'Hikâye', num(k.stories), null],
    [GraduationCap, 'Açık canlı ders kuponu', num(k.open_vouchers), null],
  ] as const

  return (
    <div>
      <AdminTitle title="Pano" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([I, l, v, to]) => {
          const inner = (
            <>
              <I className="mb-2 size-5 text-ink-soft" />
              <p className="font-display text-2xl font-extrabold">{v}</p>
              <p className="text-xs font-bold text-ink-soft">{l}</p>
            </>
          )
          return to ? <Link key={l} to={to} className="ink-card block p-4 transition hover:border-ink/30">{inner}</Link> : <div key={l} className="ink-card p-4">{inner}</div>
        })}
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        {sales && <BarChart title="Günlük ödenen · son 30 gün" color="#D9401F" data={last30(data.series.revenue.map((r) => ({ d: r.d, v: Number(r.total) })))} format={(v) => tl(Math.round(v))} />}
        <BarChart title="Yeni kayıt · son 30 gün" color="#3A6FF7" data={last30(data.series.signups.map((r) => ({ d: r.d, v: r.count })))} format={(v) => num(Math.round(v))} />
        <BarChart title="Günlük aktif öğrenci · son 30 gün" color="#3A6FF7" data={last30(data.series.dau.map((r) => ({ d: String(r.d), v: r.count })))} format={(v) => num(Math.round(v))} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        {sales && <section>
          <h2 className="mb-3 text-lg font-extrabold">Son siparişler</h2>
          <Table head={['Kullanıcı', 'Paket', 'Tutar', 'Durum']} empty={!data.recent_orders.length}>
            {data.recent_orders.map((o) => (
              <tr key={o.uuid}><td className="px-4 py-2.5">{o.user?.email}</td><td className="px-4">{o.plan?.name}</td><td className="px-4 font-mono">{tl(o.total)}</td><td className="px-4"><Pill tone={o.status === 'paid' ? 'good' : o.status === 'failed' ? 'bad' : 'default'}>{ORDER_STATUS[o.status] ?? o.status}</Pill></td></tr>
            ))}
          </Table>
        </section>}
        {can(user, 'users') && <section>
          <h2 className="mb-3 text-lg font-extrabold">Yeni kullanıcılar</h2>
          <Table head={['Ad', 'E-posta', 'Kayıt', 'Durum']} empty={!data.recent_users.length}>
            {data.recent_users.map((u) => (
              <tr key={u.id}><td className="px-4 py-2.5"><Link to={`/admin/users/${u.id}`} className="font-bold hover:text-flame">{u.name}</Link></td><td className="px-4">{u.email}</td><td className="px-4">{dateTR(u.created_at)}</td><td className="px-4">{u.email_verified_at ? <Pill tone="good">doğrulandı</Pill> : <Pill tone="warn">bekliyor</Pill>}</td></tr>
            ))}
          </Table>
        </section>}
      </div>
    </div>
  )
}
