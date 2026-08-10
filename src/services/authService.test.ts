import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppAuthSession } from './authService'
import {
  applySession,
  clearSession,
  ensureFreshSession,
  formatAuthApiError,
  isAccessTokenExpired,
  isJwtExpiredMessage,
  isRefreshTokenExpired,
  readRawSession,
  refreshSessionOnWake,
  registerAuthFailureHandler,
  restoreSessionFromStorage,
  saveSession,
  sessionExpiryUnix,
  withTimeout
} from './authService'

const SESSION_KEY = 'afa_app_session'

function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.test-signature`
}

function makeSession(overrides: {
  accessExp: number
  refreshExp?: number
  refreshType?: string
  userId?: string
}): AppAuthSession {
  const userId = overrides.userId ?? 'user-1'
  const access_token = fakeJwt({ exp: overrides.accessExp, sub: userId })
  const refresh_token = fakeJwt({
    exp: overrides.refreshExp ?? overrides.accessExp + 86400 * 30,
    sub: userId,
    type: overrides.refreshType ?? 'refresh'
  })
  return {
    access_token,
    refresh_token,
    expires_at: overrides.accessExp,
    user: { id: userId, email: 'test@example.com' }
  }
}

describe('authService session helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    registerAuthFailureHandler(null)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  })

  afterEach(() => {
    localStorage.clear()
    registerAuthFailureHandler(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('detects access and refresh token expiry from JWT claims', () => {
    const now = Math.floor(Date.now() / 1000)
    const fresh = makeSession({ accessExp: now + 3600, refreshExp: now + 86400 })
    const staleAccess = makeSession({ accessExp: now - 120, refreshExp: now + 86400 })
    const staleRefresh = makeSession({ accessExp: now - 120, refreshExp: now - 120 })

    expect(isAccessTokenExpired(fresh)).toBe(false)
    expect(isRefreshTokenExpired(fresh)).toBe(false)
    expect(isAccessTokenExpired(staleAccess)).toBe(true)
    expect(isRefreshTokenExpired(staleAccess)).toBe(false)
    expect(isRefreshTokenExpired(staleRefresh)).toBe(true)
    expect(sessionExpiryUnix(fresh)).toBe(now + 3600)
  })

  it('reads, saves, and clears session from localStorage', () => {
    const session = makeSession({ accessExp: Math.floor(Date.now() / 1000) + 3600 })
    saveSession(session)
    expect(readRawSession()?.user.id).toBe('user-1')
    applySession(session)
    clearSession()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
    expect(readRawSession()).toBeNull()
  })

  it('maps jwt expiry messages to Arabic session text', () => {
    expect(isJwtExpiredMessage('JWT expired')).toBe(true)
    expect(isJwtExpiredMessage('network error')).toBe(false)
    expect(formatAuthApiError('JWT expired')).toBe('انتهت الجلسة. سجّل الدخول مرة أخرى.')
    expect(formatAuthApiError('other')).toBe('other')
  })

  it('returns a fresh session without refresh when access token is valid', async () => {
    const session = makeSession({ accessExp: Math.floor(Date.now() / 1000) + 3600 })
    saveSession(session)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const next = await ensureFreshSession()
    expect(next?.user.id).toBe('user-1')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps stored session on transient refresh failure', async () => {
    vi.useFakeTimers()
    const now = Math.floor(Date.now() / 1000)
    const session = makeSession({ accessExp: now - 120, refreshExp: now + 86400 })
    saveSession(session)

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    const pending = ensureFreshSession()
    await vi.runAllTimersAsync()
    const next = await pending
    expect(next).toBeNull()
    expect(readRawSession()?.user.id).toBe('user-1')
    vi.useRealTimers()
  }, 15_000)

  it('clears session when refresh token is expired and kickOnFailure is set', async () => {
    const now = Math.floor(Date.now() / 1000)
    const session = makeSession({ accessExp: now - 120, refreshExp: now - 120 })
    saveSession(session)
    const kicked = vi.fn()
    registerAuthFailureHandler(kicked)

    const next = await ensureFreshSession({ kickOnFailure: true })
    expect(next).toBeNull()
    expect(readRawSession()).toBeNull()
    expect(kicked).toHaveBeenCalledOnce()
  })

  it('refreshes via app-auth when access token is stale', async () => {
    const now = Math.floor(Date.now() / 1000)
    const session = makeSession({ accessExp: now - 120, refreshExp: now + 86400 })
    saveSession(session)

    const refreshed = makeSession({ accessExp: now + 3600, refreshExp: now + 86400, userId: 'user-1' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: refreshed.expires_at,
          user: refreshed.user
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const next = await ensureFreshSession()
    expect(next?.access_token).toBe(refreshed.access_token)
    expect(readRawSession()?.access_token).toBe(refreshed.access_token)
  })

  it('restoreSessionFromStorage keeps session when refresh is temporarily unavailable', async () => {
    vi.useFakeTimers()
    const now = Math.floor(Date.now() / 1000)
    const session = makeSession({ accessExp: now - 120, refreshExp: now + 86400 })
    saveSession(session)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    const pending = restoreSessionFromStorage()
    await vi.runAllTimersAsync()
    const restored = await pending
    expect(restored?.user.id).toBe('user-1')
    expect(readRawSession()?.user.id).toBe('user-1')
    vi.useRealTimers()
  }, 15_000)

  it('refreshSessionOnWake kicks only when refresh token is expired', async () => {
    const now = Math.floor(Date.now() / 1000)
    const kicked = vi.fn()
    registerAuthFailureHandler(kicked)

    saveSession(makeSession({ accessExp: now - 120, refreshExp: now - 120 }))
    await refreshSessionOnWake()
    expect(kicked).toHaveBeenCalledOnce()
    expect(readRawSession()).toBeNull()

    kicked.mockClear()
    saveSession(makeSession({ accessExp: now + 3600, refreshExp: now + 86400 }))
    const awake = await refreshSessionOnWake()
    expect(awake?.user.id).toBe('user-1')
    expect(kicked).not.toHaveBeenCalled()
  })

  it('withTimeout resolves fallback when promise is slow', async () => {
    const slow = new Promise<string>(resolve => {
      window.setTimeout(() => resolve('late'), 50)
    })
    await expect(withTimeout(slow, 10, 'fast')).resolves.toBe('fast')
  })
})
