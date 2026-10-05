import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, Bookmark, BookmarkCheck, Check, Gauge, Languages, Minus, Pause, Plus, Volume2, X } from 'lucide-react'
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
  const [word, setWord] = useState<{ w: string; p: number; rect: DOMRect } | null>(null)
  const [quiz, setQuiz] = useState<Record<number, number | string>>({})
  const [phase, setPhase] = useState<'read' | 'test' | 'done'>('read')
  const [cheer, setCheer] = useState<string | null>(null)
  const cheered = useRef(new Set<number>())
  const testRef = useRef<HTMLDivElement>(null)
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
  useEffect(() => {
    if (!word) return
    const close = () => setWord(null)
    window.addEventListener('scroll', close, { passive: true, once: true })
    return () => window.removeEventListener('scroll', close)
  }, [word])
  // Higo checks in at the halfway mark and at the end, by name
  useEffect(() => {
    if (!data) return
    const n = data.story.paragraphs.length
    const first = user?.name.split(' ')[0] ?? ''
    const at = (k: number, msg: string) => { if (!cheered.current.has(k)) { cheered.current.add(k); setCheer(msg); setTimeout(() => setCheer(null), 4200) } }
    if (n > 3 && read >= Math.ceil(n / 2) && read < n) at(1, `Yarıyı geçtin ${first}! Bilmediğin kelimeye dokun, deftere ekle.`)
    if (read >= n) at(2, `Bitirdin ${first}! Şimdi ne kadar anladığına bakalım.`)
  }, [read, data, user])

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
  const right = questions.filter((q, i) => isRight(q, quiz[i])).length
  const answered = Object.keys(quiz).length
  const words = story.paragraphs.reduce((n, p) => n + p.en.split(/\s+/).length, 0)
  const hasTr = story.paragraphs.some((p) => p.tr)

  return (
    <div className="mx-auto max-w-[680px] pb-16">
      {/* reading progress, a hairline under the app header */}
      <motion.div aria-hidden className="fixed inset-x-0 top-[64px] z-30 h-[3px] origin-left bg-flame" style={{ scaleX: bar }} />

      {/* toolbar */}
      <div className="sticky top-[67px] z-20 -mx-2 mb-4 flex items-center gap-1 rounded-2xl bg-paper/90 px-2 py-1.5 backdrop-blur">
        <Link to={lessonId ? '/learn' : '/stories'} className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label="Geri"><ArrowLeft className="size-5" /></Link>
        <p className="min-w-0 flex-1 truncate font-display font-black">{story.title}</p>
        <button onClick={() => (playing !== null ? stop() : playFrom(Math.min(read, story.paragraphs.length - 1)))} className={clsx('flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition', playing !== null ? 'bg-sky text-white' : 'bg-sky/10 text-sky hover:bg-sky/15')} aria-label={playing !== null ? 'Durdur' : 'Sesli dinle'}>
          {playing !== null ? <Pause className="size-4" /> : <Volume2 className="size-4" />}
          <span className="hidden sm:inline">{playing !== null ? `${playing + 1}/${story.paragraphs.length}` : 'Dinle'}</span>
        </button>
        {playing !== null && <button onClick={() => setRate((r) => (r + 1) % RATES.length)} className="flex h-10 shrink-0 items-center gap-1 rounded-xl border-2 border-line px-2 font-mono text-xs font-bold" aria-label="Okuma hızı"><Gauge className="size-3.5" />{RATES[rate]}×</button>}
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
        {user && (
          <p className="mt-4 flex items-center gap-3 rounded-2xl bg-butter/15 px-4 py-3 text-sm font-semibold">
            <Img src={higoImg('read')} alt="" className="size-10 shrink-0 object-contain" />
            <span>{user.name.split(' ')[0]}, bu hikâye {story.cefr_level} seviyende.{user.interests?.includes(story.category ?? '') ? ' İlgi alanına göre seçtik.' : ''} Bitirince kısa bir anlama testi var; her doğru XP kazandırır.</span>
          </p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-paper-2 px-4 py-3 text-sm font-semibold text-ink-soft">
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
              <Tokens text={p.en} activeChar={playing === i ? charIdx : -1} vocab={vocab} saved={saved} onWord={(w, rect) => setWord({ w, p: i, rect })} />
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

      <div className="my-10 flex items-center gap-3 text-ink-soft" aria-hidden><span className="h-px flex-1 bg-line" /><span className="text-xs tracking-[0.4em]">• • •</span><span className="h-px flex-1 bg-line" /></div>

      {data.locked ? (
        <div className="relative overflow-hidden rounded-[28px] bg-[#1f2433] p-8 text-center text-white">
          <Img src={rewardImg('crown')} alt="" className="mx-auto mb-3 size-20 object-contain" />
          <h2 className="text-2xl">Hikâyenin devamı Premium'da</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-white/70">Tüm hikâyeler, sesli okumalar ve sınırsız pratik için Premium'a geç.</p>
          <LinkButton to="/premium" variant="butter">Premium'u keşfet</LinkButton>
        </div>
      ) : (
        <>
          {questions.length > 0 && phase === 'read' && (
            <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-lilac to-[#6b5be0] p-6 text-white sm:p-8">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-4">
                <Img src={higoImg('think')} alt="" className="w-20 shrink-0 drop-shadow-lg sm:w-24" />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">Anlama testi</p>
                  <h2 className="mt-1 font-display text-2xl font-black leading-tight">Ne kadar anladın?</h2>
                  <p className="mt-1 text-sm text-white/85">{questions.length} soru · her doğru +{perRight} XP. İstersen önce hikâyeye tekrar göz at.</p>
                </div>
              </div>
              <Button size="lg" variant="butter" block className="relative mt-5" onClick={() => { setPhase('test'); setTimeout(() => testRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}>Anlama testini başlat</Button>
            </motion.section>
          )}
          {questions.length > 0 && phase === 'test' && (
            <div ref={testRef} className="scroll-mt-28">
              <ComprehensionTest questions={questions} answers={quiz} setAnswer={(i, v) => setQuiz((s) => ({ ...s, [i]: v }))} perRight={perRight} onDone={() => setPhase('done')} />
            </div>
          )}

          {(phase === 'done' || !questions.length) && <section className="mt-6 rounded-[28px] border-2 border-line bg-card p-6 text-center">
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
          </section>}
        </>
      )}

      {/* word card: pops up right above the word you tapped (below it near the top of the screen) */}
      <AnimatePresence>
        {word && (() => {
          const W = Math.min(340, window.innerWidth - 24)
          const cx = Math.min(window.innerWidth - 12 - W / 2, Math.max(12 + W / 2, word.rect.left + word.rect.width / 2))
          const below = word.rect.top < 280
          const arrow = Math.max(18, Math.min(W - 18, word.rect.left + word.rect.width / 2 - (cx - W / 2)))
          return (
            <>
              <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWord(null)} />
              <motion.div
                role="dialog"
                aria-label={word.w}
                initial={{ opacity: 0, scale: 0.92, y: below ? -6 : 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                className="fixed z-50"
                style={{ width: W, left: cx - W / 2, top: below ? word.rect.bottom + 12 : word.rect.top - 12, translate: below ? '0 0' : '0 -100%', transformOrigin: `${arrow}px ${below ? '0%' : '100%'}` }}
              >
                <WordCard key={word.w} word={word.w} meaning={vocab.get(word.w)?.meaning} saved={saved.includes(word.w)} onClose={() => setWord(null)} onSave={(t) => saveWord.mutate({ word: word.w, translation: t, example: story.paragraphs[word.p].en })} saving={saveWord.isPending} />
                <span aria-hidden className={clsx('absolute size-3.5 rotate-45 border-line bg-card', below ? '-top-[7px] border-l-2 border-t-2' : '-bottom-[7px] border-b-2 border-r-2')} style={{ left: arrow - 7 }} />
              </motion.div>
            </>
          )
        })()}
      </AnimatePresence>

      {/* Higo's check-ins */}
      <AnimatePresence>
        {cheer && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-[96px] right-3 z-30 flex max-w-[300px] items-end gap-2 lg:bottom-6 lg:right-8">
            <p className="rounded-2xl rounded-br-md bg-card px-4 py-3 text-sm font-bold shadow-soft ring-1 ring-line">{cheer}</p>
            <Img src={higoImg('cheer')} alt="" className="w-16 shrink-0 drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolBtn({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} aria-label={label} title={label} className={clsx('grid size-10 shrink-0 place-items-center rounded-xl transition', on ? 'bg-flame/10 text-flame' : 'text-ink-soft hover:bg-paper-2')}>{children}</button>
}

function Tokens({ text, activeChar, vocab, saved, onWord }: { text: string; activeChar: number; vocab: Map<string, unknown>; saved: string[]; onWord: (w: string, rect: DOMRect) => void }) {
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
          <span key={i} role="button" tabIndex={0} onClick={(e) => onWord(clean, e.currentTarget.getBoundingClientRect())} onKeyDown={(e) => e.key === 'Enter' && onWord(clean, e.currentTarget.getBoundingClientRect())} className={clsx('cursor-pointer rounded-[4px] transition-colors', active ? 'bg-sky text-white' : mine ? 'bg-mint/20' : known ? 'underline decoration-butter decoration-[3px] underline-offset-[5px] hover:bg-butter/40' : 'hover:bg-butter/40')}>
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
    <div className="rounded-3xl border-2 border-line bg-card p-4 shadow-[0_18px_40px_-18px_rgba(31,36,51,.45)]">
      <div className="mb-1 flex items-center gap-3">
        <button onClick={() => speak(word, { rate: 0.85 })} className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-white" aria-label="Dinle"><Volume2 className="size-5" /></button>
        <p className="min-w-0 flex-1 truncate font-read text-2xl font-bold">{word}</p>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper-2" aria-label="Kapat"><X className="size-5" /></button>
      </div>
      {meaning ? <p className="mb-4 mt-2 text-lg font-bold">{meaning}</p> : (
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Türkçesini yaz (isteğe bağlı)" className="mb-4 mt-3 h-11 w-full rounded-xl border-2 border-line bg-paper-2 px-3 font-semibold focus:border-sky focus:outline-none" />
      )}
      <Button block loading={saving} disabled={saved} onClick={() => onSave(t || undefined)} icon={saved ? <Check className="size-4" /> : <Plus className="size-4" />}>{saved ? 'Defterinde' : 'Kelime defterine ekle'}</Button>
    </div>
  )
}

type Q = NonNullable<Story['questions']>[number]
const norm = (x: string) => x.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim()
/** Mirrors StoryController::isRight, for instant feedback (the server decides the XP). */
function isRight(q: Q, given: number | string | undefined) {
  if (given === undefined || given === '') return false
  const t = q.type ?? 'choice'
  if (t === 'gap') return typeof given === 'string' && [String(q.answer), ...(q.accept ?? [])].some((a) => a && norm(a) === norm(given))
  if (t === 'order') return typeof given === 'string' && norm(q.options.join(' ')) === norm(given)
  return Number(given) === Number(q.answer)
}

/** One question at a time, instant feedback, a "Sonraki" between them. */
function ComprehensionTest({ questions, answers, setAnswer, perRight, onDone }: { questions: Q[]; answers: Record<number, number | string>; setAnswer: (i: number, v: number | string) => void; perRight: number; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [built, setBuilt] = useState<number[]>([])
  const q = questions[i]
  const type = q.type ?? 'choice'
  const given = answers[i]
  const locked = given !== undefined
  const ok = locked && isRight(q, given)
  const shuffled = useMemo(() => q.options.map((w, k) => ({ w, k })).sort((a, b) => ((a.k * 7 + 3) % 5) - ((b.k * 7 + 3) % 5) || a.k - b.k), [q])
  const lock = (v: number | string) => { setAnswer(i, v); isRight(q, v) ? sfx.correct(1) : sfx.wrong() }
  const next = () => { setTyped(''); setBuilt([]); if (i + 1 < questions.length) setI(i + 1); else onDone() }
  return (
    <section className="rounded-[28px] border-2 border-line bg-card p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-xs font-black uppercase tracking-widest text-lilac">Anlama testi</span>
        <span className="flex flex-1 gap-1">{questions.map((_, k) => <span key={k} className={clsx('h-1.5 flex-1 rounded-full', k < i || (k === i && locked) ? (isRight(questions[k], answers[k]) ? 'bg-mint' : 'bg-berry') : k === i ? 'bg-lilac' : 'bg-line')} />)}</span>
        <span className="font-mono text-xs font-bold text-ink-soft">{i + 1}/{questions.length}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
          <p className="mb-4 font-display text-xl font-black leading-snug">{type === 'truefalse' ? <><span className="mb-1 block text-xs font-black uppercase tracking-widest text-ink-soft">Doğru mu, yanlış mı?</span>{q.q}</> : q.q}</p>
          {(type === 'choice' || type === 'truefalse') && (
            <div className={clsx('grid gap-2', type === 'truefalse' ? 'grid-cols-2' : 'sm:grid-cols-2')}>
              {q.options.map((o, oi) => {
                const right = oi === Number(q.answer)
                return (
                  <motion.button key={oi} disabled={locked} whileTap={locked ? undefined : { scale: 0.98 }} animate={locked && given === oi && !right ? { x: [0, -6, 6, -4, 4, 0] } : {}} onClick={() => lock(oi)}
                    className={clsx('flex items-center gap-2 rounded-xl border-2 px-3.5 py-3 text-left text-[15px] font-bold transition', !locked && 'border-line hover:border-ink/30', locked && right && 'border-mint bg-mint/10', locked && given === oi && !right && 'border-berry bg-berry/8', locked && given !== oi && !right && 'border-line opacity-45')}>
                    <span className="flex-1">{o}</span>{locked && right && <Check className="size-4 text-mint-deep" strokeWidth={3} />}
                  </motion.button>
                )
              })}
            </div>
          )}
          {type === 'gap' && (
            <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() && !locked) lock(typed.trim()) }} className="flex gap-2">
              <input value={locked ? String(given) : typed} disabled={locked} onChange={(e) => setTyped(e.target.value)} placeholder="Boşluğa ne gelir?" autoCapitalize="off" className={clsx('h-12 min-w-0 flex-1 rounded-xl border-2 bg-paper-2 px-4 text-lg font-bold outline-none', locked ? (ok ? 'border-mint' : 'border-berry') : 'border-line focus:border-lilac')} />
              {!locked && <Button type="submit" disabled={!typed.trim()}>Kontrol et</Button>}
            </form>
          )}
          {type === 'order' && (
            <div>
              <div className="flex min-h-[52px] flex-wrap gap-2 border-b-2 border-dashed border-line pb-3">
                {built.map((k, j) => <button key={k} disabled={locked} onClick={() => setBuilt(built.filter((_, x) => x !== j))} className="rounded-xl border-2 border-ink bg-card px-3 py-1.5 font-bold">{q.options[k]}</button>)}
                {!built.length && <span className="self-center text-sm text-ink-soft">Kelimelere sırayla dokun</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {shuffled.map(({ w, k }) => <button key={k} disabled={locked || built.includes(k)} onClick={() => setBuilt([...built, k])} className={clsx('rounded-xl border-2 px-3 py-1.5 font-bold', built.includes(k) ? 'border-line bg-paper-2 text-transparent' : 'border-line hover:border-ink/40')}>{w}</button>)}
              </div>
              {!locked && <Button className="mt-4" disabled={built.length !== q.options.length} onClick={() => lock(built.map((k) => q.options[k]).join(' '))}>Kontrol et</Button>}
            </div>
          )}
          {locked && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('mt-5 flex flex-wrap items-center gap-3 rounded-2xl p-3', ok ? 'bg-mint/12' : 'bg-berry/8')}>
              <span className="min-w-0 flex-1 text-sm font-bold">{ok ? `Doğru! +${perRight} XP` : <>Doğrusu: <b>{type === 'order' ? q.options.join(' ') : type === 'gap' ? String(q.answer) : q.options[Number(q.answer)]}</b></>}</span>
              <Button size="sm" onClick={next}>{i + 1 < questions.length ? 'Sonraki' : 'Sonucu gör'}</Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
