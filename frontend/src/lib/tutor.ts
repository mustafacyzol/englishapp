import { img } from './assets'

/**
 * Defne — DilGO's AI English coach, in one place so her name, voice and look
 * stay consistent on every screen. "Defne" is Turkish for laurel, the old
 * crown of victory: she wears a small gold laurel pin, and the laurel is her
 * mark wherever she congratulates you.
 */
export const TUTOR = {
  name: 'Defne',
  role: 'İngilizce koçun',
  tagline: 'Seni tanır, hatanı Türkçe açıklar, her gün bir adım ileri taşır.',
  /** Face crop for chat bubbles and small avatars. */
  avatar: img('defne/avatar.webp'),
  /** Head-and-shoulders call portrait (3:4) — also the poster for the call videos. */
  portrait: img('defne/call.webp'),
  /** Transparent cut-outs for reactions inside lessons. */
  pose: {
    neutral: img('defne/neutral.webp'),
    wave: img('defne/wave.webp'),
    cheer: img('defne/cheer.webp'),
    think: img('defne/think.webp'),
  },
  /** Video call loops: a listening idle and a lip-synced talking take. */
  video: {
    idle: img('defne/idle.mp4'),
    talk: img('defne/talk.mp4'),
  },
} as const

export type TutorPose = keyof typeof TUTOR.pose
