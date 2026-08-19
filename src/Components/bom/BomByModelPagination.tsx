import type { BomByModelDataReturn } from '../../hooks/useBomByModelData'

export function BomByModelPagination({ data }: { data: BomByModelDataReturn }) {
  const { t, compareMode, total, groupTotal, page, setPage, PAGE_SIZE } = data

  if (compareMode) return null

  return (
    <div className="flex items-center justify-between text-sm text-slate-400">
      <span>{t('bom.mergedRowCount', { rows: total, groups: groupTotal })}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded-lg bg-slate-800 px-3 py-1 font-bold disabled:opacity-40"
          onClick={() => setPage(p => p - 1)}
        >
          {t('common.back')}
        </button>
        <span className="px-2 py-1">{page}</span>
        <button
          type="button"
          disabled={page * PAGE_SIZE >= groupTotal}
          className="rounded-lg bg-slate-800 px-3 py-1 font-bold disabled:opacity-40"
          onClick={() => setPage(p => p + 1)}
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  )
}
