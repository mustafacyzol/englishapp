import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { rewardImg } from '@/lib/assets'
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
        <div className="grid gap-6 lg:grid-cols-2">
          {list.map((c, i) => {
            const m = c.meta ?? {}
            const color = m.color ?? '#ff5a36'
            const on = c.status === 'active'
            const big = headline(m.offer)
            const days = c.expires_at ? Math.max(0, Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 864e5)) : null
            return (
              <motion.article
                key={c.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={clsx('relative flex min-h-[188px] overflow-hidden rounded-[22px] border-2 border-line bg-card shadow-[0_14px_30px_-22px_rgba(31,36,51,.55)]', !on && 'grayscale-[.7]')}
              >
                {/* stub */}
                <div className="relative flex w-[34%] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden px-3 py-5 text-center text-white" style={{ background: `linear-gradient(160deg, ${color}, color-mix(in oklab, ${color} 70%, #1f2433))` }}>
                  <span aria-hidden className="absolute inset-0 opacity-[.12] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:9px_9px]" />
                  {m.partner_logo
                    ? <Img src={m.partner_logo} alt="" className="relative size-11 rounded-xl bg-white object-contain p-1.5 shadow" />
                    : <span className="relative grid size-11 place-items-center rounded-xl bg-white/20 font-display text-xl font-black">{m.partner?.[0] ?? '?'}</span>}
                  <p className="relative font-display text-[clamp(1.4rem,4.5vw,2rem)] font-black leading-none">{big ?? 'Hediye'}</p>
                  <p className="relative max-w-full truncate text-[11px] font-black uppercase tracking-[0.14em] text-white/85">{m.partner}</p>
                </div>

                {/* tear line with notches */}
                <div aria-hidden className="relative w-0">
                  <span className="absolute -left-3 -top-3 size-6 rounded-full border-2 border-line bg-paper" />
                  <span className="absolute -bottom-3 -left-3 size-6 rounded-full border-2 border-line bg-paper" />
                  <span className="absolute inset-y-4 left-0 border-l-2 border-dashed border-line" />
                </div>

                {/* body */}
                <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                  <p className="font-display text-lg font-black leading-tight">{m.offer}</p>
                  {m.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{m.description}</p>}
                  <button
                    onClick={() => on && c.code && copy(c.code)}
                    disabled={!on}
                    className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border-2 border-dashed px-3 py-2 font-mono text-[15px] font-bold tracking-wider transition enabled:hover:bg-paper-2"
                    style={{ borderColor: on ? `${color}88` : undefined }}
                  >
                    <span className="truncate">{c.code}</span>
                    {on && <Copy className="size-4 shrink-0 text-ink-soft" />}
                  </button>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className={clsx('rounded-full px-2.5 py-1', on ? (days !== null && days <= 3 ? 'bg-berry/12 text-berry' : 'bg-mint/15 text-mint-deep') : 'bg-paper-2 text-ink-soft')}>
                      {c.status === 'used' ? `Kullanıldı${m.used_at ? ` · ${dateTR(m.used_at)}` : ''}` : c.status === 'expired' ? 'Süresi doldu' : days === null ? 'Süresiz' : days === 0 ? 'Bugün son gün' : `${days} gün kaldı`}
                    </span>
                    {c.expires_at && on && <span className="text-ink-soft">Son gün {dateTR(c.expires_at)}</span>}
                  </div>
                  {on && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      {m.partner_url && (
                        <a href={m.partner_url} target="_blank" rel="noreferrer" className="press inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-extrabold text-white" style={{ background: color }}>
                          Markaya git <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button onClick={() => used.mutate(c.id)} disabled={used.isPending} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3.5 py-2 text-sm font-bold hover:border-ink/30">
                        <Check className="size-4" /> Kullandım
                      </button>
                    </div>
                  )}
                  {m.terms && <p className="mt-3 text-[11px] leading-snug text-ink-soft">{m.terms}</p>}
                </div>

                {c.status === 'used' && (
                  <span aria-hidden className="pointer-events-none absolute right-4 top-4 rotate-[-12deg] rounded-lg border-[3px] border-ink/40 px-2 py-0.5 font-display text-sm font-black uppercase tracking-widest text-ink/50">Kullanıldı</span>
                )}
              </motion.article>
            )
          })}
        </div>
      )}
    </div>
  )
}
