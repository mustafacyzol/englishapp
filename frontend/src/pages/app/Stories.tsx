import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownWideNarrow, Bookmark, Check, ChevronLeft, ChevronRight, Clock, Crown, Search, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { img } from '@/lib/assets'
import { get } from '@/lib/api'
import type { Paginated, StoryCard } from '@/lib/types'
import { Empty, PageHeader, SkeletonPage } from '@/components/ui/Misc'
import { StoryCover } from './StoryCover'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
const LEVEL_TEXT: Record<string, string> = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İyi', C1: 'İleri' }
/** Each genre has its own little book cover (img/genres/*), all drawn in the one storybook style. */
const GENRE_COVER: Record<string, string> = {
  'Günlük Hayat': 'gunluk-hayat', Seyahat: 'seyahat', Eğlence: 'eglence', Kariyer: 'kariyer', Gizem: 'gizem',
  'Bilim Kurgu': 'bilim-kurgu', Okul: 'okul', Aile: 'aile', Bilim: 'bilim', Haber: 'haber',
}
const genreCover = (c: string) => (GENRE_COVER[c] ? img(`genres/${GENRE_COVER[c]}.webp`) : img('stories/default-2.webp'))
type Quick = '' | 'unread' | 'saved' | 'short'

/**
 * The library as a bookshelf: books stand on shelves by level (by genre once a
 * level is chosen), each shelf slides sideways on phones and shows arrows on
 * larger screens. Filters stay one quiet toolbar: level, a few genre chips with
 * the rest under "Daha fazla", and quick toggles.
 */
export default function Stories() {
  const { user } = useAuth()
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [quick, setQuick] = useState<Quick>('')
  const [sort, setSort] = useState<'recommended' | 'short'>('recommended')
  const [q, setQ] = useState('')
  const params = new URLSearchParams({ ...(level && { level }), ...(category && { category }), ...(q && { q }), per_page: '48' }).toString()
  const { data, isLoading } = useQuery({ queryKey: ['stories', params], queryFn: () => get<Paginated<StoryCard>>(`/stories?${params}`), placeholderData: keepPreviousData })
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

  // Shelves: by level, or by genre inside one level; the learner's own level comes first.
  const shelves = useMemo(() => {
    const key = (s: StoryCard) => (level ? s.category ?? 'Diğer' : s.cefr_level)
    const map = new Map<string, StoryCard[]>()
    list.forEach((s) => map.set(key(s), [...(map.get(key(s)) ?? []), s]))
    const order = level ? [...map.keys()] : LEVELS.filter((l) => map.has(l)) as string[]
    if (!level && user?.cefr_level && order.includes(user.cefr_level)) order.splice(order.indexOf(user.cefr_level), 1), order.unshift(user.cefr_level)
    return order.map((k) => ({ key: k, title: level ? k : `${k} · ${LEVEL_TEXT[k] ?? ''}`, mine: !level && k === user?.cefr_level, books: map.get(k)! }))
  }, [list, level, user?.cefr_level])

  const active = [level && `Seviye ${level}`, category, quick && { unread: 'Okunmamış', saved: 'Kaydettiklerim', short: 'Kısa (5 dk altı)' }[quick]].filter(Boolean) as string[]
  const clear = () => { setLevel(''); setCategory(''); setQuick(''); setQ('') }

  return (
    <div>
      <PageHeader kicker="Oku & dinle" title="Hikâye kütüphanesi">
        <label className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hikâye ara…" className="h-11 w-full rounded-2xl border-2 border-line bg-card pl-10 pr-3 font-semibold focus:border-sky focus:outline-none" />
        </label>
      </PageHeader>

      {reading.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-ink-soft">Okumaya devam et</h2>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {reading.map((r) => (
              <Link key={r.story.slug} to={`/stories/${r.story.slug}`} className="press flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-2.5 transition hover:border-ink/25">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md shadow-[2px_2px_0_rgba(31,36,51,.12)]"><StoryCover story={r.story} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{r.story.title}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-mint" style={{ width: `${r.progress}%` }} /></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ Filters: level, then genres as a row of book covers */}
      <section className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid w-full auto-cols-fr grid-flow-col rounded-xl border-2 border-line bg-card p-1 sm:w-auto" role="radiogroup" aria-label="Seviye">
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
          <div className="no-scrollbar -mx-0.5 flex w-full items-center gap-1 overflow-x-auto px-0.5 sm:ml-auto sm:w-auto [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            {([['unread', 'Okunmamış'], ['saved', 'Kaydettiklerim'], ['short', 'Kısa']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setQuick(quick === k ? '' : k)} aria-pressed={quick === k} className={clsx('rounded-full border-2 px-3 py-1 text-[13px] font-bold transition', quick === k ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:text-ink')}>{l}</button>
            ))}
            <button onClick={() => setSort(sort === 'short' ? 'recommended' : 'short')} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold text-ink-soft hover:text-ink" title="Sıralama">
              <ArrowDownWideNarrow className="size-4" /> {sort === 'short' ? 'Kısadan uzuna' : 'Önerilen'}
            </button>
          </div>
        </div>
        <GenreShelf cats={cats.data?.data ?? []} value={category} onChange={setCategory} />
      </section>

      <div className="mb-3 flex min-h-8 flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-ink-soft">{data ? `${list.length} hikâye` : ''}</p>
        <AnimatePresence>
          {active.map((a) => <motion.span key={a} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-extrabold">{a}</motion.span>)}
        </AnimatePresence>
        {(active.length > 0 || q) && <button onClick={clear} className="flex items-center gap-1 text-xs font-extrabold text-flame hover:underline"><X className="size-3.5" /> Temizle</button>}
      </div>

      {isLoading && !data ? (
        <SkeletonPage variant="cards" />
      ) : !list.length ? (
        <Empty icon={<Search className="size-7" />} title="Bu filtrelerde hikâye yok" text="Bir filtreyi kaldırmayı dene." action={<button onClick={clear} className="font-bold text-flame">Filtreleri temizle</button>} />
      ) : (
        <div className="space-y-9">
          {shelves.map((s) => <Shelf key={s.key} title={s.title} mine={s.mine} books={s.books} />)}
        </div>
      )}
    </div>
  )
}

