import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Bookmark, BookmarkCheck, Check, Gauge, Languages, Minus, Pause, Play, Plus, Sparkles, Volume2, X } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { speak, stopSpeaking } from '@/lib/speech'
import type { RewardSummary, Story } from '@/lib/types'
import { Button, LinkButton } from '@/components/ui/Button'
import { SkeletonPage } from '@/components/ui/Misc'
import { useEconomy } from '@/components/game/XpGuide'
import { higoImg } from '@/components/game/Higo'
import { sfx } from '@/lib/fx'
import { useReward } from '@/components/game/RewardProvider'
import { useToast } from '@/components/ui/Toast'
import { StoryCover } from './StoryCover'
import { rewardImg } from '@/lib/assets'
import { Img } from '@/components/ui/Img'

interface Resp { story: Story; locked: boolean; read: { bookmarked: boolean; progress: number; completed_at: string | null } }

const SIZES = ['text-[18px] leading-[1.8]', 'text-[20px] leading-[1.85]', 'text-[23px] leading-[1.85]']
const RATES = [0.75, 0.9, 1.05]

/**
 * A story read like a book, not a slideshow (the pattern of LingQ, Beelinguapp
 * and Kindle): the whole text flows on one calm page in a reading typeface, a
 * thin bar shows how far you are, and a player stays at the bottom that reads
 * the story aloud paragraph by paragraph while highlighting the line. Turkish
 * can sit under each paragraph (parallel text), any word opens its meaning and
 * saves to the word book, and the questions come once, at the end, where each
 * right answer pays XP.
 */
