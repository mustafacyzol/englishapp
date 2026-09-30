import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SkillMeter } from '@/components/game/SkillMeter'
import clsx from 'clsx'
import { ChevronRight, Flame, ImageIcon, Pencil, Settings, Share2, Target, Zap } from 'lucide-react'
import { ProfileBanner } from '@/components/game/ProfileBanner'
import { get } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR, num } from '@/lib/format'
import type { Achievement } from '@/lib/types'
import { AchievementBadge } from '@/components/game/AchievementBadge'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { Progress } from '@/components/ui/Misc'
import { img } from '@/lib/assets'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'
import { UserAvatar } from '@/components/game/UserAvatar'
import { AvatarPicker } from '@/components/game/AvatarPicker'

/** Kept for other screens: the profile picture at the large profile size. */
export function Avatar({ name, avatar, frame, size = 'size-24' }: { name: string; avatar?: string | null; frame?: string | null; size?: string }) {
  return <UserAvatar name={name} avatar={avatar} frame={frame} className={clsx('border-4 border-card text-4xl shadow-lg', size)} rounded="rounded-[28px]" />
}

export default function Profile() {
  const { user } = useAuth()
  const toast = useToast()
  const [picker, setPicker] = useState<null | 'avatar' | 'frame' | 'banner' | 'bio'>(null)
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
      <section className="ink-card relative mb-6 overflow-hidden">
        {/* the cover is only a picture: nothing sits on it except a small "change cover" chip */}
        <div className="relative">
          <ProfileBanner banner={user.banner} className="h-32 sm:h-40" />
          <button onClick={() => setPicker('banner')} className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-extrabold text-white backdrop-blur transition hover:bg-black/60">
            <ImageIcon className="size-3.5" /> Kapağı değiştir
          </button>
        </div>
        <div className="px-5 pb-6 sm:px-6">
          <div className="-mt-12 flex items-end gap-4">
            <button onClick={() => setPicker('avatar')} className="group relative shrink-0 rounded-[28px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky/30" aria-label="Avatarını değiştir">
              <Avatar name={user.name} avatar={user.avatar} frame={user.frame} />
              <span className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border-4 border-card bg-ink text-paper transition group-hover:scale-110"><Pencil className="size-3.5" /></span>
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold leading-tight">{user.name}</h1>
              <p className="font-semibold text-ink-soft">@{user.username} · {dateTR(user.created_at)} tarihinden beri</p>
            </div>
            {/* one primary action, two quiet ones, all below the cover */}
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setPicker('avatar')} className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-extrabold text-paper shadow-hard-sm sm:flex-none"><Pencil className="size-4" /> Profili düzenle</button>
              <button onClick={share} className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card" aria-label="Profilini paylaş" title="Paylaş"><Share2 className="size-5" /></button>
              <Link to="/settings" className="press grid size-11 place-items-center rounded-xl border-2 border-line bg-card" aria-label="Ayarlar" title="Ayarlar"><Settings className="size-5" /></Link>
            </div>
          </div>
          {picker && <AvatarPicker open onClose={() => setPicker(null)} start={picker} />}

          {user.bio ? <p className="mt-3 max-w-lg text-[15px]">{user.bio}</p> : <button onClick={() => setPicker('bio')} className="mt-3 text-sm font-bold text-flame">+ Kendinden bir cümle ekle</button>}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="ink-chip py-0.5">{user.cefr_level}</span>
            <span className="ink-chip py-0.5">Seviye {user.stats.level}</span>
            {user.premium.active && <span className="ink-chip bg-butter/30 py-0.5 text-ink"><Img src={img('rewards/crown.webp')} alt="" className="size-4" /> Premium</span>}
          </div>
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft"><span>Seviye {user.stats.level}</span><span>{num(user.stats.xp_total)} / {num(user.stats.level_ceil)} XP</span></div>
            <Progress value={user.stats.xp_total - user.stats.level_floor} max={user.stats.level_ceil - user.stats.level_floor} color="bg-flame" tall />
          </div>
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

      <SkillMeter className="mb-6" />

      <section className="ink-card mb-6 p-5">
        <h2 className="mb-4 text-xl font-extrabold">İstatistikler</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat label="Ders" v={s?.lessons_completed} tone="#8f7cf8" />
          <Stat label="Hatasız ders" v={s?.perfect_lessons} tone="#ffc233" />
          <Stat label="Okunan hikâye" v={s?.stories_read} tone="#ff5a36" />
          <Stat label="Çalışma dakikası" v={s?.minutes} tone="#2f7cf6" />
          <Stat label="Defterdeki kelime" v={s?.words_saved} tone="#22b573" />
          <Stat label="Ustalaşılan kelime" v={s?.words_mastered} tone="#0f8a55" />
          <Stat label="Konuşma denemesi" v={s?.speaking} tone="#ff7fb0" />
          <Stat label="Defne ile mesaj" v={s?.ai_messages} tone="#3ad7ff" />
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

/** One number, one label and a short colour tick: quiet, readable, no clip-art. */
function Stat({ label, v, tone }: { label: string; v?: number; tone: string }) {
  return (
    <div>
      <span aria-hidden className="mb-2 block h-1 w-6 rounded-full" style={{ background: tone }} />
      <p className="font-display text-3xl font-black leading-none tabular-nums">{v === undefined ? '-' : num(v)}</p>
      <p className="mt-1 text-xs font-bold text-ink-soft">{label}</p>
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
