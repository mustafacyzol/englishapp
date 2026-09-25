import { Link } from 'react-router-dom'
import { Check, ChevronRight, GraduationCap, Snowflake } from 'lucide-react'
import clsx from 'clsx'
import { Progress } from '@/components/ui/Misc'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { timeLeft } from '@/lib/format'
import type { Me } from '@/lib/types'

export interface Dashboard {
  user: Me
  today: { xp: number; goal: number; goal_met: boolean; lessons: number; minutes: number }
  week: { date: string; xp: number; goal_met: boolean; freeze: boolean }[]
  quests: { id: number; title: string; target: number; progress: number; completed: boolean; claimed: boolean; reward_gems: number }[]
  league: { tier: number; tier_name: string; rank: number | null; xp: number; size: number; ends_at: string }
  due_words: number
  unread_notifications: number
  available_items: number
  announcement: string | null
}

const DAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa']

export function WeekStrip({ week }: { week: Dashboard['week'] }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="flex justify-between">
      {week.map((d, i) => (
        <div key={d.date} className="flex flex-col items-center gap-1">
          <span className={clsx('text-[11px] font-extrabold', d.date === today ? 'text-flame' : 'text-ink-soft')}>{DAYS[i]}</span>
          <span
            className={clsx(
              'grid size-8 place-items-center rounded-full border-2 border-line text-[#1B1F3B]',
              d.goal_met ? 'bg-flame text-white' : d.freeze ? 'bg-sky/60' : d.xp > 0 ? 'bg-butter' : 'bg-paper-2',
              d.date === today && 'ring-2 ring-flame ring-offset-2 ring-offset-card',
            )}
          >
            {d.goal_met ? <Check className="size-4" strokeWidth={3.5} /> : d.freeze ? <Snowflake className="size-4" /> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SideRail({ data }: { data: Dashboard }) {
  const { today, league, quests } = data
  return (
    <aside className="sticky top-24 hidden h-fit w-80 shrink-0 flex-col gap-5 xl:flex">
      <section className="ink-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">Günlük hedef</h3>
          <span className="font-mono text-sm">
            {today.xp}/{today.goal} XP
          </span>
        </div>
        <Progress value={today.xp} max={today.goal} color={today.goal_met ? 'bg-flame' : 'bg-butter'} tall />
        <div className="mt-4">
          <WeekStrip week={data.week} />
        </div>
      </section>

      <Link to="/leagues" className="ink-card press flex items-center gap-4 p-5">
        <LeagueEmblem tier={league.tier} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">{league.tier_name} Ligi</p>
          <p className="font-display text-xl font-extrabold">{league.rank ? `${league.rank}. sıra` : 'Katıl!'}</p>
          <p className="text-xs text-ink-soft">
            {league.xp} XP · {timeLeft(league.ends_at)} kaldı
          </p>
        </div>
        <ChevronRight className="size-5" />
      </Link>

      <section className="ink-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">Günlük görevler</h3>
          <Link to="/quests" className="text-sm font-bold text-flame">
            Tümü
          </Link>
        </div>
        <ul className="space-y-3">
          {quests.slice(0, 3).map((q) => (
            <li key={q.id}>
              <div className="mb-1 flex justify-between text-sm font-bold">
                <span>{q.title}</span>
                <span className="font-mono text-xs">
                  {q.progress}/{q.target}
                </span>
              </div>
              <Progress value={q.progress} max={q.target} color={q.completed ? 'bg-mint' : 'bg-sky'} />
            </li>
          ))}
        </ul>
      </section>

      <Link to="/rewards" className="group relative overflow-hidden rounded-[22px] border-2 border-line bg-mint p-5 text-[#0f2e27] shadow-hard">
        <GraduationCap className="absolute -bottom-4 -right-4 size-24 -rotate-12 opacity-20 transition group-hover:rotate-0" />
        <p className="text-xs font-extrabold uppercase tracking-widest">Bayrak Dil Okulları</p>
        <p className="mt-1 font-display text-lg font-extrabold leading-tight">Uygulamada kazandığın canlı ders kuponlarını şubede kullan.</p>
      </Link>
    </aside>
  )
}
