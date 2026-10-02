import { useSyncExternalStore } from 'react'

/**
 * Interface language (the course language is always English). Turkish is the
 * default; English covers the navigation, headers, auth screens and settings so
 * international staff, parents and schools can find their way around.
 */
export type Lang = 'tr' | 'en'
const KEY = 'dilgo.lang'

const read = (): Lang => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'tr' || v === 'en') return v
  } catch {
    /* storage blocked */
  }
  return 'tr'
}

let current: Lang = read()
const listeners = new Set<() => void>()

export function setLang(l: Lang) {
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* storage blocked */
  }
  document.documentElement.lang = l
  listeners.forEach((f) => f())
}

export function initLang() {
  document.documentElement.lang = current
}

const subscribe = (f: () => void) => {
  listeners.add(f)
  return () => listeners.delete(f)
}

const EN: Record<string, string> = {
  // public header / footer
  'Özellikler': 'Features',
  'Nasıl çalışır': 'How it works',
  'Fiyatlar': 'Pricing',
  'Kurumlar': 'For schools',
  'Blog': 'Blog',
  'Hakkımızda': 'About',
  'İletişim': 'Contact',
  'Giriş yap': 'Sign in',
  'Ücretsiz başla': 'Start free',
  'Kayıt ol': 'Sign up',
  'Menü': 'Menu',
  'Ben': 'Me',
  'Kelimeler': 'Words',
  'Yöntem': 'Method',
  'Kimler için': 'Who it’s for',
  'Dene': 'Try it',
  'Uygulamaya git': 'Open the app',
  'Yönetim': 'Admin',
  // app nav
  'Öğren': 'Learn',
  'Yol haritası': 'Path',
  'Hikâyeler': 'Stories',
  'Pratik': 'Practice',
  'Kelime pratiği': 'Word practice',
  'Sınav modu': 'Exam prep',
  'Defne ile konuş': 'Talk to Defne',
  'Defne': 'Defne',
  'Yarış': 'Compete',
  'Arena': 'Arena',
  'Gölge Düellosu': 'Shadow Duel',
  'Ligler': 'Leagues',
  'Görevler': 'Quests',
  'Hesabım': 'My account',
  'Ödüller': 'Rewards',
  'Mağaza': 'Shop',
  'Kuponlar': 'Coupons',
  'Kasa': 'Vault',
  'Profil': 'Profile',
  'Ayarlar': 'Settings',
  'Daha': 'More',
  'Düello': 'Duel',
  'Kurum paneli': 'School panel',
  'Yönetim paneli': 'Admin panel',
  'Çıkış yap': 'Sign out',
  'Bildirimler': 'Notifications',
  'Yeni': 'New',
  // auth
  'Tekrar hoş geldin': 'Welcome back',
  'Hesabına giriş yap ve kaldığın yerden devam et.': 'Sign in and pick up where you left off.',
  'Google ile devam et': 'Continue with Google',
  'Apple ile devam et': 'Continue with Apple',
  'veya e-posta ile': 'or with e-mail',
  'E-posta veya kullanıcı adı': 'E-mail or username',
  'Şifre': 'Password',
  'Beni hatırla': 'Remember me',
  'Şifremi unuttum': 'Forgot password',
  'Hesabın yok mu?': 'New here?',
  'Ücretsiz kayıt ol': 'Create a free account',
  'Şifreyi göster': 'Show password',
  'Şifreyi gizle': 'Hide password',
  'Yakında': 'Coming soon',
  'Bu cihazda 60 gün açık kalır.': 'Keeps you signed in on this device.',
  // language menu
  'Dil': 'Language',
  'Arayüz dili': 'Interface language',
  'Ders içeriği her zaman İngilizce.': 'Lessons are always in English.',
  // settings
  'Görünüm': 'Appearance',
  'Tema': 'Theme',
  'Açık': 'Light',
  'Koyu': 'Dark',
  'Sistem': 'System',
}

/** Translate a Turkish UI string; falls back to the Turkish text. */
export function tr(text: string, lang: Lang = current) {
  return lang === 'en' ? (EN[text] ?? text) : text
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, () => current, () => current)
  return { lang, setLang, t: (s: string) => tr(s, lang) }
}
