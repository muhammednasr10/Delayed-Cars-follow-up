import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { fetchMyEmployeeProfile, type MyEmployeeProfile } from '../../services/workerProfileService'

export function WorkerProfileDataTab() {
  const { t } = useLang()
  const [profile, setProfile] = useState<MyEmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    setErr('')
    void fetchMyEmployeeProfile()
      .then(setProfile)
      .catch(e => setErr(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) {
    return <div className="card-industrial p-8 text-center text-slate-400">{t('common.loading')}</div>
  }

  if (err) {
    return <div className="card-industrial p-6 text-sm text-red-300">{err}</div>
  }

  if (!profile) {
    return <div className="card-industrial p-6 text-center text-sm text-amber-200">{t('workerProfile.noEmployeeLink')}</div>
  }

  const infoRows = [
    { label: t('org.f.code'), value: profile.employeeCode },
    { label: t('org.f.name'), value: profile.fullName },
    { label: t('org.f.role'), value: profile.jobRole },
    { label: t('employees.f.line'), value: profile.lineName },
    { label: t('operations.workplace'), value: profile.workAreaName },
    {
      label: t('settings.cols.stationName'),
      value: [profile.stationNumber, profile.stationName].filter(Boolean).join(' — ') || null
    }
  ]

  return (
    <section className="card-industrial space-y-4 p-5">
      <div className="flex items-center gap-2 text-cyan-300">
        <User className="h-5 w-5" />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('workerProfile.tabs.data')}</h3>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {infoRows.map(row =>
          row.value ? (
            <div key={row.label} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <dt className="text-[10px] font-bold uppercase text-slate-500">{row.label}</dt>
              <dd className="mt-1 font-bold text-slate-100">{row.value}</dd>
            </div>
          ) : null
        )}
      </dl>
    </section>
  )
}
