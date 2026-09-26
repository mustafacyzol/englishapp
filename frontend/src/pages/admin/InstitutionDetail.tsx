import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ApiError, del, get, post } from '@/lib/api'
import { Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Report, type InstitutionReport, type InviteRow } from '@/components/institution/Report'

/** Admin view of one partner institution: its report plus inviting students and managers. */
export default function InstitutionDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const toast = useToast()
  const key = ['admin-institution', id]
  const { data } = useQuery({ queryKey: key, queryFn: () => get<InstitutionReport>(`/admin/institutions/${id}/report`, true) })
  const invite = useMutation({
    mutationFn: ({ rows, role }: { rows: InviteRow[]; role: string }) => post<{ invited: number; skipped: string[] }>(`/admin/institutions/${id}/invite`, { rows, role }, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
  const remove = useMutation({
    mutationFn: (mid: number) => del(`/admin/institution-members/${mid}`, true),
    onSuccess: () => { toast('Üye çıkarıldı', 'success'); qc.invalidateQueries({ queryKey: key }) },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })
  return (
    <div>
      <Link to="/admin/r/institutions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Kurumlar</Link>
      {!data ? <Spinner /> : <Report admin data={data} onInvite={(rows, role) => invite.mutateAsync({ rows, role })} inviting={invite.isPending} onRemove={(mid) => remove.mutate(mid)} />}
    </div>
  )
}
