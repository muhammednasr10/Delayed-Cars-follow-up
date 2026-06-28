import { useLang } from '../../i18n/LanguageContext'
import { BOM_PARTS_DISPLAY_COLUMNS } from '../../Utils/bomPartsColumns'
import { normalizeSupplySource, partKindLabel } from '../../Utils/bomDisplayFormat'
import { resolvePartNameEn } from '../../Utils/partNameEn'
import type { ParsedBomRow } from '../../Types/bom'

function previewCell(
  row: ParsedBomRow,
  col: (typeof BOM_PARTS_DISPLAY_COLUMNS)[number],
  t: (k: string) => string
): string {
  switch (col) {
    case 'part_number':
      return row.partNumber
    case 'part_name_ar':
      return row.partNameAr
    case 'part_name_en':
      return resolvePartNameEn({
        part_name_ar: row.partNameAr,
        part_name_en: row.partNameEn,
        raw_data: row.raw
      })
    case 'vehicle_model':
      return row.applicableModels.join(', ') || row.qtyByModel[0]?.model || ''
    case 'station_code':
      return row.stationCode
    case 'qty_by_model':
      return row.qtyByModelRaw || row.qtyByModel.map(q => `${q.model}=${q.qty}`).join('; ')
    case 'part_kind':
      return partKindLabel(row.partKind, t)
    case 'supply_source':
      return normalizeSupplySource(row.supplySource) || '—'
    case 'operation':
      return ''
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
            {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
              <th key={c} className="p-2 text-start whitespace-nowrap">
                {c === 'vehicle_model' ? t('bom.col.vehicle_model') : t(`bom.col.${c}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slice.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              {BOM_PARTS_DISPLAY_COLUMNS.map(c => (
                <td
                  key={c}
                  className={`max-w-[160px] truncate p-2 text-slate-300 ${
                    c === 'vehicle_model' ? 'font-bold text-violet-200' : ''
                  }`}
                  dir={c === 'part_number' || c === 'station_code' || c === 'part_name_en' ? 'ltr' : undefined}
                >
                  {previewCell(r, c, t) || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
