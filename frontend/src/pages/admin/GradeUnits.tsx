import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, ClipboardPaste, Copy, Eye, EyeOff, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { del, get, post, put } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea, Toggle } from '@/components/ui/Field'
import { Modal, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pill } from './kit'

type Pair = [string, string]
interface GradeUnit { id: number; track: string; position: number; title: string; title_tr: string | null; words: Pair[]; sentences: Pair[] | null; note: string | null; slot: number | null; is_published: boolean }
interface Data {
  track: string
  tracks: { key: string; label: string; count: number }[]
  units: GradeUnit[]
  courses: { level: string; units: string[]; slots: Record<string, number> }[]
}

const EMPTY: Omit<GradeUnit, 'id' | 'position'> = { track: 'g5', title: '', title_tr: '', words: [['', ''], ['', ''], ['', ''], ['', '']], sentences: [['', '']], note: '', slot: null, is_published: true }

/**
 * School-grade units: the MEB English units of grades 2 to 12. Pick a grade,
 * then add, edit, reorder or copy its units. Each unit becomes the first lesson
 * of a CEFR unit for pupils of that grade and gives that unit its coursebook
 * title; the preview on every card shows where it lands on each level's path.
 */
export default function GradeUnits() {
  const qc = useQueryClient()
  const toast = useToast()
  const [track, setTrack] = useState('g5')
  const [edit, setEdit] = useState<(Partial<GradeUnit> & { track: string }) | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['admin-grade-units', track], queryFn: () => get<Data>(`/admin/grade-units?track=${track}`) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-grade-units'] })
  const fail = (e: Error) => toast(e.message, 'error')

  const reorder = useMutation({ mutationFn: (ids: number[]) => post('/admin/grade-units/reorder', { track, ids }), onSuccess: refresh, onError: fail })
  const remove = useMutation({ mutationFn: (id: number) => del(`/admin/grade-units/${id}`), onSuccess: () => { refresh(); toast('Ünite silindi.') }, onError: fail })
  const toggle = useMutation({ mutationFn: (u: GradeUnit) => put(`/admin/grade-units/${u.id}`, { is_published: !u.is_published }), onSuccess: refresh, onError: fail })
  const copy = useMutation({ mutationFn: ({ id, to }: { id: number; to: string }) => post(`/admin/grade-units/${id}/copy`, { track: to }), onSuccess: (_, v) => { refresh(); toast(`${data?.tracks.find((t) => t.key === v.to)?.label} sınıfına kopyalandı.`, 'success') }, onError: fail })

  const move = (i: number, d: -1 | 1) => {
    const ids = (data?.units ?? []).map((u) => u.id)
    const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorder.mutate(ids)
  }

  return (
    <div>
      <AdminTitle title="Sınıf üniteleri">
        <Button size="sm" onClick={() => setEdit({ ...EMPTY, track })}><Plus className="size-4" /> Yeni ünite</Button>
      </AdminTitle>
      <p className="-mt-4 mb-5 max-w-3xl text-sm text-ink-soft">
        MEB İngilizce programındaki üniteler. Öğrenci kayıtta sınıfını (ya da LGS / YDT hedefini) seçtiyse yolundaki üniteler bu başlıklarla görünür ve her ünitenin ilk dersi buradaki kelime ve cümlelerden kurulur. Değişiklikler kaydedince hemen yola yansır.
      </p>

      {/* grades */}
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {(data?.tracks ?? []).map((t) => (
          <button key={t.key} onClick={() => setTrack(t.key)} className={clsx('flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3.5 py-2 text-sm font-extrabold transition', t.key === track ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card hover:border-ink/30')}>
            {t.label}
            <span className={clsx('rounded-full px-1.5 text-[11px] tabular-nums', t.key === track ? 'bg-paper/20' : 'bg-paper-2')}>{t.count}</span>
          </button>
        ))}
      </div>

      {isLoading || !data ? <Spinner /> : (
        <div className="grid gap-3">
          {data.units.map((u, i) => {
            const where = data.courses.map((c) => (c.slots[u.id] !== undefined ? `${c.level} · ${c.slots[u.id] + 1}. ünite` : null)).filter(Boolean)
            return (
              <article key={u.id} className={clsx('ink-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center', !u.is_published && 'opacity-60')}>
                <div className="flex items-start gap-3 sm:min-w-0 sm:flex-1">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper-2 font-display text-lg font-black tabular-nums">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-black leading-tight">{u.title}</span>
                      {u.title_tr && <span className="text-sm font-bold text-ink-soft">{u.title_tr}</span>}
                      {!u.is_published && <Pill tone="warn">taslak</Pill>}
                      {u.slot && <Pill tone="info">sabit: {u.slot}. ünite</Pill>}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{u.words.map((w) => w[0]).join(' · ')}</p>
                    {where.length > 0 && <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-bold text-ink-soft"><MapPin className="size-3" />{where.join('  ·  ')}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <IconBtn label="Yukarı" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-4" /></IconBtn>
                  <IconBtn label="Aşağı" onClick={() => move(i, 1)} disabled={i === data.units.length - 1}><ArrowDown className="size-4" /></IconBtn>
                  <IconBtn label={u.is_published ? 'Taslağa al' : 'Yayınla'} onClick={() => toggle.mutate(u)}>{u.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</IconBtn>
                  <label className="relative grid size-9 cursor-pointer place-items-center rounded-xl border-2 border-line bg-card hover:border-ink/30" title="Başka sınıfa kopyala">
                    <Copy className="size-4" />
                    <select aria-label="Başka sınıfa kopyala" value="" onChange={(e) => e.target.value && copy.mutate({ id: u.id, to: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0">
                      <option value="">Kopyala…</option>
                      {data.tracks.filter((t) => t.key !== track).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </label>
                  <IconBtn label="Düzenle" onClick={() => setEdit(u)}><Pencil className="size-4" /></IconBtn>
                  <IconBtn label="Sil" danger onClick={() => confirm(`"${u.title}" silinsin mi? Öğrencilerin bu ünitedeki ilerlemesi de silinir.`) && remove.mutate(u.id)}><Trash2 className="size-4" /></IconBtn>
                </div>
              </article>
            )
          })}
          {data.units.length === 0 && <p className="ink-card p-8 text-center font-semibold text-ink-soft">Bu sınıfta henüz ünite yok. “Yeni ünite” ile başla ya da başka bir sınıftan kopyala.</p>}
        </div>
      )}

      <Editor value={edit} units={data?.courses[0]?.units.length ?? 9} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh() }} />
    </div>
  )
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={clsx('grid size-9 place-items-center rounded-xl border-2 border-line bg-card transition disabled:opacity-30', danger ? 'hover:border-berry hover:text-berry' : 'hover:border-ink/30')}>{children}</button>
  )
}

function Editor({ value, units, onClose, onSaved }: { value: (Partial<GradeUnit> & { track: string }) | null; units: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState(value)
  const [bulk, setBulk] = useState<string | null>(null)
  useEffect(() => { setF(value); setBulk(null) }, [value])
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, words: (f?.words ?? []).filter((w) => w[0].trim() && w[1].trim()), sentences: (f?.sentences ?? []).filter((s) => s[0].trim() && s[1].trim()) }
      return f?.id ? put(`/admin/grade-units/${f.id}`, body) : post('/admin/grade-units', body)
    },
    onSuccess: () => { toast('Kaydedildi, yol güncellendi.', 'success'); onSaved() },
    onError: (e: Error) => toast(e.message, 'error'),
  })
  if (!f) return null
  const set = <K extends keyof GradeUnit>(k: K, v: GradeUnit[K]) => setF((o) => (o ? { ...o, [k]: v } : o))
  const pairs = (k: 'words' | 'sentences') => (f[k] ?? []) as Pair[]
  const setPair = (k: 'words' | 'sentences', i: number, j: 0 | 1, v: string) => set(k, pairs(k).map((p, n) => (n === i ? (j ? [p[0], v] : [v, p[1]]) : p)) as Pair[])
  // "word = anlam" (or a tab) per line, pasted from a coursebook word list
  const applyBulk = () => {
    const rows = (bulk ?? '').split('\n').map((l) => l.split(/\s*(?:=|\t|;| - )\s*/)).filter((p) => p.length >= 2 && p[0].trim()).map((p) => [p[0].trim(), p.slice(1).join(', ').trim()] as Pair)
    set('words', [...pairs('words').filter((w) => w[0].trim()), ...rows].slice(0, 20))
    setBulk(null)
  }
  const wordsOk = pairs('words').filter((w) => w[0].trim() && w[1].trim()).length >= 4

  return (
    <Modal open={!!value} onClose={onClose} className="max-w-2xl">
      <h2 className="text-2xl font-extrabold">{f.id ? 'Üniteyi düzenle' : 'Yeni ünite'}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Başlık (İngilizce, kitaptaki gibi)" value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} maxLength={120} />
        <Input label="Türkçe adı" value={f.title_tr ?? ''} onChange={(e) => set('title_tr', e.target.value)} maxLength={120} />
        <Select label="Yoldaki yeri" value={f.slot ?? ''} onChange={(e) => set('slot', e.target.value ? Number(e.target.value) : null)} hint="Otomatik: sınıfın üniteleri her seviyenin ünitelerine eşit dağıtılır.">
          <option value="">Otomatik dağıt</option>
          {Array.from({ length: units }, (_, i) => <option key={i} value={i + 1}>{i + 1}. ünitenin başı</option>)}
        </Select>
        <div className="flex items-end"><Toggle checked={f.is_published ?? true} onChange={(v) => set('is_published', v)} label="Yayında" description="Taslaktaki ünite yolda görünmez." /></div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-black">Kelimeler <span className="font-bold text-ink-soft">({pairs('words').length}/20, en az 4)</span></p>
        <button type="button" onClick={() => setBulk(bulk === null ? '' : null)} className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-extrabold text-sky hover:bg-sky/10"><ClipboardPaste className="size-3.5" /> Listeden yapıştır</button>
      </div>
      {bulk !== null && (
        <div className="mt-2 rounded-2xl bg-paper-2 p-3">
          <Textarea rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'recipe = tarif\nchop = doğramak'} hint="Her satıra bir kelime: İngilizce = Türkçe (sekme ya da ; de olur)." />
          <div className="mt-2 flex justify-end"><Button size="sm" onClick={applyBulk}>Ekle</Button></div>
        </div>
      )}
      <PairRows rows={pairs('words')} max={20} a="İngilizce" b="Türkçe" onChange={(i, j, v) => setPair('words', i, j, v)} onAdd={() => set('words', [...pairs('words'), ['', '']])} onRemove={(i) => set('words', pairs('words').filter((_, n) => n !== i))} />

      <p className="mt-5 text-sm font-black">Örnek cümleler <span className="font-bold text-ink-soft">(en çok 6; sesli söyleme ve cümle kurma sorusu olur)</span></p>
      <PairRows rows={pairs('sentences')} max={6} a="English sentence" b="Türkçesi" wide onChange={(i, j, v) => setPair('sentences', i, j, v)} onAdd={() => set('sentences', [...pairs('sentences'), ['', '']])} onRemove={(i) => set('sentences', pairs('sentences').filter((_, n) => n !== i))} />

      <Textarea className="mt-5" label="Rehber notu (isteğe bağlı)" rows={3} value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} maxLength={4000} hint="Ünite rehberinin ilk sayfasında görünür. LGS / YDT'de nasıl sorulduğunu yazmak için ideal. **kalın**, `kalıp` kullanılabilir." />

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!f.title?.trim() || !wordsOk}>Kaydet</Button>
      </div>
    </Modal>
  )
}

