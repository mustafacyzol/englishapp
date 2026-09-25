import { type ReactNode, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { X } from 'lucide-react'

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

export function Spinner({ label = 'Yükleniyor' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-soft" role="status">
      <div className="flex gap-1.5">
        {['bg-flame', 'bg-butter', 'bg-mint'].map((c, i) => (
          <motion.span key={c} className={clsx('size-3 rounded-full', c)} animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }} />
        ))}
      </div>
      <span className="text-sm font-semibold">{label}…</span>
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
