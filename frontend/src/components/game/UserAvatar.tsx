import clsx from 'clsx'
import { avatarUrl } from '@/lib/avatars'

/** Profile frames bought in the shop. */
export const FRAMES: Record<string, string> = {
  gold: 'ring-4 ring-butter ring-offset-2 ring-offset-paper',
  flame: 'ring-4 ring-flame ring-offset-2 ring-offset-paper',
  emerald: 'ring-4 ring-mint ring-offset-2 ring-offset-paper',
  sky: 'ring-4 ring-sky ring-offset-2 ring-offset-paper',
}

const TINTS = ['bg-sky', 'bg-flame', 'bg-mint-deep', 'bg-lilac', 'bg-berry', 'bg-ink']

/**
 * A learner's picture: the avatar they picked, or their initial on a colour
 * derived from their name when they have not picked one yet.
 */
export function UserAvatar({ name, avatar, frame, className = 'size-10', rounded = 'rounded-full' }: { name?: string | null; avatar?: string | null; frame?: string; className?: string; rounded?: string }) {
  const src = avatarUrl(avatar)
  const n = name ?? '?'
  const tint = TINTS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length]
  return (
    <span className={clsx('relative grid shrink-0 place-items-center overflow-hidden font-display font-extrabold text-white', rounded, !src && tint, className, frame && FRAMES[frame])}>
      {src ? <img src={src} alt="" className="size-full object-cover" draggable={false} /> : <span className="text-[0.45em] leading-none">{n[0]?.toLocaleUpperCase('tr')}</span>}
    </span>
  )
}
