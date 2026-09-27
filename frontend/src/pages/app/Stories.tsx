import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownWideNarrow, Bookmark, Briefcase, CheckCircle2, Clock, Coffee, Crown, Headphones, Laugh, Plane, Rocket, Search, SearchCheck, Sparkles, X, type LucideIcon } from 'lucide-react'
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

export default function Stories() {
  const { user } = useAuth()
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [quick, setQuick] = useState<Quick>('')
  const [sort, setSort] = useState<'recommended' | 'short'>('recommended')
  const [q, setQ] = useState('')
  const params = new URLSearchParams({ ...(level && { level }), ...(category && { category }), ...(q && { q }) }).toString()
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
  const active = [level && `Seviye ${level}`, category, quick && { unread: 'Okunmamış', saved: 'Kaydettiklerim', short: '5 dk altı' }[quick]].filter(Boolean) as string[]
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

      {/* ------------------------------------------------------------ Filters */}
      <section className="mb-6 rounded-[28px] border-2 border-line bg-card p-4 sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-end [&>*]:min-w-0">
          <div>
            <p className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-widest text-ink-soft">
              Seviye
              {user && <button onClick={() => setLevel(level === user.cefr_level ? '' : user.cefr_level)} className={clsx('rounded-full px-2 py-0.5 normal-case tracking-normal transition', level === user.cefr_level ? 'bg-flame text-white' : 'bg-flame/10 text-flame hover:bg-flame/15')}>Benim seviyem · {user.cefr_level}</button>}
            </p>
            {/* a small staircase: each level is a step up */}
            <div className="flex items-end gap-1.5" role="radiogroup" aria-label="Seviye">
              {LEVELS.map((l, i) => {
                const on = level === l
                return (
                  <button key={l} role="radio" aria-checked={on} onClick={() => setLevel(on ? '' : l)} className={clsx('group relative flex w-[3.6rem] flex-col items-center justify-end rounded-xl border-2 pb-1.5 transition sm:w-16', on ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-2/60 hover:border-ink/25')} style={{ height: 44 + i * 9 }}>
                    <span className="font-display text-lg font-black leading-none">{l}</span>
                    <span className={clsx('text-[10px] font-bold', on ? 'text-paper/70' : 'text-ink-soft')}>{LEVEL_TEXT[l]}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-ink-soft">Tür</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {(cats.data?.data ?? []).map((c) => {
                const G = genre(c)
                const on = category === c
                return (
                  <button key={c} onClick={() => setCategory(on ? '' : c)} aria-pressed={on} className={clsx('flex shrink-0 items-center gap-2 rounded-2xl border-2 py-1.5 pl-1.5 pr-3.5 text-sm font-extrabold transition', on ? 'text-white' : 'border-line bg-card hover:border-ink/25')} style={on ? { background: G.color, borderColor: G.color } : undefined}>
                    <span className="grid size-8 place-items-center rounded-xl" style={{ background: on ? 'rgba(255,255,255,.2)' : `${G.color}1a`, color: on ? '#fff' : G.color }}><G.icon className="size-4" /></span>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-line pt-4">
          {([['unread', 'Okunmamış'], ['saved', 'Kaydettiklerim'], ['short', '5 dk altı']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setQuick(quick === k ? '' : k)} className={clsx('rounded-full border-2 px-3 py-1 text-sm font-bold transition', quick === k ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:text-ink')}>{l}</button>
          ))}
          <button onClick={() => setSort(sort === 'short' ? 'recommended' : 'short')} className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-ink-soft hover:bg-paper-2 hover:text-ink">
            <ArrowDownWideNarrow className="size-4" /> {sort === 'short' ? 'Kısadan uzuna' : 'Önerilen sıra'}
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
