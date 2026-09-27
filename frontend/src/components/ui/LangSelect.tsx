import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useLang, type Lang } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { patch } from '@/lib/api'

const LANGS: { v: Lang; code: string; name: string; hello: string; flag: string[] }[] = [
  { v: 'tr', code: 'TR', name: 'Türkçe', hello: 'Merhaba', flag: ['#e30a17'] },
  { v: 'en', code: 'EN', name: 'English', hello: 'Hello', flag: ['#012169', '#c8102e'] },
]

/** A small round "flag" drawn in CSS, so it stays crisp and needs no emoji font. */
function Flag({ v, className }: { v: Lang; className?: string }) {
  return (
    <span aria-hidden className={clsx('relative grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-card', className)} style={{ background: v === 'tr' ? '#e30a17' : '#012169' }}>
      {v === 'tr' ? (
        <svg viewBox="0 0 20 20" className="size-full">
          <circle cx="8.2" cy="10" r="4.6" fill="#fff" />
          <circle cx="9.4" cy="10" r="3.7" fill="#e30a17" />
          <path d="m13.6 10-2.1.7 1.3-1.8v2.2l-1.3-1.8z" fill="#fff" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="size-full">
          <path d="M0 0l20 20M20 0 0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0l20 20M20 0 0 20" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M10 0v20M0 10h20" stroke="#fff" strokeWidth="6" />
          <path d="M10 0v20M0 10h20" stroke="#c8102e" strokeWidth="3.2" />
        </svg>
      )}
    </span>
  )
}

/**
 * The header language switch: a compact pill (flag + code) that opens a small card
 * with both languages, each greeting in its own language. Saved on the account too.
 */
export function LangSelect({ className, align = 'right' }: { className?: string; align?: 'left' | 'right' }) {
  const { lang, setLang, t } = useLang()
  const { user, setUser } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const choose = (v: Lang) => {
    setLang(v)
    setOpen(false)
    if (user && user.preferences?.language !== v) {
      setUser({ ...user, preferences: { ...user.preferences, language: v } })
      patch('/account', { preferences: { language: v } }).catch(() => {})
    }
  }
  const cur = LANGS.find((l) => l.v === lang)!

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('Dil')}: ${cur.name}`}
        className={clsx('flex h-10 items-center gap-1.5 rounded-full border-2 pl-1 pr-2.5 text-sm font-black transition', open ? 'border-ink/30 bg-paper-2' : 'border-line bg-card hover:border-ink/20')}
      >
        <Flag v={lang} className="size-7" />
        <span className="tabular-nums tracking-wide">{cur.code}</span>
        <ChevronDown className={clsx('size-3.5 text-ink-soft transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={clsx('absolute top-[calc(100%+8px)] z-50 w-60 rounded-2xl border-2 border-line bg-card p-1.5 shadow-soft', align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left')}
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-black uppercase tracking-widest text-ink-soft">{t('Arayüz dili')}</p>
            {LANGS.map((l) => (
              <button
                key={l.v}
                role="option"
                aria-selected={l.v === lang}
                onClick={() => choose(l.v)}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition', l.v === lang ? 'bg-paper-2' : 'hover:bg-paper-2/70')}
              >
                <Flag v={l.v} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold leading-tight">{l.name}</span>
                  <span className="block text-xs font-semibold text-ink-soft">{l.hello}!</span>
                </span>
                {l.v === lang && <Check className="size-4 text-mint-deep" strokeWidth={3} />}
              </button>
            ))}
            <p className="px-2.5 pb-1.5 pt-2 text-xs text-ink-soft">{t('Ders içeriği her zaman İngilizce.')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
