/**
 * One-time-code input — adapted from 21st.dev "OTP Input" (ddoemonn), restyled
 * to DilGO's ink/sticker language and trimmed to what our flows need.
 */
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import clsx from 'clsx'

interface Props {
  length?: number
  onComplete: (code: string) => void
  status?: 'idle' | 'error' | 'success'
  disabled?: boolean
  autoFocus?: boolean
  resetKey?: number
}

export function OtpInput({ length = 6, onComplete, status = 'idle', disabled, autoFocus = true, resetKey = 0 }: Props) {
  const [chars, setChars] = useState<string[]>(() => Array(length).fill(''))
  const [focused, setFocused] = useState(-1)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const reduced = useReducedMotion()

  const focusAt = useCallback((i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))]
    el?.focus()
    el?.select()
  }, [length])

  useEffect(() => {
    setChars(Array(length).fill(''))
    if (autoFocus) setTimeout(() => focusAt(0), 50)
  }, [resetKey, length, autoFocus, focusAt])

  const commit = (next: string[]) => {
    setChars(next)
    if (next.every((c) => c !== '')) onComplete(next.join(''))
  }

  const fill = (start: number, text: string) => {
    const digits = text.replace(/\D/g, '').split('')
    if (!digits.length) return
    const next = [...chars]
    let i = start
    for (const d of digits) {
      if (i >= length) break
      next[i++] = d
    }
    commit(next)
    focusAt(i)
  }

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...chars]
      if (next[i]) next[i] = ''
      else if (i > 0) {
        next[i - 1] = ''
        focusAt(i - 1)
      }
      setChars(next)
    } else if (e.key === 'ArrowLeft') focusAt(i - 1)
    else if (e.key === 'ArrowRight') focusAt(i + 1)
  }

  const error = status === 'error'
  return (
    <motion.div
      role="group"
      aria-label="Doğrulama kodu"
      className="flex justify-center gap-2 sm:gap-3"
      animate={error && !reduced ? { x: [0, -8, 7, -4, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
    >
      {chars.map((c, i) => (
        <div key={i} className={clsx('relative', i === length / 2 && 'ml-2 sm:ml-3')}>
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            value={c}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Hane ${i + 1}`}
            onChange={(e) => fill(i, e.target.value.slice(-length))}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
              e.preventDefault()
              fill(0, e.clipboardData.getData('text'))
            }}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(-1)}
            className={clsx(
              'h-14 w-11 rounded-2xl border-2 text-center text-transparent caret-transparent outline-none transition sm:h-16 sm:w-13',
              error ? 'border-berry bg-berry/10' : status === 'success' ? 'border-mint bg-mint/15' : focused === i ? 'border-sky bg-card shadow-hard-sm -translate-y-0.5' : c ? 'border-line bg-card shadow-hard-sm' : 'border-line/40 bg-paper-2',
            )}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {c ? (
                <motion.span
                  key={c + i}
                  initial={reduced ? false : { opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="font-mono text-2xl font-medium text-ink"
                >
                  {c}
                </motion.span>
              ) : focused === i ? (
                <motion.span className="h-6 w-0.5 rounded bg-ink" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
              ) : null}
            </AnimatePresence>
          </span>
        </div>
      ))}
    </motion.div>
  )
}
