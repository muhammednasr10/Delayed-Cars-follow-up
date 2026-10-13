export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'gone'

export type DeliveryRow = {
  status: DeliveryStatus
  attempts: number
}

/**
 * Send a new device, retry a failed one under 3 attempts, or reclaim a claim
 * that stayed pending after a crash. A fresh pending row is skipped so two
 * workers do not deliver the same notification twice.
 */
export function deliveryDecision(existing: DeliveryRow | null, stalePending = false): 'skip' | 'send' {
  if (!existing) return 'send'
  if (existing.attempts >= 3 && existing.status !== 'sent' && existing.status !== 'gone') return 'skip'
  if (existing.status === 'failed' && existing.attempts < 3) return 'send'
  if (existing.status === 'pending' && stalePending && existing.attempts < 3) return 'send'
  return 'skip'
}

/** Ask the database webhook to retry only when a live device still failed. */
export function pushHttpStatus(failed: number): number {
  return failed > 0 ? 503 : 200
}

export function isExpiredPushSubscription(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410
}
