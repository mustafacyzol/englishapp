import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Briefcase, Building2, Coins, Globe2, KeyRound, Megaphone, Save, Share2, ToggleRight } from 'lucide-react'
import { ApiError, get, put } from '@/lib/api'
import { useSiteConfig } from '@/lib/site'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Toggle } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { GoogleMark, AppleMark } from '@/components/auth/SocialButtons'
import { AdminTitle } from './kit'

type S = Record<string, string | number | boolean | null>

const TABS = [
  { key: 'general', label: 'Genel', icon: Megaphone },
  { key: 'brand', label: 'Marka ve iletişim', icon: Building2 },
  { key: 'social', label: 'Sosyal medya', icon: Share2 },
  { key: 'features', label: 'Özellikler', icon: ToggleRight },
  { key: 'corporate', label: 'Kurumsal paket', icon: Briefcase },
  { key: 'economy', label: 'Ekonomi ve limitler', icon: Coins },
  { key: 'auth', label: 'Giriş ve güvenlik', icon: KeyRound },
] as const
type Tab = (typeof TABS)[number]['key']

const FEATURES: [string, string, string][] = [
  ['features.duel', 'Gölge Düellosu', 'Arena, düello kupaları ve düello görevleri.'],
  ['features.leagues', 'Ligler', 'Haftalık lig tablosu.'],
  ['features.ai', 'Defne (AI öğretmen)', 'Sohbet, sesli arama ve yazı düzeltme.'],
  ['features.stories', 'Hikâyeler', 'Okuma ve dinleme kütüphanesi.'],
  ['features.exam', 'Sınav modu', 'YDS, YÖKDİL, YDT, IELTS ve TOEFL pratiği.'],
  ['features.chest_partners', 'Sandıkta iş ortağı hediyeleri', 'Kapalıyken sandık yerine elmas verir.'],
  ['features.social_login', 'Google ve Apple ile giriş', 'Anahtarlar sunucuda tanımlı olmalı.'],
  ['gamification.daily_chest', 'Günlük sandık', 'Günlük hedefe ulaşana sandık ödülü.'],
]
const NUM: [string, string][] = [
  ['referral.referee_gems', 'Davet edilene elmas'],
  ['referral.referrer_gems', 'Davet edene elmas'],
  ['referral.referrer_premium_days', 'Davet edene Premium gün (ilk alışverişte)'],
  ['ai.daily_limit_free', 'Ücretsiz AI mesaj limiti / gün'],
  ['ai.daily_limit_premium', 'Yalnız Premium: AI mesaj limiti / gün'],
  ['ai.daily_limit_defne', 'Defne AI paketi: AI mesaj limiti / gün'],
  ['economy.signup_gems', 'Yeni hesabın başlangıç elması'],
  ['gamification.heart_refill_gems', 'Can doldurma fiyatı (elmas)'],
]
const SOCIAL: [string, string][] = [
  ['social.instagram', 'Instagram'],
  ['social.youtube', 'YouTube'],
  ['social.tiktok', 'TikTok'],
  ['social.linkedin', 'LinkedIn'],
  ['social.x', 'X (Twitter)'],
  ['apps.ios', 'App Store sayfası (iOS)'],
  ['apps.android', 'Google Play sayfası (Android)'],
]

function Card({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border-2 border-line bg-card p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {text && <p className="mb-4 mt-1 text-sm text-ink-soft">{text}</p>}
      <div className={clsx(!text && 'mt-4')}>{children}</div>
    </section>
  )
}

/**
 * Everything about the public site the team changes without a deploy: notices,
 * brand and contact details, social links, which features are on, economy
 * numbers and sign-in. Saved values feed the public /config endpoint, so the
 * landing page, footer and app pick them up straight away.
 */
