import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { patch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { leagueImg, rewardImg, unitImg } from '@/lib/assets'
import { SKILL, SKILLS } from '@/lib/skills'
import { TUTOR } from '@/lib/tutor'
import { timeLabel } from '@/lib/onboarding'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { DefnePose } from './Defne'

interface Slide { kicker: string; title: string; text: string; art: React.ReactNode; tone: string }

/**
 * A one-time welcome for new learners: six short cards that introduce the path,
 * the four skills, Defne, duels and rewards. Stored in the account (not the
 * browser), so it shows once per person on every device.
 */
export function ProductTour() {
  const { user, setUser } = useAuth()
  const nav = useNavigate()
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [open, setOpen] = useState(true)
  if (!user || user.preferences?.tour_done || !open) return null

  const first = user.name.split(' ')[0]
  const when = timeLabel(user.study_time)
  const slides: Slide[] = [
    {
      kicker: 'Hoş geldin',
      title: `Merhaba ${first}! Ben ${TUTOR.name}.`,
      text: `Bundan sonra İngilizce yolculuğunda yanındayım. Sana 30 saniyede her şeyi göstereyim.`,
      art: <DefnePose pose="wave" className="h-full" />,
      tone: 'bg-sage/15',
    },
    {
      kicker: 'Yol haritası',
      title: 'Her gün bir durak',
      text: 'Ana sayfadaki patika seni adım adım götürür. “Buradasın” işareti nerede kaldığını, ünite kupası nereye koştuğunu gösterir.',
      art: <Img src={unitImg(0)} alt="" className="size-full rounded-[28px] object-cover" />,
      tone: 'bg-flame/10',
    },
    {
      kicker: 'Dört beceri',
      title: 'Okuma, dinleme, konuşma, yazma — dengede',
      text: 'Her gün dört küçük görev: her beceriden bir tane. En geride kalanı öne alırım, karnen profilinde.',
      art: (
        <div className="grid size-full grid-cols-2 gap-2">
          {SKILLS.map((k) => {
            const S = SKILL[k]
            return (
              <div key={k} className="relative overflow-hidden rounded-2xl">
                <Img src={S.photo} alt="" className="photo" />
                <span className={clsx('absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black text-white', S.bg)}><S.icon className="size-3" /> {S.label}</span>
              </div>
            )
          })}
        </div>
      ),
      tone: 'bg-butter/15',
    },
    {
      kicker: `${TUTOR.name} ile konuş`,
      title: 'Beni ara, gerçekten konuşalım',
      text: 'Sesli aramada yüzümü görürsün; konuşurum, seni dinlerim, hatanı Türkçe açıklarım. Yazma atölyesinde metnini satır satır işaretlerim.',
      art: <Img src={TUTOR.portrait} alt="" className="size-full rounded-[28px] object-cover object-top" />,
      tone: 'bg-sage/15',
    },
    {
      kicker: 'Sadece DilGO’da',
      title: 'Gölge Düellosu',
      text: 'Başka bir öğrencinin gölgesine karşı dört turda yarış, kupa topla, rütbe atla. Sen yokken senin gölgen de kupalarını savunur.',
      art: <div className="grid size-full place-items-center rounded-[28px] bg-[#151922]"><Img src={leagueImg(6)} alt="" className="h-40 w-40 object-contain drop-shadow-xl sm:h-48 sm:w-48" /></div>,
      tone: 'bg-ink/5',
    },
    {
      kicker: 'Ödüller',
      title: 'Seri, sandık, rozet, canlı ders',
      text: `${when ? `Her gün ${when.toLocaleLowerCase('tr')} seni hatırlatırım. ` : ''}Serini koru, sandıkları aç, rozetleri topla — kazandığın kuponları Bayrak Dil Okulları’nda gerçek derste kullan.`,
      art: (
        <div className="grid size-full grid-cols-2 place-items-center gap-2 rounded-[28px] bg-butter/15 p-4">
          {['flame', 'chest', 'trophy', 'voucher'].map((k) => <Img key={k} src={rewardImg(k)} alt="" className="size-20 object-contain" />)}
        </div>
      ),
      tone: 'bg-butter/15',
    },
  ]
  const s = slides[i]
  const last = i === slides.length - 1

  const finish = (go?: string) => {
    setOpen(false)
    // Optimistic: never show it again on this device even if the request fails.
    setUser({ ...user, preferences: { ...user.preferences, tour_done: true } } as Me)
    void patch<{ user: Me }>('/account', { preferences: { tour_done: true } }).catch(() => {})
    if (go) nav(go)
  }
  const go = (d: number) => {
    setDir(d)
    setI((x) => Math.max(0, Math.min(slides.length - 1, x + d)))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0e1117]/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Tanıtım">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="safe-bottom relative w-full max-w-lg overflow-hidden rounded-t-[32px] bg-card shadow-soft sm:rounded-[32px]">
        <button onClick={() => finish()} aria-label="Tanıtımı geç" className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-card/80 text-ink-soft backdrop-blur hover:text-ink"><X className="size-5" /></button>

        <div className={clsx('relative h-64 p-5 transition-colors sm:h-72', s.tone)}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={i} className="flex size-full items-end justify-center" initial={{ opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 * dir }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {s.art}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-flame">{s.kicker}</p>
              <h2 className="mt-1 text-2xl leading-tight sm:text-3xl">{s.title}</h2>
              <p className="mt-2 min-h-[4.5rem] text-ink-soft">{s.text}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {slides.map((_, k) => (
                <button key={k} onClick={() => { setDir(k > i ? 1 : -1); setI(k) }} aria-label={`${k + 1}. kart`} className={clsx('h-2 rounded-full transition-all', k === i ? 'w-7 bg-ink' : 'w-2 bg-line')} />
              ))}
            </div>
            {i > 0 && <button onClick={() => go(-1)} aria-label="Geri" className="grid size-12 place-items-center rounded-2xl border-2 border-line text-ink-soft hover:text-ink"><ArrowLeft className="size-5" /></button>}
            {last ? (
              <Button onClick={() => finish('/learn')}>İlk dersime başla</Button>
            ) : (
              <Button onClick={() => go(1)} icon={<ArrowRight className="size-5" />}>İleri</Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
