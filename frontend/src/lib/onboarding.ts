import { img, PHOTO } from './assets'
import type { SkillKey } from './types'

const onb = (n: string) => img(`onboarding/${n}.webp`)

/** Why the learner is here — shown as real photos, mapped onto the backend's learning goal. */
export const MOTIVATIONS = [
  { key: 'abroad', goal: 'travel', label: 'Yurt dışında rahat olmak', text: 'Seyahat, gurbet, yeni bir şehir', photo: onb('travel') },
  { key: 'job', goal: 'career', label: 'İşimde yükselmek', text: 'Toplantı, e-posta, mülakat', photo: onb('career') },
  { key: 'confidence', goal: 'fun', label: 'Kendimi rahat ifade etmek', text: 'Donmadan, çekinmeden konuşmak', photo: PHOTO.speak },
  { key: 'exam', goal: 'exam', label: 'Sınava hazırlanmak', text: 'YDS, IELTS, TOEFL, okul', photo: PHOTO.write },
  { key: 'hobby', goal: 'fun', label: 'Dizi, film ve müzik', text: 'Altyazısız anlamak', photo: onb('movies') },
  { key: 'kids', goal: 'school', label: 'Okulda başarılı olmak', text: 'Ders ve ödevlerde destek', photo: PHOTO.classroom },
] as const

export const INTERESTS = [
  { key: 'travel', label: 'Seyahat', photo: onb('travel') },
  { key: 'career', label: 'İş dünyası', photo: onb('career') },
  { key: 'movies', label: 'Film & dizi', photo: onb('movies') },
  { key: 'music', label: 'Müzik', photo: onb('music') },
  { key: 'games', label: 'Oyun', photo: onb('games') },
  { key: 'sports', label: 'Spor', photo: onb('sports') },
  { key: 'tech', label: 'Teknoloji', photo: onb('tech') },
  { key: 'food', label: 'Yemek', photo: onb('food') },
] as const

export const STUDY_TIMES = [
  { key: 'morning', label: 'Sabah', text: 'Güne başlarken', photo: onb('morning') },
  { key: 'lunch', label: 'Öğle arası', text: 'Mola vermişken', photo: onb('lunch') },
  { key: 'evening', label: 'Akşam', text: 'Eve dönüş yolunda', photo: onb('evening') },
  { key: 'night', label: 'Gece', text: 'Uyumadan önce', photo: onb('night') },
] as const

export const PACES = [
  { xp: 10, label: 'Hafif', minutes: 5 },
  { xp: 20, label: 'Düzenli', minutes: 10 },
  { xp: 30, label: 'Kararlı', minutes: 15 },
  { xp: 50, label: 'Yoğun', minutes: 20 },
] as const

export const FOCUS_TEXT: Record<SkillKey, string> = {
  reading: 'Okuduğumu anlamakta zorlanıyorum',
  listening: 'Konuşulanı yakalayamıyorum',
  speaking: 'Konuşurken donup kalıyorum',
  writing: 'Yazarken hata yapmaktan çekiniyorum',
}

export const timeLabel = (k?: string | null) => STUDY_TIMES.find((t) => t.key === k)?.label
