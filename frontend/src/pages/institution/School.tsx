import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { BookOpen, CalendarClock, Check, ClipboardList, GraduationCap, MessageCircle, Pencil, Plus, Target, Trash2, UserPlus, Users } from 'lucide-react'
import { ApiError, del, get, patch, post } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Empty, Modal, PageHeader } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { ago, type InstitutionReport } from '@/components/institution/Report'
import { useInstitution } from '@/layouts/InstitutionLayout'

interface Assignment { id: number; title: string; kind: string; target: string | null; note: string | null; class_name: string | null; due_at: string | null; created_at: string; students: number; done: number; done_ids: number[]; author: string | null }

const KINDS = [
  { key: 'lesson', label: 'Ders', icon: BookOpen, text: 'Yol haritasından bir ders. Bitirince kendiliğinden işaretlenir.' },
  { key: 'story', label: 'Hikâye', icon: BookOpen, text: 'Bir hikâye ve soruları. Okuyunca kendiliğinden işaretlenir.' },
  { key: 'practice', label: 'Kelime', icon: Target, text: 'Kelime tekrarı ya da oyun.' },
  { key: 'exam', label: 'Sınav', icon: GraduationCap, text: 'Sınav modunda soru çözümü (LGS, YDT...).' },
  { key: 'ai', label: 'Konuşma', icon: MessageCircle, text: 'Defne ile konuşma pratiği.' },
  { key: 'custom', label: 'Serbest', icon: ClipboardList, text: 'Kendi yazdığın bir görev.' },
] as const

/* ------------------------------------------------------------- classes */

