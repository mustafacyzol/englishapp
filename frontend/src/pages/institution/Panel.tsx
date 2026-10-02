import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { AlertTriangle, Check, Copy, Flame, Mail, Palette, Save, Trophy, UserPlus } from 'lucide-react'
import { ApiError, del, patch, post } from '@/lib/api'
import { SKILL, SKILLS } from '@/lib/skills'
import { dateTR, num } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { InviteModal, Kpi, Report, ago, type InstitutionReport, type InviteRow, type Member } from '@/components/institution/Report'
import { InstitutionMark, useInstitution } from '@/layouts/InstitutionLayout'
import { SchoolClassManager } from './School'
import { BRAND } from '@/lib/brand'

function useActions() {
  const qc = useQueryClient()
  const toast = useToast()
  const invite = useMutation({
    mutationFn: (rows: InviteRow[]) => post<{ invited: number; skipped: string[] }>('/institution/invite', { rows }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institution'] }),
  })
  const remove = useMutation({
    mutationFn: (id: number) => del(`/institution/members/${id}`),
    onSuccess: () => { toast('Öğrenci çıkarıldı', 'success'); qc.invalidateQueries({ queryKey: ['institution'] }) },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })
  return { invite, remove }
}

const students = (d: InstitutionReport) => d.members.filter((m) => m.role === 'student')

/** Overview: contract, seats, this week's pulse, who's leading and who needs a nudge. */
export function InstitutionOverview() {
  const { data } = useInstitution()
  const { invite, remove } = useActions()
  const active = students(data).filter((m) => m.status === 'active')
  const top = [...active].sort((a, b) => b.week_xp - a.week_xp).slice(0, 5)
  const quiet = active.filter((m) => !m.last_active_at || Date.now() - new Date(m.last_active_at).getTime() > 7 * 864e5)
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader kicker="Genel bakış" title="Bu hafta sınıfların nasıl?" />
      <Report data={data} view="overview" onInvite={(rows) => invite.mutateAsync(rows)} inviting={invite.isPending} onRemove={(id) => remove.mutate(id)} />
      <div className="mt-6 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="rounded-3xl border-2 border-line bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-lg"><Trophy className="size-5 text-butter-deep" /> Haftanın en çalışkanları</h3>
          {top.length ? (
            <ol className="space-y-2">
              {top.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className={clsx('grid size-8 place-items-center rounded-lg font-display font-black', i === 0 ? 'bg-butter text-[#1f2433]' : 'bg-paper-2')}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{m.name ?? m.email}<span className="ml-2 text-xs font-semibold text-ink-soft">{m.class_name}</span></span>
                  <span className="font-mono text-sm font-bold tabular-nums">{m.week_xp} XP</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-ink-soft">Bu hafta henüz çalışan yok.</p>}
        </section>
        <section className="rounded-3xl border-2 border-line bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-lg"><AlertTriangle className="size-5 text-berry" /> Bir haftadır girmeyenler</h3>
          {quiet.length ? (
            <ul className="space-y-2">
              {quiet.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-bold">{m.name ?? m.email} <span className="font-semibold text-ink-soft">{m.class_name}</span></span>
                  <span className="shrink-0 text-ink-soft">{ago(m.last_active_at)}</span>
                </li>
              ))}
              {quiet.length > 6 && <li className="text-sm font-bold text-ink-soft">+{quiet.length - 6} öğrenci daha</li>}
            </ul>
          ) : <p className="text-sm text-ink-soft">Harika, herkes bu hafta en az bir kez çalıştı.</p>}
        </section>
      </div>
    </div>
  )
}

export function InstitutionStudents() {
  const { data } = useInstitution()
  const { invite, remove } = useActions()
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader kicker="Öğrenciler" title={`${students(data).length} öğrenci`} />
      <Report data={data} view="students" onInvite={(rows) => invite.mutateAsync(rows)} inviting={invite.isPending} onRemove={(id) => remove.mutate(id)} />
    </div>
  )
}

