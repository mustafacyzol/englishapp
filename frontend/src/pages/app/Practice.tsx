import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, BookmarkPlus, Sparkles, Brain, Check, Heart, Grid3x3, Headphones, Layers, Puzzle, Search, Shuffle, TextCursorInput, Timer, Trash2, Volume2, X, Zap } from 'lucide-react'
import { del, get, post } from '@/lib/api'
import { speak } from '@/lib/speech'
import { celebrate, sfx } from '@/lib/fx'
import type { RewardSummary } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Empty, PageHeader, SkeletonPage, Spinner, Tabs } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'
import { useEconomy, XpGuide } from '@/components/game/XpGuide'
import { SetBrowser } from './WordSets'
import { BalloonPop, Cloze, Kelimle, ListenType, Memory, QuickChoice, WordSearch, Restart, Scramble, SpeedMatch, SwipeDeck, TrueFalse, type DeckWord, type Outcome } from './games/WordGames'

interface Word { id: number; word: string; translation: string | null; example: string | null; interval_days: number; due_at: string | null; source: string | null }
type GameKey = 'balloon' | 'swipe' | 'match' | 'truefalse' | 'listen' | 'scramble' | 'memory' | 'cloze' | 'choice' | 'kelimle' | 'search'

type Group = 'quick' | 'memory' | 'spell'
const GAMES: { key: GameKey; title: string; text: string; icon: typeof Layers; tone: string; badge?: string; group: Group; rules: string[] }[] = [
  { group: 'memory', key: 'swipe', title: 'Kaydır kartları', text: 'Sağa biliyorum, sola tekrar. Mobilde parmağınla kaydır.', icon: Layers, tone: 'from-flame to-berry', badge: 'Favori', rules: ['Kartta İngilizce kelimeyi gör, anlamını aklından söyle.', 'Biliyorsan sağa, emin değilsen sola kaydır (ya da oklara bas).', 'Sola attıkların tekrar listene girer, yakında yeniden gelir.'] },
  { group: 'quick', key: 'match', title: 'Hızlı eşleştir', text: '45 saniyede İngilizce ve Türkçeyi eşle, seri yap.', icon: Timer, tone: 'from-sky to-lilac', rules: ['45 saniyen var. Soldan İngilizceyi, sağdan Türkçesini seç.', 'Art arda doğrular seri yapar, seri puanı katlar.', 'Yanlış eşleşme seriyi sıfırlar ama süre durmaz.'] },
  { group: 'quick', key: 'truefalse', title: 'Doğru mu?', text: '30 saniyelik blitz: çeviri doğru mu, yanlış mı?', icon: Check, tone: 'from-mint to-sage', rules: ['30 saniyede olabildiğince çok kart.', 'Çeviri doğruysa Doğru, değilse Yanlış de.', 'Art arda doğrular seri yapar ve puanı artırır; yanlışlar tekrar listene girer.'] },
  { group: 'spell', key: 'listen', title: 'Dinle ve yaz', text: 'Duyduğun kelimeyi yaz, kulağını ve yazımını çalıştır.', icon: Headphones, tone: 'from-lilac to-sky', rules: ['Kelimeyi dinle, istediğin kadar tekrar çal.', 'Duyduğunu yaz ve Kontrol et.', 'Takılırsan Harf ipucu al. Yanlışta doğru yazımı gösteririz.'] },
  { group: 'spell', key: 'scramble', title: 'Harf karıştır', text: 'Karışık harflerden kelimeyi yeniden kur.', icon: Puzzle, tone: 'from-butter to-flame', rules: ['Karışık harflere sırayla dokun ve kelimeyi kur.', 'Türkçe anlamı ipucu olarak üstte durur.', 'Yanlış harfi Sil ile geri alırsın.'] },
  { group: 'memory', key: 'memory', title: 'Hafıza kartları', text: 'Kartları çevir, İngilizceyi Türkçesiyle eşle.', icon: Brain, tone: 'from-berry to-lilac', rules: ['Kartları ikişer ikişer çevir.', 'İngilizce kelimeyi Türkçesiyle eşle, eşleşen çift açık kalır.', '100 puanla başlarsın; her fazla hamle 8 puan düşürür.'] },
  { group: 'spell', key: 'cloze', title: 'Cümlede boşluk', text: 'Kelimeyi kendi örnek cümlesinde yerine koy.', icon: TextCursorInput, tone: 'from-sage to-mint', rules: ['Örnek cümledeki boşluğa gelen kelimeyi seç.', 'Dört seçenekten doğrusunu seç.', 'Yanlış seçimde doğru cümleyi görürsün.'] },
  { group: 'spell', key: 'kelimle', title: 'Kelimle', text: 'Türkçe ipucundan İngilizce kelimeyi 6 denemede bul.', icon: Grid3x3, tone: 'from-mint to-sky', badge: 'Yeni', rules: ['Türkçe ipucuna bakıp İngilizce kelimeyi tahmin et, her kelime için 6 hakkın var.', 'Yeşil: harf doğru yerde. Sarı: harf kelimede var ama başka yerde. Gri: kelimede yok.', 'Üç kelime çözersin; 5 denemede bulduğun kelime "biliyorum" sayılır.'] },
  { group: 'memory', key: 'search', title: 'Kelime avı', text: 'Harf tablosunda saklı 5 kelimeyi 2 dakikada bul.', icon: Search, tone: 'from-lilac to-berry', badge: 'Yeni', rules: ['Harf tablosunda 5 kelime saklı: yatay, dikey ya da çapraz.', 'Kelimenin ilk harfine, sonra son harfine dokun.', '2 dakikan var. Bulamadıkların tekrar listene girer.'] },
  { group: 'quick', key: 'balloon', title: 'Balon patlat', text: 'Doğru anlamın balonunu kaçmadan patlat.', icon: Sparkles, tone: 'from-sky to-lilac', badge: 'Yeni', rules: ['Üstte Türkçe anlam yazar, aşağıdan İngilizce kelimeli balonlar yükselir.', 'Doğru balona dokun ve patlat. Balonlar giderek hızlanır.', 'Yanlış balon ya da kaçan doğru balon bir hak götürür. 3 hakkın var.'] },
  { group: 'quick', key: 'choice', title: 'Hızlı anlam', text: 'On kelime, dört seçenek. Klavyede 1-4.', icon: Zap, tone: 'from-flame to-butter', rules: ['On kelime, her birinde dört seçenek.', 'Doğru anlamı seç; klavyede 1-4 tuşları da çalışır.', 'Art arda doğrular seri yapar; yanlışlar tekrar listene girer.'] },
]

