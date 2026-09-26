import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Check, Copy, Flame, Mail, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { SKILL, SKILLS } from '@/lib/skills'
import type { SkillKey } from '@/lib/types'
import { dateTR, num } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Alert, Modal } from '@/components/ui/Misc'

export interface Member {
  id: number
  name: string | null
  email: string
  class_name: string | null
  role: 'student' | 'manager'
  status: 'invited' | 'active' | 'removed'
  invited_at: string | null
  joined_at: string | null
  last_active_at: string | null
  cefr_level: string | null
  xp_total: number
  week_xp: number
  streak: number
  lessons: number
  skills: Record<SkillKey, { level: number; xp: number }> | null
}
export interface InstitutionReport {
  institution: { id: number; name: string; type: string; city: string | null; seats: number; seats_used: number; join_code: string; starts_at: string | null; ends_at: string | null; is_active: boolean; current: boolean }
  summary: { students: number; active: number; invited: number; active_this_week: number; week_xp: number; avg_streak: number; skills: Record<SkillKey, number> }
  classes: string[]
  members: Member[]
}
export interface InviteRow { email: string; name?: string; class_name?: string }

const TYPE: Record<string, string> = { school: 'Okul', course: 'Kurs', company: 'Şirket' }

function ago(iso: string | null) {
  if (!iso) return 'hiç girmedi'
  const h = (Date.now() - new Date(iso).getTime()) / 36e5
  if (h < 1) return 'az önce'
  if (h < 24) return `${Math.floor(h)} sa önce`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d} gün önce` : dateTR(iso)
}

/** "e-posta, Ad Soyad, Sınıf" per line — pasted straight from a spreadsheet works too (tabs or semicolons). */
export function parseRows(text: string, defaultClass: string): InviteRow[] {
  return text
    .split(/\n+/)
    .map((l) => l.split(/[,;\t]/).map((x) => x.trim()))
    .filter((p) => p[0] && p[0].includes('@'))
    .map(([email, name, cls]) => ({ email, name: name || undefined, class_name: cls || defaultClass || undefined }))
}

/**
 * Seat usage, weekly activity, the class's four-skill balance and per-student
 * progress — shared by the institution panel (/kurum) and the admin view.
 */
export function Report({ data, onInvite, onRemove, inviting, admin }: { data: InstitutionReport; onInvite: (rows: InviteRow[], role: 'student' | 'manager') => Promise<unknown>; onRemove: (id: number) => void; inviting?: boolean; admin?: boolean }) {
  const { institution: inst, summary } = data
  const [cls, setCls] = useState<string>('all')
  const [q, setQ] = useState('')
  const [invite, setInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const students = data.members.filter((m) => m.role === 'student')
  const managers = data.members.filter((m) => m.role === 'manager')
  const rows = useMemo(
    () => students.filter((m) => (cls === 'all' || m.class_name === cls) && (!q || `${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.week_xp - a.week_xp),
    [students, cls, q],
  )
  const seatPct = inst.seats ? Math.min(100, (inst.seats_used / inst.seats) * 100) : 0
  const maxSkill = Math.max(1, ...SKILLS.map((k) => summary.skills[k] ?? 0))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inst.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ Contract + seats */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border-2 border-line bg-card p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-ink-soft">{TYPE[inst.type] ?? inst.type}{inst.city ? ` · ${inst.city}` : ''}</p>
          <h2 className="mt-1 text-2xl sm:text-3xl">{inst.name}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Sözleşme {inst.starts_at ? dateTR(inst.starts_at) : '—'} – {inst.ends_at ? dateTR(inst.ends_at) : 'süresiz'} ·{' '}
            <span className={inst.current ? 'font-bold text-mint-deep' : 'font-bold text-berry'}>{inst.current ? 'aktif' : 'pasif'}</span>
          </p>
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-sm font-bold"><span>Koltuk kullanımı</span><span className="tabular-nums">{inst.seats_used}/{inst.seats}</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-paper-2"><div className={clsx('h-full rounded-full', seatPct > 90 ? 'bg-berry' : 'bg-sage')} style={{ width: `${seatPct}%` }} /></div>
            <p className="mt-1.5 text-xs text-ink-soft">{Math.max(0, inst.seats - inst.seats_used)} boş koltuk · davet edilenler de koltuk tutar</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setInvite(true)} icon={<UserPlus className="size-5" />}>Öğrenci davet et</Button>
            <button onClick={copy} className="press flex h-12 items-center gap-2 rounded-2xl border-2 border-line px-4 font-mono text-sm font-bold shadow-hard hover:border-ink/25" title="Katılım kodunu kopyala">
              {copied ? <Check className="size-4 text-mint-deep" /> : <Copy className="size-4" />} {inst.join_code}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">Öğrenciler bu kodu Ayarlar → Kurum kodu bölümüne girerek de katılabilir.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Öğrenci" value={summary.students} sub={`${summary.active} aktif · ${summary.invited} davetli`} />
          <Kpi label="Bu hafta çalışan" value={summary.active_this_week} sub={summary.active ? `%${Math.round((summary.active_this_week / summary.active) * 100)} katılım` : '—'} />
          <Kpi label="Haftalık XP" value={num(summary.week_xp)} sub="tüm sınıflar" />
          <Kpi label="Ortalama seri" value={`${summary.avg_streak} gün`} sub="aktif öğrenciler" icon={<Flame className="size-4 text-flame" />} />
        </div>
      </section>

      {/* ------------------------------------------------ Four-skill balance */}
      <section className="rounded-3xl border-2 border-line bg-card p-5 sm:p-6">
        <h3 className="mb-4 text-lg">Kurumun dört beceri dengesi</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {SKILLS.map((k) => {
            const S = SKILL[k]
            return (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-sm font-bold">
                  <span className="flex items-center gap-1.5"><span className={clsx('grid size-6 place-items-center rounded-md text-white', S.bg)}><S.icon className="size-3.5" /></span>{S.label}</span>
                  <span className="tabular-nums text-ink-soft">{num(summary.skills[k] ?? 0)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-paper-2"><div className={clsx('h-full rounded-full', S.bg)} style={{ width: `${((summary.skills[k] ?? 0) / maxSkill) * 100}%` }} /></div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------ Students */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-xl"><Users className="size-5" /> Öğrenciler</h3>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim ya da e-posta" className="h-10 w-56 rounded-xl border-2 border-line bg-card pl-9 pr-3 text-sm font-semibold focus:border-ink/30 focus:outline-none" />
          </label>
        </div>
        {data.classes.length > 0 && (
          <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
            {['all', ...data.classes].map((c) => (
              <button key={c} onClick={() => setCls(c)} className={clsx('shrink-0 rounded-full border-2 px-3 py-1 text-sm font-extrabold', cls === c ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft')}>{c === 'all' ? 'Tüm sınıflar' : c}</button>
            ))}
          </div>
        )}

        {/* table on wide screens */}
        <div className="hidden overflow-hidden rounded-2xl border-2 border-line bg-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-line bg-paper-2 text-xs font-extrabold uppercase tracking-wider">
              <tr><th className="px-4 py-3">Öğrenci</th><th className="px-4 py-3">Sınıf</th><th className="px-4 py-3">Son giriş</th><th className="px-4 py-3 text-right">Bu hafta</th><th className="px-4 py-3 text-right">Seri</th><th className="px-4 py-3">Beceriler</th><th /></tr>
            </thead>
            <tbody className="divide-y-2 divide-line/40">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-paper-2/60">
                  <td className="px-4 py-3"><p className="font-bold">{m.name ?? '—'} {m.status === 'invited' && <InvitedPill />}</p><p className="text-xs text-ink-soft">{m.email}</p></td>
                  <td className="px-4 py-3">{m.class_name ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{m.status === 'invited' ? `davet ${ago(m.invited_at)}` : ago(m.last_active_at)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{m.week_xp} XP</td>
                  <td className="px-4 py-3 text-right tabular-nums">{m.streak}</td>
                  <td className="px-4 py-3"><SkillBars m={m} /></td>
                  <td className="px-4 py-3 text-right"><RemoveBtn m={m} onRemove={onRemove} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-8 text-center text-ink-soft">Bu filtrede öğrenci yok.</p>}
        </div>

        {/* cards on phones */}
        <div className="grid gap-2 md:hidden">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl border-2 border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-2 font-display font-black">{(m.name ?? m.email)[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.name ?? m.email} {m.status === 'invited' && <InvitedPill />}</p>
                  <p className="truncate text-xs text-ink-soft">{m.class_name ?? 'Sınıf yok'} · {m.status === 'invited' ? `davet ${ago(m.invited_at)}` : ago(m.last_active_at)}</p>
                </div>
                <RemoveBtn m={m} onRemove={onRemove} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold tabular-nums">{m.week_xp} XP <span className="font-normal text-ink-soft">bu hafta</span></span>
                <span className="flex items-center gap-1 tabular-nums"><Flame className="size-4 text-flame" /> {m.streak}</span>
                <SkillBars m={m} />
              </div>
            </div>
          ))}
          {!rows.length && <p className="p-6 text-center text-ink-soft">Bu filtrede öğrenci yok.</p>}
        </div>
      </section>

      {admin && (
        <section>
          <h3 className="mb-3 text-xl">Kurum yöneticileri</h3>
          <div className="flex flex-wrap gap-2">
            {managers.map((m) => <span key={m.id} className="rounded-full border-2 border-line bg-card px-3 py-1.5 text-sm font-bold">{m.name ?? m.email} {m.status === 'invited' && <InvitedPill />}</span>)}
            {!managers.length && <p className="text-sm text-ink-soft">Henüz yönetici yok. Yönetici davet ederek kurumun kendi panelini açabilirsin.</p>}
          </div>
        </section>
      )}

      <InviteModal open={invite} onClose={() => setInvite(false)} onInvite={onInvite} loading={inviting} admin={admin} classes={data.classes} seatsLeft={Math.max(0, inst.seats - inst.seats_used)} />
    </div>
  )
}

function Kpi({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-line bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink-soft">{icon}{label}</p>
      <p className="mt-1 font-display text-2xl font-black tabular-nums">{value}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
  )
}

function InvitedPill() {
  return <span className="ml-1 rounded-md bg-butter/30 px-1.5 py-0.5 text-[10px] font-black uppercase">davetli</span>
}

function SkillBars({ m }: { m: Member }) {
  if (!m.skills) return <span className="text-xs text-ink-soft">—</span>
  const max = Math.max(1, ...SKILLS.map((k) => m.skills![k]?.xp ?? 0))
  return (
    <span className="flex h-6 items-end gap-1" title={SKILLS.map((k) => `${SKILL[k].label}: Sv${m.skills![k]?.level ?? 0}`).join(' · ')}>
      {SKILLS.map((k) => <span key={k} className={clsx('w-2.5 rounded-sm', SKILL[k].bg)} style={{ height: `${Math.max(12, ((m.skills![k]?.xp ?? 0) / max) * 100)}%` }} />)}
    </span>
  )
}

function RemoveBtn({ m, onRemove }: { m: Member; onRemove: (id: number) => void }) {
  return (
    <button onClick={() => confirm(`${m.name ?? m.email} kurumdan çıkarılsın mı? Premium koltuğu boşa çıkar.`) && onRemove(m.id)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-berry/10 hover:text-berry" aria-label="Kurumdan çıkar">
      <Trash2 className="size-4" />
    </button>
  )
}

function InviteModal({ open, onClose, onInvite, loading, admin, classes, seatsLeft }: { open: boolean; onClose: () => void; onInvite: (rows: InviteRow[], role: 'student' | 'manager') => Promise<unknown>; loading?: boolean; admin?: boolean; classes: string[]; seatsLeft: number }) {
  const [text, setText] = useState('')
  const [cls, setCls] = useState('')
  const [role, setRole] = useState<'student' | 'manager'>('student')
  const [result, setResult] = useState<string | null>(null)
  const rows = parseRows(text, cls)
  const submit = async () => {
    try {
      const r = (await onInvite(rows, role)) as { invited: number; skipped: string[] }
      setResult(`${r.invited} kişi davet edildi${r.skipped.length ? ` · ${r.skipped.length} adres atlandı (zaten üye ya da geçersiz)` : ''}.`)
      setText('')
    } catch (e) {
      setResult((e as Error).message)
    }
  }
  return (
    <Modal open={open} onClose={() => { onClose(); setResult(null) }} className="sm:max-w-xl">
      <h2 className="flex items-center gap-2 text-2xl"><Mail className="size-6" /> Davet gönder</h2>
      <p className="mb-4 mt-1 text-sm text-ink-soft">Her satıra bir kişi: <code className="rounded bg-paper-2 px-1">e-posta, Ad Soyad, Sınıf</code>. Excel’den kopyalayıp yapıştırabilirsin. Hesabı olanlar hemen eklenir, olmayanlara davet e-postası gider.</p>
      {result && <div className="mb-4"><Alert tone="success">{result}</Alert></div>}
      {admin && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-paper-2 p-1.5">
          {(['student', 'manager'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={clsx('rounded-xl py-2 text-sm font-extrabold', role === r ? 'bg-card shadow-hard-sm' : 'text-ink-soft')}>{r === 'student' ? 'Öğrenci' : 'Kurum yöneticisi'}</button>
          ))}
        </div>
      )}
      <Textarea label="Kişiler" value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={'ayse@okul.k12.tr, Ayşe Demir, 10-A\nmehmet@okul.k12.tr, Mehmet Kaya'} />
      {role === 'student' && (
        <div className="mt-3">
          <Input label="Varsayılan sınıf (isteğe bağlı)" value={cls} onChange={(e) => setCls(e.target.value)} list="inst-classes" placeholder="ör. 10-B" />
          <datalist id="inst-classes">{classes.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className={clsx('text-sm font-bold', role === 'student' && rows.length > seatsLeft ? 'text-berry' : 'text-ink-soft')}>
          {rows.length} kişi{role === 'student' ? ` · ${seatsLeft} boş koltuk` : ''}
        </p>
        <Button onClick={submit} loading={loading} disabled={!rows.length}>Davet et</Button>
      </div>
    </Modal>
  )
}
