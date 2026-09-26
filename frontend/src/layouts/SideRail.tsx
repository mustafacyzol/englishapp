import { Link } from 'react-router-dom'
import { Check, ChevronRight, Snowflake } from 'lucide-react'
import clsx from 'clsx'
import { Progress } from '@/components/ui/Misc'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { PHOTO, rewardImg } from '@/lib/assets'
import { timeLeft } from '@/lib/format'
import type { Me } from '@/lib/types'
import { Img } from '@/components/ui/Img'

export interface NextReward { kind: string; title: string; icon: string; current: number; target: number; unit: string }

export interface Dashboard {
  user: Me
  today: { xp: number; goal: number; goal_met: boolean; lessons: number; minutes: number }
  week: { date: string; xp: number; goal_met: boolean; freeze: boolean }[]
  quests: { id: number; title: string; target: number; progress: number; completed: boolean; claimed: boolean; reward_gems: number }[]
  league: { tier: number; tier_name: string; rank: number | null; xp: number; size: number; ends_at: string }
  next_rewards?: NextReward[]
  due_words: number
  unread_notifications: number
  available_items: number
  announcement: string | null
  skills?: import('@/lib/skills').SkillReport
  plan?: import('@/pages/app/Learn').PlanItem[]
}

const DAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

export function WeekStrip({ week }: { week: Dashboard['week'] }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="flex justify-between">
      {week.map((d, i) => (
        <div key={d.date} className="flex flex-col items-center gap-1.5">
          <span className={clsx('text-[11px] font-extrabold', d.date === today ? 'text-flame' : 'text-ink-soft')}>{DAYS[i]}</span>
          <span className={clsx('grid size-8 place-items-center rounded-full text-white', d.goal_met ? 'bg-flame' : d.freeze ? 'bg-sky' : d.xp > 0 ? 'bg-butter' : 'bg-paper-2', d.date === today && !d.goal_met && 'ring-2 ring-flame/50')}>
            {d.goal_met ? <Check className="size-4" strokeWidth={3.5} /> : d.freeze ? <Snowflake className="size-4" /> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SideRail({ data }: { data: Dashboard }) {
  const { today, league, quests } = data
  const next = data.next_rewards?.[0]
  return (
    <aside className="sticky top-24 hidden h-fit w-80 shrink-0 flex-col gap-4 xl:flex">
      <Link to="/leagues" className="ink-card press flex items-center gap-4 p-4">
        <LeagueEmblem tier={league.tier} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">{league.tier_name} Ligi</p>
          <p className="text-xl font-black">{league.rank ? `${league.rank}. sıradasın` : 'Hadi başla!'}</p>
          <p className="text-xs font-semibold text-ink-soft">{league.xp} XP · {timeLeft(league.ends_at)} kaldı</p>
        </div>
        <ChevronRight className="size-5 text-ink-soft" />
      </Link>

      <section className="ink-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg">Günlük hedef</h3>
          <span className="text-sm font-extrabold text-ink-soft">{today.xp}/{today.goal} XP</span>
        </div>
        <Progress value={today.xp} max={today.goal} color={today.goal_met ? 'bg-flame' : 'bg-butter'} tall />
        <div className="mt-4"><WeekStrip week={data.week} /></div>
      </section>

      {next && (
        <Link to="/rewards#yol" className="ink-card press flex items-center gap-3 p-4">
          <Img src={rewardImg(next.icon)} alt="" className="size-14 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">Sıradaki ödül</p>
            <p className="font-black leading-tight">{next.title}</p>
            <Progress value={next.current} max={next.target} color="bg-mint" className="mt-2" />
            <p className="mt-1 text-xs font-bold text-ink-soft">{next.current}/{next.target} {next.unit}</p>
          </div>
        </Link>
      )}

      <section className="ink-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg">Günlük görevler</h3>
          <Link to="/quests" className="text-sm font-extrabold uppercase text-sky">Tümü</Link>
        </div>
        <ul className="space-y-4">
          {quests.slice(0, 3).map((q) => (
            <li key={q.id} className="flex items-center gap-3">
              <Img src={rewardImg(q.completed ? 'chest' : 'gem')} alt="" className={clsx('size-9 object-contain', !q.completed && 'opacity-80')} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 truncate text-sm font-bold">{q.title}</p>
                <Progress value={q.progress} max={q.target} color={q.completed ? 'bg-mint' : 'bg-butter'} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Link to="/rewards" className="group relative block h-40 overflow-hidden rounded-[var(--radius-blob)]">
        <Img src={PHOTO.classroom} alt="" className="photo transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <p className="text-xs font-extrabold uppercase tracking-widest text-butter">Bayrak Dil Okulları</p>
          <p className="font-black leading-tight">Canlı ders kuponlarını gerçek öğretmenlerimizle kullan</p>
        </div>
      </Link>
    </aside>
  )
}
