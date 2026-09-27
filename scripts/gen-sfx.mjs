// Generates the DilGO sound family into ./wav; encode with: for f in wav/*.wav; do ffmpeg -i $f -b:a 128k frontend/public/sfx/$(basename $f .wav).mp3; done
// DilGO sound identity: one timbre ("glass marimba") and one motif (a rising fifth, G -> D).
import fs from 'node:fs'
const SR = 44100
const N = (n) => 440 * Math.pow(2, (n - 69) / 12) // midi -> Hz
const G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, Fs5 = 78, G5 = 79, A5 = 81, B5 = 83, D6 = 86, E6 = 88, G6 = 91, A6 = 93, B6 = 95, D7 = 98

function buf(sec) { return [new Float32Array(Math.ceil(sec * SR)), new Float32Array(Math.ceil(sec * SR))] }

// A struck note: marimba body (fundamental + 4th harmonic-ish partial), glassy FM bell on top, tiny click.
function note(out, t0, midi, { vel = 1, dec = 0.35, bell = 0.45, bright = 1, pan = 0, bend = 0, len } = {}) {
  const f = N(midi)
  const start = Math.floor(t0 * SR)
  const L = Math.ceil((len ?? dec * 6) * SR)
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4)
  let ph1 = 0, ph2 = 0, ph3 = 0, phm = 0
  for (let i = 0; i < L && start + i < out[0].length; i++) {
    const t = i / SR
    const fb = f * Math.pow(2, (bend * Math.min(t, 0.25)) / 12)
    const att = Math.min(1, t / 0.002)
    ph1 += 2 * Math.PI * fb / SR
    ph2 += 2 * Math.PI * fb * 3.98 / SR
    ph3 += 2 * Math.PI * fb * 2 / SR
    phm += 2 * Math.PI * fb * 3.5 / SR
    const body = Math.sin(ph1) * Math.exp(-t / dec) + 0.22 * bright * Math.sin(ph2) * Math.exp(-t / (dec * 0.18)) + 0.12 * Math.sin(ph3) * Math.exp(-t / (dec * 0.5))
    const idx = 2.2 * bright * Math.exp(-t / 0.08)
    const bl = bell * Math.sin(ph3 + idx * Math.sin(phm)) * Math.exp(-t / (dec * 1.6))
    const click = t < 0.004 ? (Math.random() * 2 - 1) * 0.25 * bright * (1 - t / 0.004) : 0
    const s = vel * att * (body * 0.7 + bl * 0.35 + click)
    out[0][start + i] += s * gl
    out[1][start + i] += s * gr
  }
}

// Soft sub "thump" for the heartbeat / wrong answers.
function thump(out, t0, f = 60, { vel = 1, dec = 0.12 } = {}) {
  const start = Math.floor(t0 * SR)
  let ph = 0
  for (let i = 0; i < dec * 6 * SR && start + i < out[0].length; i++) {
    const t = i / SR
    ph += 2 * Math.PI * f * (1 + 1.5 * Math.exp(-t / 0.02)) / SR
    const s = vel * Math.sin(ph) * Math.exp(-t / dec) * Math.min(1, t / 0.003)
    out[0][start + i] += s; out[1][start + i] += s
  }
}

// Airy shimmer noise swell (sparkle behind rewards).
function shimmer(out, t0, dur, vel = 0.15) {
  const start = Math.floor(t0 * SR)
  let lp = 0, lp2 = 0
  for (let i = 0; i < dur * SR && start + i < out[0].length; i++) {
    const t = i / SR
    const n = Math.random() * 2 - 1
    lp += 0.5 * (n - lp); const hp = n - lp
    lp2 += 0.3 * (hp - lp2)
    const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 2
    const s = vel * lp2 * env
    out[0][start + i] += s * (0.6 + 0.4 * Math.sin(t * 9)); out[1][start + i] += s * (0.6 - 0.4 * Math.sin(t * 9))
  }
}

