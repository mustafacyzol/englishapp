import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Sparkles, Target, Zap } from 'lucide-react'
import { rewardImg } from '@/lib/assets'
import { Modal } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { AchievementBadge } from './AchievementBadge'
import { celebrate, sfx } from '@/lib/fx'
import { useAuth } from '@/lib/auth'
import type { RewardSummary } from '@/lib/types'

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
      sfx.fanfare()
      refresh()
    },
    [refresh],
  )

  const r = state?.r
  return (
    <Ctx.Provider value={show}>
      {children}
      <Modal open={!!state} onClose={() => setState(null)}>
        {r && (
          <div className="text-center">
            <motion.img initial={{ scale: 0.4, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }} src={rewardImg(r.level_up ? 'crown' : 'bolt')} alt="" className="mx-auto -mt-2 mb-1 size-24 object-contain drop-shadow-xl" />
            <p className="text-sm font-extrabold uppercase tracking-widest text-flame">{r.level_up ? `Seviye ${r.level}!` : state.title}</p>
            <h2 className="mb-5 mt-1 text-4xl">+{r.xp_gained} XP {r.multiplier > 1 && <span className="text-flame">×{r.multiplier}</span>}</h2>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <Stat icon={<img src={rewardImg('flame')} alt="" className="size-7" />} label="Seri" value={`${r.streak} gün`} highlight={r.streak_extended} />
              <Stat icon={<Target className="size-7 text-mint" />} label="Bugün" value={`${r.daily_xp}/${r.daily_goal}`} highlight={r.goal_met_now} />
              <Stat icon={<img src={rewardImg('gem')} alt="" className="size-7" />} label="Elmas" value={String(r.gems)} />
            </div>

            {r.goal_met_now && <Banner icon={<Zap className="size-4" />}>Günlük hedefini tamamladın!</Banner>}
            {r.quests_completed.map((q) => (
              <Banner key={q.id} icon={<Sparkles className="size-4" />}>
                Görev tamam: {q.title} — ödülünü Görevler'den al (+{q.reward_gems} elmas)
              </Banner>
            ))}

            {!!r.rewards?.length && (
              <div className="mt-4 grid gap-2">
                {r.rewards.map((w, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className="flex items-center gap-3 rounded-2xl bg-butter/15 px-3 py-2 text-left">
                    <img src={rewardImg(w.icon)} alt="" className="size-10 object-contain" />
                    <span className="flex-1 text-sm font-bold">{w.title}</span>
                    <span className="text-sm font-extrabold text-butter-deep">{w.gems ? `+${w.gems} elmas` : 'Kasana eklendi'}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {r.achievements.length > 0 && (
              <div className="mt-4">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-soft">Yeni rozet{r.achievements.length > 1 ? 'ler' : ''}</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {r.achievements.map((a, i) => (
                    <motion.div key={a.id} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25 + i * 0.15, type: 'spring' }} className="w-28">
                      <AchievementBadge tier={a.tier} category={a.category ?? 'xp'} size={84} className="mx-auto" />
                      <p className="mt-1 text-sm font-extrabold leading-tight">{a.title}</p>
                      {!!a.reward_gems && <p className="text-xs text-ink-soft">+{a.reward_gems} elmas</p>}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <Button block className="mt-6" onClick={() => setState(null)}>
              Devam et
            </Button>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  )
}

function Stat({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-2.5 ${highlight ? 'border-butter bg-butter/15' : 'border-line bg-card'}`}>
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className="font-display text-lg font-extrabold leading-none">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</div>
    </div>
  )
}

function Banner({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl bg-mint/12 px-3 py-2 text-left text-sm font-bold text-mint-deep">
      {icon}
      {children}
    </div>
  )
}

export const useReward = () => useContext(Ctx)
