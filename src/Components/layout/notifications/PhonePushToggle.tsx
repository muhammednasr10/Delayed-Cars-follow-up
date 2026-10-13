import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { useLang } from '../../../i18n/LanguageContext'
import {
  disablePhonePush,
  enablePhonePush,
  readPhonePushState,
  type PhonePushState
} from '../../../services/phonePushService'

export function PhonePushToggle() {
  const { t } = useLang()
  const [state, setState] = useState<PhonePushState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    void readPhonePushState().then(next => {
      if (alive) setState(next)
    })
    return () => {
      alive = false
    }
  }, [])

  async function onClick() {
    setError('')
    setBusy(true)
    try {
      if (state === 'subscribed') {
        await disablePhonePush()
        setState(await readPhonePushState())
        return
      }
      setState(await enablePhonePush())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notifications.pushFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null

  const subscribed = state === 'subscribed'
  const note =
    state === 'install'
      ? t('notifications.pushInstall')
      : state === 'unconfigured'
        ? t('notifications.pushUnconfigured')
        : state === 'denied'
          ? t('notifications.pushDenied')
          : ''
  const label = subscribed ? t('notifications.pushDisable') : t('notifications.pushEnable')

  if (note) {
    return <p className="px-3 pb-2 text-center text-[11px] font-bold leading-relaxed text-amber-200">{note}</p>
  }

  return (
    <div className="px-2 pb-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-black ${
          subscribed
            ? 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
        } disabled:cursor-not-allowed disabled:opacity-80`}
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span>{busy ? t('common.loading') : label}</span>
      </button>
      {error && <p className="mt-1 text-center text-[11px] text-rose-300">{error}</p>}
    </div>
  )
}
