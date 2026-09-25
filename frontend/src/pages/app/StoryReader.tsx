import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Bookmark, BookmarkCheck, Crown, Languages, Pause, Play, Plus, Type, Volume2 } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { speak, stopSpeaking } from '@/lib/speech'
import type { RewardSummary, Story } from '@/lib/types'
import { Button, LinkButton } from '@/components/ui/Button'
import { Progress, Spinner, Sticker } from '@/components/ui/Misc'
import { useReward } from '@/components/game/RewardProvider'
import { useToast } from '@/components/ui/Toast'
import { StoryCover } from './StoryCover'

interface Resp { story: Story; locked: boolean; read: { bookmarked: boolean; progress: number; completed_at: string | null } }

export default function StoryReader() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const lessonId = params.get('lesson')
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const showReward = useReward()
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({ queryKey: ['story', slug], queryFn: () => get<Resp>(`/stories/${slug}`) })

  const [showTr, setShowTr] = useState<Record<number, boolean>>({})
  const [playing, setPlaying] = useState<number | null>(null)
  const [charIdx, setCharIdx] = useState(-1)
  const [big, setBig] = useState(false)
  const [word, setWord] = useState<{ w: string; p: number; x: number; y: number } | null>(null)
  const [quiz, setQuiz] = useState<Record<number, number>>({})
  const [bookmarked, setBookmarked] = useState(false)
  const autoplay = useRef(false)
  const maxProgress = useRef(0)
  const started = useRef(Date.now())

  const vocab = useMemo(() => new Map((data?.story.vocabulary ?? []).map((v) => [v.word.toLowerCase(), v])), [data])
  useEffect(() => setBookmarked(!!data?.read.bookmarked), [data])
  useEffect(() => () => stopSpeaking(), [])

  // scroll progress → server (throttled by 10% steps)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const pct = Math.min(100, Math.round(((h.scrollTop + h.clientHeight) / h.scrollHeight) * 100))
      if (pct >= maxProgress.current + 10) {
        maxProgress.current = pct
        post(`/stories/${slug}/progress`, { progress: pct }).catch(() => {})
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [slug])

  const saveWord = useMutation({
    mutationFn: (w: { word: string; translation?: string; example?: string }) => post('/words', { ...w, source: 'story', source_id: data?.story.id }),
    onSuccess: () => {
      toast('Kelime defterine eklendi ✓', 'success')
      qc.invalidateQueries({ queryKey: ['words'] })
      setWord(null)
    },
  })
  const bookmark = useMutation({ mutationFn: () => post<{ bookmarked: boolean }>(`/stories/${slug}/bookmark`), onSuccess: (r) => setBookmarked(r.bookmarked) })
  const complete = useMutation({
    mutationFn: async () => {
      const r = await post<{ score: number; reward: RewardSummary }>(`/stories/${slug}/complete`, { answers: Object.keys(quiz).length ? data!.story.questions!.map((_, i) => quiz[i] ?? null) : null, minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)) })
      if (lessonId) await post(`/lessons/${lessonId}/complete`, { answers: [] })
      return r
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['path'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      showReward(r.reward, `Hikaye bitti · Quiz %${r.score}`)
      nav(lessonId ? '/learn' : '/stories')
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })

  const playParagraph = (i: number) => {
    if (!data) return
    if (playing === i) {
      autoplay.current = false
      stopSpeaking()
      setPlaying(null)
      return
    }
    setPlaying(i)
    setCharIdx(-1)
    speak(data.story.paragraphs[i].en, {
      rate: user?.preferences?.tts_rate ?? 0.92,
      onBoundary: setCharIdx,
      onEnd: () => {
        setCharIdx(-1)
        if (autoplay.current && i + 1 < data.story.paragraphs.length) playParagraph(i + 1)
        else setPlaying(null)
      },
    })
  }

  if (isLoading) return <Spinner />
  if (error || !data) return <p className="p-8 text-center font-bold">{(error as ApiError)?.message ?? 'Hikaye bulunamadı.'}</p>
  const { story, locked } = data
  const questions = story.questions ?? []
  const allAnswered = questions.every((_, i) => quiz[i] !== undefined)

  return (
    <article className="mx-auto max-w-2xl pb-16">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/stories" className="flex items-center gap-1 font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-5" /> Kütüphane</Link>
        <div className="flex gap-2">
          <button onClick={() => setBig((b) => !b)} className="grid size-10 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm" aria-label="Yazı boyutu"><Type className="size-5" /></button>
          <button onClick={() => bookmark.mutate()} className="grid size-10 place-items-center rounded-xl border-2 border-line bg-card shadow-hard-sm" aria-label="Kaydet">{bookmarked ? <BookmarkCheck className="size-5 text-flame" /> : <Bookmark className="size-5" />}</button>
        </div>
      </div>

      <header className="ink-card mb-8 overflow-hidden">
        <div className="h-40 border-b-2 border-line"><StoryCover story={story} /></div>
        <div className="p-6">
          <div className="mb-2 flex flex-wrap gap-2">
            <Sticker color="bg-butter" rotate={-2}>{story.cefr_level}</Sticker>
            {story.category && <Sticker color="bg-mint" rotate={2}>{story.category}</Sticker>}
            <Sticker color="bg-card" rotate={-1}>{story.reading_minutes} dk · {story.word_count} kelime</Sticker>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight">{story.title}</h1>
          {story.title_tr && <p className="text-lg text-ink-soft">{story.title_tr}</p>}
          <p className="mt-3">{story.summary}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => { autoplay.current = true; playParagraph(0) }} icon={<Volume2 className="size-5" />} variant="dark">Tümünü dinle</Button>
            <Button variant="secondary" onClick={() => setShowTr(Object.fromEntries(story.paragraphs.map((_, i) => [i, !Object.values(showTr).some(Boolean)])))} icon={<Languages className="size-5" />}>Çeviriler</Button>
          </div>
        </div>
      </header>

      <p className="mb-4 text-sm font-semibold text-ink-soft">💡 Bilmediğin bir kelimeye dokun: anlamını gör, sesini dinle, kelime defterine ekle.</p>

      <div className={clsx('space-y-6 font-read', big ? 'text-[22px] leading-[1.85]' : 'text-[19px] leading-[1.8]')}>
        {story.paragraphs.map((p, i) => (
          <div key={i} className={clsx('group relative rounded-2xl border-2 p-4 transition', playing === i ? 'border-line bg-butter/30' : 'border-transparent hover:border-line/15')}>
            <div className="absolute -left-2 top-4 flex flex-col gap-1 sm:-left-14">
              <button onClick={() => { autoplay.current = false; playParagraph(i) }} className="grid size-9 place-items-center rounded-full border-2 border-line bg-card shadow-hard-sm" aria-label="Paragrafı dinle">
                {playing === i ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              {p.tr && (
                <button onClick={() => setShowTr((s) => ({ ...s, [i]: !s[i] }))} className="grid size-9 place-items-center rounded-full border-2 border-line bg-card shadow-hard-sm" aria-label="Çeviri">
                  <Languages className="size-4" />
                </button>
              )}
            </div>
            <p className="pl-8 sm:pl-0">
              <Tokens text={p.en} activeChar={playing === i ? charIdx : -1} vocab={vocab} onWord={(w, e) => { const r = (e.target as HTMLElement).getBoundingClientRect(); setWord({ w, p: i, x: r.left + r.width / 2, y: r.bottom + window.scrollY }) }} />
            </p>
            <AnimatePresence>
              {showTr[i] && p.tr && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden border-l-4 border-flame pl-8 font-sans text-base italic text-ink-soft sm:pl-3">
                  {p.tr}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {locked ? (
        <div className="ink-card relative mt-8 overflow-hidden bg-[#1B1F3B] p-8 text-center text-[#F6F1E7]">
          <Crown className="mx-auto mb-3 size-12 text-butter" />
          <h2 className="text-2xl font-extrabold">Hikayenin devamı Premium'da</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-[#F6F1E7]/70">Tüm hikayeler, sesli okumalar ve sınırsız pratik için Premium'a geç.</p>
          <LinkButton to="/premium" variant="butter">Premium'u keşfet</LinkButton>
        </div>
      ) : (
        <>
          {!!story.vocabulary?.length && (
            <section className="ink-card mt-10 p-6">
              <h2 className="mb-4 text-2xl font-extrabold">Hikayedeki kelimeler</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {story.vocabulary.map((v) => (
                  <div key={v.word} className="flex items-center gap-2 rounded-xl border-2 border-line/15 p-3">
                    <button onClick={() => speak(v.word)} className="text-sky" aria-label="Dinle"><Volume2 className="size-5" /></button>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{v.word}</p>
                      <p className="truncate text-sm text-ink-soft">{v.meaning}</p>
                    </div>
                    <button onClick={() => saveWord.mutate({ word: v.word, translation: v.meaning, example: v.example })} className="grid size-8 place-items-center rounded-lg border-2 border-line bg-butter text-[#1B1F3B]" aria-label="Kaydet"><Plus className="size-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="ink-card mt-8 p-6">
            <h2 className="mb-1 text-2xl font-extrabold">Anladın mı?</h2>
            <p className="mb-5 text-ink-soft">Soruları cevapla, hikayeyi bitir ve XP kazan.</p>
            <div className="space-y-6">
              {questions.map((q, qi) => (
                <div key={qi}>
                  <p className="mb-2 font-bold">{qi + 1}. {q.q}</p>
                  <div className="grid gap-2">
                    {q.options.map((o, oi) => (
                      <button key={oi} onClick={() => setQuiz((s) => ({ ...s, [qi]: oi }))} className={clsx('rounded-xl border-2 border-line px-4 py-2.5 text-left font-semibold', quiz[qi] === oi ? 'bg-sky text-white shadow-hard-sm' : 'bg-card hover:bg-paper-2')}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Progress value={Object.keys(quiz).length} max={Math.max(1, questions.length)} className="mb-4" />
              <Button block size="lg" disabled={!allAnswered} loading={complete.isPending} onClick={() => complete.mutate()}>Hikayeyi bitir</Button>
            </div>
          </section>
        </>
      )}

      <AnimatePresence>
        {word && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setWord(null)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="absolute z-50 w-64 -translate-x-1/2" style={{ left: Math.min(Math.max(word.x, 140), window.innerWidth - 140), top: word.y + 8 }}>
              <WordCard word={word.w} meaning={vocab.get(word.w)?.meaning} example={story.paragraphs[word.p].en} onSave={(t) => saveWord.mutate({ word: word.w, translation: t, example: story.paragraphs[word.p].en })} saving={saveWord.isPending} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </article>
  )
}

function Tokens({ text, activeChar, vocab, onWord }: { text: string; activeChar: number; vocab: Map<string, unknown>; onWord: (w: string, e: React.MouseEvent) => void }) {
  const parts = useMemo(() => {
    const out: { t: string; start: number; word: boolean }[] = []
    const re = /[A-Za-z’'-]+|[^A-Za-z’'-]+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) out.push({ t: m[0], start: m.index, word: /[A-Za-z]/.test(m[0]) })
    return out
  }, [text])
  return (
    <>
      {parts.map((p, i) => {
        if (!p.word) return <span key={i}>{p.t}</span>
        const clean = p.t.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, "'")
        const known = vocab.has(clean)
        const active = activeChar >= p.start && activeChar < p.start + p.t.length
        return (
          <span key={i} role="button" tabIndex={0} onClick={(e) => onWord(clean, e)} className={clsx('cursor-pointer rounded px-[1px] transition', active ? 'bg-flame text-white' : known ? 'underline decoration-butter decoration-[3px] underline-offset-4 hover:bg-butter/50' : 'hover:bg-butter/50')}>
            {p.t}
          </span>
        )
      })}
    </>
  )
}

function WordCard({ word, meaning, onSave, saving }: { word: string; meaning?: string; example: string; onSave: (translation?: string) => void; saving: boolean }) {
  const [t, setT] = useState(meaning ?? '')
  return (
    <div className="ink-card p-4 font-sans">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-2xl font-extrabold">{word}</p>
        <button onClick={() => speak(word)} className="grid size-9 place-items-center rounded-full border-2 border-line bg-sky text-white" aria-label="Dinle"><Volume2 className="size-4" /></button>
      </div>
      {meaning ? <p className="mb-3 font-semibold">{meaning}</p> : (
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Türkçesi (isteğe bağlı)" className="mb-3 h-10 w-full rounded-xl border-2 border-line bg-paper-2 px-3 text-sm font-semibold focus:outline-none" />
      )}
      <Button size="sm" block loading={saving} onClick={() => onSave(t || undefined)} icon={<Plus className="size-4" />}>Kelime defterine ekle</Button>
    </div>
  )
}
