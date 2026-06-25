import { AlertTriangle, Boxes, Clock, Layers, Package, Wrench } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useBomDashboard } from '../../hooks/useBomDashboard'
import { useEngineeringDashboard } from '../../hooks/useEngineeringDashboard'
import { StatCard } from '../StatCard'

export function BomDashboardTab() {
  const { t } = useLang()
  const { stats, loading, error } = useBomDashboard()
  const eng = useEngineeringDashboard()

  if (loading) return <p className="text-slate-400">{t('common.loading')}</p>
  if (error) return <p className="text-red-300">{error}</p>
  if (!stats) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title={t('bom.dashTotalRows')} value={String(stats.totalBomRows)} icon={<Layers className="h-5 w-5" />} />
        <StatCard title={t('bom.dashUniqueParts')} value={String(stats.uniquePartNumbers)} icon={<Package className="h-5 w-5" />} />
        <StatCard title={t('bom.dashDuplicates')} value={String(stats.duplicatePartNumbers)} icon={<AlertTriangle className="h-5 w-5" />} tone="orange" />
        <StatCard title={t('bom.dashUncategorized')} value={String(stats.uncategorizedParts)} icon={<Boxes className="h-5 w-5" />} tone="orange" />
        <StatCard title={t('bom.dashStations')} value={String(stats.totalStations)} icon={<Layers className="h-5 w-5" />} />
        <StatCard title={t('bom.dashModels')} value={String(stats.totalModels)} icon={<Package className="h-5 w-5" />} />
        <StatCard title={t('bom.dashCategories')} value={String(stats.totalCategories)} icon={<Boxes className="h-5 w-5" />} />
        <StatCard
          title={t('bom.dashLastImport')}
          value={stats.lastImportAt ? new Date(stats.lastImportAt).toLocaleDateString() : '—'}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
      {eng.stats && !eng.loading && (
        <div className="card-industrial p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
            <Wrench className="h-4 w-4 text-cyan-300" />
            {t('engineering.dashTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title={t('engineering.dashOps')} value={String(eng.stats.operations_total)} icon={<Wrench className="h-5 w-5" />} />
            <StatCard title={t('engineering.dashOpsNoParts')} value={String(eng.stats.operations_without_parts)} icon={<AlertTriangle className="h-5 w-5" />} tone="orange" />
            <StatCard title={t('engineering.dashTsApproved')} value={String(eng.stats.time_studies_approved)} icon={<Clock className="h-5 w-5" />} />
            <StatCard title={t('engineering.dashOpsNoTime')} value={String(eng.stats.operations_without_standard_time)} icon={<Clock className="h-5 w-5" />} tone="orange" />
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-industrial p-4">
          <h3 className="mb-3 text-sm font-black text-white">{t('bom.byCategory')}</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {stats.byCategory.slice(0, 8).map(c => (
              <li key={c.label} className="flex justify-between">
                <span>{c.label}</span>
                <span className="font-black text-cyan-300">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-industrial p-4">
          <h3 className="mb-3 text-sm font-black text-white">{t('bom.topRepeated')}</h3>
          <ul className="space-y-1 text-sm" dir="ltr">
            {stats.topRepeated.map(r => (
              <li key={r.part_number} className="flex justify-between text-slate-300">
                <span className="text-cyan-300">{r.part_number}</span>
                <span>{r.occurrence_count}×</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
