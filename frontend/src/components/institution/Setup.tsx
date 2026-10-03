import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, ImageUp, Plus, Trash2, X } from 'lucide-react'
import { del, patch, post, type ApiError } from '@/lib/api'
import { higoImg } from '@/components/game/Higo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { InstitutionMark } from '@/layouts/InstitutionLayout'
import type { InstitutionReport } from './Report'

export const SWATCHES = ['#e8403a', '#2f7cf6', '#22b573', '#8f7cf8', '#d99a00', '#0f766e', '#1f2433', '#c93460']
const TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX = 1024 * 1024

/** Checks the file in the browser first (type, 1 MB, 64-2000 px), so mistakes show at once. */
function checkImage(file: File): Promise<string | null> {
  if (!TYPES.includes(file.type)) return Promise.resolve('Logo PNG, JPG ya da WebP olmalı.')
  if (file.size > MAX) return Promise.resolve(`Logo en fazla 1 MB olabilir (seçtiğin ${(file.size / 1024 / 1024).toFixed(1)} MB).`)
  return new Promise((res) => {
    const url = URL.createObjectURL(file)
    const im = new Image()
    im.onload = () => {
      URL.revokeObjectURL(url)
      res(im.width < 64 || im.height < 64 ? 'Logo en az 64×64 piksel olmalı.' : im.width > 2000 || im.height > 2000 ? 'Logo en fazla 2000 piksel olabilir.' : null)
    }
    im.onerror = () => { URL.revokeObjectURL(url); res('Bu dosya açılamadı.') }
    im.src = url
  })
}

/** Logo from the device with a file picker; the server stores it and returns its address. */
export function LogoPicker({ name, logo, color, onChange }: { name: string; logo: string | null; color: string; onChange: (url: string | null) => void }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const up = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('logo', file); return post<{ logo_url: string }>('/institution/logo', fd) },
    onSuccess: (r) => { onChange(r.logo_url); toast('Logo yüklendi', 'success') },
    onError: (e: ApiError) => setErr(e.first()),
  })
  const rm = useMutation({ mutationFn: () => del('/institution/logo'), onSuccess: () => onChange(null) })
  const pick = async (f?: File) => {
    if (!f) return
    setErr(null)
    const problem = await checkImage(f)
    if (problem) return setErr(problem)
    up.mutate(f)
  }
  return (
    <div>
      <p className="mb-2 text-sm font-bold">Okul logosu</p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}
        className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-line p-3"
      >
        <InstitutionMark name={name || 'Okul'} logo={logo} color={color} className="size-16 shrink-0 text-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" loading={up.isPending} onClick={() => input.current?.click()} icon={<ImageUp className="size-4" />}>{logo ? 'Değiştir' : 'Dosya seç'}</Button>
            {logo && <Button type="button" size="sm" variant="ghost" loading={rm.isPending} onClick={() => rm.mutate()} icon={<Trash2 className="size-4" />}>Kaldır</Button>}
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">PNG, JPG ya da WebP · en fazla 1 MB · kare logo en iyi görünür</p>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {err && <p className="mt-1.5 text-sm font-semibold text-berry">{err}</p>}
    </div>
  )
}

/**
 * First time a principal opens the panel: three short steps (school, look, classes)
 * instead of a blank dashboard. "Sonra" hides it for this session only.
 */
