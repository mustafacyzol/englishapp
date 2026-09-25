import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'butter' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-flame text-white border-flame shadow-[0_4px_0_0_var(--color-flame-deep)] hover:brightness-105',
  secondary: 'bg-card text-ink border-line shadow-[0_4px_0_0_var(--line)] hover:bg-paper-2',
  ghost: 'bg-transparent text-ink-soft border-transparent hover:bg-paper-2 hover:text-ink shadow-none',
  success: 'bg-mint text-white border-mint shadow-[0_4px_0_0_var(--color-mint-deep)] hover:brightness-105',
  danger: 'bg-berry text-white border-berry shadow-[0_4px_0_0_var(--color-berry-deep)] hover:brightness-105',
  butter: 'bg-butter text-[#1f2433] border-butter shadow-[0_4px_0_0_var(--color-butter-deep)] hover:brightness-105',
  dark: 'bg-[#1f2433] text-white border-[#1f2433] shadow-[0_4px_0_0_#000] hover:brightness-125 dark:bg-white dark:text-[#1f2433] dark:border-white dark:shadow-[0_4px_0_0_#9aa1b2]',
}
const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm rounded-xl gap-1.5',
  md: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-7 text-base rounded-2xl gap-2.5',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', block?: boolean, className?: string) =>
  clsx(
    'press inline-flex select-none items-center justify-center border-2 font-display font-extrabold tracking-wide uppercase',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  )

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', block, loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, block, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  )
})

export function LinkButton({ variant = 'primary', size = 'md', block, className, ...rest }: LinkProps & { variant?: Variant; size?: Size; block?: boolean }) {
  return <Link className={buttonClass(variant, size, block, className)} {...rest} />
}