/** Principals add classes, set the grade and give each class its English teacher. */
export function SchoolClassManager() {
  const { data } = useInstitution()
  const qc = useQueryClient()
  const toast = useToast()
  const [edit, setEdit] = useState<{ id?: number; name: string; grade: string; teacher_member_id: string } | null>(null)
  const manager = data.role !== 'teacher'
  const save = useMutation({
    mutationFn: () => (edit?.id ? patch : post)(`/institution/classes${edit?.id ? `/${edit.id}` : ''}`, { name: edit!.name.trim(), grade: edit!.grade ? Number(edit!.grade) : null, teacher_member_id: edit!.teacher_member_id ? Number(edit!.teacher_member_id) : null }),
    onSuccess: () => { setEdit(null); qc.invalidateQueries({ queryKey: ['institution'] }); toast('Sınıf kaydedildi', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => del(`/institution/classes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institution'] }); toast('Sınıf silindi; öğrencileri “Sınıfsız” oldu.', 'success') },
  })
  const list = data.school_classes ?? []
  if (!list.length && !manager) return null
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl">Sınıflar ve öğretmenleri</h2>
        {manager && <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEdit({ name: '', grade: '', teacher_member_id: '' })}>Sınıf ekle</Button>}
      </div>
      {list.length ? (
        <div className="overflow-hidden rounded-3xl border-2 border-line bg-card">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b-2 border-line/60 px-4 py-3 last:border-b-0">
              <span className="grid h-11 min-w-14 place-items-center rounded-xl bg-paper-2 px-2 font-display font-black">{c.name}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{c.grade ? `${c.grade}. sınıf` : 'Sınıf'} · {c.students} öğrenci</span>
                <span className="block truncate text-sm text-ink-soft">{c.teacher ? `Öğretmen: ${c.teacher.name}` : 'Öğretmen atanmadı'}</span>
              </span>
              {manager && (
                <>
                  <button onClick={() => setEdit({ id: c.id, name: c.name, grade: c.grade ? String(c.grade) : '', teacher_member_id: c.teacher ? String(c.teacher.id) : '' })} className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label="Düzenle"><Pencil className="size-4" /></button>
                  <button onClick={() => confirm(`${c.name} silinsin mi? Öğrenciler silinmez.`) && remove.mutate(c.id)} className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-berry/10 hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border-2 border-dashed border-line p-6 text-center text-sm text-ink-soft">Henüz sınıf yok. “7-A” gibi sınıflar ekle, her birine İngilizce öğretmenini ata.</p>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)}>
        <h2 className="mb-4 text-2xl">{edit?.id ? 'Sınıfı düzenle' : 'Yeni sınıf'}</h2>
        {edit && (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
            <Input label="Sınıf adı" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="ör. 8-A" maxLength={60} required autoFocus />
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Sınıf düzeyi</span>
              <select value={edit.grade} onChange={(e) => setEdit({ ...edit, grade: e.target.value })} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
                <option value="">Seçilmedi</option>
                {Array.from({ length: 11 }, (_, i) => i + 2).map((g) => <option key={g} value={g}>{g}. sınıf</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">İngilizce öğretmeni</span>
              <select value={edit.teacher_member_id} onChange={(e) => setEdit({ ...edit, teacher_member_id: e.target.value })} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
                <option value="">Atanmadı</option>
                {(data.teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.name ?? t.email}</option>)}
              </select>
              {!(data.teachers ?? []).length && <span className="mt-1 block text-xs text-ink-soft">Önce Öğretmenler sayfasından öğretmen davet et.</span>}
            </label>
            <Button type="submit" block loading={save.isPending}>Kaydet</Button>
          </form>
        )}
      </Modal>
    </section>
  )
}

/* ------------------------------------------------------------ teachers */

/** Principals invite English teachers and see which classes each one has. */
export function SchoolTeachers() {
  const { data } = useInstitution()
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', email: '' })
  const invite = useMutation({
    mutationFn: () => post<{ invited: number; skipped: string[] }>('/institution/invite', { role: 'teacher', rows: [{ email: f.email.trim(), name: f.name.trim() || undefined }] }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['institution'] }); setOpen(false); setF({ name: '', email: '' }); toast(r.invited ? 'Davet gönderildi' : 'Bu e-posta zaten ekli', r.invited ? 'success' : 'error') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => del(`/institution/members/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institution'] }); toast('Öğretmen çıkarıldı', 'success') },
  })
  const list = data.teachers ?? []
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Öğretmenler" title="İngilizce öğretmenleri">
        <Button onClick={() => setOpen(true)} icon={<UserPlus className="size-5" />}>Öğretmen davet et</Button>
      </PageHeader>
      <p className="-mt-3 mb-6 max-w-2xl text-ink-soft">Öğretmenler kendi panelinde yalnızca kendi sınıflarını görür: öğrenci ekler, ödev verir, ilerlemeyi izler. Sınıfları Sınıflar sayfasından atarsın.</p>
      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-3xl border-2 border-line bg-card p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky/12 font-display text-lg font-black text-sky">{(t.name ?? t.email)[0].toLocaleUpperCase('tr')}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-lg font-black">{t.name ?? t.email}</span>
                <span className="block truncate text-sm text-ink-soft">{t.email}</span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {t.classes.length ? t.classes.map((c) => <span key={c} className="rounded-lg bg-paper-2 px-2 py-0.5 text-xs font-black">{c}</span>) : <span className="text-xs font-bold text-ink-soft">Sınıf atanmadı</span>}
                  <span className={clsx('rounded-lg px-2 py-0.5 text-xs font-black', t.status === 'active' ? 'bg-mint/12 text-mint-deep' : 'bg-butter/20 text-butter-deep')}>{t.status === 'active' ? `aktif · ${ago(t.last_active_at)}` : 'davet bekliyor'}</span>
                </span>
              </span>
              <button onClick={() => confirm('Öğretmen çıkarılsın mı?') && remove.mutate(t.id)} className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-berry/10 hover:text-berry" aria-label="Çıkar"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      ) : <Empty icon={<Users className="size-8" />} title="Henüz öğretmen yok" text="İngilizce öğretmenlerini e-postayla davet et; hesapları varsa hemen bağlanırlar." />}
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="mb-4 text-2xl">Öğretmen davet et</h2>
        <form onSubmit={(e) => { e.preventDefault(); invite.mutate() }} className="space-y-4">
          <Input label="Ad soyad" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
          <Input label="E-posta" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Button type="submit" block loading={invite.isPending}>Davet gönder</Button>
        </form>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------ homework */

/** Teachers set homework for a class and watch who has done it. */
export function SchoolHomework() {
  const { data } = useInstitution()
  const qc = useQueryClient()
  const toast = useToast()
  const list = useQuery({ queryKey: ['assignments'], queryFn: () => get<{ data: Assignment[] }>('/institution/assignments') })
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Assignment | null>(null)
  const remove = useMutation({
    mutationFn: (id: number) => del<{ data: Assignment[] }>(`/institution/assignments/${id}`),
    onSuccess: (r) => qc.setQueryData(['assignments'], r),
    onError: (e: ApiError) => toast(e.message, 'error'),
  })
  const items = list.data?.data ?? []
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader kicker="Ödevler" title="Sınıflarına ödev ver">
        <Button onClick={() => setOpen(true)} icon={<Plus className="size-5" />}>Yeni ödev</Button>
      </PageHeader>
      {items.length ? (
        <div className="grid gap-3">
          {items.map((a) => {
            const K = KINDS.find((k) => k.key === a.kind) ?? KINDS[5]
            const pct = a.students ? Math.round((a.done / a.students) * 100) : 0
            const late = a.due_at && new Date(a.due_at) < new Date()
            return (
              <article key={a.id} className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-line bg-card p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-flame/10 text-flame"><K.icon className="size-6" /></span>
                <button onClick={() => setView(a)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-display text-lg font-black">{a.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                    <span className="font-bold text-ink">{a.class_name ?? 'Tüm okul'}</span>
                    <span>{K.label}</span>
                    {a.due_at && <span className={clsx('flex items-center gap-1', late && 'text-berry')}><CalendarClock className="size-3.5" />{dateTR(a.due_at)}</span>}
                    {a.author && <span>· {a.author}</span>}
                  </span>
                </button>
                <span className="w-40 shrink-0">
                  <span className="flex justify-between text-xs font-bold"><span>{a.done}/{a.students} yaptı</span><span>%{pct}</span></span>
                  <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-paper-2"><span className="block h-full rounded-full bg-mint" style={{ width: `${pct}%` }} /></span>
                </span>
                <button onClick={() => confirm('Ödev silinsin mi?') && remove.mutate(a.id)} className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-berry/10 hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
              </article>
            )
          })}
        </div>
      ) : <Empty icon={<ClipboardList className="size-8" />} title="Henüz ödev yok" text="Bir ders, hikâye, kelime tekrarı ya da sınav seti seç; öğrencilerin uygulamada görür, yaptıkça burada işaretlenir." />}
      <NewHomework open={open} onClose={() => setOpen(false)} data={data} onDone={(r) => { qc.setQueryData(['assignments'], r); setOpen(false); toast('Ödev verildi', 'success') }} />
      <Modal open={!!view} onClose={() => setView(null)}>
        {view && <HomeworkDetail a={view} data={data} />}
      </Modal>
    </div>
  )
}

function HomeworkDetail({ a, data }: { a: Assignment; data: InstitutionReport }) {
  const students = data.members.filter((m) => m.role === 'student' && m.status === 'active' && (!a.class_name || m.class_name === a.class_name))
  const doneIds = new Set(a.done_ids)
  const rows = students.map((m) => ({ m, done: m.user_id != null && doneIds.has(m.user_id) }))
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-flame">{a.class_name ?? 'Tüm okul'}</p>
      <h2 className="mt-1 text-2xl">{a.title}</h2>
      {a.note && <p className="mt-2 rounded-2xl bg-paper-2 p-3 text-sm">{a.note}</p>}
      <p className="mt-4 text-sm font-bold">{a.done}/{a.students} öğrenci tamamladı</p>
      <ul className="mt-3 max-h-[50dvh] divide-y-2 divide-line/50 overflow-y-auto rounded-2xl border-2 border-line">
        {rows.map(({ m, done }) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 truncate font-bold">{m.name ?? m.email}</span>
            {done ? <span className="flex items-center gap-1 font-black text-mint-deep"><Check className="size-4" strokeWidth={3} /> yaptı</span> : <span className="font-bold text-ink-soft">bekliyor</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function NewHomework({ open, onClose, data, onDone }: { open: boolean; onClose: () => void; data: InstitutionReport; onDone: (r: { data: Assignment[] }) => void }) {
  const toast = useToast()
  const classes = (data.school_classes ?? []).map((c) => c.name).concat(data.classes.filter((c) => !(data.school_classes ?? []).some((s) => s.name === c)))
  const [f, setF] = useState({ class_name: classes[0] ?? '', kind: 'lesson', target: '', title: '', note: '', due_at: '' })
  const catalog = useQuery({ queryKey: ['inst-catalog'], queryFn: () => get<{ lessons: { id: number; title: string; level?: string }[]; stories: { slug: string; title: string; cefr_level: string }[] }>('/institution/catalog'), enabled: open })
  const create = useMutation({
    mutationFn: () => post<{ data: Assignment[] }>('/institution/assignments', { ...f, class_name: f.class_name || null, target: f.target || null, title: f.title || null, note: f.note || null, due_at: f.due_at ? new Date(f.due_at).toISOString() : null }),
    onSuccess: onDone,
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const needsTarget = f.kind === 'lesson' || f.kind === 'story'
  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-xl">
      <h2 className="mb-4 text-2xl">Yeni ödev</h2>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Sınıf</span>
          <select value={f.class_name} onChange={(e) => setF({ ...f, class_name: e.target.value })} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
            {data.role !== 'teacher' && <option value="">Tüm okul</option>}
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-bold">Ödev türü</span>
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button type="button" key={k.key} onClick={() => setF({ ...f, kind: k.key, target: '' })} aria-pressed={f.kind === k.key} className={clsx('flex flex-col items-center gap-1 rounded-2xl border-2 p-2.5 text-xs font-extrabold transition', f.kind === k.key ? 'border-ink bg-paper-2' : 'border-line hover:border-ink/30')}>
                <k.icon className="size-5" />{k.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">{KINDS.find((k) => k.key === f.kind)?.text}</p>
        </div>
        <AnimatePresence initial={false}>
          {needsTarget && (
            <motion.label key={f.kind} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="block overflow-hidden">
              <span className="mb-1.5 block text-sm font-bold">{f.kind === 'lesson' ? 'Ders' : 'Hikâye'}</span>
              <select required value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} className="h-12 w-full rounded-2xl border-2 border-line bg-card px-3 font-semibold">
                <option value="">Seç…</option>
                {f.kind === 'lesson' ? catalog.data?.lessons.map((l) => <option key={l.id} value={l.id}>{l.level ? `${l.level} · ` : ''}{l.title}</option>) : catalog.data?.stories.map((s) => <option key={s.slug} value={s.slug}>{s.cefr_level} · {s.title}</option>)}
              </select>
            </motion.label>
          )}
        </AnimatePresence>
        <Input label={needsTarget ? 'Başlık (isteğe bağlı)' : 'Başlık'} value={f.title} required={!needsTarget} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={160} placeholder={needsTarget ? 'Boş bırakırsan dersin adı yazılır' : 'ör. 20 kelime tekrarı'} />
        <Textarea label="Not (isteğe bağlı)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={2} maxLength={1000} />
        <Input label="Son gün (isteğe bağlı)" type="datetime-local" value={f.due_at} onChange={(e) => setF({ ...f, due_at: e.target.value })} />
        <Button type="submit" block loading={create.isPending}>Ödevi ver</Button>
      </form>
    </Modal>
  )
}
