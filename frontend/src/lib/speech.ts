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

type SpeakOpts = { rate?: number; voice?: string; onStart?: () => void; onEnd?: () => void; onBoundary?: (charIndex: number) => void }

/**
 * Reads English aloud. With a neural voice on the server (Yönetim > Entegrasyonlar)
 * every word, sentence and story line is real English audio, whatever the phone's
 * language; clips are cached in memory. Otherwise an English browser voice is used.
 */
/** The learner's own reading speed and voice (Ayarlar > Görünüm ve ses), used when a call gives none. */
let defaults: { rate?: number; voice?: string } = {}
export const setSpeechDefaults = (d: { rate?: number; voice?: string }) => { defaults = d }

export function speak(text: string, given: SpeakOpts = {}) {
  const opts = { ...given, rate: given.rate ?? defaults.rate, voice: given.voice ?? defaults.voice }
  if (tuning.speech && Date.now() > serverDownUntil) {
    void speakServer(text, opts)
    return
  }
  speakBrowser(text, opts)
}

const clips = new Map<string, string>()
let serverDownUntil = 0
let clip: HTMLAudioElement | null = null
let clipGen = 0

async function speakServer(text: string, opts: SpeakOpts) {
  stopSpeaking()
  const gen = ++clipGen
  const key = text.trim().toLowerCase()
  let url = clips.get(key)
  if (!url) {
    const { postBlob } = await import('./api')
    const blob = await postBlob('/speech', { text })
    if (!blob) {
      // not signed in yet, busy or offline: use the browser voice for a minute, then try again
      serverDownUntil = Date.now() + 60_000
      if (gen === clipGen) speakBrowser(text, opts)
      return
    }
    url = URL.createObjectURL(blob)
    if (clips.size > 300) { const [k, u] = clips.entries().next().value!; URL.revokeObjectURL(u); clips.delete(k) }
    clips.set(key, url)
  }
  if (gen !== clipGen) return
  const el = new Audio(url)
  clip = el
  el.playbackRate = Math.min(1.2, Math.max(0.6, (opts.rate ?? 0.95) / 0.95))
  let t = 0
  el.onplay = () => {
    opts.onStart?.()
    if (opts.onBoundary) t = window.setInterval(() => el.duration && opts.onBoundary?.(Math.round((el.currentTime / el.duration) * text.length)), 120)
  }
  const end = () => { clearInterval(t); if (clip === el) clip = null; opts.onEnd?.() }
  el.onended = end
  el.onerror = end
  el.onpause = () => { if (!el.ended) end() }
  await el.play().catch(end)
}

function speakBrowser(text: string, opts: SpeakOpts = {}) {
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
  // Even with no English voice installed, asking for en-GB makes most engines switch language.
  u.lang = voice?.lang ?? 'en-GB'
  u.rate = opts.rate ?? 0.95
  u.onstart = () => opts.onStart?.()
  u.onend = () => opts.onEnd?.()
  u.onerror = () => opts.onEnd?.()
  if (opts.onBoundary) u.onboundary = (e) => opts.onBoundary?.(e.charIndex)
  speechSynthesis.speak(u)
}

export const stopSpeaking = () => {
  clipGen++
  if (clip) { const c = clip; clip = null; c.pause() }
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

/** The browser hears by itself, or the server can transcribe a short recording instead. */
const canRecord = () => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
export const canListen = () => !!recognitionCtor() || (tuning.stt && canRecord())

type ListenHandlers = { onPartial?: (t: string) => void; onFinal: (t: string) => void; onError?: (e: string) => void; onEnd?: () => void }

/**
 * Fallback for browsers without speech recognition: record up to eight seconds,
 * send the clip to /speech/transcribe and hand back the text. Same contract as
 * `listen`: the returned function stops (and keeps), `.cancel` drops everything.
 */
function listenOnServer(handlers: ListenHandlers) {
  let live = true
  let rec: MediaRecorder | null = null
  let stream: MediaStream | null = null
  const chunks: Blob[] = []
  const finish = () => { stream?.getTracks().forEach((t) => t.stop()) }
  void navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
    if (!live) { s.getTracks().forEach((t) => t.stop()); return }
    stream = s
    rec = new MediaRecorder(s)
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = async () => {
      finish()
      if (!live) return
      handlers.onPartial?.('…')
      try {
        const { api } = await import('./api')
        const form = new FormData()
        form.append('audio', new Blob(chunks, { type: rec?.mimeType || 'audio/webm' }), 'speech')
        const r = await api<{ text: string }>('/speech/transcribe', { method: 'POST', body: form })
        if (live && r.text) handlers.onFinal(r.text)
      } catch {
        if (live) handlers.onError?.('network')
      }
      if (live) { live = false; handlers.onEnd?.() }
    }
    rec.start()
    setTimeout(() => { if (rec?.state === 'recording') rec.stop() }, 8000)
  }).catch(() => { if (live) { live = false; handlers.onError?.('not-allowed'); handlers.onEnd?.() } })
  const stop = () => { if (rec?.state === 'recording') rec.stop() }
  stop.cancel = () => { live = false; try { if (rec?.state === 'recording') rec.stop() } catch { /* stopped */ } finish() }
  activeCancels.add(stop.cancel)
  return stop
}

export function listen(handlers: ListenHandlers) {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    if (tuning.stt && canRecord()) return listenOnServer(handlers)
    handlers.onError?.('unsupported')
    return () => {}
  }
  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.maxAlternatives = 1
  rec.continuous = false
  let finalText = ''
  // once the caller stops listening (or leaves the page) nothing may call back into it:
  // no late "aborted" error toast on the next page, no half sentence sent after leaving
  let live = true
  rec.onresult = (e) => {
    if (!live) return
    let interim = ''
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    handlers.onPartial?.(finalText + interim)
  }
  rec.onerror = (e) => {
    // "aborted" is our own stop; "no-speech" just means silence, which onEnd already covers
    if (!live || e.error === 'aborted' || e.error === 'no-speech') return
    handlers.onError?.(e.error)
  }
  rec.onend = () => {
    if (!live) return
    live = false
    if (finalText) handlers.onFinal(finalText.trim())
    handlers.onEnd?.()
  }
  try {
    rec.start()
  } catch {
    live = false
    handlers.onError?.('busy')
    return () => {}
  }
  /** Stop and keep what was heard (the mic button). */
  const stop = () => { try { rec.stop() } catch { /* already stopped */ } }
  /** Stop and forget everything (leaving the page). */
  stop.cancel = () => {
    live = false
    rec.onresult = rec.onerror = rec.onend = null
    try { rec.abort() } catch { /* already stopped */ }
  }
  activeCancels.add(stop.cancel)
  return stop
}

const activeCancels = new Set<() => void>()
/** Ends every open microphone session; called on every route change as a safety net. */
export function cancelAllListening() {
  activeCancels.forEach((c) => c())
  activeCancels.clear()
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
export type DefneTuning = { voice: boolean; speech: boolean; lipsync: boolean; gain: number; rate: number; stt: boolean }
const tuning: DefneTuning = { voice: true, speech: false, lipsync: true, gain: 4, rate: 1, stt: false }
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
    speakBrowser(text, {
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
