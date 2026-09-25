import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import { get } from '@/lib/api'
import { dateTR, num } from '@/lib/format'
import type { Paginated } from '@/lib/types'
import { Input, Select } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { AdminTitle, Pager, Pill, Table } from './kit'

interface U { id: number; name: string; username: string; email: string; role: string; cefr_level: string; xp_total: number; gems: number; streak_current: number; premium_until: string | null; is_banned: boolean; email_verified_at: string | null; last_active_at: string | null; created_at: string }

export default function Users() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page), ...(q && { q }), ...(status && { status }), ...(role && { role }) })
  const { data, isLoading } = useQuery({ queryKey: ['admin-users', params.toString()], queryFn: () => get<Paginated<U>>(`/admin/users?${params}`, true) })

  return (
    <div>
      <AdminTitle title="Kullanıcılar">
        <Input placeholder="Ad, e-posta, kullanıcı adı" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="w-64" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">Tüm durumlar</option><option value="premium">Premium</option><option value="unverified">Doğrulanmamış</option><option value="banned">Askıda</option>
        </Select>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-36">
          <option value="">Tüm roller</option><option value="user">user</option><option value="editor">editor</option><option value="admin">admin</option><option value="super_admin">super_admin</option>
        </Select>
      </AdminTitle>
      {isLoading || !data ? <Spinner /> : (
        <>
          <Table head={['Kullanıcı', 'Rol', 'Seviye', 'XP', 'Seri', 'Durum', 'Kayıt']} empty={!data.data.length}>
            {data.data.map((u) => (
              <tr key={u.id} className="hover:bg-paper-2">
                <td className="px-4 py-2.5"><Link to={`/admin/users/${u.id}`} className="font-bold hover:text-flame">{u.name}</Link><p className="text-xs text-ink-soft">{u.email}</p></td>
                <td className="px-4"><Pill tone={u.role === 'user' ? 'default' : 'info'}>{u.role}</Pill></td>
                <td className="px-4 font-mono">{u.cefr_level}</td>
                <td className="px-4 font-mono">{num(u.xp_total)}</td>
                <td className="px-4 font-mono">{u.streak_current}</td>
                <td className="space-x-1 px-4">
                  {u.is_banned && <Pill tone="bad">askıda</Pill>}
                  {!u.email_verified_at && <Pill tone="warn">doğrulanmadı</Pill>}
                  {u.premium_until && new Date(u.premium_until) > new Date() && <Pill tone="good"><Crown className="mr-1 size-3" />premium</Pill>}
                </td>
                <td className="px-4">{dateTR(u.created_at)}</td>
              </tr>
            ))}
          </Table>
          <Pager page={data.current_page} last={data.last_page} onPage={setPage} />
        </>
      )}
    </div>
  )
}
