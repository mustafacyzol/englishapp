import clsx from 'clsx'

/** Profile cover banners sold in the shop; `null` is the free default. */
export const BANNERS: Record<string, { label: string; bg: string }> = {
  default: { label: 'Klasik', bg: 'linear-gradient(120deg,#ffe3d6,#fff4e6 55%,#e6efff)' },
  sunset: { label: 'Gün Batımı', bg: 'linear-gradient(160deg,#ffb36b,#ff6a5c 50%,#8f5cc9)' },
  ocean: { label: 'Okyanus', bg: 'linear-gradient(160deg,#6fd6ff,#2f7cf6 60%,#1b3f99)' },
  forest: { label: 'Orman', bg: 'linear-gradient(160deg,#b8f0c8,#22b573 55%,#0d5c3b)' },
  candy: { label: 'Şeker', bg: 'linear-gradient(120deg,#ffc8e2,#e6c8ff 50%,#c8e6ff)' },
  galaxy: { label: 'Galaksi', bg: 'radial-gradient(circle at 30% 40%,#6b4bd6,transparent 45%),radial-gradient(circle at 75% 60%,#d64b9a,transparent 40%),#130f2e' },
  istanbul: { label: 'İstanbul', bg: 'linear-gradient(180deg,#ffb870,#ff7a59 55%,#6d4a8f)' },
}

/**
 * The strip behind a profile header. Some covers carry a small drawn scene on
 * top of their gradient (stars, waves, a skyline), all in plain SVG.
 */
export function ProfileBanner({ banner, className }: { banner?: string | null; className?: string }) {
  const key = banner && BANNERS[banner] ? banner : 'default'
  return (
    <div aria-hidden className={clsx('relative overflow-hidden', className)} style={{ background: BANNERS[key].bg }}>
      {key === 'galaxy' && (
        <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
          {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={`${(i * 37) % 100}%`} cy={`${(i * 53) % 100}%`} r={i % 5 === 0 ? 1.6 : 0.9} fill="#fff" opacity={0.4 + (i % 3) * 0.2} />)}
        </svg>
      )}
      {key === 'ocean' && (
        <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path d="M0 30 Q50 10 100 30 T200 30 T300 30 T400 30 V60 H0Z" fill="#fff" opacity=".18" />
          <path d="M0 42 Q50 24 100 42 T200 42 T300 42 T400 42 V60 H0Z" fill="#fff" opacity=".22" />
        </svg>
      )}
      {key === 'forest' && (
        <svg className="absolute inset-x-0 bottom-0 h-3/5 w-full" viewBox="0 0 400 60" preserveAspectRatio="none">
          {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${i * 30 - 5} 60 L${i * 30 + 10} ${18 + (i % 3) * 8} L${i * 30 + 25} 60Z`} fill="#0b3d27" opacity=".35" />)}
        </svg>
      )}
      {key === 'istanbul' && (
        <svg className="absolute inset-x-0 bottom-0 h-3/5 w-full" viewBox="0 0 400 60" preserveAspectRatio="xMidYMax slice">
          <path fill="#3a2350" opacity=".7" d="M0 60V44h40v-6h14v6h30V30c0-8 22-8 22 0v8h6V16h3v22h40V24c0-12 34-12 34 0v14h8V10h3v28h24v-4c0-6 18-6 18 0v4h30V26h4v12h34v-8h16v8h40v22Z" />
          <circle cx="330" cy="14" r="7" fill="#fff4d6" opacity=".85" />
        </svg>
      )}
      {key === 'candy' && (
        <svg className="absolute inset-0 size-full">
          {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={`${(i * 29) % 100}%`} cy={`${(i * 41) % 100}%`} r={4 + (i % 4) * 2} fill="#fff" opacity=".35" />)}
        </svg>
      )}
    </div>
  )
}
