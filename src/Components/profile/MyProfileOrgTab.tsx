import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { fetchMyEmployeeSnapshot } from '../../services/myProfileService'

export function MyProfileOrgTab() {
  const { t } = useLang()
  const { profile } = useAuth()
  const employeeId = profile?.employee_id ?? null
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [snap, setSnap] = useState<Awaited<ReturnType<typeof fetchMyEmployeeSnapshot>>>(null)

  useEffect(() => {
    if (!employeeId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErr('')
    void fetchMyEmployeeSnapshot(employeeId)
      .then(setSnap)
      .catch(e => setErr(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [employeeId, t])

  if (!employeeId) {
    return <p className="text-sm text-slate-500">{t('myProfile.noEmployeeLink')}</p>
  }

  if (loading) return <p className="text-sm text-slate-400">{t('common.loading')}</p>
  if (err) return <p className="text-sm text-red-300">{err}</p>
  if (!snap) return <p className="text-sm text-slate-500">{t('myProfile.orgEmpty')}</p>

  const rows = [
    { label: t('employees.f.orgUnit'), value: snap.orgUnitLabel },
    { label: t('employees.f.role'), value: snap.jobRole },
    { label: t('employees.f.assignmentStatus'), value: snap.assignmentStatus },
    { label: t('employees.f.line'), value: snap.lineName },
    { label: t('employees.f.station'), value: snap.stationLabel },
    {
      label: t('employees.f.managers'),
      value: snap.managerNames.length ? snap.managerNames.join('، ') : null
    }
  ]

  return (
    <section className="card-industrial space-y-4 p-6">
      <div className="flex items-center gap-2 text-cyan-300">
        <Building2 className="h-5 w-5" />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('myProfile.orgSection')}</h3>
      </div>
      <dl className="space-y-3 text-sm">
        {rows.map(row =>
          row.value ? (
            <div key={row.label} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
              <dt className="font-bold text-slate-500">{row.label}</dt>
              <dd className="text-slate-200">{row.value}</dd>
            </div>
          ) : null
        )}
      </dl>
    </section>
  )
}
