import clsx from 'clsx'
import { img } from '@/lib/assets'
import { customCosmetics } from '@/lib/cosmetics'

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
  sunrise: { label: 'Gündoğumu', bg: '#f6b48c', src: 'banners/sunrise.webp', pos: '70% 50%' },
  cappadocia: { label: 'Kapadokya', bg: '#f0a35e', src: 'banners/cappadocia.webp', pos: '50% 40%' },
  library: { label: 'Gece Kütüphanesi', bg: '#4a2e1c', src: 'banners/library.webp', pos: '60% 50%' },
  aurora: { label: 'Kuzey Işıkları', bg: '#13254a', src: 'banners/aurora.webp', pos: '50% 35%' },
  rainy: { label: 'Yağmurlu Akşam', bg: '#3a2e5a', src: 'banners/rainy.webp', pos: '50% 45%' },
  aegean: { label: 'Ege Koyu', bg: '#3cc4c9', src: 'banners/aegean.webp', pos: '55% 50%' },
  lavender: { label: 'Lavanta', bg: '#8d74c9', src: 'banners/lavender.webp', pos: '60% 45%' },
  zen: { label: 'Sakura Bahçesi', bg: '#cfe3d6', src: 'banners/zen.webp', pos: '45% 50%' },
  higo: { label: 'Higo ile Uçuş', bg: '#9fe3ea', src: 'banners/higo.webp', pos: '80% 45%' },
}

/** A built-in cover, or one an admin added with its own image (full URL). */
export function bannerOf(key?: string | null) {
  if (key && BANNERS[key]) return { ...BANNERS[key], url: BANNERS[key].src ? img(BANNERS[key].src!) : undefined }
  const c = key ? customCosmetics.banners[key] : undefined
  if (c) return { label: c.label, bg: '#cfd6e4', url: c.image, pos: c.pos }
  return { ...BANNERS.default, url: undefined }
}

/** The strip behind a profile header: an illustrated scene, or the soft default gradient. */
export function ProfileBanner({ banner, className }: { banner?: string | null; className?: string }) {
  const b = bannerOf(banner)
  return (
    // `relative` only when the caller hasn't positioned it: "relative" beats "absolute" in the
    // stylesheet order, which collapsed shop covers to zero height and left only the card colour.
    <div aria-hidden className={clsx(!/\b(absolute|fixed|sticky)\b/.test(className ?? '') && 'relative', 'overflow-hidden', className)} style={{ background: b.bg }}>
      {b.url ? (
        <img src={b.url} alt="" decoding="async" className="absolute inset-0 size-full object-cover" style={{ objectPosition: b.pos }} />
      ) : (
        <svg className="absolute inset-0 size-full opacity-60" preserveAspectRatio="none">
          {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={`${(i * 29) % 100}%`} cy={`${(i * 41) % 100}%`} r={3 + (i % 4) * 2} fill="#fff" opacity=".5" />)}
        </svg>
      )}
    </div>
  )
}
