import { GitCompare, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { inputCls } from '../FormField'
import { getPartById, savePartCompareTraits } from '../../services/partsService'
import {
  IPL_COMPARE_TRAIT_PRESETS,
  addCompareTrait,
  normalizeTraitsForSave,
  parseCompareTraits,
  removeCompareTrait,
  renameCompareTrait,
  setCompareTraitValue,
  traitCompareStatus,
  type IplCompareTrait,
  type IplCompareTraitPreset
} from '../../Utils/iplCompareTraits'

type Props = {
  open: boolean
  partId: string | null
  partLabel: string
  models: string[]
  canUpdate?: boolean
  onClose: () => void
}

const PRESET_LABEL: Record<IplCompareTraitPreset, string> = {
  size: 'bom.iplTraitPresetSize',
  shape: 'bom.iplTraitPresetShape',
  color: 'bom.iplTraitPresetColor'
}

function statusClass(status: ReturnType<typeof traitCompareStatus>): string {
  if (status === 'same') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
  if (status === 'different') return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
  return 'border-slate-700 bg-slate-900 text-slate-400'
}

export function IplModelTraitCompareModal({ open, partId, partLabel, models, canUpdate, onClose }: Props) {
  const { t } = useLang()
  const [traits, setTraits] = useState<IplCompareTrait[]>([])
  const [draftName, setDraftName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !partId) {
      setTraits([])
      setDraftName('')
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    void getPartById(partId)
      .then(part => {
        if (!cancelled) setTraits(parseCompareTraits(part?.compare_traits))
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('common.error'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, partId, t])

  function addNamed(name: string) {
    setTraits(current => addCompareTrait(current, name))
    setDraftName('')
  }

  async function save() {
    if (!partId) return
    setSaving(true)
    setError('')
    try {
      const next = normalizeTraitsForSave(traits)
      await savePartCompareTraits(partId, next)
      setTraits(next)
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.error')
      setError(/compare_traits/i.test(message) ? t('bom.iplTraitNeedsColumn') : message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('bom.iplTraitCompare')}
      subtitle={partLabel}
      icon={<GitCompare className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      zIndexClass="z-[120]"
      footer={
        canUpdate ? (
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={saving || loading || !partId}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50"
              onClick={() => void save()}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400">{t('bom.iplTraitCompareHint')}</p>
        {canUpdate && (
          <div className="flex flex-wrap items-center gap-2">
            {IPL_COMPARE_TRAIT_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-100 hover:bg-cyan-500/20"
                onClick={() => addNamed(t(PRESET_LABEL[preset]))}
              >
                {t(PRESET_LABEL[preset])}
              </button>
            ))}
            <input
              className={`${inputCls()} min-w-[10rem] flex-1 py-1.5 text-sm`}
              value={draftName}
              placeholder={t('bom.iplTraitAddPh')}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addNamed(draftName)
                }
              }}
            />
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-black text-slate-100 hover:bg-slate-700"
              onClick={() => addNamed(draftName)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('bom.iplTraitAdd')}
            </button>
          </div>
        )}
        {error && <p className="text-xs font-bold text-rose-300">{error}</p>}
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">{t('common.loading')}</p>
        ) : traits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-3 py-6 text-center text-sm text-slate-400">
            {t('bom.iplTraitEmpty')}
          </p>
        ) : (
          <div className="space-y-3">
            {traits.map(trait => {
              const status = traitCompareStatus(trait, models)
              const statusLabel =
                status === 'same'
                  ? t('bom.iplTraitSame')
                  : status === 'different'
                    ? t('bom.iplTraitDifferent')
                    : t('bom.iplTraitUnset')
              return (
                <div key={trait.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      className={`${inputCls()} py-1 text-sm font-black`}
                      value={trait.name}
                      disabled={!canUpdate}
                      onChange={e => setTraits(current => renameCompareTrait(current, trait.id, e.target.value))}
                    />
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black ${statusClass(status)}`}>
                      {statusLabel}
                    </span>
                    {canUpdate && (
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                        title={t('bom.iplTraitRemove')}
                        onClick={() => setTraits(current => removeCompareTrait(current, trait.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {models.map(model => (
                      <label key={model} className="block">
                        <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">{model}</span>
                        <input
                          className={`${inputCls()} py-1 text-sm`}
                          value={trait.values[model] ?? ''}
                          disabled={!canUpdate}
                          onChange={e =>
                            setTraits(current => setCompareTraitValue(current, trait.id, model, e.target.value))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
