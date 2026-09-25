import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { Logo } from '@/components/game/Logo'
import { Ada } from '@/components/game/Ada'
import { AchievementBadge } from '@/components/game/AchievementBadge'

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r-2 border-line bg-[#1B1F3B] p-12 text-[#F6F1E7] lg:flex lg:flex-col">
        <Link to="/"><Logo /></Link>
        <div className="relative my-auto">
          <div className="absolute -left-6 -top-24 rotate-[-8deg]"><AchievementBadge tier="gold" icon="mic" size={90} /></div>
          <div className="absolute -top-16 right-8 rotate-6 rounded-2xl border-2 border-line bg-flame px-4 py-2 text-white shadow-hard">
            <span className="flex items-center gap-2 font-display text-xl font-extrabold"><Flame className="size-5 fill-butter text-butter" /> 12 gün</span>
          </div>
          <blockquote className="font-display text-4xl font-extrabold leading-tight">
            “Bir dil, bir insan.
            <br />
            <span className="text-butter">İki dil, iki insan.”</span>
          </blockquote>
          <div className="mt-10 flex items-center gap-4 rounded-2xl border-2 border-[#F6F1E7]/15 bg-white/5 p-4">
            <Ada className="size-14" />
            <p className="text-sm text-[#F6F1E7]/80">
              Ben Ada, senin AI İngilizce öğretmeninim. Hatalarını Türkçe açıklarım, kaydettiğin kelimeleri sohbetlerimizde tekrar ederim. Hadi başlayalım!
            </p>
          </div>
        </div>
        <p className="text-xs text-[#F6F1E7]/50">Bayrak Dil Okulları · DilGO</p>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="mb-8 lg:hidden"><Logo small /></Link>
        <div className="mx-auto my-auto w-full max-w-md">
          <h1 className="text-4xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm font-semibold text-ink-soft">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
