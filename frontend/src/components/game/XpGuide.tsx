import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { BookOpen, Flame, Gem, GraduationCap, Heart, Layers, MessageCircle, PenLine, Swords, Trophy } from 'lucide-react'
import { get } from '@/lib/api'

export interface Economy {
  xp: Record<string, number>
  daily_caps: Record<string, number | null>
  streak_min_xp: number
  daily_goal_gems: number
  level_up_gems: number
  heart_regen_minutes: number
  heart_refill_gems: number
  league_top3_gems: number[]
  league_promote: number
}

export const useEconomy = () => useQuery({ queryKey: ['economy'], queryFn: () => get<Economy>('/economy'), staleTime: Infinity })

/**
 * "How XP works", read from the server's own economy table, so the numbers on
 * screen are always the numbers the server grants. `only` narrows it to one area.
 */
export function XpGuide({ only, className }: { only?: 'words'; className?: string }) {
  const { data: e } = useEconomy()
  if (!e) return null
  const cap = (k: string) => (e.daily_caps[k] ? `günde en fazla ${e.daily_caps[k]} XP` : 'günlük sınır yok')
  const rows = [
    { k: 'words', icon: Layers, t: 'Kelime oyunları ve tekrar', v: `Her doğru cevap ${e.xp.practice_per_correct} XP, her tekrar kartı ${e.xp.review_per_word} XP`, c: cap('words') },
    { k: 'lesson', icon: BookOpen, t: 'Ders', v: `Dersin değeri kadar (en az ${e.xp.lesson_min} XP), hatasızsa +${e.xp.perfect_bonus}`, c: cap('lesson') },
    { k: 'story', icon: BookOpen, t: 'Hikâye', v: `Bitirince ${e.xp.story_first} XP + her doğru cevaba ${e.xp.story_per_correct} XP (tekrar okumada ${e.xp.story_repeat} + ${e.xp.story_repeat_per_correct})`, c: cap('story') },
    { k: 'duel', icon: Swords, t: 'Gölge Düellosu', v: `${e.xp.duel_base} XP + doğru başına ${e.xp.duel_per_correct}, kazanırsan +${e.xp.duel_win}`, c: cap('duel') },
    { k: 'ai', icon: MessageCircle, t: 'Defne ile konuşma', v: `Mesaj başına ${e.xp.ai_message} XP (sesli ${e.xp.ai_spoken}), yazma görevi ${e.xp.writing} XP`, c: cap('ai') },
    { k: 'exam', icon: GraduationCap, t: 'Sınav soruları', v: `Doğru ${e.xp.exam_correct} XP, yanlış ${e.xp.exam_attempt} XP`, c: cap('exam') },
  ].filter((r) => !only || r.k === only)
  return (
    <div className={clsx('rounded-3xl border-2 border-line bg-card p-5', className)}>
      <p className="font-display text-lg font-black">XP nasıl kazanılır?</p>
      <ul className="mt-3 divide-y-2 divide-line/60">
        {rows.map((r) => (
          <li key={r.k} className="flex items-start gap-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper-2 text-ink-soft"><r.icon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">{r.t}</span>
              <span className="block text-sm text-ink-soft">{r.v}</span>
              <span className="mt-1 inline-block rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft sm:hidden">{r.c}</span>
            </span>
            <span className="hidden shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft sm:inline">{r.c}</span>
          </li>
        ))}
      </ul>
      {!only && (
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2 rounded-2xl bg-paper-2 px-3 py-2"><Flame className="size-4 shrink-0 text-flame" /> Seri: günde en az {e.streak_min_xp} XP kazan.</p>
          <p className="flex items-center gap-2 rounded-2xl bg-paper-2 px-3 py-2"><Gem className="size-4 shrink-0 text-sky" /> Günlük hedef +{e.daily_goal_gems}, seviye atlama +{e.level_up_gems} elmas.</p>
          <p className="flex items-center gap-2 rounded-2xl bg-paper-2 px-3 py-2"><Heart className="size-4 shrink-0 text-berry" /> Can {e.heart_regen_minutes} dakikada bir dolar; 5+ doğru pratik 1 can kazandırır.</p>
          <p className="flex items-center gap-2 rounded-2xl bg-paper-2 px-3 py-2"><Trophy className="size-4 shrink-0 text-butter-deep" /> Ligde ilk {e.league_promote} üst lige çıkar; ilk üç {e.league_top3_gems.join('/')} elmas.</p>
        </div>
      )}
      {only === 'words' && <p className="mt-2 text-xs text-ink-soft"><PenLine className="mr-1 inline size-3.5" />Bilmediğin kelimeler tekrar listene eklenir; 5 ve üzeri doğru cevap 1 can geri kazandırır.</p>}
    </div>
  )
}
