import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownWideNarrow, Bookmark, Briefcase, Check, CheckCircle2, ChevronDown, Clock, Coffee, Crown, Headphones, Laugh, Plane, Rocket, Search, SearchCheck, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { get } from '@/lib/api'
import type { Paginated, StoryCard } from '@/lib/types'
import { Empty, PageHeader, SkeletonPage } from '@/components/ui/Misc'
import { StoryCover } from './StoryCover'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
const LEVEL_TEXT: Record<string, string> = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İyi', C1: 'İleri' }
/** Genres get an icon and a colour so the chips read at a glance. */
const GENRE: Record<string, { icon: LucideIcon; color: string }> = {
  'Günlük Hayat': { icon: Coffee, color: '#e8403a' },
  Seyahat: { icon: Plane, color: '#2f7cf6' },
  Eğlence: { icon: Laugh, color: '#d99a00' },
  Kariyer: { icon: Briefcase, color: '#4f8a6e' },
  Gizem: { icon: SearchCheck, color: '#8f7cf8' },
  'Bilim Kurgu': { icon: Rocket, color: '#ef4e7b' },
}
const genre = (c: string) => GENRE[c] ?? { icon: Sparkles, color: '#676d7c' }
type Quick = '' | 'unread' | 'saved' | 'short'

