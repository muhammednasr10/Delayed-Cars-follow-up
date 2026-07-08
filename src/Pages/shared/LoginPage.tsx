import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { AppLogo } from '../../Components/AppLogo'
import { DeveloperCredit } from '../../Components/DeveloperCredit'
import { UserSupportRequestModal } from '../../Components/permissions/UserSupportRequestModal'

export function LoginPage() {
  const { signIn, accessDeniedMessage } = useAuth()
  const { t, lang, toggle } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError(t('login.errRequired'))
      return
    }
    setSubmitting(true)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (!result.ok) setError(result.message || t('login.errFailed'))
  }

  return (
    <main className="grid min-h-screen min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)] px-3 py-6 text-slate-100 sm:px-4">
      <div className="w-full max-w-md card-industrial p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppLogo className="p-2" imgClassName="h-10 w-10" />
            <div>
              <h1 className="text-xl font-black text-white">{t('login.title')}</h1>
              <p className="text-sm text-slate-400">{t('login.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={toggle} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700">
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>

        {accessDeniedMessage && (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">{accessDeniedMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-300">{t('login.email')}</span>
            <input
              className="input-dark"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-300">{t('login.password')}</span>
            <input
              className="input-dark"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          )}

          <button
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>

          <p className="text-center text-sm text-slate-400">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="font-bold text-cyan-300 hover:text-cyan-200 hover:underline"
            >
              {t('login.needHelp')}
            </button>
          </p>
        </form>

        <UserSupportRequestModal
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          defaultEmail={email}
          defaultType="password_reset"
        />

        <div className="mt-6 border-t border-slate-800 pt-4">
          <DeveloperCredit variant="card" />
        </div>
      </div>
    </main>
  )
}
