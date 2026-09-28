import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BookmarkPlus, Brain, Check, CloudRain, Headphones, Layers, PartyPopper, Puzzle, Search, Shuffle, TextCursorInput, Timer, Trash2, Volume2, X, Zap } from 'lucide-react'
import { del, get, post } from '@/lib/api'
import { speak } from '@/lib/speech'
import { celebrate, sfx } from '@/lib/fx'
import type { RewardSummary } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Empty, PageHeader, SkeletonPage, Spinner, Tabs } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'
import { BalloonRescue, Cloze, ListenType, Memory, QuickChoice, WordRain, Restart, Scramble, SpeedMatch, SwipeDeck, TrueFalse, type DeckWord, type Outcome } from './games/WordGames'

interface Word { id: number; word: string; translation: string | null; example: string | null; interval_days: number; due_at: string | null; source: string | null }
type GameKey = 'swipe' | 'match' | 'truefalse' | 'listen' | 'scramble' | 'memory' | 'cloze' | 'choice' | 'rain' | 'balloon'

type Group = 'quick' | 'memory' | 'spell'
const GAMES: { key: GameKey; title: string; text: string; icon: typeof Layers; tone: string; badge?: string; group: Group }[] = [
  { group: 'memory', key: 'swipe', title: 'Kaydır kartları', text: 'Sağa biliyorum, sola tekrar. Mobilde parmağınla kaydır.', icon: Layers, tone: 'from-flame to-berry', badge: 'Favori' },
  { group: 'quick', key: 'match', title: 'Hızlı eşleştir', text: '45 saniyede İngilizce ve Türkçeyi eşle, seri yap.', icon: Timer, tone: 'from-sky to-lilac' },
  { group: 'quick', key: 'truefalse', title: 'Doğru mu?', text: '30 saniyelik blitz: çeviri doğru mu, yanlış mı?', icon: Check, tone: 'from-mint to-sage' },
  { group: 'spell', key: 'listen', title: 'Dinle ve yaz', text: 'Duyduğun kelimeyi yaz, kulağını ve yazımını çalıştır.', icon: Headphones, tone: 'from-lilac to-sky' },
  { group: 'spell', key: 'scramble', title: 'Harf karıştır', text: 'Karışık harflerden kelimeyi yeniden kur.', icon: Puzzle, tone: 'from-butter to-flame' },
  { group: 'memory', key: 'memory', title: 'Hafıza kartları', text: 'Kartları çevir, İngilizceyi Türkçesiyle eşle.', icon: Brain, tone: 'from-berry to-lilac' },
  { group: 'spell', key: 'cloze', title: 'Cümlede boşluk', text: 'Kelimeyi kendi örnek cümlesinde yerine koy.', icon: TextCursorInput, tone: 'from-sage to-mint' },
  { group: 'quick', key: 'rain', title: 'Kelime yağmuru', text: 'Kelimeler yağıyor! Doğrusuna yere düşmeden dokun.', icon: CloudRain, tone: 'from-sky to-mint', badge: 'Yeni' },
  { group: 'spell', key: 'balloon', title: 'Balon kurtar', text: 'Harf harf tahmin et, Higo’nun balonlarını uçurma.', icon: PartyPopper, tone: 'from-berry to-butter', badge: 'Yeni' },
  { group: 'quick', key: 'choice', title: 'Hızlı anlam', text: 'On kelime, dört seçenek. Klavyede 1-4.', icon: Zap, tone: 'from-flame to-butter' },
]

export default function Practice() {
  const [tab, setTab] = useState<'games' | 'words'>('games')
  const [game, setGame] = useState<GameKey | null>(null)
  if (game) return <GameRun game={game} onExit={() => setGame(null)} onSwitch={setGame} />
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Aralıklı tekrar + oyunlar" title="Kelime pratiği" />
      <div className="mb-6">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'games', label: 'Oyunlar' }, { value: 'words', label: 'Kelime defterim' }]} />
      </div>
      {tab === 'games' ? <GamePicker onPick={setGame} /> : <WordList />}
    </div>
  )
}