export default function Practice() {
  const [params, setParams] = useSearchParams()
  const [tab, setTabState] = useState<'games' | 'sets' | 'words'>(() => (['sets', 'words'].includes(params.get('tab') ?? '') ? (params.get('tab') as 'sets' | 'words') : 'games'))
  const setTab = (t: 'games' | 'sets' | 'words') => { setTabState(t); setParams(t === 'games' ? {} : { tab: t }, { replace: true }) }
  const nav = useNavigate()
  const set = Number(params.get('set')) || null
  // a "word game" stop on the learning path opens straight into its game, with that unit's words
  const lesson = Number(params.get('lesson')) || null
  const [game, setGame] = useState<GameKey | null>(() => (GAMES.some((g) => g.key === params.get('game')) ? (params.get('game') as GameKey) : null))
  const exit = () => {
    if (lesson) return nav('/learn')
    if (set) return nav(`/practice/sets/${set}`)
    setGame(null)
    if (params.get('game')) setParams({}, { replace: true })
  }
  if (game) return <GameRun key={`${game}-${lesson}-${set}`} game={game} lesson={lesson} set={set} onExit={exit} onSwitch={setGame} />
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Oyunlar, setler, aralıklı tekrar" title="Kelime pratiği" />
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border-2 border-line bg-paper-2 p-1 sm:inline-grid sm:min-w-[420px]">
        {([['games', 'Oyunlar'], ['sets', 'Kelime setleri'], ['words', 'Defterim']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={clsx('rounded-xl px-2 py-2 text-sm font-extrabold transition', tab === k ? 'bg-card text-ink shadow-hard-sm' : 'text-ink-soft hover:text-ink')}>{l}</button>
        ))}
      </div>
      {tab === 'games' ? <GamePicker onPick={setGame} /> : tab === 'sets' ? <SetBrowser /> : <WordList />}
    </div>
  )
}

