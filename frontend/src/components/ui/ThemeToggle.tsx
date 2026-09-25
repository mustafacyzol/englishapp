import { Monitor, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { setTheme, useTheme, type Theme } from '@/lib/theme'

const OPTS: { v: Theme; label: string; icon: typeof Sun }[] = [
  { v: 'light', label: 'Açık', icon: Sun },
  { v: 'dark', label: 'Koyu', icon: Moon },
  { v: 'system', label: 'Sistem', icon: Monitor },
]

/** A compact segmented light / dark / system switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme] = useTheme()
  return (
    <div className={clsx('inline-flex rounded-full border-2 border-line bg-card p-0.5', className)} role="radiogroup" aria-label="Tema">
      {OPTS.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={theme === o.v}
          aria-label={o.label}
          title={o.label}
          onClick={() => setTheme(o.v)}
          className={clsx('grid size-8 place-items-center rounded-full transition', theme === o.v ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink')}
        >
          <o.icon className="size-4" />
        </button>
      ))}
    </div>
  )
}

/** A single icon button that cycles light → dark → system. For tight toolbars. */
export function ThemeButton({ className }: { className?: string }) {
  const [theme, dark] = useTheme()
  const Icon = theme === 'system' ? Monitor : dark ? Moon : Sun
  const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  return (
    <button
      onClick={() => setTheme(next)}
      aria-label="Temayı değiştir"
      title={theme === 'system' ? 'Tema: Sistem' : dark ? 'Tema: Koyu' : 'Tema: Açık'}
      className={clsx('grid size-10 place-items-center rounded-xl text-ink-soft transition hover:bg-paper-2 hover:text-ink', className)}
    >
      <Icon className="size-5" />
    </button>
  )
}
