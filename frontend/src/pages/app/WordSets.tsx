import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Bookmark, BookmarkCheck, Check, ClipboardPaste, Copy, Globe2, Grid3x3, Headphones, Layers, Lock, Pencil, Play, Plus, Puzzle, Search, Timer, Trash2, Volume2, X, PartyPopper, SquareStack, Zap } from 'lucide-react'
import { del, get, post, put, type ApiError } from '@/lib/api'
import { img } from '@/lib/assets'
import { speak } from '@/lib/speech'
import { Button } from '@/components/ui/Button'
import { Empty, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'

export interface WordSetCard {
  id: number; title: string; description: string | null; level: string | null; category: string; exam: string | null; cover: string
  is_public: boolean; words_count: number; saves_count: number; official: boolean; mine: boolean; saved: boolean; owner: { name: string; username: string } | null
}
interface SetItem { id: number; word: string; translation: string; example: string | null; in_library: boolean }
type SetDetail = WordSetCard & { items: SetItem[]; plays: number }

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const EXAMS: [string, string][] = [['lgs', 'LGS'], ['ydt', 'YDT'], ['yds', 'YDS'], ['yokdil', 'YÖKDİL'], ['ielts', 'IELTS'], ['toefl', 'TOEFL']]
const COVERS: [string, string][] = [
  ['a1', 'Başlangıç'], ['a2', 'Temel'], ['b1', 'Orta'], ['b2', 'İleri'], ['lgs', 'LGS'], ['ydt', 'YDT'], ['yds', 'Akademik'], ['ielts', 'IELTS'],
  ['travel', 'Seyahat'], ['business', 'İş'], ['daily', 'Günlük'], ['school', 'Okul'], ['science', 'Bilim'], ['nature', 'Doğa'], ['food', 'Yemek'], ['sport', 'Spor'],
]
const examLabel = (e: string | null) => EXAMS.find(([k]) => k === e)?.[1] ?? null
export const coverSrc = (c: string | null | undefined) => img(`sets/${COVERS.some(([k]) => k === c) ? c : 'daily'}.webp`)

/** The games a set can be played in; the key is the Practice game key. */
export const SET_GAMES: { key: string; title: string; icon: typeof Layers; tone: string }[] = [
  { key: 'balloon', title: 'Balon patlat', icon: PartyPopper, tone: 'from-sky to-lilac' },
  { key: 'swipe', title: 'Kaydır kartları', icon: Layers, tone: 'from-flame to-berry' },
  { key: 'match', title: 'Hızlı eşleştir', icon: Timer, tone: 'from-lilac to-sky' },
  { key: 'memory', title: 'Hafıza kartları', icon: SquareStack, tone: 'from-berry to-lilac' },
  { key: 'kelimle', title: 'Kelimle', icon: Grid3x3, tone: 'from-mint to-sky' },
  { key: 'listen', title: 'Dinle ve yaz', icon: Headphones, tone: 'from-lilac to-berry' },
  { key: 'scramble', title: 'Harf karıştır', icon: Puzzle, tone: 'from-butter to-flame' },
  { key: 'choice', title: 'Hızlı anlam', icon: Zap, tone: 'from-flame to-butter' },
]

/* ------------------------------------------------------------------ browse */

export function SetBrowser() {
  const [scope, setScope] = useState<'explore' | 'mine' | 'saved'>('explore')
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('')
  const [exam, setExam] = useState('')
  const params = new URLSearchParams({ scope, ...(q.trim() && { q: q.trim() }), ...(level && { level }), ...(exam && { exam }) })
  const { data, isLoading } = useQuery({ queryKey: ['word-sets', scope, q.trim(), level, exam], queryFn: () => get<{ data: WordSetCard[] }>(`/word-sets?${params}`), placeholderData: (p) => p })
  const sets = data?.data ?? []
  const official = sets.filter((s) => s.official)
  const community = sets.filter((s) => !s.official)

  return (
    <div>
      {/* scope: three equal segments, never a sideways scroll */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border-2 border-line bg-paper-2 p-1">
        {([['explore', 'Keşfet'], ['mine', 'Setlerim'], ['saved', 'Kaydettiklerim']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} aria-pressed={scope === k} className={clsx('rounded-xl px-2 py-2 text-sm font-extrabold transition', scope === k ? 'bg-card text-ink shadow-hard-sm' : 'text-ink-soft hover:text-ink')}>{l}</button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Set ya da kelime ara (ör. seyahat, LGS)" className="h-11 w-full rounded-2xl border-2 border-line bg-card pl-10 pr-3 text-sm font-semibold focus:border-sky focus:outline-none" />
        </label>
        <Link to="/practice/sets/new" className="press inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-ink px-3.5 text-sm font-extrabold text-paper"><Plus className="size-4" /><span className="hidden sm:inline">Yeni set</span><span className="sm:hidden">Yeni</span></Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip on={!level && !exam} onClick={() => { setLevel(''); setExam('') }}>Tümü</Chip>
        {LEVELS.slice(0, 4).map((l) => <Chip key={l} on={level === l} onClick={() => setLevel(level === l ? '' : l)}>{l}</Chip>)}
        <span aria-hidden className="mx-0.5 w-px self-stretch bg-line" />
        {EXAMS.map(([k, l]) => <Chip key={k} on={exam === k} onClick={() => setExam(exam === k ? '' : k)}>{l}</Chip>)}
      </div>

      {isLoading && !data ? <Spinner className="min-h-[30vh]" /> : !sets.length ? (
        <Empty
          icon={<Layers className="size-8" />}
          title={scope === 'mine' ? 'Henüz setin yok' : scope === 'saved' ? 'Kaydettiğin set yok' : 'Sonuç yok'}
          text={scope === 'mine' ? 'Kendi kelime kartlarını yaz ya da hazır bir seti kopyalayıp üzerine ekle.' : scope === 'saved' ? 'Beğendiğin setlerde yer imine dokun, burada toplansın.' : 'Başka bir kelimeyle ara ya da filtreleri temizle.'}
          action={scope === 'mine' ? <Link to="/practice/sets/new" className="font-bold text-flame">İlk setini oluştur</Link> : undefined}
        />
      ) : scope === 'explore' && !q && !level && !exam ? (
        <>
          <Section title="Sınavlar ve konular" sets={official.filter((s) => s.category !== 'level')} />
          <LevelTiles sets={official.filter((s) => s.category === 'level')} onPick={setLevel} />
          {community.length > 0 && <Section title="Topluluktan" sets={community} />}
        </>
      ) : (
        <Grid sets={sets} />
      )}
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} className={clsx('rounded-full border-2 px-3 py-1 text-xs font-extrabold transition', on ? 'border-sky bg-sky/10 text-sky' : 'border-line bg-card text-ink-soft hover:text-ink')}>{children}</button>
}

/** Unit sets collapse into one tile per level, so the page stays short. */
function LevelTiles({ sets, onPick }: { sets: WordSetCard[]; onPick: (l: string) => void }) {
  const names: Record<string, string> = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İleri' }
  const levels = LEVELS.filter((l) => sets.some((s) => s.level === l))
  if (!levels.length) return null
  return (
    <section className="mt-6">
      <h3 className="mb-2.5 font-display text-lg font-black">Seviyene göre <span className="text-sm font-bold text-ink-soft">her ünitenin kelimeleri</span></h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {levels.map((l) => {
          const n = sets.filter((s) => s.level === l)
          return (
            <button key={l} onClick={() => onPick(l)} className="press group relative overflow-hidden rounded-3xl border-2 border-line text-left shadow-hard-sm">
              <img src={coverSrc(l.toLowerCase())} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-3 text-white">
                <span className="block font-display text-2xl font-black leading-none">{l}</span>
                <span className="text-xs font-bold text-white/85">{names[l] ?? ''} · {n.length} set · {n.reduce((a, s) => a + s.words_count, 0)} kelime</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Section({ title, sets }: { title: string; sets: WordSetCard[] }) {
  if (!sets.length) return null
  return (
    <section className="mt-6">
      <h3 className="mb-2.5 font-display text-lg font-black">{title}</h3>
      <Grid sets={sets} />
    </section>
  )
}

function Grid({ sets }: { sets: WordSetCard[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sets.map((s, i) => <SetTile key={s.id} s={s} i={i} />)}
    </div>
  )
}

function SetTile({ s, i }: { s: WordSetCard; i: number }) {
  const tag = examLabel(s.exam) ?? s.level
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
      <Link to={`/practice/sets/${s.id}`} className="press group flex h-full flex-col overflow-hidden rounded-3xl border-2 border-line bg-card shadow-hard-sm transition hover:border-ink/25">
        <span className="relative block aspect-[16/10] overflow-hidden bg-paper-2">
          <img src={coverSrc(s.cover)} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
          {tag && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1f2433]">{tag}</span>}
          {s.saved && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white/95 text-flame"><BookmarkCheck className="size-3.5" /></span>}
          {s.mine && !s.is_public && <span className="absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-black/50 text-white" title="Yalnızca sen görürsün"><Lock className="size-3" /></span>}
        </span>
        <span className="flex flex-1 flex-col p-3">
          <span className="line-clamp-2 font-display text-[15px] font-black leading-tight">{s.title}</span>
          <span className="mt-auto pt-1.5 text-xs font-bold text-ink-soft">{s.words_count} kelime{s.saves_count > 0 && ` · ${s.saves_count} kayıt`}</span>
        </span>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ detail */

export function SetDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [picking, setPicking] = useState(false)
  const { data, isLoading, isError } = useQuery({ queryKey: ['word-set', id], queryFn: () => get<{ data: SetDetail }>(`/word-sets/${id}`) })
  const s = data?.data
  const refresh = () => { qc.invalidateQueries({ queryKey: ['word-set', id] }); qc.invalidateQueries({ queryKey: ['word-sets'] }) }
  const save = useMutation({ mutationFn: () => post<{ saved: boolean }>(`/word-sets/${id}/save`), onSuccess: (r) => { toast(r.saved ? 'Set kaydedildi' : 'Kayıtlardan çıkarıldı', 'success'); refresh() } })
  const copy = useMutation({ mutationFn: () => post<{ data: SetDetail }>(`/word-sets/${id}/copy`), onSuccess: (r) => { toast('Kopyan hazır, şimdi kelime ekleyebilirsin', 'success'); qc.invalidateQueries({ queryKey: ['word-sets'] }); nav(`/practice/sets/${r.data.id}/edit`) } })
  const learn = useMutation({ mutationFn: () => post<{ message: string }>(`/word-sets/${id}/learn`), onSuccess: (r) => { toast(r.message, 'success'); refresh(); qc.invalidateQueries({ queryKey: ['words'] }) } })
  const remove = useMutation({ mutationFn: () => del(`/word-sets/${id}`), onSuccess: () => { toast('Set silindi', 'success'); qc.invalidateQueries({ queryKey: ['word-sets'] }); nav('/practice?tab=sets') } })

  if (isLoading) return <Spinner className="min-h-[50vh]" />
  if (isError || !s) return <Empty icon={<Layers className="size-8" />} title="Set bulunamadı" text="Bu set silinmiş ya da gizli olabilir." action={<Link to="/practice?tab=sets" className="font-bold text-flame">Setlere dön</Link>} />
  const tag = [examLabel(s.exam), s.level].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/practice?tab=sets" className="mb-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Kelime setleri</Link>

      <section className="overflow-hidden rounded-[28px] border-2 border-line bg-card">
        <div className="relative aspect-[16/7] max-h-64 w-full overflow-hidden sm:aspect-[16/5]">
          <img src={coverSrc(s.cover)} alt="" className="size-full object-cover" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
              {tag && <span className="rounded-full bg-white/95 px-2 py-0.5 text-[#1f2433]">{tag}</span>}
              <span className="rounded-full bg-black/35 px-2 py-0.5">{s.official ? 'Hazır set' : s.mine ? (s.is_public ? 'Senin, herkese açık' : 'Senin, gizli') : `@${s.owner?.username ?? 'kullanıcı'}`}</span>
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-black leading-tight sm:text-4xl">{s.title}</h1>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {s.description && <p className="text-[15px] text-ink-soft">{s.description}</p>}
          <p className="mt-1 text-sm font-bold text-ink-soft">{s.items.length} kelime · {s.items.filter((i) => i.in_library).length} tanesi defterinde{s.plays > 0 && ` · ${s.plays} kez oynadın`}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Button className="sm:min-w-44" size="lg" onClick={() => setPicking(true)} icon={<Play className="size-5" />}>Oyna</Button>
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Act onClick={() => save.mutate()} busy={save.isPending} on={s.saved} icon={s.saved ? BookmarkCheck : Bookmark} label={s.saved ? 'Kaydedildi' : 'Kaydet'} />
              <Act onClick={() => learn.mutate()} busy={learn.isPending} icon={Plus} label="Deftere ekle" />
              {s.mine ? <Act onClick={() => nav(`/practice/sets/${s.id}/edit`)} icon={Pencil} label="Düzenle" /> : <Act onClick={() => copy.mutate()} busy={copy.isPending} icon={Copy} label="Kopyala" />}
            </div>
          </div>
          {s.mine && <button onClick={() => confirm('Bu set silinsin mi?') && remove.mutate()} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-berry"><Trash2 className="size-3.5" /> Seti sil</button>}
          {!s.mine && <p className="mt-2 text-xs text-ink-soft">Kopyala: setin sana ait bir kopyası oluşur, üzerine kelime ekleyebilirsin.</p>}
        </div>
      </section>

      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-black">Kelime kartları</h2>
        <div className="grid grid-cols-2 gap-1 rounded-xl border-2 border-line bg-paper-2 p-0.5 text-xs font-extrabold">
          {([['cards', 'Kart'], ['list', 'Liste']] as const).map(([k, l]) => <button key={k} onClick={() => setView(k)} className={clsx('rounded-lg px-3 py-1', view === k ? 'bg-card shadow-hard-sm' : 'text-ink-soft')}>{l}</button>)}
        </div>
      </div>
      {view === 'cards' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {s.items.map((it) => <FlipCard key={it.id} it={it} />)}
        </div>
      ) : (
        <ul className="divide-y-2 divide-line/60 overflow-hidden rounded-3xl border-2 border-line bg-card">
          {s.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
              <button onClick={() => speak(it.word)} className="text-sky" aria-label={`${it.word} dinle`}><Volume2 className="size-5" /></button>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">{it.word}</p>
                {it.example && <p className="truncate text-xs text-ink-soft">{it.example}</p>}
              </div>
              <span className="max-w-[45%] truncate text-right text-sm font-semibold text-ink-soft">{it.translation}</span>
              {it.in_library && <Check className="size-4 shrink-0 text-mint-deep" aria-label="Defterinde" />}
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>{picking && <GamePickerSheet id={s.id} onClose={() => setPicking(false)} />}</AnimatePresence>
    </div>
  )
}

function Act({ onClick, icon: I, label, busy, on }: { onClick: () => void; icon: typeof Layers; label: string; busy?: boolean; on?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className={clsx('press flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-xs font-extrabold transition disabled:opacity-60', on ? 'border-flame/40 bg-flame/10 text-flame' : 'border-line bg-card hover:border-ink/30')}>
      <I className="size-5" />
      <span className="leading-tight">{label}</span>
    </button>
  )
}

function FlipCard({ it }: { it: SetItem }) {
  const [flip, setFlip] = useState(false)
  return (
    <button onClick={() => setFlip((f) => !f)} className="group relative aspect-[4/3] w-full [perspective:900px]" aria-label={`${it.word}: ${flip ? it.translation : 'çevir'}`}>
      <motion.span className="relative block size-full [transform-style:preserve-3d]" animate={{ rotateY: flip ? 180 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-line bg-card p-3 shadow-hard-sm [backface-visibility:hidden]">
          <span className="text-center font-display text-lg font-black leading-tight [overflow-wrap:anywhere] sm:text-xl">{it.word}</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-soft">çevirmek için dokun</span>
          {it.in_library && <Check className="absolute right-2.5 top-2.5 size-4 text-mint-deep" />}
          <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); speak(it.word) }} className="absolute bottom-2 right-2.5 text-sky"><Volume2 className="size-4" /></span>
        </span>
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-sky bg-sky/10 p-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-center font-display text-lg font-black leading-tight text-sky [overflow-wrap:anywhere]">{it.translation}</span>
          {it.example && <span className="mt-1.5 line-clamp-2 text-center text-[11px] text-ink-soft">{it.example}</span>}
        </span>
      </motion.span>
    </button>
  )
}

function GamePickerSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const nav = useNavigate()
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] bg-card p-5 sm:max-w-lg sm:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-black">Hangi oyunla?</h2>
          <button onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {SET_GAMES.map((g) => (
            <button key={g.key} onClick={() => nav(`/practice?game=${g.key}&set=${id}`)} className={clsx('press flex items-center gap-2.5 rounded-2xl bg-gradient-to-br p-3 text-left text-white shadow-hard-sm', g.tone)}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/20"><g.icon className="size-5" /></span>
              <span className="font-display text-sm font-black leading-tight">{g.title}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ editor */

interface Row { word: string; translation: string; example: string }
const blank = (): Row => ({ word: '', translation: '', example: '' })

/** "word = çeviri", "word - çeviri", "word: çeviri" or tab separated, one per line. */
export function parseBulk(text: string): Row[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.+?)\s*(?:\t|=|:|\s-\s|;)\s*(.+)$/)
    return m ? { word: m[1].trim(), translation: m[2].trim(), example: '' } : null
  }).filter((r): r is Row => !!r && !!r.word && !!r.translation)
}

export function SetEditorPage() {
  const { id } = useParams()
  const editing = !!id
  const { data, isLoading } = useQuery({ queryKey: ['word-set', id], queryFn: () => get<{ data: SetDetail }>(`/word-sets/${id}`), enabled: editing })
  if (editing && isLoading) return <Spinner className="min-h-[50vh]" />
  if (editing && data && !data.data.mine) return <Empty icon={<Lock className="size-8" />} title="Bu set senin değil" text="Kopyalayıp kendi setin yaptıktan sonra düzenleyebilirsin." action={<Link to={`/practice/sets/${id}`} className="font-bold text-flame">Sete dön</Link>} />
  return <Editor key={id ?? 'new'} initial={data?.data} />
}

function Editor({ initial }: { initial?: SetDetail }) {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [f, setF] = useState({ title: initial?.title ?? '', description: initial?.description ?? '', level: initial?.level ?? '', exam: initial?.exam ?? '', cover: initial?.cover ?? 'daily', is_public: initial?.is_public ?? false })
  const [rows, setRows] = useState<Row[]>(() => initial?.items.length ? initial.items.map((i) => ({ word: i.word, translation: i.translation, example: i.example ?? '' })) : [blank(), blank(), blank()])
  const [bulk, setBulk] = useState<string | null>(null)
  const filled = useMemo(() => rows.filter((r) => r.word.trim() && r.translation.trim()), [rows])
  const parsed = useMemo(() => (bulk ? parseBulk(bulk) : []), [bulk])

  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, level: f.level || null, exam: f.exam || null, description: f.description || null, items: filled.map((r) => ({ word: r.word.trim(), translation: r.translation.trim(), example: r.example.trim() || null })) }
      return initial ? put<{ data: SetDetail }>(`/word-sets/${initial.id}`, body) : post<{ data: SetDetail }>('/word-sets', body)
    },
    onSuccess: (r) => {
      toast(initial ? 'Set güncellendi' : 'Set oluşturuldu', 'success')
      qc.invalidateQueries({ queryKey: ['word-sets'] })
      qc.setQueryData(['word-set', String(r.data.id)], r)
      nav(`/practice/sets/${r.data.id}`, { replace: true })
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const set = (i: number, k: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={initial ? `/practice/sets/${initial.id}` : '/practice?tab=sets'} className="mb-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> {initial ? 'Sete dön' : 'Kelime setleri'}</Link>
      <h1 className="mb-5 text-3xl sm:text-4xl">{initial ? 'Seti düzenle' : 'Yeni kelime seti'}</h1>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-5">
        <section className="space-y-4 rounded-3xl border-2 border-line bg-card p-4 sm:p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Set adı</span>
            <input required minLength={2} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="ör. Tatil kelimelerim" className="h-12 w-full rounded-2xl border-2 border-line bg-card px-4 font-semibold focus:border-sky focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Kısa açıklama <span className="font-semibold text-ink-soft">(isteğe bağlı)</span></span>
            <input maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Bu set ne için?" className="h-12 w-full rounded-2xl border-2 border-line bg-card px-4 font-semibold focus:border-sky focus:outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Seviye</span>
              <select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
                <option value="">Fark etmez</option>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Sınav</span>
              <select value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
                <option value="">Yok</option>
                {EXAMS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-bold">Kapak</span>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {COVERS.map(([k, l]) => (
                <button type="button" key={k} onClick={() => setF({ ...f, cover: k })} aria-pressed={f.cover === k} title={l} className={clsx('relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition', f.cover === k ? 'border-sky ring-2 ring-sky/40' : 'border-transparent opacity-80 hover:opacity-100')}>
                  <img src={coverSrc(k)} alt={l} loading="lazy" className="size-full object-cover" />
                  {f.cover === k && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-sky text-white"><Check className="size-3" strokeWidth={3} /></span>}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setF({ ...f, is_public: !f.is_public })} className="flex w-full items-center gap-3 rounded-2xl border-2 border-line p-3 text-left" aria-pressed={f.is_public}>
            <span className={clsx('grid size-9 shrink-0 place-items-center rounded-xl', f.is_public ? 'bg-mint/15 text-mint-deep' : 'bg-paper-2 text-ink-soft')}>{f.is_public ? <Globe2 className="size-5" /> : <Lock className="size-5" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">{f.is_public ? 'Herkese açık' : 'Yalnızca ben'}</span>
              <span className="block text-xs text-ink-soft">{f.is_public ? 'Başkaları arayıp kaydedebilir, öğretmenler ödev verebilir.' : 'Sadece sen görürsün.'}</span>
            </span>
            <span className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', f.is_public ? 'bg-mint' : 'bg-line')}><span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', f.is_public ? 'left-[22px]' : 'left-0.5')} /></span>
          </button>
        </section>

        <section className="rounded-3xl border-2 border-line bg-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-black">Kelime kartları <span className="text-ink-soft">({filled.length})</span></h2>
            <button type="button" onClick={() => setBulk(bulk === null ? '' : null)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5 text-xs font-extrabold hover:border-ink/30"><ClipboardPaste className="size-4" /> Toplu yapıştır</button>
          </div>
          <AnimatePresence initial={false}>
            {bulk !== null && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mb-4 rounded-2xl bg-paper-2 p-3">
                  <p className="mb-2 text-xs font-bold text-ink-soft">Her satıra bir kelime: <code className="rounded bg-card px-1">apple = elma</code>. "-", ":" ya da sekme de olur.</p>
                  <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} placeholder={'apple = elma\nbook = kitap\ntravel = seyahat etmek'} className="w-full rounded-xl border-2 border-line bg-card p-3 font-mono text-sm focus:border-sky focus:outline-none" />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink-soft">{parsed.length} kelime bulundu</span>
                    <Button type="button" size="sm" disabled={!parsed.length} onClick={() => { setRows((rs) => [...rs.filter((r) => r.word.trim() || r.translation.trim()), ...parsed]); setBulk(null) }}>Listeye ekle</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-2 rounded-2xl border-2 border-line/70 p-2 sm:grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] sm:items-center sm:border-0 sm:p-0">
                <span className="pt-2.5 text-center text-xs font-black text-ink-soft sm:pt-0">{i + 1}</span>
                <div className="grid gap-1.5 sm:contents">
                  <input value={r.word} onChange={(e) => set(i, 'word', e.target.value)} maxLength={80} placeholder="İngilizce" aria-label={`${i + 1}. kelime`} className="h-10 min-w-0 rounded-xl border-2 border-line bg-card px-3 text-sm font-bold focus:border-sky focus:outline-none" />
                  <input value={r.translation} onChange={(e) => set(i, 'translation', e.target.value)} maxLength={160} placeholder="Türkçe" aria-label={`${i + 1}. çeviri`} className="h-10 min-w-0 rounded-xl border-2 border-line bg-card px-3 text-sm font-semibold focus:border-sky focus:outline-none" />
                  <input value={r.example} onChange={(e) => set(i, 'example', e.target.value)} maxLength={255} placeholder="Örnek cümle (isteğe bağlı)" aria-label={`${i + 1}. örnek`} className="h-10 min-w-0 rounded-xl border-2 border-line bg-card px-3 text-sm focus:border-sky focus:outline-none" />
                </div>
                <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blank()]))} aria-label="Satırı sil" className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-berry/10 hover:text-berry"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} disabled={rows.length >= 300} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line py-2.5 text-sm font-extrabold text-ink-soft hover:border-ink/30 hover:text-ink"><Plus className="size-4" /> Kelime ekle</button>
        </section>

        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-10 lg:bottom-4">
          <Button type="submit" block size="lg" loading={save.isPending} disabled={filled.length < 2 || f.title.trim().length < 2}>{filled.length < 2 ? 'En az 2 kelime yaz' : initial ? 'Kaydet' : `Seti oluştur (${filled.length} kelime)`}</Button>
        </div>
      </form>
    </div>
  )
}
