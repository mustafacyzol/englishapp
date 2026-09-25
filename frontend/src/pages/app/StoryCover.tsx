import clsx from 'clsx'
import type { StoryCard } from '@/lib/types'

const PALETTE = ['#FF5A36', '#2EC4A0', '#3A6FF7', '#FFD23F', '#E23D78', '#B8A6FF']
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Generative cover: every story gets a unique, on-brand poster without stock art. */
export function StoryCover({ story, className }: { story: Pick<StoryCard, 'slug' | 'title' | 'cefr_level' | 'cover_image' | 'category'>; className?: string }) {
  if (story.cover_image) return <img src={story.cover_image} alt="" className={clsx('size-full object-cover', className)} loading="lazy" />
  const h = hash(story.slug)
  const bg = PALETTE[h % PALETTE.length]
  const fg = PALETTE[(h >> 3) % PALETTE.length] === bg ? '#1B1F3B' : PALETTE[(h >> 3) % PALETTE.length]
  const shape = h % 3
  const initial = story.title.replace(/^The /, '')[0]
  return (
    <div className={clsx('relative size-full overflow-hidden', className)} style={{ background: bg }} aria-hidden>
      <svg viewBox="0 0 200 140" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
        {shape === 0 && <circle cx="150" cy="40" r="46" fill={fg} stroke="#1B1F3B" strokeWidth="3" />}
        {shape === 1 && <rect x="112" y="-10" width="90" height="90" rx="18" transform="rotate(18 150 40)" fill={fg} stroke="#1B1F3B" strokeWidth="3" />}
        {shape === 2 && <path d="M110 120 Q150 10 200 60 V140 H110Z" fill={fg} stroke="#1B1F3B" strokeWidth="3" />}
        <path d="M0 118 Q 50 98 100 118 T 200 112 V140 H0Z" fill="#1B1F3B" opacity=".14" />
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={i} cx={18 + i * 14} cy={20} r="2.4" fill="#1B1F3B" opacity=".35" />
        ))}
      </svg>
      <span className="absolute bottom-1 left-3 font-display text-[88px] font-extrabold leading-none text-[#F6F1E7] [text-shadow:4px_4px_0_#1B1F3B]">{initial}</span>
    </div>
  )
}