/** Per-class cards: participation, weekly XP, streaks and the class's skill mix. */
export function InstitutionClasses() {
  const { data } = useInstitution()
  const groups = useMemo(() => {
    const m = new Map<string, Member[]>()
    for (const s of students(data)) {
      const k = s.class_name ?? 'Sınıfsız'
      m.set(k, [...(m.get(k) ?? []), s])
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr'))
  }, [data])
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader kicker="Sınıflar" title="Sınıf karnesi" />
      <SchoolClassManager />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(([name, list]) => {
          const act = list.filter((m) => m.status === 'active')
          const working = act.filter((m) => m.week_xp > 0).length
          const xp = act.reduce((a, m) => a + m.week_xp, 0)
          const streak = act.length ? act.reduce((a, m) => a + m.streak, 0) / act.length : 0
          const skill = SKILLS.map((k) => ({ k, xp: act.reduce((a, m) => a + (m.skills?.[k]?.xp ?? 0), 0) }))
          const max = Math.max(1, ...skill.map((x) => x.xp))
          const weakest = [...skill].sort((a, b) => a.xp - b.xp)[0]
          return (
            <section key={name} className="rounded-3xl border-2 border-line bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl font-black">{name}</h3>
                <span className="text-sm font-bold text-ink-soft">{list.length} öğrenci</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-paper-2 p-2"><p className="font-display text-xl font-black tabular-nums">{act.length ? Math.round((working / act.length) * 100) : 0}%</p><p className="text-[11px] font-bold text-ink-soft">katılım</p></div>
                <div className="rounded-2xl bg-paper-2 p-2"><p className="font-display text-xl font-black tabular-nums">{num(xp)}</p><p className="text-[11px] font-bold text-ink-soft">haftalık XP</p></div>
                <div className="rounded-2xl bg-paper-2 p-2"><p className="flex items-center justify-center gap-1 font-display text-xl font-black tabular-nums"><Flame className="size-4 text-flame" />{streak.toFixed(1)}</p><p className="text-[11px] font-bold text-ink-soft">ort. seri</p></div>
              </div>
              <div className="mt-4 space-y-1.5">
                {skill.map(({ k, xp: v }) => (
                  <div key={k} className="flex items-center gap-2 text-xs font-bold">
                    <span className="w-16 text-ink-soft">{SKILL[k].label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2"><span className={clsx('block h-full rounded-full', SKILL[k].bg)} style={{ width: `${(v / max) * 100}%` }} /></span>
                  </div>
                ))}
              </div>
              {act.length > 0 && <p className="mt-3 rounded-xl bg-paper-2/70 px-3 py-2 text-xs font-bold">Öneri: bu hafta sınıfla <span className={SKILL[weakest.k].text}>{SKILL[weakest.k].label.toLocaleLowerCase('tr')}</span> çalışın.</p>}
              <div className="mt-4 flex -space-x-2">
                {list.slice(0, 8).map((m) => <span key={m.id} title={m.name ?? m.email} className="grid size-8 place-items-center rounded-full border-2 border-card bg-paper-2 text-xs font-black">{(m.name ?? m.email)[0].toUpperCase()}</span>)}
                {list.length > 8 && <span className="grid size-8 place-items-center rounded-full border-2 border-card bg-ink text-[10px] font-black text-paper">+{list.length - 8}</span>}
              </div>
            </section>
          )
        })}
        {!groups.length && <p className="text-ink-soft">Henüz öğrenci yok. Davetler sayfasından ekleyebilirsin.</p>}
      </div>
    </div>
  )
}

export function InstitutionInvites() {
  const { data } = useInstitution()
  const { invite } = useActions()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const pending = data.members.filter((m) => m.status === 'invited')
  const inst = data.institution
  const seatsLeft = Math.max(0, inst.seats - inst.seats_used)
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Davetler" title="Öğrenci ekle">
        <Button onClick={() => setOpen(true)} icon={<UserPlus className="size-5" />}>Toplu davet</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border-2 border-line bg-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-ink-soft">Katılım kodu</p>
          <button onClick={() => { navigator.clipboard?.writeText(inst.join_code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }} className="mt-2 flex items-center gap-3 font-mono text-3xl font-black tracking-widest">
            {inst.join_code} {copied ? <Check className="size-6 text-mint-deep" /> : <Copy className="size-5 text-ink-soft" />}
          </button>
          <p className="mt-2 text-sm text-ink-soft">Öğrenciler uygulamada Ayarlar &gt; Okul / kurum bölümüne bu kodu girer, koltuk boşsa hemen katılır.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Boş koltuk" value={seatsLeft} sub={`${inst.seats} koltuktan`} />
          <Kpi label="Bekleyen" value={pending.length} sub="davet kabul bekliyor" />
        </div>
      </div>
      <section className="mt-6 rounded-3xl border-2 border-line bg-card">
        <h3 className="flex items-center gap-2 border-b-2 border-line px-5 py-4 text-lg"><Mail className="size-5" /> Bekleyen davetler</h3>
        {pending.length ? (
          <ul className="divide-y-2 divide-line/50">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-bold">{m.name ?? m.email}</span><span className="block truncate text-xs text-ink-soft">{m.email}{m.class_name ? ` · ${m.class_name}` : ''}</span></span>
                <span className="shrink-0 text-xs font-bold text-ink-soft">{m.invited_at ? dateTR(m.invited_at) : ''}</span>
              </li>
            ))}
          </ul>
        ) : <p className="px-5 py-8 text-center text-sm text-ink-soft">Bekleyen davet yok.</p>}
      </section>
      <InviteModal open={open} onClose={() => setOpen(false)} onInvite={(rows) => invite.mutateAsync(rows)} loading={invite.isPending} classes={data.classes} seatsLeft={seatsLeft} />
    </div>
  )
}

