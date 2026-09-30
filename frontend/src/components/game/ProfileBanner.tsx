import clsx from 'clsx'
import { img } from '@/lib/assets'

/**
 * Profile covers sold in the shop; `default` is the free one. Each is its own
 * illustrated scene, so two profiles side by side never look alike. `pos` keeps
 * the interesting part in view when the strip is short.
 */
export const BANNERS: Record<string, { label: string; bg: string; src?: string; pos?: string }> = {
  default: { label: 'Klasik', bg: 'linear-gradient(120deg,#ffe3d6,#fff4e6 55%,#e6efff)' },
  sunset: { label: 'Gün Batımı', bg: '#f7b88a', src: 'banners/sunset.webp', pos: '70% 55%' },
  ocean: { label: 'Okyanus', bg: '#1f8fb8', src: 'banners/ocean.webp', pos: '75% 50%' },
  forest: { label: 'Orman', bg: '#8fd08a', src: 'banners/forest.webp', pos: '50% 60%' },
  candy: { label: 'Şeker Diyarı', bg: '#f1cdea', src: 'banners/candy.webp', pos: '65% 40%' },
  galaxy: { label: 'Galaksi', bg: '#1b1a45', src: 'banners/galaxy.webp', pos: '60% 45%' },
  istanbul: { label: 'İstanbul', bg: '#2b4a55', src: 'banners/istanbul.webp', pos: '55% 45%' },
}

/** The strip behind a profile header: an illustrated scene, or the soft default gradient. */
export function ProfileBanner({ banner, className }: { banner?: string | null; className?: string }) {
  const key = banner && BANNERS[banner] ? banner : 'default'
  const b = BANNERS[key]
  return (
    <div aria-hidden className={clsx('relative overflow-hidden', className)} style={{ background: b.bg }}>
      {b.src ? (
        <img src={img(b.src)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" style={{ objectPosition: b.pos }} />
      ) : (
        <svg className="absolute inset-0 size-full opacity-60" preserveAspectRatio="none">
          {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={`${(i * 29) % 100}%`} cy={`${(i * 41) % 100}%`} r={3 + (i % 4) * 2} fill="#fff" opacity=".5" />)}
        </svg>
      )}
    </div>
  )
}
