import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowRight, Check, Minus, ShieldCheck, RotateCcw, CreditCard } from 'lucide-react'
import type { Plan } from '@/lib/types'
import { img } from '@/lib/assets'
import { higoImg } from '@/components/game/Higo'
import { BRAND } from '@/lib/brand'

type Tier = 'free' | 'premium' | 'defne' | 'plus'
type Billing = 'month' | 'year'

const fmt = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: n % 1 ? 2 : 0 })

/** Each package: its colour, its face and a one-line promise. */
const LOOK: Record<Tier, { name: string; line: string; accent: string; ring: string; chip: string; face: string }> = {
  free: { name: 'Ücretsiz', line: 'Her gün biraz, sonsuza dek', accent: 'text-ink', ring: 'bg-line', chip: 'bg-paper-2 text-ink-soft', face: higoImg('wave') },
  premium: { name: 'Premium', line: 'Bütün kurs, sınırsız can', accent: 'text-flame', ring: 'bg-flame/50', chip: 'bg-flame/10 text-flame', face: higoImg('books') },
  defne: { name: 'Defne AI', line: 'Konuşma öğretmenin, her an', accent: 'text-sage', ring: 'bg-sage/60', chip: 'bg-sage/12 text-sage', face: img('defne/avatar.webp') },
  plus: { name: 'Premium + Defne', line: 'Kurs ve öğretmen bir arada', accent: 'text-laurel', ring: 'bg-[linear-gradient(140deg,#c9a23f,#e8403a_45%,#4f8a6e)]', chip: 'bg-laurel/15 text-[#9a7a22]', face: img('defne/wave.webp') },
}

const FREE_FEATURES = ['Ders yolu ve seviye testi', 'Günde 5 can', 'Seçili hikâyeler', 'Kelime oyunları ve defter', 'Defne ile günde 10 mesaj']

/** The rows of the comparison table: what each package gives. */
const MATRIX: { group: string; rows: [string, ...(string | boolean)[]][] }[] = [
  { group: 'Öğrenme', rows: [
    ['Ders yolu, 1. sınıftan C1\'e', true, true, true, true],
    ['Can', '5 / gün', 'Sınırsız', '5 / gün', 'Sınırsız'],
    ['Hikâyeler ve sesli okuma', 'Seçili', 'Hepsi', 'Seçili', 'Hepsi'],
    ['Sınav modu (LGS, YDT, YDS, YÖKDİL, IELTS, TOEFL)', 'Deneme', true, 'Deneme', true],
    ['Reklamsız', false, true, false, true],
  ] },
  { group: 'Defne, yapay zekâ öğretmen', rows: [
    ['Defne ile günlük mesaj', '10', '30', '300', '300'],
    ['Sesli görüşme ve telaffuz geri bildirimi', false, false, true, true],
    ['Yazı atölyesinde ayrıntılı düzeltme', 'Günde 1', 'Günde 3', true, true],
    ['Tüm rol yapma senaryoları', false, true, true, true],
  ] },
  { group: 'Ekstralar', rows: [
    ['Bonus elmas (yıllık)', false, '2000', '500', '3000'],
    ['Canlı ders kuponu (yıllık)', false, '2', false, '4'],
    ['CEFR seviye sertifikası', false, true, false, true],
  ] },
]

/**
 * The price board, shared by the public pricing page and the in-app one:
 * monthly or yearly, four columns (free, Premium, Defne AI, both), a detailed
 * comparison and the schools block. The caller decides what each button does.
 */