const SWATCHES = ['#e8403a', '#2f7cf6', '#22b573', '#8f7cf8', '#d99a00', '#0f766e', '#1f2433', '#c93460']

/** Branding and contact details the manager can keep current; contract terms stay with DilGO. */
export function InstitutionSettings() {
  const { data } = useInstitution()
  const qc = useQueryClient()
  const toast = useToast()
  const inst = data.institution
  const [f, setF] = useState({ logo_url: inst.logo_url ?? '', brand_color: inst.brand_color ?? '#4f8a6e', contact_name: inst.contact_name ?? '', contact_email: inst.contact_email ?? '', contact_phone: inst.contact_phone ?? '' })
  const save = useMutation({
    mutationFn: () => patch<InstitutionReport>('/institution', { ...f, logo_url: f.logo_url || null, contact_name: f.contact_name || null, contact_email: f.contact_email || null, contact_phone: f.contact_phone || null }),
    onSuccess: (r) => { qc.setQueryData(['institution'], r); toast('Kurum bilgileri kaydedildi', 'success') },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }))
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader kicker="Kurum ayarları" title="Panelin görünümü ve iletişim" />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px] [&>*]:min-w-0">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-5 rounded-3xl border-2 border-line bg-card p-5 sm:p-6">
          <Input label="Logo adresi (https)" value={f.logo_url} onChange={set('logo_url')} placeholder="https://okulum.k12.tr/logo.png" hint="Kare ya da yatay PNG/SVG. Panelde ve öğrencilerin kurum kartında görünür." />
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Palette className="size-4" /> Kurum rengi</p>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => <button type="button" key={c} onClick={() => setF((x) => ({ ...x, brand_color: c }))} aria-label={c} className={clsx('size-9 rounded-full ring-offset-2 ring-offset-card transition', f.brand_color === c && 'ring-4 ring-ink/40')} style={{ background: c }} />)}
              <label className="ml-1 flex items-center gap-2 rounded-full border-2 border-line px-2 py-1 text-xs font-bold">
                <input type="color" value={f.brand_color} onChange={set('brand_color')} className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0" /> Özel
              </label>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Yetkili kişi" value={f.contact_name} onChange={set('contact_name')} />
            <Input label="Telefon" value={f.contact_phone} onChange={set('contact_phone')} />
            <Input label="E-posta" type="email" value={f.contact_email} onChange={set('contact_email')} className="sm:col-span-2" />
          </div>
          <Button type="submit" loading={save.isPending} icon={<Save className="size-5" />}>Kaydet</Button>
        </form>
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-3xl border-2 border-line bg-card">
            <div className="h-2" style={{ background: f.brand_color }} />
            <div className="flex items-center gap-3 p-4">
              <InstitutionMark name={inst.name} logo={f.logo_url || null} color={f.brand_color} className="size-14 text-xl" />
              <div className="min-w-0"><p className="truncate font-display text-lg font-black">{inst.name}</p><p className="text-xs font-bold text-ink-soft">Önizleme</p></div>
            </div>
          </div>
          <div className="rounded-3xl border-2 border-line bg-card p-4 text-sm">
            <p className="font-black">Sözleşme</p>
            <p className="mt-1 text-ink-soft">{inst.seats} koltuk · {inst.starts_at ? dateTR(inst.starts_at) : '-'} ile {inst.ends_at ? dateTR(inst.ends_at) : 'süresiz'} arası</p>
            <p className="mt-2 text-xs text-ink-soft">Koltuk ve süre değişiklikleri için {BRAND} kurumsal ekibiyle iletişime geç.</p>
          </div>
          <div className="rounded-3xl border-2 border-line bg-card p-4 text-sm">
            <p className="font-black">Erişim</p>
            <ul className="mt-2 space-y-1.5 text-ink-soft">
              <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-mint-deep" /> Yöneticiler: öğrenci ekler, çıkarır, raporları görür</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-mint-deep" /> Öğrenciler: Premium ile öğrenir, paneli göremez</li>
              <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-mint-deep" /> Kişisel sohbetler ve yazılar kuruma açık değildir</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