function GamePicker({ onPick }: { onPick: (g: GameKey) => void }) {
  const { data } = useQuery({ queryKey: ['words', '', ''], queryFn: () => get<{ stats: { total: number; due: number; mastered: number } }>('/words') })
  const st = data?.stats
  return (
    <>
      {st && (
        <div className="mb-6 overflow-hidden rounded-3xl border-2 border-line bg-card">
          <div className="grid grid-cols-3 divide-x-2 divide-line">
            <Stat v={st.due} l="tekrar zamanı" c="text-flame" />
            <Stat v={st.total} l="defterde" />
            <Stat v={st.mastered} l="ustalaşıldı" c="text-mint-deep" />
          </div>
          <p className="border-t-2 border-line bg-paper-2/60 px-4 py-2 text-xs font-semibold text-ink-soft">{st.total < 8 ? 'Defterin dolana kadar seviyene uygun başlangıç kelimeleriyle oynarsın.' : 'Oyunlar önce tekrar zamanı gelen kelimeleri getirir.'}</p>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {GAMES.filter((g) => g.group === grp.key && g.key !== 'swipe').map((g, i) => (
              <motion.button
                key={g.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onPick(g.key)}
                className="press group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border-2 border-line bg-card text-left shadow-hard-sm transition hover:-translate-y-0.5 hover:border-ink/25"
              >
                <span className={clsx('relative grid h-24 place-items-center overflow-hidden bg-gradient-to-br text-white sm:h-28', g.tone)}>
                  <span aria-hidden className="absolute -right-5 -top-6 size-20 rounded-full bg-white/15" />
                  <GamePreview game={g.key} />
                  {g.badge && <span className="absolute left-2.5 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#1f2433]">{g.badge}</span>}
                </span>
                <span className="flex flex-1 flex-col p-3">
                  <span className="font-display text-[15px] font-black leading-tight sm:text-base">{g.title}</span>
                  <span className="mt-1 line-clamp-2 text-xs leading-snug text-ink-soft">{g.text}</span>
                  <Best game={g.key} />
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      ))}
      <XpGuide only="words" className="mt-2" />
    </>
  )
}

const GROUPS: { key: Group; title: string; text: string }[] = [
  { key: 'quick', title: 'Hız ve refleks', text: 'Süreli, seri yap' },
  { key: 'spell', title: 'Yazım ve dinleme', text: 'Harf harf, kulakla' },
  { key: 'memory', title: 'Hafıza', text: 'Sakin ve kalıcı' },
]

function Best({ game }: { game: GameKey }) {
  let v = 0
  try { v = Number(localStorage.getItem(`dilgo.best.${game}`) ?? 0) } catch { /* ignore */ }
  return v ? <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-butter/20 px-2 py-0.5 text-[10px] font-black text-butter-deep">En iyi skor: {v}</span> : <span className="mt-1.5 text-[10px] font-bold text-ink-soft">Henüz oynamadın</span>
}

/** A tiny looping scene per game, so each card shows how it plays. */
function GamePreview({ game }: { game: GameKey }) {
  const chip = 'rounded-lg bg-white px-2 py-1 font-display text-xs font-black text-[#1f2433] shadow'
  const loop = { repeat: Infinity, ease: 'easeInOut' as const }
  switch (game) {
    case 'match':
      return (
        <span className="relative flex w-36 items-center justify-between">
          <motion.span className={chip} animate={{ x: [0, 22, 22, 0] }} transition={{ ...loop, duration: 2.6, times: [0, 0.4, 0.7, 1] }}>apple</motion.span>
          <motion.span className={chip} animate={{ x: [0, -22, -22, 0], backgroundColor: ['#fff', '#fff', '#c9f5df', '#fff'] }} transition={{ ...loop, duration: 2.6, times: [0, 0.4, 0.7, 1] }}>elma</motion.span>
        </span>
      )
    case 'truefalse':
      return (
        <span className="flex flex-col items-center gap-1.5">
          <span className={chip}>cat = kedi</span>
          <span className="flex gap-1.5">
            <motion.span className="grid size-7 place-items-center rounded-full bg-white/90 text-mint-deep" animate={{ scale: [1, 1.25, 1] }} transition={{ ...loop, duration: 1.6 }}><Check className="size-4" strokeWidth={3} /></motion.span>
            <span className="grid size-7 place-items-center rounded-full bg-white/40"><X className="size-4" strokeWidth={3} /></span>
          </span>
        </span>
      )
    case 'listen':
      return (
        <span className="flex items-end gap-1">
          <Headphones className="mr-2 size-8" />
          {[0, 1, 2, 3, 4].map((k) => <motion.span key={k} className="w-1.5 rounded-full bg-white" animate={{ height: [8, 26, 12, 30, 8] }} transition={{ ...loop, duration: 1.2, delay: k * 0.12 }} />)}
        </span>
      )
    case 'scramble':
      return (
        <span className="flex gap-1">
          {['h', 'o', 'u', 's', 'e'].map((c, k) => <motion.span key={c} className="grid size-7 place-items-center rounded-md bg-white font-display text-sm font-black text-[#1f2433] shadow" animate={{ y: [0, k % 2 ? -8 : 8, 0], rotate: [0, k % 2 ? 10 : -10, 0] }} transition={{ ...loop, duration: 2, delay: k * 0.08 }}>{c}</motion.span>)}
        </span>
      )
    case 'memory':
      return (
        <span className="grid grid-cols-3 gap-1">
          {[0, 1, 2, 3, 4, 5].map((k) => <motion.span key={k} className="size-6 rounded-md bg-white/90" animate={k === 1 || k === 4 ? { rotateY: [0, 180, 180, 0], backgroundColor: ['#ffffffe6', '#fff3c4', '#fff3c4', '#ffffffe6'] } : {}} transition={{ ...loop, duration: 3 }} />)}
        </span>
      )
    case 'cloze':
      return (
        <span className="rounded-lg bg-white px-2.5 py-1.5 font-display text-xs font-black text-[#1f2433] shadow">
          I drink <motion.span className="inline-block min-w-10 border-b-2 border-[#1f2433] text-center" animate={{ opacity: [0.2, 1, 1, 0.2] }} transition={{ ...loop, duration: 2.4 }}>tea</motion.span> daily
        </span>
      )
    case 'kelimle':
      return (
        <span className="flex gap-1">
          {['#22b573', '#ffc233', '#9aa3b2', '#22b573', '#22b573'].map((c, k) => <motion.span key={k} className="grid size-7 place-items-center rounded-md font-display text-sm font-black text-white" style={{ background: c }} initial={{ rotateX: 90 }} animate={{ rotateX: [90, 0, 0, 90] }} transition={{ ...loop, duration: 3.2, delay: k * 0.15 }}>{'BREAD'[k]}</motion.span>)}
        </span>
      )
    case 'search':
      return (
        <span className="relative grid grid-cols-5 gap-0.5 font-mono text-[11px] font-black">
          {'CATXQ AOPLM TRSUN ZBDOG KEYIW'.replace(/ /g, '').split('').map((c, k) => <span key={k} className={clsx('grid size-[18px] place-items-center rounded', [0, 6, 12].includes(k) ? 'bg-white text-[#1f2433]' : 'text-white/80')}>{c}</span>)}
          <motion.span className="absolute left-0 top-0 h-[3px] origin-left rounded-full bg-butter" style={{ width: 90, rotate: 45, translateY: 8, translateX: 6 }} animate={{ scaleX: [0, 1, 1, 0] }} transition={{ ...loop, duration: 2.6 }} />
        </span>
      )
    case 'balloon':
      return (
        <span className="flex items-end gap-2">
          {['#ff8a5b', '#ffd25b', '#7be0a8'].map((c, k) => (
            <motion.span key={c} className="relative block h-12 w-9 rounded-[50%] shadow-[inset_-4px_-6px_0_rgba(0,0,0,0.12)]" style={{ background: c }} animate={{ y: [6, -10, 6] }} transition={{ ...loop, duration: 2.2, delay: k * 0.3 }}>
              <span className="absolute left-2 top-2 h-3 w-2 rounded-full bg-white/60" />
              <span className="absolute -bottom-3 left-1/2 h-3 w-px bg-white/70" />
            </motion.span>
          ))}
        </span>
      )
    case 'choice':
      return (
        <span className="grid grid-cols-2 gap-1">
          {['koşmak', 'uyumak', 'yemek', 'okumak'].map((w, k) => <motion.span key={w} className="rounded-md bg-white/85 px-1.5 py-0.5 text-center text-[10px] font-black text-[#1f2433]" animate={k === 3 ? { backgroundColor: ['#ffffffd9', '#c9f5df', '#ffffffd9'], scale: [1, 1.08, 1] } : {}} transition={{ ...loop, duration: 1.8 }}>{w}</motion.span>)}
        </span>
      )
    default:
      return null
  }
}

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
    <span className="flex flex-col items-center px-2 py-3 text-center">
      <span className={clsx('block font-display text-2xl font-black leading-none tabular-nums sm:text-3xl', c)}>{v}</span>
      <span className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-ink-soft sm:text-xs">{l}</span>
    </span>
  )
}

