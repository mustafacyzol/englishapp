import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Bell } from 'lucide-react'
import { get, post } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { iconFor } from '@/components/game/icons'
import { Empty, PageHeader, Spinner } from '@/components/ui/Misc'

interface N { id: string; read: boolean; created_at: string; data: { title: string; body?: string; icon?: string; link?: string } }

export default function Notifications() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => get<{ data: N[]; unread: number }>('/notifications') })
  useEffect(() => {
    if (data?.unread) post('/notifications/read').then(() => qc.invalidateQueries({ queryKey: ['dashboard'] }))
  }, [data?.unread, qc])
  if (isLoading) return <Spinner />
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Bildirimler" />
      {!data?.data.length ? <Empty icon={<Bell className="size-8" />} title="Henüz bildirim yok" /> : (
        <ul className="space-y-3">
          {data.data.map((n) => {
            const Icon = iconFor(n.data.icon ?? 'bell')
            return (
              <li key={n.id}>
                <Link to={n.data.link ?? '#'} className={clsx('ink-card flex items-center gap-4 p-4', !n.read && 'bg-butter/30')}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-line bg-card"><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{n.data.title}</p>
                    {n.data.body && <p className="text-sm text-ink-soft">{n.data.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-ink-soft">{dateTR(n.created_at)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