/**
 * Genres as small book covers on a shelf: same storybook art for all, the name
 * set in the reading serif on a paper label. The chosen one is pulled out a
 * little with a bookmark; tap it again to show every genre.
 */
function GenreShelf({ cats, value, onChange }: { cats: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 pt-2.5 sm:mx-0 sm:px-0" role="radiogroup" aria-label="Tür">
      {['', ...cats].map((c) => {
        const on = value === c
        return (
          <button key={c || 'all'} role="radio" aria-checked={on} onClick={() => onChange(on ? '' : c)} className="group w-[78px] shrink-0 snap-start text-left sm:w-[92px]">
            <span className={clsx('relative block aspect-[3/4.4] overflow-hidden rounded-[3px_8px_8px_3px] shadow-[2px_3px_0_rgba(31,36,51,.14)] transition duration-300', on ? '-translate-y-2 shadow-[3px_8px_14px_-6px_rgba(31,36,51,.55)] ring-2 ring-ink dark:ring-paper' : 'group-hover:-translate-y-1')}>
              {c ? (
                <img src={genreCover(c)} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-[#1f2433] p-2 text-center font-read text-[13px] font-bold italic leading-tight text-[#f5ead6]">Bütün<br />kitaplar</span>
              )}
              <span aria-hidden className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent" />
              {c && (
                <span className="absolute inset-x-1.5 bottom-1.5 rounded-[3px] bg-[#fbf6ec]/95 px-1 py-1 text-center font-read text-[11px] font-bold leading-tight text-[#2b2620] shadow-sm sm:text-[12px]">{c}</span>
              )}
              {on && <span aria-hidden className="absolute right-2 top-0 h-5 w-2.5 bg-flame" style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,50% 75%,0 100%)' }} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** One shelf: a row of standing books on a board; swipe on phones, arrows on wider screens. */
function Shelf({ title, mine, books }: { title: string; mine?: boolean; books: StoryCard[] }) {
  const row = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const update = () => {
    const el = row.current
    if (el) setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  useEffect(update, [books.length])
  const go = (d: 1 | -1) => row.current?.scrollBy({ left: d * row.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-black leading-tight">
          {title}
          {mine && <span className="rounded-full bg-flame/12 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-flame">Senin seviyen</span>}
        </h2>
        <div className="hidden items-center gap-1 sm:flex">
          <span className="mr-1 text-xs font-bold text-ink-soft">{books.length} kitap</span>
          <button aria-label="Geri" disabled={edge.start} onClick={() => go(-1)} className="grid size-8 place-items-center rounded-full border-2 border-line bg-card transition hover:border-ink/30 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
          <button aria-label="İleri" disabled={edge.end} onClick={() => go(1)} className="grid size-8 place-items-center rounded-full border-2 border-line bg-card transition hover:border-ink/30 disabled:opacity-30"><ChevronRight className="size-4" /></button>
        </div>
      </div>
      <div className="relative">
        {/* every book carries its piece of the board, so the plank runs under the whole row as it scrolls */}
        <div ref={row} onScroll={update} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-1 pt-3 sm:gap-4">
          {books.map((s) => <Book key={s.id} s={s} />)}
        </div>
      </div>
    </section>
  )
}

function Book({ s }: { s: StoryCard }) {
  return (
    <Link to={`/stories/${s.slug}`} className="group w-[118px] shrink-0 snap-start sm:w-[140px] lg:w-[152px]" title={s.title}>
      <div className="relative aspect-[3/4] origin-bottom overflow-hidden rounded-[4px_10px_10px_4px] bg-paper-2 shadow-[3px_4px_0_rgba(31,36,51,.14),0_10px_18px_-10px_rgba(31,36,51,.45)] transition duration-300 group-hover:-translate-y-2 group-hover:-rotate-1">
        <StoryCover story={s} />
        {/* spine shading and the genre ribbon */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
        <span className="absolute left-2 top-2 rounded-md bg-card/95 px-1.5 py-0.5 text-[10px] font-black">{s.cefr_level}</span>
        {s.is_premium && <span className="absolute bottom-2 left-2 grid size-6 place-items-center rounded-full bg-butter text-[#1f2433]" title="Premium"><Crown className="size-3.5" /></span>}
        {s.completed && <span className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-mint text-white" title="Okundu"><Check className="size-4" strokeWidth={3} /></span>}
        {s.bookmarked && !s.completed && <span className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-card" title="Kaydedildi"><Bookmark className="size-3.5" /></span>}
        {!!s.progress && !s.completed && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20"><span className="block h-full bg-mint" style={{ width: `${s.progress}%` }} /></span>}
      </div>
      <div aria-hidden className="-mx-[6px] h-2.5 bg-gradient-to-b from-[#dcbd93] to-[#b78a58] shadow-[0_8px_12px_-8px_rgba(80,50,20,.6)] group-first:rounded-l-[4px] group-last:rounded-r-[4px] sm:-mx-2 dark:from-[#5b4632] dark:to-[#3f2f20]" />
      <p className="mt-2.5 line-clamp-2 text-[13px] font-extrabold leading-tight transition group-hover:text-flame sm:text-sm">{s.title}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-ink-soft"><Clock className="size-3" /> {s.reading_minutes} dk{s.category ? ` · ${s.category}` : ''}</p>
    </Link>
  )
}