function GameRun({ game, lesson, set, onExit, onSwitch }: { game: GameKey; lesson?: number | null; set?: number | null; onExit: () => void; onSwitch: (g: GameKey) => void }) {
  const qc = useQueryClient()
  const showReward = useReward()
  const [round, setRound] = useState(0)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<{ outcomes: Outcome[]; score?: number; saved: number } | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['deck', game, round, set], queryFn: () => get<{ data: DeckWord[]; set?: { id: number; title: string } }>(`/words/deck?n=${game === 'match' ? 24 : 16}${lesson ? `&lesson=${lesson}` : ''}${set ? `&set=${set}` : ''}`), gcTime: 0, staleTime: Infinity })
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
      // a word-set game counts towards homework that assigned the set
      if (set && outcomes.length) await post(`/word-sets/${set}/played`, { game, correct, total: outcomes.length }).catch(() => null)
      if (correct >= 5) await post('/hearts/earn', { correct }).catch(() => null)
      // played from the path: half the unit's words right completes the stop
      let path: { reward?: RewardSummary; level_up?: string | null } | null = null
      if (lesson && outcomes.length && correct / outcomes.length >= 0.5) path = await post<{ reward: RewardSummary; level_up?: string | null }>(`/lessons/${lesson}/complete`, { answers: [] }).catch(() => null)
      return { outcomes, score, saved: toSave.length, reward: path?.reward ?? r?.reward, pathDone: !!path }
    },
    onSuccess: (r) => {
      setResult(r)
      const known = r.outcomes.filter((o) => o.known).length
      // personal best per game (score games keep points, the others the number of words known)
      const mark = r.score ?? known
      try { if (mark > Number(localStorage.getItem(`dilgo.best.${game}`) ?? 0)) localStorage.setItem(`dilgo.best.${game}`, String(mark)) } catch { /* private mode */ }
      if (r.outcomes.length && known / r.outcomes.length >= 0.8) {
        sfx.complete()
        celebrate()
      }
      if (r.reward?.xp_gained) showReward(r.reward, 'Pratik tamam!')
      qc.invalidateQueries({ queryKey: ['words'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (r.pathDone) qc.invalidateQueries({ queryKey: ['path'] })
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
        <p className="min-w-0 font-display text-xl font-black leading-tight">{meta.title}{data?.set && <span className="block truncate text-sm font-bold text-ink-soft">{data.set.title}</span>}</p>
      </div>
      {isLoading || !data ? (
        <Spinner className="min-h-[40vh]" />
      ) : data.data.length < 4 ? (
        <Empty icon={<Layers className="size-8" />} title="Kelime yetersiz" text="Hikâyelerde kelimelere dokunup deftere ekle, sonra geri gel." action={<Link to="/stories" className="font-bold text-flame">Hikâyelere git</Link>} />
      ) : !started ? (
        <GameIntro meta={meta} onStart={() => setStarted(true)} />
      ) : result ? (
        <Result r={result} onAgain={again} onExit={onExit} onSwitch={onSwitch} current={game} />
      ) : submit.isPending ? (
        <Spinner className="min-h-[40vh]" label="Sonuçlar kaydediliyor" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={`${game}-${round}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {game === 'balloon' && <BalloonPop deck={data.data} onFinish={finish} />}
            {game === 'swipe' && <SwipeDeck deck={data.data} onFinish={finish} />}
            {game === 'match' && <SpeedMatch deck={data.data} onFinish={finish} />}
            {game === 'truefalse' && <TrueFalse deck={data.data} onFinish={finish} />}
            {game === 'listen' && <ListenType deck={data.data} onFinish={finish} />}
            {game === 'scramble' && <Scramble deck={data.data} onFinish={finish} />}
            {game === 'memory' && <Memory deck={data.data} onFinish={finish} />}
            {game === 'cloze' && <Cloze deck={data.data} onFinish={finish} />}
            {game === 'choice' && <QuickChoice deck={data.data} onFinish={finish} />}
            {game === 'kelimle' && <Kelimle deck={data.data} onFinish={finish} />}
            {game === 'search' && <WordSearch deck={data.data} onFinish={finish} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

/** Rules first, so nobody has to guess how a game works or what it pays. */
function GameIntro({ meta, onStart }: { meta: (typeof GAMES)[number]; onStart: () => void }) {
  const { data: e } = useEconomy()
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[28px] border-2 border-line bg-card">
      <div className={clsx('relative flex items-center gap-4 bg-gradient-to-br p-5 text-white sm:p-6', meta.tone)}>
        <span aria-hidden className="absolute -right-10 -top-12 size-44 rounded-full bg-white/15" />
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/20"><meta.icon className="size-7" strokeWidth={2.2} /></span>
        <span className="relative min-w-0">
          <span className="block font-display text-2xl font-black leading-tight">{meta.title}</span>
          <span className="block text-sm text-white/85">{meta.text}</span>
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-widest text-ink-soft">Nasıl oynanır?</p>
        <ol className="mt-3 space-y-2.5">
          {meta.rules.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-display text-xs font-black text-paper">{i + 1}</span>
              <span className="text-[15px] leading-snug">{r}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-butter/40 px-3 py-1.5"><Zap className="size-3.5" /> Her doğru cevap {e?.xp.practice_per_correct ?? 1} XP</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1.5">Kelime XP'si günde en fazla {e?.daily_caps.words ?? 60}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-berry/10 px-3 py-1.5 text-berry"><Heart className="size-3.5" /> 5+ doğru = 1 can</span>
        </div>
        <Button className="mt-6" block size="lg" onClick={onStart} icon={<ArrowRight className="size-5" />}>Başla</Button>
      </div>
    </motion.div>
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
