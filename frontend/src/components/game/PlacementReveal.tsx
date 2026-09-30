import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { BookOpen, Headphones, PenLine, Type } from 'lucide-react'
import { post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { PLACEMENT_TOKEN } from '@/lib/onboarding'
import type { Me } from '@/lib/types'
import { celebrate } from '@/lib/fx'
import { Modal } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { higoImg } from './Higo'

interface Result { level: string; score: number; skills: Record<'vocabulary' | 'grammar' | 'reading' | 'listening', number>; bands: Record<string, { total: number; correct: number }> }

const LEVEL_TEXT: Record<string, [string, string]> = {
  A1: ['Başlangıç', 'Temelleri birlikte sağlamlaştıralım. Yolun ilk duraklarından başlıyorsun.'],
  A2: ['Temel', 'Günlük konuşmaları anlıyorsun. Şimdi geçmişi anlatmayı ve plan yapmayı öğrenelim.'],
  B1: ['Orta', 'Bağımsız bir kullanıcısın. Akıcılık ve deneyim anlatımı üzerine çalışacağız.'],
  B2: ['Orta üstü', 'Çok iyisin. İnce anlam farkları, fikir savunma ve iş İngilizcesi seni bekliyor.'],
  C1: ['İleri', 'Neredeyse akıcısın. Zorlu hikâyeler ve tartışma senaryoları seni geliştirecek.'],
  C2: ['Ustalık', 'Etkileyici! Defne ile zor konularda tartışmaya hazır ol.'],
}
const SKILLS = [
  { k: 'vocabulary', l: 'Kelime', icon: Type, c: '#2f7cf6' },
  { k: 'grammar', l: 'Dilbilgisi', icon: PenLine, c: '#8f7cf8' },
  { k: 'reading', l: 'Okuma', icon: BookOpen, c: '#e0a100' },
  { k: 'listening', l: 'Dinleme', icon: Headphones, c: '#22b573' },
] as const

/**
 * The moment the placement result is revealed: right after sign-up or sign-in,
 * the stored test is attached to the account, and the level, the four skills
 * and what comes next are shown once.
 */
export function PlacementReveal() {
  const { user, setUser } = useAuth()
  const qc = useQueryClient()
  const [res, setRes] = useState<Result | null>(null)

  useEffect(() => {
    if (!user) return
    let live = true
    ;(async () => {
      const token = await storage.get(PLACEMENT_TOKEN)
      if (!token) return void window.dispatchEvent(new Event('dilgo:reveal-done'))
      try {
        const r = await post<{ result: Result; user: Me }>('/placement/claim', { token })
        if (!live) return
        setUser(r.user)
        qc.invalidateQueries({ queryKey: ['path'] })
        setRes(r.result)
        celebrate(true)
      } catch {
        /* expired or not ours: nothing to reveal */
        window.dispatchEvent(new Event('dilgo:reveal-done'))
      }
      await storage.remove(PLACEMENT_TOKEN)
    })()
    return () => { live = false }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!res) return null
  const [name, text] = LEVEL_TEXT[res.level] ?? LEVEL_TEXT.A1
  const close = () => {
    setRes(null)
    window.dispatchEvent(new Event('dilgo:reveal-done'))
  }
  return (
    <Modal open onClose={close} className="max-w-md">
      <div className="text-center">
        <img src={higoImg('cheer')} alt="" className="mx-auto -mt-2 w-20" />
        <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-flame">Seviye tespit sonucun</p>
        <motion.p initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.15 }} className="mt-1 font-display text-7xl font-black leading-none tracking-tight">{res.level}</motion.p>
        <p className="mt-1 font-display text-lg font-black">{name}</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">{text}</p>
      </div>
      <div className="mt-5 space-y-2.5 rounded-2xl bg-paper-2 p-4">
        {SKILLS.map((s, k) => (
          <div key={s.k} className="flex items-center gap-3">
            <s.icon className="size-4 shrink-0" style={{ color: s.c }} />
            <span className="w-20 shrink-0 text-sm font-bold">{s.l}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-card">
              <motion.span className="block h-full rounded-full" style={{ background: s.c }} initial={{ width: 0 }} animate={{ width: `${Math.max(4, res.skills[s.k] ?? 0)}%` }} transition={{ delay: 0.3 + k * 0.1, type: 'spring', stiffness: 90, damping: 18 }} />
            </span>
            <span className="w-9 text-right font-mono text-xs font-bold tabular-nums text-ink-soft">%{res.skills[s.k] ?? 0}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">Yol haritan bu seviyeye göre açıldı. İstediğin zaman Ayarlar'dan değiştirebilirsin.</p>
      <Button block className="mt-4" onClick={close}>Yoluma başla</Button>
    </Modal>
  )
}
