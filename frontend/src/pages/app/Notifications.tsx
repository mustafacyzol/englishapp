import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Bell, CheckCheck, ChevronRight, Trash2, X } from 'lucide-react'
import { del, get, post } from '@/lib/api'
import { iconFor } from '@/components/game/icons'
import { Empty, PageHeader, Spinner, Tabs } from '@/components/ui/Misc'

interface N { id: string; read: boolean; created_at: string; data: { title: string; body?: string; icon?: string; link?: string } }

/** "Bugün", "Dün", "Bu hafta", "Daha eski": an inbox you can scan in a second. */
function bucket(iso: string) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = (today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 864e5
  return diff <= 0 ? 'Bugün' : diff === 1 ? 'Dün' : diff < 7 ? 'Bu hafta' : 'Daha eski'
}
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'şimdi' : m < 60 ? `${m} dk` : m < 1440 ? `${Math.round(m / 60)} sa` : `${Math.round(m / 1440)} g`
}

export default function Notifications() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => get<{ data: N[]; unread: number }>('/notifications') })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) }
  const readAll = useMutation({ mutationFn: () => post('/notifications/read'), onSuccess: refresh })
  const readOne = useMutation({ mutationFn: (id: string) => post(`/notifications/${id}/read`), onSuccess: refresh })
  const remove = useMutation({
    mutationFn: (id: string) => del(`/notifications/${id}`),
    onMutate: (id) => qc.setQueryData<{ data: N[]; unread: number }>(['notifications'], (d) => d && { ...d, data: d.data.filter((n) => n.id !== id) }),
    onSettled: refresh,
  })
  const clear = useMutation({ mutationFn: (onlyRead: boolean) => del(`/notifications${onlyRead ? '?read=1' : ''}`), onSuccess: refresh })
  // Opening the inbox no longer silently marks everything read: unread stays visible until you act.
  useEffect(() => () => void qc.invalidateQueries({ queryKey: ['dashboard'] }), [qc])
  if (isLoading) return <Spinner />
  const list = (data?.data ?? []).filter((n) => filter === 'all' || !n.read)
  const groups = list.reduce<Record<string, N[]>>((a, n) => ((a[bucket(n.created_at)] ??= []).push(n), a), {})

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader kicker={data?.unread ? `${data.unread} okunmamış` : 'Hepsi okundu'} title="Bildirimler">
        {!!data?.data.length && (
          <div className="flex gap-2">
            {!!data.unread && <button onClick={() => readAll.mutate()} className="press flex h-10 items-center gap-1.5 rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold"><CheckCheck className="size-4" /> Tümünü okundu yap</button>}
            <button onClick={() => confirm('Okunan bildirimler silinsin mi?') && clear.mutate(true)} className="press flex h-10 items-center gap-1.5 rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold text-ink-soft hover:text-berry"><Trash2 className="size-4" /> Okunanları temizle</button>
          </div>
        )}
      </PageHeader>
      {!!data?.data.length && <div className="mb-5"><Tabs value={filter} onChange={setFilter} items={[{ value: 'all', label: 'Tümü' }, { value: 'unread', label: `Okunmamış${data.unread ? ` (${data.unread})` : ''}` }]} /></div>}
      {!list.length ? (
        <Empty icon={<Bell className="size-8" />} title={filter === 'unread' ? 'Okunmamış bildirim yok' : 'Henüz bildirim yok'} text="Seri hatırlatmaları, lig sonuçları ve düello haberleri burada görünür." />
      ) : (
        Object.entries(groups).map(([g, items]) => (
          <section key={g} className="mb-6">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-ink-soft">{g}</p>
            <ul className="ink-card divide-y-2 divide-line/40 overflow-hidden">
              <AnimatePresence initial={false}>
                {items.map((n) => {
                  const Icon = iconFor(n.data.icon ?? 'bell')
                  return (
                    <motion.li key={n.id} layout exit={{ opacity: 0, x: 60, height: 0 }} transition={{ duration: 0.2 }} className={clsx('group relative flex items-center gap-3 px-4 py-3.5', !n.read && 'bg-sky/5')}>
                      {!n.read && <span aria-label="okunmadı" className="absolute left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-sky" />}
                      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-2xl', n.read ? 'bg-paper-2 text-ink-soft' : 'bg-sky/15 text-sky')}><Icon className="size-5" /></span>
                      <Link to={n.data.link ?? '#'} onClick={() => !n.read && readOne.mutate(n.id)} className="min-w-0 flex-1">
                        <p className={clsx('leading-snug', n.read ? 'font-semibold' : 'font-extrabold')}>{n.data.title}</p>
                        {n.data.body && <p className="line-clamp-2 text-sm text-ink-soft">{n.data.body}</p>}
                        <p className="mt-0.5 text-xs font-bold text-ink-soft">{ago(n.created_at)} önce</p>
                      </Link>
                      {n.data.link && <ChevronRight className="size-4 shrink-0 text-ink-soft" />}
                      <button onClick={() => remove.mutate(n.id)} aria-label="Bildirimi sil" className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft opacity-70 transition hover:bg-berry/10 hover:text-berry sm:opacity-0 sm:group-hover:opacity-100"><X className="size-4" /></button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </section>
        ))
      )}
      {!!data?.data.length && <button onClick={() => confirm('Tüm bildirimler silinsin mi?') && clear.mutate(false)} className="mx-auto mt-2 block text-sm font-bold text-ink-soft hover:text-berry">Tümünü sil</button>}
    </div>
  )
}