export function SetupWizard({ data, onClose }: { data: InstitutionReport; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const inst = data.institution
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ name: inst.name, city: inst.city ?? '', brand_color: inst.brand_color ?? SWATCHES[0], logo: inst.logo_url ?? null as string | null })
  const [classes, setClasses] = useState<string[]>((data.school_classes ?? []).map((c) => c.name))
  const [cls, setCls] = useState('')
  const addClass = useMutation({
    mutationFn: (name: string) => post('/institution/classes', { name, grade: Number(name.match(/^\d{1,2}/)?.[0]) || null }),
    onSuccess: (_r, name) => { setClasses((c) => [...c, name]); setCls('') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const finish = useMutation({
    mutationFn: () => patch<InstitutionReport>('/institution', { name: f.name.trim(), city: f.city.trim() || null, brand_color: f.brand_color, complete_setup: true }),
    onSuccess: (r) => { qc.setQueryData(['institution'], r); toast('Okul paneliniz hazır', 'success'); onClose() },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const steps = ['Okulunuz', 'Görünüm', 'Sınıflar']
  const canNext = step !== 0 || f.name.trim().length >= 3
  const add = () => { const n = cls.trim().toLocaleUpperCase('tr'); if (n && !classes.includes(n)) addClass.mutate(n) }

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[28px] bg-card sm:max-w-lg sm:rounded-[28px]">
        <div className="relative overflow-hidden px-5 pb-4 pt-5 text-white" style={{ background: f.brand_color }}>
          <button onClick={onClose} className="absolute right-3 top-3 rounded-xl px-2 py-1 text-xs font-bold text-white/85 hover:bg-white/15">Sonra <X className="inline size-3.5" /></button>
          <img src={higoImg('wave')} alt="" className="absolute -bottom-3 right-4 w-20 drop-shadow-lg" />
          <p className="text-xs font-black uppercase tracking-widest text-white/80">Hoş geldiniz</p>
          <h2 className="mt-1 max-w-[75%] font-display text-2xl font-black leading-tight">Okul panelinizi 1 dakikada kuralım</h2>
          <div className="mr-24 mt-4 flex gap-1.5">
            {steps.map((s, i) => <span key={s} className={clsx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-white' : 'bg-white/35')} />)}
          </div>
        </div>
        <div className="p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-widest text-ink-soft">{step + 1}/{steps.length} · {steps[step]}</p>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.16 }} className="space-y-4">
              {step === 0 && (
                <>
                  <Input label="Okulunuzun adı" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={160} autoFocus />
                  <Input label="İl" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={80} placeholder="ör. İzmir" />
                </>
              )}
              {step === 1 && (
                <>
                  <LogoPicker name={f.name} logo={f.logo} color={f.brand_color} onChange={(logo) => { setF({ ...f, logo }); qc.invalidateQueries({ queryKey: ['institution'] }) }} />
                  <div>
                    <p className="mb-2 text-sm font-bold">Okul rengi</p>
                    <div className="flex flex-wrap gap-2">
                      {SWATCHES.map((c) => <button type="button" key={c} onClick={() => setF({ ...f, brand_color: c })} aria-label={c} className={clsx('grid size-9 place-items-center rounded-full text-white transition', f.brand_color === c && 'ring-4 ring-ink/30')} style={{ background: c }}>{f.brand_color === c && <Check className="size-4" strokeWidth={3} />}</button>)}
                    </div>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-sm text-ink-soft">Sınıflarınızı ekleyin. Öğretmen ve öğrencileri sonra bu sınıflara davet edersiniz.</p>
                  <form onSubmit={(e) => { e.preventDefault(); add() }} className="flex gap-2">
                    <input value={cls} onChange={(e) => setCls(e.target.value)} maxLength={20} placeholder="ör. 8-A" className="h-11 min-w-0 flex-1 rounded-2xl border-2 border-line bg-card px-3 font-bold focus:border-sky focus:outline-none" />
                    <Button type="submit" loading={addClass.isPending} icon={<Plus className="size-4" />}>Ekle</Button>
                  </form>
                  <div className="flex min-h-10 flex-wrap gap-1.5">
                    {classes.length ? classes.map((c) => <span key={c} className="rounded-full bg-paper-2 px-3 py-1 text-sm font-extrabold">{c}</span>) : <span className="text-sm text-ink-soft">Henüz sınıf yok. İsterseniz bu adımı atlayabilirsiniz.</span>}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-between gap-2">
            {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ArrowLeft className="size-4" />}>Geri</Button> : <span />}
            {step < steps.length - 1 ? (
              <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Devam <ArrowRight className="size-4" /></Button>
            ) : (
              <Button loading={finish.isPending} onClick={() => finish.mutate()} icon={<Check className="size-4" />}>Paneli aç</Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
