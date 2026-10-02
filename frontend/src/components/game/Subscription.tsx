import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarClock, Check, ChevronRight, ReceiptText, RotateCcw, ShieldCheck } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR } from '@/lib/format'
import { img } from '@/lib/assets'
import type { Me } from '@/lib/types'
import { Button, LinkButton } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Img } from '@/components/ui/Img'

interface Sub {
  premium: { active: boolean; until: string | null }
  auto_renew: boolean
  current: { id: number; plan: { name: string; interval: string; duration_days: number } | null; source: string; starts_at: string; ends_at: string; cancelled_at: string | null; cancel_reason: string | null } | null
  order: { uuid: string; total: string; currency: string; status: string; paid_at: string | null; refund_requested_at: string | null } | null
  refund: { eligible: boolean; deadline: string | null; requested: boolean }
  reasons: Record<string, string>
  history: { id: number; plan: string | null; source: string; status: string; starts_at: string; ends_at: string; cancelled_at: string | null }[]
}

const SOURCE: Record<string, string> = { purchase: 'Satın alma', redeem: 'Hediye kodu', reward: 'Ödül kartı', admin: 'DilGO hediyesi', referral: 'Davet ödülü', institution: 'Okul' }

/**
 * Profile > Aboneliğim. Packages are paid once and never renew, so the card says
 * so plainly; cancelling means "end with this period", and inside 14 days a paid
 * order can be sent for a refund.
 */
