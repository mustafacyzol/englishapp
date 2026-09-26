import clsx from 'clsx'
import { TUTOR, type TutorPose } from '@/lib/tutor'
import { Img } from '@/components/ui/Img'

/** Defne's round avatar with an online dot and a soft "speaking" ring. */
export function Defne({ className, talking, online = true }: { className?: string; talking?: boolean; online?: boolean }) {
  return (
    <span className={clsx('relative inline-block shrink-0', className)}>
      <Img src={TUTOR.avatar} alt={TUTOR.name} className={clsx('size-full rounded-full bg-sage/15 object-cover ring-2 ring-card transition', talking && 'ring-4 ring-sage/60')} />
      {talking && <span aria-hidden className="absolute inset-0 animate-ping rounded-full ring-2 ring-sage/40" />}
      {online && <span className="absolute bottom-[4%] right-[4%] size-[22%] min-h-2.5 min-w-2.5 rounded-full border-2 border-card bg-mint" aria-label="çevrim içi" />}
    </span>
  )
}

/** A full-body cut-out of Defne reacting (cheering, thinking, waving). */
export function DefnePose({ pose = 'neutral', className }: { pose?: TutorPose; className?: string }) {
  return <Img src={TUTOR.pose[pose]} alt="" className={clsx('pointer-events-none select-none object-contain object-bottom', className)} />
}
