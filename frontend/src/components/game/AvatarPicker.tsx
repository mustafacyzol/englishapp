import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Crown, Lock, ShoppingBag } from 'lucide-react'
import { ApiError, patch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { avatarUrl, useAvatarCatalog } from '@/lib/avatars'
import type { Me } from '@/lib/types'
import { Modal } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { FRAMES, UserAvatar } from './UserAvatar'
import { BANNERS, ProfileBanner } from './ProfileBanner'

type Tab = 'avatar' | 'frame' | 'banner' | 'bio'

/**
 * The profile studio: pick an avatar, wear a frame or cover you own and write a
 * short line about yourself, with a live preview of the card others see in the
 * league and arena. Only owned frames and covers are listed here; new ones are
 * bought in the shop (Mağaza > Görünüm), linked from each tab.
 */
export function AvatarPicker({ open, onClose, start = 'avatar' }: { open: boolean; onClose: () => void; start?: Tab }) {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const cat = useAvatarCatalog()
  const [tab, setTab] = useState<Tab>(start)
  const [draft, setDraft] = useState<{ avatar?: string; frame?: string | null; banner?: string | null; bio?: string }>({})
  const save = useMutation({
    mutationFn: (b: typeof draft) => patch<{ user: Me }>('/account', b),
    onSuccess: (r) => { setUser(r.user); setDraft({}); toast('Profilin güncellendi', 'success'); onClose() },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!user) return null
  const owned = user.cosmetics ?? { frames: [], banners: [] }
  const avatar = draft.avatar ?? user.avatar ?? undefined
  const frame = draft.frame !== undefined ? draft.frame : user.frame ?? null
  const banner = draft.banner !== undefined ? draft.banner : user.banner ?? null
  const bio = draft.bio ?? user.bio ?? ''
  const premium = user.premium.active
  const lockedAvatar = !premium && cat.premium.some((a) => a.key === avatar)
  const ownedFrames = Object.keys(FRAMES).filter((k) => owned.frames.includes(k))
  const ownedBanners = Object.keys(BANNERS).filter((k) => k !== 'default' && owned.banners.includes(k))
  const changed = Object.keys(draft).length > 0

  const TABS: [Tab, string][] = [['avatar', 'Avatar'], ['frame', 'Çerçeve'], ['banner', 'Kapak'], ['bio', 'Hakkımda']]
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      {/* live preview: the card others see */}
      <div className="overflow-hidden rounded-3xl border-2 border-line bg-card">
        <ProfileBanner banner={banner} className="h-24" />
        <div className="flex gap-3 px-4 pb-4">
          <AnimatePresence mode="popLayout">
            <motion.div key={`${avatar}-${frame}`} className="-mt-9 shrink-0" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
              <UserAvatar name={user.name} avatar={avatar} frame={frame} className="size-[72px] border-4 border-card" rounded="rounded-[24px]" />
            </motion.div>
          </AnimatePresence>
          {/* name and bio sit on the card, below the cover, so any cover stays readable */}
          <div className="min-w-0 pt-2">
            <p className="truncate font-display text-lg font-black leading-tight">{user.name}</p>
            <p className="line-clamp-1 text-sm text-ink-soft">{bio || '@' + user.username}</p>
          </div>
        </div>
      </div>

      <div role="tablist" className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-paper-2 p-1">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx('relative flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-extrabold transition', tab === k ? 'text-paper' : 'text-ink-soft hover:text-ink')}>
            {tab === k && <motion.span layoutId="studio-tab" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[42dvh] overflow-y-auto pr-1">
        {tab === 'avatar' && (
          <>
            <Grid>
              {cat.standard.map((a) => <Tile key={a.key} on={avatar === a.key} label={a.label} onClick={() => setDraft((d) => ({ ...d, avatar: a.key }))}><img src={avatarUrl(a.key, a.url)!} alt="" className="size-full object-cover" /></Tile>)}
            </Grid>
            <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-ink-soft"><Crown className="size-4 text-butter-deep" /> Premium koleksiyon</p>
            <Grid>
              {cat.premium.map((a) => <Tile key={a.key} on={avatar === a.key} locked={!premium} label={a.label} onClick={() => setDraft((d) => ({ ...d, avatar: a.key }))}><img src={avatarUrl(a.key, a.url)!} alt="" className="size-full object-cover" /></Tile>)}
            </Grid>
          </>
        )}
        {tab === 'frame' && (
          <>
            <Grid>
              <Tile on={!frame} label="Çerçevesiz" onClick={() => setDraft((d) => ({ ...d, frame: null }))}><span className="grid size-full place-items-center"><UserAvatar name={user.name} avatar={avatar} className="size-14" /></span></Tile>
              {ownedFrames.map((k) => (
                <Tile key={k} on={frame === k} label={FRAMES[k].label} onClick={() => setDraft((d) => ({ ...d, frame: k }))}>
                  <span className="grid size-full place-items-center"><UserAvatar name={user.name} avatar={avatar} frame={k} className="size-14" /></span>
                </Tile>
              ))}
              <ShopTile onClose={onClose} label="Yeni çerçeve" />
            </Grid>
            {!ownedFrames.length && <p className="mt-3 text-sm text-ink-soft">Henüz çerçeven yok. Mağazada elmasla alabilir, sandıktan kazanabilirsin.</p>}
          </>
        )}
        {tab === 'banner' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {['default', ...ownedBanners].map((k) => {
                const key = k === 'default' ? null : k
                const on = banner === key
                return (
                  <button key={k} onClick={() => setDraft((d) => ({ ...d, banner: key }))} aria-pressed={on} className={clsx('relative overflow-hidden rounded-2xl border-[3px] bg-card text-left transition', on ? 'border-flame' : 'border-line hover:border-ink/25')}>
                    <ProfileBanner banner={key} className="h-16" />
                    <span className="flex items-center justify-between px-3 py-2 text-sm font-extrabold">{BANNERS[k].label}{on && <Check className="size-4 text-flame" strokeWidth={3} />}</span>
                  </button>
                )
              })}
              <Link to="/shop?tab=look" onClick={onClose} className="grid min-h-[100px] place-items-center rounded-2xl border-[3px] border-dashed border-line p-3 text-center text-sm font-extrabold text-ink-soft transition hover:border-flame hover:text-flame">
                <span><ShoppingBag className="mx-auto mb-1 size-5" />Yeni kapak al</span>
              </Link>
            </div>
          </>
        )}
        {tab === 'bio' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Kısa bir cümle (ligde ve profilinde görünür)</span>
            <textarea value={bio} maxLength={120} rows={3} onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))} placeholder="ör. Londra'ya gitmeden önce konuşmamı açıyorum" className="w-full rounded-2xl border-2 border-line bg-card px-4 py-3 focus:border-sky focus:outline-none" />
            <span className="block text-right text-xs text-ink-soft">{bio.length}/120</span>
          </label>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => { setDraft({}); onClose() }}>Vazgeç</Button>
        {lockedAvatar ? (
          <Link to="/premium" onClick={onClose} className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-butter font-extrabold text-ink shadow-hard-sm"><Crown className="size-4" /> Premium ile aç</Link>
        ) : (
          <Button className="flex-1" loading={save.isPending} disabled={!changed} onClick={() => save.mutate(draft)}>Kaydet</Button>
        )}
      </div>
    </Modal>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{children}</div>
}

