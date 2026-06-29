import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, ClipboardList, PackageX } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { PageTabShell } from '../../Components/layout/PageTabShell'
import { SetupRequired } from '../../Components/SetupRequired'
import { DamagedPartsRecordTab } from '../../Components/damagedParts/DamagedPartsRecordTab'
import { DamagedPartsSummaryTab } from '../../Components/damagedParts/DamagedPartsSummaryTab'
import { DamagedPartsFiltersBar } from '../../Components/damagedParts/DamagedPartsFiltersBar'
import { useFormatError } from '../../hooks/useFormatError'
import { useDamagedPartsLookups } from '../../hooks/useDamagedPartsLookups'
import { getDamagedParts } from '../../services/damagedPartsService'
import { getEmployees } from '../../services/employeesService'
import { getVehicleModels } from '../../services/settingsService'
import { applyDamagedPartFilters, hasActiveDamagedPartFilters } from '../../Utils/damagedPartFilters'
import { DEFAULT_DAMAGED_PART_FILTERS, type DamagedPartFilters, type DamagedPartRecord } from '../../Types/damagedPart'
import type { Employee } from '../../Types/employee'
import type { VehicleModel } from '../../Types/settings'

type Tab = 'record' | 'summary'

function isSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') || m.includes('could not find the table') || m.includes('does not exist')
}

export function DamagedPartsPage() {
  const { t } = useLang()
  const { reasons, decisions } = useDamagedPartsLookups()
  const formatError = useFormatError()
  const [activeTab, setActiveTab] = useState<Tab>('record')
  const [items, setItems] = useState<DamagedPartRecord[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filters, setFilters] = useState<DamagedPartFilters>(DEFAULT_DAMAGED_PART_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getDamagedParts())
      setSetupRequired(false)
    } catch (e) {
      const msg = formatError(e)
      setSetupRequired(isSchemaMissing(msg))
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [formatError])

  useEffect(() => {
    void load()
    getVehicleModels().then(setModels).catch(() => setModels([]))
    getEmployees().then(setEmployees).catch(() => setEmployees([]))
  }, [load])

  const filtered = useMemo(() => applyDamagedPartFilters(items, filters), [items, filters])
  const hasActiveFilter = hasActiveDamagedPartFilters(filters)

  function showSuccess(msg: string) {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(''), 2500)
  }

  if (setupRequired) return <SetupRequired detail={error} />

  return (
    <PageTabShell
      title={t('damagedParts.title')}
      subtitle={t('damagedParts.subtitle')}
      icon={<PackageX className="h-6 w-6" />}
      tabs={[
        { key: 'record' as Tab, label: t('damagedParts.tabs.record'), icon: <ClipboardList className="h-4 w-4" /> },
        { key: 'summary' as Tab, label: t('damagedParts.tabs.summary'), icon: <BarChart3 className="h-4 w-4" /> }
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      activeClassName="bg-orange-500 text-slate-950"
      message={
        <>
          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
          )}
        </>
      }
    >
      <DamagedPartsFiltersBar
        filters={filters}
        onChange={patch => setFilters(prev => ({ ...prev, ...patch }))}
        onReset={() => setFilters(DEFAULT_DAMAGED_PART_FILTERS)}
        items={items}
        reasons={reasons}
        decisions={decisions}
        employees={employees}
        filteredCount={filtered.length}
        totalCount={items.length}
      />

      {activeTab === 'record' ? (
        <DamagedPartsRecordTab
          items={filtered}
          loading={loading}
          models={models}
          employees={employees}
          onReload={load}
          onSuccess={showSuccess}
          onError={setError}
        />
      ) : (
        <DamagedPartsSummaryTab
          items={filtered}
          filters={filters}
          reasons={reasons}
          decisions={decisions}
          hasActiveFilter={hasActiveFilter}
        />
      )}
    </PageTabShell>
  )
}