// Small Freeverb-ish room.
function reverb(out, wet = 0.18, size = 0.78) {
  const combs = [1116, 1188, 1277, 1356], aps = [556, 441]
  for (let ch = 0; ch < 2; ch++) {
    const x = out[ch], spread = ch * 23
    const y = new Float32Array(x.length)
    for (const c of combs) {
      const d = c + spread, b = new Float32Array(d); let k = 0, filt = 0
      for (let i = 0; i < x.length; i++) {
        const o = b[k]; filt = o * 0.7 + filt * 0.3
        b[k] = x[i] * 0.015 + filt * size; k = (k + 1) % d
        y[i] += o
      }
    }
    for (const a of aps) {
      const d = a + spread, b = new Float32Array(d); let k = 0
      for (let i = 0; i < y.length; i++) { const bo = b[k]; const o = -y[i] + bo; b[k] = y[i] + bo * 0.5; k = (k + 1) % d; y[i] = o }
    }
    for (let i = 0; i < x.length; i++) x[i] = x[i] + y[i] * wet * 4
  }
}

function lowpass(out, a) { for (const x of out) { let s = 0; for (let i = 0; i < x.length; i++) { s += a * (x[i] - s); x[i] = s } } }

const MAX = { correct: 0.75, combo: 0.95, wrong: 0.55, complete: 2.3, reward: 1.7, levelup: 2.3, notify: 0.55, 'notify-success': 0.6, 'notify-error': 0.55, go: 1.0, count: 0.35, lose: 1.2, beat: 0.45, tap: 0.12, tick: 0.12 }
function finish(name, out, peak = 0.89) {
  const cut = Math.floor((MAX[name] ?? 9) * SR), fl = Math.floor(0.35 * SR)
  for (const x of out) for (let i = Math.max(0, cut - fl); i < x.length; i++) x[i] *= i >= cut ? 0 : Math.pow((cut - i) / fl, 2)
  let m = 0
  for (const x of out) for (const v of x) m = Math.max(m, Math.abs(v))
  // tail fade + trim
  let end = out[0].length
  while (end > 1000 && Math.abs(out[0][end - 1]) < 0.0004 * m && Math.abs(out[1][end - 1]) < 0.0004 * m) end--
  const n = Math.min(out[0].length, end + 800)
  const b = Buffer.alloc(44 + n * 4)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22)
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    const fade = i > n - 800 ? (n - i) / 800 : 1
    for (let c = 0; c < 2; c++) {
      let v = Math.tanh((out[c][i] / m) * peak * 1.1) / Math.tanh(1.1) * fade
      b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 4 + c * 2)
    }
  }
  fs.writeFileSync(`wav/${name}.wav`, b)
}
fs.mkdirSync('wav', { recursive: true })

