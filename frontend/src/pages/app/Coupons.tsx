import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { img, rewardImg } from '@/lib/assets'
import type { UserItem } from '@/lib/types'
import { LinkButton } from '@/components/ui/Button'
import { Empty, PageHeader, SkeletonPage, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

/** "%20 indirim" → "%20", "50 TL hediye çeki" → "50 TL": the number a coupon is about, set large on the stub. */
function headline(offer?: string) {
  const m = offer?.match(/%\s?\d+|\d+\s?(?:TL|₺)|\d+\s?ay|\d+\s?gün/i)
  return m ? m[0].replace(/\s+/g, ' ') : null
}

/**
 * Partner gifts won from mystery chests, each as a real ticket: the partner's
 * stub on the left, a perforated tear line, and the code to copy on the right.
 */
export default function Coupons() {
  const qc = useQueryClient()
  const toast = useToast()
  const [view, setView] = useState<'active' | 'past'>('active')
  const { data, isLoading } = useQuery({ queryKey: ['coupons'], queryFn: () => get<{ data: UserItem[] }>('/coupons') })
  const used = useMutation({
    mutationFn: (id: number) => post(`/coupons/${id}/used`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast('Kupon kullanıldı olarak işaretlendi', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const active = data.data.filter((c) => c.status === 'active')
  const past = data.data.filter((c) => c.status !== 'active')
  const list = view === 'active' ? active : past
  const copy = (c: string) => { navigator.clipboard?.writeText(c).catch(() => {}); toast('Kod kopyalandı', 'success') }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="İş ortaklarımızdan" title="Kuponlarım" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-ink-soft">Gizemli sandıklardan çıkan marka hediyeleri burada. Kodu kopyala, markanın sitesinde kullan, sonra "Kullandım" de.</p>
        <Tabs value={view} onChange={setView} items={[{ value: 'active', label: `Aktif (${active.length})` }, { value: 'past', label: `Geçmiş (${past.length})` }]} />
      </div>

      {!list.length ? (
        <Empty
          icon={<Img src={rewardImg('ticket')} alt="" className="size-12 object-contain opacity-70" />}
          title={view === 'active' ? 'Aktif kuponun yok' : 'Geçmiş kupon yok'}
          text="Gizemli sandıklardan bazen iş ortaklarımızın hediyeleri çıkar. Kazandığında burada bir bilet olarak görünür."
          action={view === 'active' ? <LinkButton to="/shop?tab=chest" variant="butter">Sandıklara bak</LinkButton> : undefined}
        />
      ) : (
        <div className="grid gap-x-6 gap-y-9 md:grid-cols-2">
          {list.map((c, i) => {
            const m = c.meta ?? {}
            const color = m.color ?? '#ff5a36'
            const on = c.status === 'active'
            const big = headline(m.offer)
            const days = c.expires_at ? Math.max(0, Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 864e5)) : null
            return (
              <motion.article key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={clsx('min-w-0', !on && 'opacity-70 grayscale-[.6]')}>
                {/* the ticket itself: a real paper coupon with a perforated stub */}
                <div className="relative aspect-[865/350] w-full drop-shadow-[0_14px_18px_rgba(31,36,51,.18)]">
                  <img src={img('rewards/coupon-ticket.webp')} alt="" aria-hidden className="absolute inset-0 size-full select-none" draggable={false} />
                  <div className="absolute inset-y-[13%] left-[7.5%] right-[27%] flex min-w-0 flex-col justify-between text-[#2a2620]">
                    <div className="flex min-w-0 items-center gap-2">
                      {m.partner_logo
                        ? <Img src={m.partner_logo} alt="" className="size-6 shrink-0 rounded-md bg-white object-contain p-0.5 sm:size-7" />
                        : <span className="grid size-6 shrink-0 place-items-center rounded-md text-xs font-black text-white sm:size-7" style={{ background: color }}>{m.partner?.[0] ?? '?'}</span>}
                      <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]" style={{ color }}>{m.partner}</span>
                    </div>
                    <p className="line-clamp-2 font-display text-[clamp(.95rem,3.6vw,1.3rem)] font-black leading-tight">{m.offer}</p>
                    <button onClick={() => on && c.code && copy(c.code)} disabled={!on} aria-label="Kodu kopyala" className="flex w-fit max-w-full items-center gap-1.5 rounded-lg border border-dashed border-[#2a2620]/35 bg-white/60 px-2 py-1 font-mono text-[12px] font-bold tracking-wider transition enabled:hover:bg-white sm:text-[14px]">
                      <span className="truncate">{c.code}</span>{on && <Copy className="size-3.5 shrink-0 opacity-60" />}
                    </button>
                  </div>
                  <div className="absolute inset-y-[14%] left-[78.5%] right-[4%] flex flex-col items-center justify-center text-center text-[#2a2620]">
                    <p className="font-display text-[clamp(1rem,4.2vw,1.6rem)] font-black leading-none" style={{ color }}>{big ?? '★'}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-60 sm:text-[10px]">{big ? 'Hediye' : 'Sürpriz'}</p>
                  </div>
                  {c.status === 'used' && (
                    <span aria-hidden className="pointer-events-none absolute left-[38%] top-1/2 -translate-y-1/2 rotate-[-14deg] rounded-md border-[3px] border-berry/70 px-2 py-0.5 font-display text-sm font-black uppercase tracking-[0.2em] text-berry/80 sm:text-base">Kullanıldı</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                  <span className={clsx('rounded-full px-2.5 py-1 text-xs font-bold', on ? (days !== null && days <= 3 ? 'bg-berry/12 text-berry' : 'bg-mint/15 text-mint-deep') : 'bg-paper-2 text-ink-soft')}>
                    {c.status === 'used' ? `Kullanıldı${m.used_at ? ` · ${dateTR(m.used_at)}` : ''}` : c.status === 'expired' ? 'Süresi doldu' : days === null ? 'Süresiz' : days === 0 ? 'Bugün son gün' : `${days} gün kaldı`}
                  </span>
                  {on && (
                    <span className="ml-auto flex gap-2">
                      {m.partner_url && (
                        <a href={m.partner_url} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-extrabold text-white" style={{ background: color }}>
                          Markaya git <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button onClick={() => used.mutate(c.id)} disabled={used.isPending} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5 text-sm font-bold hover:border-ink/30">
                        <Check className="size-4" /> Kullandım
                      </button>
                    </span>
                  )}
                </div>
                {(m.description || m.terms) && <p className="mt-2 px-1 text-xs leading-snug text-ink-soft">{[m.description, m.terms].filter(Boolean).join(' · ')}</p>}
              </motion.article>
            )
          })}
        </div>
      )}
    </div>
  )
}
