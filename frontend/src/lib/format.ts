export const tl = (v: number | string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: Number(v) % 1 ? 2 : 0 }).format(Number(v))

export const num = (v: number) => new Intl.NumberFormat('tr-TR').format(v)

export const dateTR = (iso?: string | null, withTime = false) =>
  iso ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(iso)) : '—'

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'şimdi'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d} gün ${h} sa`
  if (h > 0) return `${h} sa ${m} dk`
  return `${m} dk`
}

export const SKILL_LABEL: Record<string, string> = {
  reading: 'Okuma',
  listening: 'Dinleme',
  speaking: 'Konuşma',
  writing: 'Yazma',
  vocabulary: 'Kelime',
  grammar: 'Dilbilgisi',
  mixed: 'Karma',
}

export const GOALS = [
  { key: 'travel', label: 'Seyahat', emoji: '✈️', text: 'Yurt dışında rahatça derdimi anlatmak' },
  { key: 'career', label: 'Kariyer', emoji: '💼', text: 'İş hayatında İngilizce kullanmak' },
  { key: 'exam', label: 'Sınav', emoji: '🎓', text: 'YDS, IELTS, TOEFL gibi sınavlara hazırlanmak' },
  { key: 'school', label: 'Okul', emoji: '📚', text: 'Derslerimde başarılı olmak' },
  { key: 'fun', label: 'Keyif', emoji: '🎬', text: 'Dizi, film ve müziği orijinalinden anlamak' },
]
