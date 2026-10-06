import { img, PHOTO } from './assets'
import type { SkillKey } from './types'

const onb = (n: string) => img(`onboarding/${n}.webp`)

/** Why the learner is here, shown as real photos, mapped onto the backend's learning goal. */
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

/** Exam tracks. ÖSYM exams first: they are what most Turkish adult learners sit. */
export const EXAMS = [
  { key: 'lgs', name: 'LGS', label: '8. sınıf, liselere geçiş', text: '10 İngilizce sorusu · MEB', color: '#ff7a3d' },
  { key: 'proficiency', name: 'Hazırlık', label: 'Üniversite hazırlık muafiyet', text: 'Proficiency · üniversiteler', color: '#0f8a55' },
  { key: 'yds', name: 'YDS', label: 'Akademik kadro ve tazminat', text: '80 soru · 180 dk · ÖSYM', color: '#e8403a' },
  { key: 'yokdil', name: 'YÖKDİL', label: 'Lisansüstü ve doçentlik', text: 'Fen, sağlık, sosyal · ÖSYM', color: '#8f7cf8' },
  { key: 'ydt', name: 'YKS-YDT', label: 'Dil bölümleri için', text: '80 soru · 120 dk · ÖSYM', color: '#2f7cf6' },
  { key: 'ielts', name: 'IELTS', label: 'Yurt dışında eğitim, göç', text: '4 beceri · band 0-9', color: '#22b573' },
  { key: 'toefl', name: 'TOEFL iBT', label: 'ABD ve Kanada üniversiteleri', text: '4 beceri · 0-120 puan', color: '#d99a00' },
] as const

export const examName = (k?: string | null) => EXAMS.find((e) => e.key === k)?.name

/**
 * Exam mode is opt-in: it shows only for learners who chose an exam goal or
 * picked an exam track, and never for children.
 */
export const examOn = (u?: { exam_target?: string | null; learning_goal?: string | null; age_group?: string | null; preferences?: { exam_mode?: boolean } } | null) =>
  !!u && u.age_group !== 'kid' && (u.preferences?.exam_mode ?? (!!u.exam_target || u.learning_goal === 'exam'))

/** Token of a finished placement test, kept until the account exists and the result is revealed. */
export const PLACEMENT_TOKEN = 'dilgo.placement_token'

/** The Turkish school ladder. The age group (safety rules) follows from stage and grade. */
export const STAGES = [
  { key: 'ilkokul', label: 'İlkokul', range: '1-4. sınıf', grades: [1, 2, 3, 4], art: 'braids', tint: 'bg-mint/15', points: ['Oyunlarla, şarkılarla ilk kelimeler', 'Okuldaki konularla birlikte', 'Veli onaylı, reklamsız'], exams: [] as string[] },
  { key: 'ortaokul', label: 'Ortaokul', range: '5-8. sınıf', grades: [5, 6, 7, 8], art: 'cap', tint: 'bg-sky/15', points: ['Okul İngilizcesi ve kelime', '8. sınıfta LGS hazırlığı', 'Yaşıtlarla lig ve düello'], exams: ['lgs'] },
  { key: 'lise', label: 'Lise', range: '9-12. sınıf', grades: [9, 10, 11, 12], art: 'headphones', tint: 'bg-lilac/15', points: ['Okul sınavlarına destek', 'YKS-YDT ve IELTS hazırlığı', 'Konuşma ve yazma pratiği'], exams: ['ydt', 'ielts', 'toefl'] },
  { key: 'universite', label: 'Üniversite', range: 'Hazırlık dahil', grades: [] as number[], art: 'glasses', tint: 'bg-butter/20', points: ['Hazırlık muafiyet sınavı', 'YDS, YÖKDİL, IELTS', 'Akademik okuma ve yazma'], exams: ['proficiency', 'yds', 'yokdil', 'ielts', 'toefl'] },
  { key: 'yetiskin', label: 'Yetişkin', range: 'Çalışan, mezun', grades: [] as number[], art: 'afro', tint: 'bg-flame/10', points: ['İş, seyahat, günlük hayat', 'Defne ile konuşma provası', 'İsteğe bağlı YDS, IELTS'], exams: ['yds', 'yokdil', 'ielts', 'toefl'] },
] as const

export type StageKey = (typeof STAGES)[number]['key']

export const ageFromStage = (stage: string, grade?: number | null): 'kid' | 'teen' | 'adult' =>
  stage === 'ilkokul' ? 'kid' : stage === 'ortaokul' ? ((grade ?? 5) <= 6 ? 'kid' : 'teen') : stage === 'lise' ? 'teen' : 'adult'

/** Exams in the order that suits the stage: the stage's own first, then the rest. */
export const examsForStage = (stage?: string | null) => {
  const own: readonly string[] = STAGES.find((s) => s.key === stage)?.exams ?? []
  return [...EXAMS].sort((a, b) => (own.indexOf(a.key) === -1 ? 99 : own.indexOf(a.key)) - (own.indexOf(b.key) === -1 ? 99 : own.indexOf(b.key)))
}
