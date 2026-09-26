import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { Check, Crown, Flame, Ghost, Shield, ShieldAlert, Swords, Ticket, Timer, Trophy, X } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { leagueImg, rewardImg } from '@/lib/assets'
import { SKILL, SKILLS } from '@/lib/skills'
import type { Exercise, RewardSummary, SkillKey } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { celebrate, preloadSfx, sfx } from '@/lib/fx'
import { stopSpeaking } from '@/lib/speech'
import { Button } from '@/components/ui/Button'
import { SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'
import { ExerciseView, correctText, isCorrect, type Answer } from './LessonPlayer'

interface Rank { key: string; name: string; min: number; tier: number }
interface Overview {
  me: { trophies: number; best: number; rank: Rank; next_rank: Rank | null; wins: number; losses: number; draws: number; win_streak: number; tickets_left: number | null; tickets_total: number | null; position: number }
  skills: { key: SkillKey; label: string; correct: number; total: number }[]
  recent: { id: number; ghost_name: string; result: 'win' | 'loss' | 'draw'; score: number; ghost_score: number; delta: number; at: string }[]
  defenses: { id: number; challenger: string; held: boolean; delta: number; at: string }[]
  leaderboard: { position: number; name: string; username: string; trophies: number; rank: string; is_me: boolean }[]
  ranks: Rank[]
}
interface DuelData {
  id: number
  ghost: { name: string; trophies: number; rank: Rank; skills: Record<SkillKey, number>; training: boolean }
  rounds: { skill: SkillKey; label: string; items: { ex: Exercise; ghost: { correct: boolean; ms: number } }[] }[]
}
interface DuelResult {
  result: 'win' | 'loss' | 'draw'
  score: number
  ghost_score: number
  correct: number
  total: number
  results: boolean[]
  ghost_results: boolean[]
  trophies_delta: number
  trophies: number
  rank: Rank
  rank_up: boolean
  next_rank: Rank | null
  win_streak: number
  gems: number
  chest: boolean
  reward: RewardSummary | null
}

const ITEM_MS = 20000
const points = (ok: boolean, ms: number) => (ok ? 100 + Math.max(0, 50 - Math.floor(ms / 400)) : 0)

export default function Duel() {
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { refresh } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['duel'], queryFn: () => get<Overview>('/duel') })
  const [duel, setDuel] = useState<DuelData | null>(null)
  const start = useMutation({
    mutationFn: () => post<{ duel: DuelData }>('/duel'),
    onSuccess: (r) => setDuel(r.duel),
    onError: (e: ApiError) => (e.status === 402 ? toast(e.message, 'error') : toast(e.message, 'error')),
  })
  useEffect(() => preloadSfx('tap', 'correct', 'wrong', 'complete', 'levelup', 'reward'), [])

  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const me = data.me
  const next = me.next_rank
  const toNext = next ? next.min - me.trophies : 0
  const span = next ? next.min - me.rank.min : 1
  const noTickets = me.tickets_left === 0

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------ Stage */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#151922] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_14px)]" />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/55"><Ghost className="size-4" /> DilGO’ya özel</p>
            <h1 className="mt-2 text-4xl leading-[1.05] sm:text-5xl">Gölge Düellosu</h1>
            <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-white/70">
              Dört tur, dört beceri: okuma, dinleme, konuşma, yazma. Rakibinin <b className="text-white">gölgesine</b> — gerçek beceri seviyelerinden oluşan kaydına — karşı yarış. Sen yokken senin gölgen de kupalarını savunur.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => start.mutate()}
                disabled={start.isPending || noTickets}
                className="press flex h-14 items-center gap-2.5 rounded-2xl bg-butter px-7 font-display text-lg font-extrabold uppercase tracking-wide text-[#1f2433] shadow-[0_4px_0_0_var(--color-butter-deep)] disabled:opacity-50"
              >
                <Swords className="size-6" /> {start.isPending ? 'Rakip aranıyor…' : 'Düelloya gir'}
              </button>
              <span className="flex items-center gap-2 rounded-2xl bg-white/8 px-4 py-3 text-sm font-bold text-white/80">
                <Ticket className="size-4 text-butter" />
                {me.tickets_left === null ? 'Premium · sınırsız düello' : `Bugün ${me.tickets_left}/${me.tickets_total} hak`}
              </span>
            </div>
            {noTickets && (
              <p className="mt-3 text-sm text-white/60">Hakların yarın yenilenir. <Link to="/premium" className="font-bold text-butter underline">Premium</Link> ile sınırsız oyna.</p>
            )}
          </div>

          <div className="flex items-center gap-5 rounded-3xl bg-white/6 p-5 ring-1 ring-white/10 lg:w-[340px]">
            <Img src={leagueImg(me.rank.tier)} alt="" className="size-24 shrink-0 object-contain drop-shadow-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">Rütben</p>
              <p className="font-display text-2xl font-black">{me.rank.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-black tabular-nums text-butter"><Trophy className="size-5" /> {me.trophies}</p>
              {next ? (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div className="h-full rounded-full bg-butter" initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((me.trophies - me.rank.min) / span) * 100)}%` }} transition={{ duration: 1 }} />
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-white/60">{next.name} rütbesine <b className="text-white">{toNext}</b> kupa</p>
                </>
              ) : (
                <p className="mt-2 text-xs font-bold text-butter">Zirvedesin. Efsaneni koru!</p>
              )}
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-4 border-t border-white/10 text-center">
          {[
            ['Galibiyet', me.wins],
            ['Mağlubiyet', me.losses],
            ['Seri', me.win_streak],
            ['Sıralama', `#${me.position}`],
          ].map(([l, v]) => (
            <div key={l as string} className="border-r border-white/10 px-2 py-3 last:border-r-0">
              <p className="font-display text-xl font-black tabular-nums">{v}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ Ghost report */}
      {data.defenses.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl">Sen yokken gölgen</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {data.defenses.map((d) => (
              <div key={d.id} className={clsx('flex min-w-[260px] items-center gap-3 rounded-2xl border-2 p-4', d.held ? 'border-mint/40 bg-mint/8' : 'border-berry/30 bg-berry/6')}>
                <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl text-white', d.held ? 'bg-mint' : 'bg-berry')}>{d.held ? <Shield className="size-6" /> : <ShieldAlert className="size-6" />}</span>
                <div className="min-w-0">
                  <p className="font-black leading-tight">{d.held ? 'Kupanı korudu' : 'Kupa kaptırdı'} <span className={d.held ? 'text-mint-deep' : 'text-berry'}>{d.delta > 0 ? `+${d.delta}` : d.delta}</span></p>
                  <p className="truncate text-sm text-ink-soft">{d.challenger} meydan okudu</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8">
          {/* ------------------------------------------------------- Rank ladder */}
          <section>
            <h2 className="mb-1 text-xl">Rütbe yolu</h2>
            <p className="mb-4 text-sm text-ink-soft">Galibiyet +24–32 kupa, mağlubiyet −12. Her 3 galibiyet serisinde gizemli sandık.</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-3">
              {data.ranks.map((r) => {
                const reached = me.trophies >= r.min
                const current = r.key === me.rank.key
                return (
                  <div key={r.key} className={clsx('relative flex min-w-[112px] flex-1 flex-col items-center rounded-2xl border-2 px-3 pb-3 pt-4 text-center', current ? 'border-butter bg-butter/10' : 'border-line bg-card', !reached && 'opacity-60')}>
                    {current && <span className="absolute -top-2.5 rounded-full bg-butter px-2 py-0.5 text-[10px] font-black uppercase text-[#1f2433]">Sen</span>}
                    <Img src={leagueImg(r.tier)} alt="" className={clsx('size-14 object-contain', !reached && 'grayscale')} />
                    <p className="mt-1 font-display font-black">{r.name}</p>
                    <p className="flex items-center gap-1 text-xs font-bold text-ink-soft"><Trophy className="size-3" /> {r.min}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ------------------------------------------------ Four-skill record */}
          <section>
            <h2 className="mb-4 text-xl">Düello karnesi</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SKILLS.map((k) => {
                const s = data.skills.find((x) => x.key === k)
                const pct = s && s.total ? Math.round((s.correct / s.total) * 100) : null
                const S = SKILL[k]
                return (
                  <div key={k} className="rounded-2xl border-2 border-line bg-card p-4">
                    <div className="flex items-center gap-2">
                      <span className={clsx('grid size-8 place-items-center rounded-lg text-white', S.bg)}><S.icon className="size-4" /></span>
                      <span className="font-extrabold">{S.label}</span>
                    </div>
                    <p className="mt-3 font-display text-3xl font-black tabular-nums">{pct === null ? '—' : `%${pct}`}</p>
                    <p className="text-xs text-ink-soft">{s?.total ? `${s.correct}/${s.total} doğru` : 'Henüz tur yok'}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {!!data.recent.length && (
            <section>
              <h2 className="mb-3 text-xl">Son düellolar</h2>
              <div className="divide-y-2 divide-line overflow-hidden rounded-2xl border-2 border-line bg-card">
                {data.recent.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={clsx('grid size-9 place-items-center rounded-xl text-sm font-black text-white', r.result === 'win' ? 'bg-mint' : r.result === 'loss' ? 'bg-berry' : 'bg-ink-soft')}>{r.result === 'win' ? 'G' : r.result === 'loss' ? 'M' : 'B'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{r.ghost_name}’in gölgesi</span>
                      <span className="block text-xs tabular-nums text-ink-soft">{r.score} – {r.ghost_score}</span>
                    </span>
                    <span className={clsx('flex items-center gap-1 font-display font-black tabular-nums', r.delta >= 0 ? 'text-mint-deep' : 'text-berry')}><Trophy className="size-4" /> {r.delta >= 0 ? `+${r.delta}` : r.delta}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------- Board */}
        <section>
          <h2 className="mb-3 text-xl">Kupa sıralaması</h2>
          <div className="overflow-hidden rounded-2xl border-2 border-line bg-card">
            {data.leaderboard.length === 0 && <p className="p-6 text-center text-ink-soft">İlk kupayı sen al — sıralama seni bekliyor.</p>}
            {data.leaderboard.map((r) => (
              <div key={r.username} className={clsx('flex items-center gap-3 border-b-2 border-line px-4 py-2.5 last:border-b-0', r.is_me && 'bg-butter/12')}>
                <span className={clsx('w-7 text-center font-display font-black tabular-nums', r.position <= 3 ? 'text-butter-deep' : 'text-ink-soft')}>{r.position <= 3 ? <Crown className="mx-auto size-5" /> : r.position}</span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper-2 font-display font-black">{r.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.name}{r.is_me && ' (sen)'}</span>
                  <span className="block text-xs text-ink-soft">{r.rank}</span>
                </span>
                <span className="flex items-center gap-1 font-display font-black tabular-nums"><Trophy className="size-4 text-butter-deep" /> {r.trophies}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {duel && (
          <Arena
            duel={duel}
            onExit={() => {
              stopSpeaking()
              setDuel(null)
              qc.invalidateQueries({ queryKey: ['duel'] })
              qc.invalidateQueries({ queryKey: ['skills'] })
              qc.invalidateQueries({ queryKey: ['dashboard'] })
              refresh()
            }}
            onRematch={() => {
              setDuel(null)
              qc.invalidateQueries({ queryKey: ['duel'] })
              start.mutate()
            }}
            onPremium={() => nav('/premium')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================================================================== Arena */

function Arena({ duel, onExit, onRematch }: { duel: DuelData; onExit: () => void; onRematch: () => void; onPremium: () => void }) {
  const { user } = useAuth()
  const reduced = useReducedMotion()
  const flat = useMemo(() => duel.rounds.flatMap((r) => r.items.map((it) => ({ ...it, skill: r.skill, label: r.label }))), [duel])
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [count, setCount] = useState(3)
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState<Answer>(null)
  const [checked, setChecked] = useState<boolean | null>(null)
  const [answers, setAnswers] = useState<[Answer, number][]>([])
  const [myScore, setMyScore] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<DuelResult | null>(null)
  const itemStart = useRef(0)
  const matchStart = useRef(0)

  const finish = useMutation({
    mutationFn: (a: [Answer, number][]) => post<DuelResult>(`/duel/${duel.id}/finish`, { answers: a }),
    onSuccess: (r) => {
      setResult(r)
      setPhase('done')
      if (r.result === 'win') {
        celebrate(r.rank_up)
        if (r.rank_up) sfx.levelup()
        else sfx.complete()
      } else sfx.wrong()
    },
  })

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== 'intro') return
    if (count === 0) {
      setPhase('play')
      itemStart.current = performance.now()
      matchStart.current = performance.now()
      return
    }
    const t = setTimeout(() => setCount((c) => c - 1), reduced ? 250 : 900)
    return () => clearTimeout(t)
  }, [phase, count, reduced])

  // Clock drives the per-item timer and the ghost's live replay.
  useEffect(() => {
    if (phase !== 'play') return
    const t = setInterval(() => setElapsed(performance.now() - matchStart.current), 100)
    return () => clearInterval(t)
  }, [phase])

  const item = flat[idx]
  const itemElapsed = phase === 'play' && checked === null ? performance.now() - itemStart.current : 0

  const submit = useCallback(
    (v: Answer, timedOut = false) => {
      if (checked !== null || !item) return
      const ms = Math.round(performance.now() - itemStart.current)
      const ok = !timedOut && isCorrect(item.ex, v)
      setChecked(ok)
      setMyScore((s) => s + points(ok, ms))
      setAnswers((a) => [...a, [v, ms]])
      if (ok) sfx.correct()
      else sfx.wrong()
    },
    [checked, item],
  )

  // Out of time counts as a miss.
  useEffect(() => {
    if (phase === 'play' && checked === null && itemElapsed > ITEM_MS) submit(value, true)
  }, [elapsed, phase, checked, itemElapsed, submit, value])

  const next = () => {
    stopSpeaking()
    if (idx + 1 >= flat.length) {
      finish.mutate(answers)
      return
    }
    setIdx((i) => i + 1)
    setValue(null)
    setChecked(null)
    itemStart.current = performance.now()
  }

  // Ghost replay: it answers each item after its recorded time, in sequence.
  const ghostTimeline = useMemo(() => {
    let t = 0
    return flat.map((it) => {
      t += it.ghost.ms
      return { at: t, pts: points(it.ghost.correct, it.ghost.ms) }
    })
  }, [flat])
  const ghostDone = ghostTimeline.filter((g) => g.at <= elapsed).length
  const ghostScore = ghostTimeline.slice(0, ghostDone).reduce((s, g) => s + g.pts, 0)
  const maxScore = flat.length * 150

  const round = duel.rounds.findIndex((r) => r.skill === item?.skill)
  const S = item ? SKILL[item.skill] : SKILL.reading

  return (
    <motion.div className="fixed inset-0 z-[60] flex flex-col bg-paper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* ------------------------------------------------------ Scoreboard */}
      <header className="safe-top border-b-2 border-line bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={onExit} aria-label="Düellodan çık" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></button>
          <div className="grid flex-1 gap-1.5">
            <Racer name={user?.name.split(' ')[0] ?? 'Sen'} score={myScore} max={maxScore} tone="bg-flame" />
            <Racer name={`${duel.ghost.name.split(' ')[0]} · gölge`} score={ghostScore} max={maxScore} tone="bg-ink/40" ghost />
          </div>
        </div>
        {phase === 'play' && item && (
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pb-3">
            {duel.rounds.map((r, i) => (
              <span key={r.skill} className={clsx('flex h-7 flex-1 items-center justify-center gap-1 rounded-lg text-[11px] font-black uppercase tracking-wide', i === round ? `${SKILL[r.skill].bg} text-white` : i < round ? 'bg-paper-2 text-ink' : 'bg-paper-2 text-ink-soft')}>
                {i < round && <Check className="size-3" />} <span className="hidden sm:inline">{r.label}</span><span className="sm:hidden">{i + 1}</span>
              </span>
            ))}
            <span className={clsx('flex w-16 items-center justify-end gap-1 font-mono text-sm font-bold tabular-nums', ITEM_MS - itemElapsed < 5000 ? 'text-berry' : 'text-ink-soft')}>
              <Timer className="size-4" />{Math.max(0, Math.ceil((ITEM_MS - itemElapsed) / 1000))}
            </span>
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" exit={{ opacity: 0 }} className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10">
              <div className="flex w-full items-center justify-center gap-4 sm:gap-10">
                <Fighter name={user?.name ?? 'Sen'} sub={`${user?.stats.duel_trophies ?? 0} kupa`} />
                <motion.span initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} className="grid size-16 place-items-center rounded-full bg-butter font-display text-xl font-black text-[#1f2433] shadow-hard">VS</motion.span>
                <Fighter name={duel.ghost.name} sub={`${duel.ghost.rank.name} · ${duel.ghost.trophies} kupa`} ghost training={duel.ghost.training} />
              </div>
              <div className="grid w-full max-w-md grid-cols-4 gap-2">
                {duel.rounds.map((r, i) => (
                  <motion.div key={r.skill} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className={clsx('rounded-2xl p-3 text-center', SKILL[r.skill].soft)}>
                    {(() => { const I = SKILL[r.skill].icon; return <I className={clsx('mx-auto size-5', SKILL[r.skill].text)} /> })()}
                    <p className="mt-1 text-xs font-black">{r.label}</p>
                  </motion.div>
                ))}
              </div>
              <motion.p key={count} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-7xl font-black tabular-nums text-flame">{count || 'Başla!'}</motion.p>
              {duel.ghost.training && <p className="max-w-sm text-center text-sm text-ink-soft">Henüz uygun rakip yok; seviyene göre ayarlanmış bir antrenman gölgesiyle eşleştin.</p>}
            </motion.div>
          )}

          {phase === 'play' && item && (
            <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
              <p className={clsx('mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider', S.soft, S.text)}>
                <S.icon className="size-3.5" /> Tur {round + 1} · {item.label}
              </p>
              <ExerciseView ex={item.ex} value={value} setValue={setValue} locked={checked !== null} ttsRate={user?.preferences?.tts_rate} />
            </motion.div>
          )}

          {phase === 'done' && result && <ResultView key="done" duel={duel} result={result} onExit={onExit} onRematch={onRematch} />}
        </AnimatePresence>
      </main>

      {phase === 'play' && item && (
        <footer className={clsx('safe-bottom border-t-2 transition-colors', checked === null ? 'border-line bg-card' : checked ? 'border-mint/30 bg-mint/12' : 'border-berry/30 bg-berry/10')}>
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              {checked !== null && (
                <>
                  <p className={clsx('font-display text-xl font-black', checked ? 'text-mint-deep' : 'text-berry')}>{checked ? `Doğru! +${points(true, answers[answers.length - 1]?.[1] ?? 0)}` : 'Kaçtı'}</p>
                  {!checked && <p className="truncate text-sm font-bold">Doğrusu: {correctText(item.ex)}</p>}
                </>
              )}
            </div>
            {checked === null ? (
              <Button size="lg" className="sm:w-48" disabled={value === null || value === ''} onClick={() => submit(value)}>Kontrol et</Button>
            ) : (
              <Button size="lg" variant={checked ? 'success' : 'danger'} className="sm:w-48" loading={finish.isPending} onClick={next} autoFocus>{idx + 1 >= flat.length ? 'Sonucu gör' : 'Devam'}</Button>
            )}
          </div>
        </footer>
      )}
    </motion.div>
  )
}

function Racer({ name, score, max, tone, ghost }: { name: string; score: number; max: number; tone: string; ghost?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-24 truncate text-xs font-extrabold sm:w-32', ghost && 'text-ink-soft')}>{ghost && <Ghost className="mr-1 inline size-3.5" />}{name}</span>
      <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-paper-2">
        <motion.span className={clsx('absolute inset-y-0 left-0 rounded-full', tone, ghost && '[background-image:repeating-linear-gradient(135deg,transparent_0_4px,rgba(255,255,255,.35)_4px_8px)]')} animate={{ width: `${(score / max) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </span>
      <span className="w-10 text-right font-mono text-xs font-bold tabular-nums">{score}</span>
    </div>
  )
}

function Fighter({ name, sub, ghost, training }: { name: string; sub: string; ghost?: boolean; training?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, x: ghost ? 40 : -40 }} animate={{ opacity: 1, x: 0 }} className="flex w-32 flex-col items-center text-center sm:w-44">
      <span className={clsx('grid size-20 place-items-center rounded-full font-display text-3xl font-black sm:size-24', ghost ? 'bg-ink/10 text-ink/60 ring-4 ring-dashed ring-ink/15' : 'bg-flame text-white ring-4 ring-flame/25')}>
        {ghost ? <Ghost className="size-10" /> : name[0]}
      </span>
      <p className="mt-3 w-full truncate font-display text-lg font-black">{name}</p>
      <p className="text-xs font-bold text-ink-soft">{training ? 'Antrenman gölgesi' : sub}</p>
    </motion.div>
  )
}

function ResultView({ duel, result, onExit, onRematch }: { duel: DuelData; result: DuelResult; onExit: () => void; onRematch: () => void }) {
  const win = result.result === 'win'
  const draw = result.result === 'draw'
  let k = 0
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="text-center">
        <motion.div initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          <Img src={win ? rewardImg('trophy') : rewardImg('star')} alt="" className={clsx('mx-auto size-28 object-contain drop-shadow-xl', !win && !draw && 'opacity-60 grayscale')} />
        </motion.div>
        <p className={clsx('mt-2 text-sm font-black uppercase tracking-[0.2em]', win ? 'text-mint-deep' : draw ? 'text-ink-soft' : 'text-berry')}>{win ? 'Galibiyet' : draw ? 'Berabere' : 'Mağlubiyet'}</p>
        <h2 className="mt-1 text-4xl tabular-nums sm:text-5xl">{result.score} <span className="text-ink-soft">–</span> {result.ghost_score}</h2>
        <p className={clsx('mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-lg font-black tabular-nums', result.trophies_delta >= 0 ? 'bg-mint/12 text-mint-deep' : 'bg-berry/10 text-berry')}>
          <Trophy className="size-5" /> {result.trophies_delta >= 0 ? `+${result.trophies_delta}` : result.trophies_delta} kupa
        </p>
        {result.rank_up && <p className="mt-3 font-display text-xl font-black text-butter-deep">Yeni rütbe: {result.rank.name}!</p>}
        {!win && result.next_rank && <p className="mt-2 text-sm text-ink-soft">Rövanşla kupalarını geri al — {result.next_rank.name} rütbesi seni bekliyor.</p>}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border-2 border-line bg-card">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b-2 border-line px-4 py-2 text-xs font-black uppercase tracking-wider text-ink-soft">
          <span>Tur</span><span>Sen</span><span>Gölge</span>
        </div>
        {duel.rounds.map((r) => {
          const S = SKILL[r.skill]
          const mine = r.items.map(() => result.results[k++])
          const ghost = r.items.map((_, j) => result.ghost_results[k - r.items.length + j])
          return (
            <div key={r.skill} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b-2 border-line px-4 py-3 last:border-b-0">
              <span className="flex items-center gap-2 font-extrabold"><span className={clsx('grid size-7 place-items-center rounded-lg text-white', S.bg)}><S.icon className="size-4" /></span>{r.label}</span>
              <Dots v={mine} />
              <Dots v={ghost} />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-bold">
        {!!result.reward?.xp_gained && <span className="ink-chip">+{result.reward.xp_gained} XP</span>}
        {result.gems > 0 && <span className="ink-chip"><Img src={rewardImg('gem')} alt="" className="size-4" /> +{result.gems}</span>}
        {result.win_streak > 1 && <span className="ink-chip text-flame"><Flame className="size-4" /> {result.win_streak} galibiyet serisi</span>}
        {result.chest && <span className="ink-chip text-butter-deep"><Img src={rewardImg('chest')} alt="" className="size-4" /> Gizemli sandık kasanda!</span>}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button size="lg" variant="butter" onClick={onRematch} icon={<Swords className="size-5" />}>Yeni düello</Button>
        <Button size="lg" variant="secondary" onClick={onExit}>Lobiye dön</Button>
      </div>
    </motion.div>
  )
}

function Dots({ v }: { v: boolean[] }) {
  return (
    <span className="flex gap-1">
      {v.map((ok, i) => (
        <span key={i} className={clsx('grid size-6 place-items-center rounded-md text-white', ok ? 'bg-mint' : 'bg-berry/80')}>{ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}</span>
      ))}
    </span>
  )
}
