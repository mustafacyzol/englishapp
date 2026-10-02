import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { BRAND } from '@/lib/brand'

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const DEFAULT_DESC = `${BRAND} ile İngilizceyi ilkokuldan üniversiteye, günde birkaç dakikada öğren: LGS, YDT, YDS ve YÖKDİL hazırlığı, kısa dersler, hikâyeler, oyunlar ve yapay zekâ öğretmen Defne.`

function meta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

/** Title, description, canonical link and share tags for the current page. */
export function useSeo({ title, description, image, noindex }: { title?: string; description?: string; image?: string; noindex?: boolean }) {
  const { pathname } = useLocation()
  useEffect(() => {
    const full = title ? `${title} | ${BRAND}` : `${BRAND} · İngilizceyi kendi hızında öğren`
    document.title = full
    const desc = description || DEFAULT_DESC
    meta('name', 'description', desc)
    meta('property', 'og:title', full)
    meta('property', 'og:description', desc)
    meta('name', 'twitter:title', full)
    meta('name', 'twitter:description', desc)
    meta('property', 'og:url', SITE + pathname)
    if (image) {
      meta('property', 'og:image', image.startsWith('http') ? image : SITE + image)
      meta('name', 'twitter:image', image.startsWith('http') ? image : SITE + image)
    }
    meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = SITE + pathname
  }, [title, description, image, noindex, pathname])
}

/** Titles for every route that has no page-specific data; app pages stay out of search. */
const ROUTES: [RegExp, string, string?][] = [
  [/^\/$/, '', ''],
  [/^\/about/, 'Hakkımızda', `Bayrak Dil Okulları’nın dijital İngilizce platformu ${BRAND}’nun hikâyesi ve ekibi.`],
  [/^\/contact/, 'İletişim', 'Sorular, kurumsal teklifler ve destek için bize yazın.'],
  [/^\/blog$/, 'Blog', 'İngilizce öğrenme ipuçları, sınav rehberleri ve kelime listeleri.'],
  [/^\/okullar/, 'Okullar için', 'Okulunuzun bütün İngilizcesi tek yerde: müdür ve öğretmen panelleri, ödev, sınıf karnesi, LGS ve YDT hazırlığı.'],
  [/^\/placement/, 'Seviye testi', '3 dakikada İngilizce seviyeni öğren, sana uygun yerden başla.'],
  [/^\/login/, 'Giriş yap'],
  [/^\/register/, 'Ücretsiz kayıt ol', 'Kişisel İngilizce planını 1 dakikada kur ve ücretsiz başla.'],
  [/^\/forgot-password/, 'Şifremi unuttum'],
  [/^\/(terms|privacy|cookies|distance-sales|refund)/, 'Yasal'],
]
const APP: [RegExp, string][] = [
  [/^\/learn/, 'Yol haritası'], [/^\/stories/, 'Hikâyeler'], [/^\/practice/, 'Kelime pratiği'], [/^\/ai\/writing/, 'Yazma atölyesi'], [/^\/ai/, 'Defne AI'],
  [/^\/duel/, 'Arena'], [/^\/leagues/, 'Ligler'], [/^\/exam/, 'Sınav modu'], [/^\/rewards/, 'Ödüller'], [/^\/shop/, 'Mağaza'], [/^\/coupons/, 'Kuponlar'], [/^\/quests/, 'Görevler'],
  [/^\/profile/, 'Profil'], [/^\/settings/, 'Ayarlar'], [/^\/notifications/, 'Bildirimler'], [/^\/premium/, 'Premium'], [/^\/lesson/, 'Ders'], [/^\/u\//, 'Profil'],
  [/^\/admin/, 'Yönetim'], [/^\/kurum/, 'Kurum paneli'],
]

/** Sets the page title and meta for any route (blog posts set their own). */
export function RouteSeo() {
  const { pathname } = useLocation()
  const pub = ROUTES.find(([re]) => re.test(pathname))
  const app = pub ? null : APP.find(([re]) => re.test(pathname))
  const skip = /^\/blog\/.+/.test(pathname)
  useSeo(skip ? { title: undefined } : pub ? { title: pub[1] || undefined, description: pub[2] || undefined } : { title: app?.[1], noindex: true })
  return null
}
