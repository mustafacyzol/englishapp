import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, AudioLines, ChevronRight, Lock, MessageSquareText, PenLine, Phone, Sparkles } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { rewardImg, scenarioImg } from '@/lib/assets'
import { TUTOR } from '@/lib/tutor'
import { SKILL } from '@/lib/skills'
import type { SkillKey } from '@/lib/types'
import { SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/auth'
import { dateTR } from '@/lib/format'
import { Img } from '@/components/ui/Img'

interface Scenario { id: number; key: string; title: string; description: string; emoji: string; category: string; cefr_min: string; goals: string[]; is_premium: boolean; locked: boolean }
interface Usage { used: number; limit: number; remaining: number }

const CAT: Record<string, string> = { daily: 'Günlük hayat', travel: 'Seyahat', career: 'Kariyer', exam: 'Sınav', fun: 'Tartışma' }
/** Which onboarding interests make a scenario category feel "made for you". */
const INTEREST_CAT: Record<string, string[]> = { travel: ['travel'], career: ['career'], food: ['travel', 'daily'], movies: ['fun'], music: ['fun'], games: ['fun'], sports: ['daily', 'fun'], tech: ['career'] }
const INTEREST_TR: Record<string, string> = { travel: 'Seyahat', career: 'Kariyer', movies: 'Film & dizi', music: 'Müzik', games: 'Oyun', sports: 'Spor', tech: 'Teknoloji', food: 'Yemek' }
const MODE_ICON: Record<string, typeof Phone> = { speaking: AudioLines, chat: MessageSquareText, roleplay: Sparkles }

export default function AiHub() {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [cat, setCat] = useState('all')
  const autoCall = useRef(false)
  const { data, isLoading } = useQuery({ queryKey: ['scenarios'], queryFn: () => get<{ data: Scenario[]; usage: Usage }>('/ai/scenarios') })
  const convs = useQuery({ queryKey: ['conversations'], queryFn: () => get<{ data: { id: number; title: string; mode: string; updated_at: string }[] }>('/ai/conversations') })
  const start = useMutation({
    mutationFn: (b: { mode: string; scenario_key?: string; call?: boolean }) => post<{ conversation: { id: number } }>('/ai/conversations', { mode: b.mode, scenario_key: b.scenario_key }),
    onSuccess: (r, b) => nav(`/ai/${r.conversation.id}${b.call ? '?call=1' : ''}`),
    onError: (e: ApiError) => (e.status === 402 ? nav('/premium') : toast(e.message, 'error')),
  })

  // "/ai?call=1" (from the daily plan) dials straight in.
  useEffect(() => {
    if (params.get('call') === '1' && !autoCall.current) {
      autoCall.current = true
      start.mutate({ mode: 'speaking', call: true })
    }
  }, [params, start])

  const interests = useMemo(() => user?.interests ?? [], [user?.interests])
  const forYou = useMemo(() => new Set(interests.flatMap((i) => INTEREST_CAT[i] ?? [])), [interests])
  const scenarios = useMemo(() => {
    const list = (data?.data ?? []).filter((s) => cat === 'all' || s.category === cat)
    return [...list].sort((a, b) => Number(forYou.has(b.category)) - Number(forYou.has(a.category)) || Number(a.locked) - Number(b.locked))
  }, [data, cat, forYou])

  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const cats = ['all', ...Array.from(new Set(data.data.map((s) => s.category)))]
  const usagePct = data.usage.limit ? data.usage.remaining / data.usage.limit : 0

  return (
    <div className="space-y-12">
      {/* ---------------------------------------------------------- Call hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#141a24] text-white">
        <div className="grid items-stretch md:grid-cols-[1.15fr_0.85fr]">
          <div className="relative z-10 order-2 flex flex-col justify-center gap-5 p-6 sm:p-9 md:order-1">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/60">
              <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-mint/70" /><span className="relative size-2 rounded-full bg-mint" /></span>
              {TUTOR.role} · çevrim içi
            </p>
            <div>
              <h1 className="text-4xl leading-[1.05] sm:text-5xl">{TUTOR.name} ile konuş</h1>
              <p className="mt-3 max-w-md text-[17px] leading-relaxed text-white/75">{TUTOR.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => start.mutate({ mode: 'speaking', call: true })}
                disabled={start.isPending}
                className="press flex h-14 items-center gap-2.5 rounded-2xl bg-sage px-6 font-display font-extrabold uppercase tracking-wide text-white shadow-[0_4px_0_0_var(--color-sage-deep)] disabled:opacity-60"
              >
                <Phone className="size-5" /> Sesli aramayı başlat
              </button>
              <button
                onClick={() => start.mutate({ mode: 'chat' })}
                disabled={start.isPending}
                className="press flex h-14 items-center gap-2 rounded-2xl border-2 border-white/15 bg-white/5 px-5 font-display font-extrabold uppercase tracking-wide text-white hover:bg-white/10"
              >
                <MessageSquareText className="size-5" /> Yazışarak
              </button>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-3 border-t border-white/10 pt-5 text-sm">
              <div><dt className="text-white/50">Seviyen</dt><dd className="font-display text-xl font-black">{user?.cefr_level}</dd></div>
              <div>
                <dt className="text-white/50">Bugün kalan</dt>
                <dd className="font-display text-xl font-black tabular-nums">{data.usage.remaining}<span className="text-sm text-white/50">/{data.usage.limit}</span></dd>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-mint" style={{ width: `${usagePct * 100}%` }} /></span>
              </div>
              <div><dt className="text-white/50">Konular</dt><dd className="truncate font-bold">{interests.length ? interests.slice(0, 2).map((i) => INTEREST_TR[i] ?? i).join(', ') : 'Serbest'}</dd></div>
            </dl>
          </div>
          <div className="relative order-1 aspect-[4/3] md:order-2 md:aspect-auto md:min-h-full">
            <video src={TUTOR.video.idle} poster={TUTOR.portrait} muted loop autoPlay playsInline className="absolute inset-0 size-full object-cover object-[50%_20%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141a24] via-transparent to-transparent md:bg-gradient-to-r" />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- Modes */}
      <section>
        <h2 className="text-2xl">Nasıl çalışmak istersin?</h2>
        <p className="mb-5 text-ink-soft">Her mod farklı becerilere puan yazar — dengede kal.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <ModeCard icon={AudioLines} title="Sesli arama" text="Defne’yi görerek konuş; telaffuzun ve cümlen anında düzelsin." skills={['speaking', 'listening']} onClick={() => start.mutate({ mode: 'speaking', call: true })} loading={start.isPending} />
          <ModeCard icon={MessageSquareText} title="Yazılı sohbet" text="Acele etmeden yaz, her mesajda küçük bir düzeltme al." skills={['writing', 'reading']} onClick={() => start.mutate({ mode: 'chat' })} loading={start.isPending} />
          <ModeCard icon={PenLine} title="Yazma atölyesi" text="Bir görev seç, metnini yaz; Defne hataları üstünde işaretlesin." skills={['writing']} to="/ai/writing" />
        </div>
      </section>

      {/* ---------------------------------------------------------- Missions */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl">Rol yapma görevleri</h2>
            <p className="text-ink-soft">Gerçek hayattan sahneler. {forYou.size > 0 && 'İlgi alanlarına uyanlar önde.'}</p>
          </div>
          <div className="no-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={clsx('shrink-0 rounded-full border-2 px-3.5 py-1.5 text-sm font-extrabold transition', cat === c ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:text-ink')}>
                {c === 'all' ? 'Tümü' : CAT[c] ?? c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((s, i) => (
            <motion.button
              key={s.key}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.03 }}
              onClick={() => (s.locked ? nav('/premium') : start.mutate({ mode: 'roleplay', scenario_key: s.key, call: true }))}
              className="group overflow-hidden rounded-3xl border-2 border-line bg-card text-left transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Img src={scenarioImg(s.key)} alt="" loading="lazy" className={clsx('photo transition duration-700 group-hover:scale-105', s.locked && 'grayscale-[40%]')} />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span className="rounded-lg bg-card/95 px-2 py-0.5 text-xs font-black">{s.cefr_min}+</span>
                  {forYou.has(s.category) && <span className="rounded-lg bg-sage px-2 py-0.5 text-xs font-black text-white">Sana özel</span>}
                </div>
                {s.is_premium && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-butter px-2 py-0.5 text-xs font-black text-[#1f2433]">
                    {s.locked ? <Lock className="size-3.5" /> : <Img src={rewardImg('crown')} alt="" className="size-4" />} Premium
                  </span>
                )}
                <p className="absolute bottom-3 left-4 text-xs font-extrabold uppercase tracking-wider text-white/90">{CAT[s.category] ?? s.category}</p>
              </div>
              <div className="flex items-center gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black leading-tight">{s.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{s.description}</p>
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs font-extrabold text-sage-deep dark:text-sage"><Phone className="size-3.5" /> Sesli · {s.goals?.length ?? 0} görev</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-ink-soft transition group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- History */}
      {!!convs.data?.data.length && (
        <section>
          <h2 className="mb-3 text-xl">Kaldığın sohbetler</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {convs.data.data.slice(0, 6).map((c) => {
              const Icon = MODE_ICON[c.mode] ?? MessageSquareText
              return (
                <Link key={c.id} to={`/ai/${c.id}`} className="group flex items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3 transition hover:border-ink/20">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage/12 text-sage-deep dark:text-sage"><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{c.title}</span>
                    <span className="block text-xs text-ink-soft">{dateTR(c.updated_at)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm font-extrabold text-ink-soft group-hover:text-ink">Devam <ArrowRight className="size-4" /></span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function ModeCard({ icon: Icon, title, text, skills, onClick, to, loading }: { icon: typeof PenLine; title: string; text: string; skills: SkillKey[]; onClick?: () => void; to?: string; loading?: boolean }) {
  const cls = 'press group relative flex h-full flex-col rounded-3xl border-2 border-line bg-card p-5 text-left shadow-hard transition hover:-translate-y-0.5 hover:border-ink/15'
  const inner = (
    <>
      <span className="grid size-12 place-items-center rounded-2xl bg-ink text-paper transition group-hover:scale-105"><Icon className="size-6" /></span>
      <p className="mt-4 font-display text-xl font-black leading-tight">{title}</p>
      <p className="mt-1 flex-1 text-sm text-ink-soft">{text}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {skills.map((k) => {
          const S = SKILL[k]
          return (
            <span key={k} className={clsx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold', S.soft, S.text)}>
              <S.icon className="size-3" /> {S.label}
            </span>
          )
        })}
      </div>
      {loading && <span className="absolute right-4 top-4 size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />}
    </>
  )
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} disabled={loading} className={cls}>{inner}</button>
}
