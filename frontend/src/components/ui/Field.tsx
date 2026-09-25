import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

const base =
  'w-full rounded-2xl border-2 border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-soft/70 shadow-[inset_0_2px_0_rgba(0,0,0,0.04)] transition focus:outline-none focus:ring-4 focus:ring-sky/25 disabled:opacity-60'

interface FieldProps {
  label?: string
  error?: string
  hint?: ReactNode
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, error, hint, className, type, ...rest },
  ref,
) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className={clsx('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-bold">{label}</span>}
      <span className="relative block">
        <input
          ref={ref}
          type={isPassword && show ? 'text' : type}
          className={clsx(base, 'h-12', isPassword && 'pr-12', error && 'border-berry focus:ring-berry/20')}
          aria-invalid={!!error}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-2 grid w-9 place-items-center text-ink-soft hover:text-ink"
            aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
      </span>
      {error ? <span className="mt-1.5 block text-sm font-semibold text-berry">{error}</span> : hint && <span className="mt-1.5 block text-sm text-ink-soft">{hint}</span>}
    </label>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, error, hint, className, ...rest },
  ref,
) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-bold">{label}</span>}
      <textarea ref={ref} className={clsx(base, 'min-h-28 py-3 leading-relaxed', error && 'border-berry')} {...rest} />
      {error ? <span className="mt-1.5 block text-sm font-semibold text-berry">{error}</span> : hint && <span className="mt-1.5 block text-sm text-ink-soft">{hint}</span>}
    </label>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select(
  { label, error, className, children, ...rest },
  ref,
) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-bold">{label}</span>}
      <select ref={ref} className={clsx(base, 'h-12 appearance-none pr-10')} {...rest}>
        {children}
      </select>
      {error && <span className="mt-1.5 block text-sm font-semibold text-berry">{error}</span>}
    </label>
  )
})

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-3 text-left">
      <span>
        <span className="block font-bold">{label}</span>
        {description && <span className="block text-sm text-ink-soft">{description}</span>}
      </span>
      <span className={clsx('relative h-8 w-14 shrink-0 rounded-full border-2 border-line transition', checked ? 'bg-mint' : 'bg-paper-2')} role="switch" aria-checked={checked}>
        <span className={clsx('absolute top-0.5 size-6 rounded-full border-2 border-line bg-card shadow-hard-sm transition-all', checked ? 'left-6' : 'left-0.5')} />
      </span>
    </button>
  )
}
