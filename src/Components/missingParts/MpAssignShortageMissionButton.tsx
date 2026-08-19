import { useMemo, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'
import { MissionFormModal } from '../missions/MissionFormModal'
import { MissionStatusBadge } from '../missions/MissionTableBits'
import { Modal } from '../Modal'
import { uniqueIssueReps } from '../../Utils/missingPartPageUtils'
import type { Employee } from '../../Types/employee'
import type { MissingPartDetail } from '../../Types/missingPart'
import type { ShortageMissionLink } from '../../Types/mission'
import type { ShortageMissionAssignInput } from '../../Types/mpVehicleActions'

export type { ShortageMissionAssignInput }

type Props = {
  parts: MissingPartDetail[]
  employees: Employee[]
  onAssign: (input: ShortageMissionAssignInput) => void | Promise<void>
  linkedMissions?: ShortageMissionLink[]
  canAssign?: boolean
  onOpenLinked?: () => void
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
  onOpenLinked,
  busy,
  className,
  iconClassName,
  defaultTitle: titleOverride
}: Props) {
  const { t } = useLang()
  const [formOpen, setFormOpen] = useState(false)
  const [linkedOpen, setLinkedOpen] = useState(false)
  const linkedCount = linkedMissions.length
  const defaultTitle = useMemo(() => {
    const override = titleOverride?.trim()
    if (override) return override
    return uniqueIssueReps(parts)
      .map(p => p.partDescription.trim())
      .filter(Boolean)
      .join(' · ')
  }, [parts, titleOverride])

  async function save(input: ShortageMissionAssignInput) {
    await onAssign(input)
    setFormOpen(false)
  }

  function onClick() {
    if (linkedCount > 0) setLinkedOpen(true)
    else if (canAssign) setFormOpen(true)
  }

  const countLabel = linkedCount > 99 ? '99+' : linkedCount
  const title = linkedCount > 0 ? t('mp.assignMission.linkedCount', { n: linkedCount }) : t('mp.assignMission.open')

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
            {canAssign && (
              <button
                type="button"
                onClick={() => {
                  setLinkedOpen(false)
                  setFormOpen(true)
                }}
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
    </>
  )
}
