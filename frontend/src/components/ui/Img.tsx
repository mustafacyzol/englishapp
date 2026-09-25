import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react'
import { LQIP } from '@/lib/lqip'

type Props = ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }

/**
 * An <img> that never shows an empty box. A 20px blurred preview of the file is
 * baked into the bundle and painted as the element's own background, so the picture
 * is there on the first frame and simply sharpens when the real file lands.
 *
 * Cut-out objects (transparent icons, medals, trophies) skip the preview — a blurred
 * blob behind a transparent subject looks like a smudge — and fade in instead.
 */
export function Img({ src, style, priority, onLoad, ...rest }: Props) {
  const key = typeof src === 'string' ? src.slice(src.indexOf('img/') + 4) : ''
  const ph = LQIP[key]
  const [loaded, setLoaded] = useState(false)
  const pending = !!ph && !loaded

  const preview: CSSProperties =
    pending && !ph.a
      ? { backgroundImage: `url("${ph.d}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : pending
        ? { opacity: 0 }
        : {}

  return (
    <img
      {...rest}
      src={src}
      loading={priority ? 'eager' : (rest.loading ?? 'lazy')}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onLoad={(e) => {
        setLoaded(true)
        onLoad?.(e)
      }}
      onError={() => setLoaded(true)}
      style={{ transition: 'opacity .35s ease', ...preview, ...style }}
    />
  )
}
