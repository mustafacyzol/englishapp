import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { ApiError, post } from '@/lib/api'
import { AREAS, ROLES } from '@/lib/adminAccess'
import { useAuth } from '@/lib/auth'
import type { Me } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Select, Toggle } from '@/components/ui/Field'
import { Alert, Modal } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'

/** Role defaults, mirrored from the server so the picker can show what a role brings. */
export const ROLE_DEFAULTS: Record<string, string[]> = {
  support: ['users', 'marketing', 'desk'],
  editor: ['content', 'blog'],
  admin: AREAS.map((a) => a.key),
  super_admin: AREAS.map((a) => a.key),
  user: [],
}

/** Tick the admin panel areas one staff member may open. */
export function PermissionPicker({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {AREAS.map((a) => {
        const on = value.includes(a.key)
        return (
          <button key={a.key} type="button" disabled={disabled} onClick={() => onChange(on ? value.filter((x) => x !== a.key) : [...value, a.key])} className={clsx('flex items-start gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-left transition disabled:opacity-60', on ? 'border-flame bg-flame/5' : 'border-line hover:border-ink/25')}>
            <span className={clsx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2', on ? 'border-flame bg-flame text-white' : 'border-line')}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold">{a.label}</span>
              <span className="block text-xs text-ink-soft">{a.text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function CreateUserModal({ open, onClose, staff }: { open: boolean; onClose: () => void; staff?: boolean }) {
  const { user: me } = useAuth()
  const isSuper = me?.role === 'super_admin'
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [f, setF] = useState({ name: '', email: '', password: '', role: (staff ? 'editor' : 'user') as Me['role'], cefr_level: 'A1', premium_days: '', verify_email: true, send_welcome: true })
  const [perms, setPerms] = useState<string[] | null>(null)
  const set = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }))
  const create = useMutation({
    mutationFn: () => post<{ user: { id: number } }>('/admin/users', {
      name: f.name, email: f.email, password: f.password || null, role: f.role, cefr_level: f.cefr_level,
      premium_days: f.premium_days ? Number(f.premium_days) : null, verify_email: f.verify_email, send_welcome: f.send_welcome,
      ...(f.role !== 'user' && perms && { permissions: perms }),
    }, true),
    onSuccess: (r) => {
      toast('Hesap oluşturuldu', 'success')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-staff'] })
      onClose()
      nav(`/admin/users/${r.user.id}`)
    },
  })
  const err = create.error as ApiError | null
  const roles = ROLES.filter((r) => isSuper || r.key === 'user')
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="max-h-[85dvh] overflow-y-auto p-6">
        <h2 className="text-2xl font-extrabold">{staff ? 'Ekip üyesi ekle' : 'Yeni kullanıcı'}</h2>
        <p className="mt-1 text-sm text-ink-soft">Şifre boş bırakılırsa kişiye bir hoş geldin e-postası gider ve kendi şifresini "Şifremi unuttum" ile belirler.</p>
        {err && <div className="mt-4"><Alert tone="error">{err.first()}</Alert></div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Input label="Ad soyad" required value={f.name} onChange={(e) => set('name', e.target.value)} error={err?.first('name')} />
          <Input label="E-posta" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} error={err?.first('email')} />
          <Input label="Şifre (isteğe bağlı, en az 10)" type="text" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} error={err?.first('password')} />
          <Select label="Rol" value={f.role} onChange={(e) => { set('role', e.target.value); setPerms(null) }}>
            {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          {f.role === 'user' && (
            <>
              <Select label="Başlangıç seviyesi" value={f.cefr_level} onChange={(e) => set('cefr_level', e.target.value)}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => <option key={l}>{l}</option>)}
              </Select>
              <Input label="Hediye Premium (gün)" type="number" min={1} value={f.premium_days} onChange={(e) => set('premium_days', e.target.value)} placeholder="Boş = yok" />
            </>
          )}
        </div>
        {!isSuper && <p className="mt-3 text-xs text-ink-soft">Ekip hesabı (destek, editör, yönetici) yalnızca süper yönetici tarafından açılabilir.</p>}
        {f.role !== 'user' && f.role !== 'super_admin' && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-extrabold">Erişebileceği bölümler <span className="font-semibold text-ink-soft">({ROLES.find((r) => r.key === f.role)?.text})</span></p>
            <PermissionPicker value={perms ?? ROLE_DEFAULTS[f.role]} onChange={setPerms} />
          </div>
        )}
        <div className="mt-4 divide-y-2 divide-line/40 rounded-2xl border-2 border-line px-4">
          <Toggle label="E-postası doğrulanmış say" checked={f.verify_email} onChange={(v) => set('verify_email', v)} />
          <Toggle label="Hoş geldin e-postası gönder" checked={f.send_welcome} onChange={(v) => set('send_welcome', v)} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" loading={create.isPending}>Oluştur</Button>
        </div>
      </form>
    </Modal>
  )
}