/** Genre as a single tidy dropdown, each genre with its icon and colour. */
function GenreMenu({ cats, value, onChange }: { cats: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const G = value ? genre(value) : null
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} className={clsx('flex h-10 items-center gap-2 rounded-xl border-2 px-3 text-sm font-extrabold transition', value ? 'border-transparent text-white' : 'border-line hover:border-ink/25')} style={G ? { background: G.color } : undefined}>
        {G ? <G.icon className="size-4" /> : <Sparkles className="size-4 text-ink-soft" />}
        {value || 'Tüm türler'}
        <ChevronDown className={clsx('size-4 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul role="listbox" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 top-12 z-30 w-56 rounded-2xl border-2 border-line bg-card p-1.5 shadow-soft">
            {['', ...cats].map((c) => {
              const g = c ? genre(c) : { icon: Sparkles, color: '#676d7c' }
              return (
                <li key={c || 'all'}>
                  <button role="option" aria-selected={value === c} onClick={() => { onChange(c); setOpen(false) }} className={clsx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-bold hover:bg-paper-2', value === c && 'bg-paper-2')}>
                    <span className="grid size-7 place-items-center rounded-lg" style={{ background: `${g.color}1f`, color: g.color }}><g.icon className="size-4" /></span>
                    {c || 'Tüm türler'}
                    {value === c && <Check className="ml-auto size-4" strokeWidth={3} />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Stories() {
  const { user } = useAuth()
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [quick, setQuick] = useState<Quick>('')
  const [sort, setSort] = useState<'recommended' | 'short'>('recommended')
  const [q, setQ] = useState('')
  const params = new URLSearchParams({ ...(level && { level }), ...(category && { category }), ...(q && { q }), per_page: '48' }).toString()
  const { data, isLoading } = useQuery({ queryKey: ['stories', params], queryFn: () => get<Paginated<StoryCard>>(`/stories?${params}`) })
  const cats = useQuery({ queryKey: ['story-cats'], queryFn: () => get<{ data: string[] }>('/stories/categories') })
  const lib = useQuery({ queryKey: ['library'], queryFn: () => get<{ data: { story: StoryCard; progress: number; completed_at: string | null }[] }>('/library') })
  const reading = lib.data?.data.filter((r) => r.progress > 0 && !r.completed_at).slice(0, 3) ?? []
  // Quick filters and sorting run on the loaded page, so switching them is instant.
  const list = useMemo(() => {
    let xs = data?.data ?? []
    if (quick === 'unread') xs = xs.filter((s) => !s.completed)
    if (quick === 'saved') xs = xs.filter((s) => s.bookmarked)
    if (quick === 'short') xs = xs.filter((s) => s.reading_minutes <= 4)
    if (sort === 'short') xs = [...xs].sort((a, b) => a.reading_minutes - b.reading_minutes)
    return xs
  }, [data, quick, sort])
  const active = [level && `Seviye ${level}`, category, quick && { unread: 'Okunmamış', saved: 'Kaydettiklerim', short: 'Kısa (5 dk altı)' }[quick]].filter(Boolean) as string[]
  const clear = () => { setLevel(''); setCategory(''); setQuick(''); setQ('') }

  return (
    <div>
      <PageHeader kicker="Oku & dinle" title="Hikâye kütüphanesi">
        <label className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hikaye ara…" className="h-11 w-full rounded-2xl border-2 border-line bg-card pl-10 pr-3 font-semibold focus:border-sky focus:outline-none" />
        </label>
      </PageHeader>

      {reading.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-extrabold">Okumaya devam et</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {reading.map((r) => (
              <Link key={r.story.slug} to={`/stories/${r.story.slug}`} className="press ink-card flex items-center gap-3 p-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl"><StoryCover story={r.story} /></div>
                <div className="min-w-0">
                  <p className="truncate font-bold">{r.story.title}</p>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-mint" style={{ width: `${r.progress}%` }} /></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Filters: one calm toolbar */}
      <section className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-line bg-card p-2">
        <div className="grid w-full auto-cols-fr grid-flow-col rounded-xl bg-paper-2 p-1 sm:w-auto" role="radiogroup" aria-label="Seviye">
          {['', ...LEVELS].map((l) => {
            const on = level === l
            const mine = !!l && user?.cefr_level === l
            return (
              <button key={l || 'all'} role="radio" aria-checked={on} onClick={() => setLevel(l)} title={l ? LEVEL_TEXT[l] : undefined} className={clsx('relative min-w-0 rounded-lg px-1.5 py-1.5 text-sm font-extrabold transition sm:px-3', on ? 'text-paper' : 'text-ink-soft hover:text-ink')}>
                {on && <motion.span layoutId="lvl" className="absolute inset-0 rounded-lg bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{l || 'Tümü'}</span>
                {mine && <span className={clsx('absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full', on ? 'bg-paper' : 'bg-flame')} aria-label="senin seviyen" />}
              </button>
            )
          })}
        </div>
        <GenreMenu cats={cats.data?.data ?? []} value={category} onChange={setCategory} />
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {([['unread', 'Okunmamış'], ['saved', 'Kaydettiklerim'], ['short', 'Kısa']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setQuick(quick === k ? '' : k)} aria-pressed={quick === k} className={clsx('rounded-lg px-2.5 py-1.5 text-sm font-bold transition', quick === k ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2 hover:text-ink')}>{l}</button>
          ))}
          <button onClick={() => setSort(sort === 'short' ? 'recommended' : 'short')} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold text-ink-soft hover:bg-paper-2 hover:text-ink" title="Sıralama">
            <ArrowDownWideNarrow className="size-4" /> {sort === 'short' ? 'Kısadan uzuna' : 'Önerilen'}
          </button>
        </div>
      </section>

      <div className="mb-4 flex min-h-8 flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-ink-soft">{data ? `${list.length} hikâye` : ''}</p>
        <AnimatePresence>
          {active.map((a) => <motion.span key={a} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-extrabold">{a}</motion.span>)}
        </AnimatePresence>
        {(active.length > 0 || q) && <button onClick={clear} className="flex items-center gap-1 text-xs font-extrabold text-flame hover:underline"><X className="size-3.5" /> Temizle</button>}
      </div>

      {isLoading ? (
        <SkeletonPage variant="cards" />
      ) : !list.length ? (
        <Empty icon={<Search className="size-7" />} title="Bu filtrelerde hikâye yok" text="Bir filtreyi kaldırmayı dene." action={<button onClick={clear} className="font-bold text-flame">Filtreleri temizle</button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {list.map((s, i) => (
            <Link key={s.id} to={`/stories/${s.slug}`} className="group overflow-hidden rounded-3xl border-2 border-line bg-card transition hover:-translate-y-1 hover:shadow-soft" style={{ transitionDelay: `${(i % 6) * 0}ms` }}>
              <div className="relative aspect-[16/10] overflow-hidden">
                <StoryCover story={s} className="transition duration-700 group-hover:scale-105" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span className="rounded-lg bg-card/95 px-2 py-0.5 text-xs font-black">{s.cefr_level}</span>
                  {s.is_premium && <span className="flex items-center gap-1 rounded-lg bg-butter px-2 py-0.5 text-xs font-black text-[#1f2433]"><Crown className="size-3.5" /> Premium</span>}
                </div>
                <div className="absolute right-3 top-3 flex gap-1.5">
                  {s.completed && <CheckCircle2 className="size-7 rounded-full bg-mint p-0.5 text-white" />}
                  {s.bookmarked && <Bookmark className="size-7 rounded-lg bg-card p-1" />}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl leading-tight group-hover:text-flame">{s.title}</h3>
                {s.title_tr && <p className="text-sm text-ink-soft">{s.title_tr}</p>}
                <p className="mt-2 line-clamp-2 text-sm">{s.summary}</p>
                <div className="mt-3 flex items-center gap-3 text-xs font-bold text-ink-soft">
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {s.reading_minutes} dk</span>
                  <span className="flex items-center gap-1"><Headphones className="size-3.5" /> Sesli</span>
                  {s.category && <span className="flex items-center gap-1" style={{ color: genre(s.category).color }}>{(() => { const G = genre(s.category!); return <G.icon className="size-3.5" /> })()}{s.category}</span>}
                </div>
                {!!s.progress && !s.completed && <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-mint" style={{ width: `${s.progress}%` }} /></div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
