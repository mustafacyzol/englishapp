import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR, tl } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert, Modal, PageHeader, SkeletonPage } from '@/components/ui/Misc'
import { PlanBoard } from '@/components/pricing/PlanBoard'
import clsx from 'clsx'
import { BRAND } from '@/lib/brand'

interface Quote { amount: number; discount: number; total: number; currency: string; coupon: { code: string; description: string | null } | null }
interface StartResp { order: { uuid: string; status: string }; checkout: { payment_page_url?: string; checkout_form_content?: string } | null }

export default function Premium() {
  const { user } = useAuth()
  const nav = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['plans'], queryFn: () => get<{ data: Plan[] }>('/plans') })
  const [plan, setPlan] = useState<Plan | null>(null)
  const [coupon, setCoupon] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [form, setForm] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const q = useMutation({ mutationFn: (b: { plan_id: number; coupon?: string }) => post<Quote>('/checkout/quote', b), onSuccess: setQuote })
  const start = useMutation({
    mutationFn: () => post<StartResp>('/checkout', { plan_id: plan!.id, coupon: quote?.coupon?.code }),
    onSuccess: (r) => {
      if (!r.checkout) return nav(`/premium/result?order=${r.order.uuid}&status=${r.order.status}`)
      if (r.checkout.payment_page_url) window.location.href = r.checkout.payment_page_url
      else if (r.checkout.checkout_form_content) setForm(r.checkout.checkout_form_content)
    },
  })

  // iyzico's embedded form ships as a script tag; inject it so it executes.
  useEffect(() => {
    if (!form || !formRef.current) return
    formRef.current.innerHTML = '<div id="iyzipay-checkout-form" class="responsive"></div>'
    const holder = document.createElement('div')
    holder.innerHTML = form
    holder.querySelectorAll('script').forEach((old) => {
      const s = document.createElement('script')
      s.text = old.text
      if (old.src) s.src = old.src
      document.body.appendChild(s)
    })
  }, [form])

  const choose = (p: Plan) => {
    setPlan(p)
    setQuote(null)
    q.mutate({ plan_id: p.id })
  }
  // arriving from the public pricing page (or a link) with a package already picked
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (!data) return
    let slug = params.get('plan')
    try { slug ??= sessionStorage.getItem('dilgo.plan'); sessionStorage.removeItem('dilgo.plan') } catch { /* private mode */ }
    const p = slug ? data.data.find((x) => x.slug === slug) : null
    if (p) choose(p)
    if (params.get('plan')) setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  const TIER_LABEL = { premium: 'Premium', defne: 'Defne AI', plus: 'Premium + Defne' } as const

  if (isLoading || !data) return <SkeletonPage variant="cards" />
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader kicker={`${BRAND} paketleri`} title="Sana uygun paketi seç" />
      {(user?.premium.active || user?.defne?.active) && (
        <div className="mb-6 grid gap-2">
          {user?.premium.active && <Alert tone="success">Premium üyeliğin {dateTR(user.premium.until)} tarihine kadar aktif.</Alert>}
          {user?.defne?.active && <Alert tone="success">Defne AI paketin {user.defne.until ? `${dateTR(user.defne.until)} tarihine kadar` : 'okulun üzerinden'} aktif.</Alert>}
          <p className="text-sm text-ink-soft">Yeni paket alırsan süren kaldığı yerden uzar.</p>
        </div>
      )}
      <PlanBoard
        plans={data.data}
        cta={(tier, p) => tier === 'free'
          ? <Link to="/learn" className="flex h-12 w-full items-center justify-center rounded-2xl border-2 border-line font-display font-extrabold uppercase tracking-wide">Ücretsiz devam et</Link>
          : <Button block onClick={() => p && choose(p)} className={clsx(tier === 'defne' && '!bg-sage !shadow-[0_4px_0_0_var(--color-sage-deep)]', tier === 'plus' && '!bg-butter !text-[#1f2433] !shadow-[0_4px_0_0_var(--color-butter-deep)]')}>{tier === 'plus' ? 'İkisini birden al' : `${TIER_LABEL[tier]} al`}</Button>}
      />

      <Modal open={!!plan && !form} onClose={() => setPlan(null)}>
        {plan && (
          <div>
            <h2 className="text-2xl font-extrabold">{plan.name} · {plan.interval === 'year' ? 'Yıllık' : 'Aylık'}</h2>
            <p className="mb-5 text-ink-soft">{plan.duration_days} gün {TIER_LABEL[plan.tier ?? 'premium']} · {plan.tagline}</p>
            <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); q.mutate({ plan_id: plan.id, coupon }) }}>
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Kupon kodu" className="flex-1" />
              <Button type="submit" variant="secondary" loading={q.isPending} icon={<Ticket className="size-4" />}>Uygula</Button>
            </form>
            {q.error && <div className="mb-4"><Alert tone="error">{(q.error as ApiError).first()}</Alert></div>}
            {quote && (
              <dl className="mb-5 space-y-2 rounded-2xl border-2 border-line bg-paper-2 p-4 font-semibold">
                <div className="flex justify-between"><dt>Tutar</dt><dd>{tl(quote.amount)}</dd></div>
                {quote.discount > 0 && <div className="flex justify-between text-mint-deep"><dt>İndirim ({quote.coupon?.code})</dt><dd>-{tl(quote.discount)}</dd></div>}
                <div className="flex justify-between border-t-2 border-line/20 pt-2 font-display text-xl font-extrabold"><dt>Toplam</dt><dd>{tl(quote.total)}</dd></div>
              </dl>
            )}
            {start.error && <div className="mb-4"><Alert tone="error">{(start.error as ApiError).message}</Alert></div>}
            <Button block size="lg" loading={start.isPending} disabled={!quote} onClick={() => start.mutate()}>Ödemeye geç</Button>
            <p className="mt-3 text-center text-xs text-ink-soft">Ödeme adımında kart bilgilerin doğrudan iyzico'ya iletilir, bizde saklanmaz.</p>
          </div>
        )}
      </Modal>
      <Modal open={!!form} onClose={() => setForm(null)} className="sm:max-w-2xl">
        <div ref={formRef} />
      </Modal>
    </div>
  )
}
