import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Crown, Lock } from 'lucide-react'
import { ApiError, patch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { AVATARS, avatarUrl } from '@/lib/avatars'
import type { Me } from '@/lib/types'
import { Modal } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { UserAvatar } from './UserAvatar'

/**
 * Pick a profile avatar: a big live preview on top, then the standard set and the
 * premium collection. Locked premium avatars can still be previewed, so people
 * see what they would get before upgrading.
 */
export function AvatarPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<'standard' | 'premium'>('standard')
  const [pick, setPick] = useState<string | null | undefined>(undefined)
  const save = useMutation({
    mutationFn: (avatar: string | null) => patch<{ user: Me }>('/account', { avatar }),
    onSuccess: (r) => { setUser(r.user); toast('Avatarın güncellendi', 'success'); onClose() },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!user) return null
  const current = pick === undefined ? user.avatar : pick
  const premium = user.premium.active
  const lockedPick = !premium && AVATARS.premium.some((a) => a.key === current)
  const label = [...AVATARS.standard, ...AVATARS.premium].find((a) => a.key === current)?.label

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <AnimatePresence mode="popLayout">
          <motion.div key={current ?? 'none'} initial={{ scale: 0.7, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }}>
            <UserAvatar name={user.name} avatar={current} frame={user.preferences.frame} className="size-28 text-5xl" rounded="rounded-[32px]" />
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 font-display text-xl font-black">{label ?? 'Baş harfin'}</p>
        <p className="text-sm text-ink-soft">{lockedPick ? 'Bu avatar Premium koleksiyonunda.' : 'Profilinde, ligde ve düellolarda böyle görünürsün.'}</p>
      </div>

      <div role="tablist" className="mx-auto mt-5 flex w-fit gap-1 rounded-2xl bg-paper-2 p-1">
        {(['standard', 'premium'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx('relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold transition', tab === k ? 'text-paper' : 'text-ink-soft hover:text-ink')}>
            {tab === k && <motion.span layoutId="av-tab" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            {k === 'premium' && <Crown className="relative size-4 text-butter" />}
            <span className="relative">{k === 'standard' ? 'Standart' : 'Premium'}</span>
            <span className="relative text-xs opacity-60">{AVATARS[k].length}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
        {tab === 'standard' && (
          <button onClick={() => setPick(null)} aria-pressed={current === null} className={clsx('col-span-3 flex items-center justify-center gap-2 rounded-2xl border-2 py-2 text-sm font-bold transition', current === null ? 'border-ink' : 'border-line hover:border-ink/30')}>
            <UserAvatar name={user.name} className="size-7 text-sm" /> Baş harfimi kullan
          </button>
        )}
        {AVATARS[tab].map((a, i) => {
          const on = current === a.key
          const locked = tab === 'premium' && !premium
          return (
            <motion.button
              key={a.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setPick(a.key)}
              aria-pressed={on}
              aria-label={`${a.label}${locked ? ' (Premium)' : ''}`}
              className={clsx('group relative aspect-square overflow-hidden rounded-3xl border-[3px] transition', on ? 'border-flame shadow-[0_0_0_4px_rgba(255,90,54,.18)]' : 'border-transparent')}
            >
              <img src={avatarUrl(a.key)!} alt="" className={clsx('size-full object-cover transition duration-300 group-hover:scale-105', locked && !on && 'saturate-[.7]')} draggable={false} />
              {locked && <span className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/55 text-butter backdrop-blur"><Lock className="size-3.5" /></span>}
              {on && <span className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-flame text-white"><Check className="size-4" strokeWidth={3} /></span>}
            </motion.button>
          )
        })}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Vazgeç</Button>
        {lockedPick ? (
          <Link to="/premium" onClick={onClose} className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-butter font-extrabold text-ink shadow-hard-sm"><Crown className="size-4" /> Premium ile aç</Link>
        ) : (
          <Button className="flex-1" loading={save.isPending} disabled={current === user.avatar} onClick={() => save.mutate(current ?? null)}>Uygula</Button>
        )}
      </div>
    </Modal>
  )
}
