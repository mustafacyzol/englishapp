import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import clsx from 'clsx'
import { Copy, ExternalLink, Gift, Percent, X } from 'lucide-react'
import { img, rewardImg } from '@/lib/assets'
import { celebrate, sfx } from '@/lib/fx'
import { dateTR } from '@/lib/format'
import type { ChestOdds, RewardItem, UserItem } from '@/lib/types'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Img } from '@/components/ui/Img'
import { RARITY } from './RewardCard'

export interface ChestResult {
  message: string
  extra?: { code?: string; prize?: { type: 'gems' | 'item' | 'partner'; amount?: number; item?: UserItem } }
}

type Stage = 'ready' | 'key' | 'shake' | 'burst' | 'reveal'

/** Where the keyhole sits in chest.webp (measured), and the lid seam (fraction from the top). */
const KEYHOLE = { x: 0.443, y: 0.53 }
const LID = 0.44
const KEY_MS = 1900

const RARITY_COLOR: Record<RewardItem['rarity'], string> = { common: '#22b573', rare: '#2f7cf6', epic: '#ef4e7b', legendary: '#ffc233' }

/**
 * The mystery chest ceremony. A golden key flies in and turns in the lock, the
 * chest trembles with a heartbeat, the lid bursts open in light, and the prize
 * rises out of it in its rarity colour. The published odds are shown before the
 * learner turns the key. The server roll starts at the first click, so the
 * animation never waits on the network for long.
 */
