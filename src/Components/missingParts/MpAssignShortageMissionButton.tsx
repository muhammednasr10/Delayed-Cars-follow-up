import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { BadgeCheck, ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { useFormatError } from '../../hooks/useFormatError'
import { MissionFormModal } from '../missions/MissionFormModal'
import { MissionStatusBadge } from '../missions/MissionTableBits'
import { QualityNoteFormModal } from '../quality/QualityNoteFormModal'
import { Modal } from '../Modal'
import { uniqueIssueReps } from '../../Utils/missingPartPageUtils'
import { qualityNoteDraftFromShortage } from '../../Utils/qualityNoteFromShortage'
import { createQualityNote } from '../../services/qualityNotesService'
import { getQnCategoryOptions } from '../../services/qualityNotesLookupService'
import { getStations, getVehicleModels } from '../../services/settingsService'
import type { Employee } from '../../Types/employee'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { ShortageMissionLink } from '../../Types/mission'
import type { ShortageMissionAssignInput } from '../../Types/mpVehicleActions'
import type { MpLookupOption } from '../../Types/mpLookup'
import type { Station, VehicleModel } from '../../Types/settings'
import type { QualityNoteFormState } from '../quality/qualityNoteFormState'
import type { QualityNoteInput } from '../../Types/qualityNote'

export type { ShortageMissionAssignInput }

type Props = {
  parts: MissingPartDetail[]
  employees: Employee[]
  onAssign: (input: ShortageMissionAssignInput) => void | Promise<void>
  linkedMissions?: ShortageMissionLink[]
  canAssign?: boolean
  canAddToQuality?: boolean
  onOpenLinked?: () => void
  onQualitySaved?: () => void
  busy?: boolean
  className?: string
  iconClassName?: string
  defaultTitle?: string
}

export function MpAssignShortageMissionButton({
  parts,
  employees,
  onAssign,
  linkedMissions = [],
  canAssign = true,
  canAddToQuality = false,
  onOpenLinked,
  onQualitySaved,
  busy,
  className,
  iconClassName,
  defaultTitle: titleOverride
}: Props) {
  const { t } = useLang()
  const formatError = useFormatError()
  const [chooserOpen, setChooserOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [linkedOpen, setLinkedOpen] = useState(false)
  const [qualityOpen, setQualityOpen] = useState(false)
  const [qualitySaving, setQualitySaving] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [categories, setCategories] = useState<MpLookupOption[]>([])
  const [qualityDraft, setQualityDraft] = useState<QualityNoteFormState | null>(null)
  const [qualityStationQuery, setQualityStationQuery] = useState('')
  const linkedCount = linkedMissions.length
  const showQuality = canAddToQuality && parts.length > 0
  const defaultTitle = useMemo(() => {
    const override = titleOverride?.trim()
    if (override) return override
    return uniqueIssueReps(parts)
      .map(p => p.partDescription.trim())
      .filter(Boolean)
      .join(' · ')
  }, [parts, titleOverride])

  useEffect(() => {
    if (!qualityOpen) return
    let cancelled = false
    Promise.all([getStations(), getVehicleModels(), getQnCategoryOptions()])
      .then(([nextStations, nextModels, nextCategories]) => {
        if (cancelled) return
        setStations(nextStations)
        setModels(nextModels)
        setCategories(nextCategories)
        const draft = qualityNoteDraftFromShortage(parts, nextModels, nextStations, nextCategories[0]?.code ?? '')
        setQualityDraft(draft.form)
        setQualityStationQuery(draft.stationQuery)
      })
      .catch(() => {
        if (cancelled) return
        setStations([])
        setModels([])
        setCategories([])
        const draft = qualityNoteDraftFromShortage(parts, [], [], '')
        setQualityDraft(draft.form)
        setQualityStationQuery(draft.stationQuery)
      })
    return () => {
      cancelled = true
    }
  }, [qualityOpen, parts])

  async function save(input: ShortageMissionAssignInput) {
    await onAssign(input)
    setFormOpen(false)
  }

  async function saveQuality(input: QualityNoteInput) {
    setQualitySaving(true)
    try {
      await createQualityNote(input, new Map(models.map(model => [model.id, model.name])))
      closeQuality()
      onQualitySaved?.()
    } catch (err) {
      throw new Error(formatError(err))
    } finally {
      setQualitySaving(false)
    }
  }

  function closeQuality() {
    setQualityOpen(false)
    setQualityDraft(null)
    setQualityStationQuery('')
  }

  function openMission() {
    setChooserOpen(false)
    setLinkedOpen(false)
    setFormOpen(true)
  }

  function openQuality() {
    setChooserOpen(false)
    setLinkedOpen(false)
    setQualityOpen(true)
  }

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (linkedCount > 0) {
      setLinkedOpen(true)
      return
    }
    if (canAssign && showQuality) {
      setChooserOpen(true)
      return
    }
    if (showQuality && !canAssign) {
      setQualityOpen(true)
      return
    }
    if (canAssign) setFormOpen(true)
  }

  const countLabel = linkedCount > 99 ? '99+' : linkedCount
  const title =
    linkedCount > 0
      ? t('mp.assignMission.linkedCount', { n: linkedCount })
      : showQuality
        ? t('mp.assignMission.chooseTitle')
        : t('mp.assignMission.open')

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={className ?? 'relative rounded-md p-1.5 text-amber-300 hover:bg-amber-500/20'}
      >
        <ListTodo className={iconClassName ?? 'h-[18px] w-[18px]'} />
        {linkedCount > 0 && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-[3px] text-[9px] font-black leading-none tabular-nums text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.85)]">
            {countLabel}
          </span>
        )}
      </button>
      <Modal
        open={chooserOpen}
        title={t('mp.assignMission.chooseTitle')}
        icon={<ListTodo className="h-5 w-5" />}
        onClose={() => setChooserOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-[220]"
      >
        <div className="grid gap-2">
          <button
            type="button"
            onClick={openMission}
            className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-start hover:bg-amber-500/20"
          >
            <ListTodo className="h-5 w-5 shrink-0 text-amber-200" />
            <span>
              <span className="block text-sm font-black text-amber-100">{t('mp.assignMission.open')}</span>
              <span className="mt-0.5 block text-xs text-slate-400">{t('mp.assignMission.chooseMissionHint')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={openQuality}
            className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-start hover:bg-emerald-500/20"
          >
            <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-200" />
            <span>
              <span className="block text-sm font-black text-emerald-100">{t('mp.assignMission.addToQuality')}</span>
              <span className="mt-0.5 block text-xs text-slate-400">{t('mp.assignMission.addToQualityHint')}</span>
            </span>
          </button>
        </div>
      </Modal>
      <Modal
        open={linkedOpen}
        title={t('mp.assignMission.linkedTitle')}
        icon={<ListTodo className="h-5 w-5" />}
        onClose={() => setLinkedOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-[220]"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setLinkedOpen(false)}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
            >
              {t('common.close')}
            </button>
            {onOpenLinked && (
              <button
                type="button"
                onClick={() => {
                  setLinkedOpen(false)
                  onOpenLinked()
                }}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20"
              >
                {t('mp.assignMission.openInMissions')}
              </button>
            )}
            {showQuality && (
              <button
                type="button"
                onClick={openQuality}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20"
              >
                {t('mp.assignMission.addToQuality')}
              </button>
            )}
            {canAssign && (
              <button
                type="button"
                onClick={openMission}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400"
              >
                {t('mp.assignMission.assignAnother')}
              </button>
            )}
          </div>
        }
      >
        <ul className="space-y-2">
          {linkedMissions.map(item => (
            <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
              <p className="text-sm font-bold text-white">{item.title}</p>
              <div className="mt-1">
                <MissionStatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      </Modal>
      {canAssign && (
        <MissionFormModal
          open={formOpen}
          employees={employees}
          editing={null}
          defaultTitle={defaultTitle}
          saving={busy}
          zIndexClass="z-[220]"
          onClose={() => setFormOpen(false)}
          onSave={save}
        />
      )}
      {showQuality && (
        <QualityNoteFormModal
          open={qualityOpen && qualityDraft !== null}
          stations={stations}
          models={models}
          categories={categories}
          onCategoriesChange={setCategories}
          initial={qualityDraft}
          initialStationQuery={qualityStationQuery}
          saving={qualitySaving}
          zIndexClass="z-[220]"
          onClose={closeQuality}
          onSave={saveQuality}
        />
      )}
    </>
  )
}
