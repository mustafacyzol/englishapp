import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Flame } from 'lucide-react'
import { get } from '@/lib/api'
import { UserAvatar } from './UserAvatar'

export interface SchoolRow { rank: number; user_id: number; name: string; username: string; avatar?: string | null; avatar_url?: string | null; frame?: string | null; class_name?: string | null; streak: number; xp: number; lessons: number; me?: boolean }

/**
 * The school's own league: one class or the whole school, ranked by the XP
 * earned this week or this month. Students see it next to the public league;
 * principals and teachers see it in the school panel.
 */
export function SchoolBoard({ endpoint, query = '', showClass = false, title }: { endpoint: string; query?: string; showClass?: boolean; title?: string }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const sep = endpoint.includes('?') || query ? '&' : '?'
  const { data, isLoading } = useQuery({
    queryKey: ['school-board', endpoint, query, period],
    queryFn: () => get<{ data: SchoolRow[]; class_name?: string | null; institution?: { name: string } | null }>(`${endpoint}${query ? `?${query}` : ''}${sep}period=${period}`),
  })
  const rows = data?.data ?? []
  const max = Math.max(1, ...rows.map((r) => r.xp))

  return (
    <section className="ink-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-soft">{data?.institution?.name ?? 'Okul ligi'}</p>
          <p className="truncate font-display text-lg font-black">{title ?? (data?.class_name ? `${data.class_name} sınıfı` : 'Bütün okul')}</p>
        </div>
        <div className="inline-flex rounded-xl bg-paper-2 p-1 text-sm font-extrabold" role="tablist">
          {(['week', 'month'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)} className={clsx('rounded-lg px-3 py-1.5 transition', period === p ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}>{p === 'week' ? 'Bu hafta' : 'Bu ay'}</button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-paper-2" />)}</div>
      ) : !rows.length ? (
        <p className="p-6 text-center text-sm text-ink-soft">Henüz kimse XP kazanmadı. İlk sen başla!</p>
      ) : (
        <ol>
          {rows.map((r, i) => (
            <motion.li key={r.user_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className={clsx('relative flex items-center gap-3 px-4 py-2.5', r.me && 'bg-sky/10')}>
              <span aria-hidden className="absolute inset-y-1 left-0 rounded-r-full bg-flame/[0.07]" style={{ width: `${(r.xp / max) * 100}%` }} />
              <span className={clsx('relative grid size-8 shrink-0 place-items-center rounded-full font-display font-black', r.rank === 1 ? 'bg-butter text-[#1f2433]' : r.rank === 2 ? 'bg-[#c9d1de] text-[#1f2433]' : r.rank === 3 ? 'bg-[#e0a878] text-[#1f2433]' : 'text-ink-soft')}>{r.rank}</span>
              <UserAvatar name={r.name} avatar={r.avatar} avatarUrl={r.avatar_url} frame={r.frame} className="relative size-10" />
              <span className="relative min-w-0 flex-1">
                <span className="block truncate font-bold">{r.me ? 'Sen' : r.name}</span>
                <span className="flex items-center gap-2 text-xs font-bold text-ink-soft">
                  {showClass && r.class_name && <span>{r.class_name}</span>}
                  <span>{r.lessons} ders</span>
                  {!!r.streak && <span className="inline-flex items-center gap-0.5"><Flame className="size-3.5 fill-flame text-flame" />{r.streak}</span>}
                </span>
              </span>
              <span className="relative font-mono text-sm font-bold tabular-nums">{r.xp} XP</span>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  )
}
