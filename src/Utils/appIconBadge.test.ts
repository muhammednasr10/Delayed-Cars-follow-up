import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  APP_BADGE_STORAGE_KEY,
  clearAppIconBadge,
  restoreAppIconBadge,
  syncAppIconBadge
} from './appIconBadge'

describe('appIconBadge', () => {
  const setAppBadge = vi.fn(async () => undefined)
  const clearAppBadge = vi.fn(async () => undefined)
  const postMessage = vi.fn()

  beforeEach(() => {
    setAppBadge.mockClear()
    clearAppBadge.mockClear()
    postMessage.mockClear()
    localStorage.clear()
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        setAppBadge,
        clearAppBadge,
        serviceWorker: {
          ready: Promise.resolve({
            setAppBadge,
            clearAppBadge,
            active: { postMessage }
          }),
          controller: { postMessage }
        }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets badge count capped at 99 and persists it', async () => {
    await syncAppIconBadge(120)
    expect(setAppBadge).toHaveBeenCalledWith(99)
    expect(localStorage.getItem(APP_BADGE_STORAGE_KEY)).toBe('99')
    expect(postMessage).toHaveBeenCalledWith({ type: 'SET_BADGE', count: 99 })
  })

  it('clears badge when count is zero', async () => {
    await syncAppIconBadge(5)
    clearAppBadge.mockClear()
    setAppBadge.mockClear()
    await syncAppIconBadge(0)
    expect(clearAppBadge).toHaveBeenCalled()
    expect(setAppBadge).not.toHaveBeenCalled()
    expect(localStorage.getItem(APP_BADGE_STORAGE_KEY)).toBe('0')
  })

  it('restores persisted badge on startup', async () => {
    localStorage.setItem(APP_BADGE_STORAGE_KEY, '4')
    await restoreAppIconBadge()
    expect(setAppBadge).toHaveBeenCalledWith(4)
  })

  it('clearAppIconBadge clears badge', async () => {
    await clearAppIconBadge()
    expect(clearAppBadge).toHaveBeenCalled()
    expect(localStorage.getItem(APP_BADGE_STORAGE_KEY)).toBe('0')
  })
})
