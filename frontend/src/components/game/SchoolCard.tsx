import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpenCheck, ChevronRight, School, Trophy } from 'lucide-react'
import { get } from '@/lib/api'
import { num } from '@/lib/format'
import { Img } from '@/components/ui/Img'

interface League { institution: { name: string; logo_url: string | null } | null; class_name: string | null; data: { me: boolean; rank: number; xp: number }[] }
interface Hw { id: number; title: string; done: boolean; due_at: string | null }

/**
 * The learner's school on their own profile: the school and class they joined,
 * where they stand in the class league this week and the homework still open.
 * Nothing renders for learners who are not in a school.
 */
export function SchoolCard({ className }: { className?: string }) {
  const league = useQuery({ queryKey: ['school-league', 'class', 'week'], queryFn: () => get<League>('/me/school-league?scope=class'), retry: false, staleTime: 60_000 })
  const hw = useQuery({ queryKey: ['my-homework'], queryFn: () => get<{ data: Hw[] }>('/me/assignments'), enabled: !!league.data, staleTime: 60_000 })
  const l = league.data
  if (!l?.institution) return null
  const me = l.data.find((r) => r.me)
  const open = (hw.data?.data ?? []).filter((h) => !h.done)
  return (
    <section className={className}>
      <div className="ink-card overflow-hidden">
        <div className="flex items-center gap-4 border-b-2 border-line bg-[linear-gradient(120deg,rgba(47,124,246,.08),transparent_60%)] p-4 sm:p-5">
          {l.institution.logo_url
            ? <Img src={l.institution.logo_url} alt="" className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 ring-2 ring-line" />
            : <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sky/12 text-sky"><School className="size-7" /></span>}
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky">Okulum</p>
            <p className="truncate font-display text-xl font-black leading-tight">{l.institution.name}</p>
            {l.class_name && <p className="text-sm font-bold text-ink-soft">{l.class_name} sınıfı</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x-2 divide-line">
          <Link to="/leagues?view=class" className="flex items-center gap-3 p-4 transition hover:bg-paper-2">
            <Trophy className="size-6 shrink-0 text-butter-deep" />
            <span className="min-w-0">
              <span className="block font-display text-lg font-black leading-none">{me ? `${me.rank}. sıra` : '-'}</span>
              <span className="block truncate text-xs font-bold text-ink-soft">Sınıf ligi · {num(me?.xp ?? 0)} XP</span>
            </span>
          </Link>
          <Link to="/notifications" className="flex items-center gap-3 p-4 transition hover:bg-paper-2">
            <BookOpenCheck className="size-6 shrink-0 text-mint-deep" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-black leading-none">{open.length}</span>
              <span className="block truncate text-xs font-bold text-ink-soft">{open.length ? 'Açık ödev' : 'Ödevler tamam'}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink-soft" />
          </Link>
        </div>
      </div>
    </section>
  )
}
