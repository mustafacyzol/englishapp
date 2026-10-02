/**
 * Listening & speaking on top of the Web Speech API.
 * Works in Chrome/Edge/Safari and inside Capacitor's WebView (Android Chrome WebView
 * supports synthesis; recognition falls back gracefully, see `canListen`).
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

export function speak(text: string, opts: { rate?: number; voice?: string; onStart?: () => void; onEnd?: () => void; onBoundary?: (charIndex: number) => void } = {}) {
  if (!canSpeak()) {
    // No synthesis (some WebViews, headless): still drive the UI for a natural reading time.
    opts.onStart?.()
    const words = text.split(/\s+/).length
    let i = 0
    const t = setInterval(() => {
      const idx = text.split(/\s+/).slice(0, ++i).join(' ').length
      opts.onBoundary?.(idx)
      if (i >= words) {
        clearInterval(t)
        opts.onEnd?.()
      }
    }, 330)
    return
  }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(opts.voice)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'en-GB'
  u.rate = opts.rate ?? 0.95
  u.onstart = () => opts.onStart?.()
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

/** Word-overlap similarity 0..1, mirrors the server-side check for speaking exercises. */
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

type VoiceOpts = { rate?: number; voice?: string; onStart?: () => void; onEnd?: () => void; onBoundary?: (charIndex: number) => void; onLevel?: (level: number) => void }

/** Admin-tuned voice and lip-sync values from /config (Yönetim → Entegrasyonlar). */
export type DefneTuning = { voice: boolean; lipsync: boolean; gain: number; rate: number }
const tuning: DefneTuning = { voice: true, lipsync: true, gain: 4, rate: 1 }
export function setDefneTuning(t?: Partial<DefneTuning>) {
  if (t) Object.assign(tuning, t)
}

let audioCtx: AudioContext | null = null
let current: { stop: () => void } | null = null

/**
 * Defne's voice. When the server has a neural voice configured (POST /ai/tts) the
 * reply is real audio, and `onLevel` reports its loudness 0..1 every frame, so the
 * avatar's mouth opens with the actual syllables and closes in the pauses. Without
 * it, the browser voice is used and each spoken word gives the mouth a short pulse.
 */
/** Bumped on every new line and on stop, so a reply that was still downloading never plays late. */
let voiceGen = 0

export async function speakNeural(text: string, opts: VoiceOpts = {}) {
  current?.stop()
  current = null
  stopSpeaking()
  const gen = ++voiceGen
  const { postBlob } = await import('./api')
  // no neural voice configured: skip the round trip and use the browser voice
  const blob = tuning.voice ? await postBlob('/ai/tts', { text }) : null
  // Something newer started (or the call was stopped) while this line was on its way.
  if (gen !== voiceGen) return
  if (!blob) {
    let pulse = 0
    let raf = 0
    const decay = () => {
      pulse *= 0.86
      opts.onLevel?.(tuning.lipsync ? pulse : 0)
      raf = requestAnimationFrame(decay)
    }
    speak(text, {
      ...opts,
      rate: (opts.rate ?? 0.95) * tuning.rate,
      onStart: () => {
        opts.onStart?.()
        raf = requestAnimationFrame(decay)
      },
      onBoundary: (i) => {
        pulse = 1
        opts.onBoundary?.(i)
      },
      onEnd: () => {
        cancelAnimationFrame(raf)
        opts.onLevel?.(0)
        // only a line that finished by itself hands the turn back (not one that was cut off)
        if (gen === voiceGen) opts.onEnd?.()
      },
    })
    current = { stop: () => { cancelAnimationFrame(raf); stopSpeaking() } }
    return
  }

  const url = URL.createObjectURL(blob)
  const el = new Audio(url)
  el.playbackRate = Math.min(1.15, Math.max(0.8, (opts.rate ?? 1) * tuning.rate))
  audioCtx ??= new AudioContext()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  const src = audioCtx.createMediaElementSource(el)
  const analyser = audioCtx.createAnalyser()
  analyser.fftSize = 512
  src.connect(analyser).connect(audioCtx.destination)
  const buf = new Uint8Array(analyser.fftSize)
  let raf = 0
  const tick = () => {
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (const v of buf) sum += ((v - 128) / 128) ** 2
    opts.onLevel?.(tuning.lipsync ? Math.min(1, Math.sqrt(sum / buf.length) * tuning.gain) : 0)
    if (el.duration) opts.onBoundary?.(Math.round((el.currentTime / el.duration) * text.length))
    raf = requestAnimationFrame(tick)
  }
  const cleanup = () => {
    cancelAnimationFrame(raf)
    opts.onLevel?.(0)
    URL.revokeObjectURL(url)
  }
  const done = () => {
    cleanup()
    if (gen === voiceGen) opts.onEnd?.()
  }
  el.onplay = () => {
    opts.onStart?.()
    raf = requestAnimationFrame(tick)
  }
  el.onended = done
  el.onerror = done
  current = { stop: () => { el.pause(); cleanup() } }
  await el.play().catch(done)
}

export function stopVoice() {
  voiceGen++
  current?.stop()
  current = null
  stopSpeaking()
}