export default function AdminSettings() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: cfg } = useSiteConfig()
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<{ data: S }>('/admin/settings', true) })
  const [s, setS] = useState<S>({})
  const [tab, setTab] = useState<Tab>('general')
  useEffect(() => { if (data) setS(data.data) }, [data])
  const dirty = useMemo(() => !!data && Object.keys(s).some((k) => s[k] !== data.data[k]), [s, data])
  const set = (k: string, v: string | number | boolean | null) => setS((x) => ({ ...x, [k]: v }))
  const str = (k: string) => (s[k] as string) ?? ''

  const save = useMutation({
    mutationFn: () => {
      const nested: Record<string, unknown> = {}
      Object.entries(s).forEach(([k, v]) => {
        const [a, b] = k.split('.')
        if (b) nested[a] = { ...(nested[a] as object), [b]: v }
        else nested[a] = v
      })
      return put<{ data: S }>('/admin/settings', nested, true)
    },
    onSuccess: (r) => {
      qc.setQueryData(['admin-settings'], r)
      qc.invalidateQueries({ queryKey: ['config'] })
      toast('Site ayarları kaydedildi', 'success')
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (!data) return <Spinner />
  return (
    <div className="max-w-4xl pb-24">
      <AdminTitle title="Site ayarları" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-ink-soft">Buradaki değişiklikler kaydettiğin an siteye ve uygulamaya yansır; kod ya da yeniden yayın gerekmez.</p>

      <div className="no-scrollbar -mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={clsx('flex shrink-0 items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-sm font-extrabold transition', tab === t.key ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card text-ink-soft hover:text-ink')}>
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {tab === 'general' && (
          <>
            <Card title="Site durumu">
              <div className="divide-y-2 divide-line/10">
                <Toggle label="Bakım modu" description="Yöneticiler hariç herkes bakım ekranı görür." checked={!!s.maintenance_mode} onChange={(v) => set('maintenance_mode', v)} />
                <Toggle label="Yeni kayıtlar açık" description="Kapalıyken kayıt formu ve sosyal kayıt çalışmaz." checked={s.registration_open !== false} onChange={(v) => set('registration_open', v)} />
              </div>
            </Card>
            <Card title="Duyuru" text="Uygulamanın üst çubuğunda herkese gösterilir. Boş bırakırsan gizlenir.">
              <Input label="Duyuru metni" value={str('announcement')} onChange={(e) => set('announcement', e.target.value || null)} maxLength={300} />
              {str('announcement') && <p className="mt-3 rounded-lg bg-butter/20 px-3 py-2 text-sm font-bold">📣 {str('announcement')}</p>}
            </Card>
          </>
        )}

        {tab === 'brand' && (
          <>
            <Card title="Marka" text="Ana sayfada ve paylaşım önizlemelerinde kullanılır.">
              <div className="grid gap-4">
                <Input label="Slogan" value={str('brand.tagline')} onChange={(e) => set('brand.tagline', e.target.value || null)} maxLength={140} />
                <Textarea label="SEO açıklaması" value={str('seo.description')} onChange={(e) => set('seo.description', e.target.value || null)} maxLength={300} hint="Arama sonuçlarında görünen 150-160 karakterlik özet." />
              </div>
            </Card>
            <Card title="İletişim" text="Alt bilgide ve iletişim sayfasında gösterilir.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Destek e-postası" type="email" value={str('contact.email')} onChange={(e) => set('contact.email', e.target.value || null)} />
                <Input label="Telefon" value={str('contact.phone')} onChange={(e) => set('contact.phone', e.target.value || null)} placeholder="+90" />
                <Textarea label="Adres" className="sm:col-span-2" value={str('contact.address')} onChange={(e) => set('contact.address', e.target.value || null)} />
                <Input label="Okul kayıt/bilgi bağlantısı" value={str('school.cta_url')} onChange={(e) => set('school.cta_url', e.target.value || null)} placeholder="https://" />
                <Input label="WhatsApp destek numarası" value={str('school.whatsapp')} onChange={(e) => set('school.whatsapp', e.target.value || null)} placeholder="+90" />
              </div>
            </Card>
          </>
        )}

        {tab === 'social' && (
          <Card title="Sosyal medya hesapları" text="Doldurduğun hesaplar alt bilgide simge olarak görünür. Tam https adresi gir.">
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL.map(([k, l]) => <Input key={k} label={l} value={str(k)} onChange={(e) => set(k, e.target.value || null)} placeholder="https://" />)}
            </div>
          </Card>
        )}

        {tab === 'features' && (
          <Card title="Özellikleri aç / kapat" text="Kapalı bir özellik menüden kalkar ve API tarafında da erişime kapanır.">
            <div className="divide-y-2 divide-line/10">
              {FEATURES.map(([k, l, d]) => <Toggle key={k} label={l} description={d} checked={s[k] !== false} onChange={(v) => set(k, v)} />)}
            </div>
          </Card>
        )}

        {tab === 'corporate' && (
          <Card title="Kurumsal paket kartı" text="Ana sayfadaki ve Premium sayfasındaki paketlerin yanında görünür. Bireysel paketleri Paketler sayfasından düzenlersin.">
            <div className="divide-y-2 divide-line/10">
              <Toggle label="Kurumsal kartı göster" description="Kapalıyken yalnızca bireysel paketler listelenir." checked={s['corporate.enabled'] !== false} onChange={(v) => set('corporate.enabled', v)} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Paket adı" value={str('corporate.name')} onChange={(e) => set('corporate.name', e.target.value || null)} maxLength={60} />
              <Input label="Kısa açıklama" value={str('corporate.tagline')} onChange={(e) => set('corporate.tagline', e.target.value || null)} maxLength={140} />
              <Input label="Fiyat yazısı" value={str('corporate.price')} onChange={(e) => set('corporate.price', e.target.value || null)} maxLength={40} hint="ör. Teklif alın ya da ₺90 / öğrenci" />
              <Input label="Fiyatın altındaki not" value={str('corporate.note')} onChange={(e) => set('corporate.note', e.target.value || null)} maxLength={140} />
              <Textarea label="Özellikler (her satıra bir tane)" className="sm:col-span-2" rows={5} value={str('corporate.features')} onChange={(e) => set('corporate.features', e.target.value || null)} maxLength={1000} />
              <Input label="Buton yazısı" value={str('corporate.cta')} onChange={(e) => set('corporate.cta', e.target.value || null)} maxLength={40} />
              <Input label="Buton bağlantısı" value={str('corporate.url')} onChange={(e) => set('corporate.url', e.target.value || null)} placeholder="/contact?konu=corporate" hint="Site içi yol (/ ile başlar) ya da https adresi" />
            </div>
          </Card>
        )}

        {tab === 'economy' && (
          <Card title="Elmas, davet ve AI limitleri">
            <div className="grid gap-4 sm:grid-cols-2">
              {NUM.map(([k, l]) => <Input key={k} type="number" min={0} label={l} value={Number(s[k] ?? 0)} onChange={(e) => set(k, Number(e.target.value))} />)}
            </div>
            <p className="mt-4 text-sm text-ink-soft">Sandık olasılıkları ve mağaza fiyatları <Link to="/admin/r/reward-items" className="font-bold underline">Ödül kartları ve sandıklar</Link>, iş ortağı hediyeleri <Link to="/admin/r/partner-offers" className="font-bold underline">Sandık teklifleri</Link> sayfasından yönetilir.</p>
          </Card>
        )}

        {tab === 'economy' && (
          <Card title="Spam ve kötüye kullanım sınırları" text="Bir öğrencinin oluşturabileceği içerik. Sınır dolunca öğrenci ne kadar beklemesi gerektiğini açıkça görür.">
            <div className="grid gap-4 sm:grid-cols-2">
              {([['limits.word_sets_per_day', 'Günde yeni set (kopya dahil)', 20], ['limits.word_sets_total', 'Bir öğrencinin en çok seti', 60], ['limits.public_sets', 'Herkese açık set sayısı', 10], ['limits.words_per_day', 'Günde deftere yeni kelime', 300], ['limits.notebook_size', 'Kelime defteri kapasitesi', 5000], ['moderation.report_hide', 'Kaç şikâyette set otomatik gizlensin', 3]] as const).map(([k, l, d]) => (
                <Input key={k} type="number" min={1} label={l} value={Number(s[k] ?? d)} onChange={(e) => set(k, Number(e.target.value))} />
              ))}
            </div>
            <Textarea className="mt-4" rows={2} label="Paylaşılan içerikte yasak kelimeler" hint="Virgülle ayırın. Herkese açık setlerde ve profil yazılarında bu kelimeler, bağlantılar ve telefon/e-posta engellenir." value={String(s['moderation.blocked_words'] ?? '')} onChange={(e) => set('moderation.blocked_words', e.target.value || null)} />
          </Card>
        )}

        {tab === 'auth' && (
          <>
            <Card title="Beni hatırla" text="İşaretleyen kullanıcının oturumu bu süre boyunca açık kalır. İşaretlemeyenlerin oturumu 1 gün sonra kapanır.">
              <Input type="number" min={1} max={365} label="Oturum süresi (gün)" value={Number(s['auth.remember_days'] ?? 60)} onChange={(e) => set('auth.remember_days', Number(e.target.value))} className="max-w-xs" />
            </Card>
            <Card title="Google ve Apple ile giriş" text="Kimlik anahtarları güvenlik için yalnızca sunucu ortam değişkenlerinde tutulur (GOOGLE_CLIENT_ID, APPLE_CLIENT_ID). Kimlik doğrulaması sunucuda yapılır.">
              <div className="grid gap-3 sm:grid-cols-2">
                {([['Google', cfg?.social_login?.google, GoogleMark], ['Apple', cfg?.social_login?.apple, AppleMark]] as const).map(([name, id, Mark]) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl border-2 border-line p-4">
                    <Mark className="size-7" />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold">{name}</p>
                      <p className={clsx('text-xs font-bold', id ? 'text-mint-deep' : 'text-ink-soft')}>{id ? 'Yapılandırıldı, açık' : 'Anahtar tanımlı değil, buton “yakında” der'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Güvenlik" text="Yönetim paneline girişte her zaman ek doğrulama (e-posta kodu veya doğrulama uygulaması) istenir; tüm değişiklikler denetim kaydına yazılır.">
              <p className="flex items-center gap-2 text-sm font-bold"><Globe2 className="size-4 text-mint-deep" /> Kayıt formunda robot doğrulaması: {cfg?.captcha ? 'açık' : 'kapalı (TURNSTILE anahtarı tanımlı değil)'}</p>
            </Card>
          </>
        )}
      </div>

      {/* sticky save bar */}
      <div className={clsx('fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-card/95 px-4 py-3 backdrop-blur transition-transform md:left-60', dirty ? 'translate-y-0' : 'translate-y-full')}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="text-sm font-bold">Kaydedilmemiş değişiklikler var</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => data && setS(data.data)}>Geri al</Button>
            <Button loading={save.isPending} onClick={() => save.mutate()} icon={<Save className="size-4" />}>Kaydet</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
