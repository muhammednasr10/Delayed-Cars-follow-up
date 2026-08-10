import { useState } from 'react'
import { Download, Share } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { Modal } from './Modal'

export function PwaInstallButton() {
  const { t } = useLang()
  const { showInstallEntry, canNativeInstall, isIos, promptInstall } = usePwaInstall()
  const [hintOpen, setHintOpen] = useState(false)

  if (!showInstallEntry) return null

  async function handleClick() {
    const result = await promptInstall()
    if (result === 'ios' || result === 'unavailable') setHintOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/15 px-2.5 py-2 text-sm font-black text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25 sm:px-3"
        title={t('pwa.installTitle')}
        aria-label={t('pwa.installTitle')}
      >
        <Download className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">{t('pwa.headerLabel')}</span>
      </button>

      <Modal
        open={hintOpen}
        title={t('pwa.installTitle')}
        subtitle={canNativeInstall ? t('pwa.installHint') : undefined}
        icon={isIos ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        onClose={() => setHintOpen(false)}
        maxWidthClass="max-w-md"
      >
        <p className="text-sm leading-relaxed text-slate-300">
          {isIos ? t('pwa.iosHint') : canNativeInstall ? t('pwa.installHint') : t('pwa.desktopHint')}
        </p>
        {canNativeInstall && (
          <button
            type="button"
            onClick={() => void promptInstall().then(() => setHintOpen(false))}
            className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400"
          >
            {t('pwa.installAction')}
          </button>
        )}
      </Modal>
    </>
  )
}
