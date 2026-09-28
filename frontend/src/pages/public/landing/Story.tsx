import { motion } from 'motion/react'
import { ArrowRight, BadgeCheck, GraduationCap, Lock, ShieldCheck } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'
import { higoImg } from '@/components/game/Higo'

const ease = [0.22, 1, 0.36, 1] as const

/** Honest trust points instead of borrowed logos. */
export function TrustBar() {
  const items = [
    { icon: GraduationCap, t: 'CEFR uyumlu müfredat', s: 'A1’den C1’e, 4 beceri' },
    { icon: BadgeCheck, t: 'Öğretmenler hazırlıyor', s: 'Bayrak Dil Okulları ekibi' },
    { icon: ShieldCheck, t: 'KVKK uyumlu, reklamsız', s: 'Çocuk hesapları veli onaylı' },
    { icon: Lock, t: 'Güvenli ödeme', s: 'İstediğin an iptal' },
  ]
  return (
    <section className="border-y-2 border-line bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-6 lg:grid-cols-4">
        {items.map((x, i) => (
          <motion.div key={x.t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 px-2 py-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-flame ring-1 ring-line"><x.icon className="size-5" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight">{x.t}</span>
              <span className="block text-xs text-ink-soft">{x.s}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/** Closing call to action: Higo cheers, the headline lands word by word. */
export function FinalCta3D() {
  return (
    <section className="px-5 pb-24 pt-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-flame to-[#d9391f] px-6 py-14 text-white sm:px-14 sm:py-16">
        <div aria-hidden className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.7)_1px,transparent_1.3px)] [background-size:22px_22px]" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="font-display text-[clamp(2.1rem,5vw,3.8rem)] font-black leading-[1.02] tracking-tight">Bugün başla,<br />yarın konuş.</motion.h2>
            <p className="mt-4 max-w-md text-lg text-white/85">İlk dersin 5 dakika. Kredi kartı gerekmez, istediğin an bırakabilirsin.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton to="/register" size="lg" variant="secondary">Ücretsiz hesap aç <ArrowRight className="size-5" /></LinkButton>
              <LinkButton to="/contact?konu=corporate" size="lg" variant="ghost" className="text-white hover:bg-white/10">Kurumsal teklif</LinkButton>
            </div>
          </div>
          <motion.img src={higoImg('cheer')} alt="" initial={{ opacity: 0, y: 40, rotate: -10 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 120, damping: 12 }} className="mx-auto w-52 drop-shadow-[0_30px_30px_rgba(80,10,0,.35)] sm:w-64" />
        </div>
      </div>
    </section>
  )
}
