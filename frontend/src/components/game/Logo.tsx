import clsx from 'clsx'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx('shrink-0', className)} aria-hidden>
      <rect x="6" y="8" width="54" height="54" rx="15" fill="#1B1F3B" />
      <rect x="3" y="3" width="54" height="54" rx="15" fill="#FF5A36" stroke="#1B1F3B" strokeWidth="3" />
      <path d="M17 16h9c9.4 0 15 5.6 15 13s-5.6 13-15 13h-9z" fill="#F6F1E7" stroke="#1B1F3B" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 20l8-4v22l-8-4z" fill="#FFD23F" stroke="#1B1F3B" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className, small }: { className?: string; small?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <LogoMark className={small ? 'size-8' : 'size-10'} />
      <span className={clsx('font-display font-extrabold leading-none tracking-tight', small ? 'text-xl' : 'text-2xl')}>
        Dil<span className="text-flame">GO</span>
      </span>
    </span>
  )
}
