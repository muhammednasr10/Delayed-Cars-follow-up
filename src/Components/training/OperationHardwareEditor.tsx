import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import {
  lookupIplQuantityForPart,
  lookupPartByNumber,
  searchPartsWithDetails,
  type PartLookupHit
} from '../../services/operationPartsService'
import type { ModelLine } from '../../Utils/modelLines'
import {
  HARDWARE_KINDS,
  hardwareKindLabel,
  normalizeHardwareKind,
  suggestHardwareKind,
  type HardwareKind
} from '../../Utils/hardwareKinds'
import type { OperationHardwareInput } from '../../services/stationOperationsService'

export type HardwareDraft = {
  key: string
  partNumber: string
  partName: string | null
  hardwareKind: HardwareKind | ''
  qty: string
}

type Props = {
  value: HardwareDraft[]
  onChange: (rows: HardwareDraft[]) => void
  stationId: string | null
  modelLine: ModelLine | null
}

type DropdownRect = { top: number; left: number; width: number }

export function hardwareDraftsFromOperation(
  hardware: { hardwareName: string; hardwareQty: number | null; hardwareType: string | null; hardwareSize: string | null }[]
): HardwareDraft[] {
  if (hardware.length === 0) return []
  return hardware.map((h, i) => ({
    key: `hw-${i}-${h.hardwareName}`,
    partNumber: h.hardwareName,
    partName: h.hardwareSize,
    hardwareKind: normalizeHardwareKind(h.hardwareType),
    qty: h.hardwareQty != null ? String(h.hardwareQty) : '1'
  }))
}

export function hardwareDraftsToInput(rows: HardwareDraft[]): OperationHardwareInput[] {
  return rows
    .filter(r => r.partNumber.trim())
    .map(r => ({
      hardwareName: r.partNumber.trim(),
      hardwareQty: r.qty.trim() ? Number(r.qty) : null,
      hardwareType: r.hardwareKind || null,
      hardwareSize: r.partName
    }))
}

function newRow(): HardwareDraft {
  return { key: `hw-${Date.now()}-${Math.random()}`, partNumber: '', partName: null, hardwareKind: '', qty: '1' }
}

const thCls = 'px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500'

function PartSearchDropdown({
  hits,
  rect,
  onPick
}: {
  hits: PartLookupHit[]
  rect: DropdownRect
  onPick: (p: PartLookupHit) => void
}) {
  if (hits.length === 0) return null
  return createPortal(
    <ul
      className="max-h-52 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl"
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: Math.max(rect.width, 260),
        zIndex: 250
      }}
    >
      {hits.map(p => (
        <li key={p.id}>
          <button
            type="button"
            className="w-full px-3 py-2.5 text-start text-sm hover:bg-slate-800"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onPick(p)}
          >
            <span className="font-mono text-cyan-300" dir="ltr">
              {p.part_number}
            </span>
            {p.part_name_ar && <span className="ms-2 text-slate-400">{p.part_name_ar}</span>}
          </button>
        </li>
      ))}
    </ul>,
    document.body
  )
}

