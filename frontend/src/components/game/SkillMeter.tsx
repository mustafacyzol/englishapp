import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { SKILL, SKILLS, useSkills, type SkillReport } from '@/lib/skills'

/**
 * The four-skill balance. Compact: four slim bars for the sidebar. Full: a
 * report card with levels, this week's XP and a nudge toward the weakest skill.
 */
export function SkillMeter({ compact, className, report }: { compact?: boolean; className?: string; report?: SkillReport }) {
  const q = useSkills()
  const data = report ?? q.data
  if (!data) return compact ? null : <div className={clsx('h-56 animate-pulse rounded-3xl bg-paper-2', className)} />
  const by = Object.fromEntries(data.skills.map((s) => [s.key, s]))

  if (compact) {
    return (
      <Link to="/profile#beceriler" className={clsx('block rounded-2xl border-2 border-line bg-card p-3 transition hover:border-ink/20', className)}>
        <p className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-ink-soft">Dört beceri <span className="normal-case tracking-normal">denge %{data.balance}</span></p>
        <div className="space-y-1.5">
          {SKILLS.map((k) => {
            const s = by[k]
            return (
              <div key={k} className="flex items-center gap-2">
                <span className={clsx('grid size-5 shrink-0 place-items-center rounded-md text-white', SKILL[k].bg)}>{(() => { const I = SKILL[k].icon; return <I className="size-3" strokeWidth={2.6} /> })()}</span>
                <span className="w-14 text-xs font-extrabold">{SKILL[k].label}</span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                  <motion.span className={clsx('absolute inset-y-0 left-0 rounded-full', SKILL[k].bg)} initial={{ width: 0 }} animate={{ width: `${Math.max(4, s.progress * 100)}%` }} transition={{ duration: 0.8 }} />
                </span>
                <span className="w-7 text-right text-[11px] font-black tabular-nums text-ink-soft">Sv{s.level}</span>
              </div>
            )
          })}
        </div>
      </Link>
    )
  }

  const weak = SKILL[data.weakest]
  const WeakIcon = weak.icon
  const week = data.skills.reduce((t, x) => t + x.week_xp, 0)
  return (
    <section id="beceriler" className={clsx('overflow-hidden rounded-3xl border-2 border-line bg-card', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-line px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-ink-soft">Dört beceri karnesi</p>
          <h2 className="mt-0.5 text-2xl">Denge %{data.balance}</h2>
        </div>
        <p className="text-sm font-bold text-ink-soft">Bu hafta <span className="text-ink">{week} XP</span></p>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[280px_1fr] md:items-center">
        <Radar skills={data.skills} />
        <div className="divide-y-2 divide-line/60">
          {SKILLS.map((k, i) => {
            const s = by[k]
            const meta = SKILL[k]
            const Icon = meta.icon
            const max = Math.max(1, ...s.trend)
            return (
              <div key={k} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl text-white', meta.bg)}><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display font-black">{meta.label} <span className="ml-1 text-sm font-extrabold text-ink-soft">Sv {s.level}</span></p>
                    <p className="text-xs font-bold tabular-nums text-ink-soft">{s.xp} XP · +{s.to_next} sonraki</p>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2">
                    <motion.div className={clsx('h-full rounded-full', meta.bg)} initial={{ width: 0 }} animate={{ width: `${Math.max(3, s.progress * 100)}%` }} transition={{ duration: 0.9, delay: 0.08 * i }} />
                  </div>
                </div>
                {/* last 7 days, one bar per day */}
                <div className="hidden h-9 w-20 shrink-0 items-end gap-[3px] sm:flex" title={`Son 7 gün: ${s.week_xp} XP`}>
                  {s.trend.map((v, d) => (
                    <span key={d} className={clsx('flex-1 rounded-t-[3px]', v ? meta.bg : 'bg-paper-2')} style={{ height: `${v ? Math.max(16, (v / max) * 100) : 10}%` }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Link to={weak.to} className="group flex items-center gap-3 border-t-2 border-line bg-paper-2/50 px-5 py-3.5 transition hover:bg-paper-2 sm:px-6">
        <span className={clsx('grid size-9 shrink-0 place-items-center rounded-xl', weak.soft, weak.text)}><WeakIcon className="size-5" /></span>
        <span className="min-w-0 flex-1 text-sm"><b>Sıradaki odak: {weak.label}.</b> <span className="text-ink-soft">En az çalıştığın beceri — bugün küçük bir adım dengeyi toparlar.</span></span>
        <ArrowRight className="size-5 shrink-0 text-ink-soft transition group-hover:translate-x-1" />
      </Link>
    </section>
  )
}

/** Four axes (okuma, dinleme, konuşma, yazma); the shape shows balance at a glance. */
function Radar({ skills }: { skills: SkillReport['skills'] }) {
  const by = Object.fromEntries(skills.map((s) => [s.key, s]))
  const val = (k: (typeof SKILLS)[number]) => by[k].level + by[k].progress
  // Scale to the strongest skill (≈85% of the radius) so the shape stays readable at any level.
  const top = Math.max(1, Math.max(...SKILLS.map(val)) / 0.85)
  const RINGS = 4
  const C = 100
  const R = 78
  const ang = (i: number) => -Math.PI / 2 + (i * Math.PI) / 2
  const pt = (i: number, v: number) => [C + Math.cos(ang(i)) * (R * v) / top, C + Math.sin(ang(i)) * (R * v) / top]
  const poly = SKILLS.map((k, i) => pt(i, Math.max(top * 0.08, val(k))).join(',')).join(' ')
  const labelPos = [[C, 12], [C + R + 12, C + 4], [C, 196], [C - R - 12, C + 4]] as const
  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <svg viewBox="-44 0 288 206" className="w-full overflow-visible" role="img" aria-label={SKILLS.map((k) => `${SKILL[k].label} seviye ${by[k].level}`).join(', ')}>
        {Array.from({ length: RINGS }, (_, r) => (
          <polygon key={r} points={SKILLS.map((_, i) => pt(i, (top * (r + 1)) / RINGS).join(',')).join(' ')} fill="none" stroke="var(--line)" strokeWidth={r + 1 === RINGS ? 1.5 : 1} />
        ))}
        {SKILLS.map((_, i) => <line key={i} x1={C} y1={C} x2={pt(i, top)[0]} y2={pt(i, top)[1]} stroke="var(--line)" />)}
        <motion.polygon points={poly} fill="var(--ink)" fillOpacity={0.08} stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: '100px 100px' }} transition={{ duration: 0.7 }} />
        {SKILLS.map((k, i) => {
          const [x, y] = pt(i, Math.max(top * 0.08, val(k)))
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={6} fill={SKILL[k].hex} stroke="var(--card)" strokeWidth={2.5}><title>{`${SKILL[k].label}: Sv ${by[k].level} · ${by[k].xp} XP`}</title></circle>
            </g>
          )
        })}
        {SKILLS.map((k, i) => (
          <text key={k} x={labelPos[i][0]} y={labelPos[i][1]} textAnchor={i === 1 ? 'start' : i === 3 ? 'end' : 'middle'} className="fill-ink-soft text-[12.5px] font-extrabold">{SKILL[k].label}</text>
        ))}
      </svg>
    </figure>
  )
}
