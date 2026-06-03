import { useLang } from '../../i18n/LanguageContext'
import { BOM_PARTS_DISPLAY_COLUMNS } from '../../Utils/bomPartsColumns'
import type { ParsedBomRow } from '../../Types/bom'

function previewCell(row: ParsedBomRow, col: (typeof BOM_PARTS_DISPLAY_COLUMNS)[number]): string {
  switch (col) {
    case 'part_number':
      return row.partNumber
    case 'part_name_ar':
      return row.partNameAr
    case 'part_name_en':
      return row.partNameEn
    case 'bom_classification':
      return row.bomClassification
    case 'station_code':
      return row.stationCode
    case 'qty_by_model':
      return row.qtyByModelRaw || row.qtyByModel.map(q => `${q.model}=${q.qty}`).join('; ')
    case 'part_kind':
      return row.partKind
    case 'part_class':
      return row.stationCategory
    default:
      return ''
  }
}

export function BomExcelPreviewTable({ rows, maxRows = 40 }: { rows: ParsedBomRow[]; maxRows?: number }) {
  const { t } = useLang()
  const slice = rows.slice(0, maxRows)

  return (
    <div className="card-industrial max-h-80 overflow-auto text-xs">
      <table className="w-full min-w-[1000px]">
        <thead>
          <tr className="text-slate-500">
            <th className="p-2">{t('bom.model')}</th>
            {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
              <th key={c} className="p-2 text-start whitespace-nowrap">
                {t(`bom.col.${c}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              <td className="p-2 font-bold text-violet-200">{r.qtyByModel[0]?.model || '—'}</td>
              {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
                <td key={c} className="max-w-[160px] truncate p-2 text-slate-300" dir={c === 'part_number' || c === 'station_code' ? 'ltr' : undefined}>
                  {previewCell(r, c) || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
