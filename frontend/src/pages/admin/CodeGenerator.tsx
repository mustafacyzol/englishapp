import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import type { Paginated, RewardItem } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { AdminTitle } from './kit'

export default function CodeGenerator() {
  const items = useQuery({ queryKey: ['admin-items'], queryFn: () => get<Paginated<RewardItem>>('/admin/reward-items?per_page=100', true) })
  const [f, setF] = useState({ count: 50, prefix: 'BDO', batch: `kampanya-${new Date().toISOString().slice(0, 10)}`, type: 'premium_days', amount: 30, reward_item_id: '', max_uses: 1, expires_at: '', description: '' })
  const gen = useMutation({ mutationFn: () => post<{ codes: string[] }>('/admin/redeem-codes/generate', { ...f, reward_item_id: f.reward_item_id || null, expires_at: f.expires_at || null }, true) })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value })

  const download = () => {
    const blob = new Blob(['code\n' + gen.data!.codes.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${f.batch}.csv`
    a.click()
  }

  return (
    <div className="max-w-3xl">
      <AdminTitle title="Toplu hediye kodu üret" />
      <p className="mb-5 text-ink-soft">Okul kampanyaları, fuarlar, kurumsal anlaşmalar veya sınıf ödülleri için tek kullanımlık kodlar üret. Kullanıcılar kodu Ödül Kasası → Kod kullan ekranından girer.</p>
      <div className="ink-card grid gap-4 p-6 sm:grid-cols-2">
        <Input label="Adet" type="number" value={f.count} onChange={set('count')} />
        <Input label="Önek" value={f.prefix} onChange={set('prefix')} />
        <Input label="Parti adı" value={f.batch} onChange={set('batch')} />
        <Select label="Tür" value={f.type} onChange={set('type')}>
          <option value="premium_days">Premium gün</option><option value="gems">Elmas</option><option value="item">Ödül kartı</option>
        </Select>
        {f.type === 'item' ? (
          <Select label="Kart" value={f.reward_item_id} onChange={set('reward_item_id')}>
            <option value="">Seç…</option>{items.data?.data.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
        ) : <Input label={f.type === 'gems' ? 'Elmas miktarı' : 'Gün sayısı'} type="number" value={f.amount} onChange={set('amount')} />}
        <Input label="Kod başına kullanım" type="number" value={f.max_uses} onChange={set('max_uses')} />
        <Input label="Son kullanma (isteğe bağlı)" type="date" value={f.expires_at} onChange={set('expires_at')} />
        <Input label="Açıklama" value={f.description} onChange={set('description')} />
        <Button className="sm:col-span-2" loading={gen.isPending} onClick={() => gen.mutate()}>Kodları üret</Button>
      </div>
      {gen.error && <div className="mt-4"><Alert tone="error">{(gen.error as ApiError).first()}</Alert></div>}
      {gen.data && (
        <div className="ink-card mt-5 p-5">
          <div className="mb-3 flex items-center justify-between"><p className="font-bold">{gen.data.codes.length} kod üretildi</p><Button size="sm" variant="secondary" onClick={download} icon={<Download className="size-4" />}>CSV indir</Button></div>
          <pre className="max-h-64 overflow-auto rounded-xl bg-paper-2 p-3 font-mono text-sm">{gen.data.codes.join('\n')}</pre>
        </div>
      )}
    </div>
  )
}