function PairRows({ rows, max, a, b, wide, onChange, onAdd, onRemove }: { rows: Pair[]; max: number; a: string; b: string; wide?: boolean; onChange: (i: number, j: 0 | 1, v: string) => void; onAdd: () => void; onRemove: (i: number) => void }) {
  const cell = 'h-10 w-full min-w-0 rounded-xl border-2 border-line bg-paper-2/60 px-3 text-sm font-semibold focus:border-sky focus:bg-card focus:outline-none'
  return (
    <div className="mt-2 grid gap-1.5">
      {rows.map((r, i) => (
        <div key={i} className={clsx('grid items-center gap-1.5', wide ? 'grid-cols-1 sm:grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_1fr_auto]')}>
          <input aria-label={a} placeholder={a} value={r[0]} maxLength={wide ? 200 : 60} onChange={(e) => onChange(i, 0, e.target.value)} className={cell} />
          <input aria-label={b} placeholder={b} value={r[1]} maxLength={wide ? 200 : 80} onChange={(e) => onChange(i, 1, e.target.value)} className={cell} />
          <button type="button" aria-label="Satırı sil" onClick={() => onRemove(i)} className="grid size-10 place-items-center justify-self-end rounded-xl text-ink-soft hover:bg-berry/10 hover:text-berry"><X className="size-4" /></button>
        </div>
      ))}
      {rows.length < max && <button type="button" onClick={onAdd} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-sm font-extrabold text-ink-soft hover:border-ink/30 hover:text-ink"><Plus className="size-4" /> Satır ekle</button>}
    </div>
  )
}
