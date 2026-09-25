import { Link } from 'react-router-dom'
import { Flame, Gem, Heart, Infinity as InfinityIcon } from 'lucide-react'
import clsx from 'clsx'
import type { Me } from '@/lib/types'
import { num } from '@/lib/format'

export function StatChips({ user, compact }: { user: Me; compact?: boolean }) {
  const streakOn = user.stats.streak > 0
  return (
    <div className={clsx('flex items-center', compact ? 'gap-1.5' : 'gap-2')}>
      <Link to="/profile" className="ink-chip press" title="Günlük seri">
        <Flame className={clsx('size-[18px]', streakOn ? 'fill-flame text-flame animate-flicker' : 'text-ink-soft')} />
        <span className={clsx('tabular-nums', !streakOn && 'text-ink-soft')}>{user.stats.streak}</span>
      </Link>
      <Link to="/shop" className="ink-chip press" title="Elmas">
        <Gem className="size-[18px] fill-sky/30 text-sky" />
        <span className="tabular-nums">{num(user.stats.gems)}</span>
      </Link>
      <Link to="/shop" className="ink-chip press" title="Can">
        <Heart className="size-[18px] fill-berry text-berry" />
        {user.hearts.unlimited ? <InfinityIcon className="size-4" /> : <span className="tabular-nums">{user.hearts.hearts}</span>}
      </Link>
    </div>
  )
}
