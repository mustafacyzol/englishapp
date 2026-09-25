import { type ReactNode, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { LogoMark } from '@/components/game/Logo'

export function Card({ className, children, as: As = 'div', ...rest }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' } & Record<string, unknown>) {
  return (
    <As className={clsx('ink-card', className)} {...rest}>
      {children}
    </As>
  )
}

export function Progress({ value, max = 100, color = 'bg-mint', className, tall }: { value: number; max?: number; color?: string; className?: string; tall?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className={clsx('relative overflow-hidden rounded-full bg-paper-2', tall ? 'h-4' : 'h-3', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={clsx('h-full rounded-full', color)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
        <div className="mx-2 mt-[3px] h-[3px] rounded-full bg-white/35" />
      </motion.div>
    </div>
  )
}

export function Sticker({ children, color = 'bg-butter', className }: { children: ReactNode; color?: string; rotate?: number; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#1f2433]', color, className)}>
      {children}
    </span>
  )
}

/**
 * Branded loading state: the DilGO mark inside a sweeping ring. Used as the
 * fallback wherever a page's shape isn't known ahead of time — where it is,
 * prefer a <Skeleton> layout, which tells the reader what is coming.
 */
export function Spinner({ label = 'Yükleniyor', className }: { label?: string; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4 py-20 text-ink-soft', className)} role="status" aria-live="polite">
      <span className="relative grid size-16 place-items-center">
        <span
          className="absolute inset-0 animate-spin rounded-full"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 220deg, var(--color-flame) 340deg, transparent 360deg)', animationDuration: '1s' }}
        />
        <span className="absolute inset-[3px] rounded-full bg-paper" />
        <LogoMark className="relative size-8" />
      </span>
      <span className="text-sm font-bold">{label}…</span>
    </div>
  )
}

/** A single shimmering placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx('block animate-pulse rounded-xl bg-paper-2', className)}
      style={{ animationDuration: '1.4s' }}
    />
  )
}

/**
 * Page-shaped loading states. Showing the layout that is about to appear reads as
 * progress rather than a hang, and stops the content from jumping when it lands.
 */
export function SkeletonPage({ variant = 'cards' }: { variant?: 'cards' | 'list' | 'path' | 'reader' }) {
  if (variant === 'path') {
    return (
      <div className="mx-auto max-w-xl" role="status" aria-label="Yükleniyor">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="mt-5 h-32 w-full rounded-3xl" />
        <div className="mt-8 flex flex-col items-center gap-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={clsx('size-[72px] rounded-full', i % 2 ? 'translate-x-24' : '-translate-x-24')} />
          ))}
        </div>
      </div>
    )
  }
  if (variant === 'reader') {
    return (
      <div className="mx-auto max-w-2xl" role="status" aria-label="Yükleniyor">
        <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <div className="mt-6 space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className={clsx('h-4', i % 3 === 2 ? 'w-4/6' : 'w-full')} />)}
        </div>
      </div>
    )
  }
  if (variant === 'list') {
    return (
      <div className="mx-auto max-w-2xl space-y-3" role="status" aria-label="Yükleniyor">
        <Skeleton className="mb-6 h-10 w-52" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-5xl" role="status" aria-label="Yükleniyor">
      <Skeleton className="mb-7 h-10 w-56" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-3xl" />)}
      </div>
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-paper-2 text-ink-soft">{icon}</div>
      <h3 className="text-xl font-extrabold">{title}</h3>
      {text && <p className="max-w-sm text-ink-soft">{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, children, className, dismissable = true }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; dismissable?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissable && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, dismissable])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#11141c]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dismissable && onClose()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={clsx('safe-bottom relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 shadow-soft sm:max-w-lg sm:rounded-3xl', className)}
          >
            {dismissable && (
              <button onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl hover:bg-paper-2" aria-label="Kapat">
                <X className="size-5" />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={clsx('shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-extrabold transition', value === it.value ? 'border-sky bg-sky/10 text-sky' : 'border-line bg-card text-ink-soft hover:text-ink')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, kicker, children, className }: { title: ReactNode; kicker?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <header className={clsx('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {kicker && <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-ink-soft">{kicker}</p>}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const c = { info: 'bg-sky/10 border-sky', error: 'bg-berry/10 border-berry', success: 'bg-mint/15 border-mint' }[tone]
  return <div className={clsx('rounded-2xl border-2 px-4 py-3 text-sm font-semibold', c)}>{children}</div>
}