// --- The family -----------------------------------------------------------
let o
// correct: the signature "Dil-GO!" rising fifth
o = buf(1.4); note(o, 0, G5, { vel: 0.8, dec: 0.16, pan: -0.15 }); note(o, 0.085, D6, { vel: 1, dec: 0.32, pan: 0.15 }); note(o, 0.085, D5, { vel: 0.25, dec: 0.3, bell: 0.1 }); reverb(o, 0.16); finish('correct', o)
// combo: the motif climbs a step further with a sparkle on top
o = buf(1.6); [G5, B5, D6, G6].forEach((m, i) => note(o, i * 0.06, m, { vel: 0.7 + i * 0.1, dec: i === 3 ? 0.4 : 0.14, pan: -0.3 + i * 0.2 })); note(o, 0.18, G5, { vel: 0.25, dec: 0.4 }); shimmer(o, 0.12, 0.5, 0.05); reverb(o, 0.2); finish('combo', o)
// wrong: the motif turned upside down, soft and muted (never harsh)
o = buf(1.0); note(o, 0, E5, { vel: 0.8, dec: 0.12, bell: 0.08, bright: 0.4 }); note(o, 0.11, B4 - 1, { vel: 0.9, dec: 0.22, bell: 0.05, bright: 0.3, bend: -1 }); thump(o, 0.11, 70, { vel: 0.3, dec: 0.08 }); lowpass(o, 0.35); reverb(o, 0.12); finish('wrong', o, 0.8)
// complete: arpeggio up, the motif on top, full chord ring-out
o = buf(3.2)
;[G4, B4, D5, G5].forEach((m, i) => note(o, i * 0.075, m, { vel: 0.6 + i * 0.08, dec: 0.18, pan: -0.4 + i * 0.25 }))
note(o, 0.33, G5, { vel: 0.8, dec: 0.2 }); note(o, 0.42, D6, { vel: 1, dec: 0.6, len: 2.6 })
;[G4, B4, D5, G5].forEach((m) => note(o, 0.42, m, { vel: 0.35, dec: 0.7, bell: 0.6, len: 2.6 }))
;[G6, B6, D7].forEach((m, i) => note(o, 0.62 + i * 0.07, m, { vel: 0.25, dec: 0.25, bell: 0.8, pan: 0.5 - i * 0.4 }))
shimmer(o, 0.4, 1.4, 0.05); reverb(o, 0.26, 0.82); finish('complete', o)
// reward: a bright bell cascade into the motif
o = buf(2.4); [D6, E6, G6, A6, B6, D7].forEach((m, i) => note(o, i * 0.045, m, { vel: 0.4 + i * 0.05, dec: 0.2, bell: 0.9, pan: (i % 2 ? 0.4 : -0.4) })); note(o, 0.32, G5, { vel: 0.7, dec: 0.2 }); note(o, 0.4, D6, { vel: 0.9, dec: 0.5, len: 2 }); note(o, 0.4, G4, { vel: 0.3, dec: 0.6, bell: 0.5 }); shimmer(o, 0.1, 1.1, 0.06); reverb(o, 0.25, 0.8); finish('reward', o)
// levelup: longer climb, octave landing
o = buf(3.0); [G4, B4, D5, G5, B5, D6].forEach((m, i) => note(o, i * 0.065, m, { vel: 0.5 + i * 0.07, dec: 0.15, pan: -0.5 + i * 0.2 })); note(o, 0.42, G6, { vel: 0.9, dec: 0.6, len: 2.4 }); [G4, D5, G5, B5].forEach((m) => note(o, 0.42, m, { vel: 0.3, dec: 0.7, bell: 0.6, len: 2.4 })); shimmer(o, 0.35, 1.3, 0.06); reverb(o, 0.26, 0.82); finish('levelup', o)
// tap: a tiny wooden tick
o = buf(0.3); note(o, 0, D6 + 12, { vel: 0.6, dec: 0.018, bell: 0.05, bright: 1.2 }); finish('tap', o, 0.7)
// notifications: the motif, small
o = buf(1.0); note(o, 0, D6, { vel: 0.7, dec: 0.1, bell: 0.7 }); note(o, 0.07, G6, { vel: 0.8, dec: 0.22, bell: 0.7 }); reverb(o, 0.14); finish('notify', o, 0.7)
o = buf(1.0); note(o, 0, G5, { vel: 0.7, dec: 0.1 }); note(o, 0.07, D6, { vel: 0.85, dec: 0.2 }); note(o, 0.14, G6, { vel: 0.5, dec: 0.25, bell: 0.8 }); reverb(o, 0.14); finish('notify-success', o, 0.72)
o = buf(1.0); note(o, 0, A5, { vel: 0.7, dec: 0.1, bell: 0.2, bright: 0.6 }); note(o, 0.09, D5, { vel: 0.8, dec: 0.2, bell: 0.1, bright: 0.5 }); lowpass(o, 0.5); reverb(o, 0.12); finish('notify-error', o, 0.72)
// duel: tick, countdown, go, heartbeat, lose
o = buf(0.3); note(o, 0, A6, { vel: 0.6, dec: 0.02, bell: 0, bright: 0.8 }); finish('tick', o, 0.55)
o = buf(0.8); note(o, 0, D5, { vel: 0.9, dec: 0.12, bell: 0.4 }); note(o, 0, D6, { vel: 0.4, dec: 0.1, bell: 0.3 }); reverb(o, 0.1); finish('count', o, 0.75)
o = buf(1.6); note(o, 0, G5, { vel: 0.9, dec: 0.12 }); note(o, 0.06, D6, { vel: 1, dec: 0.2 }); note(o, 0.12, G6, { vel: 1, dec: 0.5, bell: 0.8 }); note(o, 0.12, G4, { vel: 0.5, dec: 0.4 }); thump(o, 0.12, 55, { vel: 0.8, dec: 0.18 }); shimmer(o, 0.1, 0.6, 0.07); reverb(o, 0.2); finish('go', o)
o = buf(0.8); thump(o, 0, 58, { vel: 1, dec: 0.07 }); thump(o, 0.17, 52, { vel: 0.7, dec: 0.09 }); lowpass(o, 0.2); finish('beat', o, 0.85)
o = buf(1.8); [D6, B5, G5].forEach((m, i) => note(o, i * 0.12, m, { vel: 0.7, dec: 0.2, bell: 0.2, bright: 0.6 })); note(o, 0.36, D5, { vel: 0.8, dec: 0.5, bell: 0.2, bright: 0.5, bend: -1 }); lowpass(o, 0.5); reverb(o, 0.2); finish('lose', o, 0.8)
console.log('ok')
