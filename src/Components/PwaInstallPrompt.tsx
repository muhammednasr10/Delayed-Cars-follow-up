import { useCallback, useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { usePwaInstall } from '../hooks/usePwaInstall'

const DISMISS_KEY = 'pwa-install-dismissed'

export function PwaInstallPrompt() {
  const { t } = useLang()
  const { showInstallEntry, canNativeInstall, isIos, promptInstall } = usePwaInstall()
  const [visible, setVisible] = useState(false)

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }, [])

  useEffect(() => {
    if (!showInstallEntry) return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    const weekMs = 7 * 24 * 60 * 60 * 1000
    if (dismissedAt && Date.now() - dismissedAt < weekMs) return

    if (isIos || canNativeInstall) setVisible(true)
  }, [showInstallEntry, isIos, canNativeInstall])

  async function install() {
    const result = await promptInstall()
    if (result === 'accepted') dismiss()
  }

  if (!visible || !showInstallEntry) return null

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:bottom-4"
      role="dialog"
      aria-label={t('pwa.installTitle')}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">
          {isIos ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-white">{t('pwa.installTitle')}</p>
          <p className="mt-1 text-sm text-slate-400">{isIos ? t('pwa.iosHint') : t('pwa.installHint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!isIos && canNativeInstall && (
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
