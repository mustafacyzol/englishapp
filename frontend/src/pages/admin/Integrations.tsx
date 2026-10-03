import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { BookAudio, CreditCard, Mail, Mic, Save, Send, Sparkles, Volume2 } from 'lucide-react'
import { ApiError, get, post, put } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { speak, speakNeural } from '@/lib/speech'
import { Button } from '@/components/ui/Button'
import { Input, Toggle } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pill } from './kit'

type Secret = { set: boolean; hint: string | null }
type Data = Record<string, string | number | boolean | null | Secret>

const SECRETS = ['payments.iyzico.api_key', 'payments.iyzico.secret_key', 'tts.elevenlabs.key', 'tts.openai.key', 'tts.google.key', 'ai.api_key', 'mail.password'] as const
const isSecret = (k: string) => (SECRETS as readonly string[]).includes(k)

function Card({ icon, title, text, status, children }: { icon: ReactNode; title: string; text: string; status?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border-2 border-line bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-paper-2">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">{text}</p>
        </div>
        {status}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Segmented<T extends string>({ value, onChange, items, disabled }: { value: T; onChange: (v: T) => void; items: [T, string][]; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-xl border-2 border-line bg-paper-2 p-1">
      {items.map(([v, l]) => (
        <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)} className={clsx('rounded-lg px-3.5 py-1.5 text-sm font-extrabold transition', value === v ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}>{l}</button>
      ))}
    </div>
  )
}

function Range({ label, hint, min, max, step, value, onChange, disabled, fmt = (v) => String(v) }: { label: string; hint?: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; disabled?: boolean; fmt?: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm font-bold">{label}<span className="font-mono text-ink-soft">{fmt(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-coral,#ff5a36)]" />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

/**
 * Keys and tuning for the services the product talks to: iyzico for payments,
 * ElevenLabs for Defne's voice (plus lip-sync strength and speed) and the AI
 * model. Secrets are write-only: the panel shows whether one is set and its last
 * four characters, and an empty box keeps the stored value.
 */
export default function AdminIntegrations() {
  const toast = useToast()
  const qc = useQueryClient()
  const { user } = useAuth()
  const canEdit = user?.role === 'super_admin'
  const { data } = useQuery({ queryKey: ['admin-integrations'], queryFn: () => get<{ data: Data }>('/admin/integrations', true) })
  const [s, setS] = useState<Data>({})
  const [secrets, setSecrets] = useState<Record<string, string>>({})
  const [clear, setClear] = useState<string[]>([])
  useEffect(() => { if (data) { setS(data.data); setSecrets({}); setClear([]) } }, [data])
  const set = (k: string, v: string | number | boolean | null) => setS((x) => ({ ...x, [k]: v }))
  const dirty = useMemo(() => !!data && (clear.length > 0 || Object.values(secrets).some(Boolean) || Object.keys(s).some((k) => !isSecret(k) && s[k] !== data.data[k])), [s, secrets, clear, data])

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      Object.entries(s).forEach(([k, v]) => { if (!isSecret(k) && v !== data?.data[k]) body[k] = v })
      Object.entries(secrets).forEach(([k, v]) => { if (v.trim()) body[k] = v.trim() })
      if (clear.length) body.clear = clear
      return put<{ data: Data }>('/admin/integrations', body, true)
    },
    onSuccess: (r) => {
      qc.setQueryData(['admin-integrations'], r)
      qc.invalidateQueries({ queryKey: ['config'] })
      toast('Entegrasyonlar kaydedildi', 'success')
    },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })

  if (!data) return <Spinner />
  const str = (k: string) => (typeof s[k] === 'string' ? (s[k] as string) : '')
  const num = (k: string, d: number) => (s[k] === null || s[k] === undefined ? d : Number(s[k]))
  const bool = (k: string) => s[k] === true || s[k] === 'true' || s[k] === 1 || s[k] === '1'
  const secretInfo = (k: string) => data.data[k] as Secret
  const secretField = (k: string, label: string) => {
    const info = secretInfo(k)
    const cleared = clear.includes(k)
    return (
      <div>
        <Input
          label={label}
          type="password"
          autoComplete="off"
          disabled={!canEdit}
          value={secrets[k] ?? ''}
          onChange={(e) => setSecrets((x) => ({ ...x, [k]: e.target.value }))}
          placeholder={info?.set && !cleared ? `Kayıtlı (${info.hint}). Değiştirmek için yaz` : 'Henüz girilmedi'}
        />
        {info?.set && canEdit && (
          <button type="button" onClick={() => setClear((c) => (cleared ? c.filter((x) => x !== k) : [...c, k]))} className="mt-1.5 text-xs font-bold text-ink-soft underline hover:text-berry">
            {cleared ? 'Silmekten vazgeç' : 'Kayıtlı anahtarı sil'}
          </button>
        )}
      </div>
    )
  }
  const gateway = (str('payments.gateway') || 'fake') as 'fake' | 'iyzico'
  const mode = (str('payments.iyzico.mode') || 'sandbox') as 'sandbox' | 'live'
  const iyzicoReady = secretInfo('payments.iyzico.api_key')?.set && secretInfo('payments.iyzico.secret_key')?.set
  const voiceReady = secretInfo('tts.elevenlabs.key')?.set
  const narrator = (str('tts.narrator') || 'auto') as 'auto' | 'google' | 'openai' | 'elevenlabs' | 'browser'
  const narratorReady = !!(secretInfo('tts.google.key')?.set || secretInfo('tts.openai.key')?.set || voiceReady)

  return (
    <div className="max-w-4xl pb-24">
      <AdminTitle title="Entegrasyonlar" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-ink-soft">Ödeme, Defne'nin sesi ve yapay zekâ anahtarları. Anahtarlar şifreli saklanır ve bir daha gösterilmez; burada girilen değer sunucudaki .env değerinin önüne geçer.</p>
      {!canEdit && <p className="mb-5 rounded-2xl bg-butter/20 px-4 py-3 text-sm font-bold">Bu sayfayı görebilirsin, değiştirmek için süper yönetici olmalısın.</p>}

      <div className="space-y-5">
        <Card
          icon={<CreditCard className="size-5" />}
          title="Ödeme altyapısı"
          text="Test modunda ödeme sayfası gerçek kart çekmez. iyzico'yu seçip anahtarları girdiğinde Premium satın alma iyzico'nun güvenli ödeme sayfasına yönlenir."
          status={gateway === 'iyzico' ? (iyzicoReady ? <Pill tone="good">{mode === 'live' ? 'Canlı' : 'Sandbox'}</Pill> : <Pill tone="warn">Anahtar eksik</Pill>) : <Pill>Test ödemesi</Pill>}
        >
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold">Sağlayıcı</span>
              <Segmented value={gateway} onChange={(v) => set('payments.gateway', v)} disabled={!canEdit} items={[['fake', 'Test ödemesi'], ['iyzico', 'iyzico']]} />
            </div>
            {gateway === 'iyzico' && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold">Ortam</span>
                  <Segmented value={mode} onChange={(v) => set('payments.iyzico.mode', v)} disabled={!canEdit} items={[['sandbox', 'Sandbox (deneme)'], ['live', 'Canlı']]} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {secretField('payments.iyzico.api_key', 'API anahtarı')}
                  {secretField('payments.iyzico.secret_key', 'Gizli anahtar')}
                </div>
                <p className="text-xs text-ink-soft">Anahtarlar iyzico panelinde Ayarlar → Firma Ayarları altında. Sandbox anahtarları sandbox-merchant.iyzipay.com adresinden alınır. Geri dönüş adresi otomatik: <code className="font-mono">/api/v1/payments/iyzico/callback</code></p>
              </>
            )}
          </div>
        </Card>

        <Card
          icon={<Mic className="size-5" />}
          title="Defne'nin sesi"
          text="ElevenLabs anahtarı girilince Defne gerçek, doğal bir sesle konuşur. Boşken tarayıcının sesi kullanılır."
          status={voiceReady ? <Pill tone="good">Doğal ses açık</Pill> : <Pill>Tarayıcı sesi</Pill>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {secretField('tts.elevenlabs.key', 'ElevenLabs API anahtarı')}
            <Input label="Ses kimliği (voice ID)" disabled={!canEdit} value={str('tts.elevenlabs.voice_id')} onChange={(e) => set('tts.elevenlabs.voice_id', e.target.value || null)} />
            <Input label="Model" disabled={!canEdit} value={str('tts.elevenlabs.model')} onChange={(e) => set('tts.elevenlabs.model', e.target.value || null)} hint="ör. eleven_multilingual_v2 ya da eleven_flash_v2_5 (daha hızlı)" />
            <div className="grid gap-4">
              <Range label="Kararlılık" hint="Düşük: daha canlı ve değişken. Yüksek: daha düz ve tutarlı." min={0} max={1} step={0.05} value={num('tts.stability', 0.5)} onChange={(v) => set('tts.stability', v)} disabled={!canEdit} fmt={(v) => v.toFixed(2)} />
              <Range label="Benzerlik" min={0} max={1} step={0.05} value={num('tts.similarity', 0.75)} onChange={(v) => set('tts.similarity', v)} disabled={!canEdit} fmt={(v) => v.toFixed(2)} />
            </div>
          </div>
        </Card>

        <Card
          icon={<BookAudio className="size-5" />}
          title="Kelime ve ders sesi"
          text="Kelimeler, örnek cümleler, dersler ve hikâyeler bu sesle okunur. Cihazın dili ne olursa olsun her zaman doğal İngilizce. Boşken telefonun İngilizce sesi kullanılır; bazı Türkçe telefonlarda bu ses yüklü değildir."
          status={narrator !== 'browser' && narratorReady ? <Pill tone="good">Sunucu sesi</Pill> : <Pill tone="warn">Cihaz sesi</Pill>}
        >
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold">Sağlayıcı</span>
              <Segmented value={narrator} onChange={(v) => set('tts.narrator', v)} disabled={!canEdit} items={[['auto', 'Otomatik'], ['google', 'Google'], ['openai', 'OpenAI'], ['elevenlabs', 'ElevenLabs'], ['browser', 'Cihaz']]} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {secretField('tts.google.key', 'Google Cloud TTS anahtarı')}
              <Input label="Google sesi" disabled={!canEdit} value={str('tts.google.voice')} onChange={(e) => set('tts.google.voice', e.target.value || null)} hint="ör. en-GB-Neural2-C, en-US-Neural2-F" />
              {secretField('tts.openai.key', 'OpenAI API anahtarı')}
              <Input label="OpenAI sesi" disabled={!canEdit} value={str('tts.openai.voice')} onChange={(e) => set('tts.openai.voice', e.target.value || null)} hint="ör. nova, alloy, shimmer" />
              <Input label="ElevenLabs anlatıcı sesi (isteğe bağlı)" disabled={!canEdit} value={str('tts.elevenlabs.narrator_voice_id')} onChange={(e) => set('tts.elevenlabs.narrator_voice_id', e.target.value || null)} hint="Boşsa Defne'nin sesi kullanılır." />
            </div>
            <p className="text-xs text-ink-soft">Otomatik: önce Google, sonra OpenAI, sonra ElevenLabs. Her ses bir kez üretilip sunucuda saklanır, aynı kelime tekrar ücretlendirilmez.</p>
            <Button variant="ghost" className="justify-self-start" disabled={dirty} onClick={() => speak('Apple. I usually have an apple for breakfast.')}>
              <Volume2 className="size-4" /> Kayıtlı ayarlarla dinle
            </Button>
          </div>
        </Card>

        <Card icon={<Volume2 className="size-5" />} title="Dudak senkronu ve konuşma hızı" text="Görüntülü aramada Defne'nin ağzı sesin yüksekliğine göre açılır. Buradan ne kadar açılacağını ve konuşma hızını ayarlarsın.">
          <div className="divide-y-2 divide-line/10">
            <Toggle label="Dudak senkronu" description="Kapalıyken Defne konuşurken ağzını oynatmaz." checked={bool('defne.lipsync')} onChange={(v) => canEdit && set('defne.lipsync', v)} />
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Range label="Ağız açıklığı" hint="Sesli harflerde ağız ne kadar açılsın (varsayılan 4)." min={1} max={8} step={0.5} value={num('defne.lipsync_gain', 4)} onChange={(v) => set('defne.lipsync_gain', v)} disabled={!canEdit || !bool('defne.lipsync')} />
            <Range label="Konuşma hızı" hint="1.00 normal. Çocuklar ve başlangıç seviyesi için biraz yavaş iyi gelir." min={0.8} max={1.15} step={0.05} value={num('defne.voice_rate', 1)} onChange={(v) => set('defne.voice_rate', v)} disabled={!canEdit} fmt={(v) => `${v.toFixed(2)}x`} />
          </div>
          <Button variant="ghost" className="mt-4" disabled={dirty} onClick={() => void speakNeural("Hi! I'm Defne. Let's practise a little English together today.")}>
            <Volume2 className="size-4" /> Kayıtlı ayarlarla dinle
          </Button>
          {dirty && <p className="mt-1 text-xs text-ink-soft">Dinlemeden önce değişiklikleri kaydet.</p>}
        </Card>

        <Card icon={<Mail className="size-5" />} title="E-posta (SMTP)" text="Doğrulama kodları, şifre sıfırlama ve haftalık raporlar bu sunucudan gider. Boşsa sunucudaki .env ayarı kullanılır." status={str('mail.host') && !/^(127\.|localhost|mailpit$)/.test(str('mail.host')) ? <Pill tone="good">Ayarlı</Pill> : <Pill tone="warn">Gerçek sunucu yok</Pill>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="SMTP sunucusu" placeholder="smtp.ornek.com" disabled={!canEdit} value={str('mail.host')} onChange={(e) => set('mail.host', e.target.value.trim() || null)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Port" type="number" placeholder="587" disabled={!canEdit} value={s['mail.port'] == null ? '' : String(s['mail.port'])} onChange={(e) => set('mail.port', e.target.value ? Number(e.target.value) : null)} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Şifreleme</span>
                <select disabled={!canEdit} value={str('mail.encryption') || 'tls'} onChange={(e) => set('mail.encryption', e.target.value)} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
                  <option value="tls">TLS (587)</option>
                  <option value="ssl">SSL (465)</option>
                  <option value="none">Yok</option>
                </select>
              </label>
            </div>
            <Input label="Kullanıcı adı" autoComplete="off" disabled={!canEdit} value={str('mail.username')} onChange={(e) => set('mail.username', e.target.value || null)} />
            {secretField('mail.password', 'Şifre')}
            <Input label="Gönderen adresi" type="email" placeholder="noreply@ornek.com" disabled={!canEdit} value={str('mail.from_address')} onChange={(e) => set('mail.from_address', e.target.value || null)} />
            <Input label="Gönderen adı" placeholder="Dilgo" disabled={!canEdit} value={str('mail.from_name')} onChange={(e) => set('mail.from_name', e.target.value || null)} />
          </div>
          {canEdit && <TestMail disabled={dirty} />}
        </Card>

        <Card icon={<Sparkles className="size-5" />} title="Yapay zekâ" text="Defne'nin sohbet, rol oyunu ve yazı düzeltme özellikleri bu anahtarla çalışır. Boşken kısa hazır yanıtlar verir." status={secretInfo('ai.api_key')?.set ? <Pill tone="good">Bağlı</Pill> : <Pill tone="warn">Anahtar yok</Pill>}>
          <div className="grid gap-4 sm:grid-cols-2">
            {secretField('ai.api_key', 'Anthropic API anahtarı')}
            <Input label="Model" disabled={!canEdit} value={str('ai.model')} onChange={(e) => set('ai.model', e.target.value || null)} />
          </div>
        </Card>
      </div>

      {canEdit && (
        <div className={clsx('fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-card/95 px-4 py-3 backdrop-blur transition-transform md:left-60', dirty ? 'translate-y-0' : 'translate-y-full')}>
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <span className="text-sm font-bold text-ink-soft">Kaydedilmemiş değişiklikler var</span>
            <Button onClick={() => save.mutate()} loading={save.isPending}><Save className="size-4" /> Kaydet</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** One click to prove the saved SMTP works; the server returns the exact error otherwise. */
function TestMail({ disabled }: { disabled: boolean }) {
  const toast = useToast()
  const { user } = useAuth()
  const [to, setTo] = useState(user?.email ?? '')
  const m = useMutation({
    mutationFn: () => post<{ message: string }>('/admin/integrations/test-mail', { to }, true),
    onSuccess: (r) => toast(r.message, 'success'),
    onError: (e: ApiError) => toast(e.message, 'error'),
  })
  return (
    <div className="mt-5 flex flex-col gap-2 rounded-2xl bg-paper-2 p-3 sm:flex-row sm:items-end">
      <div className="flex-1"><Input label="Test e-postası gönder" type="email" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      <Button variant="secondary" onClick={() => m.mutate()} loading={m.isPending} disabled={disabled || !to}><Send className="size-4" /> Gönder</Button>
      {disabled && <p className="text-xs text-ink-soft sm:hidden">Önce kaydet.</p>}
    </div>
  )
}
