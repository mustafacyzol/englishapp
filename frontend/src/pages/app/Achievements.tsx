import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { get } from '@/lib/api'
import { dateTR } from '@/lib/format'
import type { Achievement } from '@/lib/types'
import { AchievementBadge, tierLabel } from '@/components/game/AchievementBadge'
import { PageHeader, Progress, Spinner } from '@/components/ui/Misc'

const CAT: Record<string, string> = { streak: 'Seri', xp: 'XP', lessons: 'Dersler', stories: 'Okuma', words: 'Kelimeler', mastery: 'Hafıza', speaking: 'Konuşma', ai: 'Ada ile sohbet', perfect: 'Kusursuzluk', social: 'Arkadaşlar', league: 'Lig', secret: 'Gizli' }

export default function Achievements() {
  const { data, isLoading } = useQuery({ queryKey: ['achievements'], queryFn: () => get<{ data: Achievement[] }>('/achievements') })
  if (isLoading || !data) return <Spinner />
  const groups = Object.entries(data.data.reduce<Record<string, Achievement[]>>((a, x) => ((a[x.category ?? 'other'] ??= []).push(x), a), {}))
  const total = data.data.length
  const got = data.data.filter((a) => a.unlocked_at).length

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker={`${got}/${total} rozet`} title="Başarımlar">
        <Progress value={got} max={total} color="bg-butter" className="w-48" tall />
      </PageHeader>
      {groups.map(([cat, list]) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-ink-soft">{CAT[cat] ?? cat}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="ink-card flex flex-col items-center p-4 text-center">
                <AchievementBadge tier={a.tier} icon={a.icon} category={a.category} size={88} locked={!a.unlocked_at} progress={(a.progress ?? 0) / (a.threshold ?? 1)} />
                <p className="mt-2 font-display font-extrabold leading-tight">{a.title}</p>
                <p className="text-xs text-ink-soft">{a.description}</p>
                {a.unlocked_at ? (
                  <p className="mt-2 text-[11px] font-bold text-mint-deep">{tierLabel(a.tier)} · {dateTR(a.unlocked_at)}</p>
                ) : (
                  <div className="mt-2 w-full">
                    <Progress value={a.progress ?? 0} max={a.threshold ?? 1} />
                    <p className="mt-1 font-mono text-[10px] text-ink-soft">{a.progress}/{a.threshold}{a.reward_gems ? ` · 💎${a.reward_gems}` : ''}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
