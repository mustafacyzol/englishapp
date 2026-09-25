import clsx from 'clsx'
import { leagueImg } from '@/lib/assets'

export function LeagueEmblem({ tier, size = 56, dim, className }: { tier: number; size?: number; dim?: boolean; className?: string }) {
  return <img src={leagueImg(tier)} alt="" width={size} height={size} loading="lazy" className={clsx('shrink-0 object-contain drop-shadow', className, dim && 'opacity-30 grayscale')} style={{ width: size, height: size }} />
}
