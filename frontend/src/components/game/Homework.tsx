import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarClock, Check, ChevronRight, ClipboardList } from 'lucide-react'
import { get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface Hw { id: number; title: string; kind: string; note: string | null; class_name: string | null; due_at: string | null; link: string; done: boolean }

const due = (iso: string | null) => {
  if (!iso) return null
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
  return days < 0 ? 'süresi geçti' : days === 0 ? 'bugün son' : days === 1 ? 'yarın son' : `${days} gün kaldı`
}

/**
 * Homework from the student's teacher, on top of the path: open ones first, each
 * one tap from the lesson or story it points to. Lessons and stories tick
 * themselves off; anything else the student marks as done.
 */
export function HomeworkCard() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const on = user?.institution_role === 'student'
  const { data } = useQuery({ queryKey: ['my-homework'], queryFn: () => get<{ data: Hw[] }>('/me/assignments'), enabled: on, staleTime: 60_000 })
  const done = useMutation({ mutationFn: (id: number) => post<{ data: Hw[] }>(`/me/assignments/${id}/done`), onSuccess: (r) => qc.setQueryData(['my-homework'], r) })
  const list = (data?.data ?? []).slice().sort((a, b) => Number(a.done) - Number(b.done))
  if (!on || !list.length) return null
  const open = list.filter((h) => !h.done).length
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border-2 border-line bg-card">
      <p className="flex items-center gap-2 border-b-2 border-line/60 px-4 py-2.5 text-sm font-black">
        <ClipboardList className="size-4 text-flame" /> Ödevlerim
        <span className="ml-auto text-xs font-bold text-ink-soft">{open ? `${open} açık` : 'hepsi tamam 🎉'} · {user?.institution?.name}</span>
      </p>
      <ul>
        {list.slice(0, 4).map((h) => (
          <li key={h.id} className="flex items-center gap-3 border-b-2 border-line/40 px-4 py-2.5 last:border-b-0">
            <button disabled={h.done || h.kind === 'lesson' || h.kind === 'story'} onClick={() => done.mutate(h.id)} aria-label={h.done ? 'Tamamlandı' : 'Yaptım olarak işaretle'} className={clsx('grid size-7 shrink-0 place-items-center rounded-lg border-2 transition', h.done ? 'border-mint bg-mint text-white' : 'border-line enabled:hover:border-mint')}>
              {h.done && <Check className="size-4" strokeWidth={3} />}
            </button>
            <Link to={h.link} className={clsx('min-w-0 flex-1', h.done && 'opacity-55')}>
              <span className={clsx('block truncate text-sm font-extrabold', h.done && 'line-through')}>{h.title}</span>
              {(h.due_at || h.note) && <span className="flex items-center gap-1 truncate text-xs text-ink-soft">{h.due_at && <><CalendarClock className="size-3" /> {due(h.due_at)}</>}{h.note && <span className="truncate"> · {h.note}</span>}</span>}
            </Link>
            {!h.done && <Link to={h.link} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-paper-2" aria-label="Aç"><ChevronRight className="size-4" /></Link>}
          </li>
        ))}
      </ul>
    </section>
  )
}