function Tile({ on, locked, label, onClick, children }: { on: boolean; locked?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick} aria-pressed={on} aria-label={`${label}${locked ? ' (kilitli)' : ''}`} className="group text-center">
      <span className={clsx('relative block aspect-square overflow-hidden rounded-2xl border-[3px] bg-paper-2 transition', on ? 'border-flame shadow-[0_0_0_4px_rgba(255,90,54,.18)]' : 'border-transparent group-hover:border-line')}>
        {children}
        {locked && <span className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/55 text-butter backdrop-blur"><Lock className="size-3" /></span>}
        {on && <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-full bg-flame text-white"><Check className="size-3.5" strokeWidth={3} /></span>}
      </span>
      <span className="mt-1 block truncate text-[11px] font-bold text-ink-soft">{label}</span>
    </motion.button>
  )
}

/** The last tile of a grid: new frames and covers are bought in the shop. */
function ShopTile({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <Link to="/shop?tab=look" onClick={onClose} className="group text-center">
      <span className="grid aspect-square place-items-center rounded-2xl border-[3px] border-dashed border-line text-ink-soft transition group-hover:border-flame group-hover:text-flame"><ShoppingBag className="size-6" /></span>
      <span className="mt-1 block truncate text-[11px] font-bold text-ink-soft">{label}</span>
    </Link>
  )
}