export function PlanBoard({ plans, cta, current }: { plans: Plan[]; cta: (tier: Tier, plan: Plan | null) => ReactNode; current?: Partial<Record<Tier, boolean>> }) {
  const [billing, setBilling] = useState<Billing>('year')
  const pick = (tier: Exclude<Tier, 'free'>, b: Billing) => plans.find((p) => (p.tier ?? 'premium') === tier && p.interval === b) ?? null
  const tiers: Tier[] = ['free', 'premium', 'defne', 'plus']
  const save = (() => {
    const m = pick('plus', 'month'), y = pick('plus', 'year')
    return m && y ? Math.round((1 - Number(y.price) / (Number(m.price) * 12)) * 100) : 0
  })()
  return (
    <div>
      {/* monthly / yearly */}
      <div className="mb-8 flex justify-center">
        <div role="radiogroup" aria-label="Ödeme dönemi" className="relative grid grid-cols-2 rounded-full border-2 border-line bg-card p-1 shadow-hard-sm">
          {(['month', 'year'] as const).map((b) => (
            <button key={b} role="radio" aria-checked={billing === b} onClick={() => setBilling(b)} className={clsx('relative z-10 flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-extrabold transition sm:px-7', billing === b ? 'text-on-inv' : 'text-ink-soft hover:text-ink')}>
              {billing === b && <motion.span layoutId="billing" className="absolute inset-0 -z-10 rounded-full bg-inv" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              {b === 'month' ? 'Aylık' : 'Yıllık'}
              {b === 'year' && save > 0 && <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-black', billing === b ? 'bg-butter text-[#1f2433]' : 'bg-mint/15 text-mint-deep')}>%{save}'e varan</span>}
            </button>
          ))}
        </div>
      </div>

      {/* four across only when the board itself is wide (the app has a sidebar) */}
      <div className="@container"><div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
        {tiers.map((t, i) => {
          const plan = t === 'free' ? null : pick(t, billing)
          if (t !== 'free' && !plan) return null
          return <PlanCard key={t} tier={t} plan={plan} billing={billing} index={i} active={!!current?.[t]} cta={cta(t, plan)} />
        })}
      </div></div>

      <Guarantees />
      <Compare />
      <SchoolsBlock />
    </div>
  )
}

function PlanCard({ tier, plan, billing, index, cta, active }: { tier: Tier; plan: Plan | null; billing: Billing; index: number; cta: ReactNode; active: boolean }) {
  const L = LOOK[tier]
  const featured = tier === 'plus'
  const price = plan ? Number(plan.price) : 0
  const perMonth = plan && billing === 'year' ? price / 12 : price
  const was = plan?.compare_at_price ? Number(plan.compare_at_price) : null
  const features = plan?.features?.length ? plan.features : FREE_FEATURES
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={clsx('relative rounded-[30px] p-[2px]', L.ring, featured && '@5xl:-mt-3 @5xl:mb-[-12px]')}
    >
      <div className={clsx('relative flex h-full flex-col overflow-hidden rounded-[28px] p-5 sm:p-6', featured ? 'bg-inv text-on-inv' : 'bg-card')}>
        {/* the package's face, peeking from the corner */}
        <img src={L.face} alt="" aria-hidden className={clsx('pointer-events-none absolute -right-3 -top-2 w-24 select-none object-contain opacity-95', tier === 'defne' || tier === 'plus' ? 'rounded-full' : '', tier === 'defne' && 'size-20 -right-2 top-3 ring-4 ring-sage/20', tier === 'plus' && 'size-20 -right-2 top-3 ring-4 ring-laurel/40')} />
        <div className="relative pr-20">
          <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em]', featured ? 'bg-white/12 text-[#f7d774]' : L.chip)}>{plan?.badge ?? (tier === 'free' ? 'Başlangıç' : L.name)}</span>
          <h3 className="mt-3 font-display text-2xl font-black leading-tight">{L.name}</h3>
          <p className={clsx('text-sm', featured ? 'text-on-inv/70' : 'text-ink-soft')}>{plan?.tagline ?? L.line}</p>
        </div>

        <div className="mt-5 min-h-[86px]">
          {plan ? (
            <>
              <p className="flex items-baseline gap-1.5">
                <span className="font-display text-[2.6rem] font-black leading-none tracking-tight">{fmt(Math.round(perMonth * 100) / 100)}</span>
                <span className={clsx('text-sm font-bold', featured ? 'text-on-inv/70' : 'text-ink-soft')}>₺ / ay</span>
              </p>
              <p className={clsx('mt-1.5 text-[13px] font-semibold', featured ? 'text-on-inv/70' : 'text-ink-soft')}>
                {billing === 'year' ? <>Yılda {fmt(price)} ₺ tek ödeme{was && <> · <s className="opacity-70">{fmt(was)} ₺</s></>}</> : <>Her ay yenilenmez, istediğin zaman yeniden al</>}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-[2.6rem] font-black leading-none tracking-tight">0 ₺</p>
              <p className="mt-1.5 text-[13px] font-semibold text-ink-soft">Kart gerekmez</p>
            </>
          )}
        </div>

        <ul className="mt-4 flex-1 space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex gap-2.5 text-[14px] leading-snug">
              <span className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', featured ? 'bg-white/12 text-[#f7d774]' : 'bg-paper-2', !featured && L.accent)}><Check className="size-3" strokeWidth={3.5} /></span>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-6">{active ? <p className={clsx('rounded-2xl border-2 border-dashed py-3 text-center text-sm font-extrabold', featured ? 'border-white/25' : 'border-line')}>Şu an kullandığın paket</p> : cta}</div>
      </div>
    </motion.article>
  )
}

function Guarantees() {
  const items = [
    { icon: ShieldCheck, t: 'Güvenli ödeme', d: 'Kart bilgilerin doğrudan ödeme kuruluşuna gider, bizde saklanmaz.' },
    { icon: RotateCcw, t: '14 gün iade', d: 'Memnun kalmazsan ilk 14 günde ücretini geri iste.' },
    { icon: CreditCard, t: 'Otomatik yenileme yok', d: 'Süre bitince paket kendiliğinden kapanır, sürpriz çekim olmaz.' },
  ]
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      {items.map((x) => (
        <div key={x.t} className="flex gap-3 rounded-2xl border-2 border-line bg-card p-4">
          <x.icon className="mt-0.5 size-5 shrink-0 text-mint-deep" />
          <div><p className="font-extrabold">{x.t}</p><p className="text-sm text-ink-soft">{x.d}</p></div>
        </div>
      ))}
    </div>
  )
}

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-5 text-mint-deep" strokeWidth={3} aria-label="Var" />
  if (v === false) return <Minus className="mx-auto size-4 text-ink-soft/50" aria-label="Yok" />
  return <span className="text-sm font-bold">{v}</span>
}

/** Feature by feature. On a phone the table scrolls sideways inside its card, the page does not. */
function Compare() {
  const heads: Tier[] = ['free', 'premium', 'defne', 'plus']
  return (
    <section className="mt-14">
      <h2 className="text-center font-display text-3xl font-black">Paketleri karşılaştır</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-ink-soft">Hangi pakette ne var, satır satır.<span className="block text-xs font-bold sm:hidden">Tabloyu yana kaydırabilirsin.</span></p>
      <div className="mt-6 overflow-x-auto overscroll-x-contain rounded-[26px] border-2 border-line bg-card">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-line">
              <th className="sticky left-0 z-10 bg-card p-4 text-sm font-black text-ink-soft">Özellik</th>
              {heads.map((t) => <th key={t} className={clsx('p-4 text-center font-display text-base font-black', LOOK[t].accent)}>{LOOK[t].name}</th>)}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((g) => (
              <FragmentRows key={g.group} group={g.group} rows={g.rows} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FragmentRows({ group, rows }: { group: string; rows: [string, ...(string | boolean)[]][] }) {
  return (
    <>
      <tr><td colSpan={5} className="bg-paper-2 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-ink-soft">{group}</td></tr>
      {rows.map(([label, ...vals]) => (
        <tr key={label} className="border-b border-line/60 last:border-0">
          <td className="sticky left-0 z-10 bg-card p-4 text-[14px] font-semibold">{label}</td>
          {vals.map((v, i) => <td key={i} className={clsx('p-4 text-center', i === 3 && 'bg-laurel/5')}><Cell v={v} /></td>)}
        </tr>
      ))}
    </>
  )
}

/** Schools have their own offer: a wide block that leads to the schools page. */
function SchoolsBlock() {
  return (
    <section className="mt-14 overflow-hidden rounded-[30px] bg-inv text-on-inv">
      <div className="grid items-center gap-6 p-6 sm:p-9 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-butter">Okullar ve kurumlar için</p>
          <h2 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">Bütün okul, tek panelde.</h2>
          <p className="mt-3 max-w-lg text-on-inv/75">Müdür ve öğretmen panelleri, sınıflar, ders kitabı ünitelerine göre ödev, okul ligi ve her öğrenciye Premium ile Defne AI. Fiyat öğrenci sayısına göre teklifle belirlenir.</p>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            {['Sınıf ve ödev takibi', '1-12. sınıf ünite içerikleri', 'LGS ve YDT hazırlığı', 'Okulunuzun logosu ve rengi'].map((f) => <li key={f} className="flex items-center gap-2"><Check className="size-4 text-butter" strokeWidth={3} />{f}</li>)}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/okullar" className="press inline-flex h-12 items-center gap-2 rounded-2xl bg-butter px-5 font-display font-extrabold text-[#1f2433] shadow-[0_4px_0_0_var(--color-butter-deep)]">Okullar sayfası <ArrowRight className="size-4" /></Link>
            <Link to="/okullar#basvuru" className="inline-flex h-12 items-center gap-2 rounded-2xl border-2 border-white/25 px-5 font-extrabold">Teklif alın</Link>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <img src={img('schools/teacher.webp')} alt="" className="ml-auto aspect-[4/3] w-full max-w-sm rounded-[24px] object-cover" />
          <img src={higoImg('point')} alt="" className="absolute -bottom-4 -left-2 w-24 drop-shadow-[0_10px_14px_rgba(0,0,0,.35)]" />
        </div>
      </div>
    </section>
  )
}

/** A short line about the brand for page headers. */
export const PRICING_KICKER = `${BRAND} paketleri`