export function SubscriptionCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const { setUser } = useAuth()
  const { data } = useQuery({ queryKey: ['subscription'], queryFn: () => get<Sub>('/account/subscription') })
  const [open, setOpen] = useState(false)
  const done = (r: Sub & { user: Me }, msg: string) => { qc.setQueryData(['subscription'], r); setUser(r.user); toast(msg, 'success') }
  const resume = useMutation({
    mutationFn: () => post<Sub & { user: Me }>('/account/subscription/resume'),
    onSuccess: (r) => done(r, 'İptal geri alındı. Premium’un devam ediyor.'),
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (!data) return <div className="ink-card mb-6 h-40 animate-pulse" />
  const c = data.current
  const daysLeft = data.premium.until ? Math.max(0, Math.ceil((new Date(data.premium.until).getTime() - Date.now()) / 864e5)) : 0

  return (
    <section className="ink-card mb-6 overflow-hidden" aria-labelledby="sub-title">
      <div className="flex items-center justify-between gap-3 border-b-2 border-line px-5 py-4">
        <h2 id="sub-title" className="text-xl font-extrabold">Aboneliğim</h2>
        <Link to="/premium" className="flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-ink">Paketler <ChevronRight className="size-4" /></Link>
      </div>

      {!data.premium.active ? (
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-paper-2"><Img src={img('rewards/crown.webp')} alt="" className="size-9 opacity-60 grayscale" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-black">Ücretsiz sürümdesin</p>
            <p className="text-sm text-ink-soft">Premium ile sınırsız can, tüm hikâyeler ve Defne ile daha fazla konuşma.</p>
          </div>
          <LinkButton to="/premium" variant="butter">Premium’a geç</LinkButton>
        </div>
      ) : (
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-butter/25"><Img src={img('rewards/crown.webp')} alt="" className="size-9" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-black">{c?.plan?.name ?? 'Premium'}</p>
              <p className="text-sm text-ink-soft">{c ? SOURCE[c.source] ?? 'Premium' : 'Premium'} · {data.premium.until && `${dateTR(data.premium.until)} tarihine kadar`}</p>
            </div>
            <span className={clsx('rounded-full px-3 py-1 text-xs font-black', c?.cancelled_at ? 'bg-berry/12 text-berry' : 'bg-mint/15 text-mint-deep')}>
              {c?.cancelled_at ? 'İptal edildi' : 'Aktif'}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Fact icon={<CalendarClock className="size-4" />} label="Kalan süre" value={`${daysLeft} gün`} />
            <Fact icon={<RotateCcw className="size-4" />} label="Yenileme" value="Otomatik yenilenmez" />
            <Fact icon={<ReceiptText className="size-4" />} label="Son ödeme" value={data.order?.paid_at ? `${data.order.total} ${data.order.currency === 'TRY' ? '₺' : data.order.currency} · ${dateTR(data.order.paid_at)}` : 'Yok'} />
          </div>

          {data.refund.requested && (
            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sky/10 p-3 text-sm font-semibold"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky" /> İade talebin alındı. Ekibimiz 3 iş günü içinde e-postayla dönüş yapacak.</p>
          )}
          {c?.cancelled_at && !data.refund.requested && (
            <p className="mt-4 rounded-2xl bg-paper-2 p-3 text-sm font-semibold">Premium’un {data.premium.until && dateTR(data.premium.until)} tarihine kadar sürüyor, sonra hesabın ücretsiz sürüme döner. Ödeme alınmaz.</p>
          )}

          {c && (
            <div className="mt-4 flex flex-wrap gap-2">
              {c.cancelled_at
                ? <Button variant="secondary" size="sm" loading={resume.isPending} onClick={() => resume.mutate()}>İptali geri al</Button>
                : <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Aboneliği iptal et</Button>}
              <Link to="/refund" className="inline-flex items-center px-2 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline">İptal ve iade koşulları</Link>
            </div>
          )}
        </div>
      )}

      {data.history.length > 0 && (
        <details className="group border-t-2 border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-bold text-ink-soft hover:text-ink">
            Geçmiş ({data.history.length}) <ChevronRight className="size-4 transition group-open:rotate-90" />
          </summary>
          <ul className="divide-y-2 divide-line px-5 pb-3">
            {data.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="font-bold">{h.plan ?? SOURCE[h.source] ?? 'Premium'}</span>
                <span className="text-ink-soft">{dateTR(h.starts_at)} → {dateTR(h.ends_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {c && <CancelFlow open={open} onClose={() => setOpen(false)} sub={data} onDone={(r, refund) => { setOpen(false); done(r, refund ? 'İade talebin alındı.' : 'Aboneliğin iptal edildi. Süre sonuna kadar Premium’sun.') }} />}
    </section>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-paper-2 px-3 py-2.5">
      <span className="text-ink-soft">{icon}</span>
      <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span><span className="block truncate text-sm font-extrabold">{value}</span></span>
    </div>
  )
}

/** Two short steps: why, then what happens (end with the period, or refund inside 14 days). */
function CancelFlow({ open, onClose, sub, onDone }: { open: boolean; onClose: () => void; sub: Sub; onDone: (r: Sub & { user: Me }, refund: boolean) => void }) {
  const toast = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [refund, setRefund] = useState(false)
  const m = useMutation({
    mutationFn: () => post<Sub & { user: Me }>('/account/subscription/cancel', { reason, note: note || null, refund }),
    onSuccess: (r) => { onDone(r, refund); setStep(1); setReason(''); setNote(''); setRefund(false) },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="p-6">
        <p className="text-xs font-black uppercase tracking-widest text-ink-soft">Adım {step}/2</p>
        {step === 1 ? (
          <>
            <h3 className="mt-1 text-2xl">Neden ayrılmak istiyorsun?</h3>
            <p className="mt-1 text-sm text-ink-soft">Cevabın DilGO’yu geliştirmemize yardım eder.</p>
            <div className="mt-4 grid gap-2" role="radiogroup">
              {Object.entries(sub.reasons).map(([k, v]) => (
                <button key={k} role="radio" aria-checked={reason === k} onClick={() => setReason(k)} className={clsx('flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left font-bold transition', reason === k ? 'border-ink bg-paper-2' : 'border-line hover:border-ink/30')}>
                  {v} {reason === k && <Check className="size-4" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <Textarea id="cancel-note" className="mt-3" rows={2} maxLength={400} placeholder="Eklemek istediğin bir şey var mı? (isteğe bağlı)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
              <Button disabled={!reason} onClick={() => setStep(2)}>Devam</Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-1 text-2xl">Nasıl ilerleyelim?</h3>
            <div className="mt-4 grid gap-2">
              <Choice on={!refund} onClick={() => setRefund(false)} title="Süre sonunda bitsin" text={`Premium ${sub.premium.until ? dateTR(sub.premium.until) : ''} tarihine kadar sürer, sonra ücretsiz sürüme dönersin. Yeni ödeme alınmaz.`} />
              <Choice
                on={refund}
                disabled={!sub.refund.eligible}
                onClick={() => sub.refund.eligible && setRefund(true)}
                title="İptal et ve iade iste"
                text={sub.refund.eligible ? `${sub.refund.deadline ? dateTR(sub.refund.deadline) : ''} tarihine kadar iade isteyebilirsin. Onaylanınca Premium günlerin geri alınır.` : 'İade yalnızca satın alma tarihinden itibaren 14 gün içinde ve ödemeli üyeliklerde mümkün.'}
              />
            </div>
            <p className="mt-3 text-xs text-ink-soft">Premium’a özel içerikleri kullandıysan iade, <Link to="/refund" className="font-bold underline">iade politikamıza</Link> göre değerlendirilir.</p>
            <div className="mt-5 flex justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Geri</Button>
              <Button variant="danger" loading={m.isPending} onClick={() => m.mutate()}>{refund ? 'İade talebi gönder' : 'Aboneliği iptal et'}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function Choice({ on, disabled, onClick, title, text }: { on: boolean; disabled?: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button role="radio" aria-checked={on} aria-disabled={disabled} onClick={onClick} className={clsx('rounded-2xl border-2 p-4 text-left transition', on ? 'border-ink bg-paper-2' : 'border-line', disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-ink/30')}>
      <span className="flex items-center justify-between font-black">{title} {on && <Check className="size-4" strokeWidth={3} />}</span>
      <span className="mt-1 block text-sm text-ink-soft">{text}</span>
    </button>
  )
}
