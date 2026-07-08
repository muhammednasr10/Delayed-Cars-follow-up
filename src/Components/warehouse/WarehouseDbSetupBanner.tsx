import { Database, Terminal } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'

export function isWarehouseSchemaMissing(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    m.includes('does not exist')
  ) && (m.includes('warehouse_feeding') || m.includes('v_model_part_inventory') || m.includes('warehouse_racks') || m.includes('warehouse_carts'))
}

export function WarehouseDbSetupBanner({ detail }: { detail?: string }) {
  const { t } = useLang()

  return (
    <div className="card-industrial p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">{t('warehouses.setup.title')}</h3>
          <p className="text-sm text-slate-400">{t('warehouses.setup.subtitle')}</p>
        </div>
      </div>

      <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-slate-300">
        <li>{t('warehouses.setup.step1')}</li>
        <li>{t('warehouses.setup.step2')}</li>
        <li>{t('warehouses.setup.step3')}</li>
      </ol>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
          <Terminal className="h-4 w-4" />
          {t('warehouses.setup.script')}
        </div>
        <code className="text-xs text-cyan-300" dir="ltr">
          supabase/scripts/apply_warehouse_feeding_migrations.sql
        </code>
        <p className="mt-2 text-xs text-slate-500">{t('warehouses.setup.orFiles')}</p>
        <ul className="mt-1 space-y-1 font-mono text-xs text-slate-400" dir="ltr">
          <li>0073_warehouse_inventory_feeding.sql</li>
          <li>0132_warehouse_equipment.sql</li>
        </ul>
      </div>

      <p className="mt-4 text-xs text-slate-500">{t('warehouses.setup.refreshHint')}</p>

      {detail && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300/80" dir="ltr">
          {detail}
        </div>
      )}
    </div>
  )
}
