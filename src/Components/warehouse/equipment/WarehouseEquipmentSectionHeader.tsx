import { Plus, RefreshCcw } from 'lucide-react'
import { inputCls } from '../../FormField'
import type { EquipmentSectionHeaderProps } from './equipmentUi'

export function WarehouseEquipmentSectionHeader({
  icon: Icon,
  toneClass,
  title,
  hint,
  canManage,
  onRefresh,
  onAdd,
  search,
  onSearch,
  refreshLabel,
  addLabel,
  searchPlaceholder
}: EquipmentSectionHeaderProps) {
  return (
    <div className="card-industrial p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-3 ${toneClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="text-sm text-slate-400">{hint}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <RefreshCcw className="inline h-4 w-4" /> {refreshLabel}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={onAdd}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
            >
              <Plus className="inline h-4 w-4" /> {addLabel}
            </button>
          )}
        </div>
      </div>
      <input
        className={`${inputCls()} mt-4 w-full max-w-md`}
        placeholder={searchPlaceholder}
        value={search}
        onChange={e => onSearch(e.target.value)}
      />
    </div>
  )
}
