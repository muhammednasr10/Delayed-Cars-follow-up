import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../../i18n/LanguageContext'
import { inputCls } from '../FormField'
import { searchPartsMaster, type PartMasterHit } from '../../services/partsService'
import { labelForPartKindValue, labelForSupplySourceValue } from '../../Utils/bomPresetOptions'
import { DEFAULT_PART_KIND, DEFAULT_SUPPLY_SOURCE } from '../../Utils/bomDefaults'
import { joinDistinctPartLabels } from '../../Utils/partDisplayNames'
import { displayBomStationCode } from '../../Utils/bomStationCode'

type Props = {
  value: string
  onChange: (value: string) => void
  onPick: (hit: PartMasterHit) => void
  disabled?: boolean
  excludePartId?: string | null
}

type DropdownRect = { top: number; left: number; width: number }

export function PartListAutocomplete({ value, onChange, onPick, disabled, excludePartId }: Props) {
  const { t } = useLang()
  const [hits, setHits] = useState<PartMasterHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rect, setRect] = useState<DropdownRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  const runSearch = useCallback(
    async (term: string) => {
      if (term.trim().length < 1) {
        setHits([])
        return
      }
      setLoading(true)
      try {
        const rows = await searchPartsMaster(term, 15)
        setHits(excludePartId ? rows.filter(h => h.id !== excludePartId) : rows)
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    },
    [excludePartId]
  )

  function updateRect() {
    const el = inputRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    setRect({ top: box.bottom + 4, left: box.left, width: box.width })
  }

  function handleChange(next: string) {
    onChange(next)
    setOpen(true)
    updateRect()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => void runSearch(next), 200)
  }

  function pick(hit: PartMasterHit) {
    onChange(hit.part_name_ar?.trim() || hit.common_name?.trim() || '')
    setHits([])
    setOpen(false)
    onPick(hit)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [])

  const showDropdown = open && (loading || hits.length > 0 || value.trim().length > 0)

  function displayLabel(hit: PartMasterHit): string {
    return joinDistinctPartLabels(hit.part_name_ar, hit.part_name_en, hit.common_name) || hit.part_number
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={inputCls()}
        value={value}
        disabled={disabled}
        placeholder={t('bom.partListAutocompletePh')}
        autoComplete="off"
        onFocus={() => {
          setOpen(true)
          updateRect()
          if (value.trim()) void runSearch(value)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={e => handleChange(e.target.value)}
      />
      {showDropdown &&
        rect &&
        createPortal(
          <ul
            className="max-h-56 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-2xl"
            style={{ position: 'fixed', top: rect.top, left: rect.left, width: Math.max(rect.width, 320), zIndex: 250 }}
          >
            {loading && <li className="px-3 py-2 text-xs text-slate-500">{t('common.loading')}</li>}
            {!loading && hits.length === 0 && value.trim() && (
              <li className="px-3 py-2 text-xs text-slate-500">{t('bom.partListAutocompleteEmpty')}</li>
            )}
            {hits.map(hit => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-start text-sm hover:bg-slate-800"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(hit)}
                >
                  <span className="font-bold text-white">{displayLabel(hit)}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {[
                      hit.common_station ? displayBomStationCode(hit.common_station) : null,
                      labelForPartKindValue(hit.part_type ?? DEFAULT_PART_KIND, t),
                      labelForSupplySourceValue(hit.common_supply_source ?? DEFAULT_SUPPLY_SOURCE, t)
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  )
}