function GamePicker({ onPick }: { onPick: (g: GameKey) => void }) {
  const { data } = useQuery({ queryKey: ['words', '', ''], queryFn: () => get<{ stats: { total: number; due: number; mastered: number } }>('/words') })
  const st = data?.stats
  return (
    <>
      {st && (
        <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-3xl border-2 border-line bg-card px-5 py-4">
          <Stat v={st.due} l="tekrar zamanı" c="text-flame" />
          <Stat v={st.total} l="defterde" />
          <Stat v={st.mastered} l="ustalaşıldı" c="text-mint-deep" />
          <p className="basis-full text-sm text-ink-soft sm:ml-auto sm:basis-auto">{st.total < 8 ? 'Defterin dolana kadar seviyene uygun başlangıç kelimeleriyle oynarsın.' : 'Oyunlar önce tekrar zamanı gelen kelimeleri getirir.'}</p>
        </div>
      )}
      {/* The day's pick: the swipe deck, big. Then the rest in three short rows that scroll
          sideways on phones, so more games never means a longer page. */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onPick('swipe')}
        className="press group relative mb-7 flex w-full items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-flame to-berry p-5 text-left text-white shadow-hard sm:p-6"
      >
        <span aria-hidden className="absolute -right-8 -top-10 size-40 rounded-full bg-white/15" />
        <span className="min-w-0 flex-1">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#1f2433]">Günün oyunu</span>
          <span className="mt-2 block font-display text-2xl font-black sm:text-3xl">Kaydır kartları</span>
          <span className="mt-1 block text-sm text-white/85">Sağa biliyorum, sola tekrar. {st?.due ? `${st.due} kelimenin tekrar zamanı geldi.` : 'Günlük tekrarın için en hızlı yol.'}</span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-extrabold text-[#1f2433]">Başla <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
        </span>
        <span className="hidden shrink-0 sm:block"><SwipeArt /></span>
      </motion.button>

      {GROUPS.map((grp) => (
        <section key={grp.key} className="mb-6">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h3 className="font-display text-lg font-black">{grp.title}</h3>
            <span className="text-xs font-bold text-ink-soft">{grp.text}</span>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {GAMES.filter((g) => g.group === grp.key && g.key !== 'swipe').map((g, i) => (
              <motion.button
                key={g.key}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onPick(g.key)}
                className="press group relative flex w-[46%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border-2 border-line bg-card text-left shadow-hard-sm transition hover:border-ink/25 sm:w-auto"
              >
                <span className={clsx('relative grid h-20 place-items-center overflow-hidden bg-gradient-to-br text-white sm:h-24', g.tone)}>
                  <span aria-hidden className="absolute -right-5 -top-6 size-20 rounded-full bg-white/15" />
                  <g.icon className="size-9 drop-shadow transition duration-300 group-hover:scale-110" strokeWidth={2.2} />
                  {g.badge && <span className="absolute left-2.5 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1f2433]">{g.badge}</span>}
                </span>
                <span className="flex flex-1 flex-col p-3">
                  <span className="font-display text-[15px] font-black leading-tight sm:text-base">{g.title}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{g.text}</span>
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

const GROUPS: { key: Group; title: string; text: string }[] = [
  { key: 'quick', title: 'Hız ve refleks', text: 'Süreli, seri yap' },
  { key: 'spell', title: 'Yazım ve dinleme', text: 'Harf harf, kulakla' },
  { key: 'memory', title: 'Hafıza', text: 'Sakin ve kalıcı' },
]

/** Three fanned cards hinting at the swipe gesture. */
function SwipeArt() {
  return (
    <span className="relative h-28 w-24 lg:h-40 lg:w-32">
      <motion.span className="absolute inset-0 rounded-2xl bg-white/35" animate={{ rotate: -12, x: -18 }} />
      <motion.span className="absolute inset-0 rounded-2xl bg-white/55" animate={{ rotate: 8, x: 16 }} />
      <motion.span className="absolute inset-0 grid place-items-center rounded-2xl bg-white font-display text-xl font-black text-[#1f2433] shadow-lg lg:text-2xl" animate={{ x: [0, 26, 0, -26, 0], rotate: [0, 8, 0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
        hello
      </motion.span>
    </span>
  )
}

function Stat({ v, l, c }: { v: number; l: string; c?: string }) {
  return (
    <span>
      <span className={clsx('block font-display text-3xl font-black leading-none tabular-nums', c)}>{v}</span>
      <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{l}</span>
    </span>
  )
}

function GameRun({ game, onExit, onSwitch }: { game: GameKey; onExit: () => void; onSwitch: (g: GameKey) => void }) {
  const qc = useQueryClient()
  const showReward = useReward()
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<{ outcomes: Outcome[]; score?: number; saved: number } | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['deck', game, round], queryFn: () => get<{ data: DeckWord[] }>(`/words/deck?n=${game === 'match' ? 24 : 16}`), gcTime: 0, staleTime: Infinity })
  const meta = GAMES.find((g) => g.key === game)!

  const submit = useMutation({
    mutationFn: async ({ outcomes, score }: { outcomes: Outcome[]; score?: number }) => {
      // Words you didn't know that aren't in your notebook yet get saved for spaced repetition.
      const toSave = outcomes.filter((o) => !o.known && o.w.id === null)
      await Promise.all(toSave.map((o) => post('/words', { word: o.w.word, translation: o.w.translation, example: o.w.example, source: 'manual' }).catch(() => null)))
      const reviews = outcomes.filter((o) => o.w.id !== null).map((o) => ({ id: o.w.id!, grade: o.known ? 4 : 1 }))
      const played = Math.min(30, outcomes.filter((o) => o.w.id === null && o.known).length)
      const r = reviews.length || played ? await post<{ reward: RewardSummary }>('/review', { reviews, played }).catch(() => null) : null
      // Practice also refills hearts (5+ right answers earn one back).
      const correct = outcomes.filter((o) => o.known).length
      if (correct >= 5) await post('/hearts/earn', { correct }).catch(() => null)
      return { outcomes, score, saved: toSave.length, reward: r?.reward }
    },
    onSuccess: (r) => {
      setResult(r)
      const known = r.outcomes.filter((o) => o.known).length
      if (r.outcomes.length && known / r.outcomes.length >= 0.8) {
        sfx.complete()
        celebrate()
      }
      if (r.reward?.xp_gained) showReward(r.reward, 'Pratik tamam!')
      qc.invalidateQueries({ queryKey: ['words'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
  const finish = (outcomes: Outcome[], score?: number) => submit.mutate({ outcomes, score })
  const again = () => {
    setResult(null)
    setRound((r) => r + 1)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onExit} aria-label="Oyunlardan çık" className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></button>
        <p className="font-display text-xl font-black">{meta.title}</p>
      </div>
      {isLoading || !data ? (
        <Spinner className="min-h-[40vh]" />
      ) : data.data.length < 4 ? (
        <Empty icon={<Layers className="size-8" />} title="Kelime yetersiz" text="Hikâyelerde kelimelere dokunup deftere ekle, sonra geri gel." action={<Link to="/stories" className="font-bold text-flame">Hikâyelere git</Link>} />
      ) : result ? (
        <Result r={result} onAgain={again} onExit={onExit} onSwitch={onSwitch} current={game} />
      ) : submit.isPending ? (
        <Spinner className="min-h-[40vh]" label="Sonuçlar kaydediliyor" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={`${game}-${round}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {game === 'swipe' && <SwipeDeck deck={data.data} onFinish={finish} />}
            {game === 'match' && <SpeedMatch deck={data.data} onFinish={finish} />}
            {game === 'truefalse' && <TrueFalse deck={data.data} onFinish={finish} />}
            {game === 'listen' && <ListenType deck={data.data} onFinish={finish} />}
            {game === 'scramble' && <Scramble deck={data.data} onFinish={finish} />}
            {game === 'memory' && <Memory deck={data.data} onFinish={finish} />}
            {game === 'cloze' && <Cloze deck={data.data} onFinish={finish} />}
            {game === 'choice' && <QuickChoice deck={data.data} onFinish={finish} />}
            {game === 'rain' && <WordRain deck={data.data} onFinish={finish} />}
            {game === 'balloon' && <BalloonRescue deck={data.data} onFinish={finish} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

function Result({ r, onAgain, onExit, onSwitch, current }: { r: { outcomes: Outcome[]; score?: number; saved: number }; onAgain: () => void; onExit: () => void; onSwitch: (g: GameKey) => void; current: GameKey }) {
  const known = r.outcomes.filter((o) => o.known)
  const missed = r.outcomes.filter((o) => !o.known)
  const nextGame = GAMES[(GAMES.findIndex((g) => g.key === current) + 1) % GAMES.length]
  return (
    <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <div className="rounded-[28px] border-2 border-line bg-card p-6 text-center">
        {r.score !== undefined && <p className="font-display text-6xl font-black tabular-nums">{r.score}<span className="text-2xl text-ink-soft"> puan</span></p>}
        <p className={clsx('font-display font-black', r.score !== undefined ? 'mt-2 text-xl' : 'text-4xl')}><span className="text-mint-deep">{known.length} biliyorum</span> · <span className="text-berry">{missed.length} tekrar</span></p>
        {r.saved > 0 && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky/10 px-3 py-1 text-sm font-bold text-sky"><BookmarkPlus className="size-4" /> {r.saved} yeni kelime defterine eklendi</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Restart onClick={onAgain} />
          <Button onClick={() => onSwitch(nextGame.key)} icon={<Shuffle className="size-4" />}>{nextGame.title}</Button>
          <Button variant="ghost" onClick={onExit}>Oyunlar</Button>
        </div>
      </div>
      {missed.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-ink-soft">Tekrar edilecekler</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {missed.map((o) => (
              <li key={o.w.word} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-2.5">
                <button onClick={() => speak(o.w.word)} className="text-sky" aria-label="Dinle"><Volume2 className="size-5" /></button>
                <span className="font-extrabold">{o.w.word}</span>
                <span className="ml-auto truncate text-sm text-ink-soft">{o.w.translation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

function WordList() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<'' | 'due' | 'mastered'>('')
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['words', filter, q],
    queryFn: () => get<{ data: Word[]; stats: { total: number; due: number; mastered: number } }>(`/words?${new URLSearchParams({ ...(filter && { filter }), ...(q && { q }) })}`),
  })
  const remove = useMutation({ mutationFn: (id: number) => del(`/words/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] }) })

  return (
    <div>
      {data && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[['Toplam', data.stats.total, 'bg-card'], ['Tekrar zamanı', data.stats.due, 'bg-butter text-ink'], ['Ustalaşılan', data.stats.mastered, 'bg-mint text-white']].map(([l, v, c]) => (
            <div key={l as string} className={clsx('rounded-2xl border-2 border-line p-4 shadow-hard-sm', c as string)}>
              <p className="font-display text-3xl font-extrabold">{v as number}</p>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">{l as string}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Tabs value={filter} onChange={setFilter} items={[{ value: '', label: 'Tümü' }, { value: 'due', label: 'Tekrar zamanı' }, { value: 'mastered', label: 'Ustalaşılan' }]} />
        <label className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" className="h-9 rounded-xl border-2 border-line bg-card pl-9 pr-3 text-sm font-semibold focus:outline-none" />
        </label>
      </div>
      {isLoading ? <SkeletonPage variant="list" /> : !data?.data.length ? (
        <Empty icon={<Layers className="size-8" />} title="Henüz kelime yok" text="Hikayelerde kelimelere dokunarak defterini doldur." action={<Link to="/stories" className="font-bold text-flame">Hikayelere git →</Link>} />
      ) : (
        <ul className="ink-card divide-y-2 divide-line/10">
          {data.data.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => speak(w.word)} className="text-sky" aria-label="Dinle"><Volume2 className="size-5" /></button>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{w.word}</p>
                <p className="truncate text-sm text-ink-soft">{w.translation ?? '-'}</p>
              </div>
              <span className={clsx('rounded-lg border-2 border-line px-2 py-0.5 text-xs font-bold', w.interval_days >= 21 ? 'bg-mint' : w.interval_days >= 3 ? 'bg-butter' : 'bg-paper-2')}>
                {w.interval_days >= 21 ? 'Usta' : w.interval_days >= 3 ? 'Öğreniyor' : 'Yeni'}
              </span>
              <button onClick={() => remove.mutate(w.id)} className="text-ink-soft hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
