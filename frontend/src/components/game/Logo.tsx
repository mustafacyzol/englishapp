import clsx from 'clsx'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={clsx('shrink-0', className)} aria-hidden>
      <rect width="48" height="48" rx="14" fill="#E8403A" />
      <path d="M14 12h8.5c7.7 0 12.5 4.9 12.5 12s-4.8 12-12.5 12H14z" fill="#fff" />
      <circle cx="24" cy="24" r="4.2" fill="#E8403A" />
    </svg>
  )
}

export function Logo({ className, small }: { className?: string; small?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <LogoMark className={small ? 'size-8' : 'size-9'} />
      <span className={clsx('font-display font-black leading-none tracking-tight', small ? 'text-[22px]' : 'text-2xl')}>
        dil<span className="text-flame">go</span>
      </span>
    </span>
  )
}
