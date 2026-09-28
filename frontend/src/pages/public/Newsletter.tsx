import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError, post } from '@/lib/api'
import { LinkButton } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Misc'
import { higoImg } from '@/components/game/Higo'

/** Landing for the links in newsletter e-mails: confirm a subscription or leave the list. */
export default function Newsletter({ action }: { action: 'confirm' | 'unsubscribe' }) {
  const { token = '' } = useParams()
  const m = useMutation({ mutationFn: () => post<{ message: string }>(`/newsletter/${action}/${token}`) })
  useEffect(() => { m.mutate() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const err = m.error as ApiError | null
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-5 py-20 text-center">
      {m.isPending || m.isIdle ? (
        <Spinner className="min-h-[30vh]" />
      ) : (
        <>
          <img src={higoImg(err ? 'think' : action === 'confirm' ? 'cheer' : 'wave')} alt="" className="size-36 object-contain" />
          <h1 className="mt-4 font-display text-3xl font-black">{err ? 'Bağlantı geçersiz' : action === 'confirm' ? 'Aramıza hoş geldin!' : 'Görüşmek üzere'}</h1>
          <p className="mt-2 text-ink-soft">{err ? 'Bu bağlantının süresi dolmuş ya da daha önce kullanılmış olabilir.' : m.data?.message}</p>
          <LinkButton to="/" className="mt-6">Ana sayfaya dön</LinkButton>
        </>
      )}
    </section>
  )
}
