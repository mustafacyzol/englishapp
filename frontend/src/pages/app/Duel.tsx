import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { Check, Crown, Flame, Ghost, Shield, ShieldAlert, Swords, X } from 'lucide-react'
import { ApiError, del, get, post } from '@/lib/api'
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
import { UserAvatar } from '@/components/game/UserAvatar'

interface Rank { key: string; name: string; min: number; tier: number }
interface Overview {
  me: { trophies: number; best: number; rank: Rank; next_rank: Rank | null; wins: number; losses: number; draws: number; win_streak: number; tickets_left: number | null; tickets_total: number | null; position: number }
  skills: { key: SkillKey; label: string; correct: number; total: number }[]
  recent: { id: number; ghost_name: string; result: 'win' | 'loss' | 'draw'; score: number; ghost_score: number; delta: number; at: string }[]
  defenses: { id: number; challenger: string; held: boolean; delta: number; at: string }[]
  leaderboard: { position: number; name: string; username: string; trophies: number; wins: number; avatar?: string; avatar_url?: string | null; frame?: string | null; rank: string; is_me: boolean }[]
  ranks: Rank[]
  league?: { tier: number; name: string }
}
interface Lobby {
  online: number
  searching: number
  playing: number
  queue_seconds: number
  players: { name: string; username: string; trophies: number; rank: string; status: 'idle' | 'searching' | 'matched' | 'playing'; avatar?: string; avatar_url?: string | null; frame?: string | null }[]
}
interface Rival { i: number; score: number; finished: boolean; connected: boolean }
interface Rules { item_ms: number; combo_step: number; combo_max: number; base: number; speed_max: number; speed_ms_per_point: number }
interface DuelData {
  id: number
  rules?: Rules
  ghost: { name: string; trophies: number; rank: Rank; league?: { tier: number; name: string }; look?: { avatar: string; avatar_url?: string | null; frame?: string | null } | null; same_group?: boolean; skills: Record<SkillKey, number>; training: boolean; live?: boolean }
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

const RULES: Rules = { item_ms: 12000, combo_step: 0.25, combo_max: 2, base: 100, speed_max: 60, speed_ms_per_point: 200 }
/** Same scoring as DuelService on the server: base + speed, multiplied by the running combo. */
const points = (ok: boolean, ms: number, r: Rules = RULES) => (ok ? r.base + Math.max(0, r.speed_max - Math.floor(ms / r.speed_ms_per_point)) : 0)
const multiplier = (combo: number, r: Rules = RULES) => (combo > 0 ? Math.min(r.combo_max, 1 + r.combo_step * (combo - 1)) : 0)
/** Answer types that lock in on the first tap, so the blitz keeps its pace. */
const INSTANT = new Set(['choice', 'fill', 'listen_choice', 'dialogue'])

export default function Duel() {
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { user, refresh } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['duel'], queryFn: () => get<Overview>('/duel') })
  // the heartbeat: being on this page counts as being in the arena
  const lobby = useQuery({ queryKey: ['arena-lobby'], queryFn: () => get<Lobby>('/arena/lobby'), refetchInterval: 15_000 })
  const [duel, setDuel] = useState<DuelData | null>(null)
  const [searching, setSearching] = useState(false)
  const start = useMutation({
    mutationFn: () => post<{ duel: DuelData }>('/duel'),
    onSuccess: (r) => setDuel(r.duel),
    onError: (e: ApiError) => (e.status === 402 ? toast(e.message, 'error') : toast(e.message, 'error')),
  })
  useEffect(() => preloadSfx('tap', 'correct', 'combo', 'wrong', 'complete', 'levelup', 'reward', 'tick', 'count', 'go', 'beat', 'lose'), [])

  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const me = data.me
  const league = data.league ?? { tier: me.rank.tier, name: me.rank.name }
  const noTickets = me.tickets_left === 0

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------------------ Lobby */}
      <section className="arcade relative overflow-hidden rounded-[28px] bg-[#0a0d1a] text-white">
        <div aria-hidden className="arcade-floor pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />
        <div aria-hidden className="arcade-scan pointer-events-none absolute inset-0" />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <LiveDot lobby={lobby.data} />
            <h1 className="arcade-title mt-3 font-display text-[clamp(3rem,9vw,5.5rem)] font-black italic leading-[0.9] tracking-tight">ARENA</h1>
            <p className="mt-2 font-display text-sm font-black uppercase tracking-[0.3em] text-butter">Gölge Düellosu · Blitz</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider">
              {['4 tur', '12 soru', '12 sn', 'Combo x2'].map((t) => <span key={t} className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-white/80">{t}</span>)}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <motion.button
                onClick={() => setSearching(true)}
                disabled={noTickets || searching || start.isPending}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97, y: 4 }}
                className="arcade-btn relative flex h-16 items-center gap-3 rounded-2xl px-8 font-display text-xl font-black uppercase tracking-wider text-[#1a1203] disabled:opacity-40"
              >
                <Swords className="size-7" /> Rakip bul
              </motion.button>
              <div>
                <div className="flex gap-1" aria-label="Bugünkü düello hakların">
                  {me.tickets_left === null ? <span className="text-sm font-black text-butter">∞ SINIRSIZ</span> : Array.from({ length: me.tickets_total ?? 5 }, (_, i) => <span key={i} className={clsx('grid size-6 place-items-center rounded-full border-2 text-[10px] font-black', i < (me.tickets_left ?? 0) ? 'border-butter bg-butter/20 text-butter shadow-[0_0_10px_rgba(255,194,51,.5)]' : 'border-white/15 text-white/20')}>★</span>)}
                </div>
                <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-white/45">{me.tickets_left === null ? 'Premium' : 'Bugünkü hak'}</p>
              </div>
            </div>
            {noTickets && <p className="mt-3 text-sm text-white/60">Hakların yarın yenilenir. <Link to="/premium" className="font-bold text-butter underline">Premium</Link> ile sınırsız oyna.</p>}
          </div>

          {/* player card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <UserAvatar name={user?.name ?? ''} avatar={user?.avatar} frame={user?.frame} className="size-16" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-black">{user?.name.split(' ')[0]}</p>
                <p className="text-sm font-bold text-white/60">{me.rank.name} · {league.name} Ligi</p>
              </div>
              <Img src={leagueImg(league.tier)} alt="" className="size-14 object-contain drop-shadow-[0_0_14px_rgba(255,194,51,.35)]" />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] font-black uppercase tracking-wider text-white/50"><span>{me.trophies} kupa</span><span>{me.next_rank ? `${me.next_rank.name}: ${me.next_rank.min}` : 'Zirve'}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-flame to-butter" style={{ width: `${me.next_rank ? Math.min(100, ((me.trophies - me.rank.min) / Math.max(1, me.next_rank.min - me.rank.min)) * 100) : 100}%` }} /></div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {([['G', me.wins, 'text-mint'], ['M', me.losses, 'text-berry'], ['Seri', me.win_streak, 'text-butter'], ['Sıra', `#${me.position}`, 'text-sky']] as const).map(([l, v, c]) => (
                <div key={l} className="rounded-xl bg-black/30 py-2">
                  <p className={clsx('font-mono text-xl font-black tabular-nums', c)}>{v}</p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/45">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* who is in the arena right now */}
        {!!lobby.data?.players.length && (
          <div className="relative border-t border-white/10 px-6 py-4 sm:px-9">
            <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Şu an arenada</p>
            <div className="no-scrollbar flex gap-4 overflow-x-auto">
              {lobby.data.players.map((p) => (
                <Link key={p.username} to={`/u/${p.username}`} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                  <span className="relative">
                    <UserAvatar name={p.name} avatar={p.avatar} avatarUrl={p.avatar_url} frame={p.frame} className="size-12" />
                    <span className={clsx('absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[#0a0d1a]', p.status === 'searching' ? 'animate-pulse bg-butter' : p.status === 'idle' ? 'bg-mint' : 'bg-berry')} />
                  </span>
                  <span className="w-full truncate text-[11px] font-bold text-white/70">{p.name.split(' ')[0]}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {searching && (
          <Matchmaking
            lobby={lobby.data}
            onMatched={(d) => { setSearching(false); setDuel(d) }}
            onGhost={() => { setSearching(false); start.mutate() }}
            onCancel={() => setSearching(false)}
          />
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------ Ghost report */}
      {data.defenses.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl">Sen yokken gölgen</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {data.defenses.map((d) => (
              <div key={d.id} className={clsx('flex min-w-[260px] items-center gap-3 rounded-2xl border-2 p-4', d.held ? 'border-mint/40 bg-mint/8' : 'border-berry/30 bg-berry/6')}>
                <span className={clsx('grid size-11 shrink-0 place-items-center rounded-xl text-white', d.held ? 'bg-mint' : 'bg-berry')}>{d.held ? <Shield className="size-6" /> : <ShieldAlert className="size-6" />}</span>
                <div className="min-w-0">
                  <p className="font-black leading-tight">{d.held ? 'Gölgen seni savundu' : 'Gölgen yenildi'}</p>
                  <p className="truncate text-sm text-ink-soft">{d.challenger} meydan okudu</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
        <div className="space-y-8">
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
                    <p className="mt-3 font-display text-3xl font-black tabular-nums">{pct === null ? '-' : `%${pct}`}</p>
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
                      <span className="block text-xs tabular-nums text-ink-soft">{r.score}, {r.ghost_score}</span>
                    </span>
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-black', r.result === 'win' ? 'bg-mint/15 text-mint-deep' : r.result === 'loss' ? 'bg-berry/10 text-berry' : 'bg-paper-2 text-ink-soft')}>{r.result === 'win' ? 'Kazandın' : r.result === 'loss' ? 'Kaybettin' : 'Berabere'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------------- Board */}
        <section>
          <h2 className="mb-1 text-xl">Lig grubunda bu hafta</h2>
          <p className="mb-3 text-sm text-ink-soft">{league.name} Ligi grubundaki herkes, bu haftaki düello galibiyetine göre.</p>
          <div className="overflow-hidden rounded-2xl border-2 border-line bg-card">
            {data.leaderboard.length === 0 && <p className="p-6 text-center text-ink-soft">Grubun doluyor. İlk düelloyu sen başlat!</p>}
            {data.leaderboard.map((r) => (
              <Link to={`/u/${r.username}`} key={r.username} className={clsx('flex items-center gap-3 border-b-2 border-line px-4 py-2.5 last:border-b-0 hover:bg-paper-2', r.is_me && 'bg-butter/12')}>
                <span className={clsx('w-7 text-center font-display font-black tabular-nums', r.position <= 3 ? 'text-butter-deep' : 'text-ink-soft')}>{r.position <= 3 ? <Crown className="mx-auto size-5" /> : r.position}</span>
                <UserAvatar name={r.name} avatar={r.avatar} avatarUrl={r.avatar_url} frame={r.frame} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.is_me ? 'Sen' : r.name}</span>
                </span>
                <span className="flex items-center gap-1 font-display font-black tabular-nums"><Swords className="size-4 text-flame" /> {r.wins}</span>
              </Link>
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
              setSearching(true)
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
  const R = duel.rules ?? RULES
  const flat = useMemo(() => duel.rounds.flatMap((r) => r.items.map((it) => ({ ...it, skill: r.skill, label: r.label }))), [duel])
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [count, setCount] = useState(3)
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState<Answer>(null)
  const [checked, setChecked] = useState<boolean | null>(null)
  const [answers, setAnswers] = useState<[Answer, number][]>([])
  const [myScore, setMyScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [pop, setPop] = useState<{ id: number; pts: number; mult: number } | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const [result, setResult] = useState<DuelResult | null>(null)
  // live match: the rival's real progress, polled every 2 s and returned with each of our answers
  const live = !!duel.ghost.live
  const [rival, setRival] = useState<Rival | null>(null)
  const itemStart = useRef(0)
  const matchStart = useRef(0)
  const lastBeat = useRef(0)

  const finish = useMutation({
    mutationFn: (a: [Answer, number][]) => post<DuelResult>(`/duel/${duel.id}/finish`, { answers: a }),
    onSuccess: (r) => {
      setResult(r)
      setPhase('done')
      if (r.result === 'win') {
        celebrate(true)
        r.rank_up ? sfx.levelup() : sfx.complete()
      } else if (r.result === 'loss') sfx.lose()
      else sfx.notify()
    },
  })

  // 3-2-1-GO
  useEffect(() => {
    if (phase !== 'intro') return
    if (count === 0) {
      sfx.go()
      setPhase('play')
      itemStart.current = performance.now()
      matchStart.current = performance.now()
      setBanner(flat[0]?.label ?? null)
      return
    }
    sfx.count()
    const t = setTimeout(() => setCount((c) => c - 1), reduced ? 250 : 850)
    return () => clearTimeout(t)
  }, [phase, count, reduced, flat])

  // One clock for the item timer, the ghost replay and the heartbeat.
  useEffect(() => {
    if (phase !== 'play') return
    // 10 fps is plenty for the clock and keeps the exercise from re-rendering every frame.
    setNow(performance.now())
    const t = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 900)
    return () => clearTimeout(t)
  }, [banner])

  const item = flat[idx]
  const itemMs = phase === 'play' && checked === null ? Math.max(0, now - itemStart.current) : 0
  const leftMs = Math.max(0, R.item_ms - itemMs)
  const danger = checked === null && phase === 'play' && leftMs < 3500

  const submit = useCallback(
    (v: Answer, timedOut = false) => {
      if (checked !== null || !item) return
      const ms = Math.round(performance.now() - itemStart.current)
      const ok = !timedOut && isCorrect(item.ex, v)
      const c = ok ? combo + 1 : 0
      const mult = multiplier(c, R)
      const pts = Math.round(points(ok, ms, R) * mult)
      setChecked(ok)
      setCombo(c)
      setMyScore((s) => s + pts)
      setAnswers((a) => [...a, [v, ms]])
      if (live) post<{ rival: Rival | null }>(`/duel/${duel.id}/progress`, { i: idx + 1, score: myScore + pts }).then((r) => setRival(r.rival)).catch(() => {})
      if (ok) setPop({ id: Date.now(), pts, mult })
      ok ? sfx.correct(c) : sfx.wrong()
    },
    [checked, item, combo, R, live, duel.id, idx, myScore],
  )
  useEffect(() => {
    if (!live || phase !== 'play') return
    const t = setInterval(() => get<{ rival: Rival | null }>(`/duel/${duel.id}/rival`).then((r) => setRival(r.rival)).catch(() => {}), 2000)
    return () => clearInterval(t)
  }, [live, phase, duel.id])

  // Heartbeat in the last seconds, a miss when the clock runs out.
  useEffect(() => {
    if (phase !== 'play' || checked !== null) return
    if (leftMs <= 0) return submit(value, true)
    if (leftMs < 3500 && now - lastBeat.current > 480) {
      lastBeat.current = now
      sfx.beat()
    }
  }, [now, phase, checked, leftMs, submit, value])

  // Instant answer types lock in on the first tap.
  useEffect(() => {
    if (phase === 'play' && item && checked === null && value !== null && value !== '' && INSTANT.has(item.ex.type)) submit(value)
  }, [value, item, checked, phase, submit])

  const next = useCallback(() => {
    stopSpeaking()
    if (idx + 1 >= flat.length) {
      finish.mutate(answers)
      return
    }
    if (flat[idx + 1].skill !== flat[idx].skill) setBanner(flat[idx + 1].label)
    setIdx((i) => i + 1)
    setValue(null)
    setChecked(null)
    itemStart.current = performance.now()
  }, [idx, flat, answers, finish])

  // Keep the pace: move on by itself shortly after each answer. `next` changes every
  // render (the clock ticks 10x a second), so it's read through a ref, or the timer
  // would be reset before it ever fired.
  const nextRef = useRef(next)
  nextRef.current = next
  useEffect(() => {
    if (checked === null || phase !== 'play') return
    const t = setTimeout(() => nextRef.current(), checked ? 750 : 1500)
    return () => clearTimeout(t)
  }, [checked, phase, idx])

  // Ghost replay: answers in sequence after its recorded times, with its own combo.
  const ghostTimeline = useMemo(() => {
    let t = 0
    let c = 0
    return flat.map((it) => {
      const ms = Math.min(it.ghost.ms, R.item_ms)
      t += ms + 750
      c = it.ghost.correct ? c + 1 : 0
      return { at: t, ok: it.ghost.correct, pts: Math.round(points(it.ghost.correct, ms, R) * multiplier(c, R)), combo: c }
    })
  }, [flat, R])
  const elapsed = phase === 'play' ? now - matchStart.current : 0
  const replayDone = ghostTimeline.filter((g) => g.at <= elapsed).length
  // A connected live rival shows their real score; if they drop, their ghost carries on.
  const rivalLive = live && !!rival?.connected
  const ghostDone = rivalLive ? rival!.i : replayDone
  const ghostScore = rivalLive ? rival!.score : ghostTimeline.slice(0, replayDone).reduce((s, g) => s + g.pts, 0)
  const lastGhost = !rivalLive && replayDone ? ghostTimeline[replayDone - 1] : null
  const ghostFresh = lastGhost && elapsed - lastGhost.at < 1100

  const round = duel.rounds.findIndex((r) => r.skill === item?.skill)
  const share = myScore + ghostScore ? myScore / (myScore + ghostScore) : 0.5
  const mult = multiplier(combo, R)
  const first = user?.name.split(' ')[0] ?? 'Sen'

  return (
    <motion.div className="arena-dark fixed inset-0 z-[60] flex flex-col overflow-hidden bg-paper text-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* moving arena light */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(60rem_30rem_at_20%_-10%,rgba(232,64,58,.22),transparent_60%),radial-gradient(50rem_30rem_at_110%_110%,rgba(47,124,246,.2),transparent_60%)]" />
      <AnimatePresence>{danger && <motion.div key="vignette" aria-hidden className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_120px_20px_rgba(239,78,123,.45)]" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }} exit={{ opacity: 0 }} transition={{ repeat: Infinity, duration: 0.5 }} />}</AnimatePresence>

      {/* ------------------------------------------------------ Scoreboard */}
      <header className="safe-top relative z-20 border-b-2 border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-2 pt-3">
          <button onClick={onExit} aria-label="Düellodan çık" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-paper-2"><X className="size-6" /></button>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-widest text-flame">{first}</p>
              <motion.p key={myScore} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="font-display text-3xl font-black leading-none tabular-nums">{myScore}</motion.p>
            </div>
            <AnimatePresence>
              {combo >= 2 && (
                <motion.span key={combo} initial={{ scale: 1.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} className="flex items-center gap-1 rounded-full bg-gradient-to-r from-flame to-butter px-3 py-1 font-display text-lg font-black text-white shadow-[0_0_24px_rgba(255,120,60,.55)]">
                  <Flame className="size-5" /> x{mult.toFixed(2).replace(/\.?0+$/, '')}
                </motion.span>
              )}
            </AnimatePresence>
            <div className="min-w-0 text-right">
              <p className="truncate text-xs font-black uppercase tracking-widest text-sky">{live ? <span className={clsx('mr-1.5 inline-flex items-center gap-1 rounded px-1 py-px text-[9px] text-white', rivalLive ? 'bg-berry' : 'bg-ink-soft')}><span className="size-1.5 animate-pulse rounded-full bg-white" />{rivalLive ? 'CANLI' : 'GÖLGE'}</span> : <Ghost className="mr-1 inline size-3.5" />}{duel.ghost.name.split(' ')[0]}</p>
              <motion.p key={ghostScore} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="font-display text-3xl font-black leading-none tabular-nums text-ink/85">{ghostScore}</motion.p>
            </div>
          </div>
        </div>
        {/* tug of war */}
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="relative h-3.5 overflow-hidden rounded-full bg-sky/70">
            <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-flame to-[#ff7a4d]" animate={{ width: `${share * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} />
            <motion.span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-butter shadow" animate={{ left: `${share * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} />
          </div>
          <div className="mt-1.5 flex h-4 items-center justify-between text-[11px] font-black">
            <span className="text-ink-soft">{phase === 'play' && item ? `Tur ${round + 1}/4 · Soru ${idx + 1}/${flat.length}` : ''}</span>
            <AnimatePresence mode="wait">
              {phase === 'play' && (rivalLive ? (
                <motion.span key={`r${ghostDone}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-sky">{rival!.finished ? 'Rakip bitirdi!' : `Rakip ${ghostDone}/${flat.length}. soruda`}</motion.span>
              ) : ghostFresh ? (
                <motion.span key={`g${ghostDone}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={lastGhost!.ok ? 'text-sky' : 'text-ink-soft'}>
                  {lastGhost!.ok ? `Gölge bildi +${lastGhost!.pts}${lastGhost!.combo >= 2 ? ` · seri x${lastGhost!.combo}` : ''}` : 'Gölge kaçırdı!'}
                </motion.span>
              ) : (
                <motion.span key="thinking" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-ink-soft">Gölge düşünüyor…</motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="relative z-0 min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" exit={{ opacity: 0, scale: 1.1 }} className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10">
              <div className="flex w-full items-center justify-center gap-4 sm:gap-10">
                <Fighter name={user?.name ?? 'Sen'} sub={`${user?.stats.league_name ?? ''} Ligi`} look={user ? { avatar: user.avatar ?? '', frame: user.frame } : undefined} />
                <motion.span initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: [1, 1.12, 1], rotate: 0 }} transition={{ scale: { repeat: Infinity, duration: 0.85 } }} className="grid size-16 place-items-center rounded-full bg-butter font-display text-xl font-black text-[#1f2433] shadow-[0_0_30px_rgba(255,194,51,.5)]">VS</motion.span>
                <Fighter name={duel.ghost.name} sub={duel.ghost.training ? 'Antrenman' : `${duel.ghost.league?.name ?? ''} Ligi${duel.ghost.same_group ? ' · grubundan' : ''}`} look={duel.ghost.look ?? undefined} ghost training={duel.ghost.training} />
              </div>
              <div className="grid w-full max-w-md grid-cols-4 gap-2">
                {duel.rounds.map((r, i) => (
                  <motion.div key={r.skill} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className={clsx('rounded-2xl p-3 text-center', SKILL[r.skill].soft)}>
                    {(() => { const I = SKILL[r.skill].icon; return <I className={clsx('mx-auto size-5', SKILL[r.skill].text)} /> })()}
                    <p className="mt-1 text-xs font-black">{r.label}</p>
                  </motion.div>
                ))}
              </div>
              <motion.p key={count} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-8xl font-black tabular-nums text-flame drop-shadow-[0_0_30px_rgba(232,64,58,.6)]">{count || 'GO!'}</motion.p>
              <p className="max-w-sm text-center text-sm font-bold text-ink-soft">Her soru {Math.round(R.item_ms / 1000)} saniye. Hızlı cevap = bonus, seri = çarpan (x{R.combo_max}'ye kadar).</p>
              {duel.ghost.training && <p className="max-w-sm text-center text-sm text-ink-soft">Henüz uygun rakip yok; seviyene göre ayarlanmış bir antrenman gölgesiyle eşleştin.</p>}
            </motion.div>
          )}

          {phase === 'play' && item && (
            <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.18 }} className="relative mx-auto max-w-3xl px-4 py-6 sm:py-8">
              <div className="absolute right-4 top-5 z-10 sm:top-7"><ClockRing left={leftMs} total={R.item_ms} /></div>
              <ExerciseView ex={item.ex} value={value} setValue={setValue} locked={checked !== null} ttsRate={user?.preferences?.tts_rate} />
              <AnimatePresence>
                {pop && checked && (
                  <motion.p key={pop.id} initial={{ y: 0, opacity: 0, scale: 0.6 }} animate={{ y: -60, opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="pointer-events-none absolute right-6 top-16 font-display text-4xl font-black text-mint drop-shadow-[0_0_18px_rgba(34,181,115,.6)]">
                    +{pop.pts}{pop.mult > 1 && <span className="ml-1 text-2xl text-butter">x{pop.mult.toFixed(2).replace(/\.?0+$/, '')}</span>}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {phase === 'done' && result && <ResultView key="done" duel={duel} result={result} onExit={onExit} onRematch={onRematch} />}
        </AnimatePresence>

        {/* round banner */}
        <AnimatePresence>
          {banner && phase === 'play' && (
            <motion.div key={banner} className="pointer-events-none absolute inset-0 z-30 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.p initial={{ x: -300, skewX: -12 }} animate={{ x: 0, skewX: -12 }} exit={{ x: 300 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="rounded-2xl bg-flame px-8 py-4 font-display text-4xl font-black uppercase tracking-wide text-white shadow-[0_0_60px_rgba(232,64,58,.55)]">
                {banner}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {phase === 'play' && item && (
        <footer className={clsx('safe-bottom relative z-20 border-t-2 transition-colors', checked === null ? 'border-line bg-card/80 backdrop-blur' : checked ? 'border-mint/30 bg-mint/15' : 'border-berry/30 bg-berry/15')}>
          <div className="mx-auto flex min-h-[76px] max-w-3xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              {checked !== null ? (
                <>
                  <p className={clsx('font-display text-xl font-black', checked ? 'text-mint' : 'text-berry')}>{checked ? (combo >= 3 ? `Seri x${combo}! Durdurulamazsın` : 'Doğru!') : leftMs <= 0 ? 'Süre bitti' : 'Kaçtı'}</p>
                  {!checked && <p className="truncate text-sm font-bold">Doğrusu: {correctText(item.ex)}</p>}
                </>
              ) : (
                <p className="text-sm font-bold text-ink-soft">{INSTANT.has(item.ex.type) ? 'Dokunduğun an kilitlenir, hızlı ol!' : 'Yaz ve gönder'}</p>
              )}
            </div>
            {checked === null && !INSTANT.has(item.ex.type) && (
              <Button size="lg" className="sm:w-44" disabled={value === null || value === ''} onClick={() => submit(value)}>Gönder</Button>
            )}
            {checked !== null && idx + 1 >= flat.length && finish.isPending && <Button size="lg" loading className="sm:w-44">Sonuç</Button>}
          </div>
        </footer>
      )}
    </motion.div>
  )
}

/** The per-question clock: a ring that drains and turns red in the last seconds. */
function ClockRing({ left, total }: { left: number; total: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const frac = left / total
  const hot = left < 3500
  return (
    <span className="relative grid size-14 place-items-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={hot ? 'var(--color-berry)' : 'var(--color-butter)'} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset .1s linear' }} />
      </svg>
      <motion.span animate={hot ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={{ repeat: hot ? Infinity : 0, duration: 0.5 }} className={clsx('font-display text-lg font-black tabular-nums', hot ? 'text-berry' : 'text-ink')}>{Math.ceil(left / 1000)}</motion.span>
    </span>
  )
}

function Fighter({ name, sub, ghost, training, look }: { name: string; sub: string; ghost?: boolean; training?: boolean; look?: { avatar: string; avatar_url?: string | null; frame?: string | null } }) {
  return (
    <motion.div initial={{ opacity: 0, x: ghost ? 40 : -40 }} animate={{ opacity: 1, x: 0 }} className="flex w-32 flex-col items-center text-center sm:w-44">
      {look && !training ? (
        <span className={clsx('relative', ghost && 'opacity-80 grayscale-[.35]')}>
          <UserAvatar name={name} avatar={look.avatar} avatarUrl={look.avatar_url} frame={look.frame} className="size-20 sm:size-24" />
          {ghost && <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-ink text-paper"><Ghost className="size-4" /></span>}
        </span>
      ) : (
        <span className="grid size-20 place-items-center rounded-full bg-ink/10 text-ink/60 ring-4 ring-dashed ring-ink/15 sm:size-24"><Ghost className="size-10" /></span>
      )}
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
        <h2 className="mt-1 text-4xl tabular-nums sm:text-5xl">{result.score} <span className="text-ink-soft">-</span> {result.ghost_score}</h2>
        {!!result.reward?.xp_gained && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-butter/25 px-3 py-1 font-display text-lg font-black tabular-nums">+{result.reward.xp_gained} XP · lig tablona eklendi</p>
        )}
        {!win && <p className="mt-2 text-sm text-ink-soft">Rövanşla puanları geri al; rakiplerin yine liginden.</p>}
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

/* ============================================================ Live lobby */

function LiveDot({ lobby }: { lobby?: Lobby }) {
  if (!lobby) return <p className="h-5" />
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-black uppercase tracking-[0.14em] text-white/60">
      <span className="flex items-center gap-1.5 text-mint"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-mint" /></span>{lobby.online} çevrimiçi</span>
      {lobby.searching > 0 && <span className="text-butter">{lobby.searching} rakip arıyor</span>}
      {lobby.playing > 0 && <span>{lobby.playing} maçta</span>}
    </p>
  )
}

/**
 * Looking for a rival: a radar sweeps, faces from the lobby flicker past, and the
 * queue is polled every 1.5 s. A real rival starts a live match; after the
 * queue time the rival's ghost (or a training ghost) steps in, so nobody waits.
 */
function Matchmaking({ lobby, onMatched, onGhost, onCancel }: { lobby?: Lobby; onMatched: (d: DuelData) => void; onGhost: () => void; onCancel: () => void }) {
  const toast = useToast()
  const limit = lobby?.queue_seconds ?? 15
  const [t, setT] = useState(0)
  const [found, setFound] = useState<DuelData | null>(null)
  const [face, setFace] = useState(0)
  const done = useRef(false)
  const faces = lobby?.players.length ? lobby.players : []

  useEffect(() => {
    let live = true
    const handle = (r: { status: string; duel?: DuelData }) => {
      if (!live || done.current) return
      if (r.status === 'matched' && r.duel) {
        done.current = true
        sfx.levelup()
        setFound(r.duel)
        setTimeout(() => live && onMatched(r.duel!), 1600)
      } else if (r.status === 'timeout') {
        done.current = true
        del('/arena/queue').catch(() => {})
        onGhost()
      }
    }
    post<{ status: string; duel?: DuelData }>('/arena/queue').then(handle).catch((e: ApiError) => { toast(e.message, 'error'); onCancel() })
    const poll = setInterval(() => get<{ status: string; duel?: DuelData }>('/arena/queue').then(handle).catch(() => {}), 1500)
    const clock = setInterval(() => setT((x) => x + 1), 1000)
    const flick = setInterval(() => setFace((f) => f + 1), 180)
    return () => { live = false; clearInterval(poll); clearInterval(clock); clearInterval(flick) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = () => {
    done.current = true
    del('/arena/queue').catch(() => {})
    onCancel()
  }
  const f = faces.length ? faces[face % faces.length] : null
  return (
    <motion.div className="arcade fixed inset-0 z-[65] grid place-items-center bg-[#070912]/95 px-5 text-white backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Rakip aranıyor">
      <div aria-hidden className="arcade-scan pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col items-center text-center">
        {/* radar */}
        <div className="relative grid size-64 place-items-center sm:size-72">
          {[0, 1, 2].map((k) => <span key={k} className="absolute rounded-full border border-mint/25" style={{ inset: `${k * 16}%` }} />)}
          {!found && <motion.span aria-hidden className="absolute inset-0 rounded-full [background:conic-gradient(from_0deg,rgba(34,181,115,.45),transparent_28%)]" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }} />}
          <AnimatePresence mode="wait">
            {found ? (
              <motion.div key="found" initial={{ scale: 3, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="relative">
                <UserAvatar name={found.ghost.name} avatar={found.ghost.look?.avatar} avatarUrl={found.ghost.look?.avatar_url} frame={found.ghost.look?.frame} className="size-28" />
              </motion.div>
            ) : f ? (
              <UserAvatar key={face} name={f.name} avatar={f.avatar} avatarUrl={f.avatar_url} frame={f.frame} className="size-24 opacity-80 blur-[1px]" />
            ) : (
              <Swords className="size-16 text-mint" />
            )}
          </AnimatePresence>
        </div>
        {found ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <p className="arcade-title mt-6 font-display text-4xl font-black italic">RAKİP BULUNDU!</p>
            <p className="mt-2 text-lg font-bold text-white/80">{found.ghost.name} · {found.ghost.league?.name} Ligi</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-berry px-3 py-1 text-xs font-black uppercase tracking-wider"><span className="size-2 animate-pulse rounded-full bg-white" /> Canlı maç</p>
          </motion.div>
        ) : (
          <>
            <p className="mt-6 font-display text-3xl font-black uppercase tracking-wide">Rakip aranıyor<motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>…</motion.span></p>
            <p className="mt-2 max-w-xs text-sm font-bold text-white/60">Ligindeki canlı oyuncular taranıyor. {Math.max(0, limit - t)} sn içinde kimse gelmezse bir rakibin gölgesiyle eşleşirsin.</p>
            <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full bg-mint" animate={{ width: `${Math.min(100, (t / limit) * 100)}%` }} /></div>
            <button onClick={cancel} className="mt-8 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white/80 hover:bg-white/10">Vazgeç</button>
          </>
        )}
      </div>
    </motion.div>
  )
}
