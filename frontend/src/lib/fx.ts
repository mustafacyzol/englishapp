import confetti from 'canvas-confetti'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

let ctx: AudioContext | null = null
let muted = false
export const setMuted = (m: boolean) => {
  muted = m
}

function tone(freqs: number[], dur = 0.09, type: OscillatorType = 'triangle', gain = 0.08) {
  if (muted) return
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = type
      o.frequency.value = f
      g.gain.setValueAtTime(gain, now + i * dur)
      g.gain.exponentialRampToValueAtTime(0.0001, now + (i + 1) * dur + 0.08)
      o.connect(g).connect(ctx!.destination)
      o.start(now + i * dur)
      o.stop(now + (i + 1) * dur + 0.1)
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
    tone([520], 0.04, 'sine', 0.04)
    haptic('light')
  },
  correct: () => {
    tone([660, 880], 0.08)
    haptic('success')
  },
  wrong: () => {
    tone([220, 180], 0.12, 'square', 0.05)
    haptic('error')
  },
  fanfare: () => {
    tone([523, 659, 784, 1046], 0.11)
    haptic('success')
  },
}

const COLORS = ['#FF5A36', '#FFD23F', '#2EC4A0', '#3A6FF7', '#E23D78']

export function celebrate(big = false) {
  confetti({ particleCount: big ? 160 : 80, spread: big ? 100 : 70, origin: { y: 0.65 }, colors: COLORS, scalar: 1.1, disableForReducedMotion: true })
  if (big) {
    setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0 }, colors: COLORS, disableForReducedMotion: true }), 250)
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1 }, colors: COLORS, disableForReducedMotion: true }), 400)
  }
}
