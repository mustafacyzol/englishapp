import confetti from 'canvas-confetti'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/*
  Recorded, mastered sound effects (public/sfx) played through Web Audio so they
  start instantly and can overlap. Buffers are fetched once on first use and
  cached; if a file can't load (offline, blocked) we fall back to a soft synth
  so the feedback never goes silent.
*/
type Sound = 'tap' | 'correct' | 'combo' | 'wrong' | 'complete' | 'reward' | 'levelup'

const GAIN: Record<Sound, number> = { tap: 0.35, correct: 0.55, combo: 0.8, wrong: 0.7, complete: 0.5, reward: 0.45, levelup: 0.5 }

let ctx: AudioContext | null = null
let muted = false
const buffers = new Map<Sound, Promise<AudioBuffer | null>>()

export const setMuted = (m: boolean) => {
  muted = m
}

const audio = () => {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function load(name: Sound) {
  let p = buffers.get(name)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}sfx/${name}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((b) => audio().decodeAudioData(b))
      .catch(() => null)
    buffers.set(name, p)
  }
  return p
}

/** Warm the cache for the sounds a screen is about to use (e.g. when a lesson opens). */
export function preloadSfx(...names: Sound[]) {
  try {
    names.forEach(load)
  } catch {
    /* audio unsupported */
  }
}

function synth(freqs: number[], dur = 0.09) {
  const c = audio()
  const now = c.currentTime
  freqs.forEach((f, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0.06, now + i * dur)
    g.gain.exponentialRampToValueAtTime(0.0001, now + (i + 1) * dur + 0.12)
    o.connect(g).connect(c.destination)
    o.start(now + i * dur)
    o.stop(now + (i + 1) * dur + 0.15)
  })
}

const FALLBACK: Record<Sound, number[]> = {
  tap: [620],
  correct: [784, 1175],
  combo: [784, 988, 1319],
  wrong: [330, 262],
  complete: [523, 659, 784, 1046],
  reward: [659, 880, 1319],
  levelup: [523, 784, 1046, 1568],
}

function play(name: Sound) {
  if (muted) return
  try {
    void load(name).then((buf) => {
      const c = audio()
      if (!buf) return synth(FALLBACK[name])
      const src = c.createBufferSource()
      const g = c.createGain()
      g.gain.value = GAIN[name]
      src.buffer = buf
      src.connect(g).connect(c.destination)
      src.start()
    })
  } catch {
    /* audio blocked */
  }
}

const haptic = (kind: 'light' | 'success' | 'error') => {
  if (!Capacitor.isNativePlatform()) return
  if (kind === 'light') Haptics.impact({ style: ImpactStyle.Light })
  else Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Error })
}

export const sfx = {
  tap: () => {
    play('tap')
    haptic('light')
  },
  /** A streak of right answers gets the brighter sparkle take — a small variable reward. */
  correct: (combo = 0) => {
    play(combo >= 3 ? 'combo' : 'correct')
    haptic('success')
  },
  wrong: () => {
    play('wrong')
    haptic('error')
  },
  complete: () => {
    play('complete')
    haptic('success')
  },
  reward: () => {
    play('reward')
    haptic('success')
  },
  levelup: () => {
    play('levelup')
    haptic('success')
  },
  /** @deprecated kept for older call sites — the chest/reward sound. */
  fanfare: () => {
    play('reward')
    haptic('success')
  },
}

const COLORS = ['#e8403a', '#ffc233', '#22b573', '#2f7cf6', '#ef4e7b']

export function celebrate(big = false) {
  confetti({ particleCount: big ? 160 : 80, spread: big ? 100 : 70, origin: { y: 0.65 }, colors: COLORS, scalar: 1.1, disableForReducedMotion: true })
  if (big) {
    setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0 }, colors: COLORS, disableForReducedMotion: true }), 250)
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1 }, colors: COLORS, disableForReducedMotion: true }), 400)
  }
}
