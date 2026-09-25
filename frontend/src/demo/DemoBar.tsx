import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, GraduationCap, LayoutDashboard, LogOut, Play } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { get, setAdminToken } from '@/lib/api'
import type { Me } from '@/lib/types'

/** Floating shortcuts for reviewers of the preview build: jump in as the demo learner or admin. */
export function DemoBar() {
  const { user, signIn, signOut } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(() => window.innerWidth >= 1024)

  const enter = async (to: string, admin = false) => {
    if (!user) {
      const { user: u } = await get<{ user: Me }>('/auth/me')
      await signIn('demo-token', u)
    }
    if (admin) await setAdminToken('demo-admin-token')
    if (window.innerWidth < 1024) setOpen(false)
    nav(to)
  }

  return (
    <div className="fixed bottom-24 left-3 z-[60] lg:bottom-4">
      {open ? (
        <div className="flex items-center gap-1 rounded-2xl bg-ink p-1.5 text-paper shadow-xl">
          <span className="px-2 text-[11px] font-extrabold uppercase tracking-widest opacity-70">Demo</span>
          <button onClick={() => nav('/')} className="rounded-xl px-2.5 py-1.5 text-sm font-bold hover:bg-white/10" title="Tanıtım sayfası"><Play className="size-4" /></button>
          <button onClick={() => enter('/learn')} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold hover:bg-white/10"><GraduationCap className="size-4" /> Öğrenci</button>
          <button onClick={() => enter('/admin', true)} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold hover:bg-white/10"><LayoutDashboard className="size-4" /> Yönetim</button>
          {user && <button onClick={async () => { await signOut(); nav('/') }} className="rounded-xl px-2.5 py-1.5 hover:bg-white/10" title="Çıkış"><LogOut className="size-4" /></button>}
          <button onClick={() => setOpen(false)} className="rounded-xl px-1.5 py-1.5 opacity-60 hover:bg-white/10" aria-label="Gizle"><ChevronDown className="size-4" /></button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-2xl bg-ink px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-paper shadow-xl">Demo</button>
      )}
    </div>
  )
}
