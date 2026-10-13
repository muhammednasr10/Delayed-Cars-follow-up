import { describe, expect, it } from 'vitest'
import { isInboxRefreshMessage } from './useAppNotificationInbox'

describe('isInboxRefreshMessage', () => {
  it('accepts only the service worker inbox refresh signal', () => {
    expect(isInboxRefreshMessage({ type: 'INBOX_REFRESH' })).toBe(true)
    expect(isInboxRefreshMessage({ type: 'PUSH_OPEN' })).toBe(false)
    expect(isInboxRefreshMessage(null)).toBe(false)
  })
})
