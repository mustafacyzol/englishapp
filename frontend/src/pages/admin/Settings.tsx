import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError, get, put } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input, Toggle } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle } from './kit'

type S = Record<string, string | number | boolean | null>
const NUM: [string, string][] = [
  ['referral.referee_gems', 'Davet edilene elmas'],
  ['referral.referrer_gems', 'Davet edene elmas'],
  ['referral.referrer_premium_days', 'Davet edene Premium gün (ilk alışverişte)'],
  ['ai.daily_limit_free', 'Ücretsiz AI mesaj limiti / gün'],
  ['ai.daily_limit_premium', 'Premium AI mesaj limiti / gün'],
  ['gamification.heart_refill_gems', 'Can doldurma fiyatı (elmas)'],
]

export default function AdminSettings() {
  const toast = useToast()
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: () => get<{ data: S }>('/admin/settings', true) })
  const [s, setS] = useState<S>({})
  useEffect(() => { if (data) setS(data.data) }, [data])
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
    onSuccess: () => toast('Ayarlar kaydedildi ✓', 'success'),
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!data) return <Spinner />
  return (
    <div className="max-w-2xl">
      <AdminTitle title="Platform ayarları"><Button loading={save.isPending} onClick={() => save.mutate()}>Kaydet</Button></AdminTitle>
      <section className="ink-card mb-5 divide-y-2 divide-line/10 p-5">
        <Toggle label="Bakım modu" description="Yöneticiler hariç herkes bakım ekranı görür." checked={!!s.maintenance_mode} onChange={(v) => setS({ ...s, maintenance_mode: v })} />
        <Toggle label="Yeni kayıtlar açık" checked={s.registration_open !== false} onChange={(v) => setS({ ...s, registration_open: v })} />
      </section>
      <section className="ink-card mb-5 grid gap-4 p-5">
        <Input label="Duyuru (üst barda gösterilir)" value={(s.announcement as string) ?? ''} onChange={(e) => setS({ ...s, announcement: e.target.value || null })} />
        <Input label="Okul kayıt/bilgi bağlantısı" value={(s['school.cta_url'] as string) ?? ''} onChange={(e) => setS({ ...s, 'school.cta_url': e.target.value || null })} placeholder="https://" />
        <Input label="WhatsApp destek numarası" value={(s['school.whatsapp'] as string) ?? ''} onChange={(e) => setS({ ...s, 'school.whatsapp': e.target.value || null })} placeholder="+90…" />
      </section>
      <section className="ink-card grid gap-4 p-5 sm:grid-cols-2">
        {NUM.map(([k, l]) => <Input key={k} type="number" label={l} value={Number(s[k] ?? 0)} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />)}
      </section>
    </div>
  )
}
