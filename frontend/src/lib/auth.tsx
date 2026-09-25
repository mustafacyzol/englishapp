import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { get, hasToken, loadTokens, post, setToken } from './api'
import { setTheme } from './theme'
import type { Me } from './types'

interface AuthState {
  user: Me | null
  ready: boolean
  setUser: (u: Me | null) => void
  refresh: () => Promise<Me | null>
  signIn: (token: string, user: Me) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)
  const qc = useQueryClient()

  const refresh = useCallback(async () => {
    if (!hasToken()) {
      setUser(null)
      return null
    }
    try {
      const { user } = await get<{ user: Me }>('/auth/me')
      setUser(user)
      return user
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        await setToken(null)
        setUser(null)
      }
      return null
    }
  }, [])

  useEffect(() => {
    loadTokens().then(refresh).finally(() => setReady(true))
  }, [refresh])

  const signIn = useCallback(async (token: string, u: Me) => {
    await setToken(token)
    setUser(u)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await post('/auth/logout')
    } catch {
      /* token may already be gone */
    }
    await setToken(null)
    setUser(null)
    qc.clear()
  }, [qc])

  // Adopt the account's saved theme once it loads (the local ThemeToggle owns it after).
  useEffect(() => {
    const t = user?.preferences?.theme
    if (t) setTheme(t)
  }, [user?.preferences?.theme])

  const value = useMemo(() => ({ user, ready, setUser, refresh, signIn, signOut }), [user, ready, refresh, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
