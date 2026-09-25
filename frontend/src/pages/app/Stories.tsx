import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Bookmark, CheckCircle2, Clock, Crown, Headphones, Search } from 'lucide-react'
import { get } from '@/lib/api'
import type { Paginated, StoryCard } from '@/lib/types'
import { Empty, PageHeader, Spinner, Tabs } from '@/components/ui/Misc'
import { StoryCover } from './StoryCover'

const LEVELS = ['', 'A1', 'A2', 'B1', 'B2', 'C1']

export default function Stories() {
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const params = new URLSearchParams({ ...(level && { level }), ...(category && { category }), ...(q && { q }) }).toString()
  const { data, isLoading } = useQuery({ queryKey: ['stories', params], queryFn: () => get<Paginated<StoryCard>>(`/stories?${params}`) })
  const cats = useQuery({ queryKey: ['story-cats'], queryFn: () => get<{ data: string[] }>('/stories/categories') })
  const lib = useQuery({ queryKey: ['library'], queryFn: () => get<{ data: { story: StoryCard; progress: number; completed_at: string | null }[] }>('/library') })
  const reading = lib.data?.data.filter((r) => r.progress > 0 && !r.completed_at).slice(0, 3) ?? []

  return (
    <div>
      <PageHeader kicker="Oku & dinle" title="Hikaye kütüphanesi">
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

      <div className="mb-3">
        <Tabs value={level} onChange={setLevel} items={LEVELS.map((l) => ({ value: l, label: l || 'Tüm seviyeler' }))} />
      </div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {['', ...(cats.data?.data ?? [])].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={clsx('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-extrabold transition', category === c ? 'bg-ink text-card' : 'bg-paper-2 text-ink-soft hover:text-ink')}>
            {c || 'Tümü'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data?.data.length ? (
        <Empty icon={<Search className="size-7" />} title="Hikaye bulunamadı" text="Filtreleri değiştirmeyi dene." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {data.data.map((s, i) => (
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
                  {s.category && <span>{s.category}</span>}
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
