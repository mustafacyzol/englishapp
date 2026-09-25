import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Logo } from '@/components/game/Logo'
import { Ada } from '@/components/game/Ada'
import { PHOTO } from '@/lib/assets'
import { Img } from '@/components/ui/Img'

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <Img src={PHOTO.auth} alt="" className="photo absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
        <Link to="/" className="absolute left-10 top-10 rounded-2xl bg-card/95 px-4 py-2"><Logo small /></Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="absolute inset-x-10 bottom-10 flex items-start gap-4 rounded-3xl bg-card/95 p-5 backdrop-blur">
          <Ada className="size-14" />
          <div>
            <p className="font-black">Ada · AI İngilizce öğretmenin</p>
            <p className="mt-1 text-ink-soft">Hatalarını Türkçe açıklarım, kaydettiğin kelimeleri sohbetlerimizde tekrar ederim. Hadi başlayalım!</p>
          </div>
        </motion.div>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="mb-8 lg:hidden"><Logo small /></Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto my-auto w-full max-w-md">
          <h1 className="text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-ink-soft">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center font-semibold text-ink-soft">{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}
