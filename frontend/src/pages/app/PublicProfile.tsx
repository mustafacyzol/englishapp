import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Crown, Flame, Zap } from 'lucide-react'
import { get } from '@/lib/api'
import { dateTR, num } from '@/lib/format'
import { AchievementBadge } from '@/components/game/AchievementBadge'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { Spinner } from '@/components/ui/Misc'
import { Avatar } from './Profile'

interface Pub { user: { name: string; username: string; cefr_level: string; xp_total: number; level: number; streak: number; league_tier: number; is_premium: boolean; joined_at: string }; badges: { id: number; title: string; tier: 'bronze' | 'silver' | 'gold' | 'legend'; icon: string; category?: string }[] }

export default function PublicProfile() {
  const { username } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['pub', username], queryFn: () => get<Pub>(`/u/${username}`) })
  if (isLoading || !data) return <Spinner />
  const u = data.user
  return (
    <div className="mx-auto max-w-xl">
      <div className="ink-card p-6 text-center">
        <Avatar name={u.name} size="size-24 mx-auto" />
        <h1 className="mt-4 text-3xl font-extrabold">{u.name} {u.is_premium && <Crown className="inline size-6 text-flame" />}</h1>
        <p className="text-ink-soft">@{u.username} · {dateTR(u.joined_at)}</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-line p-3"><Flame className="mx-auto size-6 fill-flame text-flame" /><p className="font-display text-xl font-extrabold">{u.streak}</p></div>
          <div className="rounded-2xl border-2 border-line p-3"><Zap className="mx-auto size-6 text-butter" /><p className="font-display text-xl font-extrabold">{num(u.xp_total)}</p></div>
          <div className="grid place-items-center rounded-2xl border-2 border-line p-2"><LeagueEmblem tier={u.league_tier} size={34} /></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {data.badges.map((b) => <div key={b.id} className="w-20"><AchievementBadge tier={b.tier} icon={b.icon} category={b.category} size={64} className="mx-auto" /><p className="text-[11px] font-bold">{b.title}</p></div>)}
        </div>
      </div>
    </div>
  )
}
