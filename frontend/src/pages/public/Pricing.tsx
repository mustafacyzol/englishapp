import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight } from 'lucide-react'
import { get } from '@/lib/api'
import type { Plan } from '@/lib/types'
import { PlanBoard } from '@/components/pricing/PlanBoard'
import { Spinner } from '@/components/ui/Misc'
import { BRAND } from '@/lib/brand'

const FAQ: [string, string][] = [
  ['Ücretsiz paketle ne kadar ilerleyebilirim?', 'Ders yolunun tamamı ücretsizdir. Günlük can ve Defne mesajı sınırlıdır; Premium canı, Defne AI konuşma pratiğini sınırsıza yakın hale getirir.'],
  ['Premium ile Defne AI arasındaki fark ne?', 'Premium bütün kursu açar: sınırsız can, tüm hikâyeler, sınav modu. Defne AI ise yapay zekâ öğretmenle konuşma, sesli görüşme ve ayrıntılı yazı düzeltmesi içindir. İkisini birlikte alırsan daha az ödersin.'],
  ['Paketim kendiliğinden yenilenir mi?', 'Hayır. Süre bitince paket kapanır ve kartından yeniden çekim yapılmaz. İstersen yeniden alırsın.'],
  ['İade alabilir miyim?', 'Satın almadan sonraki 14 gün içinde Ayarlar > Abonelik bölümünden iade isteyebilirsin.'],
  ['Okulumuz için toplu alım yapabilir miyiz?', 'Evet. Okullar sayfasından teklif isteyin; öğrenci sayısına göre fiyat ve panel kurulumunu birlikte planlayalım.'],
]

/** The public pricing page: packages before signing up, every button leads to registration. */
export default function Pricing() {
  const { data, isLoading } = useQuery({ queryKey: ['plans'], queryFn: () => get<{ data: Plan[] }>('/plans'), staleTime: 300_000 })
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(232,64,58,.10),transparent),radial-gradient(50%_60%_at_85%_10%,rgba(79,138,110,.12),transparent)]" />
      <section className="relative mx-auto max-w-6xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[12px] font-black uppercase tracking-[0.22em] text-flame">{BRAND} paketleri</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mx-auto mt-3 max-w-3xl font-display text-4xl font-black leading-[1.05] sm:text-6xl">Ücretsiz başla, hazır olunca yüksel.</motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">Premium bütün kursu açar. Defne AI, yapay zekâ öğretmeninle her gün konuşmanı sağlar. İkisi birlikte en avantajlısı.</motion.p>
      </section>
      <section className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {isLoading || !data ? <Spinner className="py-24" /> : (
          <PlanBoard
            plans={data.data}
            cta={(tier, plan) => (
              <Link
                to={tier === 'free' ? '/register' : `/register?plan=${plan?.slug}`}
                className={clsx('press flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-display font-extrabold uppercase tracking-wide', tier === 'plus' ? 'bg-butter text-[#1f2433] shadow-[0_4px_0_0_var(--color-butter-deep)]' : tier === 'defne' ? 'bg-sage text-white shadow-[0_4px_0_0_var(--color-sage-deep)]' : tier === 'premium' ? 'bg-flame text-white shadow-[0_4px_0_0_var(--color-flame-deep)]' : 'border-2 border-line bg-card')}
              >
                {tier === 'free' ? 'Ücretsiz başla' : 'Hesap aç ve seç'} <ArrowRight className="size-4" />
              </Link>
            )}
          />
        )}
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-display text-3xl font-black">Sık sorulanlar</h2>
          <div className="mt-6 divide-y-2 divide-line rounded-[26px] border-2 border-line bg-card">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-extrabold">{q}<span className="text-xl text-ink-soft transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-ink-soft">Fiyatlar Türk lirası cinsindendir. Ödeme güvenli ödeme altyapısı üzerinden alınır.</p>
        </section>
      </section>
    </div>
  )
}
