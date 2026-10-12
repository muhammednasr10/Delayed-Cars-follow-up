import { useEffect, useMemo, useState } from 'react'
import { WorkforceAttendanceSection } from '../../Components/WorkforceAttendanceSection'
import { usePageCrud } from '../../hooks/usePageCrud'
import { useEmployees } from '../../hooks/useEmployees'
import { useLang } from '../../i18n/LanguageContext'
import { getFactoryOrgUnits } from '../../services/factoryOrgService'
import type { FactoryOrgUnit } from '../../Types/factoryOrg'
import type { ProductionArea } from '../../Types/navigation'
import { workforceIdsForArea } from '../../Utils/productionAreaCounts'

export function BodyAttendancePage({ area = 'body' }: { area?: Extract<ProductionArea, 'body' | 'paint'> }) {
  const { t } = useLang()
  const attendanceCrud = usePageCrud('production_training__attendance', 'employees')
  const { employees: allEmployees } = useEmployees()
  const [orgUnits, setOrgUnits] = useState<FactoryOrgUnit[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getFactoryOrgUnits({ includeInactive: true })
      .then(setOrgUnits)
      .catch(() => setOrgUnits([]))
      .finally(() => setLoaded(true))
  }, [])

  const employees = useMemo(() => {
    const ids = workforceIdsForArea(allEmployees, orgUnits, area)
    if (!ids) return []
    const allowed = new Set(ids)
    return allEmployees.filter(employee => allowed.has(employee.id))
  }, [allEmployees, orgUnits, area])

  const areaMissing = loaded && orgUnits.length > 0 && workforceIdsForArea(allEmployees, orgUnits, area) == null

  return (
    <section className="space-y-4">
      {areaMissing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {t(`hub.${area}.orgMissing`)}
        </div>
      )}
      <WorkforceAttendanceSection employees={employees} canManage={attendanceCrud.canManage} />
    </section>
  )
}
