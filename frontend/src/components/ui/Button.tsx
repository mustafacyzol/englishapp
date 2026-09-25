import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'butter' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-flame text-white border-line shadow-hard hover:bg-flame-deep',
  secondary: 'bg-card text-ink border-line shadow-hard hover:bg-paper-2',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-paper-2 shadow-none',
  success: 'bg-mint text-[#0f2e27] border-line shadow-hard hover:brightness-95',
  danger: 'bg-berry text-white border-line shadow-hard hover:brightness-95',
  butter: 'bg-butter text-[#1B1F3B] border-line shadow-hard hover:brightness-95',
  dark: 'bg-[#1B1F3B] text-[#F6F1E7] border-line shadow-hard hover:brightness-110 dark:bg-[#F6F1E7] dark:text-[#1B1F3B]',
}
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-7 text-base rounded-2xl gap-2.5',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', block?: boolean, className?: string) =>
  clsx(
    'press inline-flex select-none items-center justify-center border-2 font-display font-extrabold tracking-tight uppercase',
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
