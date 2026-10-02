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

type Stage = 'ready' | 'key' | 'open' | 'reveal'

/** Where the keyhole sits in chest.webp (measured), and the lid seam (fraction from the top). */
const KEYHOLE = { x: 0.443, y: 0.53 }
const KEY_MS = 1900
/** The opening film: same chest, rendered in 3D. Its chest fills 56.8% of the frame, ours 96% of the box. */
const FILM_SCALE = 0.96 / 0.568
const FILM_FROM = 0.9 // seconds: skip the idle start
const REVEAL_MS = 2900 // film time after FILM_FROM when the prize rises

const RARITY_COLOR: Record<RewardItem['rarity'], string> = { common: '#22b573', rare: '#2f7cf6', epic: '#ef4e7b', legendary: '#ffc233' }

/**
 * The mystery chest ceremony. A golden key flies in and turns in the lock, the
 * chest trembles with a heartbeat, the lid bursts open in light, and the prize
 * rises out of it in its rarity colour. The published odds sit under the prize once
 * the chest is open. The server roll starts at the first click, so the
 * animation never waits on the network for long.
 */
export function ChestOpening({ chest, odds, onOpen, onClose }: { chest: RewardItem; odds?: ChestOdds[]; onOpen: () => Promise<ChestResult>; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('ready')
  const [result, setResult] = useState<ChestResult | null>(null)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()
  const toast = useToast()
  const pending = useRef<Promise<ChestResult> | null>(null)
  const film = useRef<HTMLVideoElement>(null)

  const legendary = chest.rarity === 'legendary'

  const start = () => {
    if (stage !== 'ready') return
    pending.current = onOpen()
    pending.current.then(setResult, () => setFailed(true))
    setStage('key')
    sfx.tap()
  }

  // Drive the sequence: key goes in and turns (1.9s) → the chest trembles, the lock clicks and
  // the lid swings open in a burst of light (filmed, ~2.9s) → the prize rises out of it.
  useEffect(() => {
    if (failed) return onClose()
    if (stage === 'key') {
      const clicks = [1150, 1450, 1650].map((d) => setTimeout(() => sfx.tick(), reduced ? 0 : d))
      const t = setTimeout(() => setStage(reduced ? 'reveal' : 'open'), reduced ? 200 : KEY_MS)
      return () => {
        clearTimeout(t)
        clicks.forEach(clearTimeout)
      }
    }
    if (stage === 'open') {
      const v = film.current
      if (v) {
        v.currentTime = FILM_FROM
        v.play().catch(() => {})
      }
      const cues = [
        setTimeout(() => sfx.beat(), 0),
        setTimeout(() => sfx.beat(), 260),
        setTimeout(() => sfx.beat(), 500),
        setTimeout(() => sfx.tick(), 720),
        setTimeout(() => sfx.reward(), 1050),
      ]
      return () => cues.forEach(clearTimeout)
    }
  }, [stage, failed, reduced, onClose])

  // The prize rises once the film has burst open and the server has answered.
  const [filmDone, setFilmDone] = useState(false)
  useEffect(() => {
    if (stage !== 'open') return
    const t = setTimeout(() => setFilmDone(true), REVEAL_MS)
    return () => clearTimeout(t)
  }, [stage])
  useEffect(() => {
    if ((stage === 'open' && filmDone && result) || (stage === 'reveal' && result && reduced)) {
      if (stage !== 'reveal') setStage('reveal')
      const r = prizeRarity(result)
      celebrate(r === 'legendary' || r === 'epic')
    }
  }, [stage, filmDone, result, reduced])

  const prize = result ? describe(result) : null
  // Golden until the reveal, so the colour never gives the prize away early.
  const glow = prize && stage === 'reveal' ? RARITY_COLOR[prize.rarity] : legendary ? '#ffc233' : '#ffb347'

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden p-4" role="dialog" aria-modal="true" aria-label={chest.name}>
      <motion.div className="absolute inset-0 bg-[#07090f]/88 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={stage === 'ready' || stage === 'reveal' ? onClose : undefined} />

      {/* light rays behind the chest */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[140vmax] -translate-x-1/2 -translate-y-1/2"
        style={{ background: `repeating-conic-gradient(from 0deg, ${glow}22 0deg 8deg, transparent 8deg 22deg)`, maskImage: 'radial-gradient(circle, #000 0%, transparent 42%)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 42%)' }}
        animate={{ rotate: 360, opacity: stage === 'reveal' ? 1 : stage === 'open' ? 0.6 : 0.25 }}
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
            animate={{ opacity: stage === 'ready' ? 0.25 : stage === 'key' ? 0.35 : stage === 'open' ? [0.3, 0.3, 0.3, 0.55] : 0.7, scale: stage === 'open' ? [1, 1, 1, 1.5] : stage === 'reveal' ? 1.2 : 1 }}
            transition={{ duration: stage === 'open' ? 1.6 : 0.5, times: stage === 'open' ? [0, 0.3, 0.6, 1] : undefined }}
          />

          {/* The filmed opening sits exactly over the chest image (same chest, same size), mounted from
              the start so it is buffered, and shown the moment the key has turned. It stays behind the
              prize as a glowing open chest. */}
          {!reduced && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 sm:size-64"
              initial={false}
              animate={
                stage === 'open'
                  ? { opacity: 1, x: [0, -3, 3, -5, 5, -6, 6, -2, 0, 0], rotate: [0, -1, 1, -1.5, 1.5, -2, 2, -0.5, 0, 0], y: 0, scale: 1 }
                  : stage === 'reveal'
                    ? { opacity: 0, y: 50, scale: 0.85, x: 0, rotate: 0 }
                    : { opacity: 0 }
              }
              transition={stage === 'open' ? { opacity: { duration: 0 }, x: { duration: 0.8, ease: 'easeIn' }, rotate: { duration: 0.8, ease: 'easeIn' } } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <video
                ref={film}
                muted
                playsInline
                preload="auto"
                className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
                style={{ width: `${FILM_SCALE * 100}%`, height: `${FILM_SCALE * 100}%`, maskImage: 'radial-gradient(closest-side, #000 72%, transparent 100%)', WebkitMaskImage: 'radial-gradient(closest-side, #000 72%, transparent 100%)' }}
              >
                <source src={img('rewards/chest-open.webm')} type="video/webm" />
                <source src={img('rewards/chest-open.mp4')} type="video/mp4" />
              </video>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {stage === 'ready' || stage === 'key' ? (
              <motion.div
                key="chest"
                className="relative size-56 sm:size-64 [transform-style:preserve-3d]"
                initial={{ y: 40, opacity: 0, rotateX: 18 }}
                animate={stage === 'key' ? { y: 0, opacity: 1, rotateX: 0, scale: [1, 1, 1, 1.03, 1] } : { y: [0, -8, 0], opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={stage === 'ready' ? { y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }, opacity: { duration: 0.4 } } : { scale: { duration: KEY_MS / 1000, times: [0, 0.6, 0.86, 0.9, 1] } }}
              >
                <Img src={img('rewards/chest.webp')} alt="" className="size-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />

                {/* The key: flies in, lines up over the keyhole, its blade sinks in (hidden past the keyhole line), then turns. */}
                <motion.div
                  className="absolute"
                  style={{ left: `${KEYHOLE.x * 100}%`, top: `${KEYHOLE.y * 100}%`, width: '34%', aspectRatio: '218 / 300', translate: '-50% -100%', transformOrigin: '50% 100%' }}
                  initial={{ x: '150%', y: '-40%', rotate: 28, opacity: 0 }}
                  animate={stage === 'ready' ? { x: '150%', y: ['-40%', '-52%', '-40%'], rotate: 28, opacity: 1 } : { x: ['150%', '0%', '0%', '0%', '0%'], y: ['-40%', '-14%', '0%', '0%', '0%'], rotate: [28, 0, 0, 90, 90], opacity: 1 }}
                  transition={stage === 'ready' ? { y: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }, default: { duration: 0.4 } } : { duration: KEY_MS / 1000, times: [0, 0.3, 0.42, 0.72, 1], ease: 'easeInOut' }}
                >
                  <div className="size-full overflow-hidden">
                    <motion.div
                      className="size-full"
                      animate={stage === 'ready' ? { y: '0%' } : { y: ['0%', '0%', '0%', '36%', '36%'] }}
                      transition={stage === 'key' ? { duration: KEY_MS / 1000, times: [0, 0.42, 0.46, 0.6, 1], ease: 'easeIn' } : { duration: 0 }}
                    >
                      <Img src={img('rewards/key-v.webp')} alt="" className="size-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,.45)]" />
                    </motion.div>
                  </div>
                </motion.div>
                {/* the lock gives: a flash at the keyhole when the key finishes turning */}
                {stage === 'key' && !reduced && (
                  <motion.span aria-hidden className="absolute size-8 rounded-full border-4 border-butter" style={{ left: `${KEYHOLE.x * 100}%`, top: `${KEYHOLE.y * 100}%`, translate: '-50% -50%' }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 0, 2.6], opacity: [0, 1, 0] }} transition={{ duration: KEY_MS / 1000, times: [0, 0.72, 0.95] }} />
                )}
              </motion.div>
            ) : stage === 'reveal' && prize ? (
              <motion.div key="prize" className="relative" initial={{ y: 90, scale: 0.2, opacity: 0, rotate: -12 }} animate={{ y: -10, scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 170, damping: 13 }}>
                {prize.kind === 'partner' ? <PartnerTicket p={prize} /> : <Img src={prize.image} alt="" className="size-44 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,.5)] sm:size-52" />}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* sparks on burst */}
          {stage === 'reveal' && <Sparks color={glow} />}
        </div>

        {stage === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <Button size="lg" variant="butter" block onClick={start}>Anahtarı çevir</Button>
          </motion.div>
        )}
        {(stage === 'key' || stage === 'open') && <p className="mt-6 h-14 font-display text-2xl font-black">{stage === 'key' ? 'Kilit açılıyor...' : filmDone ? 'Az kaldı...' : 'Açılıyor!'}</p>}

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
            {!!odds?.length && <Odds odds={odds} />}
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
