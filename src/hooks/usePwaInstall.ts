import { useCallback, useEffect, useState } from 'react'
import { type BeforeInstallPromptEvent, isIosDevice, isPwaStandalone } from '../Utils/pwaInstall'

let sharedDeferred: BeforeInstallPromptEvent | null = null
let listenerAttached = false
const subscribers = new Set<(prompt: BeforeInstallPromptEvent | null) => void>()

function notifySubscribers() {
  for (const cb of subscribers) cb(sharedDeferred)
}

function attachInstallListener() {
  if (listenerAttached || isPwaStandalone()) return
  listenerAttached = true
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    sharedDeferred = e as BeforeInstallPromptEvent
    notifySubscribers()
  })
}

function subscribe(callback: (prompt: BeforeInstallPromptEvent | null) => void) {
  attachInstallListener()
  subscribers.add(callback)
  callback(sharedDeferred)
  return () => {
    subscribers.delete(callback)
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(sharedDeferred)
  const [isStandalone, setIsStandalone] = useState(isPwaStandalone)
  const isIos = isIosDevice()

  useEffect(() => subscribe(setDeferredPrompt), [])

  useEffect(() => {
    setIsStandalone(isPwaStandalone())
  }, [])

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> => {
    if (isStandalone) return 'unavailable'
    if (isIos) return 'ios'
    if (!sharedDeferred) return 'unavailable'
    await sharedDeferred.prompt()
    const { outcome } = await sharedDeferred.userChoice
    if (outcome === 'accepted') {
      sharedDeferred = null
      notifySubscribers()
      setIsStandalone(isPwaStandalone())
    }
    return outcome
  }, [isIos, isStandalone])

  return {
    isStandalone,
    isIos,
    canNativeInstall: Boolean(deferredPrompt),
    showInstallEntry: !isStandalone,
    promptInstall
  }
}
