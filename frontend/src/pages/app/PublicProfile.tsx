import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowLeft, Crown, UserX } from 'lucide-react'
import { get } from '@/lib/api'
import { dateTR, num } from '@/lib/format'
import { AchievementBadge } from '@/components/game/AchievementBadge'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { ProfileBanner } from '@/components/game/ProfileBanner'
import { UserAvatar } from '@/components/game/UserAvatar'
import { Empty, Spinner } from '@/components/ui/Misc'

interface Pub {
  user: { name: string; username: string; avatar?: string | null; avatar_url?: string | null; frame?: string | null; banner?: string | null; bio?: string | null; cefr_level: string; xp_total: number; level: number; streak: number; streak_longest?: number; league_tier: number; league_name?: string; badges_count?: number; is_premium: boolean; joined_at: string }
  badges: { id: number; title: string; tier: 'bronze' | 'silver' | 'gold' | 'legend'; icon: string; category?: string }[]
}

/** What someone sees when they tap a name in the league or arena. */
export default function PublicProfile() {
  const { username } = useParams()
  const nav = useNavigate()
  const { data, isLoading, isError } = useQuery({ queryKey: ['pub', username], queryFn: () => get<Pub>(`/u/${username}`), retry: false })
  if (isError) return <Empty icon={<UserX className="size-8" />} title="Profil bulunamadı" text="Bu kullanıcı hesabını kapatmış olabilir." />
  if (isLoading || !data) return <Spinner />
  const u = data.user
  const stats = [
    { v: u.streak, l: 'Günlük seri', c: '#ff5a36' },
    { v: num(u.xp_total), l: 'Toplam XP', c: '#ffc233' },
    { v: u.level, l: 'Seviye', c: '#8f7cf8' },
    { v: u.badges_count ?? data.badges.length, l: 'Rozet', c: '#22b573' },
  ]
  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Geri</button>
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="ink-card overflow-hidden">
        <ProfileBanner banner={u.banner} className="h-32" />
        <div className="-mt-12 px-6">
          <UserAvatar name={u.name} avatar={u.avatar} avatarUrl={u.avatar_url} frame={u.frame} className="size-24 border-4 border-card" rounded="rounded-[28px]" />
        </div>
        <div className="px-6 pb-6 pt-3">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">{u.name} {u.is_premium && <Crown className="size-6 fill-butter text-butter-deep" />}</h1>
          <p className="text-ink-soft">@{u.username} · {dateTR(u.joined_at)} tarihinden beri · {u.cefr_level}</p>
          {u.bio && <p className="mt-3 text-[15px]">{u.bio}</p>}
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-paper-2 p-3">
            <LeagueEmblem tier={u.league_tier} size={44} />
            <div><p className="font-display text-lg font-black">{u.league_name ?? ''} Ligi</p><p className="text-xs font-bold text-ink-soft">Bu hafta yarıştığı lig</p></div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.l}>
                <span aria-hidden className="mb-2 block h-1 w-6 rounded-full" style={{ background: s.c }} />
                <p className="font-display text-2xl font-black leading-none tabular-nums">{s.v}</p>
                <p className="mt-1 text-[11px] font-bold text-ink-soft">{s.l}</p>
              </div>
            ))}
          </div>
          {!!data.badges.length && (
            <>
              <p className="mb-3 mt-6 text-xs font-black uppercase tracking-widest text-ink-soft">Son rozetler</p>
              <div className="flex flex-wrap gap-3">
                {data.badges.map((b) => <div key={b.id} className="w-20 text-center"><AchievementBadge tier={b.tier} icon={b.icon} category={b.category} size={60} className="mx-auto" /><p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight">{b.title}</p></div>)}
              </div>
            </>
          )}
        </div>
      </motion.section>
    </div>
  )
}