export default function StoryReader() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const lessonId = params.get('lesson')
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const showReward = useReward()
  const { user } = useAuth()
  const { data: eco } = useEconomy()
  const { data, isLoading, error } = useQuery({ queryKey: ['story', slug], queryFn: () => get<Resp>(`/stories/${slug}`) })

  const [tr, setTr] = useState(false)
  const [size, setSize] = useState(1)
  const [rate, setRate] = useState(1)
  const [playing, setPlaying] = useState<number | null>(null)
  const [charIdx, setCharIdx] = useState(-1)
  const [word, setWord] = useState<{ w: string; p: number } | null>(null)
  const [quiz, setQuiz] = useState<Record<number, number>>({})
  const [bookmarked, setBookmarked] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [listened, setListened] = useState(false)
  const [read, setRead] = useState(0)
  const started = useRef(Date.now())
  const run = useRef(0)
  const paras = useRef<(HTMLElement | null)[]>([])
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 160, damping: 28 })

  const vocab = useMemo(() => new Map((data?.story.vocabulary ?? []).map((v) => [v.word.toLowerCase(), v])), [data])
  useEffect(() => setBookmarked(!!data?.read.bookmarked), [data])
  useEffect(() => () => { run.current++; stopSpeaking() }, [])

  // Paragraphs scrolled past count as read; progress is saved as you go.
  useEffect(() => {
    if (!data) return
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        const i = Number((e.target as HTMLElement).dataset.i)
        if (e.isIntersecting || e.boundingClientRect.top < 0) setRead((r) => Math.max(r, i + 1))
      }
    }, { rootMargin: '0px 0px -40% 0px' })
    paras.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [data])
  useEffect(() => {
    if (!data || !read) return
    const pct = Math.round((read / data.story.paragraphs.length) * 100)
    const t = setTimeout(() => post(`/stories/${slug}/progress`, { progress: pct }).catch(() => {}), 800)
    return () => clearTimeout(t)
  }, [read, data, slug])

  const saveWord = useMutation({
    mutationFn: (w: { word: string; translation?: string; example?: string }) => post('/words', { ...w, source: 'story', source_id: data?.story.id }),
    onSuccess: (_, w) => {
      toast('Kelime defterine eklendi', 'success')
      qc.invalidateQueries({ queryKey: ['words'] })
      setSaved((s) => [...new Set([...s, w.word])])
      setWord(null)
    },
  })
  const bookmark = useMutation({ mutationFn: () => post<{ bookmarked: boolean }>(`/stories/${slug}/bookmark`), onSuccess: (r) => setBookmarked(r.bookmarked) })
  const complete = useMutation({
    mutationFn: async () => {
      const qs = data!.story.questions ?? []
      const r = await post<{ score: number; correct: number; total: number; reward: RewardSummary }>(`/stories/${slug}/complete`, { answers: qs.length ? qs.map((_, i) => quiz[i] ?? null) : null, minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)), listened })
      if (lessonId) await post(`/lessons/${lessonId}/complete`, { answers: [] })
      return r
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['path'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      showReward(r.reward, r.total ? `Hikâye bitti · ${r.correct}/${r.total} doğru` : 'Hikâye bitti')
      nav(lessonId ? '/learn' : '/stories')
    },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })

  /** Read aloud from paragraph i to the end, following along on the page. */
  const playFrom = (i: number) => {
    if (!data || i >= data.story.paragraphs.length) return stop()
    const id = ++run.current
    setPlaying(i)
    setListened(true)
    setCharIdx(-1)
    paras.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    speak(data.story.paragraphs[i].en, {
      rate: (user?.preferences?.tts_rate ?? 0.92) * (RATES[rate] / 0.9),
      onBoundary: (c) => id === run.current && setCharIdx(c),
      onEnd: () => { if (id === run.current) playFrom(i + 1) },
    })
  }
  const stop = () => {
    run.current++
    stopSpeaking()
    setPlaying(null)
    setCharIdx(-1)
  }

  if (isLoading) return <SkeletonPage variant="reader" />
  if (error || !data) return <p className="p-8 text-center font-bold">{(error as ApiError)?.message ?? 'Hikâye bulunamadı.'}</p>
  const { story } = data
  const questions = story.questions ?? []
  const first = !data.read.completed_at
  const perRight = first ? eco?.xp.story_per_correct ?? 3 : eco?.xp.story_repeat_per_correct ?? 1
  const base = first ? eco?.xp.story_first ?? 8 : eco?.xp.story_repeat ?? 3
  const right = questions.filter((q, i) => quiz[i] === q.answer).length
  const answered = Object.keys(quiz).length
  const words = story.paragraphs.reduce((n, p) => n + p.en.split(/\s+/).length, 0)
  const hasTr = story.paragraphs.some((p) => p.tr)

  return (
    <div className="mx-auto max-w-[680px] pb-28">
      {/* reading progress, a hairline under the app header */}
      <motion.div aria-hidden className="fixed inset-x-0 top-[64px] z-30 h-[3px] origin-left bg-flame" style={{ scaleX: bar }} />

      {/* toolbar */}
      <div className="sticky top-[67px] z-20 -mx-2 mb-4 flex items-center gap-1 rounded-2xl bg-paper/90 px-2 py-1.5 backdrop-blur">
        <Link to={lessonId ? '/learn' : '/stories'} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label="Geri"><ArrowLeft className="size-5" /></Link>
        <p className="min-w-0 flex-1 truncate font-display font-black">{story.title}</p>
        {hasTr && <ToolBtn on={tr} onClick={() => setTr((v) => !v)} label="Türkçesi"><Languages className="size-[18px]" /></ToolBtn>}
        <div className="flex items-center rounded-xl border-2 border-line">
          <button onClick={() => setSize((s) => Math.max(0, s - 1))} disabled={size === 0} className="grid size-8 place-items-center text-ink-soft disabled:opacity-30" aria-label="Yazıyı küçült"><Minus className="size-4" /></button>
          <span className="font-read text-sm font-bold">Aa</span>
          <button onClick={() => setSize((s) => Math.min(2, s + 1))} disabled={size === 2} className="grid size-8 place-items-center text-ink-soft disabled:opacity-30" aria-label="Yazıyı büyüt"><Plus className="size-4" /></button>
        </div>
        <ToolBtn on={bookmarked} onClick={() => bookmark.mutate()} label="Kaydet">{bookmarked ? <BookmarkCheck className="size-[18px]" /> : <Bookmark className="size-[18px]" />}</ToolBtn>
      </div>

      {/* title page */}
      <header className="mb-8">
        <div className="relative aspect-[16/8] overflow-hidden rounded-[28px]">
          <StoryCover story={story} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute bottom-4 left-5 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-butter px-2.5 py-1 text-[#1f2433]">{story.cefr_level}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-white backdrop-blur">~{story.reading_minutes} dk · {words} kelime</span>
          </div>
        </div>
        <h1 className="mt-6 font-read text-[clamp(2rem,6vw,2.75rem)] font-bold leading-tight">{story.title}</h1>
        {story.title_tr && <p className="mt-1 text-ink-soft">{story.title_tr}</p>}
        {story.summary && <p className="mt-3 text-[15px] text-ink-soft">{story.summary}</p>}
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-paper-2 px-4 py-3 text-sm font-semibold text-ink-soft">
          <span>Bir kelimeye dokun: anlamı çıksın.</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-5 rounded bg-butter" /> Altı çizililer bu hikâyenin kelimeleri</span>
        </p>
      </header>

      {/* the text */}
      <article className={clsx('font-read text-ink', SIZES[size])}>
        {story.paragraphs.map((p, i) => (
          <section key={i} ref={(el) => { paras.current[i] = el }} data-i={i} className={clsx('group relative -mx-3 mb-6 rounded-2xl px-3 py-1 transition-colors', playing === i && 'bg-sky/[0.07]')}>
            <button onClick={() => (playing === i ? stop() : playFrom(i))} aria-label={playing === i ? 'Durdur' : 'Bu paragraftan dinle'} className={clsx('absolute -left-9 top-2 hidden size-7 place-items-center rounded-full transition sm:grid', playing === i ? 'bg-sky text-white' : 'text-ink-soft/50 opacity-0 hover:bg-paper-2 group-hover:opacity-100')}>
              {playing === i ? <Pause className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>
            <p className={clsx(i === 0 && 'first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-[3.4em] first-letter:font-black first-letter:leading-[0.8] first-letter:text-flame')}>
              <Tokens text={p.en} activeChar={playing === i ? charIdx : -1} vocab={vocab} saved={saved} onWord={(w) => setWord({ w, p: i })} />
            </p>
            <AnimatePresence initial={false}>
              {tr && p.tr && (
                <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden font-sans text-[15px] leading-relaxed text-ink-soft">
                  <span className="mt-2 block border-l-[3px] border-flame/60 pl-3">{p.tr}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </section>
        ))}
      </article>

      <div className="my-10 flex items-center gap-3 text-ink-soft" aria-hidden><span className="h-px flex-1 bg-line" /><Sparkles className="size-4" /><span className="h-px flex-1 bg-line" /></div>

      {data.locked ? (
        <div className="relative overflow-hidden rounded-[28px] bg-[#1f2433] p-8 text-center text-white">
          <Img src={rewardImg('crown')} alt="" className="mx-auto mb-3 size-20 object-contain" />
          <h2 className="text-2xl">Hikâyenin devamı Premium'da</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-white/70">Tüm hikâyeler, sesli okumalar ve sınırsız pratik için Premium'a geç.</p>
          <LinkButton to="/premium" variant="butter">Premium'u keşfet</LinkButton>
        </div>
      ) : (
        <>
          {questions.length > 0 && (
            <section className="rounded-[28px] border-2 border-line bg-card p-5 sm:p-7">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-lilac"><Sparkles className="size-4" /> Anladın mı?</p>
              <h2 className="mt-1 font-display text-2xl font-black">{questions.length} kısa soru · her doğru +{perRight} XP</h2>
              <ol className="mt-5 space-y-6">
                {questions.map((q, qi) => {
                  const pick = quiz[qi]
                  const done = pick !== undefined
                  return (
                    <li key={qi}>
                      <p className="mb-2.5 font-bold"><span className="mr-2 font-mono text-sm text-ink-soft">{qi + 1}.</span>{q.q}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((o, oi) => {
                          const ok = oi === q.answer
                          return (
                            <motion.button
                              key={oi}
                              disabled={done}
                              whileTap={done ? undefined : { scale: 0.98 }}
                              animate={done && pick === oi && !ok ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                              onClick={() => { setQuiz((s) => ({ ...s, [qi]: oi })); ok ? sfx.correct(1) : sfx.wrong() }}
                              className={clsx('flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left text-[15px] font-bold transition', !done && 'border-line hover:border-ink/30', done && ok && 'border-mint bg-mint/10', done && pick === oi && !ok && 'border-berry bg-berry/8', done && pick !== oi && !ok && 'border-line opacity-45')}
                            >
                              <span className="flex-1">{o}</span>
                              {done && ok && <Check className="size-4 text-mint-deep" strokeWidth={3} />}
                            </motion.button>
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          <section className="mt-6 rounded-[28px] border-2 border-line bg-card p-6 text-center">
            <Img src={higoImg(questions.length && right === questions.length ? 'cheer' : 'thumbs')} alt="" className="mx-auto size-20 object-contain" />
            <p className="mx-auto mt-2 inline-flex items-center gap-2 rounded-2xl bg-butter/25 px-4 py-2 font-display text-2xl font-black tabular-nums">+{base + right * perRight} XP</p>
            <p className="mt-1 text-xs font-bold text-ink-soft">{base} bitirme + {right} × {perRight} doğru cevap{!first && ' (tekrar okuma)'}{questions.length > answered && ` · ${questions.length - answered} soru cevapsız`}</p>
            {!!story.vocabulary?.length && (
              <div className="mt-5 text-left">
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-ink-soft">Bu hikâyenin kelimeleri</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {story.vocabulary.map((v) => {
                    const has = saved.includes(v.word.toLowerCase()) || saved.includes(v.word)
                    return (
                      <div key={v.word} className="flex items-center gap-2 rounded-2xl border-2 border-line px-3 py-2">
                        <button onClick={() => speak(v.word)} className="text-sky" aria-label="Dinle"><Volume2 className="size-4" /></button>
                        <span className="min-w-0 flex-1"><b>{v.word}</b> <span className="text-sm text-ink-soft">{v.meaning}</span></span>
                        <button disabled={has} onClick={() => saveWord.mutate({ word: v.word, translation: v.meaning, example: v.example })} className="grid size-8 place-items-center rounded-lg bg-mint/15 text-mint-deep disabled:opacity-60" aria-label="Deftere ekle">{has ? <Check className="size-4" /> : <Plus className="size-4" />}</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <Button block size="lg" className="mt-6" loading={complete.isPending} onClick={() => complete.mutate()}>Hikâyeyi bitir ve XP’yi al</Button>
          </section>
        </>
      )}

      {/* the player: always in thumb reach */}
      <div className="fixed inset-x-0 bottom-[92px] z-30 px-3 lg:bottom-5 lg:left-[256px]">
        <div className="mx-auto flex max-w-[680px] items-center gap-3 rounded-2xl border-2 border-line bg-card/95 p-2 pr-3 shadow-soft backdrop-blur">
          <button onClick={() => (playing !== null ? stop() : playFrom(Math.min(read, story.paragraphs.length - 1)))} className="press grid size-11 shrink-0 place-items-center rounded-xl bg-sky text-white" aria-label={playing !== null ? 'Durdur' : 'Sesli dinle'}>
            {playing !== null ? <Pause className="size-5" /> : <Play className="size-5 fill-current" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{playing !== null ? `Okunuyor · paragraf ${playing + 1}/${story.paragraphs.length}` : 'Sesli dinle'}</p>
            <span className="mt-1 flex gap-0.5">
              {story.paragraphs.map((_, k) => <span key={k} className={clsx('h-1 flex-1 rounded-full', playing === k ? 'bg-sky' : k < read ? 'bg-flame/70' : 'bg-line')} />)}
            </span>
          </div>
          <button onClick={() => setRate((r) => (r + 1) % RATES.length)} className="flex h-9 shrink-0 items-center gap-1 rounded-xl border-2 border-line px-2 font-mono text-xs font-bold" aria-label="Okuma hızı"><Gauge className="size-3.5" />{RATES[rate]}×</button>
        </div>
      </div>

      {/* word sheet */}
      <AnimatePresence>
        {word && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWord(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 38 }} className="safe-bottom fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg px-3 pb-3">
              <WordCard key={word.w} word={word.w} meaning={vocab.get(word.w)?.meaning} saved={saved.includes(word.w)} onClose={() => setWord(null)} onSave={(t) => saveWord.mutate({ word: word.w, translation: t, example: story.paragraphs[word.p].en })} saving={saveWord.isPending} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolBtn({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} aria-label={label} title={label} className={clsx('grid size-10 shrink-0 place-items-center rounded-xl transition', on ? 'bg-flame/10 text-flame' : 'text-ink-soft hover:bg-paper-2')}>{children}</button>
}

function Tokens({ text, activeChar, vocab, saved, onWord }: { text: string; activeChar: number; vocab: Map<string, unknown>; saved: string[]; onWord: (w: string) => void }) {
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
        const mine = saved.includes(clean)
        const active = activeChar >= p.start && activeChar < p.start + p.t.length
        return (
          <span key={i} role="button" tabIndex={0} onClick={() => onWord(clean)} onKeyDown={(e) => e.key === 'Enter' && onWord(clean)} className={clsx('cursor-pointer rounded-[4px] transition-colors', active ? 'bg-sky text-white' : mine ? 'bg-mint/20' : known ? 'underline decoration-butter decoration-[3px] underline-offset-[5px] hover:bg-butter/40' : 'hover:bg-butter/40')}>
            {p.t}
          </span>
        )
      })}
    </>
  )
}

function WordCard({ word, meaning, saved, onSave, onClose, saving }: { word: string; meaning?: string; saved: boolean; onSave: (translation?: string) => void; onClose: () => void; saving: boolean }) {
  const [t, setT] = useState(meaning ?? '')
  useEffect(() => { speak(word, { rate: 0.85 }) }, [word])
  return (
    <div className="rounded-3xl border-2 border-line bg-card p-5 shadow-soft">
      <div className="mb-1 flex items-center gap-3">
        <button onClick={() => speak(word, { rate: 0.85 })} className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-white" aria-label="Dinle"><Volume2 className="size-5" /></button>
        <p className="min-w-0 flex-1 truncate font-read text-3xl font-bold">{word}</p>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper-2" aria-label="Kapat"><X className="size-5" /></button>
      </div>
      {meaning ? <p className="mb-4 mt-2 text-lg font-bold">{meaning}</p> : (
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Türkçesini yaz (isteğe bağlı)" className="mb-4 mt-3 h-11 w-full rounded-xl border-2 border-line bg-paper-2 px-3 font-semibold focus:border-sky focus:outline-none" />
      )}
      <Button block loading={saving} disabled={saved} onClick={() => onSave(t || undefined)} icon={saved ? <Check className="size-4" /> : <Plus className="size-4" />}>{saved ? 'Defterinde' : 'Kelime defterine ekle'}</Button>
    </div>
  )
}
