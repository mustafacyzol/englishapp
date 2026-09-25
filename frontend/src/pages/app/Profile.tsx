import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { BookOpen, Brain, ChevronRight, Clock, Flame, Layers, Mic, Settings, Share2, Target, Zap } from 'lucide-react'
import { get } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR, num } from '@/lib/format'
import type { Achievement } from '@/lib/types'
import { AchievementBadge } from '@/components/game/AchievementBadge'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { Progress } from '@/components/ui/Misc'
import { img } from '@/lib/assets'
import { useToast } from '@/components/ui/Toast'

export function Avatar({ name, frame, size = 'size-24' }: { name: string; frame?: string; size?: string }) {
  return (
    <span className={clsx('relative grid place-items-center rounded-[28px] border-4 border-card bg-sky font-display text-4xl font-extrabold text-white shadow-lg', size, frame === 'gold' && 'ring-4 ring-butter ring-offset-2 ring-offset-paper')}>
      {name[0]}
    </span>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const toast = useToast()
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => get<{ data: Record<string, number> }>('/me/stats') })
  const cal = useQuery({ queryKey: ['calendar'], queryFn: () => get<{ data: { date: string; xp: number; goal_met: boolean; freeze_used: boolean }[] }>('/me/calendar') })
  const ach = useQuery({ queryKey: ['achievements'], queryFn: () => get<{ data: Achievement[] }>('/achievements') })
  if (!user) return null
  const s = stats.data?.data
  const unlocked = ach.data?.data.filter((a) => a.unlocked_at) ?? []

  const share = async () => {
    const url = `${location.origin}/r/${user.referral_code}`
    try {
      if (navigator.share) await navigator.share({ title: 'DilGO', text: `${user.stats.streak} günlük İngilizce serim var! Sen de katıl:`, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('Davet bağlantın kopyalandı!', 'success')
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="ink-card relative mb-6 overflow-hidden p-6">
        <img src={img('photos/classroom.webp')} alt="" className="absolute inset-x-0 top-0 h-20 w-full object-cover opacity-90" />
        <div className="relative flex flex-wrap items-end gap-5 pt-6">
          <Avatar name={user.name} frame={user.preferences.frame} />
          <div className="min-w-0 flex-1 pt-10 sm:pt-12">
            <h1 className="text-3xl font-extrabold">{user.name}</h1>
            <p className="font-semibold text-ink-soft">@{user.username} · {dateTR(user.created_at)} tarihinden beri</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="ink-chip py-0.5">{user.cefr_level}</span>
              <span className="ink-chip py-0.5">Seviye {user.stats.level}</span>
              {user.premium.active && <span className="ink-chip bg-butter/30 py-0.5 text-ink"><img src={img('rewards/crown.webp')} alt="" className="size-4" /> Premium</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={share} className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm" aria-label="Paylaş"><Share2 className="size-5" /></button>
            <Link to="/settings" className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm" aria-label="Ayarlar"><Settings className="size-5" /></Link>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft"><span>Seviye {user.stats.level}</span><span>{num(user.stats.xp_total)} / {num(user.stats.level_ceil)} XP</span></div>
          <Progress value={user.stats.xp_total - user.stats.level_floor} max={user.stats.level_ceil - user.stats.level_floor} color="bg-flame" tall />
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Flame className="size-6 fill-flame text-flame" />} value={user.stats.streak} label="Günlük seri" />
        <StatTile icon={<Zap className="size-6 fill-butter text-[#b8860b]" />} value={num(user.stats.xp_total)} label="Toplam XP" />
        <Link to="/leagues" className="ink-card press flex items-center gap-3 p-4">
          <LeagueEmblem tier={user.stats.league_tier} size={36} />
          <div><p className="font-display text-xl font-extrabold leading-none">{user.stats.league_name}</p><p className="text-xs font-bold text-ink-soft">Lig</p></div>
        </Link>
        <StatTile icon={<Target className="size-6 text-mint-deep" />} value={user.stats.streak_longest} label="En uzun seri" />
      </div>

      <section className="ink-card mb-6 p-5">
        <h2 className="mb-4 text-xl font-extrabold">Dört beceri</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skill icon={BookOpen} label="Okunan hikaye" v={s?.stories_read} color="bg-butter" />
          <Skill icon={Layers} label="Kelime" v={s?.words_saved} color="bg-mint" />
          <Skill icon={Mic} label="Konuşma" v={s?.speaking} color="bg-flame" />
          <Skill icon={Brain} label="Ada mesajı" v={s?.ai_messages} color="bg-sky" />
          <Skill icon={Target} label="Ders" v={s?.lessons_completed} color="bg-lilac" />
          <Skill icon={Zap} label="Hatasız ders" v={s?.perfect_lessons} color="bg-butter" />
          <Skill icon={Brain} label="Ustalaşılan kelime" v={s?.words_mastered} color="bg-mint" />
          <Skill icon={Clock} label="Dakika" v={s?.minutes} color="bg-sky" />
        </div>
      </section>

      <section className="ink-card mb-6 p-5">
        <h2 className="mb-4 text-xl font-extrabold">Çalışma takvimi</h2>
        <Heatmap days={cal.data?.data ?? []} />
      </section>

      <section className="ink-card p-5">
        <Link to="/profile/achievements" className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Rozetler <span className="text-ink-soft">({unlocked.length}/{ach.data?.data.length ?? 0})</span></h2>
          <ChevronRight className="size-5" />
        </Link>
        <div className="flex flex-wrap gap-3">
          {(unlocked.length ? unlocked : ach.data?.data ?? []).slice(0, 8).map((a) => (
            <div key={a.id} className="w-20 text-center" title={a.description}>
              <AchievementBadge tier={a.tier} icon={a.icon} category={a.category} size={72} locked={!a.unlocked_at} className="mx-auto" />
              <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight">{a.title}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="ink-card flex items-center gap-3 p-4">
      {icon}
      <div>
        <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-xs font-bold text-ink-soft">{label}</p>
      </div>
    </div>
  )
}

function Skill({ icon: Icon, label, v, color }: { icon: typeof Mic; label: string; v?: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-line/15 p-3">
      <span className={clsx('grid size-10 place-items-center rounded-xl border-2 border-line text-ink', color)}><Icon className="size-5" /></span>
      <div>
        <p className="font-display text-xl font-extrabold leading-none">{v ?? '–'}</p>
        <p className="text-[11px] font-bold text-ink-soft">{label}</p>
      </div>
    </div>
  )
}

function Heatmap({ days }: { days: { date: string; xp: number; goal_met: boolean; freeze_used: boolean }[] }) {
  const map = new Map(days.map((d) => [d.date.slice(0, 10), d]))
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 7 * 26 + 1 - ((end.getDay() + 6) % 7))
  const cells: { date: string; d?: (typeof days)[number] }[] = []
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    const k = t.toISOString().slice(0, 10)
    cells.push({ date: k, d: map.get(k) })
  }
  const level = (xp: number) => (xp === 0 ? 'bg-paper-2' : xp < 20 ? 'bg-butter/50' : xp < 50 ? 'bg-butter' : xp < 100 ? 'bg-flame/70' : 'bg-flame')
  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
        {cells.map((c) => (
          <span key={c.date} title={`${c.date}: ${c.d?.xp ?? 0} XP`} className={clsx('size-3.5 rounded-[4px] border border-line/25', c.d?.freeze_used ? 'bg-sky/60' : level(c.d?.xp ?? 0), c.d?.goal_met && 'border-line')} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-ink-soft">
        Az <span className="size-3 rounded bg-paper-2" /><span className="size-3 rounded bg-butter/50" /><span className="size-3 rounded bg-butter" /><span className="size-3 rounded bg-flame/70" /><span className="size-3 rounded bg-flame" /> Çok
        <span className="ml-3 size-3 rounded bg-sky/60" /> Dondurucu
      </div>
    </div>
  )
}
