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
const APP_AUTH_TIMEOUT_MS = 8_000
const GOTRUE_REFRESH_TIMEOUT_MS = 8_000

let authFailureHandler: (() => void) | null = null
let refreshInFlight: Promise<AppAuthSession | null> | null = null

export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => {
      window.setTimeout(() => resolve(fallback), ms)
    })
  ])
}

export function registerAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler
}

function decodeJwtPayload<T extends Record<string, unknown>>(token: string): T | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as T
  } catch {
    return null
  }
}

export function sessionExpiryUnix(session: AppAuthSession): number {
  const exp = decodeJwtPayload<{ exp?: number }>(session.access_token)?.exp
  return typeof exp === 'number' ? exp : session.expires_at
}

export function isAccessTokenExpired(session: AppAuthSession): boolean {
  return sessionExpiryUnix(session) * 1000 <= Date.now() + EXPIRY_BUFFER_MS
}

export function isJwtExpiredMessage(message: string): boolean {
  return /jwt expired|invalid jwt|token.*expired|expired jwt/i.test(message)
}

export function formatAuthApiError(message: string): string {
  if (isJwtExpiredMessage(message)) return 'انتهت الجلسة. سجّل الدخول مرة أخرى.'
  return message
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

export function saveSession(session: AppAuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  setSupabaseAccessToken(null)
  const signOut = getSupabase()?.auth.signOut()
  if (signOut) void withTimeout(signOut, 2_000, undefined)
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
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), APP_AUTH_TIMEOUT_MS)
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/app-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    let payload: LoginPayload | null = null
    try {
      payload = (await res.json()) as LoginPayload
    } catch {
      payload = null
    }
    if (!res.ok) return payload?.error ? payload : null
    return payload
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function tryGoTrueRefresh(session: AppAuthSession): Promise<AppAuthSession | null> {
  const sb = getSupabase()
  if (!sb) return null

  return withTimeout(
    (async () => {
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
    })(),
    GOTRUE_REFRESH_TIMEOUT_MS,
    null
  )
}

function isAppRefreshToken(token: string): boolean {
  return decodeJwtPayload<{ type?: string }>(token)?.type === 'refresh'
}

export async function refreshAppSession(session: AppAuthSession): Promise<AppAuthSession | null> {
  const refresh = async (): Promise<AppAuthSession | null> => {
    if (isAppRefreshToken(session.refresh_token)) {
      const edgePayload = await callAppAuth({ action: 'refresh', refresh_token: session.refresh_token })
      if (edgePayload?.error) return null
      const edgeSession = edgePayload ? sessionFromPayload(edgePayload) : null
      if (edgeSession) {
        applySession(edgeSession)
        return edgeSession
      }
    }
    return tryGoTrueRefresh(session)
  }

  return withTimeout(refresh(), APP_AUTH_TIMEOUT_MS, null)
}

export async function ensureFreshSession(): Promise<AppAuthSession | null> {
  const current = readRawSession()
  if (!current) return null
  if (!isAccessTokenExpired(current)) {
    applySession(current)
    return current
  }
  if (!refreshInFlight) {
    refreshInFlight = withTimeout(refreshAppSession(current), APP_AUTH_TIMEOUT_MS, null).finally(() => {
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
  return Boolean(await ensureFreshSession())
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
  if (!getSupabase()) return { ok: false, message: 'Supabase غير مهيأ.' }

  const edgePayload = await callAppAuth({ action: 'login', email: email.trim(), password })
  if (edgePayload?.error) {
    const edgeError = payloadErrorAr(edgePayload.error)
    if (isEdgeAuthUnavailable(edgePayload.error)) {
      return tryGoTrueLogin(email, password)
    }
    return { ok: false, message: edgeError }
  }

  const edgeSession = edgePayload ? sessionFromPayload(edgePayload) : null
  if (edgeSession) {
    applySession(edgeSession)
    return { ok: true, session: edgeSession }
  }

  return tryGoTrueLogin(email, password)
}

function isEdgeAuthUnavailable(error: string): boolean {
  const normalized = error.toLowerCase()
  return (
    normalized.includes('server configuration missing') ||
    normalized.includes('method not allowed') ||
    normalized.includes('unknown action')
  )
}

function payloadErrorAr(error: string): string {
  const map: Record<string, string> = {
    'Invalid email or password': 'البريد أو كلمة المرور غير صحيحة.',
    'Account is blocked or inactive': 'الحساب موقوف أو غير نشط.',
    'Linked employee is not active': 'الموظف المرتبط بالحساب غير نشط.',
    'Server configuration missing': 'إعداد خادم الدخول غير مكتمل — جرّب مرة أخرى أو تواصل مع المسؤول.'
  }
  return map[error] ?? error
}

export async function restoreSessionFromStorage(): Promise<AppAuthSession | null> {
  const raw = readRawSession()
  if (!raw) return null
  try {
    const next = await withTimeout(ensureFreshSession(), APP_AUTH_TIMEOUT_MS, null)
    if (!next && readRawSession()) clearSession()
    return next
  } catch {
    clearSession()
    return null
  }
}
