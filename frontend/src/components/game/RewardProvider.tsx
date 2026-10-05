import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Target, Zap } from 'lucide-react'
import { rewardImg } from '@/lib/assets'
import { Modal } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { AchievementBadge } from './AchievementBadge'
import { celebrate, sfx } from '@/lib/fx'
import { useAuth } from '@/lib/auth'
import type { RewardSummary } from '@/lib/types'
import { Img } from '@/components/ui/Img'
import { higoImg } from './Higo'

const Ctx = createContext<(r: RewardSummary, title?: string) => void>(() => {})

/** Shows the post-activity reward sheet (XP, streak, quests, new badges) anywhere in the app. */
export function RewardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ r: RewardSummary; title: string } | null>(null)
  const { refresh } = useAuth()

  const show = useCallback(
    (r: RewardSummary, title = 'Harika iş!') => {
      setState({ r, title })
      const big = r.level_up || r.achievements.length > 0 || r.goal_met_now || !!r.rewards?.length
      celebrate(big)
      if (r.level_up) sfx.levelup()
      else if (r.rewards?.length) sfx.reward()
      else sfx.complete()
      refresh()
    },
    [refresh],
  )

  const r = state?.r
  return (
    <Ctx.Provider value={show}>
      {children}
      <Modal open={!!state} onClose={() => setState(null)} className="!max-w-[360px] mx-3 mb-3 !rounded-[28px] !p-0 sm:mx-0 sm:mb-0">
        {r && (
          <div className="overflow-hidden rounded-[28px]">
            {/* headline: Higo and the XP, side by side */}
            <div className="relative flex items-center gap-3 bg-gradient-to-br from-butter/40 via-flame/10 to-transparent px-5 pb-4 pt-5">
              <motion.img initial={{ scale: 0.4, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} src={r.level_up ? rewardImg('crown') : higoImg('cheer')} alt="" className="size-20 shrink-0 object-contain drop-shadow-lg" />
              <div className="min-w-0 text-left">
                <p className="text-xs font-black uppercase tracking-widest text-flame">{r.level_up ? `Seviye ${r.level}!` : state.title}</p>
                <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="font-display text-4xl font-black leading-none tabular-nums">+{r.xp_gained} <span className="text-2xl">XP</span></motion.p>
                {r.multiplier > 1 && <p className="mt-1 text-xs font-extrabold text-flame">×{r.multiplier} takviye aktif</p>}
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="grid grid-cols-3 divide-x-2 divide-line/50 rounded-2xl border-2 border-line text-center">
                <Stat icon={<Img src={rewardImg('flame')} alt="" className="size-5" />} value={`${r.streak}`} label="gün seri" highlight={r.streak_extended} />
                <Stat icon={<Target className="size-5 text-mint-deep" />} value={`${r.daily_xp}/${r.daily_goal}`} label="bugün" highlight={r.goal_met_now} />
                <Stat icon={<Img src={rewardImg('gem')} alt="" className="size-5" />} value={String(r.gems)} label="elmas" />
              </div>

              {/* extras stay one line each and never push the button off screen */}
              <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                {r.goal_met_now && <Banner icon={<Zap className="size-4" />}>Günlük hedef tamam!</Banner>}
                {r.quests_completed.map((q) => (
                  <Banner key={q.id} icon={<Target className="size-4" />}>Görev bitti: {q.title} (+{q.reward_gems})</Banner>
                ))}
                {r.rewards?.map((w, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-center gap-2 rounded-xl bg-butter/15 px-3 py-1.5 text-left">
                    <Img src={rewardImg(w.icon)} alt="" className="size-7 object-contain" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{w.title}</span>
                    <span className="shrink-0 text-xs font-extrabold text-butter-deep">{w.gems ? `+${w.gems}` : 'Kasada'}</span>
                  </motion.div>
                ))}
                {r.achievements.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + i * 0.12 }} className="flex items-center gap-2 rounded-xl bg-lilac/10 px-3 py-1.5 text-left">
                    <AchievementBadge tier={a.tier} category={a.category ?? 'xp'} size={30} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">Yeni rozet: {a.title}</span>
                    {!!a.reward_gems && <span className="shrink-0 text-xs font-extrabold text-lilac">+{a.reward_gems}</span>}
                  </motion.div>
                ))}
              </div>

              <Button block className="mt-4" onClick={() => setState(null)}>Devam et</Button>
            </div>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  )
}

function Stat({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`py-2 ${highlight ? 'bg-butter/15' : ''}`}>
      <div className="flex items-center justify-center gap-1">{icon}<span className="font-display text-base font-black tabular-nums">{value}</span></div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  )
}

function Banner({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-mint/12 px-3 py-1.5 text-left text-sm font-bold text-mint-deep">
      {icon}
      {children}
    </div>
  )
}

export const useReward = () => useContext(Ctx)
