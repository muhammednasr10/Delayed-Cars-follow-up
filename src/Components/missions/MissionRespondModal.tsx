import { FilePlus, MessageSquareReply } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../../i18n/LanguageContext'
import { Field, inputCls } from '../FormField'
import { MissionReplyConfirm } from './MissionReplyConfirm'
import { Modal } from '../Modal'
import { MissionResponseFileTile } from './MissionResponseFileTile'
import { getVehicleModels } from '../../services/settingsService'
import type { TeamMission } from '../../Types/mission'
import type { VehicleModel } from '../../Types/settings'
import { encodeMissionReply } from '../../Utils/missionReply'
import { resizeChassis, validateMissionForm } from '../../Utils/missionForm'
import {
  appendMissionResponseFiles,
  MISSION_RESPONSE_ACCEPT,
  MISSION_RESPONSE_MAX_FILES,
  missionResponseResolvedMime
} from '../../Utils/missionResponseFiles'

type Props = {
  open: boolean
  mission: TeamMission | null
  saving?: boolean
  onClose: () => void
  onRespond: (
    response: string,
    files: File[],
    correction: {
      parentModelId: string | null
      variantModelId: string | null
      vehicleCount: number | null
      chassisNumbers: string[]
    }
  ) => void | Promise<void>
}

export function MissionRespondModal({ open, mission, saving, onClose, onRespond }: Props) {
  const { t } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [temporary, setTemporary] = useState('')
  const [corrective, setCorrective] = useState('')
  const [models, setModels] = useState<VehicleModel[]>([])
  const [parentModelId, setParentModelId] = useState<string | null>(null)
  const [variantModelId, setVariantModelId] = useState<string | null>(null)
  const [vehicleCount, setVehicleCount] = useState<number | null>(null)
  const [chassisNumbers, setChassisNumbers] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTemporary('')
    setCorrective('')
    const count = mission?.vehicleCount ?? mission?.chassisNumbers?.length ?? 0
    setParentModelId(mission?.parentModelId ?? null)
    setVariantModelId(mission?.variantModelId ?? null)
    setVehicleCount(count > 0 ? count : null)
    setChassisNumbers(resizeChassis(mission?.chassisNumbers, count))
    setFiles([])
    setError('')
  }, [open, mission])

  useEffect(() => {
    if (!open) return
    getVehicleModels({ includeInactive: true })
      .then(setModels)
      .catch(() => setModels([]))
  }, [open])

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [files])

  function pickFiles(list: FileList | null) {
    if (!list?.length) return
    const next = appendMissionResponseFiles(files, [...list])
    setFiles(next.files)
    if (next.error === 'too_many') setError(t('missions.respond.errTooMany'))
    else if (next.error === 'too_large') setError(t('missions.respond.errTooLarge'))
    else if (next.error === 'invalid_type') setError(t('missions.respond.errInvalidType'))
    else setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setError('')
  }

  const modelsText = [models.find(model => model.id === parentModelId)?.name, models.find(model => model.id === variantModelId)?.name]
    .filter(Boolean)
    .join(' · ')
  const filledChassis = chassisNumbers.map(vin => vin.trim()).filter(Boolean)

  async function submit() {
    if (!temporary.trim()) {
      setError(t('missions.respond.errTemporary'))
      return
    }
    if (!corrective.trim()) {
      setError(t('missions.respond.errCorrective'))
      return
    }
    const chassisError = validateMissionForm(
      { title: 'x', assigneeIds: ['x'], status: 'pending', priority: 'normal', vehicleCount, chassisNumbers },
      t
    )
    if (chassisError) {
      setError(chassisError)
      return
    }
    setError('')
    try {
      await onRespond(
        encodeMissionReply({
          temporary: temporary.trim(),
          corrective: corrective.trim(),
          models: modelsText,
          modelsConfirmed: true,
          chassis: filledChassis.join(' · '),
          chassisConfirmed: true,
          affectedQty: vehicleCount ?? 0
        }),
        files,
        {
          parentModelId,
          variantModelId: parentModelId ? variantModelId : null,
          vehicleCount,
          chassisNumbers: filledChassis
        }
      )
    } catch {
      /* parent shows error */
    }
  }

  return (
    <Modal
      open={open}
      title={t('missions.respond.title')}
      subtitle={mission?.title}
      icon={<MessageSquareReply className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      zIndexClass="z-[120]"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {t('missions.respond.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-3 p-5">
        <p className="text-sm text-slate-400">{t('missions.respond.hint')}</p>
        {mission?.description?.trim() && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-start">
            <p className="text-[11px] font-bold text-slate-500">{t('missions.cols.description')}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{mission.description.trim()}</p>
          </div>
        )}
        <Field label={t('missions.respond.temporary')} required>
          <textarea
            className={`${inputCls()} min-h-[4.5rem] resize-y`}
            value={temporary}
            onChange={e => setTemporary(e.target.value)}
            placeholder={t('missions.respond.placeholder')}
            disabled={saving}
          />
        </Field>
        <Field label={t('missions.respond.corrective')} required>
          <textarea
            className={`${inputCls()} min-h-[4.5rem] resize-y`}
            value={corrective}
            onChange={e => setCorrective(e.target.value)}
            placeholder={t('missions.respond.placeholder')}
            disabled={saving}
          />
        </Field>
        <MissionReplyConfirm
          models={models}
          parentModelId={parentModelId}
          variantModelId={variantModelId}
          vehicleCount={vehicleCount}
          chassisNumbers={chassisNumbers}
          saving={saving}
          onParentChange={value => {
            setParentModelId(value)
            setVariantModelId(null)
          }}
          onVariantChange={setVariantModelId}
          onChassisChange={(count, vins) => {
            setVehicleCount(count)
            setChassisNumbers(vins)
          }}
        />
        <Field label={t('missions.respond.attachments')}>
          <input
            ref={fileInputRef}
            type="file"
            accept={MISSION_RESPONSE_ACCEPT}
            multiple
            className="hidden"
            onChange={e => pickFiles(e.target.files)}
            disabled={saving}
          />
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <MissionResponseFileTile
                  key={`${file.name}-${index}`}
                  url={previews[index]}
                  fileName={file.name}
                  mimeType={missionResponseResolvedMime(file)}
                  removeLabel={t('missions.respond.removeImage')}
                  onRemove={() => removeFile(index)}
                  disabled={saving}
                />
              ))}
            </div>
          )}
          {files.length < MISSION_RESPONSE_MAX_FILES && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-4 py-4 text-sm font-bold text-slate-400 hover:border-cyan-500/50 hover:text-cyan-200 disabled:opacity-50"
            >
              <FilePlus className="h-5 w-5" />
              {t('missions.respond.addImages')}
            </button>
          )}
        </Field>
        {error && <p className="text-sm font-bold text-red-300">{error}</p>}
      </div>
    </Modal>
  )
}
