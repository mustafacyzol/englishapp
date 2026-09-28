import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import clsx from 'clsx'

type Tone = 'info' | 'success' | 'error'
interface Toast {
  id: number
  key: string
  text: ReactNode
  tone: Tone
}
const Ctx = createContext<(text: ReactNode, tone?: Tone) => void>(() => {})

const ICON = { info: Info, success: CheckCircle2, error: XCircle }

/**
 * One notice at a time. A new message replaces the one on screen instead of stacking
 * under it; the same message sent again while it is showing is simply kept (no
 * counter, no re-animation), so tapping a button repeatedly still shows one notice.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const lastKey = useRef('')

  const close = useCallback(() => {
    window.clearTimeout(timer.current)
    lastKey.current = ''
    setToast(null)
  }, [])

  const push = useCallback((text: ReactNode, tone: Tone = 'info') => {
    const key = `${tone}:${typeof text === 'string' ? text : Math.random()}`
    const repeat = lastKey.current === key
    // Toasts are silent: saving a setting or copying a code is not an event worth a sound.
    lastKey.current = key
    if (!repeat) setToast({ id: Date.now() + Math.random(), key, text, tone })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      lastKey.current = ''
      setToast(null)
    }, tone === 'error' ? 4600 : 3400)
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4 safe-top" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toast && (() => {
            const Icon = ICON[toast.tone]
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ y: -28, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -18, opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className={clsx(
                  'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl py-2.5 pl-3 pr-2 text-sm font-bold shadow-soft',
                  toast.tone === 'success' ? 'bg-mint text-white' : toast.tone === 'error' ? 'bg-berry text-white' : 'border-2 border-line bg-card text-ink',
                )}
              >
                <Icon className={clsx('size-5 shrink-0', toast.tone === 'info' && 'text-sky')} />
                <span className="min-w-0">{toast.text}</span>
                <button onClick={close} aria-label="Kapat" className="ml-1 grid size-7 shrink-0 place-items-center rounded-full opacity-70 transition hover:bg-black/10 hover:opacity-100">
                  <X className="size-4" />
                </button>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