function HardwareRow({
  row,
  stationId,
  modelLine,
  onChange,
  onRemove
}: {
  row: HardwareDraft
  stationId: string | null
  modelLine: ModelLine | null
  onChange: (patch: Partial<HardwareDraft>) => void
  onRemove: () => void
}) {
  const { t, lang } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState(row.partNumber)
  const [hits, setHits] = useState<PartLookupHit[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null)
  const [lookupError, setLookupError] = useState('')

  const updateDropdownRect = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  useEffect(() => {
    setSearch(row.partNumber)
  }, [row.partNumber])

  useEffect(() => {
    if (!search.trim()) {
      setHits([])
      setMenuOpen(false)
      return
    }
    if (search.trim() === row.partNumber.trim() && row.partName) {
      setHits([])
      setMenuOpen(false)
      return
    }
    const timer = window.setTimeout(() => {
      searchPartsWithDetails(search, 10)
        .then(results => {
          setHits(results)
          setMenuOpen(results.length > 0)
        })
        .catch(() => {
          setHits([])
          setMenuOpen(false)
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, row.partNumber, row.partName])

  useEffect(() => {
    if (!menuOpen || hits.length === 0) return
    updateDropdownRect()
    const onScrollOrResize = () => updateDropdownRect()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [menuOpen, hits, updateDropdownRect])

  function closeMenu() {
    setHits([])
    setMenuOpen(false)
  }

  async function applyPart(p: PartLookupHit) {
    closeMenu()
    setLookupError('')
    setSearch(p.part_number)
    let qty = row.qty || '1'
    try {
      const iplQty = await lookupIplQuantityForPart({ partId: p.id, stationId, modelLine })
      if (iplQty != null) qty = String(iplQty)
    } catch {
      /* keep default */
    }
    const kind = suggestHardwareKind(p.part_name_ar) || row.hardwareKind
    onChange({
      partNumber: p.part_number,
      partName: p.part_name_ar,
      hardwareKind: kind,
      qty
    })
  }

  async function resolvePartNumber() {
    const trimmed = search.trim()
    if (!trimmed) return
    if (trimmed === row.partNumber.trim() && row.partName) return
    try {
      const hit = await lookupPartByNumber(trimmed)
      if (!hit) {
        setLookupError(t('operations.hardwareNotFound'))
        onChange({ partNumber: trimmed, partName: null, hardwareKind: '' })
        return
      }
      await applyPart(hit)
    } catch {
      setLookupError(t('common.error'))
    }
  }

  return (
    <tr className="border-t border-slate-800/80 align-top">
      <td className="overflow-visible px-2 py-2">
        <div className="min-w-[10rem]">
          <input
            ref={inputRef}
            className={`${inputCls()} text-sm`}
            placeholder={t('bom.partNumber')}
            value={search}
            onChange={e => {
              setLookupError('')
              setSearch(e.target.value)
            }}
            onFocus={() => {
              if (hits.length > 0) {
                updateDropdownRect()
                setMenuOpen(true)
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                closeMenu()
                void resolvePartNumber()
              }, 160)
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') closeMenu()
              if (e.key === 'Enter') {
                e.preventDefault()
                closeMenu()
                void resolvePartNumber()
              }
            }}
            dir="ltr"
          />
          {menuOpen && dropdownRect && (
            <PartSearchDropdown hits={hits} rect={dropdownRect} onPick={p => void applyPart(p)} />
          )}
          {row.partName && !lookupError && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-400">{row.partName}</p>
          )}
          {lookupError && <p className="mt-1 text-[11px] text-amber-300">{lookupError}</p>}
        </div>
      </td>
      <td className="px-2 py-2">
        <select
          className="input-dark w-full min-w-[6.5rem] text-sm"
          value={row.hardwareKind}
          onChange={e => onChange({ hardwareKind: e.target.value as HardwareKind | '' })}
        >
          <option value="">{t('operations.hardwareKindSelect')}</option>
          {HARDWARE_KINDS.map(k => (
            <option key={k} value={k}>
              {hardwareKindLabel(k, lang)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          step="any"
          className={`${inputCls()} w-20 text-sm`}
          value={row.qty}
          onChange={e => onChange({ qty: e.target.value })}
          dir="ltr"
        />
      </td>
      <td className="px-1 py-2 text-center">
        <button
          type="button"
          onClick={onRemove}
          title={t('common.delete')}
          className="rounded-lg p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

export function OperationHardwareEditor({ value, onChange, stationId, modelLine }: Props) {
  const { t } = useLang()

  function patchRow(key: string, patch: Partial<HardwareDraft>) {
    onChange(value.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  function removeRow(key: string) {
    onChange(value.filter(r => r.key !== key))
  }

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-300">{t('operations.cols.hardware')}</span>
        <button
          type="button"
          onClick={() => onChange([...value, newRow()])}
          className="flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('operations.addHardware')}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-visible rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full min-w-[32rem] text-start">
          <thead className="bg-slate-900/80">
            <tr>
              <th className={`${thCls} text-start`}>{t('bom.partNumber')}</th>
              <th className={`${thCls} text-start`}>{t('operations.hardwareKind')}</th>
              <th className={`${thCls} w-24 text-start`}>{t('bom.qty')}</th>
              <th className={`${thCls} w-12 text-center`} />
            </tr>
          </thead>
          <tbody className="overflow-visible">
            {value.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-500">
                  {t('operations.hardwareEmpty')}
                </td>
              </tr>
            ) : (
              value.map(row => (
                <HardwareRow
                  key={row.key}
                  row={row}
                  stationId={stationId}
                  modelLine={modelLine}
                  onChange={patch => patchRow(row.key, patch)}
                  onRemove={() => removeRow(row.key)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
