import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Flame, Gem, Sparkles, Target, Zap } from 'lucide-react'
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
      const big = r.level_up || r.achievements.length > 0 || r.goal_met_now
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
            <motion.p initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: -3 }} className="mx-auto mb-2 inline-block rounded-xl border-2 border-line bg-butter px-3 py-1 font-display text-sm font-extrabold uppercase text-[#1B1F3B] shadow-hard-sm">
              {r.level_up ? `Seviye ${r.level}!` : state.title}
            </motion.p>
            <h2 className="mb-5 text-3xl font-extrabold">+{r.xp_gained} XP {r.multiplier > 1 && <span className="text-flame">×{r.multiplier}</span>}</h2>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <Stat icon={<Flame className="size-5 fill-flame text-flame" />} label="Seri" value={`${r.streak} gün`} highlight={r.streak_extended} />
              <Stat icon={<Target className="size-5 text-mint" />} label="Bugün" value={`${r.daily_xp}/${r.daily_goal}`} highlight={r.goal_met_now} />
              <Stat icon={<Gem className="size-5 text-sky" />} label="Elmas" value={String(r.gems)} />
            </div>

            {r.goal_met_now && <Banner icon={<Zap className="size-4" />}>Günlük hedefini tamamladın!</Banner>}
            {r.quests_completed.map((q) => (
              <Banner key={q.id} icon={<Sparkles className="size-4" />}>
                Görev tamam: {q.title} — ödülünü Görevler'den al (+{q.reward_gems} 💎)
              </Banner>
            ))}

            {r.achievements.length > 0 && (
              <div className="mt-4">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-ink-soft">Yeni rozet{r.achievements.length > 1 ? 'ler' : ''}</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {r.achievements.map((a, i) => (
                    <motion.div key={a.id} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.25 + i * 0.15, type: 'spring' }} className="w-28">
                      <AchievementBadge tier={a.tier} icon={a.icon} size={84} className="mx-auto" />
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
    <div className={`rounded-2xl border-2 border-line p-2.5 ${highlight ? 'bg-butter text-[#1B1F3B]' : 'bg-paper-2'}`}>
      <div className="mb-1 flex justify-center">{icon}</div>
      <div className="font-display text-lg font-extrabold leading-none">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</div>
    </div>
  )
}

function Banner({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-line bg-mint/20 px-3 py-2 text-left text-sm font-bold">
      {icon}
      {children}
    </div>
  )
}

export const useReward = () => useContext(Ctx)
