import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronsDown, ChevronsUp, Clock, Crown } from 'lucide-react'
import { get } from '@/lib/api'
import { timeLeft } from '@/lib/format'
import { LeagueEmblem } from '@/components/game/LeagueEmblem'
import { Spinner } from '@/components/ui/Misc'

interface Standings {
  week_key: string
  ends_at: string
  tier: number
  tier_name: string
  tiers: string[]
  promote_count: number
  demote_count: number
  rows: { rank: number; user_id: number; name: string; username: string; xp: number; is_me: boolean; is_premium: boolean }[]
}

export default function Leagues() {
  const { data, isLoading } = useQuery({ queryKey: ['league'], queryFn: () => get<Standings>('/league'), refetchInterval: 30_000 })
  if (isLoading || !data) return <Spinner />
  const n = data.rows.length

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-scrollbar mb-6 flex gap-3 overflow-x-auto pb-2">
        {data.tiers.map((t, i) => (
          <div key={t} className={clsx('flex shrink-0 flex-col items-center', i === data.tier ? 'scale-110' : 'opacity-60')}>
            <LeagueEmblem tier={i} size={i === data.tier ? 60 : 42} dim={i > data.tier} />
          </div>
        ))}
      </div>
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold">{data.tier_name} Ligi</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 font-semibold text-ink-soft"><Clock className="size-4" /> {timeLeft(data.ends_at)} kaldı · İlk {data.promote_count} bir üst lige çıkar</p>
      </div>

      <ol className="ink-card overflow-hidden">
        {data.rows.map((r) => {
          const promote = r.rank <= data.promote_count
          const demote = data.demote_count > 0 && r.rank > n - data.demote_count
          return (
            <li key={r.user_id}>
              {r.rank === data.promote_count + 1 && data.promote_count > 0 && <Divider up />}
              {demote && r.rank === n - data.demote_count + 1 && <Divider />}
              <Link to={`/u/${r.username}`} className={clsx('flex items-center gap-3 px-4 py-3', r.is_me ? 'bg-butter/60 dark:bg-butter/20' : 'hover:bg-paper-2')}>
                <span className={clsx('grid size-8 place-items-center font-display text-lg font-extrabold', r.rank <= 3 && 'rounded-full border-2 border-line text-[#1B1F3B]', r.rank === 1 && 'bg-butter', r.rank === 2 && 'bg-[#D6DBE6]', r.rank === 3 && 'bg-[#E8955A]', promote && r.rank > 3 && 'text-mint-deep', demote && 'text-berry')}>{r.rank}</span>
                <span className="grid size-10 place-items-center rounded-full border-2 border-line bg-sky font-display font-extrabold text-white">{r.name?.[0]}</span>
                <span className="flex-1 font-bold">
                  {r.is_me ? 'Sen' : r.name}
                  {r.is_premium && <Crown className="ml-1 inline size-4 text-flame" />}
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

function Divider({ up }: { up?: boolean }) {
  return (
    <div className={clsx('flex items-center justify-center gap-2 border-y-2 border-dashed py-1.5 text-xs font-extrabold uppercase tracking-widest', up ? 'border-mint text-mint-deep' : 'border-berry text-berry')}>
      {up ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
      {up ? 'Terfi bölgesi' : 'Düşme bölgesi'}
    </div>
  )
}
