import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Ban, Eye, EyeOff, Flag, RotateCcw, Trash2 } from 'lucide-react'
import { get, post, type ApiError } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pill } from './kit'

type Status = 'open' | 'hidden' | 'all'
interface Row {
  id: number; title: string; description: string | null; level: string | null; is_public: boolean; hidden_at: string | null
  reports_count: number; words_count: number; saves_count: number
  owner: { id: number; name: string; username: string; email: string; share_blocked: boolean } | null
  items: { word: string; translation: string }[]
  reports: { reason: string; note: string | null; by: string | null; at: string | null }[]
}
interface Res { reasons: Record<string, string>; counts: Record<Status, number>; data: Row[] }

/**
 * Shared word sets learners reported. Enough reports hide a set by themselves
 * (Site ayarları > Ekonomi ve limitler); here a moderator restores, hides,
 * deletes it or stops its owner from sharing.
 */
export default function Moderation() {
  const [status, setStatus] = useState<Status>('open')
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['admin-moderation', status], queryFn: () => get<Res>(`/admin/moderation/word-sets?status=${status}`) })
  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => post(`/admin/moderation/word-sets/${id}`, { action }),
    onSuccess: () => { toast('Kaydedildi', 'success'); qc.invalidateQueries({ queryKey: ['admin-moderation'] }) },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })
  const tabs: [Status, string][] = [['open', 'Şikâyet edilenler'], ['hidden', 'Gizlenenler'], ['all', 'Tüm paylaşılanlar']]
  return (
    <div>
      <AdminTitle title="Topluluk moderasyonu" />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border-2 border-line bg-card p-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={clsx('flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-extrabold transition', status === k ? 'bg-inv text-on-inv' : 'text-ink-soft hover:text-ink')}>
            {l}{data && <span className="rounded-md bg-black/10 px-1.5 text-xs tabular-nums">{data.counts[k]}</span>}
          </button>
        ))}
      </div>
      {isLoading || !data ? <Spinner className="py-20" /> : !data.data.length ? (
        <p className="rounded-3xl border-2 border-dashed border-line p-10 text-center font-bold text-ink-soft">Bekleyen bir şey yok.</p>
      ) : (
        <div className="grid gap-4">
          {data.data.map((r) => (
            <article key={r.id} className="rounded-3xl border-2 border-line bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-extrabold">{r.title}</h2>
                  <p className="text-sm text-ink-soft">{r.owner ? `${r.owner.name} · @${r.owner.username} · ${r.owner.email}` : 'Silinmiş kullanıcı'}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.level && <Pill>{r.level}</Pill>}
                  <Pill tone={r.hidden_at ? 'bad' : r.is_public ? 'good' : 'default'}>{r.hidden_at ? `Gizli · ${dateTR(r.hidden_at)}` : r.is_public ? 'Yayında' : 'Özel'}</Pill>
                  {r.reports_count > 0 && <Pill tone="warn"><Flag className="mr-1 size-3" />{r.reports_count} şikâyet</Pill>}
                  {r.owner?.share_blocked && <Pill tone="bad">Paylaşımı kapalı</Pill>}
                </div>
              </div>
              {r.description && <p className="mt-2 text-sm">{r.description}</p>}
              <p className="mt-2 text-sm text-ink-soft">{r.words_count} kelime · {r.saves_count} kayıt: <span className="text-ink">{r.items.map((i) => `${i.word} = ${i.translation}`).join(' · ')}{r.words_count > r.items.length ? ' …' : ''}</span></p>
              {r.reports.length > 0 && (
                <ul className="mt-3 grid gap-1 rounded-2xl bg-paper-2 p-3 text-sm">
                  {r.reports.map((x, i) => <li key={i}><b>{data.reasons[x.reason] ?? x.reason}</b>{x.note ? `: ${x.note}` : ''} <span className="text-ink-soft">· @{x.by ?? '?'}{x.at ? ` · ${dateTR(x.at)}` : ''}</span></li>)}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(r.hidden_at || r.reports_count > 0) && <Act icon={RotateCcw} onClick={() => act.mutate({ id: r.id, action: 'restore' })}>Sorun yok, yayına al</Act>}
                {!r.hidden_at && <Act icon={EyeOff} onClick={() => act.mutate({ id: r.id, action: 'hide' })}>Gizle</Act>}
                {r.owner && (r.owner.share_blocked
                  ? <Act icon={Eye} onClick={() => act.mutate({ id: r.id, action: 'allow_sharing' })}>Paylaşıma yeniden izin ver</Act>
                  : <Act icon={Ban} danger onClick={() => confirm('Bu kullanıcının paylaşımı kapatılsın ve açık setleri gizlensin mi?') && act.mutate({ id: r.id, action: 'block_sharing' })}>Paylaşımını kapat</Act>)}
                <Act icon={Trash2} danger onClick={() => confirm('Set kalıcı olarak silinsin mi?') && act.mutate({ id: r.id, action: 'delete' })}>Sil</Act>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Act({ icon: I, onClick, danger, children }: { icon: typeof Flag; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return <button onClick={onClick} className={clsx('inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold transition', danger ? 'border-berry/30 text-berry hover:bg-berry/10' : 'border-line hover:border-ink/30')}><I className="size-4" />{children}</button>
}
