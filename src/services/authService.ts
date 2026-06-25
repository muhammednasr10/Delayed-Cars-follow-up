import { getSupabase, setSupabaseAccessToken } from '../lib/supabase'

const SESSION_KEY = 'afa_app_session'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export type AppAuthSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: { id: string; email: string | null }
}

const EXPIRY_BUFFER_MS = 60_000

let authFailureHandler: (() => void) | null = null
let refreshInFlight: Promise<AppAuthSession | null> | null = null

export function registerAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler
}

function jwtExpUnix(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export function sessionExpiryUnix(session: AppAuthSession): number {
  return jwtExpUnix(session.access_token) ?? session.expires_at
}

export function isAccessTokenExpired(session: AppAuthSession): boolean {
  return sessionExpiryUnix(session) * 1000 <= Date.now() + EXPIRY_BUFFER_MS
}

export function isJwtExpiredMessage(message: string): boolean {
  return /jwt expired|invalid jwt|token.*expired|expired jwt/i.test(message)
}

export function readRawSession(): AppAuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AppAuthSession
    if (!session?.access_token || !session?.user?.id) return null
    return session
  } catch {
    return null
  }
}

export function loadStoredSession(): AppAuthSession | null {
  const session = readRawSession()
  if (!session) return null
  if (isAccessTokenExpired(session)) return null
  return session
}

export function saveSession(session: AppAuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  setSupabaseAccessToken(null)
  void getSupabase()?.auth.signOut()
}

export function applySession(session: AppAuthSession): void {
  setSupabaseAccessToken(session.access_token)
  saveSession(session)
}

type LoginPayload = {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  user?: { id: string; email: string | null }
  error?: string
}

function sessionFromPayload(payload: LoginPayload): AppAuthSession | null {
  if (!payload?.access_token || !payload?.user?.id || !payload?.expires_at) return null
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? payload.access_token,
    expires_at: payload.expires_at,
    user: payload.user
  }
}

async function callAppAuth(body: Record<string, unknown>): Promise<LoginPayload | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/app-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) return null
    return (await res.json()) as LoginPayload
  } catch {
    return null
  }
}

async function tryEdgeLogin(email: string, password: string): Promise<LoginPayload | null> {
  return callAppAuth({ action: 'login', email: email.trim(), password })
}

async function tryEdgeRefresh(refreshToken: string): Promise<LoginPayload | null> {
  return callAppAuth({ action: 'refresh', refresh_token: refreshToken })
}

async function tryGoTrueRefresh(session: AppAuthSession): Promise<AppAuthSession | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.auth.refreshSession({ refresh_token: session.refresh_token })
  if (error || !data.session?.access_token) return null
  const s = data.session
  const next: AppAuthSession = {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    user: { id: s.user.id, email: s.user.email ?? null }
  }
  applySession(next)
  return next
}

export async function refreshAppSession(session: AppAuthSession): Promise<AppAuthSession | null> {
  const edgePayload = await tryEdgeRefresh(session.refresh_token)
  if (edgePayload?.error) return null
  const edgeSession = edgePayload ? sessionFromPayload(edgePayload) : null
  if (edgeSession) {
    applySession(edgeSession)
    return edgeSession
  }
  return tryGoTrueRefresh(session)
}

export async function ensureFreshSession(): Promise<AppAuthSession | null> {
  const current = readRawSession()
  if (!current) return null
  if (!isAccessTokenExpired(current)) {
    applySession(current)
    return current
  }
  if (!refreshInFlight) {
    refreshInFlight = refreshAppSession(current).finally(() => {
      refreshInFlight = null
    })
  }
  const refreshed = await refreshInFlight
  if (refreshed) return refreshed
  clearSession()
  authFailureHandler?.()
  return null
}

export async function handleAuthApiError(message: string): Promise<boolean> {
  if (!isJwtExpiredMessage(message)) return false
  const refreshed = await ensureFreshSession()
  return Boolean(refreshed)
}

async function tryGoTrueLogin(
  email: string,
  password: string
): Promise<{ ok: true; session: AppAuthSession } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, message: 'Supabase غير مهيأ.' }

  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password
  })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { ok: false, message: 'البريد أو كلمة المرور غير صحيحة.' }
    }
    return { ok: false, message: error.message }
  }

  const s = data.session
  if (!s?.access_token || !s.user?.id) {
    return { ok: false, message: 'فشل تسجيل الدخول.' }
  }

  const session: AppAuthSession = {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    user: { id: s.user.id, email: s.user.email ?? null }
  }

  applySession(session)
  return { ok: true, session }
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ ok: true; session: AppAuthSession } | { ok: false; message: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, message: 'Supabase غير مهيأ.' }

  const edgePayload = await tryEdgeLogin(email, password)
  if (edgePayload?.error) return { ok: false, message: payloadErrorAr(edgePayload.error) }

  const edgeSession = edgePayload ? sessionFromPayload(edgePayload) : null
  if (edgeSession) {
    applySession(edgeSession)
    return { ok: true, session: edgeSession }
  }

  return tryGoTrueLogin(email, password)
}

function payloadErrorAr(error: string): string {
  const map: Record<string, string> = {
    'Invalid email or password': 'البريد أو كلمة المرور غير صحيحة.',
    'Account is blocked or inactive': 'الحساب موقوف أو غير نشط.',
    'Linked employee is not active': 'الموظف المرتبط بالحساب غير نشط.'
  }
  return map[error] ?? error
}

export async function restoreSessionFromStorage(): Promise<AppAuthSession | null> {
  const raw = readRawSession()
  if (!raw) return null
  if (!isAccessTokenExpired(raw)) {
    applySession(raw)
    return raw
  }
  const refreshed = await refreshAppSession(raw)
  if (refreshed) return refreshed
  clearSession()
  return null
}
