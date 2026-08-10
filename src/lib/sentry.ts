import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

export const isSentryEnabled = Boolean(dsn)

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback
}

export function initSentry(): void {
  if (!dsn) return

  const enabledInDev = import.meta.env.VITE_SENTRY_ENABLED === 'true'

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    enabled: import.meta.env.PROD || enabledInDev,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    tracePropagationTargets: ['localhost', /^https:\/\/.*\.supabase\.co/]
  })
}

export function setSentryUser(user: { id: string; email?: string | null; username?: string | null }): void {
  if (!isSentryEnabled) return
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    username: user.username ?? undefined
  })
}

export function clearSentryUser(): void {
  if (!isSentryEnabled) return
  Sentry.setUser(null)
}

export function captureAppException(error: unknown, context?: Record<string, unknown>): void {
  if (!isSentryEnabled) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