export function ChestOpening({ chest, odds, onOpen, onClose }: { chest: RewardItem; odds?: ChestOdds[]; onOpen: () => Promise<ChestResult>; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('ready')
  const [result, setResult] = useState<ChestResult | null>(null)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()
  const toast = useToast()
  const pending = useRef<Promise<ChestResult> | null>(null)

  const legendary = chest.rarity === 'legendary'

  const start = () => {
    if (stage !== 'ready') return
    pending.current = onOpen()
    pending.current.then(setResult, () => setFailed(true))
    setStage('key')
    sfx.tap()
  }

  // Drive the sequence: key goes in and turns (1.9s) → chest trembles (1.3s) → lid bursts open → reveal.
  useEffect(() => {
    if (failed) return onClose()
    let t: ReturnType<typeof setTimeout>
    if (stage === 'key') {
      const clicks = [1150, 1450, 1650].map((d) => setTimeout(() => sfx.tick(), reduced ? 0 : d))
      t = setTimeout(() => setStage('shake'), reduced ? 200 : KEY_MS)
      return () => {
        clearTimeout(t)
        clicks.forEach(clearTimeout)
      }
    }
    if (stage === 'shake') {
      const beats = [0, 420, 780, 1080].map((d) => setTimeout(() => sfx.beat(), d))
      t = setTimeout(() => setStage('burst'), reduced ? 200 : 1300)
      return () => {
        clearTimeout(t)
        beats.forEach(clearTimeout)
      }
    }
    if (stage === 'burst' && result) {
      sfx.reward()
      t = setTimeout(() => {
        setStage('reveal')
        const r = prizeRarity(result)
        celebrate(r === 'legendary' || r === 'epic')
      }, reduced ? 100 : 900)
      return () => clearTimeout(t)
    }
  }, [stage, result, failed, reduced, onClose])

  const prize = result ? describe(result) : null
  const glow = prize ? RARITY_COLOR[prize.rarity] : legendary ? '#ffc233' : '#ffb347'

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden p-4" role="dialog" aria-modal="true" aria-label={chest.name}>
      <motion.div className="absolute inset-0 bg-[#07090f]/88 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={stage === 'ready' || stage === 'reveal' ? onClose : undefined} />

      {/* light rays behind the chest */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[140vmax] -translate-x-1/2 -translate-y-1/2"
        style={{ background: `repeating-conic-gradient(from 0deg, ${glow}22 0deg 8deg, transparent 8deg 22deg)`, maskImage: 'radial-gradient(circle, #000 0%, transparent 42%)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 42%)' }}
        animate={{ rotate: 360, opacity: stage === 'burst' || stage === 'reveal' ? 1 : stage === 'shake' ? 0.55 : 0.25 }}
        transition={{ rotate: { duration: 40, ease: 'linear', repeat: Infinity }, opacity: { duration: 0.6 } }}
      />

      <button onClick={onClose} aria-label="Kapat" className={clsx('absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20', stage !== 'ready' && stage !== 'reveal' && 'invisible')}>
        <X className="size-5" />
      </button>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center text-white">
        <p className="mb-1 text-xs font-black uppercase tracking-[0.25em] text-white/60">{stage === 'reveal' ? 'Sandıktan çıktı' : chest.name}</p>

        {/* the stage: chest, key, glow */}
        <div className="relative mt-2 grid h-64 w-full place-items-center [perspective:900px] sm:h-72">
          <motion.div
            aria-hidden
            className="absolute size-56 rounded-full blur-3xl"
            style={{ background: glow }}
            animate={{ opacity: stage === 'ready' ? 0.25 : stage === 'key' ? 0.35 : stage === 'shake' ? [0.35, 0.7, 0.4, 0.8] : 0.9, scale: stage === 'burst' ? 1.6 : stage === 'reveal' ? 1.2 : 1 }}
            transition={{ duration: stage === 'shake' ? 1.3 : 0.5 }}
          />

          <AnimatePresence mode="popLayout">
            {stage !== 'reveal' ? (
              <motion.div
                key="chest"
                className="relative size-56 sm:size-64 [transform-style:preserve-3d]"
                initial={{ y: 40, opacity: 0, rotateX: 18 }}
                animate={
                  stage === 'shake' && !reduced
                    ? { x: [0, -6, 6, -9, 9, -12, 12, -6, 0], rotateZ: [0, -2, 2, -3, 3, -4, 4, -1, 0], scale: [1, 1.02, 1.03, 1.05, 1.06, 1.08], y: 0, opacity: 1, rotateX: 0 }
                    : stage === 'burst'
                      ? { scale: 1.12, y: -6, opacity: 1, rotateX: 0 }
                      : stage === 'key'
                        ? { y: 0, opacity: 1, rotateX: 0, scale: [1, 1, 1, 1.03, 1] }
                        : { y: [0, -8, 0], opacity: 1, rotateX: 0 }
                }
                exit={{ scale: 0.6, opacity: 0, y: 40 }}
                transition={stage === 'shake' ? { duration: 1.3, ease: 'easeIn' } : stage === 'ready' ? { y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }, opacity: { duration: 0.4 } } : stage === 'key' ? { scale: { duration: KEY_MS / 1000, times: [0, 0.6, 0.86, 0.9, 1] } } : { type: 'spring', stiffness: 220, damping: 14 }}
              >
                {stage !== 'burst' ? (
                  <Img src={img('rewards/chest.webp')} alt="" className="size-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
                ) : (
                  // The lid swings up and back on its hinge while the open chest fades in underneath.
                  <div className="relative size-full [perspective:600px]">
                    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22, duration: 0.3 }}>
                      <Img src={img('rewards/chest-open.webp')} alt="" className="size-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
                    </motion.div>
                    <motion.div className="absolute inset-0" style={{ clipPath: `inset(${LID * 100}% 0 0 0)` }} animate={{ opacity: 0 }} transition={{ delay: 0.3, duration: 0.25 }}>
                      <Img src={img('rewards/chest.webp')} alt="" className="size-full object-contain" />
                    </motion.div>
                    <motion.div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${(1 - LID) * 100}% 0)`, transformOrigin: `50% ${LID * 100}%` }} initial={{ rotateX: 0 }} animate={{ rotateX: 78, y: -18, opacity: 0 }} transition={{ duration: 0.5, ease: [0.3, 1.4, 0.6, 1], opacity: { delay: 0.25, duration: 0.25 } }}>
                      <Img src={img('rewards/chest.webp')} alt="" className="size-full object-contain" />
                    </motion.div>
                    <motion.span aria-hidden className="absolute left-1/2 top-[38%] size-24 -translate-x-1/2 rounded-full bg-white blur-md" initial={{ opacity: 0.95, scale: 0.3 }} animate={{ opacity: 0, scale: 3 }} transition={{ duration: 0.7 }} />
                  </div>
                )}

                {/* The key: flies in, lines up over the keyhole, its blade sinks in (hidden past the keyhole line), then turns. */}
                {stage !== 'burst' && (
                  <motion.div
                    className="absolute"
                    style={{ left: `${KEYHOLE.x * 100}%`, top: `${KEYHOLE.y * 100}%`, width: '34%', aspectRatio: '218 / 300', translate: '-50% -100%', transformOrigin: '50% 100%' }}
                    initial={{ x: '150%', y: '-40%', rotate: 28, opacity: 0 }}
                    animate={
                      stage === 'ready'
                        ? { x: '150%', y: ['-40%', '-52%', '-40%'], rotate: 28, opacity: 1 }
                        : stage === 'key'
                          ? { x: ['150%', '0%', '0%', '0%', '0%'], y: ['-40%', '-14%', '0%', '0%', '0%'], rotate: [28, 0, 0, 90, 90], opacity: 1 }
                          : { x: '0%', y: '0%', rotate: 90, opacity: 1 }
                    }
                    transition={stage === 'ready' ? { y: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }, default: { duration: 0.4 } } : stage === 'key' ? { duration: KEY_MS / 1000, times: [0, 0.3, 0.42, 0.72, 1], ease: 'easeInOut' } : { duration: 0 }}
                  >
                    <div className="size-full overflow-hidden">
                      <motion.div
                        className="size-full"
                        animate={stage === 'ready' ? { y: '0%' } : stage === 'key' ? { y: ['0%', '0%', '0%', '36%', '36%'] } : { y: '36%' }}
                        transition={stage === 'key' ? { duration: KEY_MS / 1000, times: [0, 0.42, 0.46, 0.6, 1], ease: 'easeIn' } : { duration: 0 }}
                      >
                        <Img src={img('rewards/key-v.webp')} alt="" className="size-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,.45)]" />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
                {/* the lock gives: a flash at the keyhole when the key finishes turning */}
                {stage === 'key' && !reduced && (
                  <motion.span aria-hidden className="absolute size-8 rounded-full border-4 border-butter" style={{ left: `${KEYHOLE.x * 100}%`, top: `${KEYHOLE.y * 100}%`, translate: '-50% -50%' }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 0, 2.6], opacity: [0, 1, 0] }} transition={{ duration: KEY_MS / 1000, times: [0, 0.72, 0.95] }} />
                )}
              </motion.div>
            ) : (
              prize && (
                <motion.div key="prize" className="relative" initial={{ y: 70, scale: 0.3, opacity: 0, rotate: -12 }} animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }}>
                  {prize.kind === 'partner' ? <PartnerTicket p={prize} /> : <Img src={prize.image} alt="" className="size-44 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,.5)] sm:size-52" />}
                </motion.div>
              )
            )}
          </AnimatePresence>

          {/* sparks on burst */}
          {(stage === 'burst' || stage === 'reveal') && <Sparks color={glow} />}
        </div>

        {stage === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <Button size="lg" variant="butter" block onClick={start}>Anahtarı çevir</Button>
            {!!odds?.length && <Odds odds={odds} />}
          </motion.div>
        )}
        {(stage === 'key' || stage === 'shake' || stage === 'burst') && <p className="mt-6 h-14 font-display text-2xl font-black">{stage === 'key' ? 'Kilit açılıyor...' : stage === 'shake' ? 'Bir şeyler kıpırdıyor!' : ''}</p>}

        {stage === 'reveal' && prize && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-4 w-full">
            <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest text-[#1f2433]" style={{ background: glow }}>{RARITY[prize.rarity].label}</span>
            <p className="mt-3 font-display text-3xl font-black leading-tight">{prize.title}</p>
            {prize.sub && <p className="mt-1 text-white/75">{prize.sub}</p>}
            {prize.code && (
              <button onClick={() => { navigator.clipboard?.writeText(prize.code!).catch(() => {}); toast('Kod kopyalandı', 'success') }} className="mx-auto mt-4 flex items-center gap-2 rounded-2xl border-2 border-dashed border-white/40 bg-white/10 px-5 py-3 font-mono text-xl font-bold tracking-wider transition hover:bg-white/15">
                {prize.code} <Copy className="size-4" />
              </button>
            )}
            {prize.expires && <p className="mt-2 text-sm text-white/60">{dateTR(prize.expires)} tarihine kadar geçerli{prize.terms ? ` · ${prize.terms}` : ''}</p>}
            <div className="mt-6 flex justify-center gap-2">
              {prize.url && <a href={prize.url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/10 px-5 font-bold hover:bg-white/20">İş ortağına git <ExternalLink className="size-4" /></a>}
              <Button onClick={onClose}>Harika!</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface Prize { kind: 'gems' | 'item' | 'partner'; title: string; sub?: string; image: string; rarity: RewardItem['rarity']; code?: string; expires?: string | null; terms?: string | null; url?: string | null; partner?: string; color?: string | null; logo?: string | null }

function prizeRarity(r: ChestResult): RewardItem['rarity'] {
  const p = r.extra?.prize
  if (!p || p.type === 'gems') return (p?.amount ?? 0) >= 400 ? 'rare' : 'common'
  if (p.type === 'partner') return p.item?.meta?.rarity ?? 'epic'
  return p.item?.item.rarity ?? 'rare'
}

function describe(r: ChestResult): Prize {
  const p = r.extra?.prize
  const rarity = prizeRarity(r)
  if (p?.type === 'partner' && p.item) {
    const m = p.item.meta ?? {}
    return { kind: 'partner', title: m.offer ?? 'İş ortağı hediyesi', sub: m.description ?? undefined, partner: m.partner, color: m.color, logo: m.partner_logo, image: rewardImg('coupon'), rarity, code: p.item.code ?? r.extra?.code, expires: p.item.expires_at, terms: m.terms, url: m.partner_url }
  }
  if (p?.type === 'item' && p.item) return { kind: 'item', title: p.item.item.name, sub: p.item.item.description ?? 'Kasanda seni bekliyor.', image: rewardImg(p.item.item.icon), rarity }
  return { kind: 'gems', title: `${p?.amount ?? ''} elmas`, sub: 'Hesabına eklendi.', image: rewardImg('gems'), rarity }
}

/** A partner coupon shaped like a real ticket in the partner's colour. */
function PartnerTicket({ p }: { p: Prize }) {
  const color = p.color ?? '#e8403a'
  return (
    <div className="relative w-72 rotate-[-3deg] overflow-hidden rounded-3xl text-left text-[#1f2433] shadow-[0_30px_50px_-15px_rgba(0,0,0,.6)]" style={{ background: '#fff' }}>
      <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ background: color }}>
        {p.logo ? <img src={p.logo} alt="" className="size-10 rounded-xl bg-white object-contain p-1" /> : <span className="grid size-10 place-items-center rounded-xl bg-white/20"><Gift className="size-5" /></span>}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">İş ortağı hediyesi</p>
          <p className="truncate font-display text-lg font-black leading-tight">{p.partner}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t-2 border-dashed border-black/10 px-5 py-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}1f`, color }}><Percent className="size-6" /></span>
        <p className="font-display text-lg font-black leading-tight">{p.title}</p>
      </div>
      <span aria-hidden className="absolute -left-3 top-[76px] size-6 rounded-full bg-[#07090f]" />
      <span aria-hidden className="absolute -right-3 top-[76px] size-6 rounded-full bg-[#07090f]" />
    </div>
  )
}

