import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { AdminTitle, Pill } from './kit'

interface V { voucher: { id: number; code: string; status: string; expires_at: string | null; activated_at: string | null; user: { name: string; email: string }; item: { name: string } } }

export default function Vouchers() {
  const [code, setCode] = useState('')
  const lookup = useMutation({ mutationFn: (redeem: boolean) => post<V>('/admin/vouchers', { code, redeem }, true) })
  const v = lookup.data?.voucher
  return (
    <div className="max-w-xl">
      <AdminTitle title="Canlı ders kuponları" />
      <p className="mb-5 text-ink-soft">Öğrenci şubeye ya da online derse geldiğinde uygulamadaki <b>BDO-XXXXXXXX</b> kodunu buradan doğrula ve kullanıldı olarak işaretle.</p>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); lookup.mutate(false) }} className="ink-card mb-5 flex gap-2 p-5">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BDO-XXXXXXXX" className="flex-1 [&_input]:font-mono" />
        <Button type="submit" loading={lookup.isPending}>Sorgula</Button>
      </form>
      {lookup.error && <Alert tone="error">{(lookup.error as ApiError).message}</Alert>}
      {v && (
        <div className="ink-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <GraduationCap className="size-8 text-flame" />
            <div className="flex-1"><p className="font-display text-xl font-extrabold">{v.item.name}</p><p className="font-mono text-sm">{v.code}</p></div>
            <Pill tone={v.status === 'active' ? 'good' : 'warn'}>{v.status}</Pill>
          </div>
          <p className="text-sm"><b>{v.user.name}</b> · {v.user.email}</p>
          <p className="text-sm text-ink-soft">Aktifleştirme: {dateTR(v.activated_at)} · Son geçerlilik: {dateTR(v.expires_at)}</p>
          {v.status === 'active' && <Button className="mt-4" variant="success" loading={lookup.isPending} onClick={() => lookup.mutate(true)}>Ders verildi — kuponu kullan</Button>}
        </div>
      )}
    </div>
  )
}
