import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { LogOut, Monitor, Moon, Smartphone, Sun, Trash2 } from 'lucide-react'
import { setTheme, useTheme } from '@/lib/theme'
import { ApiError, del, get, patch, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { dateTR, GOALS, tl } from '@/lib/format'
import { speak } from '@/lib/speech'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Toggle } from '@/components/ui/Field'
import { Alert, Modal, PageHeader } from '@/components/ui/Misc'
import { OtpInput } from '@/components/ui/OtpInput'
import { useToast } from '@/components/ui/Toast'

function Section({ title, children, danger }: { title: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={clsx('ink-card mb-6 p-6', danger && 'border-berry')}>
      <h2 className="mb-4 text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

export default function Settings() {
  const [theme] = useTheme()
  const { user, setUser, signOut } = useAuth()
  const toast = useToast()
  const save = useMutation({
    mutationFn: (b: Partial<Me> | Record<string, unknown>) => patch<{ user: Me }>('/account', b),
    onSuccess: (r) => { setUser(r.user); toast('Kaydedildi ✓', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  if (!user) return null
  const prefs = user.preferences

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ayarlar" />

      <Section title="Profil">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate({ name, username }) }}>
          <Input label="Ad" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Kullanıcı adı" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
          <Input label="E-posta" value={user.email} disabled className="sm:col-span-2" />
          <Button type="submit" loading={save.isPending} className="sm:col-span-2 sm:w-fit">Kaydet</Button>
        </form>
      </Section>

      <Section title="Öğrenme">
        <p className="mb-2 text-sm font-bold">Günlük hedef</p>
        <div className="mb-5 grid grid-cols-4 gap-2">
          {[10, 20, 30, 50].map((x) => (
            <button key={x} onClick={() => save.mutate({ daily_goal_xp: x })} className={clsx('rounded-xl border-2 border-line py-2 font-bold', user.daily_goal_xp === x ? 'bg-flame text-white shadow-hard-sm' : 'bg-card')}>{x} XP</button>
          ))}
        </div>
        <p className="mb-2 text-sm font-bold">Seviye</p>
        <div className="mb-5 grid grid-cols-6 gap-2">
          {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((l) => (
            <button key={l} onClick={() => save.mutate({ cefr_level: l })} className={clsx('rounded-xl border-2 border-line py-2 font-mono font-bold', user.cefr_level === l ? 'bg-sky text-white shadow-hard-sm' : 'bg-card')}>{l}</button>
          ))}
        </div>
        <p className="mb-2 text-sm font-bold">Hedefin</p>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button key={g.key} onClick={() => save.mutate({ learning_goal: g.key })} className={clsx('rounded-xl border-2 border-line px-3 py-1.5 font-bold', user.learning_goal === g.key ? 'bg-butter text-ink shadow-hard-sm' : 'bg-card')}>{g.emoji} {g.label}</button>
          ))}
        </div>
      </Section>

      <Section title="Görünüm, ses ve bildirimler">
        <p className="mb-2 text-sm font-bold">Tema</p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {([['light', 'Açık', Sun], ['dark', 'Koyu', Moon], ['system', 'Sistem', Monitor]] as const).map(([v, l, I]) => (
            <button key={v} onClick={() => { setTheme(v); save.mutate({ preferences: { theme: v } }) }} className={clsx('flex items-center justify-center gap-2 rounded-xl border-2 py-2 font-bold transition', theme === v ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:bg-paper-2')}><I className="size-4" /> {l}</button>
          ))}
        </div>
        <div className="divide-y-2 divide-line/10">
          <Toggle label="Ses efektleri" checked={prefs.sound !== false} onChange={(v) => save.mutate({ preferences: { sound: v } })} />
          <Toggle label="Seri hatırlatma e-postaları" description="Serin bitmek üzereyken akşam 20:00'de haber veririz." checked={prefs.email_reminders !== false} onChange={(v) => save.mutate({ preferences: { email_reminders: v } })} />
          <Toggle label="Kampanya e-postaları" checked={user.marketing_opt_in} onChange={(v) => save.mutate({ marketing_opt_in: v })} />
          <div className="py-3">
            <p className="mb-2 font-bold">Okuma hızı ({(prefs.tts_rate ?? 0.95).toFixed(2)}x)</p>
            <input type="range" min={0.6} max={1.3} step={0.05} defaultValue={prefs.tts_rate ?? 0.95} onChange={(e) => speak('This is how I will read to you.', { rate: Number(e.target.value) })} onMouseUp={(e) => save.mutate({ preferences: { tts_rate: Number((e.target as HTMLInputElement).value) } })} onTouchEnd={(e) => save.mutate({ preferences: { tts_rate: Number((e.target as HTMLInputElement).value) } })} className="w-full accent-[#FF5A36]" />
          </div>
        </div>
      </Section>

      <Security />
      <Orders />

      <Section title="Hesap" danger>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={signOut} icon={<LogOut className="size-4" />}>Çıkış yap</Button>
          <DeleteAccount />
        </div>
      </Section>
    </div>
  )
}

function Security() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const change = useMutation({
    mutationFn: () => post('/account/password', pw),
    onSuccess: () => { toast('Şifren güncellendi, diğer cihazlardan çıkış yapıldı.', 'success'); setPw({ current_password: '', password: '', password_confirmation: '' }) },
  })
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => get<{ data: { id: number; name: string; last_used_at: string | null; created_at: string; current: boolean }[] }>('/account/sessions') })
  const revoke = useMutation({ mutationFn: (id: number) => del(`/account/sessions/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }) })
  const err = change.error as ApiError | null

  return (
    <Section title="Güvenlik">
      <form className="mb-6 grid gap-3" onSubmit={(e: FormEvent) => { e.preventDefault(); change.mutate() }}>
        {err && <Alert tone="error">{err.first()}</Alert>}
        <Input label="Mevcut şifre" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Yeni şifre" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
          <Input label="Yeni şifre (tekrar)" type="password" autoComplete="new-password" value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} />
        </div>
        <Button type="submit" variant="secondary" className="w-fit" loading={change.isPending}>Şifreyi değiştir</Button>
      </form>

      <p className="mb-2 font-bold">Oturumlar</p>
      <ul className="mb-6 divide-y-2 divide-line/10 rounded-2xl border-2 border-line/15">
        {sessions.data?.data.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            {s.name === 'web' ? <Monitor className="size-5" /> : <Smartphone className="size-5" />}
            <div className="flex-1 text-sm">
              <p className="font-bold">{s.name === 'admin-panel' ? 'Yönetim paneli' : s.name} {s.current && <span className="text-mint-deep">(bu cihaz)</span>}</p>
              <p className="text-ink-soft">Son kullanım: {dateTR(s.last_used_at ?? s.created_at, true)}</p>
            </div>
            {!s.current && <button onClick={() => revoke.mutate(s.id)} className="text-sm font-bold text-berry">Kapat</button>}
          </li>
        ))}
      </ul>
      {user?.is_staff && <TwoFactor />}
    </Section>
  )
}

function TwoFactor() {
  const { user, refresh } = useAuth()
  const [setup, setSetup] = useState<{ secret: string; otpauth_url: string } | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [pw, setPw] = useState('')
  const start = useMutation({ mutationFn: () => post<{ secret: string; otpauth_url: string }>('/account/2fa/setup'), onSuccess: setSetup })
  const confirm = useMutation({ mutationFn: (code: string) => post<{ recovery_codes: string[] }>('/account/2fa/confirm', { code }), onSuccess: (r) => { setCodes(r.recovery_codes); setSetup(null); refresh() } })
  const disable = useMutation({ mutationFn: () => post('/account/2fa/disable', { current_password: pw }), onSuccess: () => refresh() })

  return (
    <div className="rounded-2xl border-2 border-dashed border-line/30 p-4">
      <p className="font-bold">Yönetici iki adımlı doğrulama (TOTP)</p>
      <p className="mb-3 text-sm text-ink-soft">Etkinleştirirsen yönetim paneli girişinde e-posta kodu yerine Google Authenticator / Authy kodu istenir.</p>
      {codes && (
        <Alert tone="success">
          Kurtarma kodlarını güvenli bir yere kaydet (her biri bir kez kullanılır):
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono">{codes.map((c) => <span key={c}>{c}</span>)}</div>
        </Alert>
      )}
      {user?.two_factor_enabled ? (
        <div className="mt-3 flex gap-2">
          <Input type="password" placeholder="Şifren" value={pw} onChange={(e) => setPw(e.target.value)} className="flex-1" />
          <Button variant="danger" loading={disable.isPending} onClick={() => disable.mutate()}>Kapat</Button>
        </div>
      ) : setup ? (
        <div className="space-y-3">
          <p className="text-sm">Doğrulayıcı uygulamana bu anahtarı ekle, sonra üretilen kodu gir:</p>
          <p className="break-all rounded-xl bg-paper-2 p-3 font-mono text-sm font-bold">{setup.secret}</p>
          <a href={setup.otpauth_url} className="text-sm font-bold text-flame">Telefonda aç →</a>
          <OtpInput onComplete={(c) => confirm.mutate(c)} status={confirm.error ? 'error' : 'idle'} />
        </div>
      ) : (
        <Button size="sm" onClick={() => start.mutate()} loading={start.isPending}>Etkinleştir</Button>
      )}
    </div>
  )
}

function Orders() {
  const { data } = useQuery({ queryKey: ['orders'], queryFn: () => get<{ orders: { uuid: string; status: string; total: string; created_at: string; plan: { name: string } | null }[] }>('/orders') })
  if (!data?.orders.length) return null
  const S: Record<string, string> = { paid: 'Ödendi', pending: 'Bekliyor', failed: 'Başarısız', refunded: 'İade', cancelled: 'İptal' }
  return (
    <Section title="Siparişlerim">
      <ul className="divide-y-2 divide-line/10">
        {data.orders.map((o) => (
          <li key={o.uuid} className="flex items-center justify-between py-2.5 text-sm">
            <span><b>{o.plan?.name ?? 'Paket'}</b> · {dateTR(o.created_at)}</span>
            <span className="font-bold">{tl(o.total)} · {S[o.status] ?? o.status}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function DeleteAccount() {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const request = useMutation({ mutationFn: () => post('/account/delete/request', { current_password: pw }) })
  const confirm = useMutation({ mutationFn: (code: string) => post('/account/delete', { code }), onSuccess: () => signOut() })
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} icon={<Trash2 className="size-4" />}>Hesabı sil</Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="text-2xl font-extrabold">Hesabını kalıcı olarak sil</h2>
        <p className="mb-5 mt-2 text-ink-soft">Tüm ilerlemen, serin, rozetlerin ve kalan Premium süren silinir. Bu işlem geri alınamaz.</p>
        {!request.isSuccess ? (
          <div className="space-y-3">
            {request.error && <Alert tone="error">{(request.error as ApiError).first()}</Alert>}
            <Input type="password" label="Şifren" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Button block variant="danger" loading={request.isPending} onClick={() => request.mutate()}>Onay kodu gönder</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">E-postana gelen 6 haneli kodu gir:</p>
            <OtpInput onComplete={(c) => confirm.mutate(c)} status={confirm.error ? 'error' : 'idle'} />
            {confirm.error && <Alert tone="error">{(confirm.error as ApiError).first()}</Alert>}
          </div>
        )}
      </Modal>
    </>
  )
}