function Odds({ odds }: { odds: ChestOdds[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 text-left">
      <button onClick={() => setOpen((o) => !o)} className="mx-auto block text-sm font-bold text-white/70 underline-offset-4 hover:text-white hover:underline">{open ? 'Olasılıkları gizle' : 'Neler çıkabilir? Olasılıklar'}</button>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden rounded-2xl bg-white/8 p-2">
            {odds.map((o, i) => (
              <li key={i} className="px-3 py-2">
                <div className="flex items-center gap-3 text-sm font-bold">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: RARITY_COLOR[o.rarity] }} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <span className="font-mono tabular-nums text-white/80">%{o.chance}</span>
                </div>
                <div className="ml-5 mt-1 h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${Math.max(2, o.chance)}%`, background: RARITY_COLOR[o.rarity] }} /></div>
                {o.partners && o.partners.length > 0 && <p className="ml-5 mt-1 text-xs text-white/55">{o.partners.join(' · ')}</p>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function Sparks({ color }: { color: string }) {
  const sparks = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2 + Math.random() * 0.3, d: 110 + Math.random() * 90, s: 4 + Math.random() * 6 })), [])
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {sparks.map((p, i) => (
        <motion.span key={i} className="absolute rounded-full" style={{ width: p.s, height: p.s, background: i % 3 ? color : '#fff' }} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(p.a) * p.d, y: Math.sin(p.a) * p.d, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      ))}
    </div>
  )
}
