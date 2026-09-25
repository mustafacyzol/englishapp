import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { get } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { celebrate } from '@/lib/fx'
import { tl } from '@/lib/format'
import { LinkButton } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Misc'

export default function PremiumResult() {
  const [p] = useSearchParams()
  const uuid = p.get('order')
  const { refresh } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['order', uuid], queryFn: () => get<{ order: { status: string; total: string; plan: { name: string } | null } }>(`/orders/${uuid}`), enabled: !!uuid })
  const paid = data?.order.status === 'paid'
  useEffect(() => {
    if (paid) {
      celebrate(true)
      refresh()
    }
  }, [paid, refresh])

  if (uuid && isLoading) return <Spinner label="Ödeme doğrulanıyor" />
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className="ink-card p-8">
        {paid ? <CheckCircle2 className="mx-auto size-20 text-mint-deep" /> : <XCircle className="mx-auto size-20 text-berry" />}
        <h1 className="mt-4 text-3xl font-extrabold">{paid ? 'Premium aktif! 🎉' : 'Ödeme tamamlanamadı'}</h1>
        <p className="mb-6 mt-2 text-ink-soft">
          {paid ? `${data?.order.plan?.name ?? ''} paketin tanımlandı (${tl(data!.order.total)}). Bonus elmas ve canlı ders kuponların Ödül Kasası'nda.` : 'Kartından ücret çekilmediyse tekrar deneyebilirsin. Sorun devam ederse destek ekibimize yaz.'}
        </p>
        <div className="grid gap-3">
          {paid ? <LinkButton to="/rewards">Ödül Kasasına git</LinkButton> : <LinkButton to="/premium">Tekrar dene</LinkButton>}
          <LinkButton to="/learn" variant="ghost">Öğrenmeye dön</LinkButton>
        </div>
      </div>
    </div>
  )
}
