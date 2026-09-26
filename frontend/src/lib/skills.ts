import { useQuery } from '@tanstack/react-query'
import { BookOpen, Headphones, Mic, PenLine, type LucideIcon } from 'lucide-react'
import { get } from './api'
import { PHOTO } from './assets'
import type { SkillKey } from './types'

/** One visual identity per skill, used everywhere the four skills appear. */
export const SKILL: Record<SkillKey, { label: string; verb: string; icon: LucideIcon; photo: string; bg: string; text: string; soft: string; hex: string; to: string }> = {
  reading: { label: 'Okuma', verb: 'Oku', icon: BookOpen, photo: PHOTO.read, bg: 'bg-butter', text: 'text-butter-deep', soft: 'bg-butter/15', hex: '#ffc233', to: '/stories' },
  listening: { label: 'Dinleme', verb: 'Dinle', icon: Headphones, photo: PHOTO.listen, bg: 'bg-sky', text: 'text-sky', soft: 'bg-sky/12', hex: '#2f7cf6', to: '/practice' },
  speaking: { label: 'Konuşma', verb: 'Konuş', icon: Mic, photo: PHOTO.speak, bg: 'bg-flame', text: 'text-flame', soft: 'bg-flame/10', hex: '#e8403a', to: '/ai?call=1' },
  writing: { label: 'Yazma', verb: 'Yaz', icon: PenLine, photo: PHOTO.write, bg: 'bg-mint', text: 'text-mint-deep', soft: 'bg-mint/12', hex: '#22b573', to: '/ai/writing' },
}
export const SKILLS: SkillKey[] = ['reading', 'listening', 'speaking', 'writing']

export interface SkillStat { key: SkillKey; label: string; xp: number; level: number; progress: number; to_next: number; week_xp: number; trend: number[] }
export interface SkillReport { skills: SkillStat[]; weakest: SkillKey; strongest: SkillKey; balance: number }

export const useSkills = () => useQuery({ queryKey: ['skills'], queryFn: () => get<SkillReport>('/me/skills'), staleTime: 60_000 })
