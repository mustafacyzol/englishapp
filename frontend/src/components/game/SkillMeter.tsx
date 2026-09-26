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
  return (
    <section id="beceriler" className={clsx('rounded-3xl border-2 border-line bg-card p-5 sm:p-6', className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-ink-soft">Dört beceri karnesi</p>
          <h2 className="mt-1 text-2xl">Denge puanın %{data.balance}</h2>
        </div>
        <p className="max-w-xs text-sm text-ink-soft">Her ders, hikâye, sohbet ve düello bu dört beceriye puan yazar. Dengede kalan hızlı ilerler.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SKILLS.map((k, i) => {
          const s = by[k]
          const meta = SKILL[k]
          const Icon = meta.icon
          const max = Math.max(1, ...s.trend)
          return (
            <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={clsx('rounded-2xl p-4', meta.soft)}>
              <div className="flex items-center justify-between">
                <span className={clsx('grid size-9 place-items-center rounded-xl text-white shadow-hard-sm', meta.bg)}><Icon className="size-5" /></span>
                <span className="rounded-lg bg-card px-2 py-0.5 text-xs font-black tabular-nums">Sv {s.level}</span>
              </div>
              <p className="mt-3 font-display text-lg font-black leading-none">{meta.label}</p>
              <p className="mt-1 text-xs font-bold text-ink-soft">{s.xp} XP · sonraki seviyeye {s.to_next}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
                <motion.div className={clsx('h-full rounded-full', meta.bg)} initial={{ width: 0 }} animate={{ width: `${Math.max(3, s.progress * 100)}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.05 }} />
              </div>
              {/* 7-day activity: one bar per day */}
              <div className="mt-3 flex h-8 items-end gap-1" aria-label={`Son 7 gün: ${s.week_xp} XP`}>
                {s.trend.map((v, d) => (
                  <span key={d} className={clsx('flex-1 rounded-sm', v ? meta.bg : 'bg-card')} style={{ height: `${v ? Math.max(18, (v / max) * 100) : 12}%`, opacity: v ? 0.45 + 0.55 * (v / max) : 1 }} />
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      <Link to={weak.to} className="press group mt-4 flex items-center gap-3 rounded-2xl border-2 border-line p-3 transition hover:border-ink/20">
        <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl text-white', weak.bg)}><WeakIcon className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">Sıradaki odak: {weak.label}</span>
          <span className="block truncate text-xs text-ink-soft">En az çalıştığın beceri. Bugün küçük bir adım dengeyi toparlar.</span>
        </span>
        <ArrowRight className="size-5 text-ink-soft transition group-hover:translate-x-1" />
      </Link>
    </section>
  )
}
