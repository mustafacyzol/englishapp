import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'

type Tone = 'info' | 'success' | 'error'
interface Toast {
  id: number
  text: ReactNode
  tone: Tone
}
const Ctx = createContext<(text: ReactNode, tone?: Tone) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: ReactNode, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s.slice(-2), { id, text, tone }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 safe-top" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: -30, opacity: 0, rotate: -2 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -20, opacity: 0 }}
              className={clsx(
                'pointer-events-auto max-w-md rounded-2xl border-2 border-line px-4 py-3 text-sm font-bold shadow-hard',
                t.tone === 'success' ? 'bg-mint text-[#0f2e27]' : t.tone === 'error' ? 'bg-berry text-white' : 'bg-card text-ink',
              )}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
