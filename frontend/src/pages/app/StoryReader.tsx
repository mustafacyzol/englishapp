import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Bookmark, BookmarkCheck, Check, ChevronLeft, Headphones, Languages, Pause, Plus, Sparkles, Type, Volume2, X } from 'lucide-react'
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

type Card = { kind: 'cover' } | { kind: 'scene'; i: number } | { kind: 'check'; qi: number } | { kind: 'paywall' } | { kind: 'end' }

/** Spread the questions between scenes so understanding is checked as you go. */
function buildCards(scenes: number, questions: number, locked: boolean): Card[] {
  const out: Card[] = [{ kind: 'cover' }]
  const after = new Map<number, number[]>()
  for (let q = 0; q < questions; q++) {
    const at = Math.max(0, Math.min(scenes - 1, Math.round(((q + 1) * scenes) / (questions + 1)) - 1))
    after.set(at, [...(after.get(at) ?? []), q])
  }
  for (let i = 0; i < scenes; i++) {
    out.push({ kind: 'scene', i })
    if (!locked) for (const qi of after.get(i) ?? []) out.push({ kind: 'check', qi })
  }
  out.push(locked ? { kind: 'paywall' } : { kind: 'end' })
  return out
}

/**
 * A story told in short scenes, one screen at a time: tap a word for its meaning,
 * listen, and answer a quick check every few scenes. Right answers pay XP on the
 * spot, so there is always a next small win. Built for short attention spans:
 * a scene is a few sentences, a check is one tap.
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

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [tr, setTr] = useState(false)
  const [voice, setVoice] = useState(false)
  const [big, setBig] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [charIdx, setCharIdx] = useState(-1)
  const [word, setWord] = useState<{ w: string; p: number; x: number; y: number } | null>(null)
  const [quiz, setQuiz] = useState<Record<number, number>>({})
  const [bookmarked, setBookmarked] = useState(false)
  const started = useRef(Date.now())

  const vocab = useMemo(() => new Map((data?.story.vocabulary ?? []).map((v) => [v.word.toLowerCase(), v])), [data])
  const cards = useMemo(() => (data ? buildCards(data.story.paragraphs.length, data.story.questions?.length ?? 0, data.locked) : []), [data])
  const card = cards[step]
  useEffect(() => setBookmarked(!!data?.read.bookmarked), [data])
  useEffect(() => () => stopSpeaking(), [])

  const saveWord = useMutation({
    mutationFn: (w: { word: string; translation?: string; example?: string }) => post('/words', { ...w, source: 'story', source_id: data?.story.id }),
    onSuccess: () => {
      toast('Kelime defterine eklendi', 'success')
      qc.invalidateQueries({ queryKey: ['words'] })
      setWord(null)
    },
  })
  const bookmark = useMutation({ mutationFn: () => post<{ bookmarked: boolean }>(`/stories/${slug}/bookmark`), onSuccess: (r) => setBookmarked(r.bookmarked) })
  const complete = useMutation({
    mutationFn: async () => {
      const qs = data!.story.questions ?? []
      const r = await post<{ score: number; correct: number; total: number; reward: RewardSummary }>(`/stories/${slug}/complete`, { answers: qs.length ? qs.map((_, i) => quiz[i] ?? null) : null, minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)), listened: voice })
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

  const say = (i: number) => {
    if (!data) return
    stopSpeaking()
    setPlaying(true)
    setCharIdx(-1)
    speak(data.story.paragraphs[i].en, { rate: user?.preferences?.tts_rate ?? 0.92, onBoundary: setCharIdx, onEnd: () => { setCharIdx(-1); setPlaying(false) } })
  }
  const go = (d: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, step + d))
    if (next === step) return
    stopSpeaking()
    setPlaying(false)
    setWord(null)
    setDir(d)
    setStep(next)
    const pct = Math.round((next / Math.max(1, cards.length - 1)) * 100)
    post(`/stories/${slug}/progress`, { progress: pct }).catch(() => {})
    const c = cards[next]
    if (voice && c?.kind === 'scene') setTimeout(() => say(c.i), 350)
  }
  // a check has to be answered before moving on
  const blocked = card?.kind === 'check' && quiz[card.qi] === undefined
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' && !blocked) go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  if (isLoading) return <SkeletonPage variant="reader" />
  if (error || !data || !card) return <p className="p-8 text-center font-bold">{(error as ApiError)?.message ?? 'Hikâye bulunamadı.'}</p>
  const { story } = data
  const questions = story.questions ?? []
  const first = !data.read.completed_at
  const perRight = first ? eco?.xp.story_per_correct ?? 3 : eco?.xp.story_repeat_per_correct ?? 1
  const base = first ? eco?.xp.story_first ?? 8 : eco?.xp.story_repeat ?? 3
  const right = questions.filter((q, i) => quiz[i] === q.answer).length
  const answered = Object.keys(quiz).length

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-2xl flex-col">
      {/* top bar: close, story segments, tools */}
      <div className="mb-4 flex items-center gap-2">
        <Link to="/stories" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label="Kütüphaneye dön"><X className="size-6" /></Link>
        <div className="flex flex-1 gap-1" aria-label={`Sahne ${step + 1}/${cards.length}`}>
          {cards.map((c, k) => (
            <span key={k} className={clsx('h-1.5 flex-1 rounded-full transition-colors duration-300', k < step ? (c.kind === 'check' ? (quiz[c.qi] === questions[c.qi]?.answer ? 'bg-mint' : 'bg-berry/60') : 'bg-flame') : k === step ? 'bg-flame/60' : 'bg-line')} />
          ))}
        </div>
        <button onClick={() => bookmark.mutate()} className="grid size-10 shrink-0 place-items-center rounded-xl hover:bg-paper-2" aria-label="Kaydet">{bookmarked ? <BookmarkCheck className="size-5 text-flame" /> : <Bookmark className="size-5 text-ink-soft" />}</button>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.section
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            drag={blocked ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, i) => { if (i.offset.x < -70) go(1); else if (i.offset.x > 70) go(-1) }}
            className="touch-pan-y"
          >
            {card.kind === 'cover' && (
              <div className="overflow-hidden rounded-[28px] border-2 border-line bg-card">
                <div className="relative aspect-[16/10]">
                  <StoryCover story={story} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <div className="mb-2 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-butter px-2.5 py-1 text-[#1f2433]">{story.cefr_level}</span>
                      <span className="rounded-full bg-white/20 px-2.5 py-1 backdrop-blur">{story.paragraphs.length} sahne · ~{story.reading_minutes} dk</span>
                    </div>
                    <h1 className="text-3xl leading-tight sm:text-4xl">{story.title}</h1>
                    {story.title_tr && <p className="text-white/80">{story.title_tr}</p>}
                  </div>
                </div>
                <div className="p-6">
                  {story.summary && <p className="text-[15px]">{story.summary}</p>}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Chip v={`${story.paragraphs.length}`} l="kısa sahne" />
                    <Chip v={`${questions.length}`} l="hızlı kontrol" />
                    <Chip v={`${base}+${perRight}×`} l="XP / doğru" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Toggle on={voice} onClick={() => setVoice((v) => !v)} icon={<Headphones className="size-4" />}>Sahneleri seslendir</Toggle>
                    <Toggle on={tr} onClick={() => setTr((v) => !v)} icon={<Languages className="size-4" />}>Türkçesini göster</Toggle>
                    <Toggle on={big} onClick={() => setBig((v) => !v)} icon={<Type className="size-4" />}>Büyük yazı</Toggle>
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">Altı çizili kelimelere dokun: anlamı çıkar, tek dokunuşla defterine eklersin.</p>
                </div>
              </div>
            )}

            {card.kind === 'scene' && (() => {
              const p = story.paragraphs[card.i]
              return (
                <div className="rounded-[28px] border-2 border-line bg-card p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-ink-soft">Sahne {card.i + 1}/{story.paragraphs.length}</span>
                    <div className="flex gap-1.5">
                      {p.tr && <button onClick={() => setTr((v) => !v)} className={clsx('grid size-10 place-items-center rounded-full border-2', tr ? 'border-flame bg-flame/10 text-flame' : 'border-line text-ink-soft')} aria-label="Türkçesi"><Languages className="size-4" /></button>}
                      <button onClick={() => (playing ? (stopSpeaking(), setPlaying(false)) : say(card.i))} className="grid size-10 place-items-center rounded-full bg-sky text-white" aria-label="Dinle">{playing ? <Pause className="size-4" /> : <Volume2 className="size-4" />}</button>
                    </div>
                  </div>
                  <p className={clsx('font-read', big ? 'text-[24px] leading-[1.75]' : 'text-[20px] leading-[1.75]')}>
                    <Tokens text={p.en} activeChar={playing ? charIdx : -1} vocab={vocab} onWord={(w, e) => { const r = (e.target as HTMLElement).getBoundingClientRect(); setWord({ w, p: card.i, x: r.left + r.width / 2, y: r.bottom + window.scrollY }) }} />
                  </p>
                  <AnimatePresence>
                    {tr && p.tr && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 overflow-hidden border-l-4 border-flame pl-3 text-base italic text-ink-soft">{p.tr}</motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )
            })()}

            {card.kind === 'check' && (() => {
              const q = questions[card.qi]
              const pick = quiz[card.qi]
              const done = pick !== undefined
              return (
                <div className="rounded-[28px] border-2 border-line bg-card p-6 sm:p-8">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-lilac"><Sparkles className="size-4" /> Hızlı kontrol · +{perRight} XP</p>
                  <h2 className="mt-2 text-2xl leading-snug">{q.q}</h2>
                  <div className="mt-5 grid gap-2.5">
                    {q.options.map((o, oi) => {
                      const right = oi === q.answer
                      return (
                        <motion.button
                          key={oi}
                          whileTap={done ? undefined : { scale: 0.98 }}
                          disabled={done}
                          onClick={() => { setQuiz((s) => ({ ...s, [card.qi]: oi })); oi === q.answer ? sfx.correct(1) : sfx.wrong() }}
                          animate={done && pick === oi && !right ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                          className={clsx('relative flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-bold transition', !done && 'border-line hover:border-ink/30', done && right && 'border-mint bg-mint/10', done && pick === oi && !right && 'border-berry bg-berry/8', done && pick !== oi && !right && 'border-line opacity-50')}
                        >
                          <span className="flex-1">{o}</span>
                          {done && right && <Check className="size-5 text-mint-deep" strokeWidth={3} />}
                        </motion.button>
                      )
                    })}
                  </div>
                  <AnimatePresence>
                    {done && (
                      <motion.p initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={clsx('mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-display font-black', pick === q.answer ? 'bg-mint/15 text-mint-deep' : 'bg-berry/10 text-berry')}>
                        {pick === q.answer ? `Doğru! +${perRight} XP` : 'Olsun, doğrusu yeşil olan.'}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )
            })()}

            {card.kind === 'paywall' && (
              <div className="relative overflow-hidden rounded-[28px] bg-[#1f2433] p-8 text-center text-white">
                <Img src={rewardImg('crown')} alt="" className="mx-auto mb-3 size-20 object-contain" />
                <h2 className="text-2xl">Hikâyenin devamı Premium'da</h2>
                <p className="mx-auto mb-6 mt-2 max-w-sm text-white/70">Tüm hikâyeler, sesli okumalar ve sınırsız pratik için Premium'a geç.</p>
                <LinkButton to="/premium" variant="butter">Premium'u keşfet</LinkButton>
              </div>
            )}

            {card.kind === 'end' && (
              <div className="rounded-[28px] border-2 border-line bg-card p-6 text-center sm:p-8">
                <Img src={higoImg(right === questions.length ? 'cheer' : 'thumbs')} alt="" className="mx-auto size-24 object-contain" />
                <h2 className="mt-2 text-3xl">Son sahne!</h2>
                {questions.length > 0 && <p className="mt-1 text-ink-soft">{answered < questions.length ? `${questions.length - answered} kontrol cevapsız kaldı.` : `${right}/${questions.length} doğru cevap`}</p>}
                <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-2xl bg-butter/25 px-4 py-2 font-display text-2xl font-black tabular-nums">+{base + right * perRight} XP</p>
                <p className="mt-1 text-xs font-bold text-ink-soft">{base} bitirme + {right} × {perRight} doğru cevap{!first && ' (tekrar okuma)'}</p>
                {!!story.vocabulary?.length && (
                  <div className="mt-6 text-left">
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-ink-soft">Bu hikâyenin kelimeleri</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {story.vocabulary.map((v) => (
                        <div key={v.word} className="flex items-center gap-2 rounded-2xl border-2 border-line px-3 py-2">
                          <button onClick={() => speak(v.word)} className="text-sky" aria-label="Dinle"><Volume2 className="size-4" /></button>
                          <span className="min-w-0 flex-1"><b>{v.word}</b> <span className="text-sm text-ink-soft">{v.meaning}</span></span>
                          <button onClick={() => saveWord.mutate({ word: v.word, translation: v.meaning, example: v.example })} className="grid size-8 place-items-center rounded-lg bg-mint/15 text-mint-deep" aria-label="Deftere ekle"><Plus className="size-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button block size="lg" className="mt-6" loading={complete.isPending} onClick={() => complete.mutate()}>Hikâyeyi bitir ve XP’yi al</Button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* bottom controls stay in thumb reach */}
      {card.kind !== 'end' && card.kind !== 'paywall' && (
        <div className="sticky bottom-24 mt-5 flex items-center gap-3 lg:bottom-4">
          <button onClick={() => go(-1)} disabled={step === 0} className="press grid size-14 place-items-center rounded-2xl border-2 border-line bg-card disabled:opacity-30" aria-label="Önceki"><ChevronLeft className="size-6" /></button>
          <Button block size="lg" disabled={blocked} onClick={() => go(1)}>{card.kind === 'cover' ? 'Okumaya başla' : blocked ? 'Bir seçenek seç' : 'Devam'}</Button>
        </div>
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
    </div>
  )
}

function Chip({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl bg-paper-2 px-2 py-2.5">
      <p className="font-display text-xl font-black tabular-nums">{v}</p>
      <p className="text-[11px] font-bold text-ink-soft">{l}</p>
    </div>
  )
}

function Toggle({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={clsx('inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-extrabold transition', on ? 'border-flame bg-flame/10 text-flame' : 'border-line text-ink-soft hover:text-ink')}>{icon}{children}</button>
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
        <p className="text-2xl font-black">{word}</p>
        <button onClick={() => speak(word)} className="grid size-9 place-items-center rounded-full bg-sky text-white" aria-label="Dinle"><Volume2 className="size-4" /></button>
      </div>
      {meaning ? <p className="mb-3 font-semibold">{meaning}</p> : (
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Türkçesi (isteğe bağlı)" className="mb-3 h-10 w-full rounded-xl border-2 border-line bg-paper-2 px-3 text-sm font-semibold focus:outline-none" />
      )}
      <Button size="sm" block loading={saving} onClick={() => onSave(t || undefined)} icon={<Plus className="size-4" />}>Kelime defterine ekle</Button>
    </div>
  )
}
