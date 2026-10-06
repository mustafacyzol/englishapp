import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Mail, MessageCircle, Plus, Search, X } from 'lucide-react'
import { iconFor } from '@/components/game/icons'
import { higoImg } from '@/components/game/Higo'
import { useSiteConfig } from '@/lib/site'
import { SUPPORT_EMAIL } from '@/lib/brand'
import { HELP, HELP_COUNT } from './helpData'

const norm = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Marks the searched words inside a question or answer. */
function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const n = norm(text)
  const k = norm(q)
  const out: React.ReactNode[] = []
  let i = 0
  for (let at = n.indexOf(k); at !== -1 && k; at = n.indexOf(k, i)) {
    out.push(text.slice(i, at), <mark key={at} className="rounded bg-butter/50 px-0.5 text-ink">{text.slice(at, at + k.length)}</mark>)
    i = at + k.length
  }
  out.push(text.slice(i))
  return <>{out}</>
}

/**
 * The help centre: topics on the left with their counts, one search over every
 * answer, accordions on the right and a way to reach a person at the bottom.
 * The chosen topic lives in the URL (?k=), so answers can be linked to.
 */
export default function Help() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const topicKey = params.get('k') ?? 'all'
  const { data } = useSiteConfig()
  const email = data?.site?.contact?.email ?? data?.support_email ?? SUPPORT_EMAIL

  const results = useMemo(() => {
    const k = norm(q.trim())
    return HELP.filter((t) => topicKey === 'all' || k || t.key === topicKey)
      .map((t) => ({ ...t, items: t.items.filter(([qq, a]) => !k || norm(qq).includes(k) || norm(a).includes(k)) }))
      .filter((t) => t.items.length)
  }, [q, topicKey])
  const found = results.reduce((n, t) => n + t.items.length, 0)

  // Google can show these answers directly in search results.
  useEffect(() => {
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: HELP.flatMap((t) => t.items.map(([n, a]) => ({ '@type': 'Question', name: n, acceptedAnswer: { '@type': 'Answer', text: a } }))) })
    document.head.appendChild(el)
    return () => el.remove()
  }, [])

  const pick = (k: string) => {
    setQ('')
    setOpen(null)
    setParams(k === 'all' ? {} : { k }, { replace: true })
  }

  return (
    <div className="relative">
      {/* header with the search */}
      <section className="relative isolate overflow-hidden border-b border-line bg-paper">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_22rem_at_80%_0%,color-mix(in_oklab,var(--color-flame)_12%,transparent),transparent_70%)]" />
        <div className="mx-auto flex max-w-6xl items-end gap-6 px-5 pb-10 pt-10 sm:pt-14">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-flame">Yardım merkezi</p>
            <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-black leading-[1.05] tracking-tight">Nasıl yardımcı olabiliriz?</h1>
            <label className="mt-6 flex h-14 max-w-xl items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 shadow-[0_3px_0_var(--color-line)] transition focus-within:border-ink/40">
              <Search className="size-5 shrink-0 text-ink-soft" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(null) }} placeholder="Soru ya da kelime ara: seri, iade, ödev…" className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold placeholder:text-ink-soft/70 focus:outline-none" aria-label="Yardım merkezinde ara" />
              {q && <button onClick={() => setQ('')} aria-label="Aramayı temizle" className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-paper-2"><X className="size-4" /></button>}
            </label>
            <p className="mt-2 text-sm font-bold text-ink-soft">{q ? `${found} sonuç` : `${HELP.length} konu, ${HELP_COUNT} yanıt`}</p>
          </div>
          <motion.img src={higoImg('read')} alt="" initial={{ opacity: 0, y: 20, rotate: 6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="hidden w-40 shrink-0 object-contain sm:block lg:w-48" />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[260px_1fr] lg:gap-12">
        {/* topics: a wrapping chip list on phones, a sticky side menu on desktop */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 hidden text-[11px] font-black uppercase tracking-[0.16em] text-ink-soft lg:block">Konular</p>
          <nav aria-label="Yardım konuları" className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {[{ key: 'all', title: 'Tümü', icon: 'star', items: { length: HELP_COUNT } }, ...HELP].map((t) => {
              const Icon = iconFor(t.icon)
              const on = !q && topicKey === t.key
              return (
                <button key={t.key} onClick={() => pick(t.key)} aria-current={on ? 'true' : undefined}
                  className={clsx('group relative flex items-center gap-2.5 rounded-full border-2 px-3 py-1.5 text-left text-sm font-extrabold transition lg:rounded-xl lg:border-0 lg:px-3 lg:py-2.5 lg:text-[15px]', on ? 'border-inv bg-inv text-on-inv lg:bg-paper-2 lg:text-ink' : 'border-line bg-card text-ink-soft hover:text-ink lg:bg-transparent lg:hover:bg-paper-2/70')}>
                  {on && <motion.span layoutId="help-bar" className="absolute -left-2 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-flame lg:block" />}
                  <Icon className={clsx('size-4 shrink-0 lg:size-[18px]', on ? 'lg:text-flame' : '')} />
                  <span className="flex-1">{t.title}</span>
                  <span className={clsx('rounded-full px-1.5 text-[11px] font-black tabular-nums', on ? 'bg-paper/20 lg:bg-card' : 'bg-paper-2 lg:bg-transparent')}>{t.items.length}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          {!results.length ? (
            <div className="rounded-3xl border-2 border-dashed border-line px-6 py-12 text-center">
              <img src={higoImg('think')} alt="" className="mx-auto size-24 object-contain" />
              <p className="mt-3 font-display text-xl font-black">Bununla ilgili bir yanıt bulamadık</p>
              <p className="mt-1 text-sm text-ink-soft">Başka bir kelime dene ya da bize yaz, en geç bir iş günü içinde yanıtlarız.</p>
            </div>
          ) : (
            results.map((t) => {
              const Icon = iconFor(t.icon)
              return (
                <section key={t.key} id={t.key} className="mb-10 scroll-mt-28">
                  <h2 className="mb-4 flex items-center gap-3 font-display text-2xl font-black">
                    <span className="grid size-10 place-items-center rounded-xl bg-flame/10 text-flame"><Icon className="size-5" /></span>
                    {t.title}
                  </h2>
                  <div className="space-y-2.5">
                    {t.items.map(([question, answer]) => {
                      const id = `${t.key}:${question}`
                      const on = open === id || (!!q && found <= 3)
                      return (
                        <div key={id} className={clsx('overflow-hidden rounded-2xl border-2 bg-card transition-colors', on ? 'border-ink/25' : 'border-line hover:border-ink/15')}>
                          <button onClick={() => setOpen(open === id ? null : id)} aria-expanded={on} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[16px] font-extrabold sm:px-6">
                            <span><Mark text={question} q={q.trim()} /></span>
                            <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full transition', on ? 'rotate-45 bg-flame text-white' : 'bg-paper-2 text-ink-soft')}><Plus className="size-4" strokeWidth={3} /></span>
                          </button>
                          <AnimatePresence initial={false}>
                            {on && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                                <p className="px-5 pb-5 leading-relaxed text-ink-soft sm:px-6"><Mark text={answer} q={q.trim()} /></p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}

          {/* a person, when the answers are not enough */}
          <section className="relative mt-4 overflow-hidden rounded-[28px] bg-inv p-6 text-on-inv sm:p-8">
            <div aria-hidden className="absolute -right-10 -top-10 size-48 rounded-full bg-flame/30 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <img src={higoImg('wave')} alt="" className="size-20 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl font-black">Hâlâ sorunuz mu var?</p>
                <p className="mt-1 text-on-inv/75">Ekibimiz hafta içi her gün yanıt veriyor. Okullar için ayrı bir ekibimiz var.</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <Link to="/contact?konu=support" className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-flame px-5 font-extrabold text-white shadow-[0_3px_0_var(--color-flame-deep)]"><MessageCircle className="size-4" /> Bize yazın</Link>
                <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-sm font-bold text-on-inv/80 hover:text-on-inv"><Mail className="size-4" />{email}</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
