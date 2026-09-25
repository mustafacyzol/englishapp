import clsx from 'clsx'
import { PHOTO } from '@/lib/assets'

/** Ada — DilGO's AI English teacher, shown as a real portrait with a live "speaking" ring. */
export function Ada({ className, talking, online = true }: { className?: string; talking?: boolean; online?: boolean }) {
  return (
    <span className={clsx('relative inline-block shrink-0', className)}>
      <img src={PHOTO.ada} alt="Ada" className={clsx('size-full rounded-full object-cover ring-2 ring-card transition', talking && 'ring-4 ring-sky/60 animate-pulse')} />
      {online && <span className="absolute bottom-[4%] right-[4%] size-[22%] min-h-2.5 min-w-2.5 rounded-full border-2 border-card bg-mint" aria-label="çevrim içi" />}
    </span>
  )
}
