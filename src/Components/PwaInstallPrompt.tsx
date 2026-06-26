import { useCallback, useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

const DISMISS_KEY = 'pwa-install-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function PwaInstallPrompt() {
  const { t } = useLang()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
    setDeferredPrompt(null)
    setShowIosHint(false)
  }, [])

  useEffect(() => {
    if (isStandalone()) return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    const weekMs = 7 * 24 * 60 * 60 * 1000
    if (dismissedAt && Date.now() - dismissedAt < weekMs) return

    if (isIos()) {
      setShowIosHint(true)
      setVisible(true)
      return
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setDeferredPrompt(null)
  }

  if (!visible || isStandalone()) return null

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:bottom-4"
      role="dialog"
      aria-label={t('pwa.installTitle')}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">
          {showIosHint ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-white">{t('pwa.installTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">
            {showIosHint ? t('pwa.iosHint') : t('pwa.installHint')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!showIosHint && deferredPrompt && (
              <button
                type="button"
                onClick={() => void install()}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
              >
                {t('pwa.installAction')}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700"
            >
              {t('pwa.later')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
