import { storage } from './storage'

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '') + '/v1'
const TOKEN_KEY = 'dilgo.token'
const ADMIN_TOKEN_KEY = 'dilgo.admin_token'

let token: string | null = null
let adminToken: string | null = null

export class ApiError extends Error {
  status: number
  code?: string
  errors: Record<string, string[]>
  constructor(status: number, message: string, errors: Record<string, string[]> = {}, code?: string) {
    super(message)
    this.status = status
    this.errors = errors
    this.code = code
  }
  first(field?: string) {
    if (field && this.errors[field]) return this.errors[field][0]
    const k = Object.keys(this.errors)[0]
    return k ? this.errors[k][0] : this.message
  }
}

export async function loadTokens() {
  token = await storage.get(TOKEN_KEY)
  adminToken = await storage.get(ADMIN_TOKEN_KEY)
}

export async function setToken(t: string | null) {
  token = t
  if (t) await storage.set(TOKEN_KEY, t)
  else {
    await storage.remove(TOKEN_KEY)
    await setAdminToken(null)
  }
}

export async function setAdminToken(t: string | null) {
  adminToken = t
  if (t) await storage.set(ADMIN_TOKEN_KEY, t)
  else await storage.remove(ADMIN_TOKEN_KEY)
}

export const hasToken = () => !!token
export const hasAdminToken = () => !!adminToken

type Opts = { method?: string; body?: unknown; admin?: boolean; signal?: AbortSignal }

const listeners = new Set<(e: ApiError) => void>()
export const onApiError = (fn: (e: ApiError) => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Client': 'dilgo-app' }
  const bearer = opts.admin ? adminToken : token
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch {
    throw new ApiError(0, 'Bağlantı kurulamadı. İnternetini kontrol et.')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const fallback = res.status === 429 ? 'Biraz yavaşla! Birkaç saniye sonra tekrar dene.' : 'Bir şeyler ters gitti.'
    const msg = data?.message && data.message !== 'Too Many Attempts.' ? data.message : fallback
    const err = new ApiError(res.status, msg, data?.errors ?? {}, data?.code)
    listeners.forEach((l) => l(err))
    throw err
  }
  return data as T
}

export const get = <T>(path: string, admin = false) => api<T>(path, { admin })
export const post = <T>(path: string, body: unknown = {}, admin = false) => api<T>(path, { method: 'POST', body, admin })
export const put = <T>(path: string, body: unknown, admin = false) => api<T>(path, { method: 'PUT', body, admin })
export const patch = <T>(path: string, body: unknown, admin = false) => api<T>(path, { method: 'PATCH', body, admin })
export const del = <T>(path: string, admin = false) => api<T>(path, { method: 'DELETE', admin })
