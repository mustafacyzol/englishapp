import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Minus, ShieldCheck, UserPlus } from 'lucide-react'
import { get } from '@/lib/api'
import { AREAS, ROLES, roleLabel } from '@/lib/adminAccess'
import { dateTR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Misc'
import { AdminTitle, Pill } from './kit'
import { CreateUserModal } from './CreateUser'

interface Row { id: number; name: string; email: string; role: string; permissions: string[]; custom: boolean; two_factor: boolean; last_login_at: string | null }

/** The whole team on one screen: who can open which part of the panel. */
export default function Staff() {
  const [adding, setAdding] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['admin-staff'], queryFn: () => get<{ data: Row[] }>('/admin/staff', true) })
  return (
    <div>
      <AdminTitle title="Ekip, roller ve yetkiler">
        <Button icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>Ekip üyesi ekle</Button>
      </AdminTitle>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.filter((r) => r.key !== 'user').map((r) => (
          <div key={r.key} className="rounded-2xl border-2 border-line bg-card px-4 py-3">
            <p className="font-extrabold">{r.label}</p>
            <p className="text-xs text-ink-soft">{r.text}</p>
          </div>
        ))}
      </div>
      {isLoading || !data ? <Spinner /> : (
        <div className="ink-card overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b-2 border-line bg-paper-2">
              <tr>
                <th className="px-4 py-3 text-xs font-extrabold uppercase tracking-wider">Kişi</th>
                <th className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider">Rol</th>
                {AREAS.map((a) => <th key={a.key} title={a.text} className="px-2 py-3 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wider">{a.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-line/10">
              {data.data.map((u) => (
                <tr key={u.id} className="hover:bg-paper-2">
                  <td className="px-4 py-2.5">
                    <Link to={`/admin/users/${u.id}`} className="font-bold hover:text-flame">{u.name}</Link>
                    <p className="text-xs text-ink-soft">{u.email} · son giriş {u.last_login_at ? dateTR(u.last_login_at) : '-'}</p>
                  </td>
                  <td className="px-3">
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={u.role === 'super_admin' ? 'warn' : 'info'}>{roleLabel(u.role)}</Pill>
                      {u.custom && <Pill>özel</Pill>}
                      {u.two_factor && <span title="İki adımlı doğrulama açık"><ShieldCheck className="size-4 text-mint-deep" /></span>}
                    </div>
                  </td>
                  {AREAS.map((a) => (
                    <td key={a.key} className="px-2 text-center">
                      {u.permissions.includes(a.key) ? <Check className="mx-auto size-4 text-mint-deep" strokeWidth={3} aria-label="var" /> : <Minus className="mx-auto size-4 text-ink-soft/40" aria-label="yok" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">Bir kişinin rolünü veya yetkilerini değiştirmek için adına tıkla. Değişiklikten sonra kişinin yönetici oturumu kapanır, yeniden doğrulama ister.</p>
      {adding && <CreateUserModal open onClose={() => setAdding(false)} staff />}
    </div>
  )
}
