import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { ArrowLeft, ChevronsDown, ChevronsUp, Clock, Flame } from 'lucide-react'
import { img } from '@/lib/assets'
import { get } from '@/lib/api'
import { timeLeft } from '@/lib/format'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { SkeletonPage } from '@/components/ui/Misc'
import { Img } from '@/components/ui/Img'
import { UserAvatar } from '@/components/game/UserAvatar'

interface Standings {
  week_key: string
  ends_at: string
  tier: number
  tier_name: string
  tiers: string[]
  promote_count: number
  demote_count: number
  rows: { rank: number; user_id: number; name: string; username: string; avatar?: string | null; avatar_url?: string | null; frame?: string | null; streak?: number; cefr_level?: string; xp: number; is_me: boolean; is_premium: boolean }[]
}


export default function Leagues() {
  const { data, isLoading } = useQuery({ queryKey: ['league'], queryFn: () => get<Standings>('/league'), refetchInterval: 30_000 })
  if (isLoading || !data) return <SkeletonPage variant="list" />
  const n = data.rows.length

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/duel" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Arena</Link>
      <div className="no-scrollbar mb-6 flex items-center gap-3 overflow-x-auto px-2 py-3">
        {data.tiers.map((t, i) => (
          <div key={t} className={clsx('flex shrink-0 flex-col items-center', i === data.tier ? 'scale-110' : 'opacity-60')}>
            <LeagueEmblem tier={i} size={i === data.tier ? 60 : 42} dim={i > data.tier} />
          </div>
        ))}
      </div>
      <div className="mb-6 text-center">
        <LeagueEmblem tier={data.tier} size={120} className="mx-auto mb-2" />
        <h1 className="text-4xl font-extrabold">{data.tier_name} Ligi</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 font-semibold text-ink-soft"><Clock className="size-4" /> {timeLeft(data.ends_at)} kaldı · İlk {data.promote_count} bir üst lige çıkar</p>
      </div>

      {n >= 3 && <Podium rows={data.rows.slice(0, 3)} />}

      <ol className="ink-card overflow-hidden">
        {data.rows.map((r) => {
          const promote = r.rank <= data.promote_count
          const demote = data.demote_count > 0 && r.rank > n - data.demote_count
          return (
            <li key={r.user_id}>
              {r.rank === data.promote_count + 1 && data.promote_count > 0 && <Divider up />}
              {demote && r.rank === n - data.demote_count + 1 && <Divider />}
              <Link to={`/u/${r.username}`} className={clsx('flex items-center gap-3 px-4 py-3', r.is_me ? 'bg-sky/10 ring-2 ring-inset ring-sky/40' : 'hover:bg-paper-2')}>
                <span className={clsx('grid size-8 place-items-center font-display text-lg font-extrabold', r.rank <= 3 && 'rounded-full text-white', r.rank === 1 && 'bg-butter-deep', r.rank === 2 && 'bg-[#9AA5B8]', r.rank === 3 && 'bg-[#D0874E]', promote && r.rank > 3 && 'text-mint-deep', demote && 'text-berry')}>{r.rank}</span>
                <UserAvatar name={r.name} avatar={r.avatar} avatarUrl={r.avatar_url} frame={r.frame} className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {r.is_me ? 'Sen' : r.name}
                    {r.is_premium && <Img src={img('rewards/crown.webp')} alt="Premium" className="ml-1 inline size-5 align-[-3px]" />}
                  </span>
                  <span className="flex items-center gap-2 text-xs font-bold text-ink-soft">{r.cefr_level}{!!r.streak && <span className="inline-flex items-center gap-0.5"><Flame className="size-3.5 fill-flame text-flame" />{r.streak}</span>}</span>
                </span>
                <span className="font-mono text-sm font-bold">{r.xp} XP</span>
              </Link>
            </li>
          )
        })}
      </ol>
      {n < 5 && <p className="mt-4 text-center text-sm text-ink-soft">Grubun doluyor. XP kazandıkça yeni öğrenciler katılacak!</p>}
    </div>
  )
}

/** The top three on steps, each in the frame they wear: the reason to dress up your profile. */
function Podium({ rows }: { rows: Standings['rows'] }) {
  const order = [rows[1], rows[0], rows[2]]
  const h = ['h-16', 'h-24', 'h-12']
  const tone = ['bg-[#c9d1de]', 'bg-butter', 'bg-[#e0a878]']
  return (
    <div className="mb-6 grid grid-cols-3 items-end gap-3">
      {order.map((r, i) => (
        <motion.div key={r.user_id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: [0.15, 0, 0.3][i], type: 'spring', stiffness: 200, damping: 20 }} className="text-center">
          <Link to={`/u/${r.username}`} className="group inline-block">
            <UserAvatar name={r.name} avatar={r.avatar} avatarUrl={r.avatar_url} frame={r.frame} className={clsx('mx-auto transition group-hover:-translate-y-1', i === 1 ? 'size-20' : 'size-16')} rounded="rounded-[24px]" />
            <p className="mt-2 truncate text-sm font-extrabold">{r.is_me ? 'Sen' : r.name.split(' ')[0]}</p>
            <p className="font-mono text-xs font-bold text-ink-soft">{r.xp} XP</p>
          </Link>
          <div className={clsx('mt-2 grid place-items-start justify-center rounded-t-2xl pt-2 font-display text-2xl font-black text-[#1f2433]', h[i], tone[i])}>{r.rank}</div>
        </motion.div>
      ))}
    </div>
  )
}

function Divider({ up }: { up?: boolean }) {
  return (
    <div className={clsx('flex items-center justify-center gap-2 border-y-2 border-dashed py-1.5 text-xs font-extrabold uppercase tracking-widest', up ? 'border-mint text-mint-deep' : 'border-berry text-berry')}>
      {up ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
      {up ? 'Terfi bölgesi' : 'Düşme bölgesi'}
    </div>
  )
}
