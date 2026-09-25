/**
 * Listening & speaking on top of the Web Speech API.
 * Works in Chrome/Edge/Safari and inside Capacitor's WebView (Android Chrome WebView
 * supports synthesis; recognition falls back gracefully — see `canListen`).
 */

let voicesCache: SpeechSynthesisVoice[] = []

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  const v = speechSynthesis.getVoices()
  if (v.length) voicesCache = v
  return voicesCache
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices()
  speechSynthesis.onvoiceschanged = () => loadVoices()
}

export const canSpeak = () => typeof speechSynthesis !== 'undefined'

export function englishVoices() {
  return loadVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
}

function pickVoice(preferred?: string) {
  const voices = englishVoices()
  if (preferred) {
    const match = voices.find((v) => v.name === preferred)
    if (match) return match
  }
  return (
    voices.find((v) => /natural|neural|premium|enhanced/i.test(v.name) && v.lang === 'en-GB') ||
    voices.find((v) => /natural|neural|premium|enhanced|google/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-GB') ||
    voices.find((v) => v.lang === 'en-US') ||
    voices[0]
  )
}

export function speak(text: string, opts: { rate?: number; voice?: string; onEnd?: () => void; onBoundary?: (charIndex: number) => void } = {}) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(opts.voice)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'en-GB'
  u.rate = opts.rate ?? 0.95
  u.onend = () => opts.onEnd?.()
  u.onerror = () => opts.onEnd?.()
  if (opts.onBoundary) u.onboundary = (e) => opts.onBoundary?.(e.charIndex)
  speechSynthesis.speak(u)
}

export const stopSpeaking = () => {
  if (canSpeak()) speechSynthesis.cancel()
}

type RecognitionCtor = new () => {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => !!recognitionCtor()

export function listen(handlers: { onPartial?: (t: string) => void; onFinal: (t: string) => void; onError?: (e: string) => void; onEnd?: () => void }) {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    handlers.onError?.('unsupported')
    return () => {}
  }
  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.maxAlternatives = 1
  rec.continuous = false
  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    handlers.onPartial?.(finalText + interim)
  }
  rec.onerror = (e) => handlers.onError?.(e.error)
  rec.onend = () => {
    if (finalText) handlers.onFinal(finalText.trim())
    handlers.onEnd?.()
  }
  rec.start()
  return () => rec.stop()
}

/** Word-overlap similarity 0..1 — mirrors the server-side check for speaking exercises. */
export function similarity(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const wa = norm(a)
  const wb = norm(b)
  if (!wa.length || !wb.length) return 0
  const setB = new Set(wb)
  const matched = wa.filter((w) => setB.has(w)).length
  return matched / Math.max(wa.length, wb.length)
}

export function normalize(s: string) {
  return s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
