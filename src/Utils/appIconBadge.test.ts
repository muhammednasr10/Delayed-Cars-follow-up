import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { clearAppIconBadge, syncAppIconBadge } from './appIconBadge'

describe('appIconBadge', () => {
  const setAppBadge = vi.fn(async () => undefined)
  const clearAppBadge = vi.fn(async () => undefined)

  beforeEach(() => {
    setAppBadge.mockClear()
    clearAppBadge.mockClear()
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        setAppBadge,
        clearAppBadge,
        serviceWorker: {
          ready: Promise.resolve({ setAppBadge, clearAppBadge })
        }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets badge count capped at 99', async () => {
    await syncAppIconBadge(120)
    expect(setAppBadge).toHaveBeenCalledWith(99)
  })

  it('clears badge when count is zero', async () => {
    await syncAppIconBadge(0)
    expect(clearAppBadge).toHaveBeenCalled()
    expect(setAppBadge).not.toHaveBeenCalled()
  })

  it('clearAppIconBadge clears badge', async () => {
    await clearAppIconBadge()
    expect(clearAppBadge).toHaveBeenCalled()
  })
})
