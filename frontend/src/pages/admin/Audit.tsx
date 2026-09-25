import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/api'
import { dateTR } from '@/lib/format'
import type { Paginated } from '@/lib/types'
import { Input } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { AdminTitle, Pager, Pill, Table } from './kit'

interface A { id: number; action: string; ip: string | null; meta: Record<string, unknown> | null; created_at: string; user: { name: string; email: string } | null; subject_type: string | null; subject_id: number | null }

export default function Audit() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page), ...(action && { action }) })
  const { data, isLoading } = useQuery({ queryKey: ['audit', params.toString()], queryFn: () => get<Paginated<A>>(`/admin/audit?${params}`, true) })
  return (
    <div>
      <AdminTitle title="Denetim kaydı"><Input placeholder="İşlem öneki (ör. auth., admin.)" value={action} onChange={(e) => setAction(e.target.value)} className="w-64" /></AdminTitle>
      {isLoading || !data ? <Spinner /> : (
        <>
          <Table head={['Zaman', 'Kullanıcı', 'İşlem', 'Hedef', 'IP', 'Detay']} empty={!data.data.length}>
            {data.data.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-2">{dateTR(a.created_at, true)}</td>
                <td className="px-4">{a.user?.email ?? '—'}</td>
                <td className="px-4"><Pill tone={a.action.includes('failed') || a.action.includes('locked') ? 'bad' : a.action.startsWith('admin') ? 'info' : 'default'}>{a.action}</Pill></td>
                <td className="px-4 text-xs">{a.subject_type ? `${a.subject_type.split('\\').pop()}#${a.subject_id}` : '—'}</td>
                <td className="px-4 font-mono text-xs">{a.ip}</td>
                <td className="max-w-xs truncate px-4 font-mono text-xs" title={JSON.stringify(a.meta)}>{a.meta ? JSON.stringify(a.meta) : ''}</td>
              </tr>
            ))}
          </Table>
          <Pager page={data.current_page} last={data.last_page} onPage={setPage} />
        </>
      )}
    </div>
  )
}
