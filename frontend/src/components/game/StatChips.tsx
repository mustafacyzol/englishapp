import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { Me } from '@/lib/types'
import { num } from '@/lib/format'
import { rewardImg } from '@/lib/assets'
import { Img } from '@/components/ui/Img'

function Chip({ to, src, value, dim, title }: { to: string; src: string; value: React.ReactNode; dim?: boolean; title: string }) {
  return (
    <Link to={to} title={title} className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 font-extrabold tabular-nums transition hover:bg-paper-2">
      <Img src={src} alt="" className={clsx('size-7 object-contain', dim && 'opacity-40 grayscale')} />
      <span className={clsx(dim && 'text-ink-soft')}>{value}</span>
    </Link>
  )
}

export function StatChips({ user }: { user: Me; compact?: boolean }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Chip to="/profile" title="Günlük seri" src={rewardImg('flame')} value={user.stats.streak} dim={user.stats.streak === 0} />
      <Chip to="/shop" title="Elmas" src={rewardImg('gem')} value={num(user.stats.gems)} />
      <Chip to="/shop" title="Can" src={rewardImg('heart')} value={user.hearts.unlimited ? '∞' : user.hearts.hearts} />
    </div>
  )
}
