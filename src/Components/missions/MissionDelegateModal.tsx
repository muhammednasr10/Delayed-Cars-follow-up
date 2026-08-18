import { useEffect, useState } from 'react'
import { UserRoundCog } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { Modal } from '../Modal'
import { Field } from '../FormField'
import { EmployeeMultiSelect } from '../EmployeeMultiSelect'
import type { Employee } from '../../Types/employee'
import type { TeamMission } from '../../Types/mission'

type Props = {
  open: boolean
  mission: TeamMission | null
  assignableEmployees: Employee[]
  onClose: () => void
  onDelegate: (assigneeIds: string[]) => void | Promise<void>
  saving?: boolean
}

export function MissionDelegateModal({
  open,
  mission,
  assignableEmployees,
  onClose,
  onDelegate,
  saving
}: Props) {
  const { t } = useLang()
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setAssigneeIds([])
    setError('')
  }, [open, mission?.id])

  async function submit() {
    if (!assigneeIds.length) {
      setError(t('missions.errAssignee'))
      return
    }
    setError('')
    try {
      await onDelegate(assigneeIds)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  if (!mission) return null

  return (
    <Modal
      open={open}
      title={t('missions.delegate.title')}
      subtitle={t('missions.delegate.hint')}
      icon={<UserRoundCog className="h-5 w-5" />}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      zIndexClass="z-[120]"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('missions.delegate.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-start">
          <p className="text-xs font-bold text-slate-500">{t('missions.cols.title')}</p>
          <p className="mt-1 text-sm font-bold text-white">{mission.title}</p>
          {mission.description?.trim() && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{mission.description.trim()}</p>
          )}
        </div>
        <Field label={t('missions.delegate.assignees')} required>
          <EmployeeMultiSelect
            employees={assignableEmployees}
            value={assigneeIds}
            onChange={setAssigneeIds}
          />
        </Field>
      </div>
    </Modal>
  )
}
