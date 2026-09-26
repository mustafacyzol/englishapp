import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { ApiError, del, get, post } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { PageHeader, SkeletonPage } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { Report, type InstitutionReport, type InviteRow } from '@/components/institution/Report'

/** The institution panel (/kurum) for school, course and company managers. */
export default function Institution() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['institution'], queryFn: () => get<InstitutionReport>('/institution'), enabled: user?.institution_role === 'manager' })
  const invite = useMutation({
    mutationFn: (rows: InviteRow[]) => post<{ invited: number; skipped: string[] }>('/institution/invite', { rows }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institution'] }),
  })
  const remove = useMutation({
    mutationFn: (id: number) => del(`/institution/members/${id}`),
    onSuccess: () => { toast('Öğrenci çıkarıldı', 'success'); qc.invalidateQueries({ queryKey: ['institution'] }) },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })

  if (user?.institution_role !== 'manager') return <Navigate to="/learn" replace />
  if (isLoading || !data) return error ? <p className="text-ink-soft">{(error as ApiError).message}</p> : <SkeletonPage variant="cards" />
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader kicker="Kurum paneli" title="Öğrencilerin nasıl gidiyor?" />
      <Report data={data} onInvite={(rows) => invite.mutateAsync(rows)} inviting={invite.isPending} onRemove={(id) => remove.mutate(id)} />
    </div>
  )
}
