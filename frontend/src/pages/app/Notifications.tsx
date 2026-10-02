import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { CheckCheck, ChevronRight, Trash2, X } from 'lucide-react'
import { del, get, post } from '@/lib/api'
import { iconFor } from '@/components/game/icons'
import { HomeworkCard } from '@/components/game/Homework'
import { Higo } from '@/components/game/Higo'
import { Spinner } from '@/components/ui/Misc'

interface N { id: string; read: boolean; created_at: string; data: { kind?: string; title: string; body?: string; icon?: string; link?: string } }

/** "Bugün", "Dün", "Bu hafta", "Daha eski": an inbox you can scan in a second. */
function bucket(iso: string) {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = (today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 864e5
  return diff <= 0 ? 'Bugün' : diff === 1 ? 'Dün' : diff < 7 ? 'Bu hafta' : 'Daha eski'
}
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'şimdi' : m < 60 ? `${m} dk önce` : m < 1440 ? `${Math.round(m / 60)} sa önce` : `${Math.round(m / 1440)} g önce`
}

/** Each kind wears one of the app's own colours, the same ones it has elsewhere. */
const TONE: Record<string, string> = {
  streak: 'bg-flame text-white', homework: 'bg-mint text-white', league: 'bg-butter text-[#1f2433]', duel: 'bg-berry text-white',
  achievement: 'bg-laurel text-white', report: 'bg-sky text-white', gift: 'bg-lilac text-white', comeback: 'bg-sage text-white',
}
const KINDS: { value: string; label: string; match: (k: string) => boolean }[] = [
  { value: 'all', label: 'Tümü', match: () => true },
  { value: 'study', label: 'Ödev ve dersler', match: (k) => ['homework', 'report', 'comeback', 'streak'].includes(k) },
  { value: 'arena', label: 'Arena', match: (k) => ['league', 'duel'].includes(k) },
  { value: 'rewards', label: 'Ödüller', match: (k) => ['achievement', 'gift'].includes(k) },
]

export default function Notifications() {
  const qc = useQueryClient()
  const [kind, setKind] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
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
  // Opening the inbox doesn't silently mark everything read: unread stays visible until you act.
  useEffect(() => () => void qc.invalidateQueries({ queryKey: ['dashboard'] }), [qc])
  if (isLoading) return <Spinner />
  const all = data?.data ?? []
  const match = KINDS.find((k) => k.value === kind)!.match
  const list = all.filter((n) => match(n.data.kind ?? '') && (!unreadOnly || !n.read))
  const groups = list.reduce<Record<string, N[]>>((a, n) => ((a[bucket(n.created_at)] ??= []).push(n), a), {})

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Bildirimler</h1>
          <p className="mt-1 text-sm font-bold text-ink-soft">{data?.unread ? `${data.unread} yeni haber var` : 'Hepsini okudun'}</p>
        </div>
        {!!data?.unread && (
          <button onClick={() => readAll.mutate()} className="press flex h-10 shrink-0 items-center gap-1.5 rounded-xl border-2 border-line bg-card px-3 text-sm font-extrabold">
            <CheckCheck className="size-4 text-mint" /> <span className="hidden sm:inline">Tümünü</span> okundu
          </button>
        )}
      </header>

      {/* Homework lives here, not on the path: the inbox is where news from the teacher lands. */}
      <div className="mb-5 empty:hidden [&>section]:mt-0"><HomeworkCard /></div>

      {!!all.length && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <button key={k.value} onClick={() => setKind(k.value)} aria-pressed={kind === k.value} className={clsx('rounded-full border-2 px-3.5 py-1.5 text-sm font-extrabold transition', kind === k.value ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-soft hover:text-ink')}>
              {k.label}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-soft">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="size-4 accent-[var(--color-flame)]" /> Okunmamış
          </label>
        </div>
      )}

      {!list.length ? (
        <div className="ink-card flex flex-col items-center px-6 py-10 text-center">
          <Higo pose="nap" className="size-28" />
          <p className="mt-3 font-display text-xl font-black">{all.length ? 'Burada bir şey yok' : 'Sessiz bir gün'}</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">Ödevler, seri hatırlatmaları, lig sonuçları ve düellolar burada görünür.</p>
        </div>
      ) : (
        Object.entries(groups).map(([g, items]) => (
          <section key={g} className="mb-6">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-widest text-ink-soft">{g}</p>
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((n) => {
                  const Icon = iconFor(n.data.icon ?? 'bell')
                  const tone = TONE[n.data.kind ?? ''] ?? 'bg-ink text-paper'
                  return (
                    <motion.li key={n.id} layout exit={{ opacity: 0, x: 60, height: 0, marginTop: 0 }} transition={{ duration: 0.2 }}
                      className={clsx('group relative flex items-center gap-3 rounded-2xl border-2 bg-card px-3 py-3 sm:px-4', n.read ? 'border-line' : 'border-ink/80 shadow-[0_3px_0_var(--color-ink)]')}>
                      <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', tone, n.read && 'opacity-60 grayscale-[.3]')}><Icon className="size-5" strokeWidth={2.4} /></span>
                      <Link to={n.data.link ?? '#'} onClick={() => !n.read && readOne.mutate(n.id)} className="min-w-0 flex-1">
                        <p className={clsx('leading-snug', n.read ? 'font-semibold text-ink-soft' : 'font-extrabold')}>{n.data.title}</p>
                        {n.data.body && <p className="line-clamp-2 text-sm text-ink-soft">{n.data.body}</p>}
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-ink-soft">{!n.read && <span className="size-1.5 rounded-full bg-flame" />}{ago(n.created_at)}</p>
                      </Link>
                      {n.data.link && <ChevronRight className="size-4 shrink-0 text-ink-soft" />}
                      <button onClick={() => remove.mutate(n.id)} aria-label="Bildirimi sil" className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft opacity-70 transition hover:bg-flame/10 hover:text-flame sm:opacity-0 sm:group-hover:opacity-100"><X className="size-4" /></button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </section>
        ))
      )}
      {!!all.length && (
        <div className="mt-2 flex justify-center gap-5 text-sm font-bold text-ink-soft">
          <button onClick={() => confirm('Okunan bildirimler silinsin mi?') && clear.mutate(true)} className="flex items-center gap-1.5 hover:text-flame"><Trash2 className="size-4" /> Okunanları temizle</button>
          <button onClick={() => confirm('Tüm bildirimler silinsin mi?') && clear.mutate(false)} className="hover:text-flame">Tümünü sil</button>
        </div>
      )}
    </div>
  )
}
