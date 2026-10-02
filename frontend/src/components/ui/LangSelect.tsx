import { motion } from 'motion/react'
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
 * The language switch. With only two languages a menu is one tap too many, so it is
 * a two-sided pill: one tap flips TR and EN, the knob slides over. Saved on the account too.
 */
export function LangSelect({ className }: { className?: string; align?: 'left' | 'right' }) {
  const { lang, setLang, t } = useLang()
  const { user, setUser } = useAuth()
  const next: Lang = lang === 'tr' ? 'en' : 'tr'
  const flip = () => {
    setLang(next)
    if (user && user.preferences?.language !== next) {
      setUser({ ...user, preferences: { ...user.preferences, language: next } })
      patch('/account', { preferences: { language: next } }).catch(() => {})
    }
  }
  const other = LANGS.find((l) => l.v === next)!

  return (
    <button
      onClick={flip}
      aria-label={`${t('Dil')}: ${LANGS.find((l) => l.v === lang)!.name}. ${other.name}`}
      title={other.name}
      className={clsx('relative grid h-9 w-[76px] shrink-0 grid-cols-2 items-center rounded-full border-2 border-line bg-paper-2 p-0.5 text-[11px] font-black tracking-wide', className)}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 520, damping: 34 }} aria-hidden
        className={clsx('absolute inset-y-0.5 w-[34px] rounded-full bg-card shadow-[0_1px_3px_rgba(31,36,51,.18)]', lang === 'tr' ? 'left-0.5' : 'right-0.5')} />
      {LANGS.map((l) => (
        <span key={l.v} className={clsx('relative z-10 flex items-center justify-center gap-1 transition-colors', l.v === lang ? 'text-ink' : 'text-ink-soft')}>
          {l.v === lang ? <Flag v={l.v} className="size-[18px] ring-0" /> : l.code}
        </span>
      ))}
    </button>
  )
}
